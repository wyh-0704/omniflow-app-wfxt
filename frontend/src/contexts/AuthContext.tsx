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
  };

  const login = (token: string) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const logout = () => {
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
