/** 时间工具：主进程与渲染进程共用 */

/** ISO 时间 -> 本地时区日期键 YYYY-MM-DD（避免直接截断 UTC 字符串导致跨时区日期偏差） */
export function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  // 无效输入返回空串而非 'NaN-NaN-NaN'；不抛错以免单条脏数据中断 listDiaries 全量查询
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
