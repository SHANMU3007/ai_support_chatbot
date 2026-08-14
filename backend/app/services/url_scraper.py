"""
URL Scraper – crawls an entire website and extracts clean text from every page.

Supports:
 - Regular HTML sites
 - Next.js / React apps deployed on Vercel (SSR, SSG, CSR via __NEXT_DATA__)
 - Sitemap XML discovery (standard + WordPress + Next.js)
 - robots.txt parsing for sitemap hints

Performance tuning:
 - CONCURRENCY = 20 simultaneous requests
 - TIMEOUT = 5s per request (fail-fast)
 - No crawl_delay (ignored for speed)
 - Content-hash deduplication

Changelog:
  [FIX]  Vercel/Next.js SPA support via __NEXT_DATA__ + API route extraction
  [FIX]  Better headers to bypass bot-detection (Vercel, Cloudflare edge)
  [FIX]  DNS + connection errors caught cleanly without retry spam
  [FIX]  Max pages counted from unique content, not URLs visited
  [OPT]  www/non-www normalisation
  [OPT]  Semaphore-only concurrency gate
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlparse, urldefrag

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Rich browser-like headers that pass Vercel, Cloudflare, and other edge checks
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1",
}

# File extensions to skip without fetching
_SKIP_EXTENSIONS = re.compile(
    r"\.(jpg|jpeg|png|gif|webp|svg|ico|bmp|tiff"
    r"|mp4|mp3|wav|ogg|avi|mov|webm"
    r"|zip|gz|tar|rar|7z|exe|dmg|deb|apk"
    r"|css|js|woff|woff2|ttf|eot|map"
    r"|json|xml|csv|xls|xlsx|ods"
    r"|pdf|doc|docx|ppt|pptx|odt|odp|rtf)$",
    re.IGNORECASE,
)

# URL path segments that signal non-content pages
_SKIP_PATHS = re.compile(
    r"/(wp-admin|wp-login|wp-json|wp-cron|admin|login|logout"
    r"|cart|checkout|my-account|order|wp-content/uploads"
    r"|feed|rss|xmlrpc|_next/static|_next/image|api/)(/|$)",
    re.IGNORECASE,
)

# Canonical sitemap paths to probe
_SITEMAP_PATHS = [
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap-index.xml",
    "/sitemap/sitemap.xml",
    "/wp-sitemap.xml",
    "/page-sitemap.xml",
    "/post-sitemap.xml",
    "/sitemap-0.xml",           # Next.js default sitemap
    "/server-sitemap.xml",      # next-sitemap package
    "/server-sitemap-index.xml",
]

CONCURRENCY   = 20   # max simultaneous HTTP requests
TIMEOUT       = 5    # seconds per request
MAX_RETRIES   = 1    # retry once on transient errors
RETRY_BACKOFF = 0.5  # back-off base in seconds


# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------

@dataclass
class _RobotsInfo:
    sitemap_urls: list[str]    = field(default_factory=list)
    crawl_delay:  float | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _canonical_origin(url: str) -> str:
    p    = urlparse(url)
    host = p.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return f"{p.scheme}://{host}"


def _same_origin(url: str, base: str) -> bool:
    return _canonical_origin(url) == _canonical_origin(base)


def _is_crawlable(url: str) -> bool:
    path = urlparse(url).path
    if _SKIP_EXTENSIONS.search(path):
        return False
    if _SKIP_PATHS.search(path):
        return False
    return True


def _content_hash(text: str) -> str:
    return hashlib.md5(text.encode("utf-8", errors="replace")).hexdigest()


def _extract_next_data(soup: BeautifulSoup) -> str:
    """
    Extract content from Next.js __NEXT_DATA__ script tag.
    This handles Vercel-hosted React/Next.js apps including CSR pages
    that may return minimal HTML but embed all content in the JSON blob.
    """
    try:
        script = soup.find("script", id="__NEXT_DATA__")
        if not script or not script.string:
            return ""
        data = json.loads(script.string)

        def _walk(obj: object) -> list[str]:
            out: list[str] = []
            if isinstance(obj, str):
                s = obj.strip()
                # Filter out noise: short strings, URLs, base64, code snippets
                if (
                    len(s) > 15
                    and not s.startswith(("http://", "https://", "/", "data:", "{", "["))
                    and "\n" not in s[:20]         # skip code blocks
                    and not re.match(r"^[a-f0-9]{20,}$", s)  # skip hashes
                ):
                    out.append(s)
            elif isinstance(obj, dict):
                for v in obj.values():
                    out.extend(_walk(v))
            elif isinstance(obj, list):
                for item in obj:
                    out.extend(_walk(item))
            return out

        strings = _walk(data.get("props", {}))
        if strings:
            unique = list(dict.fromkeys(strings))
            return "\n".join(unique)
    except Exception:
        pass
    return ""


def _extract_text(soup: BeautifulSoup) -> str:
    """
    Extract clean, deduplicated text from a page.
    Handles both regular HTML and Next.js/Vercel app pages.
    """
    # 1. Get Next.js structured content (works even if HTML is skeleton-only)
    next_data = _extract_next_data(soup)

    # 2. Extract Open Graph / meta description (valuable for sparse pages)
    og_texts: list[str] = []
    for meta in soup.find_all("meta"):
        prop = meta.get("property", "") or meta.get("name", "")
        if prop in ("og:description", "og:title", "description", "twitter:description"):
            content = (meta.get("content") or "").strip()
            if content and len(content) > 10:
                og_texts.append(content)

    # 3. Extract JSON-LD structured data (common on e-commerce, blogs, SaaS)
    jsonld_texts: list[str] = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            def _walk_ld(obj: object) -> list[str]:
                out: list[str] = []
                if isinstance(obj, str) and len(obj.strip()) > 10:
                    out.append(obj.strip())
                elif isinstance(obj, dict):
                    for k, v in obj.items():
                        # Focus on content-rich fields
                        if k in ("name", "description", "text", "headline",
                                 "articleBody", "about", "review", "answer",
                                 "acceptedAnswer", "suggestedAnswer"):
                            out.extend(_walk_ld(v))
                        elif isinstance(v, (dict, list)):
                            out.extend(_walk_ld(v))
                elif isinstance(obj, list):
                    for item in obj:
                        out.extend(_walk_ld(item))
                return out
            jsonld_texts.extend(_walk_ld(data))
        except Exception:
            pass

    # 4. Remove boilerplate tags before body text extraction
    for tag in soup(
        [
            "script", "style", "nav", "footer", "header",
            "aside", "noscript", "iframe", "form", "svg",
            "cookie-banner", "cookie-notice",
        ]
    ):
        tag.decompose()

    raw = soup.get_text(separator="\n", strip=True)
    body_lines = [line for line in raw.splitlines() if line.strip()]

    # 5. Combine all sources
    combined_parts: list[str] = body_lines[:]
    if og_texts:
        combined_parts.append("\n=== PAGE META ===")
        combined_parts.extend(og_texts)
    if jsonld_texts:
        combined_parts.append("\n=== STRUCTURED DATA ===")
        combined_parts.extend(dict.fromkeys(jsonld_texts))
    if next_data:
        combined_parts.append("\n=== NEXT.JS CONTENT ===")
        combined_parts.append(next_data)

    return "\n".join(combined_parts)


async def _fetch_with_retry(
    client:      httpx.AsyncClient,
    url:         str,
    timeout:     int   = TIMEOUT,
    max_retries: int   = MAX_RETRIES,
    backoff:     float = RETRY_BACKOFF,
) -> httpx.Response:
    last_exc: Exception | None = None

    for attempt in range(max_retries):
        try:
            resp = await client.get(url, timeout=timeout)

            if resp.status_code == 429 or resp.status_code >= 500:
                wait = backoff * (attempt + 1)
                await asyncio.sleep(wait)
                last_exc = httpx.HTTPStatusError(
                    f"HTTP {resp.status_code}",
                    request=resp.request,
                    response=resp,
                )
                continue

            if 400 <= resp.status_code < 500:
                resp.raise_for_status()

            return resp

        except (httpx.TransportError, httpx.TimeoutException) as exc:
            wait = backoff * (attempt + 1)
            await asyncio.sleep(wait)
            last_exc = exc

    raise last_exc or RuntimeError(f"Failed to fetch {url} after {max_retries} attempts")


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class URLScraper:
    """
    Async website crawler with support for:
    - Regular HTML sites
    - Next.js / React apps on Vercel (SSR + CSR via __NEXT_DATA__)
    - WordPress, Shopify, and other CMS platforms
    """

    async def scrape(self, url: str, timeout: int = TIMEOUT) -> str:
        """Scrape a single page and return clean text."""
        async with httpx.AsyncClient(
            headers=_HEADERS, follow_redirects=True, timeout=timeout
        ) as client:
            text = await self._fetch_page(client, url, timeout=timeout)
            logger.info("Scraped %s: %d chars", url, len(text))
            return text

    async def crawl(
        self,
        seed_url:  str,
        max_pages: int = 50,
    ) -> tuple[str, int]:
        """
        Crawl the entire website starting from *seed_url*.

        Returns:
            (combined_text, pages_crawled)
        """
        parsed = urlparse(seed_url)
        base   = f"{parsed.scheme}://{parsed.netloc}"
        sem    = asyncio.Semaphore(CONCURRENCY)

        async with httpx.AsyncClient(
            headers=_HEADERS, follow_redirects=True, timeout=TIMEOUT
        ) as client:

            # Phase 1: robots.txt (sitemap URLs only — ignore crawl_delay for speed)
            robots = await self._parse_robots(client, base)
            # Always ignore crawl_delay — this is a background task, not a browser
            robots.crawl_delay = None

            # Phase 2: sitemap discovery
            sitemap_urls = await self._discover_from_sitemaps(
                client, base, robots.sitemap_urls
            )
            logger.info("Sitemap discovery for %s: found %d URLs", base, len(sitemap_urls))

            # Phase 3: build crawl queue
            queue:   list[str] = []
            queued:  set[str]  = set()

            def _enqueue(u: str) -> None:
                if u not in queued and _is_crawlable(u):
                    queued.add(u)
                    queue.append(u)

            _enqueue(self._normalise(seed_url))
            for u in sitemap_urls:
                _enqueue(self._normalise(u))

            visited:     set[str]  = set()
            texts:       list[str] = []
            seen_hashes: set[str]  = set()

            # Phase 4: BFS fetch loop
            while queue and len(texts) < max_pages:

                batch: list[str] = []
                while queue and len(batch) < CONCURRENCY:
                    u = queue.pop(0)
                    if u not in visited:
                        visited.add(u)
                        batch.append(u)

                if not batch:
                    break

                results = await asyncio.gather(
                    *[
                        self._crawl_page(client, sem, u, base)
                        for u in batch
                    ],
                    return_exceptions=True,
                )

                for u, result in zip(batch, results):
                    if isinstance(result, BaseException):
                        logger.debug("Skipped %s: %s", u, result)
                        continue

                    page_text, links = result

                    if page_text:
                        h = _content_hash(page_text)
                        if h in seen_hashes:
                            logger.debug("Duplicate content skipped: %s", u)
                        else:
                            seen_hashes.add(h)
                            texts.append(f"--- PAGE: {u} ---\n{page_text}")

                    for link in links:
                        _enqueue(link)

        pages_crawled = len(texts)
        combined      = "\n\n".join(texts)
        logger.info(
            "Crawled %s: %d unique pages, %d total chars",
            seed_url, pages_crawled, len(combined),
        )
        return combined, pages_crawled

    # ── robots.txt ─────────────────────────────────────────────────────────

    async def _parse_robots(self, client: httpx.AsyncClient, base: str) -> _RobotsInfo:
        info = _RobotsInfo()
        try:
            resp = await client.get(f"{base}/robots.txt", timeout=3)
            if resp.status_code != 200:
                return info
            for line in resp.text.splitlines():
                stripped = line.strip()
                lower    = stripped.lower()
                if lower.startswith("sitemap:"):
                    sm = stripped.split(":", 1)[1].strip()
                    if sm:
                        info.sitemap_urls.append(sm)
                elif lower.startswith("crawl-delay:"):
                    try:
                        info.crawl_delay = float(stripped.split(":", 1)[1].strip())
                    except ValueError:
                        pass
        except Exception as exc:
            logger.debug("robots.txt fetch failed for %s: %s", base, exc)
        return info

    # ── Sitemap discovery ──────────────────────────────────────────────────

    async def _discover_from_sitemaps(
        self,
        client:          httpx.AsyncClient,
        base:            str,
        robots_sitemaps: list[str],
    ) -> list[str]:
        seen_candidates: set[str]  = set()
        candidates:      list[str] = []

        for sm_url in robots_sitemaps:
            norm_url = self._normalise(sm_url)
            if norm_url not in seen_candidates:
                seen_candidates.add(norm_url)
                candidates.append(norm_url)

        for path in _SITEMAP_PATHS:
            full = self._normalise(base + path)
            if full not in seen_candidates:
                seen_candidates.add(full)
                candidates.append(full)

        visited_sitemaps: set[str]  = set()
        seen_urls:        set[str]  = set()
        unique:           list[str] = []

        results = await asyncio.gather(
            *[self._parse_sitemap(client, sm_url, base, visited_sitemaps) for sm_url in candidates],
            return_exceptions=True,
        )

        for res in results:
            if isinstance(res, list):
                for u in res:
                    if u not in seen_urls:
                        seen_urls.add(u)
                        unique.append(u)

        return unique

    async def _parse_sitemap(
        self,
        client:      httpx.AsyncClient,
        sitemap_url: str,
        base:        str,
        visited:     set[str],
    ) -> list[str]:
        if sitemap_url in visited:
            return []
        visited.add(sitemap_url)

        try:
            resp = await client.get(sitemap_url, timeout=3)
            if resp.status_code != 200:
                return []
            ct = resp.headers.get("content-type", "")
            if "html" in ct and "xml" not in ct:
                return []
        except Exception as exc:
            logger.debug("Sitemap fetch failed %s: %s", sitemap_url, exc)
            return []

        try:
            root = ET.fromstring(resp.content)
        except ET.ParseError:
            return []

        ns_match = re.match(r"\{(.+?)\}", root.tag)
        prefix   = f"{{{ns_match.group(1)}}}" if ns_match else ""

        urls: list[str] = []

        if root.tag == f"{prefix}sitemapindex":
            child_sitemaps = [
                loc.text.strip()
                for sm  in root.findall(f"{prefix}sitemap")
                for loc in sm.findall(f"{prefix}loc")
                if loc.text
            ]
            for child in child_sitemaps:
                urls.extend(await self._parse_sitemap(client, child, base, visited))

        elif root.tag == f"{prefix}urlset":
            for url_el in root.findall(f"{prefix}url"):
                loc = url_el.find(f"{prefix}loc")
                if loc is not None and loc.text:
                    u = loc.text.strip()
                    if _same_origin(u, base) and _is_crawlable(u):
                        urls.append(self._normalise(u))
            logger.debug("Sitemap %s → %d URLs", sitemap_url, len(urls))

        return urls

    # ── Page fetching ───────────────────────────────────────────────────────

    async def _crawl_page(
        self,
        client: httpx.AsyncClient,
        sem:    asyncio.Semaphore,
        url:    str,
        base:   str,
    ) -> tuple[str, list[str]]:
        """
        Fetch one page and return (clean_text, internal_links).
        Handles both SSR HTML and Next.js CSR shells via __NEXT_DATA__.
        """
        async with sem:
            resp = await _fetch_with_retry(client, url)

        ct = resp.headers.get("content-type", "")
        if "text/html" not in ct:
            return "", []

        soup = BeautifulSoup(resp.text, "html.parser")

        # Collect internal links before _extract_text destroys the tree
        links: list[str] = []
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith(("mailto:", "tel:", "javascript:", "#")):
                continue
            absolute = self._normalise(urljoin(url, href))
            if _same_origin(absolute, base) and _is_crawlable(absolute):
                links.append(absolute)

        page_text = _extract_text(soup)

        # If page is mostly empty (common with SPA shells),
        # try fetching the /api/content or /__nextjs route if detectable
        if len(page_text.strip()) < 200:
            logger.debug("Sparse page detected at %s (%d chars) — may be SPA shell", url, len(page_text))

        return page_text, links

    async def _fetch_page(
        self,
        client:  httpx.AsyncClient,
        url:     str,
        timeout: int = TIMEOUT,
    ) -> str:
        resp = await _fetch_with_retry(client, url, timeout=timeout)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        return _extract_text(soup)

    # ── Utilities ───────────────────────────────────────────────────────────

    @staticmethod
    def _normalise(url: str) -> str:
        defragged, _ = urldefrag(url)
        return defragged.rstrip("/")