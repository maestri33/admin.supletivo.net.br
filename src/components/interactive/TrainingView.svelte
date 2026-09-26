<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listMaterials,
    createMaterial,
    publishMaterial,
    deleteMaterial,
    uploadMaterialVideo,
    listTrainingSubmissions,
    overrideTrainingSubmission,
    unlockPromoterTraining,
    type StaffMaterialOut,
    type MaterialIn,
    type TrainingSubmissionOut,
    getErrorMessage,
  } from '@/lib/api';
  import { formatDateBr } from '@/lib/utils';
  import Modal from '@/components/ui/Modal.svelte';

  // Active view tab: "catalog" | "submissions"
  let activeTab = $state<'catalog' | 'submissions'>('catalog');

  // Materials state
  let materials = $state<StaffMaterialOut[]>([]);
  let materialsLoading = $state(true);

  // Submissions state
  let submissions = $state<TrainingSubmissionOut[]>([]);
  let submissionsLoading = $state(false);
  let submissionFilter = $state<string>('');

  // Global messages
  let errorMsg = $state<string | null>(null);
  let successMsg = $state<string | null>(null);

  // Modal: Create Material
  let isCreateModalOpen = $state(false);
  let newTitle = $state('');
  let newQuestion = $state('');
  let newExpectedAnswer = $state('');
  let newTextContent = $state('');
  let newOrder = $state(1);
  let newKind = $state<'fixed' | 'transitory'>('fixed');
  let newBlocking = $state(true);
  let newEphemeral = $state(false);
  let isSubmittingMaterial = $state(false);
  let createMaterialError = $state<string | null>(null);

  // Modal: Video Upload
  let isVideoModalOpen = $state(false);
  let selectedMaterialForVideo = $state<StaffMaterialOut | null>(null);
  let videoFileInput: HTMLInputElement | null = null;
  let isUploadingVideo = $state(false);
  let videoUploadError = $state<string | null>(null);

  // Modal: Override Submission
  let isOverrideModalOpen = $state(false);
  let selectedSubmission = $state<TrainingSubmissionOut | null>(null);
  let overrideGrade = $state('10.0');
  let overrideApprove = $state(true);
  let overrideJustification = $state('');
  let isSubmittingOverride = $state(false);
  let overrideError = $state<string | null>(null);

  // Unlocking Promoter
  let isUnlocking = $state(false);

  async function loadMaterials() {
    materialsLoading = true;
    try {
      materials = await listMaterials();
    } catch (err) {
      errorMsg = getErrorMessage(err);
    } finally {
      materialsLoading = false;
    }
  }

  async function loadSubmissions() {
    submissionsLoading = true;
    try {
      submissions = await listTrainingSubmissions(submissionFilter || undefined);
    } catch (err) {
      errorMsg = getErrorMessage(err);
    } finally {
      submissionsLoading = false;
    }
  }

  function handleTabChange(tab: 'catalog' | 'submissions') {
    activeTab = tab;
    if (tab === 'submissions' && submissions.length === 0) {
      loadSubmissions();
    }
  }

  // --- Material Actions ---

  function openCreateMaterialModal() {
    createMaterialError = null;
    newTitle = '';
    newQuestion = '';
    newExpectedAnswer = '';
    newTextContent = '';
    newOrder = materials.length + 1;
    newKind = 'fixed';
    newBlocking = true;
    newEphemeral = false;
    isCreateModalOpen = true;
  }

  async function submitCreateMaterial() {
    if (!newTitle.trim() || !newQuestion.trim() || !newExpectedAnswer.trim()) {
      createMaterialError = 'Título, Pergunta e Gabarito da IA são obrigatórios.';
      return;
    }
    isSubmittingMaterial = true;
    createMaterialError = null;
    try {
      await createMaterial({
        title: newTitle,
        question: newQuestion,
        expected_answer: newExpectedAnswer,
        text_content: newTextContent,
        order: newOrder,
        kind: newKind,
        blocking: newBlocking,
        ephemeral: newEphemeral,
      });
      isCreateModalOpen = false;
      successMsg = `Matéria "${newTitle}" criada com sucesso!`;
      await loadMaterials();
    } catch (err) {
      createMaterialError = getErrorMessage(err);
    } finally {
      isSubmittingMaterial = false;
    }
  }

  async function handlePublishTransitory(material: StaffMaterialOut) {
    if (!confirm(`Deseja publicar a matéria transitória "${material.title}" para todos os promotores existentes?`)) {
      return;
    }
    try {
      const res = await publishMaterial(material.external_id);
      successMsg = `Matéria publicada! Atribuída a ${res.assigned} promotores ativos.`;
      await loadMaterials();
    } catch (err) {
      errorMsg = getErrorMessage(err);
    }
  }

  async function handleDeleteMaterial(material: StaffMaterialOut) {
    if (!confirm(`Tem certeza que deseja excluir a matéria efêmera "${material.title}"?`)) {
      return;
    }
    try {
      await deleteMaterial(material.external_id);
      successMsg = `Matéria excluída com sucesso.`;
      await loadMaterials();
    } catch (err) {
      errorMsg = getErrorMessage(err);
    }
  }

  function openVideoModal(material: StaffMaterialOut) {
    selectedMaterialForVideo = material;
    videoUploadError = null;
    isVideoModalOpen = true;
  }

  async function handleVideoUpload() {
    if (!selectedMaterialForVideo || !videoFileInput?.files?.[0]) {
      videoUploadError = 'Selecione um arquivo de vídeo (.mp4, .webm ou .mov).';
      return;
    }
    const file = videoFileInput.files[0];
    isUploadingVideo = true;
    videoUploadError = null;
    try {
      await uploadMaterialVideo(selectedMaterialForVideo.external_id, file);
      isVideoModalOpen = false;
      successMsg = `Vídeo da matéria "${selectedMaterialForVideo.title}" enviado com sucesso!`;
      await loadMaterials();
    } catch (err) {
      videoUploadError = getErrorMessage(err);
    } finally {
      isUploadingVideo = false;
    }
  }

  // --- Submissions Actions ---

  function openOverrideModal(submission: TrainingSubmissionOut) {
    selectedSubmission = submission;
    overrideGrade = submission.grade || '10.0';
    overrideApprove = true;
    overrideJustification = 'Aprovado manualmente pela auditoria de Staff.';
    overrideError = null;
    isOverrideModalOpen = true;
  }

  async function submitOverride() {
    if (!selectedSubmission) return;
    isSubmittingOverride = true;
    overrideError = null;
    try {
      await overrideTrainingSubmission(selectedSubmission.external_id, {
        grade: overrideGrade,
        approve: overrideApprove,
        justification: overrideJustification,
      });
      isOverrideModalOpen = false;
      successMsg = `Submissão atualizada com sucesso (${overrideApprove ? 'Aprovada' : 'Reprovada'}).`;
      await loadSubmissions();
    } catch (err) {
      overrideError = getErrorMessage(err);
    } finally {
      isSubmittingOverride = false;
    }
  }

  async function handleUnlockPromoter(promoterId: string, promoterName: string) {
    if (!confirm(`Deseja desbloquear o promotor "${promoterName}"? Todas as matérias pendentes serão aprovadas.`)) {
      return;
    }
    isUnlocking = true;
    try {
      await unlockPromoterTraining(promoterId);
      successMsg = `Promotor ${promoterName} desbloqueado com sucesso!`;
      await loadSubmissions();
    } catch (err) {
      errorMsg = getErrorMessage(err);
    } finally {
      isUnlocking = false;
    }
  }

  onMount(() => {
    loadMaterials();
  });
</script>

<div class="space-y-6">
  <!-- Header with tabs -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
    <div>
      <div class="flex items-center gap-3">
        <h1 class="font-display text-2xl sm:text-3xl text-white tracking-wide">Treinamento & LMS</h1>
        <span class="rounded-full bg-brand-yellow/10 border border-brand-yellow/30 px-2.5 py-0.5 text-xs font-semibold text-brand-yellow">
          {materials.length} {materials.length === 1 ? 'matéria' : 'matérias'}
        </span>
      </div>
      <p class="text-xs sm:text-sm text-white/60 mt-1">
        Autoria de matérias com correção por IA (Gabarito aberto), upload de vídeos e auditoria de áudios de promotores.
      </p>
    </div>

    <!-- Navigation between Catalog and Submissions Queue -->
    <div class="flex items-center gap-2">
      <div class="flex rounded-xl bg-white/5 p-1 border border-white/10">
        <button
          onclick={() => handleTabChange('catalog')}
          class="rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer {activeTab === 'catalog'
            ? 'bg-brand-yellow text-brand-ink shadow'
            : 'text-white/60 hover:text-white'}"
        >
          Catálogo de Matérias
        </button>
        <button
          onclick={() => handleTabChange('submissions')}
          class="rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer {activeTab === 'submissions'
            ? 'bg-brand-yellow text-brand-ink shadow'
            : 'text-white/60 hover:text-white'}"
        >
          Fila de Submissões & Áudios
        </button>
      </div>

      {#if activeTab === 'catalog'}
        <button
          onclick={openCreateMaterialModal}
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--yellow)] px-4 py-2 text-xs font-bold text-[var(--ink)] shadow-lg shadow-[var(--yellow)]/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Nova Matéria
        </button>
      {/if}
    </div>
  </div>

  <!-- Messages -->
  {#if errorMsg}
    <div class="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center justify-between">
      <span>{errorMsg}</span>
      <button onclick={() => (errorMsg = null)} class="text-white/60 hover:text-white">✕</button>
    </div>
  {/if}

  {#if successMsg}
    <div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center justify-between">
      <span>{successMsg}</span>
      <button onclick={() => (successMsg = null)} class="text-white/60 hover:text-white">✕</button>
    </div>
  {/if}

  <!-- TAB 1: CATÁLOGO DE MATÉRIAS -->
  {#if activeTab === 'catalog'}
    {#if materialsLoading}
      <div class="py-20 text-center text-sm text-white/40 flex flex-col items-center gap-3">
        <div class="w-8 h-8 rounded-full border-2 border-brand-yellow border-t-transparent animate-spin"></div>
        Carregando catálogo de matérias...
      </div>
    {:else if materials.length === 0}
      <div class="rounded-3xl border border-dashed border-white/15 bg-white/5 p-12 text-center space-y-4">
        <div class="w-12 h-12 rounded-2xl bg-brand-yellow/10 border border-brand-yellow/20 mx-auto flex items-center justify-center text-brand-yellow">
          📚
        </div>
        <h3 class="text-lg font-bold text-white">Nenhuma matéria de treinamento cadastrada</h3>
        <p class="text-xs text-white/50 max-w-md mx-auto">
          Crie a primeira matéria com enunciado, conteúdo de texto, gabarito esperado para a IA e vídeo instrucional.
        </p>
        <button
          onclick={openCreateMaterialModal}
          class="inline-flex items-center gap-2 rounded-xl bg-[var(--yellow)] px-5 py-2.5 text-xs font-bold text-[var(--ink)] hover:brightness-110 cursor-pointer"
        >
          + Criar Primeira Matéria
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {#each materials as m (m.external_id)}
          <div class="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl flex flex-col justify-between gap-4 hover:border-white/20 transition-all shadow-lg">
            <div class="space-y-3">
              <!-- Top Badges -->
              <div class="flex items-center justify-between gap-2">
                <span class="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white font-mono">
                  #{m.order}
                </span>

                <div class="flex items-center gap-1.5 flex-wrap justify-end">
                  <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {m.kind === 'fixed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'}">
                    {m.kind === 'fixed' ? 'Fixa (Onboarding)' : 'Transitória'}
                  </span>

                  {#if m.blocking}
                    <span class="rounded-full bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-300 uppercase">
                      Trava Painel
                    </span>
                  {:else}
                    <span class="rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-[10px] font-bold text-white/60 uppercase">
                      Opcional
                    </span>
                  {/if}

                  {#if m.ephemeral}
                    <span class="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                      Efêmera
                    </span>
                  {/if}
                </div>
              </div>

              <!-- Title & Question -->
              <div>
                <h3 class="font-bold text-white text-base leading-snug">{m.title}</h3>
                <p class="text-xs text-white/70 mt-2 bg-black/20 p-3 rounded-xl border border-white/5 line-clamp-3">
                  <span class="text-brand-yellow font-semibold">Pergunta:</span> {m.question}
                </p>
              </div>

              <!-- Gabarito IA -->
              {#if m.expected_answer}
                <div class="text-[11px] text-white/50 bg-black/10 p-2.5 rounded-xl border border-white/5">
                  <span class="text-emerald-400 font-bold block mb-0.5">Gabarito Esperado (Rubrica IA):</span>
                  <p class="line-clamp-2">{m.expected_answer}</p>
                </div>
              {/if}
            </div>

            <!-- Footer & Actions -->
            <div class="border-t border-white/10 pt-3 space-y-2">
              <div class="flex items-center justify-between text-xs">
                {#if m.video}
                  <span class="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                    ✓ Vídeo anexado
                  </span>
                {:else}
                  <span class="text-white/40 text-[11px]">Sem vídeo instrucional</span>
                {/if}

                <button
                  onclick={() => openVideoModal(m)}
                  class="rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white transition-all cursor-pointer"
                >
                  {m.video ? 'Trocar Vídeo' : 'Anexar Vídeo'}
                </button>
              </div>

              <div class="flex items-center justify-between gap-2 pt-1">
                {#if m.kind === 'transitory'}
                  <button
                    onclick={() => handlePublishTransitory(m)}
                    class="rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    📢 Publicar p/ Promotores
                  </button>
                {/if}

                {#if m.ephemeral}
                  <button
                    onclick={() => handleDeleteMaterial(m)}
                    class="rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ml-auto"
                  >
                    Descartar
                  </button>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- TAB 2: FILA DE SUBMISSÕES & ÁUDIOS -->
  {#if activeTab === 'submissions'}
    <div class="space-y-4">
      <!-- Submissions Filter Bar -->
      <div class="flex items-center justify-between gap-4 bg-white/5 p-3 rounded-2xl border border-white/10">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-white/50 uppercase">Filtrar Status:</span>
          <select
            bind:value={submissionFilter}
            onchange={loadSubmissions}
            class="rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white outline-none focus:border-brand-yellow"
          >
            <option value="">Todas as submissões</option>
            <option value="pending">Apenas Pendentes (Corrigindo)</option>
            <option value="approved">Aprovadas</option>
            <option value="rejected">Reprovadas</option>
          </select>
        </div>

        <button
          onclick={loadSubmissions}
          class="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 transition-all cursor-pointer"
        >
          ↻ Atualizar Fila
        </button>
      </div>

      {#if submissionsLoading}
        <div class="py-20 text-center text-sm text-white/40 flex flex-col items-center gap-3">
          <div class="w-8 h-8 rounded-full border-2 border-brand-yellow border-t-transparent animate-spin"></div>
          Carregando submissões e áudios gravados...
        </div>
      {:else if submissions.length === 0}
        <div class="rounded-3xl border border-dashed border-white/15 bg-white/5 p-12 text-center text-sm text-white/40">
          Nenhuma submissão encontrada com o filtro selecionado.
        </div>
      {:else}
        <div class="space-y-3">
          {#each submissions as sub (sub.external_id)}
            <div class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <!-- Promoter and Material Info -->
              <div class="space-y-1.5 max-w-xl">
                <div class="flex items-center gap-2">
                  <h4 class="font-bold text-white text-sm">{sub.user_name}</h4>
                  {#if sub.user_phone}
                    <span class="text-xs text-white/40 font-mono">({sub.user_phone})</span>
                  {/if}
                  <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {sub.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : sub.status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
                    {sub.status === 'approved' ? 'Aprovada' : sub.status === 'rejected' ? 'Reprovada' : 'Pendente'}
                  </span>
                </div>

                <p class="text-xs text-brand-yellow font-medium">Matéria: {sub.material_title}</p>
                <p class="text-xs text-white/60">
                  <strong class="text-white/80">Questão:</strong> {sub.material_question}
                </p>

                <!-- Transcribed Answer or Direct Answer -->
                <div class="rounded-xl bg-black/30 p-3 border border-white/5 text-xs text-white/90 mt-2">
                  <strong class="text-white/40 block text-[10px] uppercase mb-1">Resposta do Promotor:</strong>
                  <p class="italic">{sub.answer || 'Resposta gravada em áudio (ver player abaixo)'}</p>
                </div>

                <!-- Inline Audio Player if audio_url exists -->
                {#if sub.audio_url}
                  <div class="pt-2 flex items-center gap-2">
                    <span class="text-[10px] font-bold uppercase text-white/40">Áudio:</span>
                    <audio controls src={sub.audio_url} class="h-8 max-w-xs rounded-lg"></audio>
                  </div>
                {/if}
              </div>

              <!-- AI Evaluation & Staff Override -->
              <div class="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 border-t lg:border-t-0 border-white/10 pt-3 lg:pt-0">
                <div class="text-right space-y-1">
                  {#if sub.grade !== null && sub.grade !== undefined}
                    <div class="flex items-center lg:justify-end gap-2">
                      <span class="text-xs text-white/50">Nota IA:</span>
                      <span class="text-lg font-bold font-mono {Number(sub.grade) >= 6 ? 'text-emerald-400' : 'text-rose-400'}">
                        {sub.grade} / 10
                      </span>
                    </div>
                  {/if}

                  {#if sub.justification}
                    <p class="text-[11px] text-white/50 max-w-xs text-left lg:text-right line-clamp-2" title={sub.justification}>
                      "{sub.justification}"
                    </p>
                  {/if}

                  <span class="text-[10px] text-white/30 block font-mono">
                    {formatDateBr(sub.created_at)}
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    onclick={() => openOverrideModal(sub)}
                    class="rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 px-3.5 py-1.5 text-xs font-bold text-white transition-all cursor-pointer"
                  >
                    Ajustar / Override
                  </button>

                  <button
                    disabled={isUnlocking}
                    onclick={() => handleUnlockPromoter(sub.user_external_id, sub.user_name)}
                    class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold text-emerald-300 transition-all cursor-pointer"
                    title="Aprova todas as matérias pendentes e libera o painel do promotor"
                  >
                    Liberar Promotor
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Modal: Criar Nova Matéria -->
<Modal
  isOpen={isCreateModalOpen}
  onClose={() => (isCreateModalOpen = false)}
  title="Nova Matéria de Treinamento"
  eyebrow="LMS & Autoria"
  eyebrowVariant="yellow"
  description="Crie uma nova matéria de capacitação com pergunta aberta e gabarito esperado para correção automática pela IA."
  size="lg"
>
  {#snippet children()}
    <form onsubmit={(e) => { e.preventDefault(); submitCreateMaterial(); }} class="space-y-4 text-xs">
      {#if createMaterialError}
        <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-300">
          {createMaterialError}
        </div>
      {/if}

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="sm:col-span-2">
          <label for="mat-title" class="block font-bold text-white/70 mb-1 uppercase text-[10px]">Título da Matéria *</label>
          <input
            id="mat-title"
            type="text"
            required
            placeholder="Ex: Como abordar leads no WhatsApp..."
            bind:value={newTitle}
            class="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-white outline-none focus:border-brand-yellow"
          />
        </div>
        <div>
          <label for="mat-order" class="block font-bold text-white/70 mb-1 uppercase text-[10px]">Ordem de Exibição</label>
          <input
            id="mat-order"
            type="number"
            min="1"
            bind:value={newOrder}
            class="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-white outline-none focus:border-brand-yellow"
          />
        </div>
      </div>

      <!-- Configurações: Tipo e Trava -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black/20 p-3.5 rounded-2xl border border-white/5">
        <div>
          <label for="mat-kind" class="block font-bold text-white/70 mb-1 uppercase text-[10px]">Tipo de Matéria</label>
          <select
            id="mat-kind"
            bind:value={newKind}
            class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none focus:border-brand-yellow"
          >
            <option value="fixed" class="bg-brand-ink text-white">Fixa (Todo novo promotor)</option>
            <option value="transitory" class="bg-brand-ink text-white">Transitória (Publicada sob demanda)</option>
          </select>
        </div>

        <div class="flex items-center gap-2 pt-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={newBlocking}
              class="rounded border-white/20 bg-white/10 text-brand-yellow focus:ring-brand-yellow w-4 h-4"
            />
            <span class="text-white/80 font-medium">Obrigatória (Trava o Painel)</span>
          </label>
        </div>

        <div class="flex items-center gap-2 pt-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={newEphemeral}
              class="rounded border-white/20 bg-white/10 text-brand-yellow focus:ring-brand-yellow w-4 h-4"
            />
            <span class="text-white/80 font-medium">Efêmera (Descartável)</span>
          </label>
        </div>
      </div>

      <!-- Texto Instrucional -->
      <div>
        <label for="mat-text" class="block font-bold text-white/70 mb-1 uppercase text-[10px]">Texto / Conteúdo Instrucional</label>
        <textarea
          id="mat-text"
          rows="3"
          placeholder="Orientações e roteiro para o promotor estudar antes de responder..."
          bind:value={newTextContent}
          class="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-white outline-none focus:border-brand-yellow"
        ></textarea>
      </div>

      <!-- Pergunta Aberta -->
      <div>
        <label for="mat-question" class="block font-bold text-white/70 mb-1 uppercase text-[10px]">Enunciado da Pergunta *</label>
        <textarea
          id="mat-question"
          rows="2"
          required
          placeholder="Ex: Simule um áudio de 30 segundos explicando para o aluno como funciona o certificado do MEC..."
          bind:value={newQuestion}
          class="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-white outline-none focus:border-brand-yellow"
        ></textarea>
      </div>

      <!-- Gabarito / Rubrica IA -->
      <div>
        <label for="mat-expected" class="block font-bold text-white/70 mb-1 uppercase text-[10px]">Gabarito Esperado / Critérios da IA *</label>
        <textarea
          id="mat-expected"
          rows="3"
          required
          placeholder="Ex: O promotor deve mencionar que o certificado é emitido por instituição credenciada no MEC, que tem validade nacional e serve para faculdade ou concursos..."
          bind:value={newExpectedAnswer}
          class="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-white outline-none focus:border-brand-yellow"
        ></textarea>
        <p class="text-[10px] text-white/40 mt-1">
          A IA (Whisper + Gemini) utilizará estes critérios para avaliar a resposta e atribuir a nota de 0 a 10.
        </p>
      </div>

      <div class="flex justify-end gap-3 pt-3 border-t border-white/10">
        <button
          type="button"
          onclick={() => (isCreateModalOpen = false)}
          class="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-bold text-white/80 hover:bg-white/10 cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmittingMaterial}
          class="rounded-xl bg-[var(--yellow)] px-5 py-2.5 font-bold text-[var(--ink)] hover:brightness-110 disabled:opacity-50 cursor-pointer shadow-lg"
        >
          {isSubmittingMaterial ? 'Criando...' : 'Criar Matéria'}
        </button>
      </div>
    </form>
  {/snippet}
</Modal>

<!-- Modal: Upload de Vídeo -->
<Modal
  isOpen={isVideoModalOpen}
  onClose={() => (isVideoModalOpen = false)}
  title="Anexar Vídeo da Matéria"
  eyebrow="Multimídia"
  eyebrowVariant="blue"
  description={`Envie o arquivo de vídeo instrucional para a matéria "${selectedMaterialForVideo?.title || ''}".`}
  size="md"
>
  {#snippet children()}
    <div class="space-y-4 text-xs">
      {#if videoUploadError}
        <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-300">
          {videoUploadError}
        </div>
      {/if}

      <div>
        <label for="video-file" class="block font-bold text-white/70 mb-2 uppercase text-[10px]">Arquivo de Vídeo (.mp4, .webm, .mov)</label>
        <input
          id="video-file"
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          bind:this={videoFileInput}
          class="w-full rounded-xl border border-white/15 bg-white/10 p-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-yellow file:text-brand-ink hover:file:brightness-110 cursor-pointer"
        />
      </div>

      <div class="flex justify-end gap-3 pt-3 border-t border-white/10">
        <button
          type="button"
          onclick={() => (isVideoModalOpen = false)}
          class="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-bold text-white/80 hover:bg-white/10 cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={isUploadingVideo}
          onclick={handleVideoUpload}
          class="rounded-xl bg-brand-yellow px-5 py-2 font-bold text-brand-ink hover:brightness-110 disabled:opacity-50 cursor-pointer shadow-lg"
        >
          {isUploadingVideo ? 'Enviando Vídeo...' : 'Fazer Upload'}
        </button>
      </div>
    </div>
  {/snippet}
</Modal>

<!-- Modal: Staff Override de Submissão -->
<Modal
  isOpen={isOverrideModalOpen}
  onClose={() => (isOverrideModalOpen = false)}
  title="Ajuste Manual de Submissão (Staff Override)"
  eyebrow="Auditoria Humana"
  eyebrowVariant="amber"
  description={`Revisão manual da resposta do promotor "${selectedSubmission?.user_name || ''}".`}
  size="md"
>
  {#snippet children()}
    <div class="space-y-4 text-xs">
      {#if overrideError}
        <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-300">
          {overrideError}
        </div>
      {/if}

      <div class="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-1">
        <p class="text-white/60"><strong>Matéria:</strong> {selectedSubmission?.material_title}</p>
        <p class="text-white/60"><strong>Resposta:</strong> {selectedSubmission?.answer}</p>
        {#if selectedSubmission?.grade}
          <p class="text-white/60"><strong>Nota anterior da IA:</strong> {selectedSubmission.grade} / 10</p>
        {/if}
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="override-grade" class="block font-bold text-white/70 mb-1 uppercase text-[10px]">Nota (0 a 10)</label>
          <input
            id="override-grade"
            type="number"
            min="0"
            max="10"
            step="0.5"
            bind:value={overrideGrade}
            class="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-white outline-none focus:border-brand-yellow"
          />
        </div>

        <div>
          <label for="override-decision" class="block font-bold text-white/70 mb-1 uppercase text-[10px]">Decisão</label>
          <select
            id="override-decision"
            bind:value={overrideApprove}
            class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none focus:border-brand-yellow"
          >
            <option value={true} class="bg-brand-ink text-white">Aprovar Matéria</option>
            <option value={false} class="bg-brand-ink text-white">Reprovar Matéria</option>
          </select>
        </div>
      </div>

      <div>
        <label for="override-justification" class="block font-bold text-white/70 mb-1 uppercase text-[10px]">Justificativa do Staff</label>
        <textarea
          id="override-justification"
          rows="2"
          bind:value={overrideJustification}
          placeholder="Motivo da aprovação/reprovação manual..."
          class="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-white outline-none focus:border-brand-yellow"
        ></textarea>
      </div>

      <div class="flex justify-end gap-3 pt-3 border-t border-white/10">
        <button
          type="button"
          onclick={() => (isOverrideModalOpen = false)}
          class="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-bold text-white/80 hover:bg-white/10 cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={isSubmittingOverride}
          onclick={submitOverride}
          class="rounded-xl bg-brand-yellow px-5 py-2 font-bold text-brand-ink hover:brightness-110 disabled:opacity-50 cursor-pointer shadow-lg"
        >
          {isSubmittingOverride ? 'Salvando...' : 'Salvar Decisão'}
        </button>
      </div>
    </div>
  {/snippet}
</Modal>
