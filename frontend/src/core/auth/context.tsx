"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { AuthContextType, AuthState } from "./types";

// 认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cookie 名称
const AUTH_COOKIE_NAME = "deerflow_auth";
const USER_ID_COOKIE_NAME = "deerflow_user_id";

// Cookie 操作函数
function setCookie(name: string, value: string, days: number = 7): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
}

function getCookie(name: string): string | null {
  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === " ") {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  return null;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// 认证 Provider 组件
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    isLoading: true,
  });

  // 检查认证状态
  const checkAuth = useCallback(async () => {
    try {
      const authCookie = getCookie(AUTH_COOKIE_NAME);
      const userIdCookie = getCookie(USER_ID_COOKIE_NAME);

      if (authCookie === "true" && userIdCookie) {
        setState({
          isAuthenticated: true,
          userId: userIdCookie,
          isLoading: false,
        });
      } else {
        setState({
          isAuthenticated: false,
          userId: null,
          isLoading: false,
        });
      }
    } catch {
      setState({
        isAuthenticated: false,
        userId: null,
        isLoading: false,
      });
    }
  }, []);

  // 登录
  const login = useCallback((userId: string) => {
    setCookie(AUTH_COOKIE_NAME, "true");
    setCookie(USER_ID_COOKIE_NAME, userId);
    setState({
      isAuthenticated: true,
      userId,
      isLoading: false,
    });
  }, []);

  // 登出
  const logout = useCallback(() => {
    deleteCookie(AUTH_COOKIE_NAME);
    deleteCookie(USER_ID_COOKIE_NAME);
    setState({
      isAuthenticated: false,
      userId: null,
      isLoading: false,
    });
  }, []);

  // 初始化时检查认证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// 使用认证 Hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth 必须在 AuthProvider 内使用");
  }
  return context;
}

// 检查是否已认证
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

// 获取用户ID
export function useUserId(): string | null {
  const { userId } = useAuth();
  return userId;
}
