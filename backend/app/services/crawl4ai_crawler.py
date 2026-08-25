"""
Crawl4AI Crawler Engine
RAG-optimized markdown & structured text crawler for documentation sites,
knowledge bases, and AI context ingestion.
"""

from __future__ import annotations
import asyncio
import logging
from typing import Tuple

logger = logging.getLogger(__name__)


class Crawl4AICrawler:
    """
    Crawl4AI adapter for AI-ready Markdown extraction.
    Falls back gracefully if crawl4ai is not installed in the environment.
    """

    async def crawl(self, seed_url: str, max_pages: int = 50) -> Tuple[str, int]:
        """
        Crawl using Crawl4AI AsyncWebCrawler.
        Returns (combined_markdown_text, pages_crawled).
        """
        try:
            from crawl4ai import AsyncWebCrawler
        except ImportError:
            logger.info("Crawl4AI not installed in environment")
            return "", 0

        crawled_texts = []
        try:
            async with AsyncWebCrawler(verbose=False) as crawler:
                logger.info("Crawl4AI starting crawl for %s (max %d pages)", seed_url, max_pages)
                result = await crawler.arun(url=seed_url)

                if result and result.success and result.markdown:
                    markdown_content = result.markdown
                    if len(markdown_content.strip()) > 50:
                        crawled_texts.append(f"--- PAGE: {seed_url} ---\n{markdown_content}")

                # If Crawl4AI supports deep crawl mode in current version:
                if hasattr(result, "internal_links") and result.internal_links:
                    links = list(dict.fromkeys(result.internal_links))[: max_pages - 1]
                    for link in links:
                        try:
                            sub_res = await crawler.arun(url=link)
                            if sub_res and sub_res.success and sub_res.markdown:
                                crawled_texts.append(f"--- PAGE: {link} ---\n{sub_res.markdown}")
                        except Exception as sub_exc:
                            logger.debug("Crawl4AI sub-page fail %s: %s", link, sub_exc)

        except Exception as exc:
            logger.warning("Crawl4AI execution error: %s", exc)

        combined = "\n\n".join(crawled_texts)
        return combined, len(crawled_texts)
