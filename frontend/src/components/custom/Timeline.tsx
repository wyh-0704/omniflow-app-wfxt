import { useState } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronUp, Trash2, Undo2, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BlockedSlot,
  PLAN_DATE_LABEL,
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
  completionRate: number;
  onRegenerate: () => void;
  onDropOnBlock: (draggedId: string, targetStart: number) => void;
  onDropOnEnd: (draggedId: string) => void;
  onShift: (id: string, delta: number) => void;
  onToggleDone: (id: string) => void;
  onUnschedule: (id: string) => void;
  onDelete: (id: string) => void;
  onResolve: (id: string, start: number) => void;
}

export default function Timeline(props: TimelineProps) {
  const { tasks, blocked, regenerating, completionRate } = props;
  const [dragOver, setDragOver] = useState<string | null>(null);
  const blocks = scheduled(tasks);

  const readDrag = (e: React.DragEvent) => e.dataTransfer.getData('text/plain');

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-lg">
      <div className="flex flex-col justify-between gap-4 border-b border-border bg-primary/5 p-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{PLAN_DATE_LABEL}</h1>
          <p className="text-sm text-muted-foreground">
            AI 已为您优化今日行程，预计完成率 {completionRate}%
          </p>
        </div>
        <button
          type="button"
          onClick={props.onRegenerate}
          disabled={regenerating}
          className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-ai px-4 py-2 text-sm font-bold text-white transition-transform hover:scale-105 disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100"
        >
          {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {regenerating ? '生成中…' : '重新生成建议'}
        </button>
      </div>

      <div className="relative space-y-4 p-6">
        {blocks.length > 0 && <div className="absolute bottom-6 left-6 top-6 w-px bg-border" />}
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
            <div key={task.id} className="relative pl-8">
              <div
                className={cn(
                  'absolute left-[-4px] top-2 h-2 w-2 rounded-full ring-4 ring-card',
                  hasConflict ? 'bg-destructive' : isAi ? 'bg-primary' : 'bg-secondary-foreground/50'
                )}
              />
              <div
                className={cn(
                  'mb-1 text-xs font-bold',
                  hasConflict ? 'text-destructive' : isAi ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {fmt(task.start as number)} - {fmt(taskEnd(task))}
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
                  'cursor-move rounded-2xl border p-4 transition-all hover:shadow-md',
                  hasConflict
                    ? 'border-dashed border-destructive/30 bg-destructive/5'
                    : isAi
                      ? 'border-primary/20 bg-primary/5 hover:border-primary'
                      : 'border-border bg-card',
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
                  {hasConflict ? (
                    <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                  ) : (
                    isAi && (
                      <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        AI 建议
                      </span>
                    )
                  )}
                </div>
                {hasConflict ? (
                  <p className="mt-1 text-sm text-destructive">
                    {conflictText}
                    {shift !== null
                      ? `建议向后移动 ${shift - (task.start as number)} 分钟。`
                      : '今天已无可用空位，请移回待办池。'}
                  </p>
                ) : task.reason && isAi ? (
                  <p className="mt-1 text-sm text-muted-foreground">理由：{task.reason}</p>
                ) : task.note ? (
                  <p className="mt-1 text-sm text-muted-foreground">{task.note}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-1">
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
          <p className="pl-8 text-sm text-muted-foreground">今日暂无安排，点击「重新生成建议」让 AI 为待办任务排期。</p>
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
            'relative flex items-center justify-center rounded-2xl border-2 border-dashed border-border py-4 text-sm text-muted-foreground transition-colors',
            dragOver === 'end' && 'border-primary bg-primary/5'
          )}
        >
          + 拖拽待办任务到此处，自动排入空闲时段
        </div>
      </div>
    </div>
  );
}
