const dateFormat = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const dateTimeFormat = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** "Oct 4, 2026" */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** "Oct 4, 2:41 PM" */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** "in 6 days", "in 3 hours", "expired" */
export function formatExpiry(iso: string, now = Date.now()): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return 'expired';
  const hours = Math.round(ms / 3_600_000);
  if (hours < 24) {
    const shown = Math.max(hours, 1);
    return `in ${shown} ${shown === 1 ? 'hour' : 'hours'}`;
  }
  const days = Math.round(hours / 24);
  return `in ${days} ${days === 1 ? 'day' : 'days'}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "13 min ago", "5 h ago", "yesterday", "6 days ago", then a date. */
export function formatRelative(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} h ago`;
  const days = Math.floor(diff / DAY);
  if (days === 1) return 'yesterday';
  if (days <= 30) return `${days} days ago`;
  return formatDate(iso);
}

/** The last `count` calendar days in `timeZone`, oldest first, as YYYY-MM-DD. */
export function lastDays(count: number, timeZone: string, now = Date.now()): string[] {
  // en-CA formats dates as YYYY-MM-DD.
  const format = new Intl.DateTimeFormat('en-CA', { timeZone });
  const days = new Set<string>();
  // Step by hours, not days, so DST changes cannot skip or repeat a date.
  for (let t = now; days.size < count; t -= 60 * 60 * 1000) days.add(format.format(t));
  return [...days].reverse();
}
