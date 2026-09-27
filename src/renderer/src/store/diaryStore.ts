import { create } from 'zustand';
import { api } from '../api';
import { DEFAULT_SETTINGS } from '../../../shared/constants';
import type { DiaryEntry, ThemeMode } from '../../../shared/types';

/** 编辑器注册的紧急 flush（锁定前保存未落库的修改） */
let editorFlush: (() => Promise<void>) | null = null;

interface DiaryState {
  diaries: DiaryEntry[];
  selectedId: number | null;
  keyword: string;
  filterTag: string | null;
  theme: ThemeMode;
  loaded: boolean;
  locked: boolean;
  hasPin: boolean;
  trashMode: boolean;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshLockState: () => Promise<void>;
  select: (id: number | null) => void;
  setKeyword: (keyword: string) => void;
  setFilterTag: (tag: string | null) => void;
  setTrashMode: (mode: boolean) => void;
  create: () => Promise<number>;
  remove: (id: number) => Promise<void>;
  restore: (id: number) => Promise<void>;
  purge: (id: number) => Promise<void>;
  emptyTrash: () => Promise<void>;
  toggleTheme: () => Promise<void>;
  lockNow: () => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  registerFlush: (fn: (() => Promise<void>) | null) => void;
}

function applyTheme(theme: ThemeMode): void {
  document.documentElement.dataset.theme = theme;
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  diaries: [],
  selectedId: null,
  keyword: '',
  filterTag: null,
  theme: DEFAULT_SETTINGS.theme,
  loaded: false,
  locked: false,
  hasPin: false,
  trashMode: false,

  init: async () => {
    const settings = await api.getAllSettings();
    const theme: ThemeMode = settings.theme === 'dark' ? 'dark' : 'light';
    applyTheme(theme);
    const lockState = await api.getLockState();
    set({ theme, locked: lockState.locked, hasPin: lockState.hasPin });
    if (lockState.locked) {
      // 锁定时不拉取日记数据（主进程也会拒绝）
      set({ diaries: [], selectedId: null, loaded: true });
      return;
    }
    await get().refresh();
    set({ loaded: true });
  },

  refresh: async () => {
    const { keyword, filterTag, trashMode } = get();
    const diaries = await api.listDiaries({
      keyword: keyword.trim() || undefined,
      tag: filterTag ?? undefined,
      trash: trashMode || undefined,
    });
    set({ diaries });
  },

  refreshLockState: async () => {
    const state = await api.getLockState();
    set({ locked: state.locked, hasPin: state.hasPin });
    if (state.locked) {
      set({ diaries: [], selectedId: null });
    }
  },

  select: (id) => set({ selectedId: id }),
  setKeyword: (keyword) => set({ keyword }),
  setFilterTag: (tag) => set({ filterTag: tag }),

  setTrashMode: (mode) => {
    if (get().trashMode === mode) return;
    set({ trashMode: mode, selectedId: null, filterTag: null });
    void get().refresh();
  },

  create: async () => {
    const entry = await api.createDiary({ title: '', content: '' });
    await get().refresh();
    set({ selectedId: entry.id, keyword: '', filterTag: null });
    return entry.id;
  },

  remove: async (id) => {
    await api.deleteDiary(id);
    if (get().selectedId === id) set({ selectedId: null });
    await get().refresh();
  },

  restore: async (id) => {
    await api.restoreDiary(id);
    // 恢复后回到日记视图并选中该篇（清空过滤以免它被筛掉）
    set({ trashMode: false, selectedId: id, keyword: '', filterTag: null });
    await get().refresh();
  },

  purge: async (id) => {
    await api.purgeDiary(id);
    if (get().selectedId === id) set({ selectedId: null });
    await get().refresh();
  },

  emptyTrash: async () => {
    await api.emptyTrash();
    set({ selectedId: null });
    await get().refresh();
  },

  toggleTheme: async () => {
    const next: ThemeMode = get().theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    set({ theme: next });
    await api.setSetting('theme', next);
  },

  lockNow: async () => {
    try {
      await editorFlush?.();
    } catch {
      // flush 失败不阻塞锁定
    }
    await api.lockNow();
    set({ locked: true, diaries: [], selectedId: null, trashMode: false });
  },

  unlock: async (pin) => {
    const ok = await api.verifyPin(pin);
    if (!ok) return false;
    set({ locked: false });
    await get().refresh();
    return true;
  },

  registerFlush: (fn) => {
    editorFlush = fn;
  },
}));
