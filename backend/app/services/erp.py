import hashlib
import logging
import os
import time
from typing import Any

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

_ERP_BASE_URL = (os.environ.get("ERP_BASE_URL") or "").strip()
_ERP_APP_ID = (os.environ.get("ERP_APP_ID") or "").strip()
_ERP_APP_SECRET = (os.environ.get("ERP_APP_SECRET") or "").strip()
_ERP_APPLICATION_ID = (os.environ.get("ERP_APPLICATION_ID") or "").strip()
_ERP_TIMEOUT_SECONDS = float(os.environ.get("ERP_TIMEOUT_SECONDS") or 10)

_ERP_METHOD_GET_USER_BY_WORK_CODE = "Common.CommonSync.GetWxUser"


def _create_sign(params: dict[str, Any]) -> str:
    sorted_items = sorted(params.items(), key=lambda item: item[0])
    payload = "".join(f"{k}{v}" for k, v in sorted_items)
    raw = f"{_ERP_APP_SECRET}{payload}{_ERP_APP_SECRET}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest().upper()


def _joint_params(params: dict[str, Any], method: str) -> dict[str, Any]:
    merged: dict[str, Any] = {
        **params,
        "method": method,
        "app_id": _ERP_APP_ID,
        "app_secret": _ERP_APP_SECRET,
        "nonce": str(int(time.time())),
        "application_id": _ERP_APPLICATION_ID,
    }
    merged["sign"] = _create_sign(merged)
    return merged


def _ensure_erp_config() -> None:
    missing = []
    if not _ERP_BASE_URL:
        missing.append("ERP_BASE_URL")
    if not _ERP_APP_ID:
        missing.append("ERP_APP_ID")
    if not _ERP_APP_SECRET:
        missing.append("ERP_APP_SECRET")
    if not _ERP_APPLICATION_ID:
        missing.append("ERP_APPLICATION_ID")
    if not _ERP_METHOD_GET_USER_BY_WORK_CODE:
        missing.append("ERP_METHOD_GET_USER_BY_WORK_CODE")
    if missing:
        logger.error("ERP config missing: %s", ",".join(missing))
        raise HTTPException(
            status_code=500,
            detail="ERP配置缺失",
        )


def login_by_work_code(workCode: str) -> Any:
    _ensure_erp_config()
    if not workCode or not str(workCode).strip():
        raise HTTPException(status_code=400, detail="workCode is required")

    decoded_work_code = workCode
    biz_params = {
        "workCode": decoded_work_code,
        "type": "pc",
    }
    payload = _joint_params(biz_params, _ERP_METHOD_GET_USER_BY_WORK_CODE)
    payload_for_log = {
        **payload,
        "app_secret": "***",
        "sign": (payload.get("sign") or "")[:8] + "...",
    }

    logger.info(
        "ERP login_by_work_code start. method=%s base_url=%s workCode=%s payload=%s",
        _ERP_METHOD_GET_USER_BY_WORK_CODE,
        _ERP_BASE_URL,
        decoded_work_code,
        payload_for_log,
    )

    try:
        resp = httpx.post(_ERP_BASE_URL, data=payload, timeout=_ERP_TIMEOUT_SECONDS)

        logger.info(
            "ERP login_by_work_code response. status_code=%s body=%s",
            resp.status_code,
            resp.text[:2000],
        )
        resp.raise_for_status()
        body = resp.json()
    except httpx.HTTPError as exc:
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        raw_body = getattr(getattr(exc, "response", None), "text", "") or ""
        logger.exception(
            "ERP login_by_work_code http error. base_url=%s method=%s payload_keys=%s status_code=%s response_body=%s",
            _ERP_BASE_URL,
            _ERP_METHOD_GET_USER_BY_WORK_CODE,
            sorted(payload.keys()),
            status_code,
            raw_body,
        )
        raise HTTPException(status_code=500, detail="ERP请求失败") from exc
    except ValueError as exc:
        raw_body = resp.text if "resp" in locals() else ""
        status_code = resp.status_code if "resp" in locals() else None
        logger.exception(
            "ERP login_by_work_code json decode error. status_code=%s raw_response=%s",
            status_code,
            raw_body,
        )
        raise HTTPException(status_code=500, detail="ERP响应解析失败") from exc

    ok = bool(body.get("status") if "status" in body else body.get("state"))
    if not body or body.get("code") == 500 or not ok:
        msg = body.get("msg") if isinstance(body, dict) else None
        logger.error(
            "ERP login_by_work_code business error. response=%s",
            str(body)[:2000],
        )
        logger.error("ERP login_by_work_code business error msg=%s", msg or "数据返回失败")
        raise HTTPException(status_code=500, detail="ERP认证失败")

    logger.info("ERP login_by_work_code success. has_data=%s", body.get("data") is not None)
    return body.get("data")
