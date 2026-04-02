"""
用户会话隔离模块

该模块提供用户会话管理和数据隔离功能，确保每个用户只能访问自己的对话数据。
"""
import logging
from typing import Optional
from functools import wraps
from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)

# 用于存储当前请求的用户ID（在线程本地存储中）
import threading
_thread_local = threading.local()


def set_current_user_id(user_id: str) -> None:
    """
    设置当前线程的用户ID
    
    Args:
        user_id: 用户ID（通常是从workCode获取的userid）
    """
    _thread_local.user_id = user_id
    logger.debug(f"设置当前用户ID: {user_id}")


def get_current_user_id() -> Optional[str]:
    """
    获取当前线程的用户ID
    
    Returns:
        当前用户ID，如果未设置则返回None
    """
    user_id = getattr(_thread_local, 'user_id', None)
    logger.debug(f"获取当前用户ID: {user_id}")
    return user_id


def clear_current_user_id() -> None:
    """
    清除当前线程的用户ID
    """
    if hasattr(_thread_local, 'user_id'):
        delattr(_thread_local, 'user_id')
    logger.debug("清除当前用户ID")


def require_user_id(func):
    """
    装饰器：确保函数执行时有用户ID
    
    用法:
        @require_user_id
        def my_function():
            user_id = get_current_user_id()
            # ...
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        user_id = get_current_user_id()
        if not user_id:
            logger.error("尝试访问需要用户认证的资源，但未找到用户ID")
            raise HTTPException(
                status_code=401,
                detail="用户未认证，请先登录"
            )
        return func(*args, **kwargs)
    return wrapper


def extract_user_id_from_request(request: Request) -> Optional[str]:
    """
    从请求中提取用户ID
    
    支持多种方式：
    1. 从Cookie中提取（deerflow_user_id）
    2. 从Header中提取（X-User-ID）
    3. 从查询参数中提取（userId）
    
    Args:
        request: FastAPI请求对象
        
    Returns:
        用户ID，如果未找到则返回None
    """
    # 优先从Cookie中获取
    user_id = request.cookies.get("deerflow_user_id")
    if user_id:
        logger.debug(f"从Cookie中获取用户ID: {user_id}")
        return user_id
    
    # 从Header中获取
    user_id = request.headers.get("X-User-ID")
    if user_id:
        logger.debug(f"从Header中获取用户ID: {user_id}")
        return user_id
    
    # 从查询参数中获取
    user_id = request.query_params.get("userId")
    if user_id:
        logger.debug(f"从查询参数中获取用户ID: {user_id}")
        return user_id
    
    logger.warning("未能从请求中提取用户ID")
    return None


class UserContext:
    """
    用户上下文管理器
    
    用于在代码块中自动设置和清除用户ID
    
    用法:
        with UserContext(user_id):
            # 在这个代码块中，get_current_user_id()会返回user_id
            threads = get_user_threads()
    """
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.previous_user_id = None
    
    def __enter__(self):
        # 保存之前的用户ID
        self.previous_user_id = get_current_user_id()
        # 设置新的用户ID
        set_current_user_id(self.user_id)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # 恢复之前的用户ID
        if self.previous_user_id:
            set_current_user_id(self.previous_user_id)
        else:
            clear_current_user_id()
        return False


def validate_user_access(resource_user_id: str) -> bool:
    """
    验证当前用户是否有权限访问指定资源
    
    Args:
        resource_user_id: 资源所属的用户ID
        
    Returns:
        如果当前用户是资源所有者则返回True，否则返回False
        
    Raises:
        HTTPException: 如果用户未认证或无权访问
    """
    current_user_id = get_current_user_id()
    
    if not current_user_id:
        logger.error("用户未认证，尝试访问资源")
        raise HTTPException(
            status_code=401,
            detail="用户未认证"
        )
    
    if current_user_id != resource_user_id:
        logger.warning(
            f"用户 {current_user_id} 尝试访问用户 {resource_user_id} 的资源，拒绝访问"
        )
        raise HTTPException(
            status_code=403,
            detail="无权访问该资源"
        )
    
    return True
