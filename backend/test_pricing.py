"""Test script to inspect how the Naturals pricing page loads its data."""
import asyncio
from playwright.async_api import async_playwright


async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Capture network requests to find pricing API calls
        api_calls = []

        def on_request(request):
            url = request.url
            if any(k in url.lower() for k in ["price", "api", "data", "json", "service"]):
                api_calls.append(url)

        page.on("request", on_request)

        await page.goto(
            "https://naturals.in/PRICING_MEN/index.html",
            wait_until="domcontentloaded",
            timeout=30000,
        )
        await page.wait_for_timeout(10000)

        print(f"=== API/data calls intercepted: {len(api_calls)} ===")
        for u in api_calls:
            print(f"  {u}")

        # Check iframe
        iframes = await page.query_selector_all("iframe")
        for i, frame in enumerate(iframes):
            src = await frame.get_attribute("src") or "(no src)"
            print(f"\niframe {i}: {src}")

            # Try to get content from iframe
            try:
                frame_el = await frame.content_frame()
                if frame_el:
                    frame_html = await frame_el.content()
                    has_price = "4500" in frame_html or "Regular" in frame_html
                    print(f"  iframe HTML length: {len(frame_html)}, has pricing: {has_price}")
                    if has_price:
                        # Extract text
                        frame_text = await frame_el.evaluate("() => document.body.innerText")
                        print(f"  iframe text (first 2000 chars):")
                        print(frame_text[:2000])
            except Exception as e:
                print(f"  iframe error: {e}")

        # Also try: visible text on the whole page
        visible_text = await page.evaluate("() => document.body.innerText")
        lines_with_digits = [
            l.strip()
            for l in visible_text.splitlines()
            if any(c.isdigit() for c in l) and 5 < len(l.strip()) < 200
        ]
        print(f"\n=== Lines with numbers in visible text: {len(lines_with_digits)} ===")
        for l in lines_with_digits[:30]:
            print(f"  {l}")

        await browser.close()


asyncio.run(test())
