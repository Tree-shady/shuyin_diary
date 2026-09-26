import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/constants';
import type {
  DiaryEntry,
  DiaryInput,
  DiaryQuery,
  ExportFormat,
  ExportResult,
  Tag,
} from '../shared/types';

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
};

contextBridge.exposeInMainWorld('diaryAPI', diaryAPI);

export type DiaryAPI = typeof diaryAPI;
