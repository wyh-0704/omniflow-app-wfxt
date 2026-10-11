import type { TaskPriority } from '@shared/types/api';

export type { TaskPriority };

export interface Task {
  id: string;
  title: string;
  priority: TaskPriority;
  duration: number;
  start: number | null;
  source: 'ai' | 'manual';
  reason?: string;
  note?: string;
  done?: boolean;
}

export interface BlockedSlot {
  id: string;
  label: string;
  start: number;
  end: number;
}

export type WindowId = 'morning' | 'forenoon' | 'afternoon' | 'evening' | 'night';

export const WINDOWS: { id: WindowId; label: string; from: number; to: number }[] = [
  { id: 'morning', label: '早晨 (06:00-09:00)', from: 360, to: 540 },
  { id: 'forenoon', label: '上午 (09:00-12:00)', from: 540, to: 720 },
  { id: 'afternoon', label: '下午 (14:00-18:00)', from: 840, to: 1080 },
  { id: 'evening', label: '傍晚 (18:00-20:00)', from: 1080, to: 1200 },
  { id: 'night', label: '夜间 (20:00-23:00)', from: 1200, to: 1380 },
];

export const DENSITY_LABELS = ['轻松', '适中', '紧凑'] as const;
export const DENSITY_KEYS = ['relaxed', 'moderate', 'compact'] as const;
export const DAY_START = 360;
export const DAY_END = 1380;
export const PLAN_DATE_LABEL = '2026年9月6日，星期日';

export const PRIORITY_LABEL: Record<TaskPriority, string> = { high: '高', medium: '中', low: '低' };
export const PRIORITY_HINT: Record<TaskPriority, string> = {
  high: '紧急',
  medium: '普通',
  low: '较低',
};

export interface ParamMeta {
  source: string;
  updatedAt: string;
  reason: string;
}

export interface Prefs {
  rating: number | null;
  peak: WindowId[];
  density: 0 | 1 | 2;
  reminders: string;
  feedback: string;
  meta: { peak: ParamMeta; density: ParamMeta; reminders: ParamMeta };
  deviationHandled: boolean;
}

const DEFAULT_META: ParamMeta = { source: '系统默认', updatedAt: '2026-09-01', reason: '初始默认配置' };

export const DEFAULT_PREFS: Prefs = {
  rating: null,
  peak: ['morning', 'forenoon'],
  density: 1,
  reminders: '仅关键任务',
  feedback: '',
  meta: { peak: DEFAULT_META, density: DEFAULT_META, reminders: DEFAULT_META },
  deviationHandled: false,
};

export const SEED_TASKS: Task[] = [
  {
    id: 'seed-1',
    title: '深度工作：核心功能开发',
    priority: 'high',
    duration: 90,
    start: 540,
    source: 'ai',
    reason: '根据您的精力曲线，早晨是逻辑思维最活跃的时段。',
  },
  {
    id: 'seed-2',
    title: '团队同步会议',
    priority: 'medium',
    duration: 30,
    start: 645,
    source: 'manual',
    note: '地点：会议室 A',
  },
  { id: 'seed-3', title: '午餐休息', priority: 'medium', duration: 60, start: 690, source: 'manual' },
  { id: 'seed-4', title: '客户回访', priority: 'medium', duration: 30, start: 720, source: 'manual', note: '电话沟通' },
  { id: 'seed-5', title: '设计系统评审', priority: 'high', duration: 60, start: null, source: 'manual' },
  { id: 'seed-6', title: '回复客户邮件', priority: 'medium', duration: 15, start: null, source: 'manual' },
];

export const SEED_BLOCKED: BlockedSlot[] = [{ id: 'blk-1', label: '每日健身', start: 1080, end: 1140 }];

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseTime(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const total = Number(m[1]) * 60 + Number(m[2]);
  return total >= 0 && total < 1440 ? total : null;
}

export const taskEnd = (t: Task): number => (t.start ?? 0) + t.duration;

export function scheduled(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.start !== null)
    .sort((a, b) => (a.start as number) - (b.start as number));
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function conflictsFor(
  task: Task,
  tasks: Task[],
  blocked: BlockedSlot[]
): { tasks: Task[]; blocked: BlockedSlot[] } {
  if (task.start === null) return { tasks: [], blocked: [] };
  const start = task.start;
  const end = taskEnd(task);
  return {
    tasks: tasks.filter(
      (o) => o.id !== task.id && o.start !== null && overlaps(start, end, o.start, taskEnd(o))
    ),
    blocked: blocked.filter((b) => overlaps(start, end, b.start, b.end)),
  };
}

export function suggestShift(task: Task, tasks: Task[], blocked: BlockedSlot[]): number | null {
  for (let s = (task.start ?? DAY_START) + 5; s + task.duration <= DAY_END; s += 5) {
    const c = conflictsFor({ ...task, start: s }, tasks, blocked);
    if (c.tasks.length === 0 && c.blocked.length === 0) return s;
  }
  return null;
}

export function findSlot(
  duration: number,
  tasks: Task[],
  blocked: BlockedSlot[],
  buffer: number,
  preferred: { from: number; to: number }[]
): number | null {
  const busy = [
    ...scheduled(tasks).map((t) => ({ s: t.start as number, e: taskEnd(t) })),
    ...blocked.map((b) => ({ s: b.start, e: b.end })),
  ];
  const free = (start: number) =>
    start >= DAY_START &&
    start + duration <= DAY_END &&
    busy.every((b) => !overlaps(start - buffer, start + duration + buffer, b.s, b.e));
  for (const w of preferred) {
    for (let s = w.from; s + duration <= w.to; s += 5) if (free(s)) return s;
  }
  for (let s = DAY_START; s + duration <= DAY_END; s += 5) if (free(s)) return s;
  return null;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export function bufferFor(prefs: Prefs): number {
  return [15, 10, 5][prefs.density];
}

export function reasonFor(task: Task, slot: number, prefs: Prefs): string {
  const windows = WINDOWS.filter((w) => prefs.peak.includes(w.id));
  const inPeak = windows.some((w) => slot >= w.from && slot < w.to);
  if (task.priority === 'high') {
    return inPeak
      ? '高优先级任务，已安排在您偏好的高效时段。'
      : '高优先级任务，偏好时段已被占用，安排在最近的空闲时间。';
  }
  return '填入空闲时段，并避开屏蔽时段与其他安排。';
}

export function localPlan(
  pending: Task[],
  fixed: Task[],
  blocked: BlockedSlot[],
  prefs: Prefs
): Task[] {
  const buffer = bufferFor(prefs);
  const windows = WINDOWS.filter((w) => prefs.peak.includes(w.id));
  const placed: Task[] = [...fixed];
  const out: Task[] = [];
  const order = [...pending].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.duration - a.duration
  );
  for (const t of order) {
    const pref = t.priority === 'high' ? windows : [];
    const slot = findSlot(t.duration, placed, blocked, buffer, pref);
    if (slot === null) {
      out.push({ ...t, start: null });
      continue;
    }
    const next: Task = { ...t, start: slot, source: 'ai', reason: reasonFor(t, slot, prefs) };
    placed.push(next);
    out.push(next);
  }
  return out;
}
