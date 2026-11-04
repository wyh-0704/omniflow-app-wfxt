import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'sonner';
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

interface PlannerContextValue {
  tasks: Task[];
  blocked: BlockedSlot[];
  prefs: Prefs;
  regenerating: boolean;
  plan: Task[];
  completionRate: number;
  addTask: (title: string, priority: TaskPriority, duration: number) => void;
  importTasks: (items: { title: string; priority: TaskPriority; duration: number; start: number | null }[]) => void;
  place: (id: string, start: number, source?: Task['source']) => void;
  autoSlot: (id: string) => void;
  shift: (id: string, delta: number) => void;
  toggleDone: (id: string) => void;
  unschedule: (id: string) => void;
  deleteTask: (id: string) => void;
  regenerate: () => Promise<void>;
  setBlocked: (next: BlockedSlot[]) => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function PlannerProvider({ children }: { children: ReactNode }) {
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
    toast.success('已添加至任务库');
  };

  const importTasks = (items: { title: string; priority: TaskPriority; duration: number; start: number | null }[]) => {
    if (items.length === 0) return;
    const imported: Task[] = items.map((item) => ({
      ...item,
      id: newId('task'),
      source: 'manual',
    }));
    setTasks([...tasks, ...imported]);
    toast.success(`已导入 ${imported.length} 项时间表任务`);
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

  const toggleDone = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const unschedule = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, start: null, reason: undefined } : t)));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
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

  const value: PlannerContextValue = {
    tasks,
    blocked,
    prefs,
    regenerating,
    plan,
    completionRate,
    addTask,
    importTasks,
    place,
    autoSlot,
    shift,
    toggleDone,
    unschedule,
    deleteTask,
    regenerate,
    setBlocked,
  };

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error('usePlanner 必须在 PlannerProvider 内使用');
  return ctx;
}
