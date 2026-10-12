<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getSystemStatus,
    getFinanceSummary,
    getFinanceBalance,
    listDocumentReviews,
    listHubs,
    getErrorMessage,
    type SystemStatusOut,
    type FinanceSummaryOut,
    type FinanceBalanceOut,
    type DocumentReviewOut,
    type HubOut,
  } from '@/lib/api';
  import { getStaffLogin } from '@/lib/session';
  import { formatCurrencyBrl } from '@/lib/utils';

  let user = getStaffLogin()?.user;
  let systemStatus: SystemStatusOut | null = null;
  let financeSummary: FinanceSummaryOut | null = null;
  let financeBalance: FinanceBalanceOut | null = null;
  let pendingReviews: DocumentReviewOut[] | null = null;
  let hubs: HubOut[] | null = null;

  let loading: boolean = true;
  let errorMsg: string | null = null;

  onMount(async () => {
    try {
      const [sys, finSum, finBal, reviews, hubsList] = await Promise.allSettled([
        getSystemStatus(),
        getFinanceSummary(),
        getFinanceBalance(),
        listDocumentReviews(),
        listHubs(),
      ]);

      if (sys.status === 'fulfilled') systemStatus = sys.value;
      if (finSum.status === 'fulfilled') financeSummary = finSum.value;
      if (finBal.status === 'fulfilled') financeBalance = finBal.value;
      if (reviews.status === 'fulfilled') pendingReviews = reviews.value;
      if (hubsList.status === 'fulfilled') hubs = hubsList.value;
      const failures = [sys, finSum, finBal, reviews, hubsList].filter((result) => result.status === 'rejected');
      if (failures.length) errorMsg = `${failures.length} consulta(s) indisponível(is). ${getErrorMessage((failures[0] as PromiseRejectedResult).reason)}`;
    } catch (err: any) {
      errorMsg = err?.message || 'Falha ao carregar indicadores';
    } finally {
      loading = false;
    }
  });
</script>

<div class="space-y-8">
  {#if errorMsg}<p role="alert" class="text-[var(--danger)]">{errorMsg}</p>{/if}
  <!-- Top Greeting & Cockpit Banner -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
    <div>
      <div class="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-400 mb-2">
        <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Soberania Operacional Staff</span>
      </div>
      <h1 class="font-display text-2xl sm:text-4xl text-white tracking-tight">
        Cockpit de Controle
      </h1>
      <p class="text-sm text-white/60 mt-1">
        Visão consolidada em tempo real da infraestrutura e operações do Supletivo Brasil
      </p>
    </div>

    <!-- Quick stats badge -->
    <div class="flex items-center gap-3">
      <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-right">
        <span class="block text-[10px] uppercase font-bold text-white/40">Status do Banco</span>
        <span class="text-xs font-mono font-bold text-emerald-400">
          {#if loading}
            Conectando...
          {:else if systemStatus?.db_ok === true || systemStatus?.database}
            Operacional
          {:else}
            Indisponível
          {/if}
        </span>
      </div>
    </div>
  </div>

  <!-- Key Metrics 4-Grid -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Card 1: Saldo Asaas -->
    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-brand-yellow/50 transition">
      <div class="flex items-center justify-between text-white/60 mb-3">
        <span class="text-xs font-bold uppercase tracking-wider">Saldo em Conta</span>
        <span class="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
      </div>
      <div class="font-display text-2xl text-white">
        {#if loading}
          <span class="text-white/30 text-lg">Carregando...</span>
        {:else}
          {financeBalance ? formatCurrencyBrl(financeBalance.balance) : 'Indisponível'}
        {/if}
      </div>
      <div class="mt-2 text-xs text-white/50 flex items-center justify-between">
        <span>Gateway Asaas</span>
        <a href="/financeiro" class="text-brand-yellow hover:underline">Ver extrato →</a>
      </div>
    </div>

    <!-- Card 2: Fila de Documentos -->
    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-amber-400/50 transition">
      <div class="flex items-center justify-between text-white/60 mb-3">
        <span class="text-xs font-bold uppercase tracking-wider">Fila de Revisão</span>
        <span class="p-2 rounded-lg bg-amber-500/10 text-amber-400">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </span>
      </div>
      <div class="font-display text-2xl text-white">
        {#if loading}
          <span class="text-white/30 text-lg">Carregando...</span>
        {:else}
          {pendingReviews === null ? 'Indisponível' : `${pendingReviews.length} dossiês`}
        {/if}
      </div>
      <div class="mt-2 text-xs text-white/50 flex items-center justify-between">
        <span>Triagem Biometria/RG</span>
        <a href="/documentos" class="text-brand-yellow hover:underline">Abrir fila →</a>
      </div>
    </div>

    <!-- Card 3: Polos Cadastrados -->
    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-sky-400/50 transition">
      <div class="flex items-center justify-between text-white/60 mb-3">
        <span class="text-xs font-bold uppercase tracking-wider">Polos Ativos</span>
        <span class="p-2 rounded-lg bg-sky-500/10 text-sky-400">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </span>
      </div>
      <div class="font-display text-2xl text-white">
        {#if loading}
          <span class="text-white/30 text-lg">Carregando...</span>
        {:else}
          {hubs === null ? 'Indisponível' : `${hubs.length} polos`}
        {/if}
      </div>
      <div class="mt-2 text-xs text-white/50 flex items-center justify-between">
        <span>Rede de polos físicos</span>
        <a href="/polos" class="text-brand-yellow hover:underline">Gerenciar →</a>
      </div>
    </div>

    <!-- Card 4: Fila de Comissões -->
    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-purple-400/50 transition">
      <div class="flex items-center justify-between text-white/60 mb-3">
        <span class="text-xs font-bold uppercase tracking-wider">Fila de Comissões</span>
        <span class="p-2 rounded-lg bg-purple-500/10 text-purple-400">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </span>
      </div>
      <div class="font-display text-2xl text-white">
        {#if loading}
          <span class="text-white/30 text-lg">Carregando...</span>
        {:else}
          {financeSummary ? formatCurrencyBrl(
            financeSummary?.commissions?.pending?.total
              ? Number(financeSummary.commissions.pending.total)
              : (financeSummary?.pending_commissions_cents ?? 0) / 100
          ) : 'Indisponível'}
        {/if}
      </div>
      <div class="mt-2 text-xs text-white/50 flex items-center justify-between">
        <span>Aguardando fechamento</span>
        <a href="/financeiro" class="text-brand-yellow hover:underline">Simular →</a>
      </div>
    </div>
  </div>

  <section class="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
    <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="font-display text-lg text-white">Próximas decisões</h2>
        <p class="text-xs text-white/50">Ações que exigem atenção do staff agora.</p>
      </div>
      <span class="text-xs text-white/40">Dados ao vivo das APIs staff</span>
    </div>
    <div class="mt-5 grid grid-cols-1 gap-2 md:grid-cols-2">
      <a href="/documentos" class="flex min-h-12 items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-brand-yellow/50 hover:bg-white/10">
        <span><strong class="block text-sm text-white">Revisões documentais</strong><span class="text-xs text-white/50">RG, comprovante e selfie aguardando decisão</span></span>
        <span class="font-display text-lg text-brand-yellow">{pendingReviews === null ? '—' : pendingReviews.length}</span>
      </a>
      <a href="/usuarios" class="flex min-h-12 items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-brand-yellow/50 hover:bg-white/10">
        <span><strong class="block text-sm text-white">Pessoas e matrículas</strong><span class="text-xs text-white/50">Leads, alunos, promotores e resgates</span></span>
        <span class="text-sm font-semibold text-brand-yellow">Abrir</span>
      </a>
      <a href="/polos" class="flex min-h-12 items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-brand-yellow/50 hover:bg-white/10">
        <span><strong class="block text-sm text-white">Rede de polos</strong><span class="text-xs text-white/50">Coordenadores e polo padrão</span></span>
        <span class="font-display text-lg text-brand-yellow">{hubs === null ? '—' : hubs.length}</span>
      </a>
      <a href="/financeiro" class="flex min-h-12 items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-brand-yellow/50 hover:bg-white/10">
        <span><strong class="block text-sm text-white">Fechamento semanal</strong><span class="text-xs text-white/50">Comissões aguardando repasse</span></span>
        <span class="text-sm font-semibold text-brand-yellow">Abrir</span>
      </a>
    </div>
  </section>
</div>
