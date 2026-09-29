<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listNotifyTemplates,
    listNotifyEvents,
    getNotifyHistory,
    getTtsConfig,
    patchNotifyTemplate,
    testNotifyTemplate,
    type NotifyTemplateOut,
    type NotifyEventOut,
    type NotifyHistoryItemOut,
    type TtsConfigOut,
    getErrorMessage,
  } from '@/lib/api';
  import { formatDateBr } from '@/lib/utils';

  let activeTab = $state<'templates' | 'events' | 'history' | 'tts'>('templates');
  let templates = $state<NotifyTemplateOut[]>([]);
  let events = $state<NotifyEventOut[]>([]);
  let historyItems = $state<NotifyHistoryItemOut[]>([]);
  let ttsConfig = $state<TtsConfigOut | null>(null);

  let loading = $state(true);
  let errorMsg = $state<string | null>(null);
  let successMsg = $state<string | null>(null);

  let selectedTemplate = $state<NotifyTemplateOut | null>(null);
  let editTitle = $state('');
  let editSubject = $state('');
  let editBodyMd = $state('');
  let editChannels = $state('whatsapp,email');
  let editIsTts = $state(false);
  let savingTemplate = $state(false);
  let testingEvent = $state<string | null>(null);

  const CHANNEL_LABELS: Record<string, string> = {
    whatsapp: 'WhatsApp',
    email: 'E-mail',
    sms: 'SMS',
  };

  const STATUS_LABELS: Record<string, string> = {
    sent: 'Enviado',
    delivered: 'Entregue',
    queued: 'Na Fila',
    pending: 'Pendente',
    failed: 'Falhou',
    error: 'Erro',
  };

  function translateStatus(status?: string | null): string {
    if (!status) return '—';
    return STATUS_LABELS[status.toLowerCase()] || status;
  }

  function formatChannels(channels: string): string {
    return (channels || '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => CHANNEL_LABELS[c] || c)
      .join(' • ');
  }

  async function loadAll() {
    loading = true;
    errorMsg = null;
    try {
      const [tplRes, evRes, histRes, ttsRes] = await Promise.allSettled([
        listNotifyTemplates(),
        listNotifyEvents(),
        getNotifyHistory(100),
        getTtsConfig(),
      ]);

      if (tplRes.status === 'fulfilled') templates = tplRes.value;
      if (evRes.status === 'fulfilled') events = evRes.value;
      if (histRes.status === 'fulfilled') historyItems = histRes.value;
      if (ttsRes.status === 'fulfilled') ttsConfig = ttsRes.value;
    } catch (err) {
      errorMsg = getErrorMessage(err);
    } finally {
      loading = false;
    }
  }

  function openEditTemplate(tpl: NotifyTemplateOut) {
    selectedTemplate = tpl;
    editTitle = tpl.title || '';
    editSubject = tpl.subject || '';
    editBodyMd = tpl.body_md || '';
    editChannels = tpl.channels || 'whatsapp,email';
    editIsTts = Boolean(tpl.is_tts);
  }

  async function saveTemplateChanges() {
    if (!selectedTemplate) return;
    savingTemplate = true;
    errorMsg = null;
    try {
      const updated = await patchNotifyTemplate(selectedTemplate.event, {
        title: editTitle,
        subject: editSubject,
        body_md: editBodyMd,
        channels: editChannels,
        is_tts: editIsTts,
      });
      templates = templates.map((t) => (t.event === updated.event ? updated : t));
      selectedTemplate = updated;
      successMsg = `Modelo "${updated.event}" salvo com sucesso!`;
    } catch (err) {
      errorMsg = getErrorMessage(err);
    } finally {
      savingTemplate = false;
    }
  }

  async function handleSendTest(eventKey: string) {
    testingEvent = eventKey;
    errorMsg = null;
    try {
      const res = await testNotifyTemplate(eventKey);
      successMsg = `Disparo de teste enviado com sucesso (${res.external_id}).`;
    } catch (err) {
      errorMsg = getErrorMessage(err);
    } finally {
      testingEvent = null;
    }
  }

  onMount(() => {
    loadAll();
  });
</script>

<div class="space-y-6">
  <!-- Cabeçalho -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
    <div>
      <div class="flex items-center gap-3">
        <h1 class="font-display text-2xl sm:text-3xl text-white tracking-wide">Central de Notificações & TTS</h1>
        <span class="rounded-full bg-brand-yellow/10 border border-brand-yellow/30 px-2.5 py-0.5 text-xs font-semibold text-brand-yellow">
          {templates.length} {templates.length === 1 ? 'modelo' : 'modelos'}
        </span>
      </div>
      <p class="text-xs sm:text-sm text-white/60 mt-1">
        Gestão de modelos de mensagens (WhatsApp, E-mail), catálogo de eventos, histórico de envios e síntese de voz (TTS).
      </p>
    </div>

    <div class="flex items-center gap-2 flex-wrap">
      <div class="flex rounded-xl bg-white/5 p-1 border border-white/10">
        <button
          type="button"
          onclick={() => (activeTab = 'templates')}
          class="min-h-[48px] rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer {activeTab === 'templates'
            ? 'bg-brand-yellow text-brand-ink shadow'
            : 'text-white/70 hover:text-white'}"
        >
          Modelos ({templates.length})
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'events')}
          class="min-h-[48px] rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer {activeTab === 'events'
            ? 'bg-brand-yellow text-brand-ink shadow'
            : 'text-white/70 hover:text-white'}"
        >
          Eventos ({events.length})
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'history')}
          class="min-h-[48px] rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer {activeTab === 'history'
            ? 'bg-brand-yellow text-brand-ink shadow'
            : 'text-white/70 hover:text-white'}"
        >
          Histórico
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'tts')}
          class="min-h-[48px] rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer {activeTab === 'tts'
            ? 'bg-brand-yellow text-brand-ink shadow'
            : 'text-white/70 hover:text-white'}"
        >
          Voz & TTS
        </button>
      </div>

      <button
        type="button"
        onclick={loadAll}
        class="min-h-[48px] inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-white/80 transition-all cursor-pointer"
      >
        ↻ Atualizar
      </button>
    </div>
  </div>

  {#if errorMsg}
    <div class="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center justify-between">
      <span>{errorMsg}</span>
      <button type="button" onclick={() => (errorMsg = null)} class="min-h-[48px] px-3 text-white/60 hover:text-white">✕</button>
    </div>
  {/if}

  {#if successMsg}
    <div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center justify-between">
      <span>{successMsg}</span>
      <button type="button" onclick={() => (successMsg = null)} class="min-h-[48px] px-3 text-white/60 hover:text-white">✕</button>
    </div>
  {/if}

  {#if loading}
    <div class="py-16 text-center text-sm text-white/40">
      Carregando central de notificações...
    </div>
  {:else if activeTab === 'templates'}
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-7 space-y-3">
        {#if templates.length === 0}
          <div class="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-white/40">
            Nenhum modelo de notificação cadastrado no momento.
          </div>
        {:else}
          {#each templates as tpl (tpl.event)}
            <div class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3 hover:border-white/20 transition">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span class="font-mono text-xs font-bold text-brand-yellow">{tpl.event}</span>
                  <h3 class="text-sm font-bold text-white mt-0.5">{tpl.title || 'Sem título'}</h3>
                </div>
                <div class="flex items-center gap-2">
                  {#if tpl.is_tts}
                    <span class="rounded-full bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-bold text-purple-300 uppercase">
                      Áudio TTS
                    </span>
                  {/if}
                  <span class="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    {formatChannels(tpl.channels)}
                  </span>
                </div>
              </div>

              <p class="text-xs text-white/70 whitespace-pre-line bg-black/20 rounded-xl p-3 border border-white/5">
                {tpl.body_md || '—'}
              </p>

              <div class="flex items-center justify-between gap-2 pt-1">
                <span class="text-[11px] text-white/40">
                  Atualizado em {formatDateBr(tpl.updated_at)}
                </span>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={testingEvent === tpl.event}
                    onclick={() => handleSendTest(tpl.event)}
                    class="min-h-[48px] rounded-xl border border-white/15 bg-white/5 hover:bg-white/15 px-3.5 py-2 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    {testingEvent === tpl.event ? 'Enviando...' : 'Testar Disparo'}
                  </button>
                  <button
                    type="button"
                    onclick={() => openEditTemplate(tpl)}
                    class="min-h-[48px] rounded-xl bg-brand-yellow/15 border border-brand-yellow/30 hover:bg-brand-yellow hover:text-brand-ink px-3.5 py-2 text-xs font-bold text-brand-yellow transition cursor-pointer"
                  >
                    Editar Modelo
                  </button>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <div class="lg:col-span-5">
        {#if selectedTemplate}
          <form
            onsubmit={(e) => {
              e.preventDefault();
              saveTemplateChanges();
            }}
            class="rounded-2xl border border-white/15 bg-white/5 p-6 space-y-4 sticky top-20"
          >
            <div class="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span class="text-[10px] uppercase font-bold text-brand-yellow">Edição de Modelo</span>
                <h3 class="text-base font-bold text-white font-mono">{selectedTemplate.event}</h3>
              </div>
              <button
                type="button"
                onclick={() => (selectedTemplate = null)}
                class="min-h-[48px] px-3 text-xs text-white/60 hover:text-white"
              >
                Fechar
              </button>
            </div>

            <div>
              <label for="tpl-title" class="block text-xs font-semibold text-white/80 mb-1">Título Interno</label>
              <input
                id="tpl-title"
                type="text"
                bind:value={editTitle}
                class="w-full min-h-[48px] rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label for="tpl-subject" class="block text-xs font-semibold text-white/80 mb-1">Assunto do E-mail</label>
              <input
                id="tpl-subject"
                type="text"
                bind:value={editSubject}
                class="w-full min-h-[48px] rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label for="tpl-channels" class="block text-xs font-semibold text-white/80 mb-1">Canais (separados por vírgula)</label>
              <input
                id="tpl-channels"
                type="text"
                bind:value={editChannels}
                class="w-full min-h-[48px] rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label for="tpl-body" class="block text-xs font-semibold text-white/80 mb-1">Mensagem (Markdown)</label>
              <textarea
                id="tpl-body"
                rows="5"
                bind:value={editBodyMd}
                class="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs text-white"
              ></textarea>
            </div>

            <label class="flex items-center gap-2.5 text-xs text-white/80 cursor-pointer">
              <input type="checkbox" bind:checked={editIsTts} class="h-4 w-4 rounded" />
              <span>Ativar síntese de voz (Áudio TTS no WhatsApp)</span>
            </label>

            <button
              type="submit"
              disabled={savingTemplate}
              class="w-full min-h-[48px] rounded-xl bg-brand-yellow px-5 py-2.5 text-xs font-bold text-brand-ink hover:brightness-110 transition cursor-pointer"
            >
              {savingTemplate ? 'Salvando...' : 'Salvar Modelo'}
            </button>
          </form>
        {:else}
          <div class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-xs text-white/40">
            Selecione um modelo ao lado para editar seu conteúdo, canais ou configuração de voz (TTS).
          </div>
        {/if}
      </div>
    </div>
  {:else if activeTab === 'events'}
    <div class="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
      <table class="w-full text-left text-xs text-white/80">
        <thead class="border-b border-white/10 bg-white/5 uppercase font-bold text-[10px] text-white/50 tracking-wider">
          <tr>
            <th class="px-4 py-3">Chave do Evento</th>
            <th class="px-4 py-3">Modelo no Banco</th>
            <th class="px-4 py-3">Padrão em Memória</th>
            <th class="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          {#each events as ev (ev.event)}
            <tr class="hover:bg-white/5 transition">
              <td class="px-4 py-3 font-mono font-bold text-brand-yellow">{ev.event}</td>
              <td class="px-4 py-3">{ev.has_template ? 'Configurado' : 'Não cadastrado'}</td>
              <td class="px-4 py-3">{ev.has_in_memory ? 'Disponível' : '—'}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {ev.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                  {ev.active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if activeTab === 'history'}
    {#if historyItems.length === 0}
      <div class="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-white/40">
        Nenhum disparo registrado no histórico recente.
      </div>
    {:else}
      <div class="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <table class="w-full text-left text-xs text-white/80">
          <thead class="border-b border-white/10 bg-white/5 uppercase font-bold text-[10px] text-white/50 tracking-wider">
            <tr>
              <th class="px-4 py-3">Destinatário</th>
              <th class="px-4 py-3">Título / Assunto</th>
              <th class="px-4 py-3">WhatsApp</th>
              <th class="px-4 py-3">E-mail</th>
              <th class="px-4 py-3">TTS</th>
              <th class="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            {#each historyItems as item}
              <tr class="hover:bg-white/5 transition">
                <td class="px-4 py-3 font-mono">{item.recipient_phone || item.recipient_email || '—'}</td>
                <td class="px-4 py-3 font-semibold text-white">{item.title || item.subject || 'Notificação'}</td>
                <td class="px-4 py-3">{translateStatus(item.whatsapp_status)}</td>
                <td class="px-4 py-3">{translateStatus(item.email_status)}</td>
                <td class="px-4 py-3">{translateStatus(item.tts_status)}</td>
                <td class="px-4 py-3 text-white/60">{item.created_at ? formatDateBr(String(item.created_at)) : '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else if activeTab === 'tts'}
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
      <h2 class="font-display text-lg text-white">Configuração de Síntese de Voz (OmniRoute TTS)</h2>
      {#if ttsConfig}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div class="rounded-xl bg-black/20 p-4 border border-white/10">
            <span class="text-white/40 block uppercase text-[10px] font-bold">Servidor OmniRoute</span>
            <span class="font-mono text-sm text-brand-yellow mt-1 block">{ttsConfig.omniroute_url}</span>
          </div>
          <div class="rounded-xl bg-black/20 p-4 border border-white/10">
            <span class="text-white/40 block uppercase text-[10px] font-bold">Regra de Voz Cruzada</span>
            <span class="text-white mt-1 block">{ttsConfig.cross_gender_rule}</span>
          </div>
        </div>

        <div class="space-y-2">
          <h3 class="text-xs font-bold uppercase tracking-wider text-white/50">Cadeia de Provedores de Voz</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {#each ttsConfig.chain as opt, idx}
              <div class="rounded-xl border border-white/10 bg-black/20 p-4 text-xs space-y-1">
                <div class="font-mono font-bold text-white">#{idx + 1} • {opt.model}</div>
                <div class="text-white/60">Voz Feminina: <strong class="text-white">{opt.voice_female}</strong></div>
                <div class="text-white/60">Voz Masculina: <strong class="text-white">{opt.voice_male}</strong></div>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <p class="text-xs text-white/40">Configuração de TTS indisponível no momento.</p>
      {/if}
    </div>
  {/if}
</div>
