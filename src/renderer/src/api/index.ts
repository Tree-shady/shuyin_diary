import type {
  DiaryEntry,
  DiaryInput,
  DiaryQuery,
  ExportFormat,
  ExportResult,
  Tag,
} from '../../../shared/types';

/** 与 preload 暴露的 window.diaryAPI 保持一致的接口声明 */
export interface DiaryAPI {
  listDiaries(query?: DiaryQuery): Promise<DiaryEntry[]>;
  getDiary(id: number): Promise<DiaryEntry | null>;
  createDiary(input: DiaryInput): Promise<DiaryEntry>;
  updateDiary(id: number, input: DiaryInput): Promise<DiaryEntry | null>;
  deleteDiary(id: number): Promise<boolean>;
  restoreDiary(id: number): Promise<boolean>;
  purgeDiary(id: number): Promise<boolean>;
  emptyTrash(): Promise<number>;
  listTags(): Promise<Tag[]>;
  createTag(name: string, color?: string): Promise<Tag>;
  deleteTag(id: number): Promise<boolean>;
  getAllSettings(): Promise<Record<string, string>>;
  setSetting(key: string, value: string): Promise<boolean>;
  exportDiaries(format: ExportFormat): Promise<ExportResult>;
  getLockState(): Promise<{ locked: boolean; hasPin: boolean }>;
  setPin(oldPin: string | null, newPin: string): Promise<boolean>;
  removePin(oldPin: string): Promise<boolean>;
  verifyPin(pin: string): Promise<boolean>;
  lockNow(): Promise<boolean>;
  onLockChanged(callback: (state: { locked: boolean }) => void): () => void;
}

declare global {
  interface Window {
    diaryAPI: DiaryAPI;
  }
}

export const api: DiaryAPI = window.diaryAPI;
