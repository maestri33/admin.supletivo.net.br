<script lang="ts">
  import { onMount } from "svelte";

  interface CommandItem {
    id: string;
    title: string;
    category: string;
    url: string;
    icon: string;
    description: string;
  }

  const COMMANDS: CommandItem[] = [
    {
      id: "cockpit",
      title: "Visão Geral / Cockpit",
      category: "Navegação",
      url: "/",
      icon: "📊",
      description: "Métricas consolidadas, KPIs e status operacional",
    },
    {
      id: "documents",
      title: "Fila de Documentos",
      category: "Operacional",
      url: "/documents",
      icon: "📑",
      description: "Conferência e despacho de RGs, selfies e comprovantes",
    },
    {
      id: "leads",
      title: "Leads & Propostas",
      category: "Operacional",
      url: "/leads",
      icon: "👥",
      description: "Propostas comerciais, cotações Pix/cartão e acompanhamento",
    },
    {
      id: "users",
      title: "Gestão de Usuários",
      category: "Pessoas",
      url: "/users",
      icon: "👤",
      description: "Consulta de alunos, promotores e coordenadores",
    },
    {
      id: "finance",
      title: "Financeiro & Asaas",
      category: "Financeiro",
      url: "/finance",
      icon: "💰",
      description: "Saldos, cobranças, repasses e conciliação bancária",
    },
    {
      id: "hubs",
      title: "Polos & Coordenadores",
      category: "Rede",
      url: "/hubs",
      icon: "🏢",
      description: "Gestão de polos credenciados e coordenadores locais",
    },
    {
      id: "pricing",
      title: "Tabela de Preços & Condições",
      category: "Configurações",
      url: "/pricing",
      icon: "🏷️",
      description: "Valores oficiais de matrícula, parcelamento e comissões",
    },
    {
      id: "audit",
      title: "Trilha de Auditoria",
      category: "Segurança",
      url: "/audit",
      icon: "🛡️",
      description: "Logs de segurança, despachos soberanos e ações de equipe",
    },
    {
      id: "notifications",
      title: "Disparos & WhatsApp",
      category: "Comunicação",
      url: "/notifications",
      icon: "🔔",
      description: "Histórico de mensagens ativas e status de entrega",
    },
  ];

  let isOpen = $state(false);
  let query = $state("");
  let selectedIndex = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);

  let filtered = $derived(
    query.trim() === ""
      ? COMMANDS
      : COMMANDS.filter(
          (c) =>
            c.title.toLowerCase().includes(query.toLowerCase()) ||
            c.description.toLowerCase().includes(query.toLowerCase()) ||
            c.category.toLowerCase().includes(query.toLowerCase())
        )
  );

  $effect(() => {
    // Reset selection when query changes
    if (query !== undefined) {
      selectedIndex = 0;
    }
  });

  export function open() {
    isOpen = true;
    query = "";
    selectedIndex = 0;
    setTimeout(() => {
      inputEl?.focus();
    }, 50);
  }

  export function close() {
    isOpen = false;
    query = "";
  }

  function handleSelect(item: CommandItem) {
    close();
    window.location.href = item.url;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (isOpen) {
        close();
      } else {
        open();
      }
      return;
    }

    if (!isOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length > 0) {
        selectedIndex = (selectedIndex + 1) % filtered.length;
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length > 0) {
        selectedIndex = (selectedIndex - 1 + filtered.length) % filtered.length;
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    // Listen for custom trigger from header or buttons
    const triggerHandler = () => open();
    window.addEventListener("supletivo:open-command-palette", triggerHandler);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("supletivo:open-command-palette", triggerHandler);
    };
  });
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    role="presentation"
    onclick={(e) => { if (e.target === e.currentTarget) close(); }}
    class="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-md p-4 pt-16 sm:pt-24 animate-in fade-in duration-150"
  >
    <!-- Command Palette Window -->
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de Comandos Administrativos"
      class="w-full max-w-xl rounded-2xl border border-white/20 bg-[var(--ink-soft)] text-white shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl animate-in zoom-in-95 duration-150"
    >
      <!-- Search Input Header -->
      <div class="flex items-center gap-3 border-b border-white/10 px-4 py-3.5 bg-white/5">
        <span class="text-white/40 text-lg">🔍</span>
        <input
          bind:this={inputEl}
          type="text"
          bind:value={query}
          placeholder="Digite para buscar tela, atalho ou comando..."
          class="flex-1 bg-transparent text-sm sm:text-base font-sans text-white placeholder-white/40 focus:outline-none"
        />
        <kbd class="hidden sm:inline-block rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-mono text-white/60">
          ESC
        </kbd>
      </div>

      <!-- Results List -->
      <div class="max-h-80 overflow-y-auto p-2 space-y-1">
        {#if filtered.length === 0}
          <div class="py-10 text-center text-xs text-white/40">
            Nenhum comando encontrado para "{query}".
          </div>
        {:else}
          {#each filtered as item, i (item.id)}
            {@const isSelected = i === selectedIndex}
            <button
              type="button"
              onclick={() => handleSelect(item)}
              onmouseenter={() => { selectedIndex = i; }}
              class="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-100 cursor-pointer {isSelected ? 'bg-[var(--yellow)] text-[var(--ink)] font-bold shadow-md' : 'text-white/80 hover:bg-white/5'}"
            >
              <div class="flex items-center gap-3 min-w-0">
                <span class="text-lg shrink-0">{item.icon}</span>
                <div class="flex flex-col min-w-0">
                  <span class="text-xs sm:text-sm font-semibold truncate">
                    {item.title}
                  </span>
                  <span class="text-[11px] opacity-70 truncate font-normal">
                    {item.description}
                  </span>
                </div>
              </div>

              <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md border shrink-0 {isSelected ? 'border-[var(--ink)]/30 bg-[var(--ink)]/10' : 'border-white/10 bg-white/5 text-white/50'}">
                {item.category}
              </span>
            </button>
          {/each}
        {/if}
      </div>

      <!-- Footer Info -->
      <div class="border-t border-white/10 px-4 py-2 bg-white/[0.02] flex items-center justify-between text-[11px] text-white/40 font-mono">
        <div class="flex items-center gap-3">
          <span>↑↓ Navegar</span>
          <span>↵ Acessar</span>
        </div>
        <span>Atalho: Ctrl+K</span>
      </div>
    </div>
  </div>
{/if}
