import { defineMiddleware } from 'astro:middleware';

const PUBLIC_PREFIXES = [
  '/_astro',
  '/fonts',
  '/api',
  '/favicon.ico',
  '/icon.svg',
  '/healthz',
];

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Static assets, public endpoints, and internal files bypass auth guard
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return next();
  }

  const sessionCookie = context.cookies.get('supletivo.admin.session')?.value;
  const isLoginPage = pathname === '/login';

  // Accessing protected admin route without session cookie -> redirect to /login
  if (!sessionCookie && !isLoginPage) {
    return context.redirect('/login', 302);
  }

  // Accessing /login while already authenticated -> redirect to root dashboard
  if (sessionCookie && isLoginPage) {
    return context.redirect('/', 302);
  }

  return next();
});
