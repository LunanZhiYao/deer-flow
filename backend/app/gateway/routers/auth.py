<<<<<<< HEAD
import logging
from typing import Any, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.services.erp import login_by_work_code

=======
"""
认证路由模块

处理云上鲁南 workCode 认证逻辑
"""

import hashlib
import hmac
import json
import logging
import time
from base64 import b64decode
from typing import Any
from urllib.parse import unquote

from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

>>>>>>> 387113f8af7b69f8576f29663bee1a03fbe68ea2
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

<<<<<<< HEAD

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
=======
# AES 加密配置
AES_PUBLIC_KEY = "5efd3f6060e20330"
AES_PRIVATE_KEY = "625202f9149e0611"

# JWT 验证密钥
JWT_KEY = "lunanzhiyao"


class AuthResponse(BaseModel):
    """认证响应模型"""

    success: bool = Field(..., description="认证是否成功")
    user_id: str | None = Field(None, description="用户 ID")
    message: str | None = Field(None, description="消息")


def decrypt_work_code(work_code: str) -> str:
    """
    AES-128-CBC 解密函数

    Args:
        work_code: Base64 编码的加密数据

    Returns:
        解密后的字符串
    """
    logger.info(f"[AES解密] 开始解密 workCode, 长度: {len(work_code)}")

    try:
        # URL 解码
        decoded_work_code = unquote(work_code)
        logger.debug(f"[AES解密] URL解码后长度: {len(decoded_work_code)}")

        # Base64 解码
        encrypted_data = b64decode(decoded_work_code)
        logger.debug(f"[AES解密] Base64解码后长度: {len(encrypted_data)}")

        # AES 解密 - 使用 OPENSSL_RAW_DATA | OPENSSL_ZERO_PADDING 模式
        # 对应 PHP: openssl_decrypt(base64_decode($input), 'AES-128-CBC', $public_key, OPENSSL_RAW_DATA | OPENSSL_ZERO_PADDING, $private_key)
        cipher = AES.new(
            AES_PUBLIC_KEY.encode("utf-8"), AES.MODE_CBC, AES_PRIVATE_KEY.encode("utf-8")
        )
        decrypted = cipher.decrypt(encrypted_data)
        logger.debug(f"[AES解密] AES解密后长度: {len(decrypted)}")

        # 移除 PKCS7 padding - 参考 PHP 代码
        dec_s = len(decrypted)
        padding = decrypted[dec_s - 1]

        logger.debug(f"[AES解密] padding值: {padding}")

        if padding == 0:
            result = decrypted.decode("utf-8")
        else:
            result = decrypted[: dec_s - padding].decode("utf-8")

        logger.info(f"[AES解密] 解密成功, 结果长度: {len(result)}")
        logger.debug(f"[AES解密] 解密结果: {result[:100]}...")

        return result

    except Exception as e:
        logger.error(f"[AES解密] 解密失败: {e}", exc_info=True)
        raise ValueError(f"解密失败: {e}")


def check_jwt(token: str, key: str = JWT_KEY) -> dict[str, Any] | None:
    """
    JWT 验证函数 - 参考 PHP checkJWT

    Args:
        token: JWT token 字符串
        key: 验证密钥

    Returns:
        解析后的 payload 或 None
    """
    logger.info(f"[JWT验证] 开始验证 token, 长度: {len(token)}")

    try:
        parts = token.split(".")
        if len(parts) != 3:
            logger.error(f"[JWT验证] token格式错误, 部分数量: {len(parts)}")
            return None

        header, payload, signature = parts
        logger.debug(f"[JWT验证] header: {header[:20]}...")
        logger.debug(f"[JWT验证] payload: {payload[:20]}...")

        # Base64 解码 payload
        # PHP: base64_decode($payload)
        # 智能处理 padding：如果已有 padding 就不再添加
        payload_to_decode = payload
        if not payload.endswith("==") and not payload.endswith("="):
            # 计算需要的 padding 长度
            padding_needed = 4 - (len(payload) % 4)
            if padding_needed != 4:
                payload_to_decode = payload + "=" * padding_needed
        
        # 解码 payload
        payload_decoded = b64decode(payload_to_decode).decode("utf-8")
        logger.debug(f"[JWT验证] payload解码结果: {payload_decoded}")
        
        # 尝试解析为 JSON，如果不是 JSON 对象则作为原始字符串处理
        try:
            payload_json = json.loads(payload_decoded)
            logger.debug(f"[JWT验证] payload解析为JSON: {payload_json}")
            # 如果解析结果不是字典，说明是直接的值（如用户ID），需要包装成字典
            if not isinstance(payload_json, dict):
                logger.debug(f"[JWT验证] payload不是JSON对象，作为用户ID处理")
                payload_json = {"user_id": str(payload_json)}
        except json.JSONDecodeError:
            # payload 不是 JSON，可能是直接的用户ID字符串
            logger.debug(f"[JWT验证] payload不是JSON，作为原始字符串处理")
            payload_json = {"user_id": payload_decoded}

        if not payload_json:
            logger.error("[JWT验证] payload解析失败")
            return None

        # 验证签名
        # PHP: hash_hmac('sha256', $header . '.' . $payload, md5($key))
        md5_key = hashlib.md5(key.encode("utf-8")).hexdigest()
        expected_signature = hmac.new(
            md5_key.encode("utf-8"), f"{header}.{payload}".encode("utf-8"), hashlib.sha256
        ).hexdigest()

        logger.debug(f"[JWT验证] 期望签名: {expected_signature}")
        logger.debug(f"[JWT验证] 实际签名: {signature}")

        if expected_signature != signature:
            logger.error("[JWT验证] 签名不匹配")
            return None

        logger.info(f"[JWT验证] 验证成功, payload: {payload_json}")
        return payload_json

    except Exception as e:
        logger.error(f"[JWT验证] 验证失败: {e}", exc_info=True)
        return None


def validate_timestamp(timestamp: int, max_age: int = 3600) -> bool:
    """
    验证时间戳是否在有效期内

    Args:
        timestamp: 时间戳（秒）
        max_age: 最大有效期（秒），默认 3600 秒（1小时）

    Returns:
        是否有效
    """
    now = int(time.time())
    diff = abs(now - timestamp)
    is_valid = diff <= max_age

    logger.info(f"[时间戳验证] 当前时间: {now}, 发送时间: {timestamp}, 差值: {diff}秒, 有效: {is_valid}")

    return is_valid


def get_ysln_user_info(work_code: str) -> str | None:
    """
    根据workCode获取用户id - 参考 PHP getYSLNUserInfo
    
    支持两种格式：
    1. workCode 直接是 JWT token
    2. workCode 是 AES 加密的 JSON，包含 JWT token

    Args:
        work_code: 加密的 workCode 或直接的 JWT token

    Returns:
        用户 ID 或 None
    """
    logger.info(f"[获取用户信息] 开始处理 workCode")

    try:
        # 首先检查 workCode 是否直接是 JWT token 格式（三个部分用点分隔）
        parts = work_code.split(".")
        if len(parts) == 3:
            # 尝试直接解析为 JWT
            logger.info("[获取用户信息] workCode格式为JWT，尝试直接解析")
            payload = check_jwt(work_code)
            if payload:
                user_id = payload.get("user_id")
                if user_id:
                    logger.info(f"[获取用户信息] 直接JWT解析成功，用户ID: {user_id}")
                    return str(user_id)
                else:
                    logger.warning("[获取用户信息] JWT payload中没有user_id")
            else:
                logger.warning("[获取用户信息] 直接JWT解析失败，尝试AES解密")

        # 尝试 AES 解密方式
        logger.info("[获取用户信息] 尝试AES解密方式")
        
        # 解密 workCode
        token_info_str = decrypt_work_code(work_code)

        # 解析 JSON
        token_info = json.loads(token_info_str)
        logger.info(f"[获取用户信息] token_info: {token_info}")

        if not token_info or "time" not in token_info or "content" not in token_info:
            logger.error("[获取用户信息] token_info 格式无效")
            return None

        # 验证时间戳
        # PHP: $send_time = substr($token_info['time'], 0, 10);
        send_time = int(str(token_info["time"])[:10])
        if not validate_timestamp(send_time):
            logger.error("[获取用户信息] 时间戳验证失败，请校对手机系统时间")
            return None

        # 获取 token
        token = token_info.get("content", "")
        if not token:
            logger.error("[获取用户信息] content 为空")
            return None

        logger.info(f"[获取用户信息] token: {token[:50]}...")

        # 验证 JWT
        payload = check_jwt(token)
        if not payload:
            logger.error("[获取用户信息] JWT 验证失败")
            return None

        # 获取用户 ID
        user_id = payload.get("user_id")
        if user_id:
            logger.info(f"[获取用户信息] 成功获取用户ID: {user_id}")
            return str(user_id)

        logger.error("[获取用户信息] payload 中没有 user_id")
        return None

    except Exception as e:
        logger.error(f"[获取用户信息] 处理失败: {e}", exc_info=True)
        return None


@router.post(
    "/verify",
    response_model=AuthResponse,
    summary="验证 workCode",
    description="验证云上鲁南 workCode 并返回用户信息",
)
async def verify_work_code(
    work_code: str = Header(..., alias="workCode", description="加密的 workCode"),
) -> AuthResponse:
    """
    验证 workCode

    通过请求头传递 workCode，验证成功返回用户 ID

    Args:
        work_code: 加密的 workCode（通过请求头传递）

    Returns:
        认证结果
    """
    logger.info("=" * 50)
    logger.info("[认证接口] 收到认证请求")
    logger.info(f"[认证接口] workCode长度: {len(work_code) if work_code else 0}")
    logger.info(f"[认证接口] workCode前50字符: {work_code[:50] if work_code else 'None'}")

    if not work_code:
        logger.warning("[认证接口] 缺少 workCode 参数")
        raise HTTPException(status_code=400, detail="缺少 workCode 参数")

    # 获取用户 ID
    user_id = get_ysln_user_info(work_code)

    if user_id:
        logger.info(f"[认证接口] 认证成功, user_id: {user_id}")
        logger.info("=" * 50)
        return AuthResponse(success=True, user_id=user_id, message="认证成功")
    else:
        logger.warning("[认证接口] 认证失败, workCode 无效或已过期")
        logger.info("=" * 50)
        raise HTTPException(status_code=401, detail="身份验证失败，workCode 无效或已过期")
>>>>>>> 387113f8af7b69f8576f29663bee1a03fbe68ea2
