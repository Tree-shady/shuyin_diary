import { useCallback, useEffect, useRef, useState } from 'react';
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
  const draftRef = useRef(draft);
  const selectedIdRef = useRef<number | null>(null);
  const prevIdRef = useRef<number | null>(null);
  const closeRetried = useRef(false);

  // 保存并同步状态；防抖、切换 flush、关窗 flush 共用
  const persist = useCallback(
    async (id: number, data: Draft): Promise<void> => {
      setSaving(true);
      try {
        const updated = await api.updateDiary(id, data);
        await refresh();
        const snapshot = JSON.stringify(data);
        const current = JSON.stringify(draftRef.current);
        if (current === snapshot) {
          // 保存期间草稿未再变化：直接对账
          lastSynced.current = snapshot;
          if (selectedIdRef.current === id && updated) {
            setSavedAt(updated.updated_at);
          }
        } else if (
          selectedIdRef.current === id &&
          current === lastSynced.current
        ) {
          // 已切走又切回、且草稿停在旧载入：用已保存内容恢复编辑器
          setDraft(structuredClone(data));
          lastSynced.current = snapshot;
          if (updated) setSavedAt(updated.updated_at);
        }
      } catch (err) {
        console.error('自动保存失败', err);
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  // 保持最新草稿引用，供 persist / flush 读取
  useEffect(() => {
    draftRef.current = draft;
  });

  // 切换选中日记：先把上一篇未保存的修改 flush 落库，再载入新草稿
  useEffect(() => {
    const prevId = prevIdRef.current;
    prevIdRef.current = selectedId;
    selectedIdRef.current = selectedId;

    if (prevId !== null && prevId !== selectedId) {
      const pending = draftRef.current;
      if (JSON.stringify(pending) !== lastSynced.current) {
        void persist(prevId, pending);
      }
    }

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

    const timer = setTimeout(() => void persist(selectedId, draft), 800);
    return () => clearTimeout(timer);
  }, [draft, selectedId, persist]);

  // 关窗兜底：有未保存修改时先落库再放行关闭
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const id = selectedIdRef.current;
      const pending = draftRef.current;
      if (
        id === null ||
        closeRetried.current ||
        JSON.stringify(pending) === lastSynced.current
      ) {
        return;
      }
      e.preventDefault();
      e.returnValue = '';
      void persist(id, pending).finally(() => {
        closeRetried.current = true;
        window.close();
      });
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [persist]);

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
