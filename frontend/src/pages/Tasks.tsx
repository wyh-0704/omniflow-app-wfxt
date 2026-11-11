import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarPlus,
  Check,
  Circle,
  Clock,
  Inbox,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import PageShell from '@/components/custom/PageShell';
import ImportScheduleDialog from '@/components/custom/ImportScheduleDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlanner } from '@/contexts/PlannerContext';
import { PRIORITY_HINT, PRIORITY_LABEL, TaskPriority, fmt, shortDate, taskEnd, todayKey } from '@/lib/planner';
import { cn } from '@/lib/utils';

type Filter = 'all' | TaskPriority;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'high', label: '高优先级' },
  { value: 'medium', label: '中优先级' },
  { value: 'low', label: '低优先级' },
];

const PRIORITY_STYLE: Record<TaskPriority, { bar: string; badge: string }> = {
  high: { bar: 'bg-destructive', badge: 'bg-destructive/10 text-destructive' },
  medium: { bar: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-600' },
  low: { bar: 'bg-slate-400', badge: 'bg-muted text-muted-foreground' },
};

const fieldCls =
  'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20';

export default function Tasks() {
  const { tasks, plan, addTask, autoSlot, unschedule, deleteTask, toggleDone } = usePlanner();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [duration, setDuration] = useState('30');
  const [date, setDate] = useState(todayKey());
  const [filter, setFilter] = useState<Filter>('all');
  const [dateFilter, setDateFilter] = useState('all');

  const pool = tasks.filter((t) => t.start === null);
  const scheduledAll = tasks.filter((t) => t.start !== null);
  const matchDate = (t: (typeof tasks)[number]) => dateFilter === 'all' || t.date === dateFilter;
  const poolFiltered = pool.filter(matchDate).filter((t) => filter === 'all' || t.priority === filter);
  const scheduledFiltered = scheduledAll
    .filter(matchDate)
    .filter((t) => filter === 'all' || t.priority === filter)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start as number) - (b.start as number));
  const dateOptions = Array.from(new Set(tasks.map((t) => t.date))).sort();
  const totalMin = plan.reduce((sum, t) => sum + t.duration, 0);
  const doneCount = scheduledFiltered.filter((t) => t.done).length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = title.trim();
    const mins = Number(duration);
    if (!name) {
      toast.error('请输入任务名称');
      return;
    }
    if (!Number.isFinite(mins) || mins < 5 || mins > 600) {
      toast.error('时长需在 5 - 600 分钟之间');
      return;
    }
    addTask(name, priority, Math.round(mins), date);
    setTitle('');
    setDuration('30');
  };

  return (
    <PageShell>
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-ai/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
              <Inbox className="h-3.5 w-3.5" />
              Task Library
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">任务库</h1>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              集中管理所有待办与已排期任务。可为任意一天新建任务，一键排入所属日期，或拖拽到时间轴自由调整。
            </p>
            <div className="mt-4">
              <ImportScheduleDialog className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:max-w-sm">
            {[
              { label: '待办', value: String(pool.length), icon: Sparkles },
              { label: '已排期', value: String(scheduledAll.length), icon: Clock },
              { label: '今日时长', value: `${(totalMin / 60).toFixed(1)}h`, icon: CalendarPlus },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl bg-background px-3 py-3 text-center">
                  <Icon className="mx-auto h-4 w-4 text-primary" />
                  <p className="mt-1.5 text-lg font-bold leading-none">{s.value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-4">
          <div className="space-y-4 rounded-[1.5rem] border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Plus className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-bold leading-tight">新建任务</h2>
                <p className="text-xs text-muted-foreground">可创建任意一天的任务</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={submit}>
              <div>
                <label htmlFor="task-title" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  任务名称
                </label>
                <Input
                  id="task-title"
                  value={title}
                  maxLength={60}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：撰写周报"
                  className="h-11 rounded-xl bg-background"
                />
              </div>
              <div>
                <label htmlFor="task-date" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  任务日期
                </label>
                <input
                  id="task-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value || todayKey())}
                  className={fieldCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="task-priority" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    优先级
                  </label>
                  <select
                    id="task-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className={fieldCls}
                  >
                    {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]} · {PRIORITY_HINT[p]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="task-duration" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    时长 (min)
                  </label>
                  <input
                    id="task-duration"
                    type="number"
                    min={5}
                    max={600}
                    step={5}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className={fieldCls}
                  />
                </div>
              </div>
              <Button type="submit" className="h-11 w-full rounded-xl font-semibold shadow-md shadow-primary/20">
                添加至任务库
              </Button>
            </form>

            <div className="rounded-xl bg-ai/5 p-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-bold text-ai">小贴士：</span>
              高优先级任务会被 AI 优先安排在您偏好的高效时段。
            </div>
          </div>
        </section>

        <section className="space-y-6 lg:col-span-8">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => {
              const count =
                f.value === 'all'
                  ? tasks.length
                  : tasks.filter((t) => t.priority === f.value).length;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                    filter === f.value
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  )}
                >
                  {f.label}
                  <span className={cn('ml-1.5', filter === f.value ? 'text-white/70' : 'text-muted-foreground')}>
                    {count}
                  </span>
                </button>
              );
            })}
            <select
              aria-label="按日期筛选"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="ml-auto h-8 cursor-pointer rounded-full border border-border bg-card px-3 text-xs font-semibold text-muted-foreground"
            >
              <option value="all">全部日期</option>
              {dateOptions.map((d) => (
                <option key={d} value={d}>
                  {d === todayKey() ? `今天（${d}）` : d}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">待办池</h2>
              <span className="text-xs text-muted-foreground">{poolFiltered.length} 项待排期</span>
            </div>

            {poolFiltered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
                <p className="text-sm font-semibold">没有符合条件的待办</p>
                <p className="mt-1 text-xs text-muted-foreground">调整筛选条件，或在左侧新建一个任务。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {poolFiltered.map((t) => (
                  <div
                    key={t.id}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className={cn('absolute inset-y-0 left-0 w-1', PRIORITY_STYLE[t.priority].bar)} />
                    <div className="flex items-start justify-between gap-2 pl-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{t.title}</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', PRIORITY_STYLE[t.priority].badge)}>
                            {PRIORITY_LABEL[t.priority]}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {t.duration} 分钟 · {shortDate(t.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1 pl-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 rounded-lg text-xs font-semibold"
                        onClick={() => autoSlot(t.id)}
                      >
                        <CalendarPlus className="mr-1 h-3.5 w-3.5" />
                        自动排期
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="删除任务"
                        onClick={() => deleteTask(t.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">已排期</h2>
              <Link to="/" className="group inline-flex items-center gap-1 text-xs font-semibold text-primary">
                查看时间轴
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {scheduledFiltered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
                <p className="text-sm font-semibold">还没有已排期的任务</p>
                <p className="mt-1 text-xs text-muted-foreground">把待办池中的任务排入所属日期，或生成 AI 建议。</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {scheduledFiltered.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="w-24 shrink-0 rounded-lg bg-primary/5 px-2 py-1 text-center text-xs font-bold text-primary">
                      {fmt(t.start as number)} - {fmt(taskEnd(t))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm font-semibold', t.done && 'text-muted-foreground line-through')}>
                        {t.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {shortDate(t.date)} · {t.duration} 分钟 · {t.source === 'ai' ? 'AI 建议' : '手动安排'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label={t.done ? '标记未完成' : '标记完成'}
                        onClick={() => toggleDone(t.id)}
                      >
                        {t.done ? <Check className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg text-xs text-muted-foreground"
                        onClick={() => unschedule(t.id)}
                      >
                        移回待办
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="删除任务"
                        onClick={() => deleteTask(t.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              已完成 {doneCount} 项，共 {scheduledFiltered.length} 项安排。
            </p>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
