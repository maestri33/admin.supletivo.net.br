<script lang="ts">
  export let currentPath: string = '/';

  interface NavItem {
    name: string;
    label: string;
    href: string;
    icon: string;
  }

  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: 'Operação',
      items: [
        { name: 'Visão Geral', label: 'Visão Geral', href: '/', icon: 'dashboard' },
        { name: 'Pessoas', label: 'Pessoas', href: '/usuarios', icon: 'users' },
        { name: 'Revisões', label: 'Revisões', href: '/documentos', icon: 'file' },
        { name: 'Rede', label: 'Rede', href: '/polos', icon: 'building' },
      ],
    },
    {
      label: 'Dinheiro',
      items: [
        { name: 'Financeiro', label: 'Financeiro', href: '/financeiro', icon: 'cash' },
        { name: 'Regras comerciais', label: 'Regras comerciais', href: '/precos', icon: 'tag' },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { name: 'Mensagens', label: 'Mensagens', href: '/notificacoes', icon: 'bell' },
        { name: 'Auditoria', label: 'Auditoria', href: '/auditoria', icon: 'shield' },
      ],
    },
  ];

  function isActive(href: string): boolean {
    if (href === '/') return currentPath === '/';
    return currentPath.startsWith(href);
  }
</script>

<nav aria-label="Navegação Administrativa" class="w-full border-b border-white/10 bg-brand-ink/70 backdrop-blur-md">
  <div class="mx-auto flex max-w-7xl items-stretch gap-3 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8 no-scrollbar">
    {#each groups as group, groupIndex}
      <div class="flex shrink-0 items-center gap-1 {groupIndex > 0 ? 'border-l border-white/15 pl-3' : ''}" role="group" aria-label={group.label}>
        <span class="sr-only">{group.label}</span>
        {#each group.items as item}
          <a
            href={item.href}
            class="flex items-center gap-2 rounded-lg px-3.5 py-2.5 min-h-[48px] text-xs font-semibold whitespace-nowrap transition-all touch-manipulation {isActive(item.href)
              ? 'bg-brand-yellow text-brand-ink shadow-sm font-bold'
              : 'text-white/70 hover:bg-white/10 hover:text-white'}"
          >
            <span>{item.label}</span>
          </a>
        {/each}
      </div>
    {/each}
  </div>
</nav>

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
