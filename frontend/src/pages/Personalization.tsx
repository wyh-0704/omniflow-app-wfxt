import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import OmniflowBadge from '@/components/custom/OmniflowBadge';
import AppNav from '@/components/custom/AppNav';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/use-localStorage';
import { DEFAULT_PREFS, DENSITY_LABELS, ParamMeta, Prefs, WINDOWS, WindowId } from '@/lib/planner';

const RATINGS = [
  { value: 1, emoji: '😞', name: '不满意' },
  { value: 3, emoji: '😐', name: '一般' },
  { value: 4, emoji: '😊', name: '满意' },
  { value: 5, emoji: '🤩', name: '非常满意' },
];
const REMINDERS = ['仅关键任务', '所有任务', '自定义'];
const MAX_FEEDBACK = 300;

const today = () => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};

const windowNames = (ids: WindowId[]) =>
  ids.length === 0 ? '未设置' : WINDOWS.filter((w) => ids.includes(w.id)).map((w) => w.label.split(' ')[0]).join('、');

const metaText = (m: ParamMeta) => `${m.source} · ${m.updatedAt} · ${m.reason}`;

export default function Personalization() {
  const [prefs, setPrefs] = useLocalStorage<Prefs>('zx-prefs', DEFAULT_PREFS);
  const [rating, setRating] = useState<number | null>(prefs.rating);
  const [peak, setPeak] = useState<WindowId[]>(prefs.peak);
  const [density, setDensity] = useState<0 | 1 | 2>(prefs.density);
  const [reminders, setReminders] = useState(prefs.reminders);
  const [feedback, setFeedback] = useState(prefs.feedback);
  const [rawOpen, setRawOpen] = useState(false);

  const togglePeak = (id: WindowId) =>
    setPeak((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const applyDeviation = () => {
    const meta: ParamMeta = { source: '行为分析', updatedAt: today(), reason: '连续 2 周夜间完成大量任务' };
    const next: Prefs = {
      ...prefs,
      peak: ['afternoon', 'night'],
      deviationHandled: true,
      meta: { ...prefs.meta, peak: meta },
    };
    setPrefs(next);
    setPeak(next.peak);
    toast.success('已根据您的新习惯更新高效时段');
  };

  const ignoreDeviation = () => {
    setPrefs({ ...prefs, deviationHandled: true });
    toast('已忽略本次提醒');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === null) {
      toast.error('请先为本月 AI 行程建议评分');
      return;
    }
    if (peak.length === 0) {
      toast.error('请至少选择一个高效时段');
      return;
    }
    const survey = (reason: string): ParamMeta => ({ source: '调研反馈', updatedAt: today(), reason });
    const changed = <T,>(a: T, b: T) => JSON.stringify(a) !== JSON.stringify(b);
    setPrefs({
      ...prefs,
      rating,
      peak,
      density,
      reminders,
      feedback: feedback.trim(),
      meta: {
        peak: changed(peak, prefs.peak) ? survey(`基于 ${today()} 调研反馈调整`) : prefs.meta.peak,
        density: changed(density, prefs.density) ? survey(`基于 ${today()} 调研反馈调整`) : prefs.meta.density,
        reminders: changed(reminders, prefs.reminders)
          ? survey(`基于 ${today()} 调研反馈调整`)
          : prefs.meta.reminders,
      },
    });
    toast.success('感谢反馈！偏好已更新，下次生成行程时立即生效');
  };

  const reset = () => {
    setPrefs(DEFAULT_PREFS);
    setRating(null);
    setPeak(DEFAULT_PREFS.peak);
    setDensity(DEFAULT_PREFS.density);
    setReminders(DEFAULT_PREFS.reminders);
    setFeedback('');
    setRawOpen(false);
    toast.success('个性化数据已重置为默认配置');
  };

  const qCls = 'mb-3 block text-sm font-semibold';
  const params = [
    { name: '高效时段', value: windowNames(prefs.peak), meta: prefs.meta.peak },
    { name: '任务密度', value: DENSITY_LABELS[prefs.density], meta: prefs.meta.density },
    { name: '提醒频率', value: prefs.reminders, meta: prefs.meta.reminders },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            {!prefs.deviationHandled && (
              <div className="rounded-2xl border border-ai/30 bg-ai/5 p-5">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-ai" />
                  <div className="min-w-0">
                    <h3 className="font-bold">发现行为偏差</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      我们注意到您的工作习惯可能已有变化：连续 2 周在夜间完成大量任务，但当前高效时段配置为「{windowNames(prefs.peak)}」。是否更新您的偏好设置？
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" className="rounded-full bg-ai hover:bg-ai/90" onClick={applyDeviation}>
                        立即更新
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={ignoreDeviation}>
                        忽略本次
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={submit} className="space-y-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-bold">9月个性化调研</h2>

              <div>
                <label id="q1" className={qCls}>1. 您对本月 AI 行程建议的整体满意度？</label>
                <div role="radiogroup" aria-labelledby="q1" className="grid grid-cols-4 gap-2 sm:max-w-md">
                  {RATINGS.map((r) => (
                    <label
                      key={r.value}
                      title={r.name}
                      className={cn(
                        'flex min-h-14 cursor-pointer items-center justify-center rounded-xl border border-border bg-background text-2xl transition-all hover:border-primary',
                        rating === r.value && 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      )}
                    >
                      <input
                        type="radio"
                        name="rating"
                        className="sr-only"
                        aria-label={r.name}
                        checked={rating === r.value}
                        onChange={() => setRating(r.value)}
                      />
                      {r.emoji}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label id="q2" className={qCls}>2. 您希望集中处理高强度任务的时段？(多选)</label>
                <div role="group" aria-labelledby="q2" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {WINDOWS.map((w) => (
                    <label
                      key={w.id}
                      className={cn(
                        'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-3 text-sm',
                        peak.includes(w.id) && 'border-primary bg-primary/5'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={peak.includes(w.id)}
                        onChange={() => togglePeak(w.id)}
                      />
                      {w.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label id="q3" className={qCls}>3. 每日任务密度偏好</label>
                <div className="sm:max-w-md">
                  <Slider
                    aria-labelledby="q3"
                    min={0}
                    max={2}
                    step={1}
                    value={[density]}
                    onValueChange={(v) => setDensity(v[0] as 0 | 1 | 2)}
                  />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    {DENSITY_LABELS.map((l, i) => (
                      <span key={l} className={cn(density === i && 'font-bold text-primary')}>{l}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label id="q-rem" className={qCls}>提醒频率偏好</label>
                <div role="radiogroup" aria-labelledby="q-rem" className="flex flex-wrap gap-2">
                  {REMINDERS.map((r) => (
                    <label
                      key={r}
                      className={cn(
                        'flex min-h-10 cursor-pointer items-center rounded-full border border-border bg-background px-4 text-sm',
                        reminders === r && 'border-primary bg-primary/10 text-primary'
                      )}
                    >
                      <input
                        type="radio"
                        name="reminders"
                        className="sr-only"
                        checked={reminders === r}
                        onChange={() => setReminders(r)}
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="feedback" className={qCls}>4. 还有什么我们可以改进的地方？</label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  maxLength={MAX_FEEDBACK}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="例如：希望 AI 能更早提醒我准备会议..."
                  className="min-h-24 rounded-xl bg-background"
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">{feedback.length} / {MAX_FEEDBACK}</p>
              </div>

              <Button type="submit" className="h-11 w-full rounded-xl font-semibold">
                提交反馈并自动调整
              </Button>
            </form>
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold">当前个性化参数</h3>
              <div className="space-y-4">
                {params.map((p) => (
                  <div key={p.name} className="rounded-xl bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{p.name}</span>
                      <span className="text-right text-sm font-bold">{p.value}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{metaText(p.meta)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">手动修改左侧表单并提交即可覆盖自动调整的参数。</p>
              <Button variant="outline" className="mt-4 w-full rounded-xl" onClick={() => setRawOpen(true)}>
                管理所有原始数据
              </Button>
            </div>
          </aside>
        </div>
      </main>

      <Dialog open={rawOpen} onOpenChange={setRawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>原始偏好数据</DialogTitle>
            <DialogDescription>这些数据仅用于个性化行程规划，您可以随时重置。</DialogDescription>
          </DialogHeader>
          <pre className="max-h-72 overflow-auto rounded-xl bg-background p-3 text-xs">{JSON.stringify(prefs, null, 2)}</pre>
          <DialogFooter>
            <Button variant="destructive" onClick={reset}>重置并删除数据</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OmniflowBadge />
      <Toaster />
    </div>
  );
}
