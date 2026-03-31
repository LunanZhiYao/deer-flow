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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_COOKIE_NAME = "deerflow_auth";
const USER_ID_COOKIE_NAME = "deerflow_user_id";
const USER_NAME_COOKIE_NAME = "deerflow_user_name";
const USER_EMAIL_COOKIE_NAME = "deerflow_user_email";
const USER_DEPARTMENT_COOKIE_NAME = "deerflow_user_department";
const USER_POSITION_COOKIE_NAME = "deerflow_user_position";
const USER_MOBILE_COOKIE_NAME = "deerflow_user_mobile";
const USER_AVATAR_COOKIE_NAME = "deerflow_user_avatar";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    userName: null,
    userEmail: null,
    userDepartment: null,
    userPosition: null,
    userMobile: null,
    userAvatar: null,
    isLoading: true,
  });

  const checkAuth = useCallback(async () => {
    try {
      const authCookie = getCookie(AUTH_COOKIE_NAME);
      const userIdCookie = getCookie(USER_ID_COOKIE_NAME);
      const userNameCookie = getCookie(USER_NAME_COOKIE_NAME);
      const userEmailCookie = getCookie(USER_EMAIL_COOKIE_NAME);
      const userDepartmentCookie = getCookie(USER_DEPARTMENT_COOKIE_NAME);
      const userPositionCookie = getCookie(USER_POSITION_COOKIE_NAME);
      const userMobileCookie = getCookie(USER_MOBILE_COOKIE_NAME);
      const userAvatarCookie = getCookie(USER_AVATAR_COOKIE_NAME);

      console.log("[AuthProvider] Checking auth cookies:", {
        auth: authCookie,
        userId: userIdCookie,
        userName: userNameCookie,
        userEmail: userEmailCookie,
        userDepartment: userDepartmentCookie,
        userPosition: userPositionCookie,
        userMobile: userMobileCookie,
        userAvatar: userAvatarCookie,
      });

      if (authCookie === "true" && userIdCookie) {
        setState({
          isAuthenticated: true,
          userId: userIdCookie,
          userName: userNameCookie,
          userEmail: userEmailCookie,
          userDepartment: userDepartmentCookie,
          userPosition: userPositionCookie,
          userMobile: userMobileCookie,
          userAvatar: userAvatarCookie,
          isLoading: false,
        });
      } else {
        setState({
          isAuthenticated: false,
          userId: null,
          userName: null,
          userEmail: null,
          userDepartment: null,
          userPosition: null,
          userMobile: null,
          userAvatar: null,
          isLoading: false,
        });
      }
    } catch {
      setState({
        isAuthenticated: false,
        userId: null,
        userName: null,
        userEmail: null,
        userDepartment: null,
        userPosition: null,
        userMobile: null,
        userAvatar: null,
        isLoading: false,
      });
    }
  }, []);

  const login = useCallback((userId: string, userInfo?: {
    name?: string;
    email?: string;
    department?: string;
    position?: string;
    mobile?: string;
    avatar?: string;
  }) => {
    setState({
      isAuthenticated: true,
      userId,
      userName: userInfo?.name || null,
      userEmail: userInfo?.email || null,
      userDepartment: userInfo?.department || null,
      userPosition: userInfo?.position || null,
      userMobile: userInfo?.mobile || null,
      userAvatar: userInfo?.avatar || null,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(() => {
    deleteCookie(AUTH_COOKIE_NAME);
    deleteCookie(USER_ID_COOKIE_NAME);
    deleteCookie(USER_NAME_COOKIE_NAME);
    deleteCookie(USER_EMAIL_COOKIE_NAME);
    deleteCookie(USER_DEPARTMENT_COOKIE_NAME);
    deleteCookie(USER_POSITION_COOKIE_NAME);
    deleteCookie(USER_MOBILE_COOKIE_NAME);
    deleteCookie(USER_AVATAR_COOKIE_NAME);
    setState({
      isAuthenticated: false,
      userId: null,
      userName: null,
      userEmail: null,
      userDepartment: null,
      userPosition: null,
      userMobile: null,
      userAvatar: null,
      isLoading: false,
    });
  }, []);

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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

export function useUserId(): string | null {
  const { userId } = useAuth();
  return userId;
}

export function useUserName(): string | null {
  const { userName } = useAuth();
  return userName;
}

export function useUserEmail(): string | null {
  const { userEmail } = useAuth();
  return userEmail;
}

export function useUserDepartment(): string | null {
  const { userDepartment } = useAuth();
  return userDepartment;
}

export function useUserPosition(): string | null {
  const { userPosition } = useAuth();
  return userPosition;
}

export function useUserMobile(): string | null {
  const { userMobile } = useAuth();
  return userMobile;
}

export function useUserAvatar(): string | null {
  const { userAvatar } = useAuth();
  return userAvatar;
}
