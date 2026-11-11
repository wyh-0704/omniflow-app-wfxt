import { ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Index from './pages/Index';
import Tasks from './pages/Tasks';
import Insights from './pages/Insights';
import Personalization from './pages/Personalization';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PlannerProvider } from './contexts/PlannerContext';

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        正在验证登录状态…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

const PlannerScope = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  // 切换账号时重建 Provider，使任务库按账号重新加载（新用户为空）
  return <PlannerProvider key={user?.username ?? 'guest'}>{children}</PlannerProvider>;
};

const App = () => (
  <AuthProvider>
    <HashRouter>
      <PlannerScope>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Index />
              </RequireAuth>
            }
          />
          <Route
            path="/1091fa4a-ed53-4503-b0e7-2e9078e58a83"
            element={
              <RequireAuth>
                <Index />
              </RequireAuth>
            }
          />
          <Route
            path="/tasks"
            element={
              <RequireAuth>
                <Tasks />
              </RequireAuth>
            }
          />
          <Route
            path="/insights"
            element={
              <RequireAuth>
                <Insights />
              </RequireAuth>
            }
          />
          <Route
            path="/personalization"
            element={
              <RequireAuth>
                <Personalization />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PlannerScope>
    </HashRouter>
  </AuthProvider>
);

export default App;
