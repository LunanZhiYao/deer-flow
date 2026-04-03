import logging
import os
import time

import requests

logger = logging.getLogger(__name__)


class JinaClient:
    def crawl(self, url: str, return_format: str = "html", timeout: int = 30) -> str:
        """
        Crawl a web page using Jina AI Reader API.

        Args:
            url: The URL to crawl
            return_format: Format to return (html, text, markdown)
            timeout: Timeout in seconds for the request (default: 30)

        Returns:
            The crawled content or error message
        """
        headers = {
            "Content-Type": "application/json",
            "X-Return-Format": return_format,
            "X-Timeout": str(timeout),
        }
        if os.getenv("JINA_API_KEY"):
            headers["Authorization"] = f"Bearer {os.getenv('JINA_API_KEY')}"
        else:
            logger.warning("Jina API key is not set. Provide your own key to access a higher rate limit. See https://jina.ai/reader for more information.")
        data = {"url": url}

        # Retry configuration
        max_retries = 3
        retry_delay = 2  # seconds

        last_exception = None
        for attempt in range(max_retries):
            try:
                logger.debug(f"Fetching URL (attempt {attempt + 1}/{max_retries}): {url}")
                start_time = time.time()

                response = requests.post(
                    "https://r.jina.ai/",
                    headers=headers,
                    json=data,
                    timeout=timeout
                )

                elapsed = time.time() - start_time
                logger.debug(f"Request completed in {elapsed:.2f}s, status: {response.status_code}")

                if response.status_code != 200:
                    error_message = f"Jina API returned status {response.status_code}: {response.text}"
                    logger.warning(error_message)

                    # Don't retry on client errors (4xx) except 429 (rate limit)
                    if 400 <= response.status_code < 500 and response.status_code != 429:
                        return f"Error: {error_message}"

                    last_exception = Exception(error_message)
                else:
                    if not response.text or not response.text.strip():
                        error_message = "Jina API returned empty response"
                        logger.error(error_message)
                        return f"Error: {error_message}"

                    logger.debug(f"Successfully fetched content from {url}")
                    return response.text

            except requests.exceptions.Timeout as e:
                error_message = f"Request to Jina API timed out after {timeout}s: {str(e)}"
                logger.warning(f"Attempt {attempt + 1}/{max_retries}: {error_message}")
                last_exception = e
            except requests.exceptions.ConnectionError as e:
                error_message = f"Connection error to Jina API: {str(e)}"
                logger.warning(f"Attempt {attempt + 1}/{max_retries}: {error_message}")
                last_exception = e
            except Exception as e:
                error_message = f"Request to Jina API failed: {str(e)}"
                logger.warning(f"Attempt {attempt + 1}/{max_retries}: {error_message}")
                last_exception = e

            # If we haven't succeeded and we have more attempts, wait before retrying
            if attempt < max_retries - 1:
                wait_time = retry_delay * (attempt + 1)  # Exponential backoff
                logger.debug(f"Waiting {wait_time}s before retry...")
                time.sleep(wait_time)

        # All retries failed
        error_message = f"All {max_retries} attempts failed. Last error: {str(last_exception) if last_exception else 'Unknown error'}"
        logger.error(error_message)
        return f"Error: {error_message}"
