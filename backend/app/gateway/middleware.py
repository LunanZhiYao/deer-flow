"""
FastAPI中间件

提供用户认证和数据隔离的中间件
"""
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.services.user_session import (
    set_current_user_id,
    clear_current_user_id,
    extract_user_id_from_request,
)

logger = logging.getLogger(__name__)


class UserAuthMiddleware(BaseHTTPMiddleware):
    """
    用户认证中间件
    
    自动从请求中提取用户ID并设置到线程本地存储中，
    确保后续的处理函数可以通过get_current_user_id()获取用户ID。
    
    支持的用户ID来源（按优先级）：
    1. Cookie: deerflow_user_id
    2. Header: X-User-ID
    3. Query Parameter: userId
    """
    
    async def dispatch(self, request: Request, call_next):
        # 掰开路径，判断是否需要认证
        path = request.url.path
        
        # 不需要认证的路径
        public_paths = [
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/api/auth/sso-login",
            "/api/auth/health",
        ]
        
        # 检查是否是公开路径
        is_public = any(path.startswith(public_path) for public_path in public_paths)
        
        if not is_public:
            # 提取用户ID
            user_id = extract_user_id_from_request(request)
            
            if user_id:
                # 设置用户ID到线程本地存储
                set_current_user_id(user_id)
                logger.info(f"用户认证成功: user_id={user_id}, path={path}")
            else:
                # 对于需要认证的路径，记录警告但不阻止请求
                # 具体的认证检查由各个路由处理
                logger.warning(f"未找到用户ID: path={path}")
        
        try:
            # 继续处理请求
            response = await call_next(request)
            return response
        finally:
            # 清理线程本地存储中的用户ID
            if not is_public:
                clear_current_user_id()
