/** 日记条目（渲染进程可见的明文结构） */
export interface DiaryEntry {
  id: number;
  title: string;
  content: string;
  mood: string | null;
  weather: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

/** 新建/更新日记时的入参 */
export interface DiaryInput {
  title: string;
  content: string;
  mood?: string | null;
  weather?: string | null;
  tags?: string[];
}

/** 日记搜索条件 */
export interface DiaryQuery {
  keyword?: string;
  tag?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export type ThemeMode = 'light' | 'dark';

export interface AppSettings {
  theme: ThemeMode;
  fontSize: number;
}

/** 导出格式 */
export type ExportFormat = 'json' | 'markdown';

export interface ExportResult {
  canceled: boolean;
  filePath?: string;
}
