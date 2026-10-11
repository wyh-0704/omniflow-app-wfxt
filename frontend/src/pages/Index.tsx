import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import OmniflowBadge from '@/components/custom/OmniflowBadge';
import { Toaster } from '@/components/ui/sonner';
import AppNav from '@/components/custom/AppNav';
import TaskPanel from '@/components/custom/TaskPanel';
import Timeline from '@/components/custom/Timeline';
import InsightPanels from '@/components/custom/InsightPanels';
import { useLocalStorage } from '@/hooks/use-localStorage';
import { requestAiSchedule } from '@/lib/api';
import {
  BlockedSlot,
  DAY_END,
  DAY_START,
  DENSITY_KEYS,
  DEFAULT_PREFS,
  PLAN_DATE_LABEL,
  Prefs,
  SEED_BLOCKED,
  SEED_TASKS,
  Task,
  TaskPriority,
  WINDOWS,
  bufferFor,
  conflictsFor,
  findSlot,
  fmt,
  localPlan,
  newId,
  parseTime,
  scheduled,
  taskEnd,
} from '@/lib/planner';

const Index = () => {
  const [tasks, setTasks] = useLocalStorage<Task[]>('zx-tasks', SEED_TASKS);
  const [blocked, setBlocked] = useLocalStorage<BlockedSlot[]>('zx-blocked', SEED_BLOCKED);
  const [prefs] = useLocalStorage<Prefs>('zx-prefs', DEFAULT_PREFS);
  const [regenerating, setRegenerating] = useState(false);

  const plan = scheduled(tasks);
  const clean = plan.filter((t) => {
    const c = conflictsFor(t, tasks, blocked);
    return c.tasks.length === 0 && c.blocked.length === 0;
  }).length;
  const completionRate = plan.length === 0 ? 0 : Math.round((clean / plan.length) * 100);

  const place = (id: string, start: number, source: Task['source'] = 'manual') => {
    const next = tasks.map((t) => (t.id === id ? { ...t, start, source, reason: undefined } : t));
    setTasks(next);
    const moved = next.find((t) => t.id === id);
    if (moved) {
      const c = conflictsFor(moved, next, blocked);
      if (c.tasks.length > 0 || c.blocked.length > 0) toast.warning('检测到时间冲突，请查看今日行程中的提示');
    }
  };

  const addTask = (title: string, priority: TaskPriority, duration: number) => {
    setTasks([...tasks, { id: newId('task'), title, priority, duration, start: null, source: 'manual' }]);
    toast.success('已添加至待办池');
  };

  const autoSlot = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const others = tasks.filter((t) => t.id !== id);
    const slot = findSlot(task.duration, others, blocked, bufferFor(prefs), []);
    if (slot === null) {
      toast.error('今天已没有足够的空闲时段');
      return;
    }
    place(id, slot);
    toast.success(`已排入 ${fmt(slot)}`);
  };

  const shift = (id: string, delta: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.start === null) return;
    const start = Math.min(Math.max(task.start + delta, DAY_START), DAY_END - task.duration);
    place(id, start);
  };

  const regenerate = async () => {
    const fixed = tasks.filter((t) => t.start !== null && (t.source === 'manual' || t.done));
    const pending = tasks.filter((t) => !fixed.some((f) => f.id === t.id));
    if (pending.length === 0) {
      toast.info('没有需要排期的待办任务');
      return;
    }
    setRegenerating(true);
    let result: Task[] | null = null;
    try {
      const res = await requestAiSchedule({
        date: PLAN_DATE_LABEL,
        tasks: pending.map((t) => ({ id: t.id, title: t.title, priority: t.priority, duration: t.duration })),
        busy: [
          ...blocked.map((b) => ({ label: b.label, start: fmt(b.start), end: fmt(b.end) })),
          ...fixed.map((t) => ({ label: t.title, start: fmt(t.start as number), end: fmt(taskEnd(t)) })),
        ],
        peakWindows: WINDOWS.filter((w) => prefs.peak.includes(w.id)).map((w) => w.label),
        density: DENSITY_KEYS[prefs.density],
      });
      const placed: Task[] = [...fixed];
      const out: Task[] = [];
      let valid = true;
      for (const t of pending) {
        const item = res.items.find((i) => i.id === t.id);
        const start = item ? parseTime(item.start) : null;
        if (!item || start === null || start < DAY_START || start + t.duration > DAY_END) {
          valid = false;
          break;
        }
        const next: Task = { ...t, start, source: 'ai', reason: item.reason || '由 AI 根据优先级与空闲时间安排。' };
        const c = conflictsFor(next, [...placed, next], blocked);
        if (c.tasks.length > 0 || c.blocked.length > 0) {
          valid = false;
          break;
        }
        placed.push(next);
        out.push(next);
      }
      if (valid) result = out;
    } catch {
      result = null;
    }
    if (!result) {
      result = localPlan(pending, fixed, blocked, prefs);
      toast.info('AI 服务暂不可用，已使用本地规则生成建议');
    } else {
      toast.success('已根据您的偏好重新生成行程建议');
    }
    const byId = new Map(result.map((t) => [t.id, t]));
    setTasks(tasks.map((t) => byId.get(t.id) ?? t));
    setRegenerating(false);
  };

  const focusForm = () => {
    document.getElementById('task-aside')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => document.getElementById('task-title')?.focus(), 400);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <aside id="task-aside" className="order-2 scroll-mt-20 space-y-6 lg:order-1 lg:col-span-3">
            <TaskPanel
              tasks={tasks}
              onAdd={addTask}
              onSchedule={autoSlot}
              onDelete={(id) => setTasks(tasks.filter((t) => t.id !== id))}
            />
          </aside>
          <section id="today-section" className="order-1 scroll-mt-20 space-y-6 lg:order-2 lg:col-span-6">
            <Timeline
              tasks={tasks}
              blocked={blocked}
              regenerating={regenerating}
              completionRate={completionRate}
              onRegenerate={regenerate}
              onDropOnBlock={(id, start) => place(id, start)}
              onDropOnEnd={autoSlot}
              onShift={shift}
              onToggleDone={(id) => setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))}
              onUnschedule={(id) =>
                setTasks(tasks.map((t) => (t.id === id ? { ...t, start: null, reason: undefined } : t)))
              }
              onDelete={(id) => setTasks(tasks.filter((t) => t.id !== id))}
              onResolve={(id, start) => place(id, start)}
            />
          </section>
          <aside className="order-3 space-y-6 lg:col-span-3">
            <InsightPanels tasks={tasks} blocked={blocked} prefs={prefs} onBlockedChange={setBlocked} />
          </aside>
        </div>
      </main>
      <button
        type="button"
        aria-label="新建任务"
        onClick={focusForm}
        className="fixed bottom-6 left-6 z-30 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-2xl md:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>
      {/* Omniflow Badge - always put this at the bottom right corner of the page*/}
      <OmniflowBadge />
      <Toaster />
    </div>
  );
};

export default Index;
