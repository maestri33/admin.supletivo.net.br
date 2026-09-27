<script lang="ts">
  export let currentPath: string = '/';

  interface NavItem {
    name: string;
    href: string;
    icon: string;
  }

  const items: NavItem[] = [
    { name: 'Visão Geral', href: '/', icon: 'dashboard' },
    { name: 'Polos & Coord.', href: '/polos', icon: 'building' },
    { name: 'Preços & Planos', href: '/precos', icon: 'tag' },
    { name: 'Financeiro', href: '/financeiro', icon: 'cash' },
    { name: 'Documentos', href: '/documentos', icon: 'file' },
    { name: 'Usuários & Alunos', href: '/usuarios', icon: 'users' },
    { name: 'Treinamento', href: '/treinamento', icon: 'book' },
    { name: 'Sistema & Auditoria', href: '/auditoria', icon: 'shield' },
  ];

  function isActive(href: string): boolean {
    if (href === '/') return currentPath === '/';
    return currentPath.startsWith(href);
  }
</script>

<nav aria-label="Navegação Administrativa" class="w-full border-b border-white/10 bg-brand-ink/70 backdrop-blur-md">
  <div class="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8 no-scrollbar">
    {#each items as item}
      <a
        href={item.href}
        class="flex items-center gap-2 rounded-lg px-4 py-2.5 min-h-[44px] text-xs font-semibold whitespace-nowrap transition-all touch-manipulation {isActive(item.href)
          ? 'bg-brand-yellow text-brand-ink shadow-sm font-bold'
          : 'text-white/70 hover:bg-white/10 hover:text-white'}"
      >
        <span>{item.name}</span>
      </a>
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
