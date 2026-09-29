<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listHubs,
    listPromoters,
    createHub,
    setCoordinator,
    setDefaultHub,
    getNetworkTree,
    type HubOut,
    type PromoterOut,
    type NetworkTreeHubOut,
    type NetworkTreePromoterOut,
    ApiError,
    getErrorMessage,
  } from '@/lib/api';
  import Modal from '@/components/ui/Modal.svelte';

  let hubs = $state<HubOut[]>([]);
  let promoters = $state<PromoterOut[]>([]);
  let selectedHub = $state<HubOut | null>(null);
  let treeData = $state<NetworkTreeHubOut | null>(null);

  let loading = $state(true);
  let treeLoading = $state(false);
  let errorMsg = $state<string | null>(null);
  let successMsg = $state<string | null>(null);

  // Modals state
  let isCreateModalOpen = $state(false);
  let isCoordinatorModalOpen = $state(false);

  // Form: Create Hub
  let newBrand = $state('standard');
  let newCoordinatorId = $state('');
  let newCep = $state('');
  let newStreet = $state('');
  let newNumber = $state('');
  let newComplement = $state('');
  let newNeighborhood = $state('');
  let newCity = $state('');
  let newState = $state('SP');
  let newIsDefault = $state(false);
  let isSubmittingHub = $state(false);
  let createError = $state<string | null>(null);

  // Form: Swap Coordinator
  let promoterSearchTerm = $state('');
  let isSubmittingCoord = $state(false);
  let coordError = $state<string | null>(null);

  const BRANDS = [
    { id: 'standard', name: 'Padrão' },
    { id: 'wyden', name: 'Wyden' },
    { id: 'estacio', name: 'Estácio' },
  ];

  const PROMOTER_STATUS_LABELS: Record<string, string> = {
    active: 'Ativo',
    pending: 'Pendente',
    suspended: 'Suspenso',
    training: 'Em Treinamento',
    inactive: 'Inativo',
  };

  function translatePromoterStatus(status?: string | null): string {
    if (!status) return 'Ativo';
    return PROMOTER_STATUS_LABELS[status.toLowerCase()] || status;
  }

  async function loadData() {
    loading = true;
    errorMsg = null;
    try {
      const [hubsRes, promRes] = await Promise.all([
        listHubs(),
        listPromoters(),
      ]);
      hubs = hubsRes;
      promoters = promRes;

      if (hubs.length > 0) {
        // Keep selected hub or default to the first
        const currentId = selectedHub?.external_id;
        const found = hubs.find((h) => h.external_id === currentId) || hubs[0];
        await selectHub(found);
      } else {
        selectedHub = null;
        treeData = null;
      }
    } catch (err: unknown) {
      errorMsg = getErrorMessage(err);
    } finally {
      loading = false;
    }
  }

  async function selectHub(hub: HubOut) {
    selectedHub = hub;
    treeLoading = true;
    try {
      const trees = await getNetworkTree(hub.external_id);
      treeData = trees.find((t) => t.hub_external_id === hub.external_id) || trees[0] || null;
    } catch {
      treeData = null;
    } finally {
      treeLoading = false;
    }
  }

  async function handleSetDefault(hub: HubOut) {
    try {
      const updated = await setDefaultHub(hub.external_id);
      successMsg = `Polo "${updated.brand}" definido como polo padrão de captação!`;
      await loadData();
    } catch (err) {
      errorMsg = getErrorMessage(err);
    }
  }

  function openCreateModal() {
    createError = null;
    newBrand = 'standard';
    newCoordinatorId = promoters.length > 0 ? promoters[0].external_id : '';
    newCep = '';
    newStreet = '';
    newNumber = '';
    newComplement = '';
    newNeighborhood = '';
    newCity = '';
    newState = 'SP';
    newIsDefault = hubs.length === 0;
    isCreateModalOpen = true;
  }

  async function submitCreateHub() {
    if (!newCoordinatorId) {
      createError = 'É obrigatório selecionar um promotor ativo como coordenador do polo.';
      return;
    }
    isSubmittingHub = true;
    createError = null;
    try {
      const created = await createHub({
        brand: newBrand,
        coordinator_external_id: newCoordinatorId,
        cep: newCep || undefined,
        street: newStreet || undefined,
        number: newNumber || undefined,
        complement: newComplement || undefined,
        neighborhood: newNeighborhood || undefined,
        city: newCity || undefined,
        state: newState || undefined,
        is_default: newIsDefault,
      });
      isCreateModalOpen = false;
      successMsg = `Polo criado com sucesso!`;
      await loadData();
      selectedHub = created;
    } catch (err: unknown) {
      createError = getErrorMessage(err);
    } finally {
      isSubmittingHub = false;
    }
  }

  function openCoordinatorModal() {
    coordError = null;
    promoterSearchTerm = '';
    isCoordinatorModalOpen = true;
  }

  async function submitSetCoordinator(promoterId: string) {
    if (!selectedHub) return;
    isSubmittingCoord = true;
    coordError = null;
    try {
      await setCoordinator(selectedHub.external_id, promoterId);
      isCoordinatorModalOpen = false;
      successMsg = 'Coordenador atualizado com sucesso!';
      await loadData();
    } catch (err: unknown) {
      coordError = getErrorMessage(err);
    } finally {
      isSubmittingCoord = false;
    }
  }

  const filteredPromoters = $derived(
    promoters.filter((p) => {
      if (!promoterSearchTerm.trim()) return true;
      const term = promoterSearchTerm.toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.phone && p.phone.includes(term)) ||
        (p.cpf && p.cpf.includes(term))
      );
    })
  );

  onMount(() => {
    loadData();
  });
</script>

<div class="space-y-6">
  <!-- Top Banner / Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
    <div>
      <div class="flex items-center gap-3">
        <h1 class="font-display text-2xl sm:text-3xl text-white tracking-wide">Polos & Coordenadores</h1>
        <span class="rounded-full bg-brand-yellow/10 border border-brand-yellow/30 px-2.5 py-0.5 text-xs font-semibold text-brand-yellow">
          {hubs.length} {hubs.length === 1 ? 'polo' : 'polos'}
        </span>
      </div>
      <p class="text-xs sm:text-sm text-white/60 mt-1">
        Gestão dos polos físicos regionais, endereços, coordenadores ativos e rede de promotores vinculados.
      </p>
    </div>

    <button
      onclick={openCreateModal}
      class="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--yellow)] px-4 py-2.5 text-xs font-bold text-[var(--ink)] shadow-lg shadow-[var(--yellow)]/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
      </svg>
      Novo Polo
    </button>
  </div>

  <!-- Feedbacks -->
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

  {#if loading}
    <div class="py-20 text-center text-sm text-white/40 flex flex-col items-center gap-3">
      <div class="w-8 h-8 rounded-full border-2 border-brand-yellow border-t-transparent animate-spin"></div>
      Carregando polos e coordenadores...
    </div>
  {:else if hubs.length === 0}
    <div class="rounded-3xl border border-dashed border-white/15 bg-white/5 p-12 text-center space-y-4">
      <div class="w-12 h-12 rounded-2xl bg-brand-yellow/10 border border-brand-yellow/20 mx-auto flex items-center justify-center text-brand-yellow">
        🏢
      </div>
      <h3 class="text-lg font-bold text-white">Nenhum polo cadastrado</h3>
      <p class="text-xs text-white/50 max-w-md mx-auto">
        Cadastre o primeiro polo físico da sua rede educacional para vincular coordenadores e captar alunos.
      </p>
      <button
        onclick={openCreateModal}
        class="inline-flex items-center gap-2 rounded-xl bg-[var(--yellow)] px-5 py-2.5 text-xs font-bold text-[var(--ink)] hover:brightness-110 cursor-pointer"
      >
        + Criar Primeiro Polo
      </button>
    </div>
  {:else}
    <!-- Master-Detail Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left: Polos List (4 cols) -->
      <div class="lg:col-span-4 space-y-3">
        <div class="flex items-center justify-between px-1">
          <span class="text-xs font-bold uppercase tracking-wider text-white/50">Polos Disponíveis</span>
          <span class="text-[11px] text-white/40">{hubs.length} total</span>
        </div>

        <div class="space-y-2.5">
          {#each hubs as hub (hub.external_id)}
            {@const isSelected = selectedHub?.external_id === hub.external_id}
            <button
              type="button"
              onclick={() => selectHub(hub)}
              class="w-full text-left rounded-2xl border p-4 transition-all duration-200 cursor-pointer flex flex-col gap-2 relative overflow-hidden {isSelected
                ? 'border-brand-yellow/60 bg-brand-yellow/10 shadow-lg shadow-brand-yellow/5 ring-1 ring-brand-yellow/30'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}"
            >
              <div class="flex items-center justify-between">
                <span class="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
                  {hub.brand}
                </span>

                <div class="flex items-center gap-1.5">
                  {#if hub.is_default}
                    <span class="rounded-full bg-brand-yellow/20 border border-brand-yellow/40 px-2 py-0.5 text-[10px] font-bold text-brand-yellow uppercase">
                      Padrão
                    </span>
                  {/if}
                  <span class="font-mono text-[10px] text-white/40">#{hub.external_id.slice(0, 8)}</span>
                </div>
              </div>

              <div>
                <p class="text-xs text-white/80 font-medium">
                  {#if hub.address?.city}
                    {hub.address.city} — {hub.address.state}
                  {:else}
                    Endereço não configurado
                  {/if}
                </p>
                <p class="text-[11px] text-white/50 mt-0.5">
                  Coord: <span class="text-white/80">{hub.coordinator_name || 'Não designado'}</span>
                </p>
              </div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Right: Selected Polo Details (8 cols) -->
      <div class="lg:col-span-8">
        {#if selectedHub}
          <div class="rounded-3xl border border-white/15 bg-white/5 p-6 sm:p-8 backdrop-blur-2xl space-y-8 shadow-xl">
            <!-- Header details -->
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <div class="flex items-center gap-3">
                  <h2 class="text-2xl font-bold text-white uppercase tracking-wide">
                    Polo {selectedHub.brand}
                  </h2>
                  {#if selectedHub.is_default}
                    <span class="rounded-full bg-brand-yellow/20 border border-brand-yellow/40 px-3 py-1 text-xs font-bold text-brand-yellow uppercase">
                      Polo Padrão de Captação
                    </span>
                  {/if}
                </div>
                <p class="text-xs text-white/40 font-mono mt-1">UUID: {selectedHub.external_id}</p>
              </div>

              {#if !selectedHub.is_default}
                <button
                  onclick={() => handleSetDefault(selectedHub!)}
                  class="rounded-xl border border-brand-yellow/40 bg-brand-yellow/10 px-3.5 py-2 text-xs font-semibold text-brand-yellow hover:bg-brand-yellow/20 transition-all cursor-pointer"
                >
                  Tornar Polo Padrão
                </button>
              {/if}
            </div>

            <!-- 1. Endereço Completo -->
            <div class="space-y-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-white/50">Endereço do Polo</h3>
              <div class="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span class="text-white/40 block text-[10px] uppercase font-bold">CEP</span>
                  <span class="text-white font-medium">{selectedHub.address?.cep || selectedHub.address?.zipcode || 'Não informado'}</span>
                </div>
                <div class="sm:col-span-2">
                  <span class="text-white/40 block text-[10px] uppercase font-bold">Logradouro</span>
                  <span class="text-white font-medium">{selectedHub.address?.street || 'Não informado'}</span>
                </div>
                <div>
                  <span class="text-white/40 block text-[10px] uppercase font-bold">Número</span>
                  <span class="text-white font-medium">{selectedHub.address?.number || 'S/N'}</span>
                </div>
                <div>
                  <span class="text-white/40 block text-[10px] uppercase font-bold">Complemento</span>
                  <span class="text-white font-medium">{selectedHub.address?.complement || '—'}</span>
                </div>
                <div>
                  <span class="text-white/40 block text-[10px] uppercase font-bold">Bairro</span>
                  <span class="text-white font-medium">{selectedHub.address?.neighborhood || '—'}</span>
                </div>
                <div>
                  <span class="text-white/40 block text-[10px] uppercase font-bold">Cidade</span>
                  <span class="text-white font-medium">{selectedHub.address?.city || '—'}</span>
                </div>
                <div>
                  <span class="text-white/40 block text-[10px] uppercase font-bold">Estado (UF)</span>
                  <span class="text-white font-medium">{selectedHub.address?.state || '—'}</span>
                </div>
              </div>
            </div>

            <!-- 2. Coordenador do Polo -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-xs font-bold uppercase tracking-wider text-white/50">Coordenador Designado</h3>
                  <p class="text-[11px] text-white/40 mt-0.5">
                    Obrigatório: O coordenador de polo DEVE ser um <span class="text-brand-yellow font-semibold">Promotor Ativo</span>.
                  </p>
                </div>
                <button
                  onclick={openCoordinatorModal}
                  class="rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition-all cursor-pointer"
                >
                  {selectedHub.coordinator_name ? 'Trocar Coordenador' : 'Selecionar Coordenador'}
                </button>
              </div>

              <div class="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {#if selectedHub.coordinator_name}
                  <div class="flex items-center gap-3.5">
                    <div class="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-sm">
                      {selectedHub.coordinator_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 class="text-sm font-bold text-white">{selectedHub.coordinator_name}</h4>
                      <p class="text-xs text-white/50 font-mono">
                        UUID: {selectedHub.coordinator_external_id?.slice(0, 12)}...
                      </p>
                    </div>
                  </div>
                  <span class="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300 self-start sm:self-auto">
                    Promotor Ativo & Coordenador
                  </span>
                {:else}
                  <div class="text-xs text-rose-300 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Nenhum coordenador designado para este polo. Selecione um promotor ativo.</span>
                  </div>
                  <button
                    onclick={openCoordinatorModal}
                    class="rounded-xl bg-brand-yellow px-4 py-2 text-xs font-bold text-brand-ink hover:brightness-110 cursor-pointer self-start sm:self-auto"
                  >
                    Selecionar Agora
                  </button>
                {/if}
              </div>
            </div>

            <!-- 3. Promotores Vinculados ao Polo -->
            <div class="space-y-3 pt-2">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-xs font-bold uppercase tracking-wider text-white/50">Promotores Vinculados a este Polo</h3>
                  <p class="text-[11px] text-white/40">Equipe de captação e performance comercial direta</p>
                </div>

                {#if treeData?.metrics}
                  <div class="flex items-center gap-2 text-xs">
                    <span class="rounded-lg bg-white/5 px-2.5 py-1 border border-white/10 text-white/60">
                      {treeData.metrics.total_promoters} promotores
                    </span>
                    <span class="rounded-lg bg-white/5 px-2.5 py-1 border border-white/10 text-white/60">
                      {treeData.metrics.total_leads} leads
                    </span>
                    <span class="rounded-lg bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20 text-emerald-300 font-bold">
                      {treeData.metrics.conversion_rate}% conv.
                    </span>
                  </div>
                {/if}
              </div>

              {#if treeLoading}
                <div class="py-12 text-center text-xs text-white/40">Carregando promotores vinculados...</div>
              {:else if !treeData || treeData.promoters.length === 0}
                <div class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-xs text-white/40">
                  Nenhum promotor cadastrado diretamente neste polo ainda.
                </div>
              {:else}
                <div class="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-white/5 text-[10px] uppercase font-bold text-white/40 border-b border-white/10">
                      <tr>
                        <th class="p-3.5">Promotor</th>
                        <th class="p-3.5">Telefone</th>
                        <th class="p-3.5">Status</th>
                        <th class="p-3.5 text-right">Leads</th>
                        <th class="p-3.5 text-right">Matrículas</th>
                        <th class="p-3.5 text-right">Conversão</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5 text-white/80">
                      {#each treeData.promoters as prom}
                        <tr class="hover:bg-white/5 transition-colors">
                          <td class="p-3.5 font-medium text-white flex items-center gap-2">
                            <span>{prom.name}</span>
                            {#if selectedHub.coordinator_external_id === prom.external_id || selectedHub.coordinator_external_id === prom.user_external_id}
                              <span class="rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] px-1.5 py-0.5 font-bold">
                                Coordenador
                              </span>
                            {/if}
                          </td>
                          <td class="p-3.5 text-white/60 font-mono">{prom.phone || '—'}</td>
                          <td class="p-3.5">
                            <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {prom.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
                              {translatePromoterStatus(prom.status)}
                            </span>
                          </td>
                          <td class="p-3.5 text-right font-mono text-white">{prom.leads_count}</td>
                          <td class="p-3.5 text-right font-mono text-emerald-400 font-bold">{prom.paid_count}</td>
                          <td class="p-3.5 text-right font-mono text-brand-yellow font-bold">{prom.conversion_rate}%</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <div class="rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-sm text-white/40">
            Selecione um polo à esquerda para ver os dados, o coordenador e os promotores vinculados.
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Modal: Criar Novo Polo -->
<Modal
  isOpen={isCreateModalOpen}
  onClose={() => (isCreateModalOpen = false)}
  title="Cadastrar Novo Polo"
  eyebrow="Rede Regional"
  eyebrowVariant="yellow"
  description="Criação de um novo polo físico. Todo polo deve possuir obrigatoriamente um Promotor Ativo como coordenador."
  size="lg"
>
  {#snippet children()}
    <form onsubmit={(e) => { e.preventDefault(); submitCreateHub(); }} class="space-y-4 text-xs">
      {#if createError}
        <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-300">
          {createError}
        </div>
      {/if}

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Brand -->
        <div>
          <label for="hub-brand" class="block font-bold text-white/70 mb-1.5 uppercase text-[10px]">Marca do Polo *</label>
          <select
            id="hub-brand"
            bind:value={newBrand}
            class="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-white outline-none focus:border-brand-yellow"
          >
            {#each BRANDS as brand}
              <option value={brand.id} class="bg-brand-ink text-white">{brand.name}</option>
            {/each}
          </select>
        </div>

        <!-- Coordenador (Obrigatório ser Promotor Ativo) -->
        <div>
          <label for="hub-coordinator" class="block font-bold text-white/70 mb-1.5 uppercase text-[10px]">Coordenador (Promotor Ativo) *</label>
          <select
            id="hub-coordinator"
            bind:value={newCoordinatorId}
            required
            class="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-white outline-none focus:border-brand-yellow"
          >
            <option value="" disabled class="bg-brand-ink text-white/40">Selecione um promotor ativo...</option>
            {#each promoters as prom}
              <option value={prom.external_id} class="bg-brand-ink text-white">
                {prom.name || 'Sem nome'} ({prom.phone || 'sem telefone'})
              </option>
            {/each}
          </select>
          {#if promoters.length === 0}
            <p class="text-[10px] text-amber-400 mt-1">⚠️ Não há promotores ativos disponíveis. Crie ou aprove um promotor antes.</p>
          {/if}
        </div>
      </div>

      <!-- Endereço -->
      <div class="border-t border-white/10 pt-3 space-y-3">
        <span class="block font-bold text-white/70 uppercase text-[10px]">Endereço Físico</span>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label for="hub-cep" class="text-white/50 block text-[10px] mb-1">CEP</label>
            <input
              id="hub-cep"
              type="text"
              placeholder="00000-000"
              bind:value={newCep}
              class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none focus:border-brand-yellow"
            />
          </div>
          <div class="sm:col-span-2">
            <label for="hub-street" class="text-white/50 block text-[10px] mb-1">Logradouro / Rua</label>
            <input
              id="hub-street"
              type="text"
              placeholder="Av. Paulista, Rua das Flores..."
              bind:value={newStreet}
              class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none focus:border-brand-yellow"
            />
          </div>
          <div>
            <label for="hub-number" class="text-white/50 block text-[10px] mb-1">Número</label>
            <input
              id="hub-number"
              type="text"
              placeholder="123"
              bind:value={newNumber}
              class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none focus:border-brand-yellow"
            />
          </div>
          <div>
            <label for="hub-complement" class="text-white/50 block text-[10px] mb-1">Complemento</label>
            <input
              id="hub-complement"
              type="text"
              placeholder="Sala 4, Bloco B..."
              bind:value={newComplement}
              class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none focus:border-brand-yellow"
            />
          </div>
          <div>
            <label for="hub-neighborhood" class="text-white/50 block text-[10px] mb-1">Bairro</label>
            <input
              id="hub-neighborhood"
              type="text"
              placeholder="Centro"
              bind:value={newNeighborhood}
              class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none focus:border-brand-yellow"
            />
          </div>
          <div class="sm:col-span-2">
            <label for="hub-city" class="text-white/50 block text-[10px] mb-1">Cidade</label>
            <input
              id="hub-city"
              type="text"
              placeholder="São Paulo"
              bind:value={newCity}
              class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none focus:border-brand-yellow"
            />
          </div>
          <div>
            <label for="hub-state" class="text-white/50 block text-[10px] mb-1">Estado (UF)</label>
            <input
              id="hub-state"
              type="text"
              placeholder="SP"
              maxlength="2"
              bind:value={newState}
              class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none focus:border-brand-yellow uppercase"
            />
          </div>
        </div>
      </div>

      <!-- Is Default Flag -->
      <label class="flex items-center gap-2.5 pt-2 cursor-pointer">
        <input
          type="checkbox"
          bind:checked={newIsDefault}
          class="rounded border-white/20 bg-white/10 text-brand-yellow focus:ring-brand-yellow w-4 h-4"
        />
        <span class="text-white/80 font-medium">Definir este polo como o Polo Padrão da plataforma</span>
      </label>

      <div class="flex justify-end gap-3 pt-4 border-t border-white/10">
        <button
          type="button"
          onclick={() => (isCreateModalOpen = false)}
          class="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-bold text-white/80 hover:bg-white/10 transition-all cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmittingHub || promoters.length === 0}
          class="rounded-xl bg-[var(--yellow)] px-5 py-2.5 font-bold text-[var(--ink)] hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer shadow-lg"
        >
          {isSubmittingHub ? 'Criando...' : 'Confirmar & Criar Polo'}
        </button>
      </div>
    </form>
  {/snippet}
</Modal>

<!-- Modal: Trocar / Selecionar Coordenador -->
<Modal
  isOpen={isCoordinatorModalOpen}
  onClose={() => (isCoordinatorModalOpen = false)}
  title="Selecionar Coordenador do Polo"
  eyebrow="Liderança de Polo"
  eyebrowVariant="purple"
  description="Escolha um promotor com status ativo para assumir a coordenação deste polo."
  size="md"
>
  {#snippet children()}
    <div class="space-y-4 text-xs">
      {#if coordError}
        <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-300">
          {coordError}
        </div>
      {/if}

      <!-- Busca de promotor -->
      <div>
        <label for="search-promoter" class="block font-bold text-white/70 mb-1.5 uppercase text-[10px]">Buscar Promotor Ativo</label>
        <input
          id="search-promoter"
          type="text"
          placeholder="Filtrar por nome, telefone ou CPF..."
          bind:value={promoterSearchTerm}
          class="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-white outline-none focus:border-brand-yellow"
        />
      </div>

      <!-- Lista de Promotores Aptos -->
      <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
        {#if filteredPromoters.length === 0}
          <div class="p-6 text-center text-white/40 border border-dashed border-white/10 rounded-2xl">
            Nenhum promotor ativo encontrado.
          </div>
        {:else}
          {#each filteredPromoters as promoter (promoter.external_id)}
            {@const isCurrent = selectedHub?.coordinator_external_id === promoter.external_id}
            <div class="rounded-xl border p-3 flex items-center justify-between gap-3 {isCurrent ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 bg-white/5'}">
              <div>
                <p class="font-bold text-white text-xs flex items-center gap-1.5">
                  {promoter.name || 'Sem nome cadastrado'}
                  {#if isCurrent}
                    <span class="text-[9px] bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded font-bold">Atual</span>
                  {/if}
                </p>
                <p class="text-[11px] text-white/50 font-mono mt-0.5">
                  Tel: {promoter.phone || '—'} {promoter.cpf ? `• CPF: ${promoter.cpf}` : ''}
                </p>
              </div>

              {#if !isCurrent}
                <button
                  type="button"
                  disabled={isSubmittingCoord}
                  onclick={() => submitSetCoordinator(promoter.external_id)}
                  class="rounded-lg bg-brand-yellow px-3 py-1.5 text-xs font-bold text-brand-ink hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmittingCoord ? '...' : 'Designar'}
                </button>
              {/if}
            </div>
          {/each}
        {/if}
      </div>

      <div class="flex justify-end pt-3 border-t border-white/10">
        <button
          type="button"
          onclick={() => (isCoordinatorModalOpen = false)}
          class="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-bold text-white/80 hover:bg-white/10 cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </div>
  {/snippet}
</Modal>
