import { useEffect } from 'react';
import { api } from './api';
import { useDiaryStore } from './store/diaryStore';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { LockScreen } from './components/LockScreen';

/** 回收站模式下编辑区的只读提示 */
function TrashPanel() {
  return (
    <section className="editor editor-empty">
      <div className="empty-illustration">🗑️</div>
      <h2>回收站</h2>
      <p>这里的日记为只读，恢复后可继续编辑。</p>
    </section>
  );
}

export default function App() {
  const init = useDiaryStore((s) => s.init);
  const loaded = useDiaryStore((s) => s.loaded);
  const locked = useDiaryStore((s) => s.locked);
  const trashMode = useDiaryStore((s) => s.trashMode);
  const keyword = useDiaryStore((s) => s.keyword);
  const filterTag = useDiaryStore((s) => s.filterTag);
  const selectedId = useDiaryStore((s) => s.selectedId);
  const refresh = useDiaryStore((s) => s.refresh);

  // 启动：加载设置、锁状态与日记
  useEffect(() => {
    void init();
  }, [init]);

  // 锁定状态变化（主进程空闲自动锁 / 手动锁定推送）
  useEffect(() => {
    const off = api.onLockChanged(() => {
      void useDiaryStore.getState().refreshLockState();
    });
    return off;
  }, []);

  // 窗口聚焦时同步锁状态（防止错过推送）
  useEffect(() => {
    const onFocus = () => {
      void useDiaryStore.getState().refreshLockState();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // 搜索条件变化时防抖刷新（初始化完成且未锁定时）
  useEffect(() => {
    if (!loaded || locked) return;
    const timer = setTimeout(() => {
      void refresh();
    }, 250);
    return () => clearTimeout(timer);
  }, [keyword, filterTag, loaded, locked, refresh]);

  // 未选中日记且列表已有数据时，自动选中第一篇
  useEffect(() => {
    if (!loaded || locked) return;
    const { diaries } = useDiaryStore.getState();
    if (
      selectedId === null &&
      diaries.length > 0 &&
      !keyword &&
      !filterTag &&
      !trashMode
    ) {
      useDiaryStore.getState().select(diaries[0].id);
    }
  }, [loaded, locked, selectedId, keyword, filterTag, trashMode]);

  if (!loaded) {
    return (
      <div className="app-loading">
        <div className="app-loading-emoji">🌙</div>
        <div>正在打开日记本…</div>
      </div>
    );
  }

  if (locked) {
    return <LockScreen />;
  }

  return (
    <div className="app">
      <Toolbar />
      <div className="main">
        <Sidebar />
        {trashMode ? <TrashPanel /> : <Editor />}
      </div>
    </div>
  );
}
