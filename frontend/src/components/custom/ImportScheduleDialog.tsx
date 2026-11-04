import { useRef, useState } from 'react';
import { FileUp, Loader2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePlanner } from '@/contexts/PlannerContext';
import { PRIORITY_LABEL, fmt } from '@/lib/planner';
import { CSV_TEMPLATE, ImportResult, parseScheduleText } from '@/lib/scheduleImport';
import { cn } from '@/lib/utils';

interface ImportScheduleDialogProps {
  className?: string;
  label?: string;
}

const FORMAT_LABEL: Record<ImportResult['format'], string> = {
  csv: 'CSV',
  json: 'JSON',
  ics: 'ICS 日历',
  unknown: '未知格式',
};

export default function ImportScheduleDialog({ className, label = '导入时间表' }: ImportScheduleDialogProps) {
  const { importTasks } = usePlanner();
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFileName('');
    setResult(null);
    setParsing(false);
    setDragging(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const readFile = async (file?: File | null) => {
    if (!file) return;
    setParsing(true);
    try {
      const text = await file.text();
      const parsed = parseScheduleText(file.name, text);
      setFileName(file.name);
      setResult(parsed);
      if (parsed.items.length === 0) {
        toast.error(parsed.errors[0] || '未解析到可用任务，请检查文件内容');
      } else if (parsed.skipped > 0) {
        toast.warning(`已解析 ${parsed.items.length} 项，${parsed.skipped} 行无法识别`);
      }
    } catch {
      toast.error('读取文件失败，请重试');
    } finally {
      setParsing(false);
    }
  };

  const confirm = () => {
    if (!result || result.items.length === 0) return;
    importTasks(result.items);
    setOpen(false);
    reset();
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '时间表模板.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
          className || 'border-border bg-card text-foreground hover:border-primary/40 hover:text-primary'
        )}
      >
        <FileUp className="h-4 w-4" />
        {label}
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>导入时间表</DialogTitle>
            <DialogDescription>
              支持 CSV / JSON / ICS 日历文件。导入的任务会直接写入今日行程，未带开始时间的任务进入待办池。
            </DialogDescription>
          </DialogHeader>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              readFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors',
              dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:border-primary/50'
            )}
          >
            {parsing ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <UploadCloud className="h-7 w-7 text-primary" />
            )}
            <p className="text-sm font-semibold">
              {parsing ? '正在解析…' : fileName ? fileName : '点击选择文件，或拖拽到此处'}
            </p>
            <p className="text-xs text-muted-foreground">CSV / JSON / ICS，单个文件不超过 1 MB</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.json,.ics,.ical,text/csv,application/json,text/calendar"
              className="hidden"
              onChange={(e) => readFile(e.target.files?.[0])}
            />
          </div>

          {result && result.errors.length > 0 && (
            <div className="rounded-xl bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {result.errors.map((err) => (
                <p key={err}>{err}</p>
              ))}
            </div>
          )}

          {result && result.items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {FORMAT_LABEL[result.format]} · 可导入 <span className="font-bold text-foreground">{result.items.length}</span> 项
                </span>
                {result.skipped > 0 && <span className="text-amber-600">{result.skipped} 行已跳过</span>}
              </div>
              <div className="max-h-56 space-y-1.5 overflow-auto pr-1">
                {result.items.slice(0, 8).map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="flex items-center gap-3 rounded-xl bg-background px-3 py-2"
                  >
                    <span className="w-12 shrink-0 text-xs font-bold text-primary">
                      {item.start === null ? '待办' : fmt(item.start)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{item.duration} 分钟</span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {PRIORITY_LABEL[item.priority]}
                    </span>
                  </div>
                ))}
                {result.items.length > 8 && (
                  <p className="px-3 text-xs text-muted-foreground">还有 {result.items.length - 8} 项未显示…</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={downloadTemplate}
              className="cursor-pointer text-xs font-semibold text-primary hover:underline"
            >
              下载 CSV 模板
            </button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button onClick={confirm} disabled={!result || result.items.length === 0 || parsing}>
                导入 {result?.items.length ?? 0} 项
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
