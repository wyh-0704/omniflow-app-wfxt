import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Loader2,
  Lock,
  LogIn,
  Sparkles,
  User,
  UserPlus,
  CalendarCheck,
  Flame,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'login' | 'register';

const FEATURED_ITEMS = [
  { icon: Sparkles, text: 'AI 智能排期' },
  { icon: Flame, text: '专注时段优化' },
  { icon: CalendarCheck, text: '月历视图规划' },
];

const Login = () => {
  const { isAuthenticated, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState(() => ({
    username: localStorage.getItem('zx-last-username') ?? '',
    password: localStorage.getItem('zx-last-password') ?? '',
  }));
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

  const onLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { username, password } = loginForm;
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await signIn(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { username, password, confirmPassword } = registerForm;
    if (!username.trim() || !password || !confirmPassword) {
      setError('请填写完整的注册信息');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await signUp(username.trim(), password, confirmPassword);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const currentForm = mode === 'login' ? onLogin : onRegister;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background decorative blobs — aligns with Index hero */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[400px] w-[400px] rounded-full bg-ai/10 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl shadow-primary/10 lg:grid-cols-5">
          {/* Left panel — brand & features */}
          <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-[#4f46e5] to-ai p-8 text-white lg:col-span-2 lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-primary shadow-lg">
                智
              </div>
              <h1 className="mt-6 text-3xl font-bold tracking-tight">智行助手</h1>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                AI 驱动的每日行程规划助手，让每一分钟都高效且从容。
              </p>
            </div>

            <div className="relative space-y-3">
              {FEATURED_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.text}
                    className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{item.text}</span>
                  </div>
                );
              })}
            </div>

            <div className="relative mt-6 rounded-xl border border-white/15 bg-white/10 p-3 text-xs text-white/80 backdrop-blur-sm">
              <p className="font-bold text-white">💡 快速体验</p>
              <p className="mt-1 leading-relaxed">
                默认账号：<span className="font-mono font-bold text-white">admin</span>
                {' '}/{' '}
                <span className="font-mono font-bold text-white">admin123</span>
              </p>
            </div>
          </div>

          {/* Right panel — form */}
          <div className="relative p-6 sm:p-10 lg:col-span-3">
            {/* Mobile brand header */}
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white shadow-md shadow-primary/25">
                智
              </div>
              <div>
                <p className="text-base font-bold">智行助手</p>
                <p className="text-xs text-muted-foreground">AI 日程规划</p>
              </div>
            </div>

            {/* Mode switch — pill style, aligns with AppNav */}
            <div className="mb-6 flex rounded-full border border-border bg-muted/50 p-1">
              {(['login', 'register'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={cn(
                    'flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all',
                    mode === m
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'login' ? '登录' : '注册'}
                </button>
              ))}
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight">
                {mode === 'login' ? '欢迎回来 👋' : '创建新账号'}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {mode === 'login'
                  ? '使用您的账号登录以继续规划日程'
                  : '注册后即刻开始使用智行助手'}
              </p>
            </div>

            <form onSubmit={currentForm} className="space-y-4" noValidate>
              {/* Username — shared by both modes */}
              <div className="space-y-1.5">
                <Label htmlFor={`${mode}-username`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  用户名
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={`${mode}-username`}
                    value={mode === 'login' ? loginForm.username : registerForm.username}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (mode === 'login')
                        setLoginForm((prev) => ({ ...prev, username: val }));
                      else
                        setRegisterForm((prev) => ({ ...prev, username: val }));
                    }}
                    placeholder={mode === 'login' ? '请输入用户名' : '字母、数字或下划线，至少 3 位'}
                    autoComplete="username"
                    autoFocus
                    className="h-11 rounded-xl border-border bg-background pl-10 text-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor={`${mode}-password`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  密码
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={`${mode}-password`}
                    type="password"
                    value={mode === 'login' ? loginForm.password : registerForm.password}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (mode === 'login')
                        setLoginForm((prev) => ({ ...prev, password: val }));
                      else
                        setRegisterForm((prev) => ({ ...prev, password: val }));
                    }}
                    placeholder={mode === 'login' ? '请输入密码' : '至少 6 位'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="h-11 rounded-xl border-border bg-background pl-10 text-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Confirm password — register only */}
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="register-confirm" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    确认密码
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="register-confirm"
                      type="password"
                      value={registerForm.confirmPassword}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      placeholder="请再次输入密码"
                      autoComplete="new-password"
                      className="h-11 rounded-xl border-border bg-background pl-10 text-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                >
                  <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit button — gradient pill with hover scale */}
              <Button
                type="submit"
                disabled={submitting}
                className={cn(
                  'group relative h-11 w-full rounded-xl text-sm font-bold shadow-lg transition-all duration-200 hover:scale-[1.02] disabled:cursor-wait disabled:hover:scale-100',
                  mode === 'login'
                    ? 'bg-gradient-to-r from-primary to-[#4f46e5] text-white shadow-primary/25'
                    : 'bg-gradient-to-r from-primary to-ai text-white shadow-primary/25',
                )}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : mode === 'login' ? (
                  <LogIn className="mr-2 h-4 w-4" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {submitting ? (
                  mode === 'login' ? '登录中…' : '注册中…'
                ) : mode === 'login' ? (
                  '登录'
                ) : (
                  '注册并登录'
                )}
                <Zap className="absolute right-4 h-4 w-4 opacity-40 transition-opacity group-hover:opacity-80" />
              </Button>

              {/* Mode switch link */}
              <div className="pt-2 text-center text-sm text-muted-foreground">
                {mode === 'login' ? '还没有账号？' : '已有账号？'}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  className="ml-1 font-semibold text-primary underline-offset-4 transition-colors hover:underline"
                >
                  {mode === 'login' ? '立即注册 →' : '← 返回登录'}
                </button>
              </div>
            </form>

            {/* Desktop hint — mode switcher at bottom for clarity */}
            {mode === 'login' && (
              <p className="mt-6 text-center text-[11px] text-muted-foreground/70 lg:hidden">
                首次体验？可使用 admin / admin123 快速登录
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
