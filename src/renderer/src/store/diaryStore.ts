import { create } from 'zustand';
import { api } from '../api';
import { DEFAULT_SETTINGS } from '../../../shared/constants';
import type { DiaryEntry, ThemeMode } from '../../../shared/types';

interface DiaryState {
  diaries: DiaryEntry[];
  selectedId: number | null;
  keyword: string;
  filterTag: string | null;
  theme: ThemeMode;
  loaded: boolean;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  select: (id: number | null) => void;
  setKeyword: (keyword: string) => void;
  setFilterTag: (tag: string | null) => void;
  create: () => Promise<number>;
  remove: (id: number) => Promise<void>;
  toggleTheme: () => Promise<void>;
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

  init: async () => {
    const settings = await api.getAllSettings();
    const theme: ThemeMode = settings.theme === 'dark' ? 'dark' : 'light';
    applyTheme(theme);
    set({ theme });
    await get().refresh();
    set({ loaded: true });
  },

  refresh: async () => {
    const { keyword, filterTag } = get();
    const diaries = await api.listDiaries({
      keyword: keyword.trim() || undefined,
      tag: filterTag ?? undefined,
    });
    set({ diaries });
  },

  select: (id) => set({ selectedId: id }),
  setKeyword: (keyword) => set({ keyword }),
  setFilterTag: (tag) => set({ filterTag: tag }),

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

  toggleTheme: async () => {
    const next: ThemeMode = get().theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    set({ theme: next });
    await api.setSetting('theme', next);
  },
}));
