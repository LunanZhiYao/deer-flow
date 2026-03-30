import { NextRequest, NextResponse } from "next/server";

// 认证 Cookie 名称
const AUTH_COOKIE_NAME = "deerflow_auth";
const USER_ID_COOKIE_NAME = "deerflow_user_id";

/**
 * 从请求中获取 Cookie 值
 */
function getCookieFromRequest(
  request: NextRequest,
  name: string
): string | null {
  return request.cookies.get(name)?.value ?? null;
}

/**
 * 中间件配置 - 匹配需要认证的路径
 */
export const config = {
  matcher: [
    // 匹配 workspace 下的所有路径
    "/workspace/:path*",
  ],
};

/**
 * 中间件主函数 - 检查用户认证状态
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否已认证
  const authCookie = getCookieFromRequest(request, AUTH_COOKIE_NAME);
  const userIdCookie = getCookieFromRequest(request, USER_ID_COOKIE_NAME);

  // 未认证则重定向到登录页
  if (!authCookie || authCookie !== "true" || !userIdCookie) {
    const loginUrl = new URL("/login", request.url);
    // 保存原始请求路径，登录后可跳转回来
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 已认证，继续请求
  const response = NextResponse.next();
  // 将用户ID添加到响应头，供后续使用
  response.headers.set("x-user-id", userIdCookie);
  return response;
}
