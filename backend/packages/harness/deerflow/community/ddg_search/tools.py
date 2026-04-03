"""
Web Search Tool - Search the web using DuckDuckGo (no API key required).
"""

import json
import logging
import time

from langchain.tools import tool

from deerflow.config import get_app_config

logger = logging.getLogger(__name__)


def _search_text(
    query: str,
    max_results: int = 5,
    region: str = "cn-zh",
    safesearch: str = "moderate",
) -> list[dict]:
    """
    Execute text search using DuckDuckGo.

    Args:
        query: Search keywords
        max_results: Maximum number of results
        region: Search region (default: cn-zh for Chinese content)
        safesearch: Safe search level

    Returns:
        List of search results
    """
    try:
        from ddgs import DDGS
    except ImportError:
        logger.error("ddgs library not installed. Run: pip install ddgs")
        return []

    # Try multiple regions for better results
    regions_to_try = [region, "wt-wt", "us-en"]
    # Remove duplicates while preserving order
    regions_to_try = list(dict.fromkeys(regions_to_try))

    last_exception = None
    for try_region in regions_to_try:
        try:
            logger.debug(f"Trying search with region: {try_region}")
            ddgs = DDGS(timeout=20)  # Reduced timeout for faster failure

            start_time = time.time()
            results = ddgs.text(
                query,
                region=try_region,
                safesearch=safesearch,
                max_results=max_results,
            )
            results_list = list(results) if results else []

            elapsed = time.time() - start_time
            logger.debug(f"Search with region {try_region} took {elapsed:.2f}s, got {len(results_list)} results")

            if results_list:
                return results_list

        except Exception as e:
            last_exception = e
            logger.warning(f"Search failed with region {try_region}: {e}")
            continue

    if last_exception:
        logger.error(f"All search attempts failed. Last error: {last_exception}")
    else:
        logger.error("All search attempts returned no results")

    return []


@tool("web_search", parse_docstring=True)
def web_search_tool(
    query: str,
    max_results: int = 5,
) -> str:
    """Search the web for information. Use this tool to find current information, news, articles, and facts from the internet.

    Args:
        query: Search keywords describing what you want to find. Be specific for better results.
        max_results: Maximum number of results to return. Default is 5.
    """
    start_time = time.time()

    config = get_app_config().get_tool_config("web_search")

    # Override max_results from config if set
    if config is not None and "max_results" in config.model_extra:
        max_results = config.model_extra.get("max_results", max_results)

    # Get region from config if available
    region = "cn-zh"
    if config is not None and "region" in config.model_extra:
        region = config.model_extra.get("region", region)

    logger.info(f"Executing web search for query: {query}")

    results = _search_text(
        query=query,
        max_results=max_results,
        region=region,
    )

    elapsed = time.time() - start_time
    logger.info(f"Search completed in {elapsed:.2f}s, found {len(results)} results")

    if not results:
        return json.dumps({
            "error": "No results found",
            "query": query,
            "suggestion": "Try rephrasing your query with different keywords or check your network connection"
        }, ensure_ascii=False)

    normalized_results = []
    for r in results:
        url = r.get("href", r.get("link", ""))
        title = r.get("title", "")
        content = r.get("body", r.get("snippet", ""))

        # Skip results without essential fields
        if not url or not title:
            continue

        normalized_results.append({
            "title": title,
            "url": url,
            "content": content,
        })

    if not normalized_results:
        return json.dumps({
            "error": "No valid results found after filtering",
            "query": query
        }, ensure_ascii=False)

    output = {
        "query": query,
        "total_results": len(normalized_results),
        "search_time_seconds": round(elapsed, 2),
        "results": normalized_results,
    }

    return json.dumps(output, indent=2, ensure_ascii=False)
