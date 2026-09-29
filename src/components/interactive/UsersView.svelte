<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listUsers,
    changeUserPhone,
    type StaffUserOut,
    getErrorMessage,
  } from '@/lib/api';
  import { formatCpf, formatPhone } from '@/lib/utils';
  import Modal from '@/components/ui/Modal.svelte';

  let users = $state<StaffUserOut[]>([]);
  let loading = $state(true);
  let errorMsg = $state<string | null>(null);
  let successMsg = $state<string | null>(null);

  // Filters
  let selectedRoleFilter = $state<string>('');
  let searchTerm = $state<string>('');

  // Rescue Phone Modal
  let isPhoneModalOpen = $state(false);
  let selectedUserForPhone = $state<StaffUserOut | null>(null);
  let newPhone = $state('');
  let isSubmittingPhone = $state(false);
  let phoneError = $state<string | null>(null);

  // User Detail Modal
  let isDetailModalOpen = $state(false);
  let detailUser = $state<StaffUserOut | null>(null);

  const ROLE_OPTIONS = [
    { id: '', label: 'Todos os Usuários' },
    { id: 'student', label: 'Alunos' },
    { id: 'promoter', label: 'Promotores' },
    { id: 'coordinator', label: 'Coordenadores de Polo' },
    { id: 'staff', label: 'Administração' },
    { id: 'lead', label: 'Leads' },
    { id: 'enrollment', label: 'Em Matrícula' },
  ];

  async function loadUsers() {
    loading = true;
    errorMsg = null;
    try {
      users = await listUsers(selectedRoleFilter || undefined);
    } catch (err) {
      errorMsg = getErrorMessage(err);
    } finally {
      loading = false;
    }
  }

  function handleFilterChange(role: string) {
    selectedRoleFilter = role;
    loadUsers();
  }

  function openPhoneRescue(user: StaffUserOut) {
    selectedUserForPhone = user;
    newPhone = user.phone || '';
    phoneError = null;
    isPhoneModalOpen = true;
  }

  async function submitPhoneRescue() {
    if (!selectedUserForPhone || !newPhone.trim()) {
      phoneError = 'Informe um telefone válido com DDD.';
      return;
    }
    isSubmittingPhone = true;
    phoneError = null;
    try {
      await changeUserPhone(selectedUserForPhone.external_id, newPhone.trim());
      isPhoneModalOpen = false;
      successMsg = `Telefone de ${selectedUserForPhone.name || 'usuário'} atualizado com sucesso!`;
      await loadUsers();
    } catch (err) {
      phoneError = getErrorMessage(err);
    } finally {
      isSubmittingPhone = false;
    }
  }

  function openDetail(user: StaffUserOut) {
    detailUser = user;
    isDetailModalOpen = true;
  }

  const filteredUsers = $derived(
    users.filter((u) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        (u.name && u.name.toLowerCase().includes(term)) ||
        (u.cpf && u.cpf.includes(term)) ||
        (u.phone && u.phone.includes(term)) ||
        u.external_id.toLowerCase().includes(term)
      );
    })
  );

  function getRoleBadge(role: string): { label: string; bg: string; text: string; border: string } {
    switch (role) {
      case 'student':
        return { label: 'Aluno', bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-400/30' };
      case 'promoter':
        return { label: 'Promotor', bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-400/30' };
      case 'coordinator':
        return { label: 'Coordenador de Polo', bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-400/30' };
      case 'staff':
        return { label: 'Administrador', bg: 'bg-[var(--yellow)]/20', text: 'text-[var(--yellow)]', border: 'border-[var(--yellow)]/40' };
      case 'lead':
        return { label: 'Lead', bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-400/30' };
      case 'enrollment':
        return { label: 'Em Matrícula', bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-400/30' };
      case 'veteran':
        return { label: 'Veterano', bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-400/30' };
      default:
        return { label: role, bg: 'bg-white/10', text: 'text-white/70', border: 'border-white/15' };
    }
  }

  onMount(() => {
    loadUsers();
  });
</script>

<div class="space-y-6">
  <!-- Top Banner / Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
    <div>
      <div class="flex items-center gap-3">
        <h1 class="font-display text-2xl sm:text-3xl text-white tracking-wide">Base Geral de Usuários</h1>
        <span class="rounded-full bg-brand-yellow/10 border border-brand-yellow/30 px-2.5 py-0.5 text-xs font-semibold text-brand-yellow">
          {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário' : 'usuários'}
        </span>
      </div>
      <p class="text-xs sm:text-sm text-white/60 mt-1">
        Visão unificada: uma mesma pessoa pode acumular múltiplos papéis simultâneos (Aluno, Promotor, Coordenador de Polo, Staff).
      </p>
    </div>

    <button
      onclick={loadUsers}
      class="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 transition-all cursor-pointer self-start sm:self-auto"
    >
      ↻ Atualizar Lista
    </button>
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

  <!-- Controls: Filters by Role and Search Bar -->
  <div class="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
    <!-- Role pills -->
    <div class="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
      {#each ROLE_OPTIONS as option}
        <button
          onclick={() => handleFilterChange(option.id)}
          class="rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer {selectedRoleFilter === option.id
            ? 'bg-brand-yellow text-brand-ink shadow-md'
            : 'border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}"
        >
          {option.label}
        </button>
      {/each}
    </div>

    <!-- Search input -->
    <div class="w-full lg:w-72">
      <input
        type="text"
        placeholder="Buscar por nome, CPF ou tel..."
        bind:value={searchTerm}
        class="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-brand-yellow"
      />
    </div>
  </div>

  <!-- Users Table -->
  {#if loading}
    <div class="py-20 text-center text-sm text-white/40 flex flex-col items-center gap-3">
      <div class="w-8 h-8 rounded-full border-2 border-brand-yellow border-t-transparent animate-spin"></div>
      Carregando usuários e papéis ativos...
    </div>
  {:else if filteredUsers.length === 0}
    <div class="rounded-3xl border border-dashed border-white/15 bg-white/5 p-12 text-center space-y-2">
      <h3 class="text-base font-bold text-white">Nenhum usuário encontrado</h3>
      <p class="text-xs text-white/40">Tente ajustar o filtro de papel ou o termo de busca.</p>
    </div>
  {:else}
    <div class="overflow-x-auto rounded-3xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl">
      <table class="w-full text-left text-xs text-white/80">
        <thead class="border-b border-white/10 bg-white/5 uppercase font-bold text-[10px] text-white/50 tracking-wider">
          <tr>
            <th class="px-5 py-4">Usuário / Pessoa</th>
            <th class="px-5 py-4">CPF</th>
            <th class="px-5 py-4">Telefone de Acesso</th>
            <th class="px-5 py-4">Papéis Ativos</th>
            <th class="px-5 py-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          {#each filteredUsers as user (user.external_id)}
            <tr class="hover:bg-white/5 transition-colors">
              <!-- Name & UUID -->
              <td class="px-5 py-4">
                <button
                  onclick={() => openDetail(user)}
                  class="text-left group cursor-pointer"
                >
                  <p class="font-bold text-white text-sm group-hover:text-brand-yellow transition-colors flex items-center gap-2">
                    {user.name || 'Sem nome informado'}
                    {#if user.is_superuser}
                      <span class="rounded bg-brand-yellow/20 border border-brand-yellow/40 text-[9px] font-bold text-brand-yellow px-1.5 py-0.5 uppercase">
                        Administrador
                      </span>
                    {/if}
                  </p>
                  <p class="font-mono text-[10px] text-white/40 mt-0.5">
                    UUID: {user.external_id.slice(0, 14)}...
                  </p>
                </button>
              </td>

              <!-- CPF -->
              <td class="px-5 py-4 font-mono text-white/70">
                {user.cpf ? formatCpf(user.cpf) : '—'}
              </td>

              <!-- Phone -->
              <td class="px-5 py-4 font-mono text-white/70">
                {user.phone ? formatPhone(user.phone) : '—'}
              </td>

              <!-- Accumulated Active Roles Badges -->
              <td class="px-5 py-4">
                <div class="flex items-center gap-1.5 flex-wrap">
                  {#if user.roles && user.roles.length > 0}
                    {#each user.roles as role}
                      {@const b = getRoleBadge(role)}
                      <span class="rounded-full px-2.5 py-0.5 text-[10px] font-bold border {b.bg} {b.text} {b.border}">
                        {b.label}
                      </span>
                    {/each}
                  {:else if user.is_superuser}
                    {@const b = getRoleBadge('staff')}
                    <span class="rounded-full px-2.5 py-0.5 text-[10px] font-bold border {b.bg} {b.text} {b.border}">
                      Administrador
                    </span>
                  {:else}
                    <span class="text-white/30 text-[10px] italic">Sem papéis de funil</span>
                  {/if}
                </div>
              </td>

              <!-- Actions -->
              <td class="px-5 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    onclick={() => openPhoneRescue(user)}
                    class="min-h-[48px] rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 px-3 py-2 text-[11px] font-semibold text-white/80 hover:text-white transition-all cursor-pointer"
                    title="Resgate / Troca de telefone de acesso"
                  >
                    Resgatar Chip
                  </button>
                  <button
                    onclick={() => openDetail(user)}
                    class="min-h-[48px] rounded-lg bg-brand-yellow/10 border border-brand-yellow/30 hover:bg-brand-yellow/20 px-3 py-2 text-[11px] font-bold text-brand-yellow transition-all cursor-pointer"
                  >
                    Ver Detalhes
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- Modal: Resgatar Telefone de Login -->
<Modal
  isOpen={isPhoneModalOpen}
  onClose={() => (isPhoneModalOpen = false)}
  title="Resgate de Telefone de Acesso"
  eyebrow="Segurança & Acesso"
  eyebrowVariant="amber"
  description={`Atualize o número de WhatsApp/acesso de "${selectedUserForPhone?.name || 'usuário'}" em caso de perda ou troca de chip.`}
  size="sm"
>
  {#snippet children()}
    <form onsubmit={(e) => { e.preventDefault(); submitPhoneRescue(); }} class="space-y-4 text-xs">
      {#if phoneError}
        <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-300">
          {phoneError}
        </div>
      {/if}

      <div>
        <label for="rescue-phone" class="block font-bold text-white/70 mb-1.5 uppercase text-[10px]">Novo Telefone com DDD *</label>
        <input
          id="rescue-phone"
          type="text"
          required
          placeholder="11999998888"
          bind:value={newPhone}
          class="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-white outline-none focus:border-brand-yellow font-mono text-sm"
        />
        <p class="text-[10px] text-white/40 mt-1">
          O novo telefone será usado para validação por código único no WhatsApp.
        </p>
      </div>

      <div class="flex justify-end gap-3 pt-3 border-t border-white/10">
        <button
          type="button"
          onclick={() => (isPhoneModalOpen = false)}
          class="min-h-[48px] rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-bold text-white/80 hover:bg-white/10 cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmittingPhone}
          class="min-h-[48px] rounded-xl bg-brand-yellow px-5 py-2 font-bold text-brand-ink hover:brightness-110 disabled:opacity-50 cursor-pointer shadow-lg"
        >
          {isSubmittingPhone ? 'Salvando...' : 'Atualizar Telefone'}
        </button>
      </div>
    </form>
  {/snippet}
</Modal>

<!-- Modal: Detalhes do Usuário -->
<Modal
  isOpen={isDetailModalOpen}
  onClose={() => (isDetailModalOpen = false)}
  title="Ficha do Usuário"
  eyebrow="Perfil Unificado"
  eyebrowVariant="blue"
  description={`Visão consolidada da pessoa e suas funções dentro do ecossistema.`}
  size="md"
>
  {#snippet children()}
    {#if detailUser}
      <div class="space-y-4 text-xs">
        <div class="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-3">
          <div>
            <span class="text-white/40 text-[10px] uppercase font-bold block">Nome Completo</span>
            <p class="text-white font-bold text-sm">{detailUser.name || 'Não informado'}</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-white/40 text-[10px] uppercase font-bold block">CPF</span>
              <p class="text-white font-mono">{detailUser.cpf ? formatCpf(detailUser.cpf) : 'Não informado'}</p>
            </div>
            <div>
              <span class="text-white/40 text-[10px] uppercase font-bold block">Telefone</span>
              <p class="text-white font-mono">{detailUser.phone ? formatPhone(detailUser.phone) : 'Não informado'}</p>
            </div>
          </div>

          <div>
            <span class="text-white/40 text-[10px] uppercase font-bold block">UUID Externo</span>
            <p class="text-white font-mono text-[11px] break-all">{detailUser.external_id}</p>
          </div>
        </div>

        <div>
          <span class="text-white/60 text-[11px] uppercase font-bold block mb-2">Papéis Concedidos:</span>
          <div class="flex items-center gap-2 flex-wrap">
            {#if detailUser.roles && detailUser.roles.length > 0}
              {#each detailUser.roles as role}
                {@const b = getRoleBadge(role)}
                <span class="rounded-full px-3 py-1 text-xs font-bold border {b.bg} {b.text} {b.border}">
                  {b.label}
                </span>
              {/each}
            {/if}
            {#if detailUser.is_superuser}
              {@const b = getRoleBadge('staff')}
              <span class="rounded-full px-3 py-1 text-xs font-bold border {b.bg} {b.text} {b.border}">
                Administrador
              </span>
            {/if}
          </div>
        </div>

        <div class="flex justify-end pt-3 border-t border-white/10">
          <button
            type="button"
            onclick={() => (isDetailModalOpen = false)}
            class="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-bold text-white/80 hover:bg-white/10 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    {/if}
  {/snippet}
</Modal>
