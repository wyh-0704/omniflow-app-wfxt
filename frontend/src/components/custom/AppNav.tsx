import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { label: '今日行程', target: 'today-section' },
  { label: '任务库', target: 'backlog-section' },
  { label: '效率统计', target: 'insights-section' },
];

export default function AppNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onHome = pathname === '/';

  const goTo = (target: string) => {
    if (!onHome) navigate('/');
    window.setTimeout(
      () => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      onHome ? 0 : 150
    );
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-white">智</div>
          <span className="text-xl font-bold tracking-tight">智行助手</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          {NAV.map((item, i) => (
            <a
              key={item.target}
              href={`#/${item.target}`}
              onClick={(e) => {
                e.preventDefault();
                goTo(item.target);
              }}
              className={cn(
                'transition-colors',
                i === 0 && onHome ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/personalization"
            aria-label="通知与个性化"
            className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-background"
          >
            <Bell className="h-5 w-5" />
          </Link>
          <Link
            to="/personalization"
            aria-label="个性化配置"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border border-ai/30 bg-ai/20 text-xs font-bold text-ai',
              pathname === '/personalization' && 'ring-2 ring-ai/40'
            )}
          >
            YH
          </Link>
        </div>
      </div>
    </nav>
  );
}
