<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listDocumentReviews,
    getUserDossier,
    decideDocument,
    type DocumentReviewOut,
    type UserDossierOut,
    getErrorMessage,
  } from '@/lib/api';
  import { formatDateBr, formatCpf } from '@/lib/utils';

  let reviews = $state<DocumentReviewOut[]>([]);
  let loading = $state(true);
  let errorMsg = $state<string | null>(null);
  let successMsg = $state<string | null>(null);

  let selectedDossier = $state<UserDossierOut | null>(null);
  let selectedReview = $state<DocumentReviewOut | null>(null);
  let dossierLoading = $state(false);
  let deciding = $state(false);
  let decisionReason = $state('');

  const TYPE_LABELS: Record<string, string> = {
    enrollment: 'Matrícula',
    candidate: 'Candidato a Promotor',
    student: 'Aluno',
  };

  const KIND_LABELS: Record<string, string> = {
    rg: 'RG / Identidade',
    cnh: 'CNH',
    selfie: 'Biometria / Selfie',
    address_proof: 'Comprovante de Endereço',
    student_doc: 'Documento Acadêmico',
  };

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendente',
    review: 'Em Revisão',
    approved: 'Aprovado',
    rejected: 'Reprovado',
  };

  function translateType(value?: string | null): string {
    if (!value) return 'Matrícula';
    return TYPE_LABELS[value.toLowerCase()] || value;
  }

  function translateKind(value?: string | null): string {
    if (!value) return 'Documento';
    return KIND_LABELS[value.toLowerCase()] || value;
  }

  function translateStatus(value?: string | null): string {
    if (!value) return 'Em Revisão';
    return STATUS_LABELS[value.toLowerCase()] || value;
  }

  async function loadReviews() {
    loading = true;
    errorMsg = null;
    try {
      reviews = await listDocumentReviews();
    } catch (err) {
      errorMsg = getErrorMessage(err);
    } finally {
      loading = false;
    }
  }

  async function openDossier(review: DocumentReviewOut) {
    const userId = review.user_external_id || review.external_id;
    if (!userId) return;
    selectedReview = review;
    decisionReason = '';
    dossierLoading = true;
    errorMsg = null;
    try {
      selectedDossier = await getUserDossier(userId);
    } catch (err) {
      errorMsg = getErrorMessage(err);
    } finally {
      dossierLoading = false;
    }
  }

  async function handleDecide(kind: string, approve: boolean) {
    if (!selectedDossier) return;
    deciding = true;
    errorMsg = null;
    try {
      const res = await decideDocument(selectedDossier.user_external_id, {
        kind,
        approve,
        reason:
          decisionReason.trim() ||
          (approve ? 'Aprovado na conferência do dossiê' : 'Reprovado na conferência do dossiê'),
      });
      successMsg = res.detail || (approve ? 'Documento aprovado!' : 'Documento reprovado.');
      selectedDossier = await getUserDossier(selectedDossier.user_external_id);
      await loadReviews();
    } catch (err) {
      errorMsg = getErrorMessage(err);
    } finally {
      deciding = false;
    }
  }

  onMount(() => {
    loadReviews();
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between border-b border-white/10 pb-4">
    <div>
      <h1 class="font-display text-2xl text-white">Fila de Revisão de Documentos</h1>
      <p class="text-xs text-white/60">Dossiês de alunos aguardando validação visual ou biométrica</p>
    </div>

    <button
      type="button"
      onclick={loadReviews}
      class="min-h-[48px] rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-white/80 transition cursor-pointer"
    >
      ↻ Atualizar Fila
    </button>
  </div>

  {#if errorMsg}
    <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
      {errorMsg}
    </div>
  {/if}

  {#if successMsg}
    <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
      {successMsg}
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
            <th class="px-4 py-3">Pessoa</th>
            <th class="px-4 py-3">CPF</th>
            <th class="px-4 py-3">Origem</th>
            <th class="px-4 py-3">Tipo</th>
            <th class="px-4 py-3">Triagem Jev</th>
            <th class="px-4 py-3">Envio</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3 text-right">Ação</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          {#each reviews as r}
            <tr class="hover:bg-white/5 transition">
              <td class="px-4 py-3 font-semibold text-white">{r.name || r.user_name || '—'}</td>
              <td class="px-4 py-3 font-mono">{formatCpf(r.cpf)}</td>
              <td class="px-4 py-3 text-white/70">{translateType(r.type)}</td>
              <td class="px-4 py-3 font-medium text-brand-yellow">{translateKind(r.kind || r.doc_type)}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5 flex-wrap">
                  {#if r.jev_triage}
                    <span class="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase {r.jev_triage.is_adult !== false ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                      {r.jev_triage.is_adult !== false ? '18+ Aprovado' : 'Menor 18'}
                    </span>
                    {#if r.jev_triage.legibility_score !== undefined}
                      <span class="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase bg-blue-500/20 text-blue-300">
                        Nitidez {r.jev_triage.legibility_score}/3
                      </span>
                    {/if}
                  {:else}
                    <span class="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {r.ai_verdict || 'Jev Validado'}
                    </span>
                  {/if}
                </div>
              </td>
              <td class="px-4 py-3 text-white/60">{formatDateBr(r.created_at || r.uploaded_at)}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {r.validation_status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : r.validation_status === 'rejected' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}">
                  {translateStatus(r.validation_status)}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  type="button"
                  onclick={() => openDossier(r)}
                  class="min-h-[48px] rounded-lg bg-brand-yellow/15 border border-brand-yellow/30 px-3.5 py-2 text-xs font-bold text-brand-yellow hover:bg-brand-yellow hover:text-brand-ink transition cursor-pointer"
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

  <!-- Painel Visual do Dossiê Completo (selectedDossier) -->
  {#if dossierLoading}
    <div class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-xs text-white/50">
      Carregando dossiê visual e biométrico...
    </div>
  {:else if selectedDossier}
    <div class="rounded-3xl border border-white/15 bg-white/5 p-6 sm:p-8 space-y-6 shadow-xl">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-brand-yellow">Dossiê Visual & Biométrico</span>
          <h2 class="font-display text-xl text-white mt-0.5">
            {selectedDossier.profile.name || selectedReview?.name || 'Usuário'}
          </h2>
          <p class="text-xs text-white/60 font-mono mt-0.5">
            CPF: {formatCpf(selectedDossier.profile.cpf)} • ID: {selectedDossier.user_external_id}
          </p>
        </div>

        <button
          type="button"
          onclick={() => (selectedDossier = null)}
          class="min-h-[48px] rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-bold text-white/80 cursor-pointer"
        >
          Fechar Dossiê
        </button>
      </div>

      <!-- Status de Validação de Documento e Biometria -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div class="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-1">
          <span class="text-[10px] font-bold uppercase text-white/40 block">Documento ({translateKind(selectedDossier.document_data.doc_type)})</span>
          <div class="flex items-center justify-between">
            <span class="text-white font-semibold">
              Status: {translateStatus(selectedDossier.document_data.validation_status)}
            </span>
            {#if selectedDossier.document_data.number}
              <span class="font-mono text-white/70">Nº {selectedDossier.document_data.number}</span>
            {/if}
          </div>
          {#if selectedDossier.document_data.validation_reason}
            <p class="text-white/60 text-[11px]">{selectedDossier.document_data.validation_reason}</p>
          {/if}
        </div>

        <div class="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-1">
          <span class="text-[10px] font-bold uppercase text-white/40 block">Biometria Facial (Selfie)</span>
          <div class="flex items-center justify-between">
            <span class="text-white font-semibold">
              Status: {translateStatus(selectedDossier.biometrics.selfie_status)}
            </span>
          </div>
          {#if selectedDossier.biometrics.selfie_reason}
            <p class="text-white/60 text-[11px]">{selectedDossier.biometrics.selfie_reason}</p>
          {/if}
        </div>
      </div>

      <!-- Galeria de Mídias do Dossiê (front_photo, back_photo, selfie_photo, address_photo) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {#if selectedDossier.media.front_photo}
          <div class="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-2">
            <span class="text-[10px] font-bold uppercase text-white/60 block">Frente do Documento</span>
            <img
              src={selectedDossier.media.front_photo}
              alt="Frente do Documento"
              class="w-full h-48 object-cover rounded-xl border border-white/10"
            />
          </div>
        {/if}

        {#if selectedDossier.media.back_photo}
          <div class="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-2">
            <span class="text-[10px] font-bold uppercase text-white/60 block">Verso do Documento</span>
            <img
              src={selectedDossier.media.back_photo}
              alt="Verso do Documento"
              class="w-full h-48 object-cover rounded-xl border border-white/10"
            />
          </div>
        {/if}

        {#if selectedDossier.media.selfie_photo}
          <div class="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-2">
            <span class="text-[10px] font-bold uppercase text-white/60 block">Foto de Biometria (Selfie)</span>
            <img
              src={selectedDossier.media.selfie_photo}
              alt="Selfie Biométrica"
              class="w-full h-48 object-cover rounded-xl border border-white/10"
            />
          </div>
        {/if}

        {#if selectedDossier.media.address_photo}
          <div class="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-2">
            <span class="text-[10px] font-bold uppercase text-white/60 block">Comprovante de Endereço</span>
            <img
              src={selectedDossier.media.address_photo}
              alt="Comprovante de Endereço"
              class="w-full h-48 object-cover rounded-xl border border-white/10"
            />
          </div>
        {/if}
      </div>

      <!-- Despacho Soberano -->
      <div class="border-t border-white/10 pt-4 space-y-3">
        <label for="dossier-reason" class="block text-xs font-semibold text-white/80">
          Parecer / Justificativa da Conferência
        </label>
        <input
          id="dossier-reason"
          type="text"
          bind:value={decisionReason}
          placeholder="Informe a justificativa em caso de reprovação ou observação..."
          class="w-full min-h-[48px] rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs text-white"
        />

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={deciding}
            onclick={() => handleDecide('rg', true)}
            class="min-h-[48px] rounded-xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-300 transition cursor-pointer"
          >
            ✓ Aprovar Documento
          </button>
          <button
            type="button"
            disabled={deciding}
            onclick={() => handleDecide('rg', false)}
            class="min-h-[48px] rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 px-4 py-2 text-xs font-bold text-rose-300 transition cursor-pointer"
          >
            ✕ Reprovar Documento
          </button>
          <button
            type="button"
            disabled={deciding}
            onclick={() => handleDecide('selfie', true)}
            class="min-h-[48px] rounded-xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-300 transition cursor-pointer"
          >
            ✓ Aprovar Selfie
          </button>
          <button
            type="button"
            disabled={deciding}
            onclick={() => handleDecide('selfie', false)}
            class="min-h-[48px] rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 px-4 py-2 text-xs font-bold text-rose-300 transition cursor-pointer"
          >
            ✕ Reprovar Selfie
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
