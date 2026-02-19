"""
URL Scraper – crawls an entire website and extracts clean text from every page.

Link-discovery strategy (in priority order):
  1. Sitemap XML  – parses /sitemap.xml, /sitemap_index.xml and any nested
                    sitemaps listed inside. Handles JS-heavy / SPA sites that
                    don't expose links in raw HTML.
  2. robots.txt   – looks for Sitemap: directives to find non-standard sitemap paths.
  3. HTML crawl   – follows <a href> links on every fetched page (BFS). Catches
                    any pages not listed in the sitemap.

All three sources are combined and deduplicated before fetching begins.
"""
from __future__ import annotations

import asyncio
import logging
import re
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, urlparse, urldefrag

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ChatBotAI/1.0; +https://chatbotai.example.com)"
}

# Extensions that are never HTML pages – skip immediately
_SKIP_EXTENSIONS = re.compile(
    r"\.(jpg|jpeg|png|gif|webp|svg|ico|mp4|mp3|zip|gz|tar|exe|dmg"
    r"|css|js|woff|woff2|ttf|eot|map|json|csv|xls|xlsx)$",
    re.IGNORECASE,
)

# Paths that contain no useful support/product content
_SKIP_PATHS = re.compile(
    r"/(wp-admin|wp-login|wp-json|admin|login|logout|cart|checkout"
    r"|wp-content/uploads|feed|rss)(/|$)",
    re.IGNORECASE,
)

# Common sitemap locations to probe
_SITEMAP_PATHS = [
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap-index.xml",
    "/sitemap/sitemap.xml",
    "/wp-sitemap.xml",
    "/page-sitemap.xml",
    "/post-sitemap.xml",
]

CONCURRENCY = 8    # simultaneous HTTP requests
TIMEOUT     = 15   # seconds per request


class URLScraper:

    # ── Public API ──────────────────────────────────────────────────────────

    async def scrape(self, url: str, timeout: int = TIMEOUT) -> str:
        """Scrape a single page and return clean text (legacy / FAQ path)."""
        async with httpx.AsyncClient(
            headers=_HEADERS, follow_redirects=True, timeout=timeout
        ) as client:
            text = await self._fetch_page(client, url)
        logger.info("Scraped %s: %d chars", url, len(text))
        return text

    async def crawl(self, seed_url: str, max_pages: int = 50) -> tuple[str, int]:
        """
        Crawl the entire website starting from *seed_url*.

        Returns (combined_text, pages_crawled).
        """
        parsed = urlparse(seed_url)
        base   = f"{parsed.scheme}://{parsed.netloc}"
        sem    = asyncio.Semaphore(CONCURRENCY)

        async with httpx.AsyncClient(
            headers=_HEADERS, follow_redirects=True, timeout=TIMEOUT
        ) as client:
            # ── Phase 1: discover URLs from sitemap + robots.txt ──────────
            sitemap_urls = await self._discover_from_sitemaps(client, base)
            logger.info(
                "Sitemap discovery for %s: found %d URLs", base, len(sitemap_urls)
            )

            # ── Phase 2: seed queue with sitemap URLs + the seed URL ───────
            visited: set[str] = set()
            # Prioritise sitemap URLs; fall back to HTML crawl to fill the gap
            initial = [self._normalise(seed_url)]
            for u in sitemap_urls:
                n = self._normalise(u)
                if n not in initial:
                    initial.append(n)

            queue: list[str] = initial
            texts: list[str] = []

            # ── Phase 3: BFS fetch loop ────────────────────────────────────
            while queue and len(visited) < max_pages:
                batch: list[str] = []
                while queue and len(batch) < CONCURRENCY and len(visited) + len(batch) < max_pages:
                    url = queue.pop(0)
                    if url not in visited:
                        batch.append(url)
                        visited.add(url)

                if not batch:
                    break

                results = await asyncio.gather(
                    *[self._crawl_page(client, sem, url, base) for url in batch],
                    return_exceptions=True,
                )

                for url, result in zip(batch, results):
                    if isinstance(result, Exception):
                        logger.warning("Skipped %s: %s", url, result)
                        continue
                    page_text, links = result
                    if page_text:
                        texts.append(f"--- PAGE: {url} ---\n{page_text}")
                    # HTML links fill the queue for pages not in the sitemap
                    for link in links:
                        if link not in visited and link not in queue:
                            queue.append(link)

        pages_crawled = len(texts)
        combined = "\n\n".join(texts)
        logger.info(
            "Crawled %s: %d pages, %d total chars",
            seed_url, pages_crawled, len(combined),
        )
        return combined, pages_crawled

    # ── Sitemap discovery ────────────────────────────────────────────────────

    async def _discover_from_sitemaps(
        self, client: httpx.AsyncClient, base: str
    ) -> list[str]:
        """
        Returns a flat list of all page URLs found in the site's sitemaps.
        Checks robots.txt first, then probes common sitemap paths.
        """
        sitemap_urls: list[str] = []

        # 1. Check robots.txt for Sitemap: lines
        robots_sitemaps = await self._sitemaps_from_robots(client, base)

        # 2. Build full list of sitemap candidates
        candidates: list[str] = robots_sitemaps[:]
        for path in _SITEMAP_PATHS:
            full = base + path
            if full not in candidates:
                candidates.append(full)

        # 3. Fetch and parse each sitemap
        visited_sitemaps: set[str] = set()
        for sitemap_url in candidates:
            urls = await self._parse_sitemap(client, sitemap_url, base, visited_sitemaps)
            sitemap_urls.extend(urls)

        # Deduplicate while preserving order
        seen: set[str] = set()
        unique: list[str] = []
        for u in sitemap_urls:
            if u not in seen:
                seen.add(u)
                unique.append(u)
        return unique

    async def _sitemaps_from_robots(
        self, client: httpx.AsyncClient, base: str
    ) -> list[str]:
        """Parse robots.txt and return all Sitemap: directives."""
        try:
            resp = await client.get(f"{base}/robots.txt", timeout=10)
            if resp.status_code == 200:
                sitemaps = []
                for line in resp.text.splitlines():
                    if line.lower().startswith("sitemap:"):
                        sm = line.split(":", 1)[1].strip()
                        if sm:
                            sitemaps.append(sm)
                logger.info("robots.txt at %s listed %d sitemap(s)", base, len(sitemaps))
                return sitemaps
        except Exception as exc:
            logger.debug("robots.txt fetch failed for %s: %s", base, exc)
        return []

    async def _parse_sitemap(
        self,
        client: httpx.AsyncClient,
        sitemap_url: str,
        base: str,
        visited: set[str],
    ) -> list[str]:
        """
        Recursively parse a sitemap or sitemap index.
        Returns a flat list of crawlable page URLs.
        """
        if sitemap_url in visited:
            return []
        visited.add(sitemap_url)

        try:
            resp = await client.get(sitemap_url, timeout=10)
            if resp.status_code != 200:
                return []
            content_type = resp.headers.get("content-type", "")
            if "html" in content_type and "xml" not in content_type:
                return []  # not a real sitemap
        except Exception as exc:
            logger.debug("Sitemap fetch failed %s: %s", sitemap_url, exc)
            return []

        try:
            root = ET.fromstring(resp.text)
        except ET.ParseError:
            logger.debug("XML parse error for sitemap %s", sitemap_url)
            return []

        # Strip XML namespace for easier tag matching
        ns = re.match(r"\{(.+?)\}", root.tag)
        prefix = f"{{{ns.group(1)}}}" if ns else ""

        urls: list[str] = []

        # Sitemap index – recurse into child sitemaps
        if root.tag == f"{prefix}sitemapindex":
            child_sitemaps = [
                loc.text.strip()
                for sm in root.findall(f"{prefix}sitemap")
                for loc in sm.findall(f"{prefix}loc")
                if loc.text
            ]
            logger.info(
                "Sitemap index %s → %d child sitemaps", sitemap_url, len(child_sitemaps)
            )
            for child in child_sitemaps:
                child_urls = await self._parse_sitemap(client, child, base, visited)
                urls.extend(child_urls)

        # Regular urlset
        elif root.tag == f"{prefix}urlset":
            for url_el in root.findall(f"{prefix}url"):
                loc = url_el.find(f"{prefix}loc")
                if loc is not None and loc.text:
                    u = loc.text.strip()
                    if u.startswith(base) and self._is_crawlable(u):
                        urls.append(self._normalise(u))
            logger.info("Sitemap %s → %d URLs", sitemap_url, len(urls))

        return urls

    # ── Page fetching ─────────────────────────────────────────────────────────

    async def _crawl_page(
        self,
        client: httpx.AsyncClient,
        sem: asyncio.Semaphore,
        url: str,
        base: str,
    ) -> tuple[str, list[str]]:
        """Fetch one page, return (clean_text, internal_links)."""
        async with sem:
            resp = await client.get(url, timeout=TIMEOUT)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if "text/html" not in content_type:
                return "", []
            html = resp.text

        soup = BeautifulSoup(html, "html.parser")

        # Collect internal <a href> links before stripping tags
        links: list[str] = []
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith("mailto:") or href.startswith("tel:"):
                continue
            absolute = self._normalise(urljoin(url, href))
            if absolute.startswith(base) and self._is_crawlable(absolute):
                links.append(absolute)

        # Strip boilerplate
        for tag in soup(["script", "style", "nav", "footer", "header", "aside",
                         "noscript", "iframe", "form"]):
            tag.decompose()

        text    = soup.get_text(separator="\n", strip=True)
        cleaned = "\n".join(line for line in text.splitlines() if line.strip())
        return cleaned, links

    async def _fetch_page(self, client: httpx.AsyncClient, url: str) -> str:
        """Single-page fetch used by the legacy scrape() method."""
        resp = await client.get(url, timeout=TIMEOUT)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        return "\n".join(line for line in text.splitlines() if line.strip())

    # ── Utilities ─────────────────────────────────────────────────────────────

    @staticmethod
    def _normalise(url: str) -> str:
        """Strip fragment and trailing slash."""
        defragged, _ = urldefrag(url)
        return defragged.rstrip("/")

    @staticmethod
    def _is_crawlable(url: str) -> bool:
        path = urlparse(url).path
        if _SKIP_EXTENSIONS.search(path):
            return False
        if _SKIP_PATHS.search(path):
            return False
        return True
