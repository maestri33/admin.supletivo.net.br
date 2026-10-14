import type { PlatformSetupOut, PlatformSetupUpdateIn } from './api';

export interface PricingDraft {
  defaultPromoterId: string;
  anchorFull: string;
  fullPricePix: string;
  fullPriceCardReais: string;
  promoPricePix: string;
  promoPriceCardReais: string;
  cardInstallments: number | undefined;
  description: string;
  promoterStudyUnlockThreshold: number | undefined;
  promoterStudyCompleteThreshold: number | undefined;
  commissionDirect: string;
  commissionBonusFlat: string;
  commissionBonusThreshold: number | undefined;
  commissionCoordinator: string;
}

export interface PricingDraftIssue { fieldId: string; message: string }

export class PricingConfigurationError extends Error {}

const MONEY_FIELDS = [
  ['anchorFull', 'anchor-full', 'Preço de referência'],
  ['fullPricePix', 'full-price-pix', 'Pix sem indicação'],
  ['fullPriceCardReais', 'full-price-card', 'Cartão sem indicação'],
  ['promoPricePix', 'promo-price-pix', 'Pix com indicação'],
  ['promoPriceCardReais', 'promo-price-card', 'Cartão com indicação'],
  ['commissionDirect', 'commission-direct', 'Comissão direta'],
  ['commissionBonusFlat', 'commission-bonus-flat', 'Bônus de volume'],
  ['commissionCoordinator', 'commission-coordinator', 'Comissão de polo'],
] as const;

export function draftMoney(value: string): number | null {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) return null;
  const amount = Number(value.trim().replace(',', '.'));
  return Number.isFinite(amount) && amount * 100 <= Number.MAX_SAFE_INTEGER ? amount : null;
}

export function pricingDraftIssues(draft: PricingDraft): PricingDraftIssue[] {
  const issues: PricingDraftIssue[] = [];
  for (const [key, fieldId, label] of MONEY_FIELDS) {
    if (draftMoney(draft[key]) === null) issues.push({ fieldId, message: `${label}: informe um valor não negativo com até duas casas decimais.` });
  }
  for (const [key, fieldId, label] of [
    ['promoterStudyUnlockThreshold', 'promoter-unlock-threshold', 'Meta de destravamento'],
    ['promoterStudyCompleteThreshold', 'promoter-complete-threshold', 'Meta de quitação'],
    ['commissionBonusThreshold', 'commission-threshold', 'Meta do bloco semanal'],
    ['cardInstallments', 'pricing-state', 'Referência de parcelas do servidor'],
  ] as const) {
    const value = draft[key];
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) issues.push({ fieldId, message: `${label}: informe um número inteiro a partir de 1.` });
  }
  if (!draft.description.trim()) issues.push({ fieldId: 'enrollment-description', message: 'Informe a descrição da cobrança.' });
  return issues;
}

export function pricingDraftFingerprint(draft: PricingDraft): string {
  const normalized = { ...draft, description: draft.description.trim() };
  for (const [key] of MONEY_FIELDS) normalized[key] = draftMoney(draft[key])?.toFixed(2) ?? draft[key];
  return JSON.stringify(normalized);
}

export function readPricingDraft(data: PlatformSetupOut): PricingDraft {
  if (!data?.pricing || !data.commissions) throw new PricingConfigurationError('O servidor não retornou a configuração comercial completa. Consulte novamente antes de editar.');
  const p = data.pricing;
  const c = data.commissions;
  function serverCardAmount(cents: unknown, reais: unknown): string {
    if (cents !== null && cents !== undefined) return typeof cents === 'number' && Number.isSafeInteger(cents) && cents >= 0 ? (cents / 100).toFixed(2) : '';
    return typeof reais === 'string' ? reais : '';
  }
  const draft: PricingDraft = {
    defaultPromoterId: data.default_promoter_external_id ?? '',
    anchorFull: p.anchor_full ?? '',
    fullPricePix: p.price_pix ?? '',
    fullPriceCardReais: serverCardAmount(p.price_card_cents, p.price_card_reais),
    promoPricePix: p.promo_price_pix ?? '',
    promoPriceCardReais: serverCardAmount(p.promo_price_card_cents, p.promo_price_card_reais),
    cardInstallments: p.card_installments ?? undefined,
    description: p.description ?? '',
    promoterStudyUnlockThreshold: p.promoter_study_unlock_threshold ?? undefined,
    promoterStudyCompleteThreshold: p.promoter_study_complete_threshold ?? undefined,
    commissionDirect: c.commission_direct ?? '',
    commissionBonusFlat: c.commission_bonus_flat ?? '',
    commissionBonusThreshold: c.commission_bonus_threshold ?? undefined,
    commissionCoordinator: c.commission_coordinator ?? '',
  };
  const issues = pricingDraftIssues(draft);
  if (issues.length) throw new PricingConfigurationError(`Configuração comercial incompleta ou inválida: ${issues.map((issue) => issue.message.split(':')[0]).join(', ')}. Consulte novamente antes de editar.`);
  return draft;
}

export function pricingDraftPayload(draft: PricingDraft): PlatformSetupUpdateIn {
  if (pricingDraftIssues(draft).length) throw new Error('Invalid pricing draft');
  const money = (value: string) => draftMoney(value)!;
  return {
    default_promoter_external_id: draft.defaultPromoterId || null,
    pricing: {
      price_pix: money(draft.fullPricePix).toFixed(2),
      price_card_cents: Math.round(money(draft.fullPriceCardReais) * 100),
      promo_price_pix: money(draft.promoPricePix).toFixed(2),
      promo_price_card_cents: Math.round(money(draft.promoPriceCardReais) * 100),
      card_installments: draft.cardInstallments,
      anchor_full: money(draft.anchorFull).toFixed(2),
      description: draft.description.trim(),
      promoter_study_unlock_threshold: draft.promoterStudyUnlockThreshold,
      promoter_study_complete_threshold: draft.promoterStudyCompleteThreshold,
      promoter_price_pix: money(draft.promoPricePix).toFixed(2),
      promoter_price_card_cents: Math.round(money(draft.promoPriceCardReais) * 100),
    },
    commissions: {
      commission_direct: money(draft.commissionDirect).toFixed(2),
      commission_bonus_flat: money(draft.commissionBonusFlat).toFixed(2),
      commission_bonus_threshold: draft.commissionBonusThreshold,
      commission_coordinator: money(draft.commissionCoordinator).toFixed(2),
    },
  };
}
