<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getFinanceBalance,
    getFinanceSummary,
    listCommissions,
    type FinanceBalanceOut,
    type FinanceSummaryOut,
    type StaffCommissionOut,
  } from '@/lib/api';
  import { formatCurrencyBrl, formatDateBr } from '@/lib/utils';

  let balance: FinanceBalanceOut | null = null;
  let summary: FinanceSummaryOut | null = null;
  let commissions: StaffCommissionOut[] = [];
  let loading: boolean = true;
  let errorMsg: string | null = null;

  const ROLE_LABELS: Record<string, string> = {
    promoter: 'Promotor',
    coordinator: 'Coordenador de Polo',
    staff: 'Administrador',
  };

  const SOURCE_LABELS: Record<string, string> = {
    enrollment: 'Matrícula',
    manual: 'Lançamento Manual',
    bonus: 'Bônus Semanal',
    referral: 'Indicação',
  };

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendente',
    queued: 'Na Fila',
    paid: 'Pago',
    canceled: 'Cancelado',
    failed: 'Falhou',
  };

  function translatePayeeRole(role?: string | null): string {
    if (!role) return 'Promotor';
    return ROLE_LABELS[role.toLowerCase()] || role;
  }

  function translateSourceType(source?: string | null): string {
    if (!source) return 'Matrícula';
    return SOURCE_LABELS[source.toLowerCase()] || source;
  }

  function translateStatus(status?: string | null): string {
    if (!status) return 'Pendente';
    return STATUS_LABELS[status.toLowerCase()] || status;
  }

  function getPendingTotal(sum: FinanceSummaryOut | null): number {
    if (!sum) return 0;
    if (sum.commissions?.pending?.total !== undefined) {
      return Number(sum.commissions.pending.total) || 0;
    }
    return (sum.pending_commissions_cents ?? 0) / 100;
  }

  function getPaidTotal(sum: FinanceSummaryOut | null): number {
    if (!sum) return 0;
    if (sum.commissions?.paid?.total !== undefined) {
      return Number(sum.commissions.paid.total) || 0;
    }
    return (sum.paid_commissions_cents ?? 0) / 100;
  }

  function getCommissionAmount(c: StaffCommissionOut): number {
    if (c.amount !== undefined) {
      return Number(c.amount) || 0;
    }
    return (c.amount_cents ?? 0) / 100;
  }

  onMount(async () => {
    try {
      const [balRes, sumRes, commRes] = await Promise.allSettled([
        getFinanceBalance(),
        getFinanceSummary(),
        listCommissions(),
      ]);
      if (balRes.status === 'fulfilled') balance = balRes.value;
      if (sumRes.status === 'fulfilled') summary = sumRes.value;
      if (commRes.status === 'fulfilled') commissions = commRes.value;
    } catch (err: any) {
      errorMsg = err?.message || 'Falha ao carregar dados financeiros';
    } finally {
      loading = false;
    }
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between border-b border-white/10 pb-4">
    <div>
      <h1 class="font-display text-2xl text-white">Gestão Financeira & Repasses</h1>
      <p class="text-xs text-white/60">Controle soberano de saldos Asaas, comissões e fechamentos</p>
    </div>
  </div>

  {#if errorMsg}
    <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
      {errorMsg}
    </div>
  {/if}

  <!-- Balance Banner -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
      <span class="text-xs font-bold uppercase tracking-wider text-white/50">Saldo Disponível</span>
      <div class="font-display text-2xl text-emerald-400 mt-1">
        {formatCurrencyBrl(balance?.balance ?? 0)}
      </div>
      <span class="text-[11px] text-white/40">Conta Principal Asaas</span>
    </div>

    <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
      <span class="text-xs font-bold uppercase tracking-wider text-white/50">Comissões Pendentes</span>
      <div class="font-display text-2xl text-amber-400 mt-1">
        {formatCurrencyBrl(getPendingTotal(summary))}
      </div>
      <span class="text-[11px] text-white/40">Aguardando ciclo semanal</span>
    </div>

    <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
      <span class="text-xs font-bold uppercase tracking-wider text-white/50">Total Pago Histórico</span>
      <div class="font-display text-2xl text-purple-400 mt-1">
        {formatCurrencyBrl(getPaidTotal(summary))}
      </div>
      <span class="text-[11px] text-white/40">Liquidado via PIX</span>
    </div>
  </div>

  <!-- Commissions Table -->
  <div class="space-y-3">
    <h2 class="font-display text-lg text-white">Últimas Comissões Geradas</h2>
    {#if loading}
      <div class="py-8 text-center text-sm text-white/40">Carregando comissões...</div>
    {:else if commissions.length === 0}
      <div class="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-white/40">
        Nenhuma comissão registrada até o momento.
      </div>
    {:else}
      <div class="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <table class="w-full text-left text-xs text-white/80">
          <thead class="border-b border-white/10 bg-white/5 uppercase font-bold text-[10px] text-white/50 tracking-wider">
            <tr>
              <th class="px-4 py-3">Beneficiário</th>
              <th class="px-4 py-3">Papel</th>
              <th class="px-4 py-3">Origem</th>
              <th class="px-4 py-3">Valor</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            {#each commissions as c}
              <tr class="hover:bg-white/5 transition">
                <td class="px-4 py-3 font-semibold text-white">
                  {c.beneficiary_name || c.payee_external_id || '—'}
                </td>
                <td class="px-4 py-3 text-white/70">{translatePayeeRole(c.payee_role)}</td>
                <td class="px-4 py-3 text-white/60">{translateSourceType(c.source_type)}</td>
                <td class="px-4 py-3 font-mono font-bold text-emerald-400">
                  {formatCurrencyBrl(getCommissionAmount(c))}
                </td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {c.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}">
                    {translateStatus(c.status)}
                  </span>
                </td>
                <td class="px-4 py-3 text-white/60">{formatDateBr(c.created_at)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
