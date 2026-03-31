export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userDepartment: string | null;
  userPosition: string | null;
  userMobile: string | null;
  userAvatar: string | null;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (userId: string, userInfo?: {
    name?: string;
    email?: string;
    department?: string;
    position?: string;
    mobile?: string;
    avatar?: string;
  }) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}
