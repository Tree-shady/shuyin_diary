import Database, { type Database as DatabaseType } from 'better-sqlite3';
import type {
  DiaryEntry,
  DiaryInput,
  DiaryQuery,
  Tag,
} from '../shared/types';
import { decrypt, encrypt } from './encryption';
import { toLocalDateKey } from '../shared/datetime';

/** 数据库中的原始行（title/content 为密文） */
interface DiaryRow {
  id: number;
  title: string;
  content: string;
  mood: string | null;
  weather: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

interface SettingRow {
  key: string;
  value: string | null;
}

let db: DatabaseType;

/** 初始化数据库连接并建表 */
export function initDatabase(dbPath: string): void {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS diary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      mood TEXT,
      weather TEXT,
      tags TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tag (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#666666'
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function rowToEntry(row: DiaryRow): DiaryEntry {
  return {
    id: row.id,
    title: decrypt(row.title),
    content: decrypt(row.content),
    mood: row.mood,
    weather: row.weather,
    tags: row.tags ? (JSON.parse(row.tags) as string[]) : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** 将日记里出现的标签同步到 tag 表 */
function upsertTags(tags: string[]): void {
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO tag (name, color) VALUES (?, ?)',
  );
  for (const name of tags) {
    stmt.run(name, '#5b8def');
  }
}

function normalizeTags(tags?: string[] | null): string[] {
  return [...new Set((tags ?? []).map((t) => t.trim()).filter(Boolean))];
}

export function createDiary(input: DiaryInput): DiaryEntry {
  const now = new Date().toISOString();
  const tags = normalizeTags(input.tags);
  const result = db
    .prepare(
      `INSERT INTO diary (title, content, mood, weather, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      encrypt(input.title ?? ''),
      encrypt(input.content ?? ''),
      input.mood ?? null,
      input.weather ?? null,
      JSON.stringify(tags),
      now,
      now,
    );
  upsertTags(tags);
  return getDiary(Number(result.lastInsertRowid)) as DiaryEntry;
}

export function updateDiary(id: number, input: DiaryInput): DiaryEntry | null {
  const existing = db
    .prepare('SELECT id FROM diary WHERE id = ?')
    .get(id) as { id: number } | undefined;
  if (!existing) return null;

  const tags = normalizeTags(input.tags);
  db.prepare(
    `UPDATE diary
       SET title = ?, content = ?, mood = ?, weather = ?, tags = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    encrypt(input.title ?? ''),
    encrypt(input.content ?? ''),
    input.mood ?? null,
    input.weather ?? null,
    JSON.stringify(tags),
    new Date().toISOString(),
    id,
  );
  upsertTags(tags);
  return getDiary(id);
}

export function deleteDiary(id: number): boolean {
  const result = db.prepare('DELETE FROM diary WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getDiary(id: number): DiaryEntry | null {
  const row = db.prepare('SELECT * FROM diary WHERE id = ?').get(id) as
    | DiaryRow
    | undefined;
  return row ? rowToEntry(row) : null;
}

/** 查询日记：全部解密后在内存中按条件过滤（个人日记数据量适用） */
export function listDiaries(query: DiaryQuery = {}): DiaryEntry[] {
  const rows = db
    .prepare('SELECT * FROM diary ORDER BY created_at DESC')
    .all() as DiaryRow[];

  const keyword = query.keyword?.trim().toLowerCase();
  const start = query.startDate;
  const end = query.endDate;

  return rows
    .map(rowToEntry)
    .filter((entry) => {
      if (query.tag && !entry.tags.includes(query.tag)) return false;

      const day = toLocalDateKey(entry.created_at);
      if (start && day < start) return false;
      if (end && day > end) return false;

      if (keyword) {
        const haystack = `${entry.title}\n${entry.content}`.toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    });
}

/* ---------------- 标签 ---------------- */

export function listTags(): Tag[] {
  return db
    .prepare('SELECT id, name, color FROM tag ORDER BY name ASC')
    .all() as Tag[];
}

export function createTag(name: string, color = '#5b8def'): Tag {
  const trimmed = name.trim();
  db.prepare('INSERT OR IGNORE INTO tag (name, color) VALUES (?, ?)').run(
    trimmed,
    color,
  );
  return db.prepare('SELECT id, name, color FROM tag WHERE name = ?').get(
    trimmed,
  ) as Tag;
}

export function deleteTag(id: number): boolean {
  const result = db.prepare('DELETE FROM tag WHERE id = ?').run(id);
  return result.changes > 0;
}

/* ---------------- 设置 ---------------- */

export function getAllSettings(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as
    | SettingRow[];
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.value !== null) result[row.key] = row.value;
  }
  return result;
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value);
}
