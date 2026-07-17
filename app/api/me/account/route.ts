import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '../../../../lib/api';
import { jsonError, rejectUnsafeMutation } from '../../../../lib/auth/http';
import { RAVEN_BACKEND_TOKEN_COOKIE } from '../../../../lib/auth/raven-backend-token';

export async function DELETE(request: NextRequest) {
  const blocked = rejectUnsafeMutation(request); if (blocked) return blocked;
  const token = request.cookies.get(RAVEN_BACKEND_TOKEN_COOKIE)?.value;
  if (!token) return jsonError(401, 'Please sign in again to delete your account.', 'unauthorized');
  const body = await request.json().catch(() => null);
  if (body?.confirmation !== 'DELETE') return jsonError(400, 'Type DELETE to confirm.', 'invalid_confirmation');
  const upstream = await fetch(`${getApiBase()}/me/account`, { method: 'DELETE', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ confirmation: 'DELETE' }), cache: 'no-store' });
  if (!upstream.ok) return jsonError(upstream.status, 'Your account could not be deleted. Please try again.', 'delete_failed');
  const response = NextResponse.json({ deleted: true });
  response.cookies.delete(RAVEN_BACKEND_TOKEN_COOKIE);
  return response;
}
