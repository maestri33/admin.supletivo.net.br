<script lang="ts">
  import { onMount } from 'svelte';
  import { listPaymentAttempts, reconcilePaymentAttempt, type StaffPaymentAttemptOut } from '@/lib/api';
  import { confirmedMoney, isPaymentAttempt, loadingResource, readFinancialResource, paymentErrorLabel, paymentStatusLabel } from '@/lib/financial-state';
  import { formatCurrencyBrl, formatDateBr } from '@/lib/utils';

  let attempts = $state(loadingResource<StaffPaymentAttemptOut[]>());
  let reconcilingId = $state<string | null>(null);
  let actionError = $state<string | null>(null);
  let actionMessage = $state<string | null>(null);

  async function loadAttempts() {
    attempts = loadingResource();
    attempts = await readFinancialResource(listPaymentAttempts, (items) => Array.isArray(items) && items.every(isPaymentAttempt), 'Tentativas de pagamento indisponíveis. Tente consultar novamente.');
  }

  async function reconcile(attempt: StaffPaymentAttemptOut) {
    if (reconcilingId || attempts.loading) return;
    reconcilingId = attempt.external_id;
    actionError = null;
    actionMessage = null;
    try {
      const updated = await reconcilePaymentAttempt(attempt.external_id);
      if (!isPaymentAttempt(updated) || updated.external_id !== attempt.external_id) throw new Error('Unexpected payment attempt');
      if (attempts.data) attempts.data = attempts.data.map((item) => item.external_id === updated.external_id ? updated : item);
      actionMessage = updated.app_applied
        ? 'Consulta concluída: o servidor informa pagamento aplicado no app.'
        : updated.provider_confirmed
          ? 'O provedor confirmou o recebimento. A aplicação no app ainda está pendente; acompanhe esta tentativa.'
          : 'Consulta concluída. A tentativa ainda não tem recebimento confirmado pelo provedor.';
    } catch {
      actionError = 'Não foi possível obter o resultado da verificação. Consulte as tentativas para conferir o estado atual antes de repetir a ação.';
    } finally {
      reconcilingId = null;
    }
  }

  function providerLabel(provider: string): string {
    return provider === 'infinitepay' ? 'InfinitePay' : provider === 'asaas' ? 'Asaas' : 'Provedor não informado';
  }

  onMount(() => { void loadAttempts(); });
</script>

<section class="space-y-4" aria-labelledby="payment-attempts-title" aria-busy={attempts.loading}>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 id="payment-attempts-title" class="font-display text-lg">Tentativas de pagamento</h2>
      <p class="mt-1 text-sm text-muted-on-dark">Recebimento na operadora e aplicação no app são acompanhados separadamente.</p>
    </div>
    <button type="button" class="attempt-action" onclick={loadAttempts} disabled={attempts.loading || !!reconcilingId}>Consultar tentativas</button>
  </div>

  <p class="text-sm text-muted-on-dark">“Verificar no servidor” consulta as referências disponíveis e retoma a aplicação de pagamentos confirmados. A ação não emite cobrança nem confirma dinheiro manualmente.</p>

  {#if actionError}<p class="attempt-alert danger" role="alert">{actionError}</p>{/if}
  {#if actionMessage}<p class="attempt-alert info" role="status">{actionMessage}</p>{/if}

  {#if attempts.loading}
    <p class="py-6 text-sm text-muted-on-dark" role="status">Consultando tentativas...</p>
  {:else if attempts.error}
    <p class="attempt-alert danger" role="alert">{attempts.error}</p>
  {:else if attempts.data!.length === 0}
    <p class="attempt-card text-sm text-muted-on-dark">Nenhuma tentativa de pagamento retornada pelo servidor.</p>
  {:else}
    <div class="space-y-4">
      {#each attempts.data! as attempt (attempt.external_id)}
        <article class="attempt-card space-y-3" aria-label={`Tentativa ${attempt.external_id}`}>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 class="font-bold">{providerLabel(attempt.provider)} · {confirmedMoney(attempt.amount) === null ? 'Valor indisponível' : formatCurrencyBrl(attempt.amount)}</h3>
              <p class="mt-1 text-sm text-muted-on-dark">Valor contratado · {paymentStatusLabel(attempt.status)}</p>
            </div>
            <button type="button" class="attempt-action" onclick={() => reconcile(attempt)} disabled={!!reconcilingId || attempts.loading}>
              {reconcilingId === attempt.external_id ? 'Verificando...' : 'Verificar no servidor'}
            </button>
          </div>

          <dl class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div><dt class="text-muted-on-dark">Referência da tentativa</dt><dd class="break-all font-mono">{attempt.external_id}</dd></div>
            <div><dt class="text-muted-on-dark">Referência da proposta / lead</dt><dd class="break-all font-mono">{attempt.lead_external_id}</dd></div>
            <div><dt class="text-muted-on-dark">Referência na operadora</dt><dd class="break-all font-mono">{attempt.provider_payment_id || 'Ainda não disponível'}</dd></div>
            <div><dt class="text-muted-on-dark">Recebimento confirmado</dt><dd>{attempt.provider_confirmed ? 'Sim, pela operadora' : 'Ainda não confirmado'}</dd></div>
            <div><dt class="text-muted-on-dark">Aplicação no app</dt><dd>{attempt.app_applied ? 'Concluída' : 'Ainda não concluída'}</dd></div>
            <div><dt class="text-muted-on-dark">Criada em</dt><dd>{formatDateBr(attempt.created_at)}</dd></div>
            <div><dt class="text-muted-on-dark">Próxima recuperação</dt><dd>{attempt.next_retry_at ? formatDateBr(attempt.next_retry_at) : 'Sem recuperação agendada'}</dd></div>
          </dl>

          {#if attempt.provider_confirmed && !attempt.app_applied}
            <p class="attempt-alert warning">Recebimento confirmado na operadora; aplicação no app pendente. Confira o vínculo e a recuperação desta tentativa.</p>
          {/if}
          {#if attempt.creation_uncertain}
            <p class="attempt-alert warning">A emissão teve resultado incerto. Confira na operadora com a referência do caso antes de criar outra cobrança.</p>
          {/if}
          {#if attempt.superseded}
            <p class="attempt-alert info">Tentativa anterior. Esse estado não comprova cancelamento da cobrança na operadora.</p>
          {/if}
          {#if paymentErrorLabel(attempt.last_error)}
            <p class="attempt-alert warning">{paymentErrorLabel(attempt.last_error)}</p>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .attempt-card { border: 1px solid var(--glass-border-dark); border-radius: var(--radius); background: var(--ink-soft); color: var(--paper); padding: 1.25rem; }
  .attempt-action { min-height: var(--input-height); border: 1px solid var(--muted-on-dark); border-radius: var(--input-radius); padding: 0.5rem 1rem; color: var(--paper); font-weight: 700; font-size: 0.875rem; cursor: pointer; }
  .attempt-action:focus-visible { outline: 3px solid var(--yellow); outline-offset: 3px; }
  .attempt-action:disabled { opacity: 0.6; cursor: wait; }
  .attempt-alert { border-radius: var(--input-radius); padding: 1rem; font-size: 0.875rem; }
  .danger { color: var(--danger); background: var(--danger-bg); }
  .warning { color: var(--warning); background: var(--warning-bg); }
  .info { color: var(--info); background: var(--info-bg); }
</style>
