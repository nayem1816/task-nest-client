const formatters = new Map<string, Intl.NumberFormat>();

/** 6150, "USD" → "$61.50". Amounts are always integer minor units (cents). */
export function formatMoney(cents: number, currency = 'USD'): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
    formatters.set(currency, formatter);
  }
  return formatter.format(cents / 100);
}

/** "61.50" → 6150. Returns null for anything that is not a non-negative amount. */
export function parseMoney(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
