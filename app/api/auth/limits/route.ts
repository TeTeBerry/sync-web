import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '../../../../lib/auth/service';
import {
  ensureCsrfCookie,
  isSecureRequest,
  jsonError,
  rejectUnsafeMutation,
} from '../../../../lib/auth/http';
import { RAVEN_SESSION_COOKIE } from '../../../../lib/auth/sessions';
import {
  consumeAuthUsage,
  type AuthUsageKind,
} from '../../../../lib/auth/usage-limits';

export const runtime = 'nodejs';

const KINDS = new Set<AuthUsageKind>([
  'connection_request',
  'private_profile_view',
]);

/**
 * POST /api/auth/limits
 * Body: { kind: 'connection_request' | 'private_profile_view' }
 * Requires signed-in session + CSRF + same-origin Origin.
 */
export async function POST(request: NextRequest) {
  const blocked = rejectUnsafeMutation(request);
  if (blocked) return blocked;

  const rawToken = request.cookies.get(RAVEN_SESSION_COOKIE)?.value;
  const session = await getSessionFromCookie(rawToken);
  if (!session.signedIn || !session.user) {
    return jsonError(401, 'Sign in required.', 'unauthorized');
  }

  let body: { kind?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError(400, 'Invalid request body.', 'server');
  }

  const kind = body.kind as AuthUsageKind | undefined;
  if (!kind || !KINDS.has(kind)) {
    return jsonError(400, 'Invalid usage kind.', 'server');
  }

  const result = await consumeAuthUsage(session.user.id, kind);
  const secure = isSecureRequest(request);
  const response = NextResponse.json(result, {
    status: result.allowed ? 200 : 429,
  });
  ensureCsrfCookie(request, response, secure);
  return response;
}
