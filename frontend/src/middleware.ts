import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseWorkCode } from "@/lib/crypto";

// 认证入口路由
const AUTH_ENTRY_ROUTE = "/";
// 认证成功后跳转的路由
const SUCCESS_REDIRECT_ROUTE = "/workspace/chats/new";
// 认证 Cookie 名称
const AUTH_COOKIE_NAME = "deerflow_auth";
const USER_ID_COOKIE_NAME = "deerflow_user_id";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 只处理根路径的请求
  if (pathname === AUTH_ENTRY_ROUTE) {
    // 检查是否已经认证
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const userIdCookie = request.cookies.get(USER_ID_COOKIE_NAME)?.value;

    if (authCookie === "true" && userIdCookie) {
      // 已认证，直接跳转到工作区
      return NextResponse.redirect(new URL(SUCCESS_REDIRECT_ROUTE, request.url));
    }

    // 获取请求头中的 workCode
    const workCode = request.headers.get("workCode");

    if (workCode) {
      // 解析 workCode 获取用户 ID
      const userId = parseWorkCode(workCode);

      if (userId) {
        // 认证成功，设置 Cookie 并跳转
        const response = NextResponse.redirect(new URL(SUCCESS_REDIRECT_ROUTE, request.url));
        
        // 设置认证 Cookie（7天有效期）
        response.cookies.set(AUTH_COOKIE_NAME, "true", {
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
          sameSite: "strict",
        });
        response.cookies.set(USER_ID_COOKIE_NAME, userId, {
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
          sameSite: "strict",
        });

        return response;
      } else {
        // workCode 解析失败，显示非法访问页面
        const errorUrl = new URL("/login?error=invalid_workcode", request.url);
        return NextResponse.redirect(errorUrl);
      }
    } else {
      // 没有 workCode，显示非法访问页面
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
