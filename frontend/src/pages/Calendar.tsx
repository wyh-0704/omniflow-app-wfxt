import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  Check,
  Plus,
  Trash2,
  Clock,
  Flag,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import PageShell from '@/components/custom/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlanner } from '@/contexts/PlannerContext';
import {
  PRIORITY_HINT,
  PRIORITY_LABEL,
  TaskPriority,
  Task,
  dateKey,
  fmt,
  taskEnd,
  todayKey,
} from '@/lib/planner';
import { cn } from '@/lib/utils';

const PRIORITY_STYLE: Record<TaskPriority, { dot: string; bar: string; badge: string; text: string }> = {
  high: {
    dot: 'bg-destructive',
    bar: 'bg-destructive',
    badge: 'bg-destructive/10 text-destructive',
    text: 'text-destructive',
  },
  medium: {
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    badge: 'bg-amber-500/10 text-amber-600',
    text: 'text-amber-600',
  },
  low: {
    dot: 'bg-slate-400',
    bar: 'bg-slate-400',
    badge: 'bg-muted text-muted-foreground',
    text: 'text-slate-500',
  },
};

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

const MONTH_LABELS = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
];

const fieldCls =
  'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20';

/** Build a 6x7 grid of Date cells for the month view. */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0 = Sunday
  const start = new Date(year, month, 1 - startDay);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return cells;
}

/** Format a date like "2026年11月5日 星期四". */
function formatFullDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()];
  return `${y}年${m}月${d}日 · ${weekday}`;
}

export default function CalendarPage() {
  const {
    getTasksGroupedByDate,
    getTasksForDate,
    addTask,
    deleteTask,
    toggleDone,
  } = usePlanner();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newDuration, setNewDuration] = useState('30');

  const groups = getTasksGroupedByDate();
  const selectedTasks = getTasksForDate(selectedDate);
  const selectedScheduled = selectedTasks
    .filter((t) => t.start !== null)
    .sort((a, b) => (a.start as number) - (b.start as number));
  const selectedPool = selectedTasks.filter((t) => t.start === null);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else { setViewMonth(viewMonth - 1); }
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else { setViewMonth(viewMonth + 1); }
  };
  const goToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelectedDate(todayKey());
  };

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    const mins = Number(newDuration);
    if (!title || !Number.isFinite(mins) || mins < 5 || mins > 600) return;
    addTask(title, newPriority, Math.round(mins), selectedDate);
    setNewTitle('');
    setNewDuration('30');
    setShowAddForm(false);
  };

  const isCurrentMonth = (d: Date) => d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  const isWeekend = (d: Date) => {
    const day = d.getDay();
    return day === 0 || day === 6;
  };
  const isToday = (d: Date) => dateKey(d) === todayKey();
  const isSelected = (d: Date) => dateKey(d) === selectedDate;

  const totalSelectedMin = selectedScheduled.reduce((s, t) => s + t.duration, 0);
  const doneCount = selectedTasks.filter((t) => t.done).length;
  const monthTotalTasks = Object.values(groups).reduce((sum, arr) => sum + arr.length, 0);
  const monthDoneTasks = Object.values(groups).reduce(
    (sum, arr) => sum + arr.filter((t) => t.done).length,
    0,
  );

  return (
    <PageShell>
      {/* Hero header — 与 Index 页风格对齐 */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-[#4f46e5] to-ai p-6 text-white shadow-xl shadow-primary/20 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">
              <CalendarDays className="h-3.5 w-3.5" />
              Monthly Planner
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {viewYear} 年 {MONTH_LABELS[viewMonth]}
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/75">
              点击任意日期安排任务，或切换月份回溯与规划。
            </p>

            <div className="mt-5 flex items-center gap-3">
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-white/60">总任务</p>
                <p className="text-lg font-bold leading-none">{monthTotalTasks}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-white/60">已完成</p>
                <p className="text-lg font-bold leading-none">{monthDoneTasks}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-white/60">选中日期</p>
                <p className="text-lg font-bold leading-none">{formatFullDate(selectedDate).slice(5, 10)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-full border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={prevMonth}
              aria-label="上一月"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              className="h-11 rounded-full bg-white px-5 text-sm font-bold text-primary shadow-md hover:scale-105 transition-transform"
              onClick={goToday}
            >
              今天
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-full border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={nextMonth}
              aria-label="下一月"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Calendar grid */}
        <section className="lg:col-span-8">
          <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm">
            {/* Weekday header */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/40">
              {WEEKDAY_LABELS.map((w, i) => (
                <div
                  key={w}
                  className={cn(
                    'px-2 py-3 text-center text-xs font-bold uppercase tracking-wider',
                    (i === 0 || i === 6) ? 'text-muted-foreground/70' : 'text-muted-foreground',
                  )}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Date cells */}
            <div className="grid grid-cols-7">
              {cells.map((d) => {
                const key = dateKey(d);
                const dayTasks = groups[key] ?? [];
                const scheduledCount = dayTasks.filter((t) => t.start !== null).length;
                const unscheduledCount = dayTasks.length - scheduledCount;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={cn(
                      // Base layout
                      'relative flex min-h-[96px] flex-col gap-1.5 border-b border-r border-border/50 p-2 text-left transition-all duration-200 last:border-r-0',
                      // Same-day hover states
                      isCurrentMonth(d) && !isSelected(d) && 'hover:bg-primary/[0.04] hover:shadow-inner',
                      !isCurrentMonth(d) && 'bg-muted/10',
                      // Weekend subtle tint
                      isWeekend(d) && isCurrentMonth(d) && !isSelected(d) && 'bg-rose-50/30 dark:bg-rose-500/[0.04]',
                      // Selected state — strong ring + background glow
                      isSelected(d) && 'bg-primary/[0.06] ring-2 ring-inset ring-primary shadow-[inset_0_0_0_1px_rgba(var(--primary)_/_0.3)]',
                      // Today — primary dot in number, soft bg if not selected
                      !isSelected(d) && isToday(d) && 'bg-primary/[0.03]',
                    )}
                  >
                    {/* Day number row */}
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-colors',
                          isSelected(d) && 'bg-primary text-white shadow-sm shadow-primary/30',
                          !isSelected(d) && isToday(d) && 'text-primary ring-2 ring-primary/40 ring-offset-1 ring-offset-transparent',
                          !isSelected(d) && !isToday(d) && !isCurrentMonth(d) && 'text-muted-foreground/50',
                          !isSelected(d) && !isToday(d) && isCurrentMonth(d) && 'text-foreground',
                        )}
                      >
                        {d.getDate()}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    {/* Task cards inside cell */}
                    {dayTasks.length > 0 && (
                      <div className="flex w-full flex-col gap-0.5">
                        {dayTasks.slice(0, 2).map((t: Task) => (
                          <div
                            key={t.id}
                            className={cn(
                              'truncate rounded-md border-l-2 px-1.5 py-0.5 text-[10px] font-medium leading-tight',
                              PRIORITY_STYLE[t.priority].bar,
                              'bg-background/70 border-l-transparent',
                              t.done && 'line-through opacity-50',
                              t.start === null && 'italic opacity-60 border-dashed',
                            )}
                            style={{ borderLeftColor: `var(--${t.priority === 'high' ? 'destructive' : t.priority === 'medium' ? 'amber-500' : 'slate-400'})` }}
                            title={t.title}
                          >
                            {t.start !== null && (
                              <span className="mr-1 font-mono text-[9px] text-muted-foreground">
                                {fmt(t.start as number)}
                              </span>
                            )}
                            {t.title}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <div className="text-[10px] font-medium text-muted-foreground">
                            +{dayTasks.length - 2} 更多
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom summary dots */}
                    <div className="mt-auto flex items-center gap-1">
                      {scheduledCount > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span className="text-[9px] text-muted-foreground">{scheduledCount}</span>
                        </span>
                      )}
                      {unscheduledCount > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          <span className="text-[9px] text-muted-foreground">{unscheduledCount}</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend bar */}
          <div className="mt-4 flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-card/50 px-4 py-2.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-primary/40">5</span>
              今天
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              已排期
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              待排期
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded bg-destructive" />
              高优先级
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded bg-amber-500" />
              中优先级
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded bg-slate-400" />
              低优先级
            </div>
          </div>
        </section>

        {/* Detail panel */}
        <aside className="lg:col-span-4">
          <div className="space-y-4 rounded-[1.5rem] border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24">
            {/* Selected date header */}
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                    {selectedDate === todayKey() ? '今天' : '日期详情'}
                  </p>
                  <h2 className="mt-1 text-xl font-bold leading-tight truncate">
                    {formatFullDate(selectedDate)}
                  </h2>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {selectedTasks.length} 项
                    </span>
                    {selectedScheduled.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        共 {(totalSelectedMin / 60).toFixed(1)}h
                      </span>
                    )}
                    {selectedTasks.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <Check className="h-3.5 w-3.5" />
                        {doneCount} 完成
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-primary shadow-md shadow-primary/20 hover:scale-105 transition-transform"
                  onClick={() => setShowAddForm((s) => !s)}
                  aria-label="添加任务"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Add task form */}
            {showAddForm && (
              <form
                className="space-y-3 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4"
                onSubmit={submitAdd}
              >
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3 w-3" />
                  新任务
                </p>
                <Input
                  value={newTitle}
                  maxLength={60}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：撰写周报"
                  className="h-10 bg-background"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className={fieldCls}
                  >
                    {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]} · {PRIORITY_HINT[p]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={5}
                    max={600}
                    step={5}
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className={fieldCls}
                    placeholder="分钟"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 rounded-xl">
                    添加到这一天
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl text-muted-foreground"
                    onClick={() => setShowAddForm(false)}
                  >
                    取消
                  </Button>
                </div>
              </form>
            )}

            {/* Scheduled tasks */}
            {selectedScheduled.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  已排期 · {selectedScheduled.length} 项
                </p>
                <div className="space-y-2">
                  {selectedScheduled.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={toggleDone} onDelete={deleteTask} />
                  ))}
                </div>
              </div>
            )}

            {/* Unscheduled tasks */}
            {selectedPool.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  待排期 · {selectedPool.length} 项
                </p>
                <div className="space-y-2">
                  {selectedPool.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={toggleDone} onDelete={deleteTask} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {selectedTasks.length === 0 && !showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full rounded-2xl border-2 border-dashed border-border bg-muted/30 px-4 py-10 text-center transition-all hover:border-primary/40 hover:bg-primary/[0.04]"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold">这一天还没有任务</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  点击这里添加一个新任务到 {formatFullDate(selectedDate).slice(5)}
                </p>
              </button>
            )}
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-background px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md',
        task.done && 'opacity-60',
      )}
    >
      {/* Priority indicator bar on the left */}
      <span
        className={cn('absolute inset-y-0 left-0 w-1', PRIORITY_STYLE[task.priority].bar)}
      />

      <button
        type="button"
        className="shrink-0 text-muted-foreground transition-colors hover:text-emerald-500"
        onClick={() => onToggle(task.id)}
        aria-label={task.done ? '标记未完成' : '标记完成'}
      >
        {task.done ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>

      <div className="min-w-0 flex-1 pl-1">
        <p
          className={cn(
            'truncate text-sm font-semibold',
            task.done && 'line-through text-muted-foreground',
          )}
        >
          {task.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          {task.start !== null ? (
            <span className="inline-flex items-center gap-0.5 font-mono">
              <Clock className="h-3 w-3" />
              {fmt(task.start as number)} - {fmt(taskEnd(task))}
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 italic">
              <Clock className="h-3 w-3" />
              未排期
            </span>
          )}
          <span className={cn('inline-flex items-center gap-0.5 font-semibold', PRIORITY_STYLE[task.priority].text)}>
            <Flag className="h-3 w-3" />
            {PRIORITY_LABEL[task.priority]}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        onClick={() => onDelete(task.id)}
        aria-label="删除任务"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
