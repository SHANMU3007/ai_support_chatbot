"""
JavaScript-Aware Scraper – uses Playwright (headless Chromium) to render
JS-heavy pages, click through tabs/carousels, and extract full content
including dynamically loaded pricing tables.
"""
import asyncio
import logging
import re
from typing import List, Tuple

from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


async def scrape_with_js(url: str, wait_seconds: int = 5) -> str:
    """
    Render *url* in headless Chromium, click through any tab/accordion
    elements to reveal hidden content, then return all visible text.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.warning("Playwright not installed – falling back to basic scrape")
        return ""

    text_parts: List[str] = []

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
            )
            page = await context.new_page()

            # Use domcontentloaded instead of networkidle to avoid
            # hanging on sites with persistent connections (analytics, etc.)
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            # Give JS extra time to render dynamic content
            await page.wait_for_timeout(wait_seconds * 1000)

            # ── Step 1: Extract initial page content ───────────────────────
            initial_text = await _extract_page_content(page)
            if initial_text:
                text_parts.append(initial_text)

            # ── Step 2: Find and click all tab-like elements ───────────────
            tab_selectors = [
                # Generic tab patterns
                '[role="tab"]',
                '.tab-link, .tab-item, .tab-btn',
                '.nav-link, .nav-tab, .nav-item a',
                # Swiper/carousel pagination dots (Naturals uses Swiper.js)
                '.swiper-pagination-bullet',
                '.carousel-indicator, .carousel-dot',
                # Accordion patterns
                '.accordion-header, .accordion-toggle',
                '.collapse-toggle',
                # Category/filter buttons
                '.category-btn, .filter-btn',
                '.pricing-tab, .price-tab',
            ]

            clicked_count = 0
            for selector in tab_selectors:
                try:
                    tabs = await page.query_selector_all(selector)
                    if len(tabs) <= 1:
                        continue

                    logger.info(
                        "Found %d clickable elements for '%s' on %s",
                        len(tabs), selector, url,
                    )

                    for i, tab in enumerate(tabs):
                        try:
                            # Scroll the tab into view first
                            await tab.scroll_into_view_if_needed()
                            await page.wait_for_timeout(300)

                            # Click the tab
                            await tab.click()
                            clicked_count += 1
                            await page.wait_for_timeout(2000)

                            # Extract content after clicking
                            tab_content = await _extract_page_content(page)
                            if tab_content:
                                text_parts.append(tab_content)

                        except Exception as exc:
                            logger.debug("Failed to click tab %d: %s", i, exc)
                            continue

                except Exception:
                    continue

            # ── Step 3: Scroll to trigger lazy-loaded content ──────────────
            for _ in range(5):
                await page.evaluate("window.scrollBy(0, window.innerHeight)")
                await page.wait_for_timeout(800)

            # Final extraction after scrolling
            final_text = await _extract_page_content(page)
            if final_text:
                text_parts.append(final_text)

            logger.info(
                "JS scrape of %s: %d tab clicks, %d content extractions",
                url, clicked_count, len(text_parts),
            )
            await browser.close()

    except Exception as exc:
        logger.exception("Playwright scraping failed for %s", url)
        return ""

    combined = _deduplicate_content("\n\n".join(text_parts))
    logger.info("JS-scraped %s: %d chars", url, len(combined))
    return combined


async def _extract_page_content(page) -> str:
    """Extract structured text from the current page state, preserving tables."""
    try:
        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")

        # Remove non-content tags
        for tag in soup(["script", "style", "noscript", "iframe", "svg", "link", "meta"]):
            tag.decompose()

        # ── Extract structured pricing tables ──────────────────────────
        pricing_lines: List[str] = []

        # 1. HTML tables
        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all(["td", "th"])
                cell_texts = [c.get_text(strip=True) for c in cells if c.get_text(strip=True)]
                if cell_texts:
                    pricing_lines.append(" | ".join(cell_texts))

        # 2. Find any element whose text looks like a price row
        #    Pattern: "SERVICE NAME" followed by numbers (the pricing layout)
        price_re = re.compile(r'\d{3,5}')
        for el in soup.find_all(["div", "li", "p", "span", "td"]):
            text = el.get_text(strip=True)
            # A pricing row is usually short and contains at least one 3-5 digit number
            if 10 < len(text) < 300 and price_re.search(text):
                # Avoid duplicates from parent/child nesting
                children_with_text = [
                    c for c in el.find_all(["div", "li", "p", "span", "td"], recursive=False)
                    if c.get_text(strip=True) == text
                ]
                if not children_with_text:
                    pricing_lines.append(text)

        # ── Remove nav/footer then get body text ───────────────────────
        for tag in soup(["nav", "footer"]):
            tag.decompose()

        body = soup.find("body") or soup
        raw_text = body.get_text(separator="\n", strip=True)
        body_lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
        body_text = "\n".join(body_lines)

        # Combine
        parts = []
        if pricing_lines:
            unique_pricing = list(dict.fromkeys(pricing_lines))
            parts.append("=== PRICING DATA ===\n" + "\n".join(unique_pricing))
        parts.append(body_text)

        return "\n\n".join(parts)

    except Exception as exc:
        logger.warning("Content extraction failed: %s", exc)
        return ""


def _deduplicate_content(text: str) -> str:
    """Remove duplicate lines while preserving order."""
    seen = set()
    unique_lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped and stripped not in seen:
            seen.add(stripped)
            unique_lines.append(stripped)
    return "\n".join(unique_lines)
