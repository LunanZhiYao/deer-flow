# DeerFlow 日志系统使用指南

## 概述

DeerFlow 日志系统为前端和后端提供了完整的中文日志记录功能，包括关键节点追踪和耗时统计。

## 日志查看方式

### 1. 前端日志查看

#### 方式一：悬浮日志窗口（推荐）
1. 启动应用后，在工作区页面右下角会看到一个齿轮图标 ⚙️
2. 点击齿轮图标打开悬浮日志窗口
3. 日志窗口功能：
   - 按日志级别筛选（全部/调试/信息/警告/错误）
   - 按分类筛选
   - 关键词搜索
   - 一键复制所有日志
   - 清空日志
   - 自动滚动开关

#### 方式二：浏览器控制台
1. 按 F12 打开开发者工具
2. 切换到 Console（控制台）标签
3. 日志会以中文形式输出，带有表情图标和分类标签

### 2. 后端日志查看

后端日志输出到标准输出（stdout），可以通过以下方式查看：

#### 本地开发环境
```bash
# 如果使用 make dev 启动，日志会直接显示在终端中
make dev

# 或者单独查看 LangGraph 服务日志
cd backend
make dev
```

#### 日志格式
```
[YYYY-MM-DD HH:MM:SS] [deerflow] [INFO] [分类] 消息内容 | 数据: {...}
```

## 日志节点说明

| 日志分类 | 说明 |
|---------|------|
| 前端发送文字 | 用户在前端输入并发送消息 |
| 接口调用 | API 请求 |
| 调用大模型 | 开始调用 LLM |
| 大模型调用成功 | LLM 返回响应 |
| 大模型处理 | LLM 正在生成响应 |
| 大模型处理完成 | LLM 响应生成结束 |
| 工具调用 | 工具开始执行 |
| 工具调用完成 | 工具执行结束 |
| 返回数据 | 后端返回数据到前端 |
| 显示数据 | 前端渲染消息 |
| 完成任务 | 整个流程完成 |
| 系统 | 系统级日志 |

## 前端 API 使用

### 基本日志记录

```typescript
import { logger } from "@/core/logger";

// 记录信息日志
logger.info("分类名称", "日志消息", { 数据: "值" });

// 记录警告日志
logger.warn("分类名称", "警告消息");

// 记录错误日志
logger.error("分类名称", "错误消息", error对象);

// 记录调试日志
logger.debug("分类名称", "调试消息", { 详细数据: "值" });
```

### 计时功能

```typescript
// 方式一：使用 startTimer
const endTimer = logger.startTimer("大模型处理", "开始处理...");
// ... 执行操作 ...
endTimer("处理完成", { 结果: "数据" });

// 方式二：使用 stepWithTimer（同步）
const result = logger.stepWithTimer(
  "工具调用",
  "开始调用工具",
  "工具调用完成",
  () => {
    // 执行同步操作
    return 结果;
  }
);

// 方式三：使用 stepWithTimerAsync（异步）
const result = await logger.stepWithTimerAsync(
  "接口调用",
  "开始请求",
  "请求完成",
  async () => {
    // 执行异步操作
    return await fetch(...);
  }
);
```

### 获取和管理日志

```typescript
// 获取所有日志
const logs = logger.getLogs();

// 按条件筛选
const infoLogs = logger.getLogs({ level: "info" });
const modelLogs = logger.getLogs({ category: "调用大模型" });

// 清空日志
logger.clearLogs();

// 导出日志
const logJson = logger.exportLogs();

// 开关日志
logger.setEnabled(false);  // 关闭
logger.setEnabled(true);   // 开启
```

## 后端 API 使用

### 基本日志记录

```python
from deerflow.utils.logger import df_logger, log_step

# 记录信息日志
df_logger.info("分类名称", "日志消息", {"数据": "值"})

# 记录错误日志
df_logger.error("分类名称", "错误消息", error对象)

# 记录警告日志
df_logger.warn("分类名称", "警告消息")

# 记录调试日志
df_logger.debug("分类名称", "调试消息", {"详细数据": "值"})
```

### 装饰器使用

```python
from deerflow.utils.logger import log_step

# 同步函数
@log_step("工具调用", "执行文件读取")
def read_file(path: str):
    # 函数内容
    pass

# 异步函数
@log_step("大模型处理", "调用LLM生成")
async def call_llm(prompt: str):
    # 函数内容
    pass
```

### 便捷函数

```python
from deerflow.utils.logger import (
    log_frontend_send_text,
    log_call_llm,
    log_llm_success,
    log_tool_call,
    log_tool_complete,
    log_task_complete,
)

log_frontend_send_text("你好，帮我写个代码", has_files=False)
log_call_llm("gpt-4")
log_llm_success("gpt-4", duration_ms=1250.5)
log_tool_call("write_file", {"path": "/test.txt", "content": "hello"})
log_tool_complete("write_file", duration_ms=80.2)
log_task_complete()
```

## 配置说明

### 前端配置

前端日志系统默认开启，可以通过以下方式配置：

```typescript
import { Logger } from "@/core/logger";

// 创建自定义 logger 实例
const customLogger = new Logger({
  enabled: true,           // 是否开启
  maxLogs: 1000,           // 最大保留日志数
  consoleOutput: true,      // 是否输出到 console
  localStorageKey: "my-logs"  // localStorage 键名
});
```

### 后端配置

后端使用 Python 标准 logging 模块，可以通过 logging 配置文件自定义。

## 注意事项

1. **localStorage 限制**：前端日志存储在 localStorage 中，有大小限制（约 5MB），超过会自动清理旧日志
2. **性能影响**：日志系统对性能影响很小，但在生产环境可以考虑关闭调试日志
3. **敏感信息**：避免在日志中记录密码、密钥等敏感信息
4. **日志清理**：可以通过悬浮窗口的"清空"按钮或调用 `logger.clearLogs()` 清理日志

## 故障排查

### 悬浮窗口不显示
- 确认在工作区页面（`/workspace/...`）
- 检查浏览器控制台是否有报错

### 日志不更新
- 确认日志系统已开启：`logger.isEnabled()` 应该返回 `true`
- 尝试刷新页面

### 后端日志看不到
- 确认后端服务正在运行
- 检查终端输出
