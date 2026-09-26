import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useDiaryStore } from '../store/diaryStore';
import { MOODS, WEATHERS } from '../../../shared/constants';
import type { DiaryInput } from '../../../shared/types';
import { formatDateTime } from '../utils/format';

/** 编辑器内的草稿：所有字段必填（可选字段以 null/[] 占位） */
type Draft = Required<DiaryInput>;

const EMPTY_DRAFT: Draft = {
  title: '',
  content: '',
  mood: null,
  weather: null,
  tags: [],
};

function EmptyState() {
  const create = useDiaryStore((s) => s.create);
  return (
    <section className="editor editor-empty">
      <div className="empty-illustration">🌙</div>
      <h2>今天想记录点什么？</h2>
      <p>每一篇日记，都是留给未来的自己的礼物。</p>
      <button className="btn btn-primary btn-large" onClick={() => void create()}>
        ＋ 写一篇新日记
      </button>
    </section>
  );
}

export function Editor() {
  const selectedId = useDiaryStore((s) => s.selectedId);
  const entry = useDiaryStore((s) =>
    s.selectedId === null ? null : (s.diaries.find((d) => d.id === s.selectedId) ?? null),
  );
  const refresh = useDiaryStore((s) => s.refresh);

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const lastSynced = useRef('');

  // 切换选中日记时载入草稿（仅在 selectedId 变化时执行）
  useEffect(() => {
    if (entry) {
      const next: Draft = {
        title: entry.title,
        content: entry.content,
        mood: entry.mood,
        weather: entry.weather,
        tags: [...entry.tags],
      };
      setDraft(next);
      lastSynced.current = JSON.stringify(next);
      setSavedAt(entry.updated_at);
    } else {
      setDraft(EMPTY_DRAFT);
      lastSynced.current = JSON.stringify(EMPTY_DRAFT);
      setSavedAt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // 自动保存：内容变化后防抖 800ms
  useEffect(() => {
    if (selectedId === null) return;
    if (JSON.stringify(draft) === lastSynced.current) return;

    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        const updated = await api.updateDiary(selectedId, draft);
        lastSynced.current = JSON.stringify(draft);
        if (updated) setSavedAt(updated.updated_at);
        await refresh();
      } finally {
        setSaving(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [draft, selectedId, refresh]);

  if (selectedId === null) return <EmptyState />;

  const patch = (p: Partial<DiaryInput>) => setDraft((d) => ({ ...d, ...p }));

  const addTag = () => {
    const name = tagInput.trim();
    if (name && !draft.tags.includes(name)) {
      patch({ tags: [...draft.tags, name] });
    }
    setTagInput('');
  };

  const removeTag = (name: string) =>
    patch({ tags: draft.tags.filter((t) => t !== name) });

  return (
    <section className="editor">
      <div className="editor-toolbar">
        <div className="picker-group">
          <span className="picker-label">心情</span>
          {MOODS.map((m) => (
            <button
              key={m.value}
              className={`picker-btn ${draft.mood === m.value ? 'active' : ''}`}
              title={m.label}
              onClick={() => patch({ mood: draft.mood === m.value ? null : m.value })}
            >
              {m.emoji}
            </button>
          ))}
        </div>
        <div className="picker-group">
          <span className="picker-label">天气</span>
          {WEATHERS.map((w) => (
            <button
              key={w.value}
              className={`picker-btn ${draft.weather === w.value ? 'active' : ''}`}
              title={w.label}
              onClick={() =>
                patch({ weather: draft.weather === w.value ? null : w.value })
              }
            >
              {w.emoji}
            </button>
          ))}
        </div>
        <span className={`save-status ${saving ? 'saving' : ''}`}>
          {saving ? '保存中…' : savedAt ? `已保存 ${formatDateTime(savedAt)}` : ''}
        </span>
      </div>

      <input
        className="title-input"
        type="text"
        placeholder="标题…"
        value={draft.title}
        onChange={(e) => patch({ title: e.target.value })}
      />

      <div className="tag-row">
        {draft.tags.map((name) => (
          <span key={name} className="tag-chip editable">
            # {name}
            <button
              className="tag-remove"
              onClick={() => removeTag(name)}
              title="移除标签"
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="tag-input"
          type="text"
          placeholder="添加标签后回车"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
        />
      </div>

      <textarea
        className="content-input"
        placeholder="今天发生了什么？支持 Markdown 语法…"
        value={draft.content}
        onChange={(e) => patch({ content: e.target.value })}
      />
    </section>
  );
}
