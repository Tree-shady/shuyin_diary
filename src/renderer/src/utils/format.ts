const pad = (n: number): string => String(n).padStart(2, '0');

/** ISO 时间 -> YYYY-MM-DD HH:mm */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** ISO 时间 -> YYYY-MM-DD */
export function formatDay(iso: string): string {
  return iso.slice(0, 10);
}

/** 截取正文纯文本摘要 */
export function excerpt(content: string, max = 60): string {
  const text = content.replace(/[#>*`\-_~[\]()!]/g, '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
