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
