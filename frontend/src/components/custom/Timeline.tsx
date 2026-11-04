import { useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Trash2,
  Undo2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BlockedSlot,
  PRIORITY_LABEL,
  Task,
  conflictsFor,
  fmt,
  scheduled,
  suggestShift,
  taskEnd,
} from '@/lib/planner';

interface TimelineProps {
  tasks: Task[];
  blocked: BlockedSlot[];
  regenerating: boolean;
  onRegenerate: () => void;
  onDropOnBlock: (draggedId: string, targetStart: number) => void;
  onDropOnEnd: (draggedId: string) => void;
  onShift: (id: string, delta: number) => void;
  onToggleDone: (id: string) => void;
  onUnschedule: (id: string) => void;
  onDelete: (id: string) => void;
  onResolve: (id: string, start: number) => void;
}

const PRIORITY_BADGE: Record<Task['priority'], string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-amber-500/10 text-amber-600',
  low: 'bg-muted text-muted-foreground',
};

export default function Timeline(props: TimelineProps) {
  const { tasks, blocked, regenerating } = props;
  const [dragOver, setDragOver] = useState<string | null>(null);
  const blocks = scheduled(tasks);

  const readDrag = (e: React.DragEvent) => e.dataTransfer.getData('text/plain');

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-lg shadow-slate-200/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-primary/5 via-card to-ai/5 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold leading-tight">今日时间轴</h2>
            <p className="text-xs text-muted-foreground">{blocks.length} 项安排 · 支持拖拽调整顺序</p>
          </div>
        </div>
        <button
          type="button"
          onClick={props.onRegenerate}
          disabled={regenerating}
          className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-ai px-4 py-2 text-sm font-bold text-white shadow-md shadow-ai/20 transition-transform hover:scale-105 disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100"
        >
          {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {regenerating ? '生成中…' : '重新生成建议'}
        </button>
      </div>

      <div className="relative space-y-4 p-5 sm:p-6">
        {blocks.length > 0 && <div className="absolute bottom-8 left-[35px] top-8 w-px bg-border" />}
        {blocks.map((task) => {
          const c = conflictsFor(task, tasks, blocked);
          const hasConflict = c.tasks.length > 0 || c.blocked.length > 0;
          const isAi = task.source === 'ai' && !task.done;
          const shift = hasConflict ? suggestShift(task, tasks, blocked) : null;
          const conflictText =
            c.tasks.length > 0
              ? `与「${c.tasks[0].title}」时间重叠。`
              : c.blocked.length > 0
                ? `与屏蔽时段「${c.blocked[0].label}」重叠。`
                : '';
          return (
            <div key={task.id} className="relative pl-9">
              <div
                className={cn(
                  'absolute left-[3px] top-5 h-3 w-3 rounded-full ring-4 ring-card',
                  hasConflict ? 'bg-destructive' : isAi ? 'bg-primary' : 'bg-secondary-foreground/40'
                )}
              />
              <div className="mb-1.5 flex items-center gap-2 text-xs font-bold">
                <span className={cn(hasConflict ? 'text-destructive' : isAi ? 'text-primary' : 'text-muted-foreground')}>
                  {fmt(task.start as number)} - {fmt(taskEnd(task))}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {task.duration} 分钟
                </span>
              </div>
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', task.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(task.id);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  const id = readDrag(e);
                  if (id && id !== task.id) props.onDropOnBlock(id, task.start as number);
                }}
                className={cn(
                  'group cursor-move rounded-2xl border p-4 transition-all hover:shadow-md',
                  hasConflict
                    ? 'border-dashed border-destructive/30 bg-destructive/5'
                    : isAi
                      ? 'border-primary/20 bg-primary/[0.04] hover:border-primary/50'
                      : 'border-border bg-card hover:border-border/80',
                  dragOver === task.id && 'ring-2 ring-primary/40',
                  task.done && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={cn(
                      'font-bold',
                      hasConflict ? 'text-destructive' : isAi && 'text-primary',
                      task.done && 'line-through'
                    )}
                  >
                    {task.title}
                    {hasConflict ? ' (冲突)' : ''}
                  </h3>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        PRIORITY_BADGE[task.priority]
                      )}
                    >
                      {PRIORITY_LABEL[task.priority]}优先级
                    </span>
                    {hasConflict ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      isAi && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                          AI
                        </span>
                      )
                    )}
                  </div>
                </div>
                {hasConflict ? (
                  <p className="mt-1.5 text-sm text-destructive">
                    {conflictText}
                    {shift !== null
                      ? `建议向后移动 ${shift - (task.start as number)} 分钟。`
                      : '今天已无可用空位，请移回待办池。'}
                  </p>
                ) : task.reason && isAi ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">理由：{task.reason}</p>
                ) : task.note ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">{task.note}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border/60 pt-2">
                  {hasConflict && shift !== null && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mr-1 h-8 border-destructive/40 text-destructive"
                      onClick={() => props.onResolve(task.id, shift)}
                    >
                      一键调整
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="提前 15 分钟" onClick={() => props.onShift(task.id, -15)}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="推迟 15 分钟" onClick={() => props.onShift(task.id, 15)}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="标记完成" onClick={() => props.onToggleDone(task.id)}>
                    <Check className={cn('h-4 w-4', task.done && 'text-emerald-500')} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="移回待办池" onClick={() => props.onUnschedule(task.id)}>
                    <Undo2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="删除" onClick={() => props.onDelete(task.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {blocks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
            <p className="text-sm font-semibold">今日暂无安排</p>
            <p className="mt-1 text-sm text-muted-foreground">
              点击「重新生成建议」让 AI 为待办任务排期，或从任务库拖入任务。
            </p>
          </div>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver('end');
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(null);
            const id = readDrag(e);
            if (id) props.onDropOnEnd(id);
          }}
          className={cn(
            'relative ml-9 flex items-center justify-center rounded-2xl border-2 border-dashed border-border py-4 text-sm text-muted-foreground transition-colors',
            dragOver === 'end' && 'border-primary bg-primary/5 text-primary'
          )}
        >
          + 拖拽时间轴中的任务到此处，自动排入最早空闲时段
        </div>
      </div>
    </div>
  );
}