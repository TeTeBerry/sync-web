import type { AuthIntendedAction } from './types';

const INTENDED_ACTIONS = new Set<AuthIntendedAction>([
  'create_squad_profile',
  'edit_squad_profile',
  'send_connection_request',
  'view_sent_requests',
  'view_received_requests',
  'manage_squad_visibility',
  'logout',
]);

/**
 * Only same-origin relative paths are allowed as post-login return URLs.
 * Rejects protocol-relative, absolute, and javascript: URLs.
 */
export function sanitizeReturnUrl(
  raw: string | null | undefined,
  options?: { fallback?: string | null },
): string | null {
  const fallback = options?.fallback ?? null;
  if (raw == null) return fallback;
  const value = raw.trim();
  if (!value) return fallback;

  // Absolute / protocol-relative / dangerous schemes
  if (
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value) ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return fallback;
  }

  if (!value.startsWith('/')) return fallback;
  // Block path traversal tricks that leave the app root oddly
  if (value.includes('/../') || value.endsWith('/..')) return fallback;

  try {
    const url = new URL(value, 'https://raven.local');
    if (url.origin !== 'https://raven.local') return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function parseIntendedAction(
  raw: string | null | undefined,
): AuthIntendedAction | null {
  if (!raw) return null;
  const value = raw.trim() as AuthIntendedAction;
  return INTENDED_ACTIONS.has(value) ? value : null;
}
