import { useEffect } from 'react';
import { useDiaryStore } from './store/diaryStore';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';

export default function App() {
  const init = useDiaryStore((s) => s.init);
  const loaded = useDiaryStore((s) => s.loaded);
  const keyword = useDiaryStore((s) => s.keyword);
  const filterTag = useDiaryStore((s) => s.filterTag);
  const selectedId = useDiaryStore((s) => s.selectedId);
  const refresh = useDiaryStore((s) => s.refresh);

  // 启动：加载设置与日记
  useEffect(() => {
    void init();
  }, [init]);

  // 搜索条件变化时防抖刷新（初始化完成后）
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      void refresh();
    }, 250);
    return () => clearTimeout(timer);
  }, [keyword, filterTag, loaded, refresh]);

  // 未选中日记且列表已有数据时，自动选中第一篇
  useEffect(() => {
    if (!loaded) return;
    const { diaries } = useDiaryStore.getState();
    if (selectedId === null && diaries.length > 0 && !keyword && !filterTag) {
      useDiaryStore.getState().select(diaries[0].id);
    }
  }, [loaded, selectedId, keyword, filterTag]);

  if (!loaded) {
    return (
      <div className="app-loading">
        <div className="app-loading-emoji">🌙</div>
        <div>正在打开日记本…</div>
      </div>
    );
  }

  return (
    <div className="app">
      <Toolbar />
      <div className="main">
        <Sidebar />
        <Editor />
      </div>
    </div>
  );
}
