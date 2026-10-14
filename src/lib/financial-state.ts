import type { FinanceSummaryOut, StaffCommissionOut, StaffPaymentAttemptOut } from './api';

export interface FinancialResource<T> {
  loading: boolean;
  data: T | null;
  error: string | null;
}

export function loadingResource<T>(): FinancialResource<T> {
  return { loading: true, data: null, error: null };
}

export async function readFinancialResource<T>(
  load: () => Promise<T>,
  isAvailable: (value: T) => boolean,
  unavailableMessage: string,
): Promise<FinancialResource<T>> {
  try {
    const data = await load();
    if (!isAvailable(data)) return { loading: false, data: null, error: unavailableMessage };
    return { loading: false, data, error: null };
  } catch (error: unknown) {
    const status = error && typeof error === 'object' && 'status' in error ? error.status : null;
    const message = status === 401
      ? 'Sessão expirada. Entre novamente para consultar os dados.'
      : status === 403
        ? 'Sua conta não tem permissão para consultar estes dados.'
        : unavailableMessage;
    return { loading: false, data: null, error: message };
  }
}

export function confirmedMoney(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^-?\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function commissionAmount(commission: StaffCommissionOut): number | null {
  if (commission.amount !== undefined) return confirmedMoney(commission.amount);
  const cents = confirmedMoney(commission.amount_cents);
  return cents === null ? null : cents / 100;
}

export function summaryTotal(summary: FinanceSummaryOut | null, status: 'pending' | 'paid'): number | null {
  if (!summary) return null;
  if (summary.commissions && typeof summary.commissions === 'object' && !Array.isArray(summary.commissions)) {
    // The real API groups existing rows by status; an absent group is a confirmed empty sum.
    const group = summary.commissions[status];
    return group === undefined ? 0 : confirmedMoney(group.total);
  }
  const cents = confirmedMoney(status === 'pending' ? summary.pending_commissions_cents : summary.paid_commissions_cents);
  return cents === null ? null : cents / 100;
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando pagamento',
  creating: 'Preparando cobrança',
  uncertain: 'Emissão incerta',
  provider_confirmed: 'Recebido; aplicação pendente',
  applied: 'Aplicado no app',
  review: 'Precisa de conferência',
  superseded: 'Tentativa anterior',
};

const PAYMENT_ERROR_LABELS: Record<string, string> = {
  account_removed: 'A conta vinculada não está mais disponível. Confira o histórico com a referência do caso.',
  identity_mismatch: 'O vínculo da tentativa diverge da proposta. Conferência necessária.',
  amount_mismatch: 'O valor verificado diverge do valor contratado. Conferência necessária.',
  additional_payment_review: 'Recebimento adicional: conferir a cobrança e o procedimento de estorno na operadora.',
  business_state_mismatch: 'O estado da proposta impede a aplicação automática. Confira o vínculo e a matrícula.',
  checkout_creation_uncertain: 'Resultado da emissão incerto. Confira na operadora antes de criar outra cobrança.',
  checkout_creation_in_progress: 'A emissão da cobrança está em andamento.',
  consumer_missing: 'O recebimento ainda não encontrou aplicação na proposta. Confira o vínculo desta tentativa.',
  amount_missing: 'A operadora não forneceu o valor necessário para confirmar o recebimento.',
  amount_invalid: 'A evidência de valor recebida é inválida. Conferência necessária.',
  reference_mismatch: 'As referências da transação divergem da tentativa. Conferência necessária.',
  check_not_paid: 'A consulta à operadora ainda não confirmou o recebimento.',
  check_unsuccessful: 'A operadora não concluiu a consulta de confirmação. Tente verificar novamente.',
  check_failed: 'A consulta à operadora falhou. Acompanhe a recuperação ou tente verificar novamente.',
  invalid_amount: 'A evidência de valor recebida é inválida. Conferência necessária.',
  not_paid: 'A consulta à operadora ainda não confirmou o recebimento.',
  payment_check_unsuccessful: 'A operadora não concluiu a consulta. A recuperação tentará novamente.',
  payment_check_failed: 'A consulta à operadora falhou. Acompanhe a recuperação.',
  processing_failed: 'A confirmação está em recuperação após uma falha de processamento.',
  financial_proof_missing: 'A confirmação financeira completa ainda não está disponível. Verifique a cobrança.',
};

export function paymentStatusLabel(status: string): string {
  return Object.hasOwn(PAYMENT_STATUS_LABELS, status) ? PAYMENT_STATUS_LABELS[status] : 'Estado não reconhecido';
}

export function paymentErrorLabel(code: string | null): string | null {
  if (!code) return null;
  // Never render arbitrary backend or provider error text, even if the contract promises a code.
  return Object.hasOwn(PAYMENT_ERROR_LABELS, code) ? PAYMENT_ERROR_LABELS[code] : 'Falha registrada na tentativa. Confira usando a referência do caso.';
}

export function isPaymentAttempt(value: unknown): value is StaffPaymentAttemptOut {
  if (!value || typeof value !== 'object') return false;
  const attempt = value as Record<string, unknown>;
  return ['external_id', 'lead_external_id', 'provider', 'status', 'created_at'].every((field) => typeof attempt[field] === 'string' && !!attempt[field])
    && ['provider_confirmed', 'app_applied', 'superseded', 'creation_uncertain'].every((field) => typeof attempt[field] === 'boolean')
    && ['provider_payment_id', 'last_error', 'next_retry_at'].every((field) => attempt[field] === null || typeof attempt[field] === 'string')
    && typeof attempt.amount === 'string' && confirmedMoney(attempt.amount) !== null;
}
