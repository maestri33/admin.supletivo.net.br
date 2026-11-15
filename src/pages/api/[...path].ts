import type { APIRoute } from 'astro';

export const prerender = false;

const URL_BACKEND = process.env.URL_BACKEND ?? 'https://backend.supletivo.net.br';

export const ALL: APIRoute = async ({ request, url }) => {
  const targetUrl = new URL(url.pathname + url.search, URL_BACKEND);

  const headers = new Headers();
  for (const [key, val] of request.headers.entries()) {
    const lk = key.toLowerCase();
    if (
      lk === 'content-length' ||
      lk === 'connection' ||
      lk === 'keep-alive' ||
      lk === 'transfer-encoding' ||
      lk === 'upgrade' ||
      lk === 'expect' ||
      lk === 'cf-ray' ||
      lk === 'cf-visitor'
    ) {
      continue;
    }
    headers.set(key, val);
  }
  headers.set('host', targetUrl.host);
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip');
  if (clientIp) {
    headers.set('x-forwarded-for', clientIp);
  }

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const res = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });

    const responseHeaders = new Headers(res.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error(
      `[admin-api-proxy] Error proxying ${request.method} ${url.pathname} to backend:`,
      err?.message
    );
    return new Response(
      JSON.stringify({
        error: 'backend_unavailable',
        message: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '5',
          'Cache-Control': 'no-store',
        },
      }
    );
  }
};
