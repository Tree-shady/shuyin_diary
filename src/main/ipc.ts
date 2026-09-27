import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'node:fs';
import { IPC, MOODS, WEATHERS } from '../shared/constants';
import type {
  DiaryEntry,
  DiaryInput,
  DiaryQuery,
  ExportFormat,
  ExportResult,
} from '../shared/types';
import * as db from './database';
import { toLocalDateKey } from '../shared/datetime';

function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new Error('参数必须是对象');
  }
  return value as Record<string, unknown>;
}

function parseDiaryInput(value: unknown): DiaryInput {
  const obj = requireObject(value);
  return {
    title: typeof obj.title === 'string' ? obj.title : '',
    content: typeof obj.content === 'string' ? obj.content : '',
    mood: typeof obj.mood === 'string' ? obj.mood : null,
    weather: typeof obj.weather === 'string' ? obj.weather : null,
    tags: Array.isArray(obj.tags)
      ? (obj.tags.filter((t) => typeof t === 'string') as string[])
      : [],
  };
}

function parseQuery(value: unknown): DiaryQuery {
  if (value === undefined || value === null) return {};
  const obj = requireObject(value);
  const query: DiaryQuery = {};
  if (typeof obj.keyword === 'string') query.keyword = obj.keyword;
  if (typeof obj.tag === 'string') query.tag = obj.tag;
  if (typeof obj.startDate === 'string') query.startDate = obj.startDate;
  if (typeof obj.endDate === 'string') query.endDate = obj.endDate;
  return query;
}

const moodLabel = (value: string | null): string =>
  MOODS.find((m) => m.value === value)?.label ?? value ?? '';
const weatherLabel = (value: string | null): string =>
  WEATHERS.find((w) => w.value === value)?.label ?? value ?? '';

function entriesToMarkdown(entries: DiaryEntry[]): string {
  return entries
    .map((e) => {
      const lines: string[] = [];
      lines.push(`# ${e.title || '无标题'}`);
      lines.push('');
      const meta: string[] = [`日期: ${new Date(e.created_at).toLocaleString()}`];
      if (e.mood) meta.push(`心情: ${moodLabel(e.mood)}`);
      if (e.weather) meta.push(`天气: ${weatherLabel(e.weather)}`);
      if (e.tags.length) meta.push(`标签: ${e.tags.map((t) => `#${t}`).join(' ')}`);
      lines.push(`> ${meta.join(' ｜ ')}`);
      lines.push('');
      lines.push(e.content);
      lines.push('');
      lines.push('---');
      return lines.join('\n');
    })
    .join('\n\n');
}

/** 注册全部 IPC 处理器（app ready 后调用） */
export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.DIARY_LIST, (_event, query?: unknown) =>
    db.listDiaries(parseQuery(query)),
  );

  ipcMain.handle(IPC.DIARY_GET, (_event, id: unknown) => {
    if (typeof id !== 'number') throw new Error('id 必须是数字');
    return db.getDiary(id);
  });

  ipcMain.handle(IPC.DIARY_CREATE, (_event, input: unknown) =>
    db.createDiary(parseDiaryInput(input)),
  );

  ipcMain.handle(IPC.DIARY_UPDATE, (_event, id: unknown, input: unknown) => {
    if (typeof id !== 'number') throw new Error('id 必须是数字');
    return db.updateDiary(id, parseDiaryInput(input));
  });

  ipcMain.handle(IPC.DIARY_DELETE, (_event, id: unknown) => {
    if (typeof id !== 'number') throw new Error('id 必须是数字');
    return db.deleteDiary(id);
  });

  ipcMain.handle(IPC.TAG_LIST, () => db.listTags());

  ipcMain.handle(IPC.TAG_CREATE, (_event, name: unknown, color?: unknown) => {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('标签名不合法');
    }
    return db.createTag(name, typeof color === 'string' ? color : undefined);
  });

  ipcMain.handle(IPC.TAG_DELETE, (_event, id: unknown) => {
    if (typeof id !== 'number') throw new Error('id 必须是数字');
    return db.deleteTag(id);
  });

  ipcMain.handle(IPC.SETTINGS_GET_ALL, () => db.getAllSettings());

  ipcMain.handle(IPC.SETTINGS_SET, (_event, key: unknown, value: unknown) => {
    if (typeof key !== 'string' || typeof value !== 'string') {
      throw new Error('设置项 key/value 必须是字符串');
    }
    db.setSetting(key, value);
    return true;
  });

  ipcMain.handle(
    IPC.EXPORT,
    async (event, format: unknown): Promise<ExportResult> => {
      const fmt: ExportFormat = format === 'markdown' ? 'markdown' : 'json';
      const ext = fmt === 'json' ? 'json' : 'md';
      const win = BrowserWindow.fromWebContents(event.sender);
      const saveOptions = {
        title: '导出日记',
        defaultPath: `diary-${toLocalDateKey(new Date().toISOString())}.${ext}`,
        filters: [
          {
            name: fmt === 'json' ? 'JSON 文件' : 'Markdown 文件',
            extensions: [ext],
          },
        ],
      };
      const result = win
        ? await dialog.showSaveDialog(win, saveOptions)
        : await dialog.showSaveDialog(saveOptions);
      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }
      const entries = db.listDiaries();
      const content =
        fmt === 'json'
          ? JSON.stringify(entries, null, 2)
          : entriesToMarkdown(entries);
      fs.writeFileSync(result.filePath, content, 'utf8');
      return { canceled: false, filePath: result.filePath };
    },
  );
}
