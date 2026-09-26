import { api } from '../api';
import { useDiaryStore } from '../store/diaryStore';
import type { ExportFormat } from '../../../shared/types';

export function Toolbar() {
  const theme = useDiaryStore((s) => s.theme);
  const toggleTheme = useDiaryStore((s) => s.toggleTheme);
  const create = useDiaryStore((s) => s.create);
  const remove = useDiaryStore((s) => s.remove);
  const selectedId = useDiaryStore((s) => s.selectedId);

  const handleExport = (format: ExportFormat) => {
    void api.exportDiaries(format);
  };

  const handleDelete = () => {
    if (selectedId === null) return;
    if (window.confirm('确定删除这篇日记吗？此操作不可恢复。')) {
      void remove(selectedId);
    }
  };

  return (
    <header className="toolbar">
      <div className="toolbar-brand">🌙 树影日记</div>
      <div className="toolbar-actions">
        <button className="btn btn-primary" onClick={() => void create()}>
          ＋ 新建
        </button>
        <button className="btn" onClick={() => handleExport('json')}>
          导出 JSON
        </button>
        <button className="btn" onClick={() => handleExport('markdown')}>
          导出 Markdown
        </button>
        <button
          className="btn btn-danger"
          onClick={handleDelete}
          disabled={selectedId === null}
        >
          删除
        </button>
        <button
          className="btn btn-icon"
          onClick={() => void toggleTheme()}
          title="切换明暗主题"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  );
}
