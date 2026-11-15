import { defineMiddleware } from 'astro:middleware';

const PUBLIC_PREFIXES = [
  '/_astro',
  '/fonts',
  '/api',
  '/favicon.ico',
  '/icon.svg',
  '/healthz',
];

export function isValidAdminJwtCookie(sessionCookie?: string | null): boolean {
  if (!sessionCookie || typeof sessionCookie !== 'string') return false;
  const parts = sessionCookie.split('.');
  if (parts.length !== 3 || parts.some((p) => !p)) return false;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf-8');
    const payload = JSON.parse(json) as { exp?: number };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const sessionCookie = context.cookies.get('supletivo.admin.session')?.value;
  const hasValidSession = isValidAdminJwtCookie(sessionCookie);
  const isLoginPage = pathname === '/login';

  // Accessing protected admin route without valid JWT session cookie -> redirect to /login
  if (!isPublic) {
    if (!hasValidSession && !isLoginPage) {
      return context.redirect('/login', 302);
    }

    // Accessing /login while already authenticated -> redirect to root dashboard
    if (hasValidSession && isLoginPage) {
      return context.redirect('/', 302);
    }
  }

  const response = await next();
  const headers = response.headers;

  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
});
