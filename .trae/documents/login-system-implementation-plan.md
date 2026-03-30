# 登录系统实施计划

## 一、当前实现状态分析

### ✅ 已完成的功能

| 功能 | 实现位置 | 状态 |
|------|----------|------|
| 二维码生成 | `frontend/src/app/api/auth/qrcode/route.ts` | ✅ 已实现 |
| 二维码过期机制 | `frontend/src/core/auth/session-manager.ts` | ✅ 已实现（5分钟有效期） |
| 二维码刷新 | `frontend/src/components/auth/qrcode-display.tsx` | ✅ 已实现（手动刷新） |
| 扫码验证（AES解密+JWT验证） | `frontend/src/lib/crypto.ts` | ✅ 已实现 |
| 登录状态轮询 | `frontend/src/app/login/page.tsx` | ✅ 已实现 |
| Cookie 认证 | `frontend/src/core/auth/context.tsx` | ✅ 已实现 |
| 登录后显示 user_id | `frontend/src/components/workspace/workspace-header.tsx` | ✅ 已实现 |
| 未登录拦截 workspace | `frontend/src/middleware.ts` | ✅ 已实现 |
| AuthProvider 全局化 | `frontend/src/app/layout.tsx` | ✅ 已修复 |

### ❌ 需要修改的问题

| 问题 | 描述 | 优先级 |
|------|------|--------|
| 首页路由问题 | 访问 `/` 重定向到 `/workspace/chats/new`，需要登录 | 高 |
| 缺少退出按钮 | UI 中没有退出登录入口 | 高 |
| 二维码自动刷新 | 过期后需要手动刷新，建议添加自动刷新 | 中 |

---

## 二、需要修改的内容

### 修改 1：创建公开首页

**文件**: `frontend/src/app/page.tsx`

**当前代码**:
```tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/workspace/chats/new");
}
```

**修改为**:
- 创建一个公开的首页，显示 Welcome 组件
- 不需要登录即可访问
- 提供"开始使用"按钮，点击后跳转到登录页或工作区

---

### 修改 2：添加退出登录按钮

**文件**: `frontend/src/components/workspace/workspace-nav-menu.tsx`

**修改内容**:
- 在下拉菜单中添加"退出登录"选项
- 调用 `useAuth()` 的 `logout` 方法
- 退出后跳转到首页

---

### 修改 3：二维码过期后自动刷新（可选优化）

**文件**: `frontend/src/app/login/page.tsx`

**修改内容**:
- 当二维码过期时，自动刷新获取新二维码
- 保留手动刷新按钮作为备选

---

## 三、详细实施步骤

### 步骤 1：修改首页路由

1. 修改 `frontend/src/app/page.tsx`
   - 移除重定向逻辑
   - 创建公开首页组件
   - 显示 Welcome 内容
   - 添加"开始使用"按钮

### 步骤 2：添加退出登录功能

1. 修改 `frontend/src/components/workspace/workspace-nav-menu.tsx`
   - 导入 `useAuth` 钩子
   - 导入 `LogOut` 图标
   - 添加退出登录菜单项
   - 实现退出逻辑

### 步骤 3：优化二维码自动刷新（可选）

1. 修改 `frontend/src/app/login/page.tsx`
   - 在 `isExpired` 状态变化时自动刷新

---

## 四、文件修改清单

| 文件路径 | 操作类型 | 修改内容 |
|----------|----------|----------|
| `frontend/src/app/page.tsx` | 重写 | 创建公开首页 |
| `frontend/src/components/workspace/workspace-nav-menu.tsx` | 编辑 | 添加退出登录按钮 |
| `frontend/src/app/login/page.tsx` | 编辑 | 添加自动刷新逻辑（可选） |

---

## 五、验证清单

- [ ] 访问 `http://localhost:2026/` 显示首页（不需要登录）
- [ ] 首页显示 Welcome 内容
- [ ] 点击"开始使用"跳转到登录页或工作区
- [ ] 未登录时无法访问 `/workspace/*` 路由
- [ ] 二维码有时效性（5分钟）
- [ ] 二维码过期后可以刷新
- [ ] 扫码登录成功后跳转到工作区
- [ ] 工作区显示当前登录用户的 user_id
- [ ] 可以正常退出登录
- [ ] 退出后跳转到首页

---

## 六、注意事项

1. **AuthProvider 已修复**：之前已将 `AuthProvider` 移动到根 `layout.tsx`，解决了 `useAuth` 必须在 `AuthProvider` 内使用的问题。

2. **script tag 错误已修复**：之前已添加 `rehypeRemoveScripts` 插件，解决了 React 渲染 script 标签的问题。

3. **加密验证逻辑**：`frontend/src/lib/crypto.ts` 已按照参考代码实现了 AES-128-CBC 解密和 JWT 验证逻辑。
