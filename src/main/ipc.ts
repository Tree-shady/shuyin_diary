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
import * as lock from './lock';
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

/** 锁定守卫：锁定期间拒绝敏感通道，渲染端只会看到错误 */
function withLockGuard(
  handler: (...args: unknown[]) => unknown,
): (...args: unknown[]) => unknown {
  return (...args: unknown[]): unknown => {
    if (lock.isLocked()) throw new Error('应用已锁定');
    return handler(...args);
  };
}

/** 注册全部 IPC 处理器（app ready 后调用） */
export function registerIpcHandlers(): void {
  ipcMain.handle(
    IPC.DIARY_LIST,
    withLockGuard((_event, query?: unknown) => db.listDiaries(parseQuery(query))),
  );

  ipcMain.handle(
    IPC.DIARY_GET,
    withLockGuard((_event, id: unknown) => {
      if (typeof id !== 'number') throw new Error('id 必须是数字');
      return db.getDiary(id);
    }),
  );

  ipcMain.handle(
    IPC.DIARY_CREATE,
    withLockGuard((_event, input: unknown) =>
      db.createDiary(parseDiaryInput(input)),
    ),
  );

  ipcMain.handle(
    IPC.DIARY_UPDATE,
    withLockGuard((_event, id: unknown, input: unknown) => {
      if (typeof id !== 'number') throw new Error('id 必须是数字');
      return db.updateDiary(id, parseDiaryInput(input));
    }),
  );

  ipcMain.handle(
    IPC.DIARY_DELETE,
    withLockGuard((_event, id: unknown) => {
      if (typeof id !== 'number') throw new Error('id 必须是数字');
      return db.deleteDiary(id);
    }),
  );

  ipcMain.handle(
    IPC.DIARY_RESTORE,
    withLockGuard((_event, id: unknown) => {
      if (typeof id !== 'number') throw new Error('id 必须是数字');
      return db.restoreDiary(id);
    }),
  );

  ipcMain.handle(
    IPC.DIARY_PURGE,
    withLockGuard((_event, id: unknown) => {
      if (typeof id !== 'number') throw new Error('id 必须是数字');
      return db.purgeDiary(id);
    }),
  );

  ipcMain.handle(IPC.DIARY_EMPTY_TRASH, withLockGuard(() => db.emptyTrash()));

  ipcMain.handle(IPC.TAG_LIST, withLockGuard(() => db.listTags()));

  ipcMain.handle(
    IPC.TAG_CREATE,
    withLockGuard((_event, name: unknown, color?: unknown) => {
      if (typeof name !== 'string' || !name.trim()) {
        throw new Error('标签名不合法');
      }
      return db.createTag(name, typeof color === 'string' ? color : undefined);
    }),
  );

  ipcMain.handle(
    IPC.TAG_DELETE,
    withLockGuard((_event, id: unknown) => {
      if (typeof id !== 'number') throw new Error('id 必须是数字');
      return db.deleteTag(id);
    }),
  );

  ipcMain.handle(IPC.SETTINGS_GET_ALL, () => db.getAllSettings());

  ipcMain.handle(
    IPC.SETTINGS_SET,
    withLockGuard((_event, key: unknown, value: unknown) => {
      if (typeof key !== 'string' || typeof value !== 'string') {
        throw new Error('设置项 key/value 必须是字符串');
      }
      db.setSetting(key, value);
      return true;
    }),
  );

  ipcMain.handle(
    IPC.EXPORT,
    withLockGuard(
      async (event, format: unknown): Promise<ExportResult> => {
        const fmt: ExportFormat = format === 'markdown' ? 'markdown' : 'json';
        const ext = fmt === 'json' ? 'json' : 'md';
        const win = BrowserWindow.fromWebContents(
          (event as Electron.IpcMainInvokeEvent).sender,
        );
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
        await fs.promises.writeFile(result.filePath, content, 'utf8');
        return { canceled: false, filePath: result.filePath };
      },
    ),
  );

  /* ---------------- 锁屏 ---------------- */

  ipcMain.handle(IPC.LOCK_GET_STATE, () => lock.getState());

  ipcMain.handle(
    IPC.LOCK_SET_PIN,
    (_event, oldPin: unknown, newPin: unknown) => {
      if (oldPin !== null && typeof oldPin !== 'string') {
        throw new Error('参数不合法');
      }
      if (typeof newPin !== 'string' || newPin.length < 4) {
        throw new Error('新密码至少 4 位');
      }
      if (newPin.length > 64) throw new Error('密码过长');
      lock.setPin(oldPin, newPin);
      return true;
    },
  );

  ipcMain.handle(IPC.LOCK_REMOVE_PIN, (_event, oldPin: unknown) => {
    if (typeof oldPin !== 'string') throw new Error('参数不合法');
    lock.removePin(oldPin);
    return true;
  });

  ipcMain.handle(IPC.LOCK_VERIFY, (_event, pin: unknown) => {
    if (typeof pin !== 'string') throw new Error('参数不合法');
    return lock.verifyPin(pin);
  });

  ipcMain.handle(IPC.LOCK_LOCK, () => {
    lock.lockNow();
    return true;
  });
}
