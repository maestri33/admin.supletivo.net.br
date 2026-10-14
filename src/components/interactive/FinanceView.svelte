<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getFinanceBalance, getFinanceSummary, listCommissions,
    type FinanceBalanceOut, type FinanceSummaryOut, type StaffCommissionOut,
  } from '@/lib/api';
  import {
    loadingResource, readFinancialResource, confirmedMoney, summaryTotal, commissionAmount,
  } from '@/lib/financial-state';
  import { formatCurrencyBrl, formatDateBr } from '@/lib/utils';
  import PaymentAttemptsView from './PaymentAttemptsView.svelte';

  let balance = $state(loadingResource<FinanceBalanceOut>());
  let summary = $state(loadingResource<FinanceSummaryOut>());
  let commissions = $state(loadingResource<StaffCommissionOut[]>());

  const ROLE_LABELS: Record<string, string> = {
    promoter: 'Promotor', coordinator: 'Coordenador de Polo', staff: 'Administrador',
  };
  const SOURCE_LABELS: Record<string, string> = {
    enrollment: 'Matrícula', manual: 'Lançamento manual', bonus: 'Bônus semanal', referral: 'Indicação',
  };
  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendente', queued: 'Na fila', paid: 'Pago', canceled: 'Cancelado', failed: 'Falhou',
  };

  function label(value: string | null | undefined, labels: Record<string, string>): string {
    return value ? labels[value.toLowerCase()] ?? value : 'Não informado';
  }

  async function loadBalance() {
    balance = loadingResource();
    balance = await readFinancialResource(
      getFinanceBalance,
      (value) => !!value && !value.error && confirmedMoney(value.balance) !== null,
      'Saldo Asaas indisponível. Tente consultar novamente.',
    );
  }

  async function loadSummary() {
    summary = loadingResource();
    summary = await readFinancialResource(
      getFinanceSummary,
      (value) => summaryTotal(value, 'pending') !== null && summaryTotal(value, 'paid') !== null,
      'Resumo de comissões indisponível. Tente consultar novamente.',
    );
  }

  async function loadCommissions() {
    commissions = loadingResource();
    commissions = await readFinancialResource(
      listCommissions, Array.isArray,
      'Lista de comissões indisponível. Tente consultar novamente.',
    );
  }

  onMount(() => { void loadBalance(); void loadSummary(); void loadCommissions(); });
</script>

<div class="finance-view space-y-6">
  <div class="border-b border-paper/10 pb-4">
    <h1 class="font-display text-2xl text-paper">Gestão Financeira & Repasses</h1>
    <p class="text-sm text-muted-on-dark">Saldos Asaas, comissões e acompanhamento dos pagamentos</p>
  </div>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <section class="finance-card" aria-labelledby="balance-title" aria-busy={balance.loading}>
      <h2 id="balance-title" class="text-sm font-bold text-muted-on-dark">Saldo disponível</h2>
      {#if balance.loading}
        <p class="py-2 text-sm" role="status">Consultando saldo...</p>
      {:else if balance.error}
        <p class="finance-error mt-2" role="alert">{balance.error}</p>
      {:else}
        <p class="mt-1 font-display text-2xl">{formatCurrencyBrl(balance.data!.balance)}</p>
      {/if}
      <p class="mt-2 text-sm text-muted-on-dark">Conta principal Asaas</p>
      <button type="button" class="finance-action mt-3" onclick={loadBalance} disabled={balance.loading}>Consultar saldo</button>
    </section>

    <section class="finance-card sm:col-span-2" aria-labelledby="summary-title" aria-busy={summary.loading}>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="summary-title" class="text-sm font-bold text-muted-on-dark">Resumo de comissões</h2>
        <button type="button" class="finance-action" onclick={loadSummary} disabled={summary.loading}>Consultar resumo</button>
      </div>
      {#if summary.loading}
        <p class="py-2 text-sm" role="status">Consultando comissões...</p>
      {:else if summary.error}
        <p class="finance-error mt-2" role="alert">{summary.error}</p>
      {:else}
        <dl class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt class="text-sm text-muted-on-dark">Comissões pendentes</dt>
            <dd class="mt-1 font-display text-2xl">{formatCurrencyBrl(summaryTotal(summary.data, 'pending'))}</dd>
          </div>
          <div>
            <dt class="text-sm text-muted-on-dark">Total pago histórico</dt>
            <dd class="mt-1 font-display text-2xl">{formatCurrencyBrl(summaryTotal(summary.data, 'paid'))}</dd>
          </div>
        </dl>
      {/if}
    </section>
  </div>

  <PaymentAttemptsView />

  <section class="space-y-3" aria-labelledby="commissions-title" aria-busy={commissions.loading}>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="commissions-title" class="font-display text-lg">Últimas comissões geradas</h2>
      <button type="button" class="finance-action" onclick={loadCommissions} disabled={commissions.loading}>Consultar comissões</button>
    </div>
    {#if commissions.loading}
      <p class="py-8 text-center text-sm text-muted-on-dark" role="status">Carregando comissões...</p>
    {:else if commissions.error}
      <p class="finance-error" role="alert">{commissions.error}</p>
    {:else if commissions.data!.length === 0}
      <p class="finance-card py-8 text-center text-sm text-muted-on-dark">Nenhuma comissão registrada até o momento.</p>
    {:else}
      <div class="overflow-x-auto rounded-2xl border border-paper/10 bg-ink-soft">
        <table class="w-full text-left text-sm">
          <caption class="sr-only">Comissões, beneficiários, valores e situação confirmados pelo servidor</caption>
          <thead class="border-b border-paper/10 text-muted-on-dark">
            <tr>
              <th scope="col" class="px-4 py-3">Beneficiário</th>
              <th scope="col" class="px-4 py-3">Papel</th>
              <th scope="col" class="px-4 py-3">Origem</th>
              <th scope="col" class="px-4 py-3">Valor</th>
              <th scope="col" class="px-4 py-3">Situação</th>
              <th scope="col" class="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-paper/10">
            {#each commissions.data! as commission (commission.external_id)}
              <tr>
                <td class="px-4 py-3 font-semibold">{commission.beneficiary_name || commission.payee_external_id || 'Não informado'}</td>
                <td class="px-4 py-3">{label(commission.payee_role, ROLE_LABELS)}</td>
                <td class="px-4 py-3">{label(commission.source_type, SOURCE_LABELS)}</td>
                <td class="px-4 py-3 font-mono font-bold">
                  {commissionAmount(commission) === null ? 'Indisponível' : formatCurrencyBrl(commissionAmount(commission))}
                </td>
                <td class="px-4 py-3">{label(commission.status, STATUS_LABELS)}</td>
                <td class="whitespace-nowrap px-4 py-3">{formatDateBr(commission.created_at)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</div>

<style>
  .finance-view { color: var(--paper); }
  .finance-card { border: 1px solid var(--glass-border-dark); border-radius: var(--radius); background: var(--ink-soft); padding: 1.25rem; }
  .finance-error { border-radius: var(--input-radius); background: var(--danger-bg); color: var(--danger); padding: 1rem; font-size: 0.875rem; }
  .finance-action { min-height: var(--input-height); border: 1px solid var(--muted-on-dark); border-radius: var(--input-radius); padding: 0.5rem 1rem; color: var(--paper); font-weight: 700; font-size: 0.875rem; cursor: pointer; }
  .finance-action:focus-visible { outline: 3px solid var(--yellow); outline-offset: 3px; }
  .finance-action:disabled { opacity: 0.6; cursor: wait; }
</style>
