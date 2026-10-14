import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = ts.transpileModule(fs.readFileSync(new URL('../src/lib/pricing-draft.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
}).outputText;
const pricing = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function setup() {
  return {
    default_promoter_external_id: null,
    pricing: {
      price_pix: '1615.00', price_card_cents: 191880,
      promo_price_pix: '999.00', promo_price_card_cents: 118800,
      anchor_full: '1615.00', description: 'Matrícula Supletivo', card_installments: 6,
      promoter_study_unlock_threshold: 3, promoter_study_complete_threshold: 10,
    },
    commissions: { commission_direct: '100.00', commission_bonus_flat: '500.00', commission_bonus_threshold: 5, commission_coordinator: '50.00' },
  };
}

test('missing commercial fields reject the server configuration instead of inserting a default', () => {
  const data = setup();
  data.pricing.promo_price_pix = null;
  assert.throws(() => pricing.readPricingDraft(data), /Pix com indicação/);
  data.pricing.promo_price_pix = '999.00';
  delete data.commissions.commission_bonus_flat;
  assert.throws(() => pricing.readPricingDraft(data), /Bônus de volume/);
});

test('invalid card cents cannot be hidden by a second monetary field in the response', () => {
  const data = setup();
  data.pricing.price_card_cents = -1;
  data.pricing.price_card_reais = '1918.80';
  assert.throws(() => pricing.readPricingDraft(data), /Cartão sem indicação/);
});

test('saved pricing and an edited draft remain independent, including non-price fields', () => {
  const saved = pricing.readPricingDraft(setup());
  const draft = { ...saved, promoPricePix: '900.00' };
  assert.notEqual(pricing.pricingDraftFingerprint(draft), pricing.pricingDraftFingerprint(saved));
  assert.equal(saved.promoPricePix, '999.00');
  assert.notEqual(pricing.pricingDraftFingerprint({ ...saved, defaultPromoterId: 'another-promoter' }), pricing.pricingDraftFingerprint(saved));
  assert.notEqual(pricing.pricingDraftFingerprint({ ...saved, commissionBonusThreshold: 6 }), pricing.pricingDraftFingerprint(saved));
  assert.equal(pricing.pricingDraftFingerprint({ ...saved, fullPricePix: '1615,00' }), pricing.pricingDraftFingerprint(saved));
});

test('payload preserves server installment reference and correctly converts decimal money to cents', () => {
  const draft = pricing.readPricingDraft(setup());
  draft.promoPriceCardReais = '1,02';
  const payload = pricing.pricingDraftPayload(draft);
  assert.equal(payload.pricing.card_installments, 6);
  assert.equal(payload.pricing.promo_price_card_cents, 102);
  assert.equal(payload.pricing.promoter_price_card_cents, 102);
  assert.equal(payload.commissions.commission_direct, '100.00');
});

test('empty and malformed draft fields cannot silently save as zero or a commercial default', () => {
  const draft = pricing.readPricingDraft(setup());
  draft.fullPricePix = '';
  draft.commissionBonusThreshold = undefined;
  const issues = pricing.pricingDraftIssues(draft);
  assert.ok(issues.some((issue) => issue.fieldId === 'full-price-pix'));
  assert.ok(issues.some((issue) => issue.fieldId === 'commission-threshold'));
  assert.throws(() => pricing.pricingDraftPayload(draft), /Invalid pricing draft/);
  for (const value of ['', '   ', '12abc', '1.001', '-1', 'Infinity']) assert.equal(pricing.draftMoney(value), null);
  assert.equal(pricing.draftMoney('0.00'), 0);
});

test('a partial save response cannot become a confirmed saved snapshot', () => {
  assert.throws(() => pricing.readPricingDraft({ pricing: setup().pricing, commissions: null }), /configuração comercial completa/);
});
