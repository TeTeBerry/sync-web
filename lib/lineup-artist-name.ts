import type { ScheduleDj, SchedulePerformance } from './api';

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isInternalArtistId(value?: string): boolean {
  if (!value?.trim()) return false;
  const slug = slugify(value);
  return /^(?:[a-z0-9]+-)*(?:\d+|[a-z]{3}\d{2})-[a-z0-9-]+$/.test(slug);
}

/** Removes activity/date prefixes from ids such as tml-2650345444-artist-name. */
function comparableKey(value: string): string {
  const slug = slugify(value);
  const parts = slug.split('-');
  const prefixPart = parts.findIndex(
    (part) => /^\d+$/.test(part) || /^[a-z]{3}\d{2}$/.test(part),
  );
  return prefixPart >= 0 ? parts.slice(prefixPart + 1).join('-') : slug;
}

function humanizeId(value: string): string | undefined {
  const key = comparableKey(value);
  if (!key || !/[a-z]/.test(key)) return undefined;
  return key
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/\bAnd\b/g, '&');
}

export function buildLineupArtistNameResolver(
  djs: ScheduleDj[],
  performances: SchedulePerformance[],
  fallbackName: string,
): (artistId: string) => string {
  const names = new Map<string, string>();

  function add(id: string | undefined, name: string | undefined) {
    if (!id || !name?.trim() || isInternalArtistId(name)) return;
    names.set(id, name.trim());
    names.set(comparableKey(id), name.trim());
    names.set(slugify(name), name.trim());
  }

  for (const artist of djs) add(artist.id, artist.name);
  for (const performance of performances) {
    add(performance.artistId, performance.artistName);
  }

  return (artistId: string) =>
    names.get(artistId) ??
    names.get(comparableKey(artistId)) ??
    humanizeId(artistId) ??
    fallbackName;
}
