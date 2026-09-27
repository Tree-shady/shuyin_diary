import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC } from '../shared/constants';
import type {
  DiaryEntry,
  DiaryInput,
  DiaryQuery,
  ExportFormat,
  ExportResult,
  Tag,
} from '../shared/types';

/** 锁定状态（主进程 -> 渲染进程推送） */
export interface LockChangedPayload {
  locked: boolean;
}

/**
 * 通过 contextBridge 暴露给渲染进程的最小化 API。
 * 渲染进程只能调用这些白名单方法，无法直接访问 Node.js / ipcRenderer。
 */
const diaryAPI = {
  listDiaries: (query?: DiaryQuery): Promise<DiaryEntry[]> =>
    ipcRenderer.invoke(IPC.DIARY_LIST, query),
  getDiary: (id: number): Promise<DiaryEntry | null> =>
    ipcRenderer.invoke(IPC.DIARY_GET, id),
  createDiary: (input: DiaryInput): Promise<DiaryEntry> =>
    ipcRenderer.invoke(IPC.DIARY_CREATE, input),
  updateDiary: (id: number, input: DiaryInput): Promise<DiaryEntry | null> =>
    ipcRenderer.invoke(IPC.DIARY_UPDATE, id, input),
  deleteDiary: (id: number): Promise<boolean> =>
    ipcRenderer.invoke(IPC.DIARY_DELETE, id),
  restoreDiary: (id: number): Promise<boolean> =>
    ipcRenderer.invoke(IPC.DIARY_RESTORE, id),
  purgeDiary: (id: number): Promise<boolean> =>
    ipcRenderer.invoke(IPC.DIARY_PURGE, id),
  emptyTrash: (): Promise<number> =>
    ipcRenderer.invoke(IPC.DIARY_EMPTY_TRASH),

  listTags: (): Promise<Tag[]> => ipcRenderer.invoke(IPC.TAG_LIST),
  createTag: (name: string, color?: string): Promise<Tag> =>
    ipcRenderer.invoke(IPC.TAG_CREATE, name, color),
  deleteTag: (id: number): Promise<boolean> =>
    ipcRenderer.invoke(IPC.TAG_DELETE, id),

  getAllSettings: (): Promise<Record<string, string>> =>
    ipcRenderer.invoke(IPC.SETTINGS_GET_ALL),
  setSetting: (key: string, value: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),

  exportDiaries: (format: ExportFormat): Promise<ExportResult> =>
    ipcRenderer.invoke(IPC.EXPORT, format),

  getLockState: (): Promise<{ locked: boolean; hasPin: boolean }> =>
    ipcRenderer.invoke(IPC.LOCK_GET_STATE),
  setPin: (oldPin: string | null, newPin: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.LOCK_SET_PIN, oldPin, newPin),
  removePin: (oldPin: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.LOCK_REMOVE_PIN, oldPin),
  verifyPin: (pin: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.LOCK_VERIFY, pin),
  lockNow: (): Promise<boolean> => ipcRenderer.invoke(IPC.LOCK_LOCK),
  onLockChanged: (
    callback: (state: LockChangedPayload) => void,
  ): (() => void) => {
    const listener = (_event: IpcRendererEvent, state: LockChangedPayload) =>
      callback(state);
    ipcRenderer.on(IPC.LOCK_CHANGED, listener);
    return () => ipcRenderer.removeListener(IPC.LOCK_CHANGED, listener);
  },
};

contextBridge.exposeInMainWorld('diaryAPI', diaryAPI);

export type DiaryAPI = typeof diaryAPI;
