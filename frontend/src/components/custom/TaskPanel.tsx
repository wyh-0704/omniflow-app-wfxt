import { useState } from 'react';
import { CalendarPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PRIORITY_HINT, Task, TaskPriority } from '@/lib/planner';

interface TaskPanelProps {
  tasks: Task[];
  onAdd: (title: string, priority: TaskPriority, duration: number) => void;
  onSchedule: (id: string) => void;
  onDelete: (id: string) => void;
}

const PRIORITY_VALUES: { value: TaskPriority; label: string }[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

const BORDER: Record<TaskPriority, string> = {
  high: 'border-destructive',
  medium: 'border-amber-500',
  low: 'border-slate-300',
};

export default function TaskPanel({ tasks, onAdd, onSchedule, onDelete }: TaskPanelProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [duration, setDuration] = useState('30');
  const pool = tasks.filter((t) => t.start === null);

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
    onAdd(name, priority, Math.round(mins));
    setTitle('');
    setDuration('30');
  };

  const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground';
  const fieldCls =
    'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">新建任务</h2>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="task-title" className={labelCls}>任务名称</label>
            <Input
              id="task-title"
              value={title}
              maxLength={60}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：撰写周报"
              className="h-10 rounded-xl bg-background"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-priority" className={labelCls}>优先级</label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={fieldCls}
              >
                {PRIORITY_VALUES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-duration" className={labelCls}>时长 (min)</label>
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
          <Button type="submit" className="w-full rounded-xl font-semibold shadow-md shadow-primary/20">
            添加至待办
          </Button>
        </form>
      </div>

      <div id="backlog-section" className="scroll-mt-20 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">待办池</h2>
        {pool.length === 0 ? (
          <p className="text-sm text-muted-foreground">待办池已清空，新建任务后会出现在这里。</p>
        ) : (
          <div className="space-y-3">
            {pool.map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', t.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                className={cn(
                  'flex cursor-grab items-center justify-between gap-2 rounded-xl border-l-4 bg-background p-3',
                  BORDER[t.priority]
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.duration} 分钟 · {PRIORITY_HINT[t.priority]}
                  </p>
                </div>
                <div className="flex shrink-0">
                  <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="排入今日" onClick={() => onSchedule(t.id)}>
                    <CalendarPlus className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="删除任务" onClick={() => onDelete(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
