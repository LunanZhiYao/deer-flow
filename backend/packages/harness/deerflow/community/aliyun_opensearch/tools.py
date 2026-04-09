"""
Web Search Tool - Search the web using Aliyun OpenSearch.
"""

import json
import logging
import time

import httpx
from langchain.tools import tool

from deerflow.config import get_app_config

logger = logging.getLogger(__name__)

ALIYUN_OPENSEARCH_URL = "http://default-i0ao.platform-cn-shanghai.opensearch.aliyuncs.com/v3/openapi/workspaces/default/web-search/ops-web-search-001"
DEFAULT_API_KEY = "OS-cog8m3g45btka94h"


def _search_text(
    query: str,
    top_k: int = 5,
    api_key: str = None,
) -> dict:
    """
    Execute text search using Aliyun OpenSearch.

    Args:
        query: Search keywords
        top_k: Maximum number of results
        api_key: Aliyun OpenSearch API key

    Returns:
        Search results dict
    """
    if api_key is None:
        api_key = DEFAULT_API_KEY

    payload = {
        "history": [],
        "query": query,
        "query_rewrite": True,
        "top_k": top_k,
        "content_type": "summary",
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                ALIYUN_OPENSEARCH_URL,
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error occurred: {e}")
        return {"error": f"HTTP error: {e}", "status_code": e.response.status_code}
    except httpx.RequestError as e:
        logger.error(f"Request error occurred: {e}")
        return {"error": f"Request error: {e}"}
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        return {"error": f"JSON decode error: {e}"}


@tool("web_search", parse_docstring=True)
def web_search_tool(
    query: str,
    top_k: int = 5,
) -> str:
    """Search the web for information. Use this tool to find current information, news, articles, and facts from the internet.

    Args:
        query: Search keywords describing what you want to find. Be specific for better results.
        top_k: Maximum number of results to return. Default is 5.
    """
    start_time = time.time()

    config = get_app_config().get_tool_config("web_search")

    if config is not None and "top_k" in config.model_extra:
        top_k = config.model_extra.get("top_k", top_k)

    api_key = DEFAULT_API_KEY
    if config is not None and "api_key" in config.model_extra:
        api_key = config.model_extra.get("api_key", api_key)

    logger.info(f"Executing web search for query: {query}")

    result = _search_text(
        query=query,
        top_k=top_k,
        api_key=api_key,
    )

    elapsed = time.time() - start_time
    logger.info(f"Search completed in {elapsed:.2f}s")

    if "error" in result:
        return json.dumps({
            "error": result.get("error"),
            "query": query,
            "suggestion": "Please check your network connection or API key configuration"
        }, ensure_ascii=False)

    normalized_results = []
    
    search_results = result.get("result", result.get("results", result.get("data", [])))
    
    if isinstance(search_results, list):
        for r in search_results:
            url = r.get("url", r.get("link", r.get("href", "")))
            title = r.get("title", "")
            content = r.get("content", r.get("snippet", r.get("body", r.get("summary", ""))))

            if not url or not title:
                continue

            normalized_results.append({
                "title": title,
                "url": url,
                "content": content,
            })

    if not normalized_results:
        return json.dumps({
            "query": query,
            "total_results": 0,
            "search_time_seconds": round(elapsed, 2),
            "raw_response": result,
        }, indent=2, ensure_ascii=False)

    output = {
        "query": query,
        "total_results": len(normalized_results),
        "search_time_seconds": round(elapsed, 2),
        "results": normalized_results,
    }

    return json.dumps(output, indent=2, ensure_ascii=False)
