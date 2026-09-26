import { useMemo } from 'react';
import { useDiaryStore } from '../store/diaryStore';
import { MOODS } from '../../../shared/constants';
import { excerpt, formatDay } from '../utils/format';

export function Sidebar() {
  const diaries = useDiaryStore((s) => s.diaries);
  const selectedId = useDiaryStore((s) => s.selectedId);
  const keyword = useDiaryStore((s) => s.keyword);
  const filterTag = useDiaryStore((s) => s.filterTag);
  const select = useDiaryStore((s) => s.select);
  const setKeyword = useDiaryStore((s) => s.setKeyword);
  const setFilterTag = useDiaryStore((s) => s.setFilterTag);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of diaries) {
      for (const t of d.tags) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({ name, count }));
  }, [diaries]);

  return (
    <aside className="sidebar">
      <div className="search-box">
        <input
          className="search-input"
          type="search"
          placeholder="🔍 搜索日记内容…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {tagCounts.length > 0 && (
        <div className="tag-filter">
          <button
            className={`tag-chip ${filterTag === null ? 'active' : ''}`}
            onClick={() => setFilterTag(null)}
          >
            全部
          </button>
          {tagCounts.map(({ name, count }) => (
            <button
              key={name}
              className={`tag-chip ${filterTag === name ? 'active' : ''}`}
              onClick={() => setFilterTag(filterTag === name ? null : name)}
            >
              # {name}
              <span className="tag-count">{count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="diary-list">
        {diaries.length === 0 && (
          <div className="list-empty">
            {keyword || filterTag ? '没有符合条件的日记' : '还没有日记，点击「新建」开始吧'}
          </div>
        )}
        {diaries.map((d) => {
          const mood = MOODS.find((m) => m.value === d.mood);
          return (
            <button
              key={d.id}
              className={`diary-item ${selectedId === d.id ? 'active' : ''}`}
              onClick={() => select(d.id)}
            >
              <div className="diary-item-title">
                {mood && <span className="diary-mood">{mood.emoji}</span>}
                {d.title || '无标题'}
              </div>
              <div className="diary-item-excerpt">{excerpt(d.content) || '（暂无正文）'}</div>
              <div className="diary-item-footer">
                <span>{formatDay(d.created_at)}</span>
                {d.tags.length > 0 && (
                  <span className="diary-item-tags">
                    {d.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
