/**
 * Helpers for date-only values (YYYY-MM-DD) that avoid timezone shift when parsing or displaying.
 * Use these for DB date columns and comparisons so the calendar day is preserved.
 */

/**
 * Parse a date-only string (YYYY-MM-DD) or ISO string as a local calendar date.
 * Avoids UTC conversion so "2026-02-17" always means Feb 17 in the user's timezone.
 */
export function parseDateOnly(isoOrYmd: string | undefined | null): Date | null {
  if (isoOrYmd == null || isoOrYmd === '') return null;
  const s = String(isoOrYmd).split('T')[0];
  const [y, m, d] = s.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  return new Date(y, m - 1, d);
}

/**
 * Format a date-only string for display (e.g. "17 Feb, 2026") using local calendar date.
 */
export function formatDateOnly(
  isoOrYmd: string | undefined | null,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  const date = parseDateOnly(isoOrYmd);
  if (!date) return '';
  return date.toLocaleDateString('en-IN', options);
}

/**
 * Return today's date as YYYY-MM-DD in local time (for comparisons with API date strings).
 */
export function todayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Normalize to YYYY-MM-DD. If value is a Date, use local date parts to avoid UTC shift.
 */
export function toDateOnly(value: string | Date | undefined | null): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.split('T')[0];
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).split('T')[0];
}
