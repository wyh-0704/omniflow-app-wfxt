import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, CalendarDays, CalendarRange, ListChecks, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const NAV = [
  { label: '今日行程', to: '/', icon: CalendarDays },
  { label: '月历视图', to: '/calendar', icon: CalendarRange },
  { label: '任务库', to: '/tasks', icon: ListChecks },
  { label: '效率统计', to: '/insights', icon: BarChart3 },
];

export default function AppNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const initials = (user?.username || 'YH').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-ai font-bold text-white shadow-md shadow-primary/25">
            智
          </div>
          <span className="text-lg font-bold tracking-tight sm:text-xl">智行助手</span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-border bg-background/70 p-1 md:flex">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            to="/personalization"
            aria-label="通知与个性化"
            className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-ai" />
          </Link>
          <Link
            to="/personalization"
            aria-label="个性化配置"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-ai/20 to-primary/20 text-xs font-bold text-ai ring-1 ring-ai/30 transition-shadow',
              pathname === '/personalization' && 'ring-2 ring-ai/50'
            )}
          >
            {initials}
          </Link>
          <button
            type="button"
            aria-label="退出登录"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav className="mx-auto flex max-w-screen-xl gap-2 overflow-x-auto px-4 pb-3 md:hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                  isActive
                    ? 'border-primary/20 bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </header>
  );
}
