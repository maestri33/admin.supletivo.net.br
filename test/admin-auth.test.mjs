import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const PUBLIC_PREFIXES = [
  '/_astro',
  '/fonts',
  '/api',
  '/favicon.ico',
  '/icon.svg',
  '/healthz',
];

function shouldBypassAuth(pathname) {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function resolveRedirect(pathname, sessionCookie) {
  if (shouldBypassAuth(pathname)) {
    return null; // pass through
  }

  const isLoginPage = pathname === '/login';

  if (!sessionCookie && !isLoginPage) {
    return { status: 302, destination: '/login' };
  }

  if (sessionCookie && isLoginPage) {
    return { status: 302, destination: '/' };
  }

  return null; // pass through
}

describe('Admin Panel Edge Auth & Routing', () => {
  it('correctly identifies public assets and endpoints to bypass auth', () => {
    assert.equal(shouldBypassAuth('/_astro/main.css'), true);
    assert.equal(shouldBypassAuth('/fonts/inter.woff2'), true);
    assert.equal(shouldBypassAuth('/healthz'), true);
    assert.equal(shouldBypassAuth('/api/v1/ping'), true);
    assert.equal(shouldBypassAuth('/favicon.ico'), true);
    assert.equal(shouldBypassAuth('/icon.svg'), true);
  });

  it('identifies protected admin panel routes', () => {
    assert.equal(shouldBypassAuth('/'), false);
    assert.equal(shouldBypassAuth('/usuarios'), false);
    assert.equal(shouldBypassAuth('/polos'), false);
    assert.equal(shouldBypassAuth('/financeiro'), false);
    assert.equal(shouldBypassAuth('/documentos'), false);
    assert.equal(shouldBypassAuth('/auditoria'), false);
  });

  it('redirects unauthenticated users to /login for protected routes', () => {
    const redirectRoot = resolveRedirect('/', null);
    assert.deepEqual(redirectRoot, { status: 302, destination: '/login' });

    const redirectUsers = resolveRedirect('/usuarios', undefined);
    assert.deepEqual(redirectUsers, { status: 302, destination: '/login' });
  });

  it('allows unauthenticated access to /login page', () => {
    const redirectLogin = resolveRedirect('/login', null);
    assert.equal(redirectLogin, null);
  });

  it('redirects authenticated users away from /login to dashboard root', () => {
    const redirect = resolveRedirect('/login', 'valid-jwt-token-session');
    assert.deepEqual(redirect, { status: 302, destination: '/' });
  });

  it('allows authenticated users to access protected routes', () => {
    const redirectRoot = resolveRedirect('/', 'valid-jwt-token-session');
    assert.equal(redirectRoot, null);

    const redirectPolos = resolveRedirect('/polos', 'valid-jwt-token-session');
    assert.equal(redirectPolos, null);
  });
});
