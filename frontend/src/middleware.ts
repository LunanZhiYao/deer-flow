import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ENTRY_ROUTE = "/";
const SUCCESS_REDIRECT_ROUTE = "/workspace/chats/new";
const AUTH_COOKIE_NAME = "deerflow_auth";
const USER_ID_COOKIE_NAME = "deerflow_user_id";
const USER_NAME_COOKIE_NAME = "deerflow_user_name";
const USER_EMAIL_COOKIE_NAME = "deerflow_user_email";
const USER_DEPARTMENT_COOKIE_NAME = "deerflow_user_department";
const USER_POSITION_COOKIE_NAME = "deerflow_user_position";
const USER_MOBILE_COOKIE_NAME = "deerflow_user_mobile";
const USER_AVATAR_COOKIE_NAME = "deerflow_user_avatar";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://gateway:8001";

interface ErpSsoResponse {
  code: number;
  msg: string;
  data?: {
    user?: {
      userid?: string;
      name?: string;
      email?: string;
      workCode?: string;
      department?: string;
      position?: string;
      mobile?: string;
      avatar?: string;
    };
    authenticated: boolean;
  };
}

interface AuthResult {
  success: boolean;
  user?: {
    userid: string;
    name?: string;
    email?: string;
    department?: string;
    position?: string;
    mobile?: string;
    avatar?: string;
  };
  error?: {
    type: string;
    message: string;
  };
}

async function authenticateWithErp(workCode: string): Promise<AuthResult> {
  console.log("[Auth] Calling ERP SSO API with workCode:", workCode);
  
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/auth/sso-login?workCode=${encodeURIComponent(workCode)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("[Auth] ERP SSO API response status:", response.status);

    if (!response.ok) {
      console.error("[Auth] ERP SSO request failed with status:", response.status);
      return {
        success: false,
        error: { type: "erp_unavailable", message: "ERP服务不可用" }
      };
    }

    const erpResponse: ErpSsoResponse = await response.json();
    if (erpResponse.code !== 0 || !erpResponse.data?.authenticated || !erpResponse.data.user) {
      return {
        success: false,
        error: { type: "auth_failed", message: erpResponse.msg || "认证失败" }
      };
    }

    const user = erpResponse.data.user;
    const userId = user.userid || user.workCode || "";
    if (!userId) {
      return { success: false, error: { type: "no_userid", message: "未找到用户ID" } };
    }

    return {
      success: true,
      user: {
        userid: userId,
        name: user.name,
        email: user.email,
        department: user.department,
        position: user.position,
        mobile: user.mobile,
        avatar: user.avatar,
      }
    };
  } catch (error) {
    console.error("[Auth] ERP SSO verification error:", error);
    return { success: false, error: { type: "erp_error", message: "ERP验证异常" } };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ==========================
  // 1. 首页 / 逻辑
  // ==========================
  if (pathname === AUTH_ENTRY_ROUTE) {
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const userIdCookie = request.cookies.get(USER_ID_COOKIE_NAME)?.value;

    console.log(`[Middleware] 认证Cookie: ${authCookie}, 用户ID Cookie: ${userIdCookie}`);

    const workCode = request.headers.get("workCode") ?? request.nextUrl.searchParams.get("workCode");

    // 有 workCode → 先认证，再判断用户是否一致
    if (workCode) {
      const authResult = await authenticateWithErp(workCode);
      if (!authResult.success || !authResult.user) {
        const errorUrl = new URL(`/login?error=${authResult.error?.type ?? 'unknown'}`, request.url);
        return NextResponse.redirect(errorUrl);
      }

      // 认证成功 → 检查是否为不同用户，如是则先清除旧Cookie再设置新的
      const res = NextResponse.redirect(new URL(SUCCESS_REDIRECT_ROUTE, request.url));

      // 检查是否为不同用户
      if (userIdCookie && userIdCookie !== authResult.user.userid) {
        console.log(`[Middleware] 检测到不同用户，清除旧Cookie。旧用户ID: ${userIdCookie}, 新用户ID: ${authResult.user.userid}`);
        res.cookies.delete(AUTH_COOKIE_NAME);
        res.cookies.delete(USER_ID_COOKIE_NAME);
        res.cookies.delete(USER_NAME_COOKIE_NAME);
        res.cookies.delete(USER_EMAIL_COOKIE_NAME);
        res.cookies.delete(USER_DEPARTMENT_COOKIE_NAME);
        res.cookies.delete(USER_POSITION_COOKIE_NAME);
        res.cookies.delete(USER_MOBILE_COOKIE_NAME);
        res.cookies.delete(USER_AVATAR_COOKIE_NAME);
      }

      // 设置新Cookie
      res.cookies.set(AUTH_COOKIE_NAME, "true", { path: "/", maxAge: 2 * 24 * 60 * 60 });
      res.cookies.set(USER_ID_COOKIE_NAME, authResult.user.userid, { path: "/" });
      if (authResult.user.name) res.cookies.set(USER_NAME_COOKIE_NAME, encodeURIComponent(authResult.user.name), { path: "/" });
      // if (authResult.user.email) res.cookies.set(USER_EMAIL_COOKIE_NAME, authResult.user.email, { path: "/" });
      if (authResult.user.department) res.cookies.set(USER_DEPARTMENT_COOKIE_NAME, encodeURIComponent(authResult.user.department), { path: "/" });
      // if (authResult.user.position) res.cookies.set(USER_POSITION_COOKIE_NAME, encodeURIComponent(authResult.user.position), { path: "/" });
      // if (authResult.user.mobile) res.cookies.set(USER_MOBILE_COOKIE_NAME, authResult.user.mobile, { path: "/" });
      // if (authResult.user.avatar) res.cookies.set(USER_AVATAR_COOKIE_NAME, encodeURIComponent(authResult.user.avatar), { path: "/" });
      return res;
    }

    // 没有 workCode，但有 Cookie → 直接跳转
    if (authCookie === "true" && userIdCookie) {
      return NextResponse.redirect(new URL(SUCCESS_REDIRECT_ROUTE, request.url));
    }

    // 没有 workCode 也没有 Cookie → 跳登录页
    return NextResponse.redirect(new URL("/login?error=no_workcode", request.url));
  }

  // ==========================
  // 2. workspace 核心修复！！！
  // ==========================
  if (pathname.startsWith("/workspace")) {
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const userIdCookie = request.cookies.get(USER_ID_COOKIE_NAME)?.value;

    // ==============================================
    // 关键：先检查是否有 workCode
    // ==============================================
    const workCode = request.headers.get("workCode") ?? request.nextUrl.searchParams.get("workCode");

    // 有 workCode → 不管有没有 Cookie 都先认证，检查用户是否一致
    if (workCode) {
      const authResult = await authenticateWithErp(workCode);

      if (authResult.success && authResult.user) {
        const res = NextResponse.next();

        // 检查是否为不同用户
        if (userIdCookie && userIdCookie !== authResult.user.userid) {
          console.log(`[Middleware] 检测到不同用户，清除旧Cookie。旧用户ID: ${userIdCookie}, 新用户ID: ${authResult.user.userid}`);
          res.cookies.delete(AUTH_COOKIE_NAME);
          res.cookies.delete(USER_ID_COOKIE_NAME);
          res.cookies.delete(USER_NAME_COOKIE_NAME);
          res.cookies.delete(USER_EMAIL_COOKIE_NAME);
          res.cookies.delete(USER_DEPARTMENT_COOKIE_NAME);
          res.cookies.delete(USER_POSITION_COOKIE_NAME);
          res.cookies.delete(USER_MOBILE_COOKIE_NAME);
          res.cookies.delete(USER_AVATAR_COOKIE_NAME);
        }

        // 设置新Cookie
        res.cookies.set(AUTH_COOKIE_NAME, "true", { path: "/" });
        res.cookies.set(USER_ID_COOKIE_NAME, authResult.user.userid, { path: "/" });
        if (authResult.user.name) res.cookies.set(USER_NAME_COOKIE_NAME, encodeURIComponent(authResult.user.name), { path: "/" });
        // if (authResult.user.email) res.cookies.set(USER_EMAIL_COOKIE_NAME, authResult.user.email, { path: "/" });
        // if (authResult.user.department) res.cookies.set(USER_DEPARTMENT_COOKIE_NAME, encodeURIComponent(authResult.user.department), { path: "/" });
        // if (authResult.user.position) res.cookies.set(USER_POSITION_COOKIE_NAME, encodeURIComponent(authResult.user.position), { path: "/" });
        // if (authResult.user.mobile) res.cookies.set(USER_MOBILE_COOKIE_NAME, authResult.user.mobile, { path: "/" });
        // if (authResult.user.avatar) res.cookies.set(USER_AVATAR_COOKIE_NAME, encodeURIComponent(authResult.user.avatar), { path: "/" });
        return res;
      }

      // 认证失败 → 跳登录
      return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
    }

    // 没有 workCode，但有 Cookie → 直接通过
    if (authCookie === "true" && userIdCookie) {
      return NextResponse.next();
    }

    // ==============================================
    // 既没有Cookie，也没有workCode → 才跳登录
    // ==============================================
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/workspace/:path*"],
};