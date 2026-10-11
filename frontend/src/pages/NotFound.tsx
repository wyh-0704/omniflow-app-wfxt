import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AppNav from '@/components/custom/AppNav';

const NotFound = () => {
  const { pathname } = useLocation();
  return (
  <div className="min-h-screen bg-background">
    <AppNav />
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-xl font-bold">页面不存在</h1>
      <p className="mt-2 text-sm text-muted-foreground">您访问的页面可能已被移动或从未存在。</p>
      <p className="mt-1 max-w-full break-all text-xs text-muted-foreground">{pathname}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild className="min-h-[44px] rounded-xl">
          <Link to="/">返回今日行程</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-[44px] rounded-xl">
          <Link to="/personalization">个性化配置</Link>
        </Button>
      </div>
    </main>
  </div>
  );
};

export default NotFound;
