<script lang="ts">
  interface Props {
    currentPath?: string;
  }
  let { currentPath = '/' }: Props = $props();

  function isActive(href: string): boolean {
    const current = new URL(currentPath, 'https://admin.supletivo.net.br');
    const target = new URL(href, current.origin);
    if (target.pathname !== current.pathname) return false;
    for (const [key, value] of target.searchParams) {
      if (current.searchParams.get(key) !== value) return false;
    }
    if (target.pathname === '/alunos' && !target.searchParams.has('role')) return true;
    return target.searchParams.toString() === current.searchParams.toString();
  }

  let contextSpace = $derived(new URL(currentPath, 'https://admin.supletivo.net.br').searchParams.get('space'));
  let environment = $derived(currentPath.startsWith('/alunos') || contextSpace === 'students' ? 'students' : currentPath.startsWith('/promotores') || contextSpace === 'promoters' ? 'promoters' : currentPath.startsWith('/polos') ? 'hubs' : 'admin');
  let contextualItems = $derived(environment === 'students' ? [
    { label: 'Leads', href: '/alunos?role=lead' },
    { label: 'Matrículas', href: '/alunos?role=enrollment' },
    { label: 'Ativos', href: '/alunos?role=student' },
    { label: 'Documentos', href: '/documentos?space=students' },
  ] : environment === 'promoters' ? [
    { label: 'Promotores', href: '/promotores' },
    { label: 'Documentos', href: '/documentos?space=promoters' },
  ] : environment === 'hubs' ? [
    { label: 'Polos e coordenadores', href: '/polos' },
    { label: 'Novo polo', href: '/polos?new=1' },
  ] : [
    { label: 'Visão geral e saldo', href: '/' },
    { label: 'Preços e comissões', href: '/precos' },
    { label: 'Pagamentos', href: '/financeiro' },
    { label: 'Infraestrutura', href: '/auditoria' },
    { label: 'Notificações', href: '/notificacoes' },
  ]);
</script>

<nav aria-label="Navegação Administrativa" class="w-full border-b border-white/10 bg-brand-ink/70 backdrop-blur-md">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="flex items-stretch gap-2 overflow-x-auto border-b border-white/10 py-2 no-scrollbar" aria-label="Espaços da plataforma">
      {#each [
        { label: 'Alunos', href: '/alunos' },
        { label: 'Promotores', href: '/promotores' },
        { label: 'Polos', href: '/polos' },
        { label: 'Administrador', href: '/' },
      ] as role}
        {@const selected = role.href === '/' ? environment === 'admin' : role.href === '/alunos' ? environment === 'students' : role.href === '/promotores' ? environment === 'promoters' : environment === 'hubs'}
        <a href={role.href} aria-current={selected ? 'page' : undefined} class="min-h-[48px] inline-flex shrink-0 items-center rounded-xl px-4 text-sm font-bold whitespace-nowrap transition-all touch-manipulation {selected ? 'bg-brand-yellow text-brand-ink shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}">{role.label}</a>
      {/each}
    </div>
    <div class="admin-dock flex items-stretch gap-3 overflow-x-auto py-2 no-scrollbar" aria-label="Ações do espaço selecionado">
        {#each contextualItems as item}
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
  </div>
</nav>

<style>
  .admin-dock { position: fixed; inset-inline: 0; bottom: 0; z-index: 50; justify-content: flex-start; padding: .75rem var(--gutter) calc(.75rem + env(safe-area-inset-bottom)); background: var(--ink); border-top: 1px solid var(--line-light); }
  .admin-dock a:focus-visible { outline: 2px solid var(--yellow); outline-offset: 2px; }
  @media (min-width: 768px) { .admin-dock { justify-content: center; } }
  @media (prefers-reduced-motion: reduce) { a { transition: none !important; } }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
