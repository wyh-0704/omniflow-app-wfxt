import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  Flame,
  ListChecks,
  Loader2,
  Plus,
  Sparkles,
  Zap,
} from 'lucide-react';
import PageShell from '@/components/custom/PageShell';
import Timeline from '@/components/custom/Timeline';
import ImportScheduleDialog from '@/components/custom/ImportScheduleDialog';
import { usePlanner } from '@/contexts/PlannerContext';
import { dateLabel, conflictsFor, fmt, taskEnd, todayKey } from '@/lib/planner';
import { cn } from '@/lib/utils';

const Index = () => {
  const {
    todayTasks,
    blocked,
    plan,
    completionRate,
    regenerating,
    regenerate,
    place,
    autoSlot,
    shift,
    toggleDone,
    unschedule,
    deleteTask,
  } = usePlanner();

  const focusMin = plan.filter((t) => t.priority === 'high').reduce((sum, t) => sum + t.duration, 0);
  const doneCount = plan.filter((t) => t.done).length;
  const conflictCount = plan.filter((t) => {
    const c = conflictsFor(t, todayTasks, blocked);
    return c.tasks.length > 0 || c.blocked.length > 0;
  }).length;
  const nextTask = plan.find((t) => !t.done);
  const donePercent = plan.length === 0 ? 0 : Math.round((doneCount / plan.length) * 100);
  const ring = 2 * Math.PI * 52;

  return (
    <PageShell>
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-[#4f46e5] to-ai p-6 text-white shadow-xl shadow-primary/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70">Today</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{dateLabel(todayKey())}</h1>
            <p className="mt-2 max-w-md text-sm text-white/80">
              AI 已为您优化今日行程，共 {plan.length} 项安排，预计完成率 {completionRate}%。
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-lg">
              {[
                { label: '已完成', value: `${doneCount}/${plan.length}`, icon: CalendarCheck },
                { label: '专注时长', value: `${(focusMin / 60).toFixed(1)}h`, icon: Flame },
                { label: '时间冲突', value: String(conflictCount), icon: Clock },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-2xl border border-white/20 bg-white/10 px-3 py-3 backdrop-blur">
                    <Icon className="h-4 w-4 text-white/70" />
                    <p className="mt-2 text-lg font-bold leading-none">{s.value}</p>
                    <p className="mt-1 text-[11px] text-white/70">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative h-28 w-28 shrink-0">
              <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="9" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={ring}
                  strokeDashoffset={ring - (ring * donePercent) / 100}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold leading-none">{donePercent}%</span>
                <span className="mt-1 text-[10px] uppercase tracking-widest text-white/70">完成</span>
              </div>
            </div>

            <button
              type="button"
              onClick={regenerate}
              disabled={regenerating}
              className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-lg transition-transform hover:scale-105 disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100"
            >
              {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {regenerating ? '生成中…' : '重新生成'}
            </button>
            <ImportScheduleDialog
              className="min-h-10 border-white/30 bg-white/10 text-white hover:border-white/60 hover:text-white"
            />
          </div>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="order-1 lg:col-span-8">
          <Timeline
            tasks={todayTasks}
            blocked={blocked}
            regenerating={regenerating}
            onRegenerate={regenerate}
            onDropOnBlock={(id, start) => place(id, start)}
            onDropOnEnd={autoSlot}
            onShift={shift}
            onToggleDone={toggleDone}
            onUnschedule={unschedule}
            onDelete={deleteTask}
            onResolve={(id, start) => place(id, start)}
          />
        </section>

        <aside className="order-2 space-y-6 lg:col-span-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold">今日节奏</h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                {completionRate}% 顺畅
              </span>
            </div>
            <div className="space-y-5">
              {[
                { label: '完成进度', value: `${doneCount} / ${plan.length} 项`, percent: donePercent, color: 'bg-primary' },
                {
                  label: '高优先级专注',
                  value: `${(focusMin / 60).toFixed(1)}h`,
                  percent: plan.length === 0 ? 0 : Math.min(100, Math.round((focusMin / (plan.length * 30)) * 100)),
                  color: 'bg-ai',
                },
                {
                  label: '冲突待处理',
                  value: `${conflictCount} 项`,
                  percent: conflictCount === 0 ? 100 : Math.min(100, conflictCount * 20),
                  color: conflictCount === 0 ? 'bg-emerald-500' : 'bg-destructive',
                },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-bold">{row.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', row.color)}
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {nextTask ? (
            <div className="rounded-3xl border border-ai/25 bg-gradient-to-br from-ai/10 to-primary/5 p-6">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ai">
                <Sparkles className="h-4 w-4" />
                下一项安排
              </div>
              <p className="text-lg font-bold">{nextTask.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {fmt(nextTask.start as number)} - {fmt(taskEnd(nextTask))} · {nextTask.duration} 分钟
              </p>
              <button
                type="button"
                onClick={() => toggleDone(nextTask.id)}
                className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-ai px-4 py-2 text-xs font-bold text-white transition-transform hover:scale-105"
              >
                <CalendarCheck className="h-3.5 w-3.5" />
                标记完成
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <p className="text-sm font-bold text-emerald-600">今日安排已全部完成</p>
              <p className="mt-1 text-xs text-muted-foreground">去任务库添加明天的重点任务吧。</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              to="/tasks"
              className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm font-semibold transition-colors hover:border-primary/40"
            >
              <span className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" />
                任务库
              </span>
              <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </Link>
            <Link
              to="/insights"
              className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm font-semibold transition-colors hover:border-primary/40"
            >
              <span className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-ai" />
                效率统计
              </span>
              <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </Link>
          </div>
        </aside>
      </div>

      <Link
        to="/tasks"
        aria-label="新建任务"
        className="fixed bottom-6 left-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-2xl md:hidden"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </PageShell>
  );
};

export default Index;
