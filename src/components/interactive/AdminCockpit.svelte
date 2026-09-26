<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getSystemStatus,
    getFinanceSummary,
    getFinanceBalance,
    listDocumentReviews,
    listHubs,
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
  let pendingReviews: DocumentReviewOut[] = [];
  let hubs: HubOut[] = [];

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
    } catch (err: any) {
      errorMsg = err?.message || 'Falha ao carregar indicadores';
    } finally {
      loading = false;
    }
  });
</script>

<div class="space-y-8">
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
          {systemStatus?.database ?? (loading ? 'Conectando...' : 'Ativo')}
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
          {formatCurrencyBrl(financeBalance?.balance ?? 0)}
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
          {pendingReviews.length} <span class="text-xs font-sans text-white/50 font-normal">dossiês</span>
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
          {hubs.length} <span class="text-xs font-sans text-white/50 font-normal">hubs</span>
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
          {formatCurrencyBrl((financeSummary?.pending_commissions_cents ?? 0) / 100)}
        {/if}
      </div>
      <div class="mt-2 text-xs text-white/50 flex items-center justify-between">
        <span>Aguardando fechamento</span>
        <a href="/financeiro" class="text-brand-yellow hover:underline">Simular →</a>
      </div>
    </div>
  </div>

  <!-- Operational Modules Grid -->
  <div>
    <h2 class="font-display text-lg text-white mb-4 flex items-center gap-2">
      <span>Módulos de Gestão Soberana</span>
      <span class="text-xs font-sans text-white/40 font-normal">(Direto nas APIs /api/v1/staff/*)</span>
    </h2>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Módulo Polos -->
      <a href="/polos" class="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition block group">
        <div class="flex items-center gap-3 mb-2">
          <div class="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
            🏛️
          </div>
          <div>
            <h3 class="font-bold text-white text-base">Polos & Coordenadores</h3>
            <p class="text-xs text-white/50">Criação de polos, coordenadores e padrão regional</p>
          </div>
        </div>
      </a>

      <!-- Módulo Documentos -->
      <a href="/documentos" class="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition block group">
        <div class="flex items-center gap-3 mb-2">
          <div class="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
            📋
          </div>
          <div>
            <h3 class="font-bold text-white text-base">Dossiês & Documentos</h3>
            <p class="text-xs text-white/50">Revisão visual e aprovação soberana de alunos</p>
          </div>
        </div>
      </a>

      <!-- Módulo Financeiro -->
      <a href="/financeiro" class="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition block group">
        <div class="flex items-center gap-3 mb-2">
          <div class="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
            💰
          </div>
          <div>
            <h3 class="font-bold text-white text-base">Gestão Financeira & Payouts</h3>
            <p class="text-xs text-white/50">Fechamentos, extrato contábil, saldo Asaas e ledger</p>
          </div>
        </div>
      </a>

      <!-- Módulo Usuários & Alunos -->
      <a href="/usuarios" class="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition block group">
        <div class="flex items-center gap-3 mb-2">
          <div class="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
            👥
          </div>
          <div>
            <h3 class="font-bold text-white text-base">Usuários, Leads & Alunos</h3>
            <p class="text-xs text-white/50">Matrículas, liberação LMS e resgate de cadastros</p>
          </div>
        </div>
      </a>

      <!-- Módulo Treinamento -->
      <a href="/treinamento" class="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition block group">
        <div class="flex items-center gap-3 mb-2">
          <div class="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition">
            📚
          </div>
          <div>
            <h3 class="font-bold text-white text-base">Catálogo de Treinamento</h3>
            <p class="text-xs text-white/50">Matérias para promotores, gabaritos e override</p>
          </div>
        </div>
      </a>

      <!-- Módulo Sistema & Auditoria -->
      <a href="/auditoria" class="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition block group">
        <div class="flex items-center gap-3 mb-2">
          <div class="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
            🛡️
          </div>
          <div>
            <h3 class="font-bold text-white text-base">Sistema, Versão & Auditoria</h3>
            <p class="text-xs text-white/50">Oráculo Release Train, logs de IA e integrações</p>
          </div>
        </div>
      </a>
    </div>
  </div>
</div>
