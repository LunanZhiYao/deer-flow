// 认证状态
export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  isLoading: boolean;
}

// 认证上下文类型
export interface AuthContextType extends AuthState {
  login: (userId: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}
