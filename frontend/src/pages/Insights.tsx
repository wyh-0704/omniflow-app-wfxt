import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Flame, Plus, Sparkles, Target, Timer, TrendingUp, X } from 'lucide-react';
import { toast } from 'sonner';
import PageShell from '@/components/custom/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePlanner } from '@/contexts/PlannerContext';
import { PLAN_DATE_LABEL, PRIORITY_LABEL, TaskPriority, WINDOWS, fmt, newId, parseTime } from '@/lib/planner';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#94a3b8',
};

export default function Insights() {
  const { tasks, blocked, prefs, plan, setBlocked, deleteTask, toggleDone } = usePlanner();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [start, setStart] = useState('12:00');
  const [end, setEnd] = useState('13:00');

  const plannedMin = plan.reduce((sum, t) => sum + t.duration, 0);
  const doneMin = plan.filter((t) => t.done).reduce((sum, t) => sum + t.duration, 0);
  const focusMin = plan.filter((t) => t.priority === 'high').reduce((sum, t) => sum + t.duration, 0);
  const doneTasks = plan.filter((t) => t.done).length;
  const progress = plannedMin === 0 ? 0 : Math.round((doneMin / plannedMin) * 100);
  const completionRate = plan.length === 0 ? 0 : Math.round((doneTasks / plan.length) * 100);

  const priorityData = (Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => ({
    name: PRIORITY_LABEL[p],
    计划: plan.filter((t) => t.priority === p).reduce((s, t) => s + t.duration, 0),
    完成: plan.filter((t) => t.priority === p && t.done).reduce((s, t) => s + t.duration, 0),
    color: PRIORITY_COLORS[p],
  }));

  const windowData = WINDOWS.map((w) => {
    const inWindow = plan.filter((t) => {
      const s = t.start as number;
      return s >= w.from && s < w.to;
    });
    return {
      name: w.label.split(' ')[0],
      专注时长: inWindow.reduce((s, t) => s + t.duration, 0),
      isPeak: prefs.peak.includes(w.id),
    };
  });

  const peakLabels = WINDOWS.filter((w) => prefs.peak.includes(w.id)).map((w) => w.label.split(' ')[0]);
  const offPeak = plan.find((t) => {
    if (t.priority !== 'high') return false;
    const s = t.start as number;
    return !WINDOWS.some((w) => prefs.peak.includes(w.id) && s >= w.from && s < w.to);
  });

  const tip = offPeak
    ? `「${offPeak.title}」是高优先级任务但不在您偏好的${peakLabels.join('、') || '高效'}时段，建议移至该时段。`
    : peakLabels.length > 0
      ? `高优先级任务都已安排在您偏好的${peakLabels.join('、')}时段，保持这个节奏。`
      : '在个性化配置中选择高效时段，AI 将据此安排高优先级任务。';

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const s = parseTime(start);
    const en = parseTime(end);
    if (!label.trim()) {
      toast.error('请填写屏蔽时段名称');
      return;
    }
    if (s === null || en === null || en <= s) {
      toast.error('结束时间需晚于开始时间');
      return;
    }
    setBlocked([...blocked, { id: newId('blk'), label: label.trim(), start: s, end: en }]);
    toast.success('已添加屏蔽时段，AI 排期时将自动避开');
    setLabel('');
    setOpen(false);
  };

  const kpis = [
    { label: '计划总时长', value: `${(plannedMin / 60).toFixed(1)}h`, hint: `${plan.length} 项安排`, icon: Timer, tone: 'text-primary' },
    { label: '已完成时长', value: `${(doneMin / 60).toFixed(1)}h`, hint: `${doneTasks} 项已完成`, icon: Target, tone: 'text-emerald-600' },
    { label: '时间完成率', value: `${progress}%`, hint: `任务完成率 ${completionRate}%`, icon: TrendingUp, tone: 'text-ai' },
    { label: '高优先级专注', value: `${(focusMin / 60).toFixed(1)}h`, hint: '来自高优先级任务', icon: Flame, tone: 'text-amber-600' },
  ];

  return (
    <PageShell>
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-ai/10 blur-3xl" />
        <div className="relative">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-ai">
            <TrendingUp className="h-3.5 w-3.5" />
            Insights
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">效率统计</h1>
          <p className="mt-2 text-sm text-muted-foreground">{PLAN_DATE_LABEL} · 基于今日行程与任务完成情况自动汇总</p>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{k.label}</span>
                  <Icon className={cn('h-4 w-4', k.tone)} />
                </div>
                <p className="mt-3 text-2xl font-bold leading-none">{k.value}</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{k.hint}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-8">
          <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">优先级时长对比</h2>
                <p className="text-xs text-muted-foreground">计划时长与已完成时长（分钟）</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                {plan.length} 项任务
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={36} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    formatter={(value: number) => [`${value} 分钟`, '']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="计划" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  <Bar dataKey="完成" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">时段专注分布</h2>
                <p className="text-xs text-muted-foreground">紫色为您偏好的高效时段</p>
              </div>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={windowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={36} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    formatter={(value: number) => [`${value} 分钟`, '专注时长']}
                  />
                  <Bar dataKey="专注时长" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {windowData.map((w) => (
                      <Cell key={w.name} fill={w.isPeak ? '#8b5cf6' : '#2563eb'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">今日任务明细</h2>
              <Link to="/tasks" className="group inline-flex items-center gap-1 text-xs font-semibold text-primary">
                任务库
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            {plan.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-8 text-center text-sm text-muted-foreground">
                今天还没有排期任务，去任务库安排一下吧。
              </p>
            ) : (
              <div className="space-y-2">
                {plan.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: PRIORITY_COLORS[t.priority] }}
                    />
                    <span className="w-20 shrink-0 text-[11px] font-semibold text-muted-foreground">
                      {fmt(t.start as number)}
                    </span>
                    <span className={cn('min-w-0 flex-1 truncate text-sm font-medium', t.done && 'text-muted-foreground line-through')}>
                      {t.title}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{t.duration} 分钟</span>
                    <button
                      type="button"
                      aria-label="切换完成状态"
                      onClick={() => toggleDone(t.id)}
                      className={cn(
                        'shrink-0 cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-bold',
                        t.done ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {t.done ? '已完成' : '进行中'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6 lg:col-span-4">
          <div className="rounded-[1.5rem] border border-ai/25 bg-gradient-to-br from-ai/10 to-primary/5 p-6">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ai">
              <Sparkles className="h-4 w-4" />
              AI 提示
            </div>
            <p className="text-sm leading-relaxed text-foreground">{tip}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>任务完成率</span>
              <span className="font-bold text-foreground">{completionRate}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/60">
              <div className="h-full rounded-full bg-ai transition-all duration-500" style={{ width: `${completionRate}%` }} />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold">不可用时段</h2>
            <div className="space-y-2">
              {blocked.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl bg-background px-3 py-2">
                  <span className="text-sm font-medium">{b.label}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {fmt(b.start)} - {fmt(b.end)}
                    <button
                      type="button"
                      aria-label={`移除${b.label}`}
                      className="cursor-pointer rounded p-1 transition-colors hover:bg-border"
                      onClick={() => setBlocked(blocked.filter((x) => x.id !== b.id))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                </div>
              ))}
              {blocked.length === 0 && <p className="text-sm text-muted-foreground">暂未设置屏蔽时段。</p>}
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex min-h-9 w-full cursor-pointer items-center justify-center gap-1 rounded-xl border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                添加屏蔽时段
              </button>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-base font-bold">未排期任务</h2>
            {tasks.filter((t) => t.start === null).length === 0 ? (
              <p className="text-sm text-muted-foreground">所有任务都已排入今日行程。</p>
            ) : (
              <div className="space-y-2">
                {tasks
                  .filter((t) => t.start === null)
                  .slice(0, 4)
                  .map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl bg-background px-3 py-2">
                      <span className="min-w-0 truncate text-sm font-medium">{t.title}</span>
                      <button
                        type="button"
                        aria-label="删除任务"
                        className="shrink-0 cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                        onClick={() => deleteTask(t.id)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
            <Link
              to="/tasks"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              前往任务库管理
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={add} className="space-y-4">
            <DialogHeader>
              <DialogTitle>添加屏蔽时段</DialogTitle>
              <DialogDescription>AI 生成行程时会自动跳过这些时段。</DialogDescription>
            </DialogHeader>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="例如：午休" maxLength={30} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit">添加</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}