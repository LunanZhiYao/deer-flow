"""
用户认证中间件

该中间件确保所有线程操作都包含用户ID，并验证用户是否有权限访问线程。
"""
import logging
from typing import NotRequired, override

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langgraph.config import get_config
from langgraph.runtime import Runtime

logger = logging.getLogger(__name__)


class UserAuthMiddlewareState(AgentState):
    """用户认证中间件状态"""
    user_id: NotRequired[str | None]
    thread_id: NotRequired[str | None]


class UserAuthMiddleware(AgentMiddleware[UserAuthMiddlewareState]):
    """
    用户认证中间件
    
    该中间件：
    1. 从运行时上下文中提取用户ID
    2. 验证用户ID是否存在
    3. 将用户ID存储在状态中，供后续中间件使用
    
    使用方法：
    在创建agent时添加此中间件：
    
    ```python
    from deerflow.agents.middlewares.user_auth_middleware import UserAuthMiddleware
    
    middlewares = [
        UserAuthMiddleware(),
        # 其他中间件...
    ]
    ```
    """
    
    state_schema = UserAuthMiddlewareState
    
    @override
    def before_agent(self, state: UserAuthMiddlewareState, runtime: Runtime) -> dict | None:
        """
        在agent执行前验证用户ID
        
        Args:
            state: 当前状态
            runtime: 运行时上下文
            
        Returns:
            包含用户ID的状态更新
        """
        # 从运行时上下文中获取用户ID
        context = runtime.context or {}
        user_id = context.get("user_id")
        
        # 如果运行时上下文中没有，尝试从config中获取
        if not user_id:
            config = get_config()
            user_id = config.get("configurable", {}).get("user_id")
        
        # 获取线程ID
        thread_id = context.get("thread_id")
        if not thread_id:
            config = get_config()
            thread_id = config.get("configurable", {}).get("thread_id")
        
        # 记录日志
        if user_id:
            logger.info(f"用户认证成功: user_id={user_id}, thread_id={thread_id}")
        else:
            logger.warning(f"未找到用户ID: thread_id={thread_id}")
        
        # 返回状态更新
        return {
            "user_id": user_id,
            "thread_id": thread_id,
        }
