<script lang="ts">
  import { onMount } from 'svelte';
  import { listDocumentReviews, type DocumentReviewOut } from '@/lib/api';
  import { formatDateBr, formatCpf } from '@/lib/utils';

  let reviews: DocumentReviewOut[] = [];
  let loading: boolean = true;
  let errorMsg: string | null = null;

  onMount(async () => {
    try {
      reviews = await listDocumentReviews();
    } catch (err: any) {
      errorMsg = err?.message || 'Falha ao carregar fila de documentos';
    } finally {
      loading = false;
    }
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between border-b border-white/10 pb-4">
    <div>
      <h1 class="font-display text-2xl text-white">Fila de Revisão de Documentos</h1>
      <p class="text-xs text-white/60">Dossiês de alunos aguardando validação visual ou biométrica</p>
    </div>
  </div>

  {#if errorMsg}
    <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
      {errorMsg}
    </div>
  {/if}

  {#if loading}
    <div class="py-12 text-center text-sm text-white/40">Carregando fila de documentos...</div>
  {:else if reviews.length === 0}
    <div class="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-white/40">
      🎉 Nenhum documento pendente na fila no momento!
    </div>
  {:else}
    <div class="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
      <table class="w-full text-left text-xs text-white/80">
        <thead class="border-b border-white/10 bg-white/5 uppercase font-bold text-[10px] text-white/50 tracking-wider">
          <tr>
            <th class="px-4 py-3">Aluno</th>
            <th class="px-4 py-3">CPF</th>
            <th class="px-4 py-3">Tipo</th>
            <th class="px-4 py-3">Envio</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3 text-right">Ação</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          {#each reviews as r}
            <tr class="hover:bg-white/5 transition">
              <td class="px-4 py-3 font-semibold text-white">{r.user_name || '—'}</td>
              <td class="px-4 py-3 font-mono">{formatCpf(r.cpf)}</td>
              <td class="px-4 py-3 font-medium uppercase text-brand-yellow">{r.doc_type}</td>
              <td class="px-4 py-3 text-white/60">{formatDateBr(r.uploaded_at)}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {r.validation_status === 'pending' ? 'bg-amber-500/20 text-amber-300' : r.validation_status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                  {r.validation_status}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  type="button"
                  class="rounded-lg bg-brand-yellow/15 border border-brand-yellow/30 px-2.5 py-1 text-xs font-bold text-brand-yellow hover:bg-brand-yellow hover:text-brand-ink transition"
                >
                  Abrir Dossiê
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
