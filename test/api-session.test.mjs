import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const transpile = (source) => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
const sessionUrl = moduleUrl(transpile(fs.readFileSync(new URL('../src/lib/session.ts', import.meta.url), 'utf8')));
const configUrl = moduleUrl('export const API_BASE_URL=""; export const API_TIMEOUT_MS=1000;');
const apiSource = fs.readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8')
  .replace("'./config'", JSON.stringify(configUrl)).replace("'./session'", JSON.stringify(sessionUrl));
const session = await import(sessionUrl);
const api = await import(moduleUrl(transpile(apiSource)));
const originalFetch = globalThis.fetch;

beforeEach(() => {
  const storage = new Map();
  globalThis.window = { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) } };
  globalThis.document = { cookie: '' };
  globalThis.location = { protocol: 'https:' };
  session.clearSession();
  session.saveStaffLogin({ access_token: 'expired', refresh_token: 'retained-refresh', token_type: 'bearer' });
});
afterEach(() => { globalThis.fetch = originalFetch; delete globalThis.window; delete globalThis.document; delete globalThis.location; });

test('temporary refresh failure preserves the staff session and its error', async () => {
  globalThis.fetch = async (url) => new Response(JSON.stringify({ detail: url.endsWith('/refresh') ? 'Banco indisponível' : 'Expired' }), { status: url.endsWith('/refresh') ? 503 : 401 });
  await assert.rejects(api.requestAuth('/resource'), (error) => error.status === 503 && error.message === 'Banco indisponível');
  assert.equal(session.getRefreshToken(), 'retained-refresh');
  assert.equal(session.getAccessToken(), 'expired');
});

test('an explicitly rejected refresh removes the staff session', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Unauthorized' }), { status: 401 });
  await assert.rejects(api.requestAuth('/resource'), (error) => error.status === 401);
  assert.equal(session.getRefreshToken(), null);
  assert.equal(session.getAccessToken(), null);
});

test('a successful refresh retries the read with the new token and updates the SSR cookie', async () => {
  let reads = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/refresh')) return new Response(JSON.stringify({ access_token: 'renewed', refresh_token: 'new-refresh', token_type: 'bearer' }));
    reads += 1;
    if (reads === 1) return new Response('{}', { status: 401 });
    assert.equal(options.headers.Authorization, 'Bearer renewed');
    return new Response(JSON.stringify({ status: 'available' }));
  };
  assert.deepEqual(await api.requestAuth('/resource'), { status: 'available' });
  assert.equal(session.getRefreshToken(), 'new-refresh');
  assert.match(document.cookie, /session=renewed;/);
});

test('a lost mutation response is surfaced without replaying a payout request', async () => {
  let attempts = 0;
  globalThis.fetch = async () => { attempts += 1; throw new TypeError('Connection closed'); };
  await assert.rejects(api.requestAuth('/payment', { method: 'POST', json: { amount: '10.00' } }), TypeError);
  assert.equal(attempts, 1);
});

test('payment diagnostics use authenticated reads and a bodyless server verification request', async () => {
  const attempt = { external_id: 'attempt/1', amount: '1.02', provider_confirmed: false, app_applied: false };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(options.method === 'GET' ? [attempt] : attempt));
  };
  assert.deepEqual(await api.listPaymentAttempts(), [attempt]);
  assert.deepEqual(await api.reconcilePaymentAttempt('attempt/1'), attempt);
  assert.equal(calls[0].url, '/api/v1/staff/payment-attempts');
  assert.equal(calls[1].url, '/api/v1/staff/payment-attempts/attempt%2F1/reconcile');
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[1].options.body, undefined);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer expired');
});

test('an uncertain verification result is surfaced without replaying the operator action', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new TypeError('Connection closed'); };
  await assert.rejects(api.reconcilePaymentAttempt('attempt-1'), TypeError);
  assert.equal(calls, 1);
});
