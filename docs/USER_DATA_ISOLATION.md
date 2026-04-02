# 用户数据隔离功能实现文档

## 概述

本文档描述了deer-flow项目中用户数据隔离功能的实现，确保每个登录用户只能访问和查看自己的对话历史记录。

## 问题背景

在原始实现中，所有登录用户能够查看系统中所有用户的最近对话数据，存在数据访问权限问题。这违反了用户数据隔离的基本安全原则。

## 解决方案

### 1. 用户会话隔离模块

创建了 `backend/app/services/user_session.py`，提供以下功能：

- **用户ID管理**：使用线程本地存储管理当前请求的用户ID
- **请求提取**：从Cookie、Header或查询参数中提取用户ID
- **装饰器**：提供 `@require_user_id` 装饰器，确保函数执行时有用户ID
- **上下文管理器**：提供 `UserContext` 类，用于代码块中的用户ID管理
- **访问验证**：提供 `validate_user_access` 函数，验证用户是否有权限访问资源

### 2. FastAPI中间件

创建了 `backend/app/gateway/middleware.py`，实现 `UserAuthMiddleware`：

- 自动从请求中提取用户ID
- 设置用户ID到线程本地存储
- 在请求结束后清理用户ID
- 支持公开路径跳过认证

### 3. 前端API客户端增强

创建了 `frontend/src/core/api/user-aware-client.ts`：

- 包装LangGraph SDK的Client
- 自动在请求中添加用户ID
- 在创建线程时添加用户ID到metadata
- 在查询线程时添加用户ID过滤

### 4. LangGraph Agent中间件

创建了 `backend/packages/harness/deerflow/agents/middlewares/user_auth_middleware.py`：

- 从运行时上下文中提取用户ID
- 验证用户ID是否存在
- 将用户ID存储在状态中供后续中间件使用

## 使用方法

### 后端使用

#### 1. 在路由中获取用户ID

```python
from app.services.user_session import get_current_user_id, require_user_id

@router.get("/api/threads")
@require_user_id
async def get_threads():
    user_id = get_current_user_id()
    # 只返回当前用户的线程
    threads = get_user_threads(user_id)
    return threads
```

#### 2. 验证资源访问权限

```python
from app.services.user_session import validate_user_access

@router.get("/api/threads/{thread_id}")
async def get_thread(thread_id: str):
    thread = get_thread_from_db(thread_id)
    # 验证当前用户是否有权限访问该线程
    validate_user_access(thread.user_id)
    return thread
```

#### 3. 使用上下文管理器

```python
from app.services.user_session import UserContext

def process_user_data(user_id: str):
    with UserContext(user_id):
        # 在这个代码块中，get_current_user_id()会返回user_id
        do_something()
```

### 前端使用

#### 1. 在React组件中使用

```typescript
import { useUserAwareAPIClient } from "@/core/api/user-aware-client";

function MyComponent() {
  const apiClient = useUserAwareAPIClient();
  
  // 所有API调用都会自动包含用户ID
  const threads = await apiClient.threads.search();
  
  return <div>...</div>;
}
```

#### 2. 直接使用用户ID

```typescript
import { getUserAwareAPIClient } from "@/core/api/user-aware-client";

const userId = "user123";
const apiClient = getUserAwareAPIClient(userId);

// 创建线程时会自动添加用户ID到metadata
const thread = await apiClient.threads.create();

// 查询线程时会自动过滤当前用户的线程
const threads = await apiClient.threads.search();
```

## 数据流程

### 1. 用户登录流程

```
用户访问 → Middleware提取workCode → ERP认证 → 设置Cookie → 重定向到工作区
```

### 2. 线程创建流程

```
前端调用API → UserAwareClient添加用户ID → LangGraph Server创建线程 
→ UserAuthMiddleware验证用户ID → 线程metadata包含user_id
```

### 3. 线程查询流程

```
前端调用API → UserAwareClient添加用户ID过滤 → LangGraph Server查询线程
→ 只返回user_id匹配的线程
```

## 安全考虑

### 1. 用户ID来源优先级

1. Cookie: `deerflow_user_id` (最高优先级)
2. Header: `X-User-ID`
3. Query Parameter: `userId`

### 2. 公开路径

以下路径不需要用户认证：

- `/health` - 健康检查
- `/docs` - API文档
- `/redoc` - API文档
- `/openapi.json` - OpenAPI规范
- `/api/auth/sso-login` - SSO登录
- `/api/auth/health` - 认证健康检查

### 3. 线程本地存储

用户ID存储在线程本地存储中，确保在多线程环境下不会混淆不同用户的请求。

## 测试

### 单元测试

运行单元测试：

```bash
cd backend
pytest tests/test_user_data_isolation.py -v
```

### 集成测试

1. 启动后端服务：

```bash
cd backend
python -m uvicorn app.gateway.app:app --reload
```

2. 启动前端服务：

```bash
cd frontend
npm run dev
```

3. 测试多用户场景：

- 使用不同的workCode登录
- 创建对话
- 验证只能看到自己的对话历史

## 部署注意事项

### 1. 环境变量

确保以下环境变量已配置：

```bash
ERP_BASE_URL=<ERP服务地址>
ERP_APP_ID=<应用ID>
ERP_APP_SECRET=<应用密钥>
ERP_APPLICATION_ID=<应用ID>
```

### 2. 数据库迁移

如果使用SQLite或PostgreSQL作为checkpointer，需要确保线程metadata包含user_id字段。

### 3. 性能考虑

- 中间件对每个请求都会执行，但开销很小
- 用户ID存储在线程本地存储中，不会影响性能
- LangGraph的metadata过滤是高效的

## 故障排查

### 1. 用户无法看到自己的对话

检查：
- Cookie中是否包含 `deerflow_user_id`
- 中间件是否正确提取用户ID
- LangGraph Server是否正确处理metadata过滤

### 2. 用户看到其他人的对话

检查：
- 前端是否使用 `useUserAwareAPIClient`
- LangGraph Server是否正确应用metadata过滤
- 数据库中的线程是否包含正确的user_id

### 3. 认证失败

检查：
- ERP服务是否可用
- workCode是否有效
- 环境变量是否正确配置

## 未来改进

1. **数据库索引**：为user_id字段添加索引，提高查询性能
2. **缓存机制**：缓存用户信息，减少ERP服务调用
3. **审计日志**：记录用户访问日志，便于安全审计
4. **权限细化**：支持更细粒度的权限控制，如共享对话

## 相关文件

### 后端

- `backend/app/services/user_session.py` - 用户会话管理
- `backend/app/gateway/middleware.py` - FastAPI中间件
- `backend/app/gateway/app.py` - 应用配置
- `backend/packages/harness/deerflow/agents/middlewares/user_auth_middleware.py` - Agent中间件
- `backend/tests/test_user_data_isolation.py` - 测试文件

### 前端

- `frontend/src/core/api/user-aware-client.ts` - 用户感知API客户端
- `frontend/src/core/threads/hooks.ts` - 线程hooks
- `frontend/src/core/auth/context.tsx` - 认证上下文
- `frontend/src/middleware.ts` - Next.js中间件
