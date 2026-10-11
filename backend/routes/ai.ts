import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createAIService } from '../services/aiService';
import type { ScheduleItem } from '../../shared/types/api';

const router = Router();

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

const scheduleSchema = z.object({
  date: z.string().min(1).max(40),
  tasks: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        title: z.string().min(1).max(120),
        priority: z.enum(['high', 'medium', 'low']),
        duration: z.number().int().min(5).max(600),
      })
    )
    .min(1)
    .max(30),
  busy: z
    .array(
      z.object({
        label: z.string().max(120),
        start: z.string().regex(timeRe),
        end: z.string().regex(timeRe),
      })
    )
    .max(40),
  peakWindows: z.array(z.string().max(60)).max(6),
  density: z.enum(['relaxed', 'moderate', 'compact']),
});

function extractItems(raw: string): ScheduleItem[] {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    const items: ScheduleItem[] = [];
    for (const entry of parsed) {
      if (
        entry &&
        typeof entry.id === 'string' &&
        typeof entry.start === 'string' &&
        timeRe.test(entry.start)
      ) {
        items.push({
          id: entry.id,
          start: entry.start,
          reason: typeof entry.reason === 'string' ? entry.reason.slice(0, 200) : '',
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

router.post('/schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid schedule request' });
      return;
    }
    const input = parsed.data;

    const systemPrompt =
      '你是一个日程规划助手。只输出 JSON 数组，不要输出任何其他文字或 Markdown。' +
      '数组中每个元素格式为 {"id":"任务id","start":"HH:MM","reason":"一句话中文理由"}。' +
      '规则：所有安排必须在 06:00-23:00 之间；任务时间块之间不得重叠，也不得与 busy 时段重叠；' +
      '高优先级任务优先安排在 peakWindows 指定的高效时段；每个任务按其 duration 分钟占用时间；' +
      '开始时间为 5 分钟的倍数；每个输入任务都必须出现一次。';

    const message = JSON.stringify({
      date: input.date,
      tasks: input.tasks,
      busy: input.busy,
      peakWindows: input.peakWindows,
      density: input.density,
    });

    const aiService = createAIService();
    const appLink =
      req.get('Referer') || req.get('Origin') || `${req.protocol}://${req.get('host')}`;
    const answer = await aiService.chat(message, systemPrompt, appLink);
    const items = extractItems(answer);

    if (items.length === 0) {
      res.status(502).json({ success: false, error: 'AI returned no usable schedule' });
      return;
    }

    res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
});

export default router;
