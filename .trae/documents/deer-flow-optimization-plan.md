# DeerFlow 功能和样式优化实施计划

## 项目概述

本计划旨在对 DeerFlow 应用进行四项主要优化：路由重定向、扫码登录验证系统、UI/UX优化和安全控制。

## 技术栈分析

- **前端框架**: Next.js 16 (App Router) + React 19 + TypeScript
- **样式方案**: Tailwind CSS
- **现有认证**: better-auth 库
- **状态管理**: React Context + React Query

---

## 任务一：路由重定向配置

### 目标
修改应用路由设置，使访问根地址 `http://localhost:2026` 时自动重定向至 `/workspace/chats/new`。

### 实施步骤

1. **修改根页面 (`src/app/page.tsx`)**
   - 将现有的 Landing 页面内容改为重定向逻辑
   - 使用 Next.js 的 `redirect()` 函数实现服务端重定向

2. **保留 Landing 页面组件**
   - 将原 Landing 页面移动到 `/landing` 路由
   - 如需展示 Landing 页面，可访问 `/landing` 路径

### 涉及文件
- `frontend/src/app/page.tsx` - 修改为重定向
- `frontend/src/app/landing/page.tsx` - 新建，存放原 Landing 内容

---

## 任务二：登录验证系统实现

### 目标
实现扫码登录功能：前端显示二维码 → 用户 app 扫码 → 服务端处理验证请求 → 登录成功。

### 登录流程设计

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│   前端显示      │      │   用户 APP      │      │   服务端验证    │
│   登录二维码    │ ──── │   扫描二维码    │ ──── │   workCode      │
│                 │      │   发送workCode  │      │   返回user_id   │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                                                │
        │                                                │
        └──────────────── 轮询/WebSocket ────────────────┘
                    获取登录状态
```

### 参考实现逻辑（来自参考代码.txt）

```
1. 从请求头获取 workCode
2. AES-128-CBC 解密 workCode
   - 密钥: '5efd3f6060e20330'
   - IV: '625202f9149e0611'
3. 解析 JSON 获取 token 和时间戳
4. 验证时间戳（3600秒有效期）
5. JWT 验证获取 user_id
   - JWT密钥: "lunanzhiyao"
```

### 实施步骤

#### 2.1 创建加密工具类
- **文件**: `frontend/src/lib/crypto.ts`
- **功能**:
  - AES-128-CBC 解密函数
  - JWT 验证函数
  - 时间戳验证

#### 2.2 创建认证上下文和状态管理
- **文件**: `frontend/src/core/auth/context.tsx`
- **功能**:
  - 创建 AuthContext 提供认证状态
  - 提供 `useAuth()` Hook
  - 管理 user_id 状态
  - 提供 login/logout 方法

#### 2.3 创建登录页面（含二维码显示）
- **文件**: `frontend/src/app/login/page.tsx`
- **功能**:
  - 显示登录二维码（Base64 图片）
  - 显示倒计时（分:秒格式）
  - 二维码过期后自动刷新
  - 提供手动刷新按钮
  - 轮询检查登录状态
  - 登录成功后跳转到工作区

#### 2.4 创建二维码组件
- **文件**: `frontend/src/components/auth/qrcode-display.tsx`
- **功能**:
  - 封装二维码显示逻辑
  - 倒计时显示（MM:SS 格式）
  - 过期状态视觉反馈（灰化 + 提示）
  - 刷新按钮（带加载动画）
  - 自动刷新与手动刷新支持

#### 2.5 创建二维码生成 API
- **文件**: `frontend/src/app/api/auth/qrcode/route.ts`
- **功能**:
  - 生成唯一的登录会话ID（使用 nanoid）
  - 生成二维码图片（Base64 格式）
  - 返回二维码内容和过期时间
  - 存储登录会话状态

#### 2.6 创建扫码验证 API
- **文件**: `frontend/src/app/api/auth/scan/route.ts`
- **功能**:
  - 接收 APP 扫码后发送的请求
  - 验证 sessionId 有效性和时效性
  - 从请求头获取 workCode 参数
  - 调用解密和验证逻辑
  - 验证成功后更新登录会话状态
  - 标记二维码为已使用
  - 返回成功/失败信息给 APP

#### 2.7 创建登录状态检查 API
- **文件**: `frontend/src/app/api/auth/status/route.ts`
- **功能**:
  - 前端轮询检查登录状态
  - 返回登录结果、user_id 和剩余时间
  - 设置认证 Cookie/Session

#### 2.8 创建中间件进行权限检查
- **文件**: `frontend/src/middleware.ts`
- **功能**:
  - 检查用户是否已认证
  - 保护 `/workspace/*` 路由
  - 未认证用户重定向到登录页

#### 2.9 显示用户信息
- **修改文件**: `frontend/src/components/workspace/workspace-header.tsx`
- **功能**:
  - 在页面顶部显示解密后的 user_id

### 涉及文件
- `frontend/src/lib/crypto.ts` - 新建，加密工具
- `frontend/src/core/auth/context.tsx` - 新建，认证上下文
- `frontend/src/core/auth/index.ts` - 新建，导出
- `frontend/src/core/auth/hooks.ts` - 新建，认证 Hooks
- `frontend/src/core/auth/types.ts` - 新建，类型定义
- `frontend/src/core/auth/session-manager.ts` - 新建，会话管理器
- `frontend/src/app/login/page.tsx` - 新建，登录页面
- `frontend/src/components/auth/qrcode-display.tsx` - 新建，二维码显示组件
- `frontend/src/app/api/auth/qrcode/route.ts` - 新建，二维码生成
- `frontend/src/app/api/auth/scan/route.ts` - 新建，扫码验证
- `frontend/src/app/api/auth/status/route.ts` - 新建，状态检查
- `frontend/src/middleware.ts` - 新建，权限中间件
- `frontend/src/components/workspace/workspace-header.tsx` - 修改，显示用户信息
- `frontend/src/app/workspace/layout.tsx` - 修改，添加认证检查

---

## 任务三：UI/UX 优化

### 目标
使用 ui-ux-pro-max 技能对 `/workspace/chats/new` 页面进行全面样式优化。

### 实施步骤

1. **调用 ui-ux-pro-max 技能**
   - 分析当前页面设计
   - 获取优化建议

2. **优化方向**
   - 视觉效果提升
   - 交互体验优化
   - 响应式设计完善
   - 动画和过渡效果
   - 深色/浅色主题适配

### 涉及文件
- `frontend/src/app/workspace/chats/[thread_id]/page.tsx`
- `frontend/src/components/workspace/welcome.tsx`
- `frontend/src/components/workspace/input-box.tsx`
- `frontend/src/components/workspace/messages/*.tsx`
- `frontend/src/styles/globals.css`

---

## 任务四：安全控制

### 目标
实现严格的权限检查机制，确保所有核心功能仅对已登录用户开放。

### 实施步骤

1. **创建认证 Hook**
   - `useRequireAuth()` - 强制要求认证
   - `useIsAuthenticated()` - 检查认证状态

2. **API 路由保护**
   - 在 API 路由中添加认证检查
   - 返回 401 未授权响应

3. **客户端路由保护**
   - 在页面组件中检查认证状态
   - 自动重定向未认证用户

### 涉及文件
- `frontend/src/core/auth/hooks.ts`
- `frontend/src/app/api/*` - 各 API 路由
- `frontend/src/middleware.ts`

---

## 实施顺序

1. **阶段一：路由重定向** (预计工作量：小)
   - 修改根页面重定向逻辑

2. **阶段二：登录验证系统** (预计工作量：大)
   - 创建加密工具
   - 创建认证上下文
   - 创建二维码生成 API
   - 创建扫码验证 API
   - 创建状态检查 API
   - 创建登录页面
   - 创建中间件

3. **阶段三：安全控制** (预计工作量：中)
   - 完善权限检查
   - 保护 API 路由

4. **阶段四：UI/UX 优化** (预计工作量：中)
   - 调用技能获取优化建议
   - 实施样式优化

---

## 关键技术细节

### AES-128-CBC 解密实现（TypeScript 版本）

```typescript
import crypto from 'crypto';

function decrypt(workCode: string): string {
  const publicKey = '5efd3f6060e20330';
  const privateKey = '625202f9149e0611';
  
  const decipher = crypto.createDecipheriv(
    'aes-128-cbc',
    Buffer.from(publicKey, 'utf8'),
    Buffer.from(privateKey, 'utf8')
  );
  
  let decrypted = decipher.update(
    Buffer.from(workCode, 'base64')
  );
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  // 移除 PKCS7 padding
  const padding = decrypted[decrypted.length - 1];
  return decrypted.slice(0, -padding).toString('utf8');
}
```

### JWT 验证实现（TypeScript 版本）

```typescript
import crypto from 'crypto';

function checkJWT(token: string, key: string = 'lunanzhiyao'): object | false {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  const [header, payload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', crypto.createHash('md5').update(key).digest())
    .update(`${header}.${payload}`)
    .digest('base64url');
  
  if (signature !== expectedSignature) return false;
  
  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
}
```

### 登录会话存储

使用内存 Map 或 Redis 存储登录会话状态：
```typescript
interface LoginSession {
  sessionId: string;      // 唯一会话ID（UUID v4）
  status: 'pending' | 'success' | 'expired' | 'used';
  userId?: string;        // 登录成功后的用户ID
  createdAt: number;      // 创建时间戳
  expiresAt: number;      // 过期时间戳（默认5分钟）
}
```

### 二维码时效性与唯一性保证

#### 唯一性保证
- 每次请求二维码时生成新的 UUID v4 作为 sessionId
- sessionId 全局唯一，不可重复使用
- 使用后的二维码立即标记为 'used'，防止重复扫描

#### 时效性保证
- 二维码默认有效期：5分钟（可配置）
- 前端显示倒计时，告知用户剩余有效时间
- 过期后自动刷新生成新二维码

#### 刷新机制
```
┌─────────────────────────────────────────────────────────────┐
│                    二维码刷新流程                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 页面加载 → 请求新二维码                                  │
│                    ↓                                        │
│  2. 显示二维码 + 倒计时（5分钟）                             │
│                    ↓                                        │
│  3. 倒计时结束？                                            │
│       ├── 是 → 自动请求新二维码 → 回到步骤2                  │
│       └── 否 → 用户扫码？                                   │
│                    ├── 是 → 登录成功 → 跳转工作区           │
│                    └── 否 → 继续倒计时                      │
│                                                             │
│  用户可随时点击"刷新二维码"按钮手动刷新                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 前端实现要点
```typescript
// 二维码组件状态
interface QRCodeState {
  sessionId: string;
  qrCodeDataUrl: string;    // Base64 图片
  expiresIn: number;        // 过期时间（秒）
  countdown: number;        // 倒计时显示
  isExpired: boolean;       // 是否已过期
  isRefreshing: boolean;    // 是否正在刷新
}

// 自动刷新逻辑
useEffect(() => {
  if (countdown <= 0) {
    // 自动刷新二维码
    refreshQRCode();
  }
}, [countdown]);

// 定时器：每秒更新倒计时
useEffect(() => {
  const timer = setInterval(() => {
    setCountdown(prev => Math.max(0, prev - 1));
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

#### 服务端实现要点
```typescript
// 登录会话管理
class LoginSessionManager {
  private sessions = new Map<string, LoginSession>();
  
  // 创建新会话
  createSession(): LoginSession {
    const sessionId = nanoid(32);  // 生成唯一ID
    const now = Date.now();
    const session: LoginSession = {
      sessionId,
      status: 'pending',
      createdAt: now,
      expiresAt: now + 5 * 60 * 1000,  // 5分钟后过期
    };
    this.sessions.set(sessionId, session);
    return session;
  }
  
  // 检查会话是否有效
  isValidSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    if (session.status === 'used') return false;
    if (Date.now() > session.expiresAt) {
      session.status = 'expired';
      return false;
    }
    return true;
  }
  
  // 标记会话为已使用
  markAsUsed(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'used';
    }
  }
  
  // 清理过期会话（定时任务）
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
      }
    }
  }
}
```

---

## API 接口设计

### 1. 获取二维码
```
GET /api/auth/qrcode

Response:
{
  "success": true,
  "data": {
    "sessionId": "xxx-xxx-xxx",
    "qrcodeDataUrl": "data:image/png;base64,xxx",  // Base64 二维码图片
    "qrcodeUrl": "https://xxx.com/scan?session=xxx-xxx-xxx",
    "expiresIn": 300,          // 有效期（秒）
    "createdAt": 1709123456    // 创建时间戳
  }
}

Error Response (服务不可用):
{
  "success": false,
  "error": "SERVICE_UNAVAILABLE",
  "message": "服务暂时不可用，请稍后重试"
}
```

### 2. APP 扫码验证
```
POST /api/auth/scan
Headers: { workCode: "xxx" }
Body: { "sessionId": "xxx-xxx-xxx" }

Success Response:
{
  "success": true,
  "message": "登录成功",
  "data": {
    "userId": "16079"
  }
}

Error Response (二维码已过期):
{
  "success": false,
  "error": "QR_CODE_EXPIRED",
  "message": "二维码已过期，请刷新后重试"
}

Error Response (二维码已使用):
{
  "success": false,
  "error": "QR_CODE_USED",
  "message": "二维码已被使用"
}

Error Response (验证失败):
{
  "success": false,
  "error": "AUTH_FAILED",
  "message": "身份验证失败，请重试"
}
```

### 3. 检查登录状态
```
GET /api/auth/status?sessionId=xxx-xxx-xxx

Response (等待扫码):
{
  "success": true,
  "data": {
    "status": "pending",
    "countdown": 250        // 剩余有效时间（秒）
  }
}

Response (已登录):
{
  "success": true,
  "data": {
    "status": "success",
    "userId": "16079"
  }
}

Response (二维码已过期):
{
  "success": true,
  "data": {
    "status": "expired",
    "message": "二维码已过期"
  }
}

---

## 注意事项

1. **环境变量**: 可能需要添加新的环境变量用于存储密钥
2. **Cookie 安全**: 使用 HttpOnly、Secure 标志
3. **CSRF 防护**: 考虑添加 CSRF Token
4. **错误处理**: 完善的错误提示和日志记录
5. **测试**: 需要对认证流程进行充分测试
6. **二维码库**: 使用 `qrcode` npm 包生成二维码图片
