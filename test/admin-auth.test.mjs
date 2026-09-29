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

function isValidAdminJwtCookie(sessionCookie) {
  if (!sessionCookie || typeof sessionCookie !== 'string') return false;
  const parts = sessionCookie.split('.');
  if (parts.length !== 3 || parts.some((p) => !p)) return false;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = Buffer.from(padded, 'base64').toString('utf-8');
    const payload = JSON.parse(json);
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function makeTestJwt(expSecondsFromNow = 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub: 'usr_admin', exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }),
  ).toString('base64url');
  return `${header}.${payload}.signature`;
}

function resolveRedirect(pathname, sessionCookie) {
  if (shouldBypassAuth(pathname)) {
    return null; // pass through
  }

  const hasValidSession = isValidAdminJwtCookie(sessionCookie);
  const isLoginPage = pathname === '/login';

  if (!hasValidSession && !isLoginPage) {
    return { status: 302, destination: '/login' };
  }

  if (hasValidSession && isLoginPage) {
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
    assert.equal(shouldBypassAuth('/notificacoes'), false);
    assert.equal(shouldBypassAuth('/auditoria'), false);
  });

  it('redirects unauthenticated or malformed/expired JWT users to /login for protected routes', () => {
    assert.deepEqual(resolveRedirect('/', null), { status: 302, destination: '/login' });
    assert.deepEqual(resolveRedirect('/usuarios', undefined), { status: 302, destination: '/login' });
    assert.deepEqual(resolveRedirect('/documentos', 'not-a-jwt'), { status: 302, destination: '/login' });
    assert.deepEqual(resolveRedirect('/financeiro', makeTestJwt(-60)), { status: 302, destination: '/login' });
  });

  it('allows unauthenticated access to /login page', () => {
    const redirectLogin = resolveRedirect('/login', null);
    assert.equal(redirectLogin, null);
  });

  it('redirects authenticated users with valid non-expired JWT away from /login to dashboard root', () => {
    const validJwt = makeTestJwt(3600);
    const redirect = resolveRedirect('/login', validJwt);
    assert.deepEqual(redirect, { status: 302, destination: '/' });
  });

  it('allows authenticated users with valid non-expired JWT to access protected routes', () => {
    const validJwt = makeTestJwt(3600);
    assert.equal(resolveRedirect('/', validJwt), null);
    assert.equal(resolveRedirect('/polos', validJwt), null);
    assert.equal(resolveRedirect('/notificacoes', validJwt), null);
  });
});
