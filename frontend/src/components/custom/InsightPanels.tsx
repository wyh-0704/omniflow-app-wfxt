import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
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
import { BlockedSlot, Prefs, Task, WINDOWS, fmt, newId, parseTime, scheduled } from '@/lib/planner';

interface InsightPanelsProps {
  tasks: Task[];
  blocked: BlockedSlot[];
  prefs: Prefs;
  onBlockedChange: (next: BlockedSlot[]) => void;
}

export default function InsightPanels({ tasks, blocked, prefs, onBlockedChange }: InsightPanelsProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [start, setStart] = useState('12:00');
  const [end, setEnd] = useState('13:00');

  const plan = scheduled(tasks);
  const planned = plan.reduce((sum, t) => sum + t.duration, 0);
  const done = plan.filter((t) => t.done).reduce((sum, t) => sum + t.duration, 0);
  const focus = plan.filter((t) => t.priority === 'high').reduce((sum, t) => sum + t.duration, 0);
  const progress = planned === 0 ? 0 : Math.round((done / planned) * 100);
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
    onBlockedChange([...blocked, { id: newId('blk'), label: label.trim(), start: s, end: en }]);
    toast.success('已添加屏蔽时段，AI 排期时将自动避开');
    setLabel('');
    setOpen(false);
  };

  return (
    <>
      <div id="insights-section" className="scroll-mt-20 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">效率洞察</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">今日专注时长</span>
            <span className="text-sm font-bold">{(focus / 60).toFixed(1)}h</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">已完成 / 计划</span>
            <span className="text-sm font-bold">
              {fmt(done).replace(':', 'h ')}m / {fmt(planned).replace(':', 'h ')}m
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-background">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            💡 <span className="font-medium text-foreground">AI 提示：</span>
            {tip}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">不可用时段</h2>
        <div className="space-y-2">
          {blocked.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-md bg-background p-2">
              <span className="text-xs font-medium">{b.label}</span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {fmt(b.start)} - {fmt(b.end)}
                <button
                  type="button"
                  aria-label={`移除${b.label}`}
                  className="cursor-pointer rounded p-1 hover:bg-border"
                  onClick={() => onBlockedChange(blocked.filter((x) => x.id !== b.id))}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-9 w-full cursor-pointer rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:bg-background"
          >
            + 添加屏蔽时段
          </button>
        </div>
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
    </>
  );
}
