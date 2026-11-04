export type ImportPriority = 'high' | 'medium' | 'low';

export interface ImportedTask {
  title: string;
  priority: ImportPriority;
  duration: number;
  start: number | null;
}

export interface ImportResult {
  format: 'csv' | 'json' | 'ics' | 'unknown';
  items: ImportedTask[];
  skipped: number;
  errors: string[];
}

const TITLE_KEYS = ['title', '标题', '任务', '任务名称', 'summary', 'name', '主题'];
const START_KEYS = ['start', '开始', '开始时间', '开始时刻', 'time', '时间'];
const END_KEYS = ['end', '结束', '结束时间', '结束时刻'];
const DURATION_KEYS = ['duration', '时长', '分钟', 'minutes', 'mins', 'length'];
const PRIORITY_KEYS = ['priority', '优先级', '重要程度'];

const MIN_DURATION = 5;
const MAX_DURATION = 600;
const DEFAULT_DURATION = 30;

const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/[\s_\-()（）]/g, '');

export function parseTimeValue(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;

  const period = /^(凌晨|早上|上午|中午|下午|傍晚|晚上|夜里)/.exec(raw)?.[1];
  const core = period ? raw.slice(period.length).trim() : raw;

  let hour: number | null = null;
  let minute = 0;

  const colon = /(\d{1,2})[:：](\d{2})/.exec(core);
  if (colon) {
    hour = Number(colon[1]);
    minute = Number(colon[2]);
  } else {
    const point = /(\d{1,2})\s*点(?:\s*(\d{1,2})\s*分?)?/.exec(core);
    if (point) {
      hour = Number(point[1]);
      minute = point[2] ? Number(point[2]) : 0;
    } else if (/^\d{3,4}$/.test(core)) {
      hour = Number(core.slice(0, core.length - 2));
      minute = Number(core.slice(-2));
    }
  }

  if (hour === null || hour > 23 || minute > 59) return null;

  if ((period === '下午' || period === '傍晚' || period === '晚上' || period === '夜里') && hour < 12) {
    hour += 12;
  }
  if (period === '中午' && hour < 11) {
    hour += 12;
  }

  return hour * 60 + minute;
}

export function parseDurationValue(value: string): number | null {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  const hours = /(\d+(?:\.\d+)?)\s*(?:h|小时|小時|时)/.exec(raw);
  const mins = /(\d+)\s*(?:m|min|分钟|分)/.exec(raw);
  if (hours || mins) {
    const total = (hours ? Number(hours[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0);
    return total > 0 ? Math.round(total) : null;
  }

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const n = Number(raw);
    return n > 0 ? Math.round(n) : null;
  }
  return null;
}

const parsePriority = (value?: string): ImportPriority => {
  if (!value) return 'medium';
  const raw = value.trim().toLowerCase();
  if (['高', 'high', 'h', '紧急', '重要'].includes(raw)) return 'high';
  if (['低', 'low', 'l', '较低'].includes(raw)) return 'low';
  return 'medium';
};

const buildTask = (input: {
  title?: string;
  start?: string;
  end?: string;
  duration?: string;
  priority?: string;
}): ImportedTask | null => {
  const title = input.title?.trim();
  if (!title) return null;

  const start = input.start ? parseTimeValue(input.start) : null;
  const end = input.end ? parseTimeValue(input.end) : null;

  let duration = input.duration ? parseDurationValue(input.duration) : null;
  if (!duration && start !== null && end !== null && end > start) duration = end - start;

  if (!duration) duration = DEFAULT_DURATION;
  if (duration < MIN_DURATION || duration > MAX_DURATION) return null;
  if (start !== null && start + duration > 1440) return null;

  return {
    title: title.slice(0, 60),
    priority: parsePriority(input.priority),
    duration,
    start,
  };
};

const splitCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.map((cell) => cell.trim());
};

const parseCsv = (text: string): ImportResult => {
  const lines = text.replace(/^\ufeff/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { format: 'csv', items: [], skipped: 0, errors: ['文件为空'] };

  const headerCells = splitCsvLine(lines[0]).map(normalizeKey);
  const hasHeader = headerCells.some((cell) =>
    [...TITLE_KEYS, ...START_KEYS, ...DURATION_KEYS, ...PRIORITY_KEYS].includes(cell)
  );

  const items: ImportedTask[] = [];
  let skipped = 0;

  const rows = hasHeader ? lines.slice(1) : lines;
  const findCol = (keys: string[], exclude: string[] = []) =>
    headerCells.findIndex((cell) => keys.some((k) => cell.includes(k)) && !exclude.some((x) => cell.includes(x)));

  const mapping = hasHeader
    ? {
        title: findCol(TITLE_KEYS),
        start: findCol(START_KEYS, ['结束', 'end']),
        end: findCol(END_KEYS),
        duration: findCol(DURATION_KEYS),
        priority: findCol(PRIORITY_KEYS),
      }
    : { title: 0, start: 1, end: -1, duration: 2, priority: 3 };

  for (const line of rows) {
    const cells = splitCsvLine(line);
    const task = buildTask({
      title: cells[mapping.title],
      start: mapping.start >= 0 ? cells[mapping.start] : undefined,
      end: mapping.end >= 0 ? cells[mapping.end] : undefined,
      duration: mapping.duration >= 0 ? cells[mapping.duration] : undefined,
      priority: mapping.priority >= 0 ? cells[mapping.priority] : undefined,
    });
    if (task) items.push(task);
    else skipped += 1;
  }

  return { format: 'csv', items, skipped, errors: [] };
};

const parseJson = (text: string): ImportResult => {
  try {
    const data = JSON.parse(text);
    const list: unknown = Array.isArray(data)
      ? data
      : (data as { tasks?: unknown; items?: unknown })?.tasks ?? (data as { items?: unknown })?.items;

    if (!Array.isArray(list)) {
      return { format: 'json', items: [], skipped: 0, errors: ['JSON 需要是数组或包含 tasks / items 数组'] };
    }

    const items: ImportedTask[] = [];
    let skipped = 0;
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') {
        skipped += 1;
        continue;
      }
      const row = entry as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined);
      const task = buildTask({
        title: str(row.title ?? row['标题'] ?? row.summary ?? row.name),
        start: str(row.start ?? row['开始时间'] ?? row.time),
        end: str(row.end ?? row['结束时间']),
        duration: str(row.duration ?? row['时长']),
        priority: str(row.priority ?? row['优先级']),
      });
      if (task) items.push(task);
      else skipped += 1;
    }
    return { format: 'json', items, skipped, errors: [] };
  } catch {
    return { format: 'json', items: [], skipped: 0, errors: ['JSON 解析失败，请检查格式'] };
  }
};

const icsMinutes = (value: string): number | null => {
  const match = /(\d{8})T(\d{6})/.exec(value);
  if (!match) return null;
  const hh = Number(match[2].slice(0, 2));
  const mm = Number(match[2].slice(2, 4));
  if (hh > 23 || mm > 59) return null;
  return hh * 60 + mm;
};

const icsDuration = (value: string): number | null => {
  const match = /P(?:T)?(?:(\d+)H)?(?:(\d+)M)?/.exec(value.trim());
  if (!match) return null;
  const hours = match[1] ? Number(match[1]) : 0;
  const mins = match[2] ? Number(match[2]) : 0;
  return hours * 60 + mins || null;
};

const parseIcs = (text: string): ImportResult => {
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  const events = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
  const items: ImportedTask[] = [];
  let skipped = 0;

  for (const block of events) {
    const line = (name: string) => {
      const match = new RegExp(`^${name}[^:\\n]*:([^\\n]*)`, 'm').exec(block);
      return match ? match[1].trim() : undefined;
    };

    const summary = line('SUMMARY')?.replace(/\\,/g, ',').replace(/\\;/g, ';');
    const startRaw = line('DTSTART');
    const endRaw = line('DTEND');
    const durationRaw = line('DURATION');

    if (!summary) {
      skipped += 1;
      continue;
    }

    const start = startRaw ? icsMinutes(startRaw) : null;
    const end = endRaw ? icsMinutes(endRaw) : null;
    const duration = durationRaw ? icsDuration(durationRaw) : null;

    if (start === null) {
      skipped += 1;
      continue;
    }

    const computed = duration ?? (end !== null && end > start ? end - start : DEFAULT_DURATION);
    const startText = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
    const task = buildTask({ title: summary, start: startText, duration: String(computed) });
    if (task) items.push(task);
    else skipped += 1;
  }

  return { format: 'ics', items, skipped, errors: events.length === 0 ? ['未找到 VEVENT 日程'] : [] };
};

export function parseScheduleText(fileName: string, text: string): ImportResult {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.ics') || lower.endsWith('.ical') || text.includes('BEGIN:VCALENDAR')) {
    return parseIcs(text);
  }
  if (lower.endsWith('.json') || text.trim().startsWith('[') || text.trim().startsWith('{')) {
    return parseJson(text);
  }
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    return parseCsv(text);
  }
  return { format: 'unknown', items: [], skipped: 0, errors: ['暂不支持该文件格式，请使用 CSV / JSON / ICS'] };
}

export const CSV_TEMPLATE = '\ufeff标题,开始时间,时长(分钟),优先级\n深度工作,09:00,90,高\n团队会议,14:00,30,中\n回复邮件,16:30,15,低\n';