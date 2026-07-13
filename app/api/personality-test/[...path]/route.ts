import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "../../../../lib/api";
import { getClientIp, isSecureRequest } from "../../../../lib/auth/http";
import {
  mintNestAccessToken,
  RAVEN_BACKEND_TOKEN_COOKIE,
  setRavenBackendTokenCookie,
} from "../../../../lib/auth/raven-backend-token";
import { getSessionFromCookie } from "../../../../lib/auth/service";
import { RAVEN_SESSION_COOKIE } from "../../../../lib/auth/sessions";

export const runtime = "nodejs";

async function resolveOptionalToken(
  request: NextRequest,
): Promise<{ token?: string; minted?: string }> {
  const session = await getSessionFromCookie(
    request.cookies.get(RAVEN_SESSION_COOKIE)?.value,
  );
  if (!session.signedIn || !session.user?.email) return {};

  const existing = request.cookies.get(RAVEN_BACKEND_TOKEN_COOKIE)?.value;
  if (existing) return { token: existing };

  const nest = await mintNestAccessToken({
    email: session.user.email,
    clientIp: getClientIp(request),
  });
  if ("error" in nest) return {};
  return { token: nest.token, minted: nest.token };
}

/** Public, same-origin bridge for the web personality test and anonymous lineup matching. */
async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const auth = await resolveOptionalToken(request);
  const { path } = await context.params;
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();
  const upstream = await fetch(
    `${getApiBase()}/personality-test/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`,
    {
      method: request.method,
      headers: {
        ...(auth.token ? { authorization: `Bearer ${auth.token}` } : {}),
        ...(request.headers.get("content-type")
          ? { "content-type": request.headers.get("content-type")! }
          : {}),
      },
      body,
      cache: "no-store",
    },
  );
  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
  if (auth.minted) {
    setRavenBackendTokenCookie(response, auth.minted, isSecureRequest(request));
  }
  return response;
}

export const GET = proxy;
export const POST = proxy;
