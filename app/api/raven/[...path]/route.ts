import { getApiBase } from '../../../../lib/api';

type RavenProxyContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyRavenRequest(request: Request, context: RavenProxyContext) {
  const { path } = await context.params;
  const upstreamPath = path.map(encodeURIComponent).join('/');
  const incomingUrl = new URL(request.url);
  const upstreamUrl = `${getApiBase()}/raven/${upstreamPath}${incomingUrl.search}`;
  const method = request.method;
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.text();

  const response = await fetch(upstreamUrl, {
    method,
    headers: request.headers.has('content-type')
      ? { 'Content-Type': request.headers.get('content-type')! }
      : undefined,
    body,
    cache: 'no-store',
  });

  const headers = new Headers();
  const contentType = response.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  headers.set('cache-control', 'no-store');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const GET = proxyRavenRequest;
export const POST = proxyRavenRequest;
