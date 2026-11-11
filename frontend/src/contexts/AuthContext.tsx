import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { API_BASE_URL } from '@/config/constants';
import type {
  ApiResponse,
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from '@shared/types/api';

interface AuthContextType {
  isAuthenticated: boolean | null;
  user: AuthUser | null;
  setIsAuthenticated: (value: boolean) => void;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string, confirmPassword: string) => Promise<void>;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 本地保存的用户信息（退出登录后仍然保留，用于下次登录回填与恢复）
const USER_INFO_KEY = 'zx-user';

export interface SavedUserInfo {
  username: string;
  lastLoginAt?: string;
  lastLogoutAt?: string;
}

export function readSavedUser(): SavedUserInfo | null {
  try {
    const raw = localStorage.getItem(USER_INFO_KEY);
    return raw ? (JSON.parse(raw) as SavedUserInfo) : null;
  } catch {
    return null;
  }
}

function saveUserInfo(info: SavedUserInfo) {
  try {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(info));
  } catch (error) {
    console.error('保存用户信息失败:', error);
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Initialize state directly from localStorage during render (lazy initialization)
  // This avoids synchronous setState in useEffect which causes cascading renders
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(() => {
    const token = localStorage.getItem('token');
    // If no token, we know user is not authenticated
    // If token exists, return null (checking state) to verify with backend
    return token ? null : false;
  });
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        // Already handled in initial state
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data: ApiResponse<AuthUser> = await response.json();
        setIsAuthenticated(data.success);
        if (data.success) {
          setUser(data.data);
          saveUserInfo({ ...readSavedUser(), username: data.data.username });
        } else {
          localStorage.removeItem('token');
        }
      } catch (error) {
        setIsAuthenticated(false);
        localStorage.removeItem('token');
      }
    };
    checkAuth();
  }, []);

  const signIn = async (username: string, password: string) => {
    const payload: LoginRequest = { username, password };
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data: ApiResponse<LoginResponse> & { message?: string } =
      await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || '登录失败，请重试');
    }
    localStorage.setItem('token', data.data.token);
    setUser(data.data.user);
    setIsAuthenticated(true);
    saveUserInfo({ username: data.data.user.username, lastLoginAt: new Date().toISOString() });
  };

  const signUp = async (
    username: string,
    password: string,
    confirmPassword: string,
  ) => {
    const payload: RegisterRequest = { username, password, confirmPassword };
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data: ApiResponse<LoginResponse> & { message?: string } =
      await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || '注册失败，请重试');
    }
    localStorage.setItem('token', data.data.token);
    setUser(data.data.user);
    setIsAuthenticated(true);
    saveUserInfo({ username: data.data.user.username, lastLoginAt: new Date().toISOString() });
  };

  const login = (token: string) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    // 退出登录前保存用户信息（保留在本地，任务数据按账号单独保存）
    if (user) {
      saveUserInfo({
        username: user.username,
        lastLoginAt: readSavedUser()?.lastLoginAt,
        lastLogoutAt: new Date().toISOString(),
      });
    }
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        setIsAuthenticated,
        signIn,
        signUp,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
