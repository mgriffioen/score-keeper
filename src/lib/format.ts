export function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function formatMoney(value: number, currency: string): string {
  const rounded = Math.round(value * 100) / 100;
  const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${currency}${body}`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "3 players · 12 hands" style joins that skip empty pieces. */
export function joinParts(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' · ');
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
