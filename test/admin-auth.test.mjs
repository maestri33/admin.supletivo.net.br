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
    const headerB64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    const headerPadded = headerB64.padEnd(headerB64.length + ((4 - (headerB64.length % 4)) % 4), '=');
    const headerJson = Buffer.from(headerPadded, 'base64').toString('utf-8');
    const header = JSON.parse(headerJson);
    if (!header.alg || header.alg.toLowerCase() === 'none') return false;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = Buffer.from(padded, 'base64').toString('utf-8');
    const payload = JSON.parse(json);

    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return false;
    if (!payload.external_id || typeof payload.external_id !== 'string') return false;

    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    const hasAdminRole = roles.some((r) =>
      ['staff', 'admin', 'coordinator', 'leadership', 'superuser'].includes(r)
    );
    if (!hasAdminRole) return false;

    return true;
  } catch {
    return false;
  }
}

function makeTestJwt(expSecondsFromNow = 3600, options = {}) {
  const alg = options.alg || 'HS256';
  const header = Buffer.from(JSON.stringify({ alg, typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: options.sub || 'usr_admin',
      external_id: options.external_id !== undefined ? options.external_id : 'usr_admin_ext_123',
      roles: options.roles || ['admin'],
      exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
    }),
  ).toString('base64url');
  return `${header}.${payload}.${alg === 'none' ? '' : 'signature'}`;
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

  it('rejects JWT tokens with alg: none to prevent signature bypass attacks', () => {
    const noneAlgJwt = makeTestJwt(3600, { alg: 'none' });
    assert.equal(isValidAdminJwtCookie(noneAlgJwt), false);
    assert.deepEqual(resolveRedirect('/', noneAlgJwt), { status: 302, destination: '/login' });
  });

  it('rejects JWT tokens missing mandatory external_id', () => {
    const missingExtId = makeTestJwt(3600, { external_id: null });
    assert.equal(isValidAdminJwtCookie(missingExtId), false);
    assert.deepEqual(resolveRedirect('/usuarios', missingExtId), { status: 302, destination: '/login' });
  });

  it('rejects JWT tokens lacking authorized administrative roles', () => {
    const studentJwt = makeTestJwt(3600, { roles: ['student', 'lead'] });
    assert.equal(isValidAdminJwtCookie(studentJwt), false);
    assert.deepEqual(resolveRedirect('/financeiro', studentJwt), { status: 302, destination: '/login' });

    const promoterJwt = makeTestJwt(3600, { roles: ['promoter'] });
    assert.equal(isValidAdminJwtCookie(promoterJwt), false);
  });

  it('accepts authorized admin roles (staff, admin, coordinator, leadership, superuser)', () => {
    for (const role of ['staff', 'admin', 'coordinator', 'leadership', 'superuser']) {
      const jwt = makeTestJwt(3600, { roles: [role] });
      assert.equal(isValidAdminJwtCookie(jwt), true, `Role ${role} should be authorized`);
      assert.equal(resolveRedirect('/', jwt), null);
    }
  });
});
