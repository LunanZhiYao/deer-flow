import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { env } from "@/env";

// 认证入口路由
const AUTH_ENTRY_ROUTE = "/";
// 认证成功后跳转的路由
const SUCCESS_REDIRECT_ROUTE = "/workspace/chats/new";
// 认证 Cookie 名称
const AUTH_COOKIE_NAME = "deerflow_auth";
const USER_ID_COOKIE_NAME = "deerflow_user_id";

/**
 * 获取后端认证 API 的 URL
 * 
 * 在 Docker 环境中，middleware 运行在前端容器内，需要通过以下方式访问后端：
 * 1. 如果设置了 NEXT_PUBLIC_BACKEND_BASE_URL 环境变量，使用该地址
 * 2. 否则，使用 Docker 服务名 'gateway:8001'（Docker 内部网络）
 * 
 * 注意：不能使用 localhost:8001，因为在容器中 localhost 指向容器自己
 */
function getAuthApiUrl(): string {
  // 如果设置了环境变量，直接使用
  if (env.NEXT_PUBLIC_BACKEND_BASE_URL) {
    return `${env.NEXT_PUBLIC_BACKEND_BASE_URL.replace(/\/+$/, "")}/api/auth/verify`;
  }
  
  // 在 Docker 环境中，使用 Docker 服务名
  // gateway 是 docker-compose 中定义的服务名，8001 是其端口
  return "http://gateway:8001/api/auth/verify";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] 请求路径: ${pathname}`);

  // 只处理根路径的请求
  if (pathname === AUTH_ENTRY_ROUTE) {
    console.log("[Middleware] 处理根路径请求");

    // 检查是否已经认证
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const userIdCookie = request.cookies.get(USER_ID_COOKIE_NAME)?.value;

    console.log(`[Middleware] 认证Cookie: ${authCookie}, 用户ID Cookie: ${userIdCookie}`);

    if (authCookie === "true" && userIdCookie) {
      // 已认证，直接跳转到工作区
      console.log(`[Middleware] 已认证，跳转到 ${SUCCESS_REDIRECT_ROUTE}`);
      return NextResponse.redirect(new URL(SUCCESS_REDIRECT_ROUTE, request.url));
    }

    const workCode = request.headers.get("workCode");
    if (workCode) {
      console.log(`[Middleware] workCode: ${workCode ? "存在" : "不存在"}`);
      if (workCode) {
        console.log(`[Middleware] workCode 前50字符: ${workCode.substring(0, 50)}`);
      }
      try {
        // 获取认证 API URL（自动适配 Docker/本地环境）
        const authApiUrl = getAuthApiUrl();

        console.log(`[Middleware] 调用后端认证API: ${authApiUrl}`);

        // 调用后端 API 验证 workCode
        const response = await fetch(authApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            workCode: workCode,
          },
        });

        console.log(`[Middleware] 后端响应状态: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log(`[Middleware] 后端响应数据: ${JSON.stringify(data)}`);

          if (data.success && data.user_id) {
            // 认证成功，设置 Cookie 并跳转
            console.log(`[Middleware] 认证成功，用户ID: ${data.user_id}`);

            const redirectResponse = NextResponse.redirect(
              new URL(SUCCESS_REDIRECT_ROUTE, request.url)
            );

            // 设置认证 Cookie（7天有效期)
            redirectResponse.cookies.set(AUTH_COOKIE_NAME, "true", {
              path: "/",
              maxAge: 7 * 24 * 60 * 60,
              sameSite: "strict",
            });
            redirectResponse.cookies.set(USER_ID_COOKIE_NAME, data.user_id, {
              path: "/",
              maxAge: 7 * 24 * 60 * 60,
              sameSite: "strict",
            });

            console.log(`[Middleware] 设置Cookie完成，跳转到 ${SUCCESS_REDIRECT_ROUTE}`);
            return redirectResponse;
          }
        } else {
          const errorText = await response.text();
          console.error(`[Middleware] 后端认证失败: ${response.status}, ${errorText}`);
        }

        // workCode 验证失败
        console.log("[Middleware] workCode验证失败，跳转到错误页面");
        const errorUrl = new URL("/login?error=invalid_workcode", request.url);
        return NextResponse.redirect(errorUrl);
      } catch (error) {
        console.error("[Middleware] 认证服务调用失败:", error);
        // 服务调用失败，跳转到错误页面
        const errorUrl = new URL("/login?error=service_error", request.url);
        return NextResponse.redirect(errorUrl);
      }
    } else {
      // 没有 workCode，显示非法访问页面
      console.log("[Middleware] 没有workCode，跳转到错误页面");
      const errorUrl = new URL("/login?error=unauthorized", request.url);
      return NextResponse.redirect(errorUrl);
    }
  }

  // 检查受保护的路由
  if (pathname.startsWith("/workspace")) {
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const userIdCookie = request.cookies.get(USER_ID_COOKIE_NAME)?.value;

    if (authCookie !== "true" || !userIdCookie) {
      // 未认证，跳转到登录页面
      console.log(`[Middleware] 未认证访问受保护路由 ${pathname}，跳转到登录页面`);
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  return NextResponse.next();
}

// 配置中间件匹配的路由
export const config = {
  matcher: ["/", "/workspace/:path*"],
};
