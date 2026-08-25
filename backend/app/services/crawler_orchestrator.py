"""
Crawler Orchestrator Engine
Automatically detects target website architecture and routes URLs to:
- StaticCrawler (httpx + BeautifulSoup)
- CrawleePlaywrightScraper (Crawlee + Playwright headless browser)
- Crawl4AICrawler (Crawl4AI markdown extraction for docs & RAG)
"""

from __future__ import annotations
import asyncio
import logging
import re
from typing import Tuple, Literal
from urllib.parse import urlparse

import httpx

from app.services.url_scraper import URLScraper
from app.services.crawlee_scraper import CrawleePlaywrightScraper
from app.services.crawl4ai_crawler import Crawl4AICrawler

logger = logging.getLogger(__name__)

CrawlerType = Literal["static", "crawlee_playwright", "crawl4ai"]


class CrawlerOrchestrator:
    def __init__(self):
        self.static_crawler = URLScraper()
        self.crawlee_playwright = CrawleePlaywrightScraper()
        self.crawl4ai_crawler = Crawl4AICrawler()

    async def detect_site_type(self, url: str) -> CrawlerType:
        """
        Probe target URL to detect site architecture and return optimal crawler type.
        """
        # Docs and knowledge base URL patterns ideal for Crawl4AI
        lower_url = url.lower()
        if any(pat in lower_url for pat in ["/docs", "/wiki", "/help", "gitbook", "readthedocs", "notion.site", "/mdx"]):
            logger.info("Docs pattern detected for %s → selecting crawl4ai", url)
            return "crawl4ai"

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

        try:
            async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=4.0) as client:
                resp = await client.get(url)

                # Check for Cloudflare challenge or bot blocking
                if resp.status_code in (403, 503) or "cloudflare" in resp.headers.get("server", "").lower():
                    logger.info("Cloudflare edge / HTTP %d detected for %s → selecting crawlee_playwright", resp.status_code, url)
                    return "crawlee_playwright"

                html = resp.text[:4000].lower()

                # Check for Client-Side Rendered (CSR) SPA shells
                if any(marker in html for marker in ["<div id=\"root\"></div>", "<div id=\"app\"></div>", "id=\"__next_data__\"", "data-reactroot"]):
                    logger.info("SPA dynamic shell detected for %s → selecting crawlee_playwright", url)
                    return "crawlee_playwright"

        except Exception as exc:
            logger.debug("Probe failed for %s: %s — defaulting to static with Playwright fallback", url, exc)

        return "static"

    async def crawl(self, seed_url: str, max_pages: int = 50) -> Tuple[str, int, str]:
        """
        Orchestrate crawling using auto-detected crawler with fallback escalation.
        Returns (combined_text, pages_crawled, crawler_used).
        """
        chosen_type = await self.detect_site_type(seed_url)
        logger.info("Orchestrator selected crawler '%s' for %s", chosen_type, seed_url)

        text = ""
        pages = 0

        # Attempt 1: Primary chosen crawler
        if chosen_type == "crawl4ai":
            text, pages = await self.crawl4ai_crawler.crawl(seed_url, max_pages)
            if text and len(text.strip()) > 100:
                return text, pages, "crawl4ai"

        if chosen_type == "crawlee_playwright" or chosen_type == "crawl4ai":
            text, pages = await self.crawlee_playwright.crawl(seed_url, max_pages)
            if text and len(text.strip()) > 100:
                return text, pages, "crawlee_playwright"

        # Attempt 2: Static crawler (httpx + BS4)
        try:
            text, pages = await self.static_crawler.crawl(seed_url, max_pages)
            if text and len(text.strip()) > 100:
                return text, pages, "static"
        except Exception as exc:
            logger.warning("Static crawler failed for %s: %s", seed_url, exc)

        # Attempt 3: Fallback escalation to Crawlee + Playwright
        logger.info("Escalating fallback to Crawlee + Playwright for %s", seed_url)
        text, pages = await self.crawlee_playwright.crawl(seed_url, max_pages)
        return text, pages, "crawlee_playwright"
