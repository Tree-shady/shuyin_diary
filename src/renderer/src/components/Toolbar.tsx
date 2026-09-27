import { useState } from 'react';
import { api } from '../api';
import { useDiaryStore } from '../store/diaryStore';
import { SettingsModal } from './SettingsModal';
import type { ExportFormat } from '../../../shared/types';

export function Toolbar() {
  const theme = useDiaryStore((s) => s.theme);
  const toggleTheme = useDiaryStore((s) => s.toggleTheme);
  const create = useDiaryStore((s) => s.create);
  const remove = useDiaryStore((s) => s.remove);
  const selectedId = useDiaryStore((s) => s.selectedId);
  const hasPin = useDiaryStore((s) => s.hasPin);
  const trashMode = useDiaryStore((s) => s.trashMode);
  const lockNow = useDiaryStore((s) => s.lockNow);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleExport = (format: ExportFormat) => {
    void api.exportDiaries(format);
  };

  const handleDelete = () => {
    if (selectedId === null) return;
    if (window.confirm('确定删除这篇日记吗？将移入回收站，可在回收站恢复。')) {
      void remove(selectedId);
    }
  };

  return (
    <header className="toolbar">
      <div className="toolbar-brand">🌙 树影日记</div>
      <div className="toolbar-actions">
        <button
          className="btn btn-primary"
          onClick={() => void create()}
          disabled={trashMode}
        >
          ＋ 新建
        </button>
        <button
          className="btn"
          onClick={() => handleExport('json')}
          disabled={trashMode}
        >
          导出 JSON
        </button>
        <button
          className="btn"
          onClick={() => handleExport('markdown')}
          disabled={trashMode}
        >
          导出 Markdown
        </button>
        <button
          className="btn btn-danger"
          onClick={handleDelete}
          disabled={selectedId === null || trashMode}
        >
          删除
        </button>
        <button
          className="btn btn-icon"
          onClick={() => void lockNow()}
          disabled={!hasPin}
          title="立即锁定"
        >
          🔒
        </button>
        <button
          className="btn btn-icon"
          onClick={() => setSettingsOpen(true)}
          title="设置"
        >
          ⚙️
        </button>
        <button
          className="btn btn-icon"
          onClick={() => void toggleTheme()}
          title="切换明暗主题"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </header>
  );
}
