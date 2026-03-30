// 登录会话状态
export type LoginSessionStatus = "pending" | "success" | "expired" | "used";

// 登录会话接口
export interface LoginSession {
  sessionId: string;
  status: LoginSessionStatus;
  userId?: string;
  createdAt: number;
  expiresAt: number;
}

// 认证状态
export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  isLoading: boolean;
}

// 二维码响应
export interface QRCodeResponse {
  success: boolean;
  data?: {
    sessionId: string;
    qrcodeDataUrl: string;
    qrcodeUrl: string;
    expiresIn: number;
    createdAt: number;
  };
  error?: string;
  message?: string;
}

// 扫码验证响应
export interface ScanResponse {
  success: boolean;
  data?: {
    userId: string;
  };
  error?: string;
  message?: string;
}

// 登录状态响应
export interface StatusResponse {
  success: boolean;
  data?: {
    status: LoginSessionStatus;
    userId?: string;
    countdown?: number;
    message?: string;
  };
  error?: string;
  message?: string;
}

// 认证上下文类型
export interface AuthContextType extends AuthState {
  login: (userId: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}
