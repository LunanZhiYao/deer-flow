"""
DeerFlow 日志系统 - 后端模块
提供中文日志记录和计时功能
"""

import functools
import logging
import sys
import time
from datetime import datetime
from typing import Any, Callable, Optional

# 配置日志
logger = logging.getLogger("deerflow")
logger.setLevel(logging.DEBUG)

# 防止重复添加handler
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter(
        "[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)


def log_step(category: str, message: str):
    """
    装饰器：记录函数执行的开始、结束和耗时

    Args:
        category: 日志类别（如："调用大模型"、"工具调用"等）
        message: 日志消息描述
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            start_datetime = datetime.now().strftime("%H:%M:%S")

            logger.info(f"[{category}] 开始: {message} | 时间: {start_datetime}")

            try:
                result = await func(*args, **kwargs)
                end_time = time.time()
                duration = round((end_time - start_time) * 1000, 2)
                end_datetime = datetime.now().strftime("%H:%M:%S")

                logger.info(f"[{category}] 完成: {message} | 耗时: {duration}ms | 时间: {end_datetime}")
                return result
            except Exception as e:
                end_time = time.time()
                duration = round((end_time - start_time) * 1000, 2)
                logger.error(f"[{category}] 失败: {message} | 耗时: {duration}ms | 错误: {str(e)}")
                raise

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            start_datetime = datetime.now().strftime("%H:%M:%S")

            logger.info(f"[{category}] 开始: {message} | 时间: {start_datetime}")

            try:
                result = func(*args, **kwargs)
                end_time = time.time()
                duration = round((end_time - start_time) * 1000, 2)
                end_datetime = datetime.now().strftime("%H:%M:%S")

                logger.info(f"[{category}] 完成: {message} | 耗时: {duration}ms | 时间: {end_datetime}")
                return result
            except Exception as e:
                end_time = time.time()
                duration = round((end_time - start_time) * 1000, 2)
                logger.error(f"[{category}] 失败: {message} | 耗时: {duration}ms | 错误: {str(e)}")
                raise

        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


class DeerFlowLogger:
    """DeerFlow 日志管理器类"""

    @staticmethod
    def info(category: str, message: str, data: Optional[Any] = None) -> None:
        """记录信息日志"""
        if data:
            logger.info(f"[{category}] {message} | 数据: {data}")
        else:
            logger.info(f"[{category}] {message}")

    @staticmethod
    def error(category: str, message: str, error: Optional[Any] = None) -> None:
        """记录错误日志"""
        if error:
            logger.error(f"[{category}] {message} | 错误: {error}")
        else:
            logger.error(f"[{category}] {message}")

    @staticmethod
    def warn(category: str, message: str) -> None:
        """记录警告日志"""
        logger.warning(f"[{category}] {message}")

    @staticmethod
    def debug(category: str, message: str, data: Optional[Any] = None) -> None:
        """记录调试日志"""
        if data:
            logger.debug(f"[{category}] {message} | 数据: {data}")
        else:
            logger.debug(f"[{category}] {message}")


# 便捷函数
df_logger = DeerFlowLogger()


def log_frontend_send_text(message: str, has_files: bool = False) -> None:
    """记录前端发送文字"""
    df_logger.info("前端发送文字", f"收到用户消息: {message[:50]}{'...' if len(message) > 50 else ''}",
                   {"has_files": has_files})


def log_call_llm(model_name: str) -> None:
    """记录调用大模型"""
    df_logger.info("调用大模型", f"开始调用模型: {model_name}")


def log_llm_success(model_name: str, duration_ms: float) -> None:
    """记录大模型调用成功"""
    df_logger.info("大模型调用成功", f"模型 {model_name} 调用成功", {"duration_ms": duration_ms})


def log_llm_processing() -> None:
    """记录大模型处理中"""
    df_logger.info("大模型处理", "大模型正在生成响应...")


def log_llm_complete() -> None:
    """记录大模型处理完成"""
    df_logger.info("大模型处理完成", "大模型响应生成完成")


def log_tool_call(tool_name: str, args: dict) -> None:
    """记录工具调用"""
    df_logger.info("工具调用", f"开始调用工具: {tool_name}", {"args": args})


def log_tool_complete(tool_name: str, duration_ms: float) -> None:
    """记录工具调用完成"""
    df_logger.info("工具调用完成", f"工具 {tool_name} 调用完成", {"duration_ms": duration_ms})


def log_return_data(message_count: int) -> None:
    """记录返回数据"""
    df_logger.info("返回数据", f"返回消息到前端，共 {message_count} 条消息")


def log_display_data() -> None:
    """记录显示数据"""
    df_logger.info("显示数据", "前端正在显示消息")


def log_api_call(endpoint: str, method: str = "POST") -> None:
    """记录接口调用"""
    df_logger.info("接口调用", f"{method} {endpoint}")


def log_task_complete() -> None:
    """记录完成任务"""
    df_logger.info("完成任务", "整个任务流程完成")
