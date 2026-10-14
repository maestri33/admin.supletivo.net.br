import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = ts.transpileModule(fs.readFileSync(new URL('../src/lib/financial-state.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
}).outputText;
const finance = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('a failed balance read remains unavailable while independent summary and list reads succeed', async () => {
  const [balance, summary, commissions] = await Promise.all([
    finance.readFinancialResource(async () => { throw new TypeError('Connection closed'); }, () => true, 'Saldo indisponível'),
    finance.readFinancialResource(async () => ({ commissions: { pending: { count: 1, total: '100.00' } } }), () => true, 'Resumo indisponível'),
    finance.readFinancialResource(async () => [], Array.isArray, 'Lista indisponível'),
  ]);
  assert.deepEqual(balance, { loading: false, data: null, error: 'Saldo indisponível' });
  assert.equal(finance.summaryTotal(summary.data, 'pending'), 100);
  assert.deepEqual(commissions.data, []);
  assert.equal(commissions.error, null);
});

test('HTTP success with an unavailable Asaas balance is an error, while a confirmed zero is valid', async () => {
  const validate = (value) => !value.error && finance.confirmedMoney(value.balance) !== null;
  const missing = await finance.readFinancialResource(async () => ({ balance: null, error: 'Unavailable' }), validate, 'Saldo indisponível');
  const zero = await finance.readFinancialResource(async () => ({ balance: 0 }), validate, 'Saldo indisponível');
  assert.equal(missing.data, null);
  assert.equal(missing.error, 'Saldo indisponível');
  assert.equal(zero.data.balance, 0);
  assert.equal(zero.error, null);
});

test('missing and malformed money never become zero; absent groups in a confirmed aggregate are zero', () => {
  for (const value of [null, undefined, '', '   ', '10invalid', '0x10', '1e3', 'NaN', Infinity, {}]) assert.equal(finance.confirmedMoney(value), null);
  assert.equal(finance.summaryTotal(null, 'paid'), null);
  assert.equal(finance.summaryTotal({}, 'paid'), null);
  assert.equal(finance.summaryTotal({ commissions: { paid: { total: 'invalid' } } }, 'paid'), null);
  assert.equal(finance.summaryTotal({ commissions: {} }, 'paid'), 0);
  assert.equal(finance.commissionAmount({}), null);
  assert.equal(finance.commissionAmount({ amount: 'invalid', amount_cents: 100 }), null);
  assert.equal(finance.commissionAmount({ amount_cents: 101 }), 1.01);
});

test('failed list reads stay distinct from a confirmed empty list, without exposing raw errors', async () => {
  const state = await finance.readFinancialResource(async () => { throw { status: 503, message: 'secret provider payload' }; }, Array.isArray, 'Lista indisponível');
  assert.equal(state.data, null);
  assert.equal(state.error, 'Lista indisponível');
  assert.doesNotMatch(finance.paymentErrorLabel('Bearer secret provider payload'), /secret|Bearer|payload/);
  assert.match(finance.paymentErrorLabel('additional_payment_review'), /Recebimento adicional/);
  assert.equal(typeof finance.paymentErrorLabel('constructor'), 'string');
});

test('authentication and authorization failures provide specific recovery information', async () => {
  const expired = await finance.readFinancialResource(async () => { throw { status: 401 }; }, () => true, 'Indisponível');
  const forbidden = await finance.readFinancialResource(async () => { throw { status: 403 }; }, () => true, 'Indisponível');
  assert.match(expired.error, /Entre novamente/);
  assert.match(forbidden.error, /permissão/);
});

test('an incomplete diagnostics response cannot masquerade as an unconfirmed payment', () => {
  const attempt = {
    external_id: 'attempt-1', lead_external_id: 'lead-1', provider: 'asaas', amount: '1.01', status: 'pending',
    provider_payment_id: null, provider_confirmed: false, app_applied: false, superseded: false,
    creation_uncertain: false, last_error: null, next_retry_at: null, created_at: '2026-10-13T12:00:00Z',
  };
  assert.equal(finance.isPaymentAttempt(attempt), true);
  delete attempt.provider_confirmed;
  assert.equal(finance.isPaymentAttempt(attempt), false);
});
