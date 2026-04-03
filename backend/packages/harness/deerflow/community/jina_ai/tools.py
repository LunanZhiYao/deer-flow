import logging

from langchain.tools import tool

from deerflow.community.jina_ai.jina_client import JinaClient
from deerflow.config import get_app_config
from deerflow.utils.readability import ReadabilityExtractor

logger = logging.getLogger(__name__)

readability_extractor = ReadabilityExtractor()


@tool("web_fetch", parse_docstring=True)
def web_fetch_tool(url: str) -> str:
    """Fetch the contents of a web page at a given URL.
    Only fetch EXACT URLs that have been provided directly by the user or have been returned in results from the web_search and web_fetch tools.
    This tool can NOT access content that requires authentication, such as private Google Docs or pages behind login walls.
    Do NOT add www. to URLs that do NOT have them.
    URLs must include the schema: https://example.com is a valid URL while example.com is an invalid URL.

    Args:
        url: The URL to fetch the contents of.
    """
    import time
    start_time = time.time()

    logger.info(f"Fetching web page: {url}")

    jina_client = JinaClient()
    timeout = 30  # Increased default timeout
    config = get_app_config().get_tool_config("web_fetch")
    if config is not None and "timeout" in config.model_extra:
        timeout = config.model_extra.get("timeout")

    html_content = jina_client.crawl(url, return_format="html", timeout=timeout)

    # Check for errors from Jina client
    if html_content.startswith("Error:"):
        elapsed = time.time() - start_time
        logger.warning(f"Fetch failed after {elapsed:.2f}s: {html_content}")
        return html_content

    try:
        article = readability_extractor.extract_article(html_content)
        markdown_content = article.to_markdown()

        # If we got very little content, try to return raw content instead
        if len(markdown_content.strip()) < 50 and len(html_content) > 100:
            logger.warning(f"Readability extraction produced very little content, returning raw snippet")
            # Return a raw HTML snippet as fallback
            from html import unescape
            import re
            # Clean up HTML and return a snippet
            clean_text = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL)
            clean_text = re.sub(r'<style[^>]*>.*?</style>', '', clean_text, flags=re.DOTALL)
            clean_text = re.sub(r'<[^>]+>', ' ', clean_text)
            clean_text = re.sub(r'\s+', ' ', clean_text)
            clean_text = unescape(clean_text.strip())
            if clean_text:
                markdown_content = clean_text[:4096]

        result = markdown_content[:4096]

        elapsed = time.time() - start_time
        logger.info(f"Successfully fetched and processed in {elapsed:.2f}s, got {len(result)} chars")

        return result

    except Exception as e:
        elapsed = time.time() - start_time
        error_msg = f"Error processing content: {str(e)}"
        logger.error(f"{error_msg} after {elapsed:.2f}s")

        # Fallback: return raw content snippet if processing fails
        if len(html_content) > 0 and not html_content.startswith("Error:"):
            from html import unescape
            import re
            clean_text = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL)
            clean_text = re.sub(r'<style[^>]*>.*?</style>', '', clean_text, flags=re.DOTALL)
            clean_text = re.sub(r'<[^>]+>', ' ', clean_text)
            clean_text = re.sub(r'\s+', ' ', clean_text)
            clean_text = unescape(clean_text.strip())
            if clean_text:
                logger.warning("Falling back to raw content snippet")
                return clean_text[:4096]

        return f"Error: {error_msg}"
