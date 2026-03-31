import logging
from typing import Any, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.services.erp import login_by_work_code

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class ApiResponse(BaseModel):
    code: int = Field(default=0, description="业务状态码，0 表示成功")
    msg: str = Field(default="ok", description="业务消息")
    data: Any = Field(default=None, description="返回数据")


class ErpUserInfo(BaseModel):
    userid: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    workCode: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    mobile: Optional[str] = None
    avatar: Optional[str] = None


class SsoLoginResponse(BaseModel):
    user: ErpUserInfo
    authenticated: bool = True


@router.get("/sso-login", response_model=ApiResponse)
async def sso_login(request: Request) -> ApiResponse:
    workCode = request.query_params.get("workCode")
    
    logger.info("SSO login request received. workCode=%s", workCode)
    
    if not workCode:
        logger.warning("SSO login failed: workCode is missing")
        return ApiResponse(code=401, msg="workCode is required")

    try:
        user_info = login_by_work_code(workCode)
        
        logger.info("ERP response data: %s", user_info)
        
        if not user_info:
            logger.warning("SSO login failed: ERP returned empty user info")
            return ApiResponse(code=401, msg="ERP认证失败")

        erp_user = ErpUserInfo(
            userid=str(user_info.get("userid") or user_info.get("userId")),
            name=user_info.get("name"),
            # email=user_info.get("email"),
            workCode=user_info.get("workCode") or workCode,
            # department=str(user_info.get("department") or user_info.get("dept")),
            # position=user_info.get("position") or user_info.get("title"),
            # mobile=user_info.get("mobile") or user_info.get("phone"),
            # avatar=user_info.get("avatar") or user_info.get("headimgurl"),
        )

        logger.info(
            "SSO login success. userid=%s, name=%s",
            erp_user.userid,
            erp_user.name,
        )

        return ApiResponse(
            data=SsoLoginResponse(
                user=erp_user,
                authenticated=True,
            ).model_dump()
        )
    except Exception as e:
        logger.exception("SSO login failed: %s", str(e))
        return ApiResponse(code=500, msg=f"认证失败: {str(e)}")


@router.get("/health", response_model=ApiResponse)
async def auth_health() -> ApiResponse:
    return ApiResponse(data={"status": "healthy", "service": "deer-flow-auth"})
