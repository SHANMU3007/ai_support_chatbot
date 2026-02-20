"""
URL Scraper – crawls an entire website and extracts clean text from every page.

Link-discovery strategy (in priority order):
1. Sitemap XML  – parses /sitemap.xml, /sitemap_index.xml and any nested sitemaps
                  listed inside. Handles JS-heavy / SPA sites that don't expose
                  links in raw HTML.
2. robots.txt   – looks for Sitemap: directives to find non-standard sitemap paths.
3. HTML crawl   – follows links on every fetched page (BFS). Catches any pages not
                  listed in the sitemap.

All three sources are combined and deduplicated before fetching begins.
Duplicate page content (e.g. /page and /page/index.html) is removed via MD5 hash
before chunks are returned, eliminating redundant embeddings downstream.

Changelog vs. original:
  [BUG]  timeout parameter now honoured in _fetch_page
  [BUG]  Retry logic added (3 attempts, exponential back-off) for transient errors
  [BUG]  Queue deduplication race-condition fixed with a 'queued' set
  [BUG]  Seed URL now passes through _is_crawlable
  [BUG]  resp.content used instead of resp.text for XML parsing (encoding-safe)
  [BUG]  www / non-www normalisation so sitemap URLs are never silently dropped
  [OPT]  Semaphore is the sole concurrency gate (batch size no longer duplicates it)
  [OPT]  max_pages counts successfully scraped pages, not merely visited URLs
  [OPT]  robots.txt fetched only ONCE – sitemap list + Crawl-delay parsed together
  [OPT]  Content-hash deduplication removes identical pages before returning text
  [OPT]  .pdf/.doc/.docx/.ppt/.pptx and other binary types added to SKIP_EXTENSIONS
  [OPT]  Shared _extract_text() helper used by both fetch paths (consistent stripping)
  [OPT]  O(1) set-based deduplication throughout (no more O(n) list scans)
  [OPT]  Log verbosity reduced – per-sitemap counts demoted to DEBUG
"""

from __future__ import annotations

import asyncio
import hashlib
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

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; ChatBotAI/1.0; +https://chatbotai.example.com)"
    )
}

# File extensions that are never HTML – skip without fetching
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
    r"|feed|rss|xmlrpc)(/|$)",
    re.IGNORECASE,
)

# Canonical sitemap paths to probe when robots.txt has no Sitemap: directive
_SITEMAP_PATHS = [
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap-index.xml",
    "/sitemap/sitemap.xml",
    "/wp-sitemap.xml",
    "/page-sitemap.xml",
    "/post-sitemap.xml",
]

CONCURRENCY   = 8    # max simultaneous HTTP requests
TIMEOUT       = 15   # seconds per request
MAX_RETRIES   = 3    # retry attempts for transient failures
RETRY_BACKOFF = 2.0  # base seconds for exponential back-off


# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------

@dataclass
class _RobotsInfo:
    """Parsed output from a single robots.txt fetch."""
    sitemap_urls: list[str]    = field(default_factory=list)
    crawl_delay:  float | None = None


# ---------------------------------------------------------------------------
# Module-level pure helpers
# ---------------------------------------------------------------------------

def _canonical_origin(url: str) -> str:
    """
    Return scheme + host, www-stripped and lower-cased.
    Ensures www.example.com and example.com are treated as the same origin.

    >>> _canonical_origin("https://www.Example.com/path")
    'https://example.com'
    """
    p    = urlparse(url)
    host = p.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return f"{p.scheme}://{host}"


def _same_origin(url: str, base: str) -> bool:
    """Return True if *url* belongs to the same site as *base* (www-agnostic)."""
    return _canonical_origin(url) == _canonical_origin(base)


def _is_crawlable(url: str) -> bool:
    """Return True if the URL looks like a page worth crawling."""
    path = urlparse(url).path
    if _SKIP_EXTENSIONS.search(path):
        return False
    if _SKIP_PATHS.search(path):
        return False
    return True


def _content_hash(text: str) -> str:
    """MD5 hex-digest of page text – used for duplicate-content detection."""
    return hashlib.md5(text.encode("utf-8", errors="replace")).hexdigest()


def _extract_text(soup: BeautifulSoup) -> str:
    """
    Remove boilerplate tags then return clean multi-line body text.
    Single shared implementation so both scrape() and crawl() strip
    exactly the same set of tags.
    """
    for tag in soup(
        [
            "script", "style", "nav", "footer", "header",
            "aside", "noscript", "iframe", "form", "svg",
        ]
    ):
        tag.decompose()
    raw = soup.get_text(separator="\n", strip=True)
    return "\n".join(line for line in raw.splitlines() if line.strip())


async def _fetch_with_retry(
    client:      httpx.AsyncClient,
    url:         str,
    timeout:     int   = TIMEOUT,
    max_retries: int   = MAX_RETRIES,
    backoff:     float = RETRY_BACKOFF,
) -> httpx.Response:
    """
    GET *url* with exponential back-off retry on transient failures.

    Retryable:     transport errors, timeouts, HTTP 429, HTTP 5xx
    Non-retryable: HTTP 4xx (except 429) – raised immediately
    """
    last_exc: Exception | None = None

    for attempt in range(max_retries):
        try:
            resp = await client.get(url, timeout=timeout)

            # Server overload / rate-limit → wait and retry
            if resp.status_code == 429 or resp.status_code >= 500:
                wait = backoff ** attempt
                logger.debug(
                    "HTTP %d for %s – retrying in %.1fs (attempt %d/%d)",
                    resp.status_code, url, wait, attempt + 1, max_retries,
                )
                await asyncio.sleep(wait)
                last_exc = httpx.HTTPStatusError(
                    f"HTTP {resp.status_code}",
                    request=resp.request,
                    response=resp,
                )
                continue

            # Client errors (404, 403, …) are not retryable
            if 400 <= resp.status_code < 500:
                resp.raise_for_status()

            return resp

        except (httpx.TransportError, httpx.TimeoutException) as exc:
            wait = backoff ** attempt
            logger.debug(
                "Transport error for %s – retrying in %.1fs (attempt %d/%d): %s",
                url, wait, attempt + 1, max_retries, exc,
            )
            await asyncio.sleep(wait)
            last_exc = exc

    raise last_exc or RuntimeError(
        f"Failed to fetch {url} after {max_retries} attempts"
    )


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class URLScraper:
    """
    Async website crawler.

    Usage::

        scraper = URLScraper()

        # Single page
        text = await scraper.scrape("https://example.com/about")

        # Full site crawl
        combined_text, page_count = await scraper.crawl("https://example.com")
    """

    # ── Public API ─────────────────────────────────────────────────────────

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

        *max_pages* caps the number of **unique-content** pages extracted,
        not merely the number of URLs visited.
        """
        parsed = urlparse(seed_url)
        base   = f"{parsed.scheme}://{parsed.netloc}"
        sem    = asyncio.Semaphore(CONCURRENCY)

        async with httpx.AsyncClient(
            headers=_HEADERS, follow_redirects=True, timeout=TIMEOUT
        ) as client:

            # ── Phase 1: parse robots.txt once for sitemaps + Crawl-delay ──
            robots = await self._parse_robots(client, base)
            if robots.crawl_delay:
                logger.info(
                    "Honouring robots.txt Crawl-delay: %.1fs", robots.crawl_delay
                )

            # ── Phase 2: discover all URLs via sitemaps ────────────────────
            sitemap_urls = await self._discover_from_sitemaps(
                client, base, robots.sitemap_urls
            )
            logger.info(
                "Sitemap discovery for %s: found %d URLs", base, len(sitemap_urls)
            )

            # ── Phase 3: build the initial crawl queue ─────────────────────
            queue:   list[str] = []
            queued:  set[str]  = set()  # every URL ever enqueued – O(1) look-up

            def _enqueue(u: str) -> None:
                """Add *u* to the queue iff it hasn't been seen and is crawlable."""
                if u not in queued and _is_crawlable(u):
                    queued.add(u)
                    queue.append(u)

            # Seed URL goes through _is_crawlable just like every other URL
            _enqueue(self._normalise(seed_url))
            for u in sitemap_urls:
                _enqueue(self._normalise(u))

            visited:     set[str]  = set()  # URLs already fetched
            texts:       list[str] = []
            seen_hashes: set[str]  = set()  # content-hash dedup

            # ── Phase 4: BFS fetch loop ────────────────────────────────────
            while queue and len(texts) < max_pages:

                # Pull up to CONCURRENCY items (semaphore is the throttle)
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
                        self._crawl_page(
                            client, sem, u, base, robots.crawl_delay
                        )
                        for u in batch
                    ],
                    return_exceptions=True,
                )

                for u, result in zip(batch, results):
                    if isinstance(result, BaseException):
                        logger.warning("Skipped %s: %s", u, result)
                        continue

                    page_text, links = result

                    if page_text:
                        h = _content_hash(page_text)
                        if h in seen_hashes:
                            # e.g. /ABOUT and /ABOUT/index.html are identical
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

    async def _parse_robots(
        self, client: httpx.AsyncClient, base: str
    ) -> _RobotsInfo:
        """
        Fetch robots.txt exactly ONCE and return both sitemap URLs and
        Crawl-delay in a single _RobotsInfo object.

        Previously two separate HTTP calls were made (_sitemaps_from_robots
        and _get_crawl_delay). Merging them halves round-trips at startup.
        """
        info = _RobotsInfo()
        try:
            resp = await client.get(f"{base}/robots.txt", timeout=10)
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

            logger.debug(
                "robots.txt at %s: %d sitemap(s), crawl-delay=%s",
                base, len(info.sitemap_urls), info.crawl_delay,
            )
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
        """
        Return a deduplicated flat list of all page URLs found in sitemaps.

        Probing order:
          1. Sitemap URLs from robots.txt (already fetched, passed in)
          2. Well-known fallback paths (_SITEMAP_PATHS)
        """
        seen_candidates: set[str]  = set(robots_sitemaps)
        candidates:      list[str] = list(robots_sitemaps)

        for path in _SITEMAP_PATHS:
            full = base + path
            if full not in seen_candidates:
                seen_candidates.add(full)
                candidates.append(full)

        visited_sitemaps: set[str]  = set()
        seen_urls:        set[str]  = set()
        unique:           list[str] = []

        for sitemap_url in candidates:
            for u in await self._parse_sitemap(
                client, sitemap_url, base, visited_sitemaps
            ):
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
        """
        Recursively parse a sitemap or sitemap index.
        Returns a flat list of crawlable, same-origin page URLs.
        """
        if sitemap_url in visited:
            return []
        visited.add(sitemap_url)

        try:
            resp = await client.get(sitemap_url, timeout=10)
            if resp.status_code != 200:
                return []
            ct = resp.headers.get("content-type", "")
            if "html" in ct and "xml" not in ct:
                return []  # plain HTML page masquerading as a sitemap path
        except Exception as exc:
            logger.debug("Sitemap fetch failed %s: %s", sitemap_url, exc)
            return []

        try:
            # Use raw bytes so ElementTree reads the XML encoding declaration
            # correctly; resp.text may mis-decode non-UTF-8 sitemaps.
            root = ET.fromstring(resp.content)
        except ET.ParseError as exc:
            logger.debug("XML parse error for sitemap %s: %s", sitemap_url, exc)
            return []

        ns_match = re.match(r"\{(.+?)\}", root.tag)
        prefix   = f"{{{ns_match.group(1)}}}" if ns_match else ""

        urls: list[str] = []

        # ── Sitemap index → recurse into each child sitemap ────────────────
        if root.tag == f"{prefix}sitemapindex":
            child_sitemaps = [
                loc.text.strip()
                for sm  in root.findall(f"{prefix}sitemap")
                for loc in sm.findall(f"{prefix}loc")
                if loc.text
            ]
            logger.debug(
                "Sitemap index %s → %d child sitemaps",
                sitemap_url, len(child_sitemaps),
            )
            for child in child_sitemaps:
                urls.extend(
                    await self._parse_sitemap(client, child, base, visited)
                )

        # ── Regular urlset ─────────────────────────────────────────────────
        elif root.tag == f"{prefix}urlset":
            for url_el in root.findall(f"{prefix}url"):
                loc = url_el.find(f"{prefix}loc")
                if loc is not None and loc.text:
                    u = loc.text.strip()
                    # Accept both www and non-www variants of the same origin
                    if _same_origin(u, base) and _is_crawlable(u):
                        urls.append(self._normalise(u))
            logger.debug("Sitemap %s → %d URLs", sitemap_url, len(urls))

        return urls

    # ── Page fetching ───────────────────────────────────────────────────────

    async def _crawl_page(
        self,
        client:      httpx.AsyncClient,
        sem:         asyncio.Semaphore,
        url:         str,
        base:        str,
        crawl_delay: float | None = None,
    ) -> tuple[str, list[str]]:
        """
        Fetch one page inside the semaphore gate, then return
        (clean_text, list_of_internal_links).
        """
        async with sem:
            resp = await _fetch_with_retry(client, url)
            # Honour Crawl-delay inside the semaphore so we don't flood the
            # server between consecutive requests from the same worker slot.
            if crawl_delay:
                await asyncio.sleep(crawl_delay)

        ct = resp.headers.get("content-type", "")
        if "text/html" not in ct:
            return "", []

        soup = BeautifulSoup(resp.text, "html.parser")

        # Collect internal links before _extract_text destroys the tree
        links: list[str] = []
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith(("mailto:", "tel:", "javascript:")):
                continue
            absolute = self._normalise(urljoin(url, href))
            if _same_origin(absolute, base) and _is_crawlable(absolute):
                links.append(absolute)

        return _extract_text(soup), links

    async def _fetch_page(
        self,
        client:  httpx.AsyncClient,
        url:     str,
        timeout: int = TIMEOUT,
    ) -> str:
        """Single-page fetch used by the public scrape() method."""
        resp = await _fetch_with_retry(client, url, timeout=timeout)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        return _extract_text(soup)

    # ── Utilities ───────────────────────────────────────────────────────────

    @staticmethod
    def _normalise(url: str) -> str:
        """Strip URL fragment and trailing slash for consistent comparison."""
        defragged, _ = urldefrag(url)
        return defragged.rstrip("/")