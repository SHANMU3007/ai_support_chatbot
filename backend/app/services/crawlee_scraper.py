"""
Crawlee + Playwright Scraper Engine
Uses Crawlee / Playwright headless Chromium for JavaScript-heavy SPAs,
React/Vue/Angular apps, and dynamic DOM content extraction.
"""

from __future__ import annotations
import asyncio
import logging
import re
from urllib.parse import urlparse, urljoin, urldefrag
from typing import List, Tuple, Set

from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# File extensions to skip
_SKIP_EXTENSIONS = re.compile(
    r"\.(jpg|jpeg|png|gif|webp|svg|ico|bmp|mp4|mp3|wav|zip|gz|rar|exe|css|js|json|xml|pdf|doc|docx)$",
    re.IGNORECASE,
)


class CrawleePlaywrightScraper:
    """
    Crawlee + Playwright dynamic web crawler.
    Attempts Crawlee PlaywrightCrawler first; if Crawlee is not installed,
    runs built-in Playwright browser pool fallback.
    """

    async def crawl(self, seed_url: str, max_pages: int = 50) -> Tuple[str, int]:
        """
        Crawl website starting from seed_url up to max_pages using Playwright.
        Returns (combined_text, pages_crawled).
        """
        # Try Crawlee framework if installed
        try:
            return await self._crawl_with_crawlee(seed_url, max_pages)
        except Exception as exc:
            logger.info("Crawlee framework unavailable/failed (%s) — using Playwright direct pool", exc)
            return await self._crawl_with_playwright_direct(seed_url, max_pages)

    async def _crawl_with_crawlee(self, seed_url: str, max_pages: int) -> Tuple[str, int]:
        """Use Crawlee's PlaywrightCrawler if available."""
        from crawlee.playwright import PlaywrightCrawler, PlaywrightCrawlingContext

        crawled_texts: List[str] = []
        crawled_urls: Set[str] = set()

        crawler = PlaywrightCrawler(
            max_requests_per_crawl=max_pages,
            headless=True,
        )

        @crawler.router.default_handler
        async def request_handler(context: PlaywrightCrawlingContext) -> None:
            url = context.request.url
            if url in crawled_urls or len(crawled_texts) >= max_pages:
                return

            crawled_urls.add(url)
            page = context.page

            # Wait for initial DOM load
            await page.wait_for_load_state("domcontentloaded", timeout=15000)
            await page.wait_for_timeout(1500)

            # Auto-scroll page to trigger IntersectionObserver, Framer Motion, GSAP scroll animations
            await self._scroll_page(page)

            # Click dynamic tab elements if present
            await self._click_dynamic_elements(page)

            content = await page.content()
            soup = BeautifulSoup(content, "html.parser")
            text = self._extract_clean_text(soup)

            if text and len(text.strip()) > 50:
                crawled_texts.append(f"--- PAGE: {url} ---\n{text}")

            # Enqueue same-origin links
            await context.enqueue_links(
                strategy="same-origin",
                transform_request_function=lambda req: req if not _SKIP_EXTENSIONS.search(req.url) else None,
            )

        await crawler.run([seed_url])
        combined = "\n\n".join(crawled_texts)
        return combined, len(crawled_texts)

    async def _crawl_with_playwright_direct(self, seed_url: str, max_pages: int) -> Tuple[str, int]:
        """Direct Playwright multi-page crawler fallback."""
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            logger.error("Playwright is not installed. Please install playwright.")
            return "", 0

        parsed = urlparse(seed_url)
        base_origin = f"{parsed.scheme}://{parsed.netloc}"

        visited: Set[str] = set()
        queue: List[str] = [seed_url.rstrip("/")]
        texts: List[str] = []

        async with async_playwright() as p:
            try:
                browser = await p.chromium.launch(
                    headless=True,
                    args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
                )
            except Exception as launch_exc:
                logger.info("Default Playwright launch failed (%s) — trying channel='msedge'", launch_exc)
                try:
                    browser = await p.chromium.launch(headless=True, channel="msedge")
                except Exception:
                    browser = await p.chromium.launch(headless=True, channel="chrome")
            context = await browser.new_context(
                viewport={"width": 1440, "height": 900},
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
            )
            page = await context.new_page()

            while queue and len(texts) < max_pages:
                current_url = queue.pop(0)
                if current_url in visited:
                    continue
                visited.add(current_url)

                try:
                    logger.info("Playwright crawling %s (%d/%d)", current_url, len(texts) + 1, max_pages)
                    resp = await page.goto(current_url, wait_until="domcontentloaded", timeout=25000)
                    if not resp or resp.status >= 400:
                        continue

                    await page.wait_for_timeout(1500)

                    # Smooth scroll down page to trigger scroll animations, IntersectionObserver, and lazy loading
                    await self._scroll_page(page)

                    await self._click_dynamic_elements(page)

                    # Extract HTML content
                    html = await page.content()
                    soup = BeautifulSoup(html, "html.parser")
                    clean_text = self._extract_clean_text(soup)

                    if clean_text and len(clean_text.strip()) > 50:
                        texts.append(f"--- PAGE: {current_url} ---\n{clean_text}")

                    # Extract internal links for queue
                    if len(texts) < max_pages:
                        links = await page.query_selector_all("a[href]")
                        for link in links[:30]:
                            href = await link.get_attribute("href")
                            if not href:
                                continue
                            abs_url, _ = urldefrag(urljoin(current_url, href))
                            abs_url = abs_url.rstrip("/")
                            if (
                                abs_url.startswith(base_origin)
                                and abs_url not in visited
                                and abs_url not in queue
                                and not _SKIP_EXTENSIONS.search(abs_url)
                            ):
                                queue.append(abs_url)

                except Exception as exc:
                    logger.debug("Failed Playwright page fetch for %s: %s", current_url, exc)

            await browser.close()

        combined = "\n\n".join(texts)
        return combined, len(texts)

    async def _scroll_page(self, page: any) -> None:
        """Smoothly scroll viewport down to trigger IntersectionObserver, Framer Motion, and scroll animations."""
        try:
            for _ in range(8):
                await page.evaluate("window.scrollBy(0, 750)")
                await page.wait_for_timeout(350)
            # Scroll to very bottom to guarantee last section renders
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(1000)
            # Scroll back to top
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(300)
        except Exception as exc:
            logger.debug("Scroll execution error: %s", exc)

    async def _click_dynamic_elements(self, page: any) -> None:
        """Click interactive tabs, accordions, and buttons to reveal hidden dynamic text."""
        tab_selectors = [
            '[role="tab"]',
            '.tab-link, .tab-btn',
            '.accordion-header, .accordion-toggle',
            '.collapse-toggle',
            '.category-btn, .filter-btn',
        ]
        for sel in tab_selectors:
            try:
                elements = await page.query_selector_all(sel)
                for el in elements[:5]:
                    if await el.is_visible():
                        await el.click(timeout=800)
                        await page.wait_for_timeout(300)
            except Exception:
                pass

    @staticmethod
    def _extract_clean_text(soup: BeautifulSoup) -> str:
        """Extract clean text stripping executable scripts/styles while preserving structural headers/footers/nav."""
        # Extract title and meta description if present
        meta_parts = []
        title_tag = soup.find("title")
        if title_tag and title_tag.get_text(strip=True):
            meta_parts.append(f"Title: {title_tag.get_text(strip=True)}")
        
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            meta_parts.append(f"Description: {meta_desc['content']}")

        # Remove non-textual code tags only (keep nav, header, footer for SPAs/portfolios)
        for tag in soup(["script", "style", "noscript", "iframe", "svg", "style"]):
            tag.decompose()

        raw = soup.get_text(separator="\n", strip=True)
        lines = [line.strip() for line in raw.splitlines() if line.strip()]
        body_text = "\n".join(lines)

        if meta_parts:
            header_block = "=== META DATA ===\n" + "\n".join(meta_parts) + "\n\n=== MAIN CONTENT ==="
            return f"{header_block}\n{body_text}"

        return body_text

