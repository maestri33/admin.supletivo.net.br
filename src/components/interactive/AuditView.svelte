<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getSystemStatus,
    getIntegrations,
    type SystemStatusOut,
    type IntegrationStatusOut,
  } from '@/lib/api';
  import { ORACLE_URL } from '@/lib/config';

  let system: SystemStatusOut | null = null;
  let integrations: IntegrationStatusOut[] = [];
  let oracleData: any = null;

  let loading: boolean = true;
  let errorMsg: string | null = null;

  onMount(async () => {
    try {
      const [sysRes, integRes, oracleRes] = await Promise.allSettled([
        getSystemStatus(),
        getIntegrations(),
        fetch(ORACLE_URL).then((r) => r.json()),
      ]);

      if (sysRes.status === 'fulfilled') system = sysRes.value;
      if (integRes.status === 'fulfilled') integrations = integRes.value;
      if (oracleRes.status === 'fulfilled') oracleData = oracleRes.value;
    } catch (err: any) {
      errorMsg = err?.message || 'Falha ao carregar auditoria';
    } finally {
      loading = false;
    }
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between border-b border-white/10 pb-4">
    <div>
      <h1 class="font-display text-2xl text-white">Sistema & Auditoria Soberana</h1>
      <p class="text-xs text-white/60">Integridade dos serviços, saúde das integrações e release train global</p>
    </div>
  </div>

  {#if errorMsg}
    <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
      {errorMsg}
    </div>
  {/if}

  <!-- Oracle Release Train Card -->
  <div class="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 backdrop-blur-xl">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="h-3 w-3 rounded-full bg-emerald-400 animate-pulse"></span>
        <h2 class="font-display text-lg text-white">Oráculo de Versão Global da Plataforma</h2>
      </div>
      <a
        href={ORACLE_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs font-mono text-emerald-400 hover:underline"
      >
        version.v7m.live/api/version ↗
      </a>
    </div>

    {#if oracleData}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div class="rounded-xl bg-white/5 p-3">
          <span class="text-white/40 block">Versão Atual:</span>
          <span class="font-mono font-bold text-base text-emerald-300">{oracleData.version}</span>
        </div>
        <div class="rounded-xl bg-white/5 p-3">
          <span class="text-white/40 block">Último Módulo Atualizado:</span>
          <span class="font-bold text-white">{oracleData.last_module_updated || '—'}</span>
        </div>
        <div class="rounded-xl bg-white/5 p-3">
          <span class="text-white/40 block">Autorizado por:</span>
          <span class="font-bold text-white">{oracleData.authorized_by || 'Víctor'}</span>
        </div>
      </div>
      {#if oracleData.summary}
        <div class="mt-3 rounded-xl bg-white/5 p-3 text-xs text-white/70">
          <strong class="text-white">Último Release:</strong> {oracleData.summary}
        </div>
      {/if}
    {:else}
      <div class="text-xs text-white/40">Consultando oráculo...</div>
    {/if}
  </div>

  <!-- System Infra Status -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
      <h3 class="font-bold text-white text-sm uppercase tracking-wider text-white/60">Servidor & Banco de Dados</h3>
      <div class="space-y-2 text-xs">
        <div class="flex justify-between py-1 border-b border-white/5">
          <span class="text-white/50">Engine de Dados:</span>
          <span class="font-mono text-white">{system?.database || 'SQLite / Postgres'}</span>
        </div>
        <div class="flex justify-between py-1 border-b border-white/5">
          <span class="text-white/50">Horário do Servidor:</span>
          <span class="font-mono text-white">{system?.server_time || '—'}</span>
        </div>
        <div class="flex justify-between py-1">
          <span class="text-white/50">Cache Conectado:</span>
          <span class="font-bold text-emerald-400">Ativo</span>
        </div>
      </div>
    </div>

    <!-- Integrations -->
    <div class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
      <h3 class="font-bold text-white text-sm uppercase tracking-wider text-white/60">Integrações de Borda</h3>
      {#if integrations.length === 0}
        <div class="text-xs text-white/40 py-4">Nenhuma integração reportando falha.</div>
      {:else}
        <div class="space-y-2 text-xs">
          {#each integrations as integ}
            <div class="flex items-center justify-between py-1 border-b border-white/5">
              <span class="text-white font-medium">{integ.name}</span>
              <span class="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase {integ.is_healthy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                {integ.is_healthy ? 'Operacional' : 'Instável'}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
