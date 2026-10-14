<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    getPlatformSetup, updatePlatformSetup, listPromoters, getErrorMessage,
    type PromoterOut, type PlatformSetupOut,
  } from '@/lib/api';
  import {
    draftMoney, pricingDraftFingerprint, pricingDraftIssues, pricingDraftPayload, readPricingDraft,
    PricingConfigurationError, type PricingDraft,
  } from '@/lib/pricing-draft';
  import { formatCurrencyBrl } from '@/lib/utils';

  let loading = $state(true);
  let saving = $state(false);
  let errorMsg = $state<string | null>(null);
  let successMsg = $state<string | null>(null);
  let defaultPromoterId = $state('');
  let promoterOptions = $state<PromoterOut[]>([]);
  let loadedSuccessfully = $state(false);
  let savedSnapshot = $state<PricingDraft | null>(null);
  let showDraftErrors = $state(false);
  let errorSummary = $state<HTMLDivElement>();

  // Empty values remain unavailable until a complete server response is obtained.
  let anchorFull = $state('');
  let fullPricePix = $state('');
  let fullPriceCardReais = $state('');
  let promoPricePix = $state('');
  let promoPriceCardReais = $state('');
  let cardInstallments = $state<number | undefined>();
  let description = $state('');
  let promoterStudyUnlockThreshold = $state<number | undefined>();
  let promoterStudyCompleteThreshold = $state<number | undefined>();
  let commissionDirect = $state('');
  let commissionBonusFlat = $state('');
  let commissionBonusThreshold = $state<number | undefined>();
  let commissionCoordinator = $state('');
  let previewMode = $state<'promo' | 'regular'>('promo');

  let draft = $derived<PricingDraft>({
    defaultPromoterId, anchorFull, fullPricePix, fullPriceCardReais,
    promoPricePix, promoPriceCardReais, cardInstallments, description,
    promoterStudyUnlockThreshold, promoterStudyCompleteThreshold,
    commissionDirect, commissionBonusFlat, commissionBonusThreshold, commissionCoordinator,
  });
  let isDirty = $derived(savedSnapshot !== null && pricingDraftFingerprint(draft) !== pricingDraftFingerprint(savedSnapshot));
  let draftIssues = $derived(showDraftErrors ? pricingDraftIssues(draft) : []);
  let numFullPix = $derived(draftMoney(fullPricePix));
  let numFullCard = $derived(draftMoney(fullPriceCardReais));
  let numPromoPix = $derived(draftMoney(promoPricePix));
  let numPromoCard = $derived(draftMoney(promoPriceCardReais));
  let fullInstallment = $derived(numFullCard !== null && cardInstallments ? numFullCard / cardInstallments : null);
  let promoInstallment = $derived(numPromoCard !== null && cardInstallments ? numPromoCard / cardInstallments : null);
  let pixSavings = $derived(numFullPix !== null && numPromoPix !== null ? Math.max(0, numFullPix - numPromoPix) : 0);
  let cardSavings = $derived(numFullCard !== null && numPromoCard !== null ? Math.max(0, numFullCard - numPromoCard) : 0);

  function previewCurrency(value: number | string | null): string {
    return value === null ? 'Indisponível' : formatCurrencyBrl(value);
  }

  function fieldError(fieldId: string): string | undefined {
    return draftIssues.find((issue) => issue.fieldId === fieldId)?.message;
  }

  function applySetup(data: PlatformSetupOut) {
    const snapshot = readPricingDraft(data);
    defaultPromoterId = snapshot.defaultPromoterId;
    anchorFull = snapshot.anchorFull;
    fullPricePix = snapshot.fullPricePix;
    fullPriceCardReais = snapshot.fullPriceCardReais;
    promoPricePix = snapshot.promoPricePix;
    promoPriceCardReais = snapshot.promoPriceCardReais;
    cardInstallments = snapshot.cardInstallments;
    description = snapshot.description;
    promoterStudyUnlockThreshold = snapshot.promoterStudyUnlockThreshold;
    promoterStudyCompleteThreshold = snapshot.promoterStudyCompleteThreshold;
    commissionDirect = snapshot.commissionDirect;
    commissionBonusFlat = snapshot.commissionBonusFlat;
    commissionBonusThreshold = snapshot.commissionBonusThreshold;
    commissionCoordinator = snapshot.commissionCoordinator;
    savedSnapshot = snapshot;
    loadedSuccessfully = true;
  }

  onMount(() => { void loadPricing(); });

  async function loadPricing() {
    loading = true;
    loadedSuccessfully = false;
    errorMsg = null;
    successMsg = null;
    showDraftErrors = false;
    try {
      const [data, promoters] = await Promise.all([getPlatformSetup(), listPromoters()]);
      applySetup(data);
      promoterOptions = promoters;
    } catch (error: unknown) {
      errorMsg = error instanceof PricingConfigurationError
        ? error.message
        : getErrorMessage(error);
    } finally {
      loading = false;
    }
  }

  async function handleSave() {
    if (saving || loading || !loadedSuccessfully || !isDirty) return;
    showDraftErrors = true;
    if (pricingDraftIssues(draft).length) {
      errorMsg = 'Confira os campos indicados antes de salvar.';
      await tick();
      errorSummary?.focus();
      return;
    }
    saving = true;
    errorMsg = null;
    successMsg = null;
    try {
      const response = await updatePlatformSetup(pricingDraftPayload(draft));
      // Only a complete readback becomes the saved snapshot; a draft is never evidence of persistence.
      applySetup(response);
      showDraftErrors = false;
      successMsg = 'Configuração recebida do backend após salvar. As novas condições valem somente para novas propostas; cobranças já emitidas mantêm os valores anteriores.';
    } catch (error: unknown) {
      errorMsg = error instanceof PricingConfigurationError
        ? error.message
        : getErrorMessage(error);
    } finally {
      saving = false;
    }
  }
</script>

<div class="pricing-view space-y-8 max-w-6xl mx-auto pb-12">
  <!-- Cabeçalho -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-paper/10 pb-6">
    <div>
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green/10 border border-green/20 text-muted-on-dark text-xs font-semibold">
        <span>💰</span>
        <span>Gestão Comercial</span>
      </div>
      <h1 class="text-2xl sm:text-3xl font-display font-black text-paper mt-1">
        Tabela de Preços & Regras Comerciais
      </h1>
      <p class="text-xs sm:text-sm text-muted-on-dark max-w-2xl mt-1">
        Configure os valores do aluno (Preço Âncora e Preço com Indicação), metas da bolsa do promotor e comissões de venda.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onclick={loadPricing}
        disabled={loading || saving}
        class="px-4 min-h-12 py-2.5 rounded-xl border border-paper/10 bg-paper/5 hover:bg-paper/10 text-paper text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
      >
        Descartar / Recarregar
      </button>

      <button
        type="button"
        onclick={handleSave}
        disabled={loading || saving || !loadedSuccessfully || !isDirty}
        class="btn min-h-12 disabled:opacity-60 disabled:cursor-default text-sm"
      >
        {#if saving}
          <span class="inline-block h-3.5 w-3.5 border-2 border-ink border-t-transparent rounded-full animate-spin"></span>
          <span>Salvando...</span>
        {:else}
          <span>Salvar Alterações de Preço</span>
        {/if}
      </button>
    </div>
  </div>

  <div id="pricing-state" role="status" class="pricing-status" class:warning={isDirty || !!errorMsg}>
    {#if loading}Consultando configuração...
    {:else if saving}Salvando no servidor...
    {:else if !loadedSuccessfully}Configuração indisponível
    {:else if errorMsg}Falha ao salvar ou conferir a configuração; rascunho mantido
    {:else if isDirty}Rascunho alterado — ainda não salvo
    {:else}Valores salvos recebidos do servidor{/if}
  </div>

  <!-- Alertas de Status -->
  {#if errorMsg}
    <div bind:this={errorSummary} tabindex="-1" role="alert" class="pricing-alert danger">
      <div class="space-y-2">
        <span>{errorMsg}</span>
        {#if draftIssues.length}
          <ul class="mt-2 space-y-1">
            {#each draftIssues as issue}<li><a class="underline" href={'#' + issue.fieldId}>{issue.message}</a></li>{/each}
          </ul>
        {/if}
      </div>
      <button type="button" onclick={() => (errorMsg = null)} aria-label="Fechar mensagem" class="min-h-12 min-w-12 font-bold cursor-pointer">✕</button>
    </div>
  {/if}

  {#if successMsg && !isDirty}
    <div role="status" class="pricing-alert success">
      <div class="flex items-center gap-2">
        <span class="text-base">✓</span>
        <span>{successMsg}</span>
      </div>
      <button type="button" onclick={() => (successMsg = null)} aria-label="Fechar mensagem" class="min-h-12 min-w-12 font-bold cursor-pointer">✕</button>
    </div>
  {/if}

  {#if loading}
    <div class="rounded-3xl border border-paper/10 bg-paper/5 p-16 text-center text-muted-on-dark">
      <div class="inline-block h-8 w-8 border-2 border-paper/20 border-t-yellow rounded-full animate-spin mb-4"></div>
      <p class="text-sm font-medium">Carregando configurações de preços da plataforma...</p>
    </div>
  {:else if loadedSuccessfully}
    <fieldset disabled={saving} class="min-w-0 space-y-6 border-0 p-0">
    <section aria-labelledby="default-promoter-title" style="border: 1px solid var(--line-light); border-radius: var(--radius); padding: 1.5rem; background: var(--paper); color: var(--ink);">
      <h2 id="default-promoter-title" style="font-family: var(--font-display, 'Archivo Black', sans-serif);">Promotor padrão</h2>
      <p>Recebe as novas indicações quando o aluno chega sem um link válido de promotor. A seleção não altera o coordenador do polo nem propostas anteriores.</p>
      <label for="default-promoter">Responsável pelas indicações sem referência</label>
      <select id="default-promoter" bind:value={defaultPromoterId} disabled={saving} style="display: block; width: 100%; min-height: var(--input-height); border: 1px solid var(--line-light); border-radius: var(--input-radius); color: var(--ink); background: var(--paper); padding: 0.75rem;">
        <option value="">Usar o coordenador do polo padrão</option>
        {#each promoterOptions as promoter}
          <option value={promoter.external_id}>{promoter.name || 'Promotor sem nome'}</option>
        {/each}
      </select>
      {#if defaultPromoterId && !promoterOptions.some((item) => item.external_id === defaultPromoterId)}
        <p role="alert" style="color: var(--danger);">O promotor selecionado não está disponível na lista atual. Confira o cadastro antes de salvar.</p>
      {/if}
    </section>
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- Coluna de Configuração (Formulário) -->
      <div class="lg:col-span-7 space-y-6">
        <!-- 1. Tabela de Matrícula do Aluno -->
        <div class="rounded-3xl border border-green/30 bg-green/5 p-6 space-y-5">
          <div class="flex items-center gap-3 border-b border-green/20 pb-4">
            <div class="h-9 w-9 rounded-xl bg-green/20 border border-green/30 flex items-center justify-center text-muted-on-dark font-bold text-sm">
              1
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-bold text-paper">Matrícula do Aluno</h2>
                <span class="rounded-full bg-green/20 px-2 py-0.5 text-[9px] font-extrabold text-muted-on-dark uppercase">
                  Tabela Comercial
                </span>
              </div>
              <p class="text-xs text-muted-on-dark">
                A tabela sem indicação e a tabela com indicação são configuradas separadamente. As alterações valem para novas propostas.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Preço de Referência -->
            <div class="sm:col-span-2">
              <label for="anchor-full" class="block text-xs font-semibold text-muted-on-dark mb-1.5 flex items-center justify-between">
                <span>Preço de Referência da Vitrine (R$)</span>
                <span class="text-[10px] text-muted-on-dark font-normal">Usado como referência</span>
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-on-dark">R$</span>
                <input
                  id="anchor-full"
                  type="text"
                  bind:value={anchorFull}
                  placeholder="Valor em reais"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-paper/15 bg-paper/10 text-paper font-mono text-sm focus:outline-none focus:border-yellow focus:ring-2 focus:ring-yellow transition"
                aria-invalid={!!fieldError('anchor-full')} aria-describedby={fieldError('anchor-full') ? 'anchor-full-error' : undefined} />
{#if fieldError('anchor-full')}<p id="anchor-full-error" class="pricing-field-error">{fieldError('anchor-full')}</p>{/if}
              </div>
              <p class="text-[11px] text-muted-on-dark mt-1">
                Este valor é a referência exibida no resumo comercial. A cobrança sem indicação usa os campos da tabela cheia abaixo.
              </p>
            </div>

            <!-- Tabela cheia -->
            <div class="sm:col-span-2 rounded-2xl border border-blue/30 bg-blue/5 p-4 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-muted-on-dark">Sem indicação — tabela cheia</span>
                <span class="text-[10px] uppercase font-bold text-muted-on-dark">/ref ausente</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="full-price-pix" class="block text-xs font-semibold text-muted-on-dark mb-1.5">PIX à vista (R$)</label>
                  <div class="relative">
                    <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-on-dark">R$</span>
                    <input id="full-price-pix" type="text" bind:value={fullPricePix} placeholder="Valor em reais" class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-blue/30 bg-paper/10 text-paper font-mono text-sm focus:outline-none focus:border-yellow focus:ring-2 focus:ring-yellow transition" aria-invalid={!!fieldError('full-price-pix')} aria-describedby={fieldError('full-price-pix') ? 'full-price-pix-error' : undefined} />
{#if fieldError('full-price-pix')}<p id="full-price-pix-error" class="pricing-field-error">{fieldError('full-price-pix')}</p>{/if}
                  </div>
                </div>
                <div>
                  <label for="full-price-card" class="block text-xs font-semibold text-muted-on-dark mb-1.5">Cartão total (R$)</label>
                  <div class="relative">
                    <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-on-dark">R$</span>
                    <input id="full-price-card" type="text" bind:value={fullPriceCardReais} placeholder="Valor em reais" class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-blue/30 bg-paper/10 text-paper font-mono text-sm focus:outline-none focus:border-yellow focus:ring-2 focus:ring-yellow transition" aria-invalid={!!fieldError('full-price-card')} aria-describedby={fieldError('full-price-card') ? 'full-price-card-error' : undefined} />
{#if fieldError('full-price-card')}<p id="full-price-card-error" class="pricing-field-error">{fieldError('full-price-card')}</p>{/if}
                  </div>
                  <p class="text-[11px] text-muted-on-dark mt-1 font-mono">{cardInstallments}x de {previewCurrency(fullInstallment)}</p>
                </div>
              </div>
            </div>

            <!-- Tabela promocional -->
            <div class="sm:col-span-2 rounded-2xl border border-green/30 bg-green/5 p-4 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-muted-on-dark">Com indicação — tabela promocional</span>
                <span class="text-[10px] uppercase font-bold text-muted-on-dark">/ref válido</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="promo-price-pix" class="block text-xs font-semibold text-muted-on-dark mb-1.5">PIX à vista (R$)</label>
                  <div class="relative">
                    <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-on-dark">R$</span>
                    <input id="promo-price-pix" type="text" bind:value={promoPricePix} placeholder="Valor em reais" class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-green/30 bg-paper/10 text-paper font-mono text-sm focus:outline-none focus:border-yellow focus:ring-2 focus:ring-yellow transition" aria-invalid={!!fieldError('promo-price-pix')} aria-describedby={fieldError('promo-price-pix') ? 'promo-price-pix-error' : undefined} />
{#if fieldError('promo-price-pix')}<p id="promo-price-pix-error" class="pricing-field-error">{fieldError('promo-price-pix')}</p>{/if}
                  </div>
                  {#if pixSavings > 0}<p class="text-[11px] text-muted-on-dark mt-1 font-semibold">Economia de {previewCurrency(pixSavings)} vs tabela cheia</p>{/if}
                </div>
                <div>
                  <label for="promo-price-card" class="block text-xs font-semibold text-muted-on-dark mb-1.5">Cartão total (R$)</label>
                  <div class="relative">
                    <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-on-dark">R$</span>
                    <input id="promo-price-card" type="text" bind:value={promoPriceCardReais} placeholder="Valor em reais" class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-green/30 bg-paper/10 text-paper font-mono text-sm focus:outline-none focus:border-yellow focus:ring-2 focus:ring-yellow transition" aria-invalid={!!fieldError('promo-price-card')} aria-describedby={fieldError('promo-price-card') ? 'promo-price-card-error' : undefined} />
{#if fieldError('promo-price-card')}<p id="promo-price-card-error" class="pricing-field-error">{fieldError('promo-price-card')}</p>{/if}
                  </div>
                  <p class="text-[11px] text-muted-on-dark mt-1 font-mono">{cardInstallments}x de {previewCurrency(promoInstallment)}{#if cardSavings > 0} <span class="text-muted-on-dark">({previewCurrency(cardSavings)} de desconto)</span>{/if}</p>
                </div>
              </div>
            </div>

            <!-- Commercial reference returned by the server; checkout terms may differ. -->
            <div class="sm:col-span-2 rounded-2xl border border-paper/10 bg-paper/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
              <div class="space-y-0.5">
                <span class="text-xs font-bold text-paper flex items-center gap-1.5">
                  Referência comercial: {cardInstallments} parcelas
                </span>
                <p class="text-[11px] text-muted-on-dark">
                  Estimativa da tabela. As parcelas e os acréscimos efetivos são confirmados pela operadora.
                </p>
              </div>
              <span class="px-3 py-1 rounded-full bg-paper/10 text-paper font-mono text-xs font-bold border border-paper/10">
                Sem indicação: {cardInstallments}x de {previewCurrency(fullInstallment)} · Com indicação: {cardInstallments}x de {previewCurrency(promoInstallment)}
              </span>
            </div>
          </div>
        </div>

        <!-- 2. Programa Promotor-Estudante (Bolsa por Metas de Alunos) -->
        <div class="rounded-3xl border border-blue/30 bg-blue/5 p-6 space-y-5">
          <div class="flex items-center gap-3 border-b border-blue/20 pb-4">
            <div class="h-9 w-9 rounded-xl bg-blue/20 border border-blue/30 flex items-center justify-center text-muted-on-dark font-bold text-sm">
              2
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-bold text-paper">Programa Promotor-Estudante</h2>
                <span class="rounded-full bg-blue/20 px-2 py-0.5 text-[9px] font-extrabold text-muted-on-dark uppercase">
                  Bolsa por Metas
                </span>
              </div>
              <p class="text-xs text-muted-on-dark">
                O promotor ingressa pela promoção para captar alunos. Ao bater as metas, estuda 100% de graça.
              </p>
            </div>
          </div>

          <!-- Justificativa Comercial Canônica -->
          <div class="rounded-2xl border border-blue/30 bg-blue/30 p-4 space-y-2 text-xs">
            <div class="font-bold text-muted-on-dark flex items-center gap-1.5">
              <span>🎯</span> Regra de Negócio & Auto-Matrícula:
            </div>
            <ul class="space-y-1 text-muted-on-dark text-[11px] list-disc list-inside">
              <li>O promotor ingressa para divulgar e captar alunos na sua região.</li>
              <li>Ao atingir a <strong>meta de destravamento</strong>, tem sua matrícula gratuita liberada.</li>
              <li>Ao atingir a <strong>meta de quitação</strong>, tem seu curso 100% quitado e a prova final liberada.</li>
              <li>
                <strong>Se optar por pagar a matrícula de imediato</strong>: paga o <strong>preço com indicação</strong> configurado no Menu 1 ({previewCurrency(numPromoPix)} no PIX ou {cardInstallments}x de {previewCurrency(promoInstallment)} no cartão).
              </li>
            </ul>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="promoter-unlock-threshold" class="block text-xs font-semibold text-muted-on-dark mb-1.5">
                Meta para Destravar Matrícula (Alunos Pagos)
              </label>
              <input
                id="promoter-unlock-threshold"
                type="number"
                min="1"
                bind:value={promoterStudyUnlockThreshold}
                class="w-full px-3.5 py-2.5 rounded-xl border border-paper/15 bg-paper/10 text-paper font-mono text-sm focus:outline-none focus:border-yellow focus:ring-2 focus:ring-yellow transition"
              aria-invalid={!!fieldError('promoter-unlock-threshold')} aria-describedby={fieldError('promoter-unlock-threshold') ? 'promoter-unlock-threshold-error' : undefined} />
{#if fieldError('promoter-unlock-threshold')}<p id="promoter-unlock-threshold-error" class="pricing-field-error">{fieldError('promoter-unlock-threshold')}</p>{/if}
              <p class="text-[11px] text-muted-on-dark mt-1">Alunos confirmados necessários para liberar o estudo</p>
            </div>

            <div>
              <label for="promoter-complete-threshold" class="block text-xs font-semibold text-muted-on-dark mb-1.5">
                Meta para Quitação Total / Prova (Alunos Pagos)
              </label>
              <input
                id="promoter-complete-threshold"
                type="number"
                min="1"
                bind:value={promoterStudyCompleteThreshold}
                class="w-full px-3.5 py-2.5 rounded-xl border border-paper/15 bg-paper/10 text-paper font-mono text-sm focus:outline-none focus:border-yellow focus:ring-2 focus:ring-yellow transition"
              aria-invalid={!!fieldError('promoter-complete-threshold')} aria-describedby={fieldError('promoter-complete-threshold') ? 'promoter-complete-threshold-error' : undefined} />
{#if fieldError('promoter-complete-threshold')}<p id="promoter-complete-threshold-error" class="pricing-field-error">{fieldError('promoter-complete-threshold')}</p>{/if}
              <p class="text-[11px] text-muted-on-dark mt-1">Ao atingir esta meta, o promotor estuda 100% grátis</p>
            </div>
          </div>
        </div>

        <!-- 3. Comissões e Bônus de Promotores -->
        <div class="rounded-3xl border border-blue/30 bg-blue/5 p-6 space-y-5">
          <div class="flex items-center gap-3 border-b border-blue/20 pb-4">
            <div class="h-9 w-9 rounded-xl bg-blue/20 border border-blue/30 flex items-center justify-center text-muted-on-dark font-bold text-sm">
              3
            </div>
            <div>
              <h2 class="text-base font-bold text-paper">Comissões & Bônus de Promotores</h2>
              <p class="text-xs text-muted-on-dark">Valores propagados dinamicamente para o portal do promotor e calculadora de ganhos</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="commission-direct" class="block text-xs font-semibold text-muted-on-dark mb-1.5">
                Comissão Direta por Matrícula (R$)
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-on-dark">R$</span>
                <input
                  id="commission-direct"
                  type="text"
                  bind:value={commissionDirect}
                  placeholder="Valor em reais"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-paper/15 bg-paper/10 text-paper font-mono text-sm focus:outline-none focus:border-yellow focus:ring-2 focus:ring-yellow transition"
                aria-invalid={!!fieldError('commission-direct')} aria-describedby={fieldError('commission-direct') ? 'commission-direct-error' : undefined} />
{#if fieldError('commission-direct')}<p id="commission-direct-error" class="pricing-field-error">{fieldError('commission-direct')}</p>{/if}
              </div>
              <p class="text-[11px] text-muted-on-dark mt-1">Pago no PIX semanal por cada lead que concluiu pagamento</p>
            </div>

            <div>
              <label for="commission-bonus-flat" class="block text-xs font-semibold text-muted-on-dark mb-1.5">
                Bônus de Volume por Bloco (R$)
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-on-dark">R$</span>
                <input
                  id="commission-bonus-flat"
                  type="text"
                  bind:value={commissionBonusFlat}
                  placeholder="Valor em reais"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-paper/15 bg-paper/10 text-paper font-mono text-sm focus:outline-none focus:border-yellow focus:ring-2 focus:ring-yellow transition"
                aria-invalid={!!fieldError('commission-bonus-flat')} aria-describedby={fieldError('commission-bonus-flat') ? 'commission-bonus-flat-error' : undefined} />
{#if fieldError('commission-bonus-flat')}<p id="commission-bonus-flat-error" class="pricing-field-error">{fieldError('commission-bonus-flat')}</p>{/if}
              </div>
              <p class="text-[11px] text-muted-on-dark mt-1">Bônus adicional cumulativo por atingimento de meta de volume</p>
            </div>

            <div>
              <label for="commission-threshold" class="block text-xs font-semibold text-muted-on-dark mb-1.5">
                Meta do Bloco Semanal (Qtd Matrículas)
              </label>
              <input
                id="commission-threshold"
                type="number"
                min="1"
                bind:value={commissionBonusThreshold}
                class="w-full px-3.5 py-2.5 rounded-xl border border-paper/15 bg-paper/10 text-paper font-mono text-sm focus:outline-none focus:border-yellow focus:ring-2 focus:ring-yellow transition"
              aria-invalid={!!fieldError('commission-threshold')} aria-describedby={fieldError('commission-threshold') ? 'commission-threshold-error' : undefined} />
{#if fieldError('commission-threshold')}<p id="commission-threshold-error" class="pricing-field-error">{fieldError('commission-threshold')}</p>{/if}
              <p class="text-[11px] text-muted-on-dark mt-1">Quantidade de matrículas pagas na semana para destravar o bônus</p>
            </div>

            <div>
              <label for="commission-coordinator" class="block text-xs font-semibold text-muted-on-dark mb-1.5">
                Comissão de Polo / Coordenador (R$)
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-on-dark">R$</span>
                <input
                  id="commission-coordinator"
                  type="text"
                  bind:value={commissionCoordinator}
                  placeholder="Valor em reais"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-paper/15 bg-paper/10 text-paper font-mono text-sm focus:outline-none focus:border-yellow focus:ring-2 focus:ring-yellow transition"
                aria-invalid={!!fieldError('commission-coordinator')} aria-describedby={fieldError('commission-coordinator') ? 'commission-coordinator-error' : undefined} />
{#if fieldError('commission-coordinator')}<p id="commission-coordinator-error" class="pricing-field-error">{fieldError('commission-coordinator')}</p>{/if}
              </div>
              <p class="text-[11px] text-muted-on-dark mt-1">Repasse ao coordenador do polo por aluno vinculado</p>
            </div>
          </div>
        </div>

        <!-- 4. Metadados do Gateway -->
        <div class="rounded-3xl border border-paper/10 bg-paper/5 p-6 space-y-4">
          <h2 class="text-sm font-bold text-paper flex items-center gap-2">
            <span>⚙️ Metadados no Gateway de Pagamento</span>
          </h2>
          <div>
            <label for="enrollment-description" class="block text-xs font-semibold text-muted-on-dark mb-1.5">
              Descrição da Cobrança (Aparece no extrato / fatura)
            </label>
            <input
              id="enrollment-description"
              type="text"
              bind:value={description}
              placeholder="Matrícula Supletivo"
              class="w-full px-3.5 py-2.5 rounded-xl border border-paper/15 bg-paper/10 text-paper text-sm focus:outline-none focus:border-yellow focus:ring-2 focus:ring-yellow transition"
            aria-invalid={!!fieldError('enrollment-description')} aria-describedby={fieldError('enrollment-description') ? 'enrollment-description-error' : undefined} />
{#if fieldError('enrollment-description')}<p id="enrollment-description-error" class="pricing-field-error">{fieldError('enrollment-description')}</p>{/if}
            <p class="text-[11px] text-muted-on-dark mt-1">Enviado para Asaas (PIX) e InfinitePay (Cartão)</p>
          </div>
        </div>
      </div>

      <!-- Coluna Lateral: Prévia ao Vivo da Vitrine -->
      <div class="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
        <div class="rounded-3xl border border-paper/15 bg-gradient-to-b from-paper/10 to-paper/5 p-6 backdrop-blur-xl shadow-2xl space-y-6">
          <div class="flex flex-wrap gap-3 items-center justify-between border-b border-paper/10 pb-4">
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-muted-on-dark">Simulador de Vitrine</span>
              <h3 class="text-base font-bold text-paper">Prévia do rascunho</h3>
            </div>

            <!-- Alternador de Visão: Com ?ref= vs Sem ref -->
            <div class="inline-flex rounded-xl bg-ink/40 p-1 border border-paper/10 text-xs">
              <button
                type="button"
                aria-pressed={previewMode === 'promo'} onclick={() => (previewMode = 'promo')}
                class="min-h-12 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer {previewMode === 'promo' ? 'bg-green text-paper shadow' : 'text-muted-on-dark hover:text-paper'}"
              >
                Com ?ref=
              </button>
              <button
                type="button"
                aria-pressed={previewMode === 'regular'} onclick={() => (previewMode = 'regular')}
                class="min-h-12 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer {previewMode === 'regular' ? 'bg-blue text-paper shadow' : 'text-muted-on-dark hover:text-paper'}"
              >
                Sem ref
              </button>
            </div>
          </div>

          <p class="text-sm text-muted-on-dark">Prévia da tabela. Condições finais, parcelas e acréscimos são confirmados no checkout da operadora.</p>
          <!-- Card de Visualização do Aluno -->
          <div class="space-y-4">
            {#if previewMode === 'promo'}
              <div class="rounded-2xl border border-green/40 bg-gradient-to-r from-green/20 via-green/10 to-transparent p-3 text-xs text-muted-on-dark flex items-center justify-between">
                <span class="font-bold flex items-center gap-1.5">
                  <span>🏷️</span> Indicação de Consultor Ativa
                </span>
                <span class="text-[10px] uppercase font-extrabold bg-green/20 px-2 py-0.5 rounded-full border border-green/30 text-muted-on-dark">
                  Desconto Aplicado
                </span>
              </div>
            {:else}
              <div class="rounded-2xl border border-paper/10 bg-paper/5 p-3 text-xs text-muted-on-dark flex items-center justify-between">
                <span class="font-semibold flex items-center gap-1.5">
                  <span>🌐</span> Acesso Orgânico Direto
                </span>
                <span class="text-[10px] uppercase font-bold bg-paper/10 px-2 py-0.5 rounded-full text-muted-on-dark">
                  Tabela Cheia
                </span>
              </div>
            {/if}

            <!-- Card Destaque Parcelado -->
            <div class="rounded-2xl border border-paper/15 bg-ink-soft p-5 space-y-3 relative overflow-hidden">
              <div class="flex justify-between items-start">
                <span class="text-xs uppercase font-extrabold tracking-wider text-muted-on-dark">Prévia comercial</span>
                {#if previewMode === 'promo'}
                  <span class="line-through text-xs font-mono text-muted-on-dark">
                    de {previewCurrency(numFullCard)}
                  </span>
                {/if}
              </div>

              <div>
                <span class="text-xs text-muted-on-dark">Referência comercial de parcelamento</span>
                <div class="text-3xl font-display font-black text-paper tracking-tight mt-0.5">
                  {cardInstallments}x de {previewCurrency(previewMode === 'promo' ? promoInstallment : fullInstallment)}
                </div>
                <span class="text-xs text-muted-on-dark">
                  Total base no cartão: {previewCurrency(previewMode === 'promo' ? numPromoCard : numFullCard)}
                </span>
              </div>

              <div class="pt-2 border-t border-paper/10 flex items-center justify-between text-xs">
                <span class="text-muted-on-dark font-semibold flex items-center gap-1">
                  <span>⚡</span> PIX à vista
                </span>
                <span class="text-paper font-mono font-bold">
                  {previewCurrency(previewMode === 'promo' ? numPromoPix : numFullPix)}
                </span>
              </div>
            </div>

            <!-- Comparativo de Economia (quando com ref) -->
            {#if previewMode === 'promo' && (pixSavings > 0 || cardSavings > 0)}
              <div class="rounded-2xl border border-green/30 bg-green/10 p-4 space-y-2 text-xs">
                <div class="font-bold text-muted-on-dark flex items-center gap-1.5">
                  <span>✨</span> Economia do Aluno com o Consultor:
                </div>
                <div class="space-y-1 text-muted-on-dark font-mono text-[11px]">
                  <div class="flex justify-between">
                    <span>Desconto no PIX à Vista:</span>
                    <span class="font-bold text-muted-on-dark">{previewCurrency(pixSavings)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Desconto no Cartão (Total):</span>
                    <span class="font-bold text-muted-on-dark">{previewCurrency(cardSavings)}</span>
                  </div>
                </div>
              </div>
            {/if}

            {#if savedSnapshot}
              <div class="rounded-2xl border border-paper/10 bg-ink-soft p-4 space-y-2 text-sm">
                <h3 class="font-bold text-paper">Valores salvos no servidor</h3>
                <dl class="space-y-2 text-muted-on-dark">
                  <div class="flex justify-between gap-3"><dt>Pix sem indicação</dt><dd>{previewCurrency(savedSnapshot.fullPricePix)}</dd></div>
                  <div class="flex justify-between gap-3"><dt>Pix com indicação</dt><dd>{previewCurrency(savedSnapshot.promoPricePix)}</dd></div>
                  <div class="flex justify-between gap-3"><dt>Cartão sem indicação (total base)</dt><dd>{previewCurrency(savedSnapshot.fullPriceCardReais)}</dd></div>
                  <div class="flex justify-between gap-3"><dt>Cartão com indicação (total base)</dt><dd>{previewCurrency(savedSnapshot.promoPriceCardReais)}</dd></div>
                  <div class="flex justify-between gap-3"><dt>Referência de parcelas</dt><dd>{savedSnapshot.cardInstallments}</dd></div>
                </dl>
              </div>
            {/if}
            <!-- Resumo do rascunho -->
            <div class="rounded-2xl border border-paper/10 bg-paper/5 p-4 space-y-2 text-[11px] text-muted-on-dark font-mono">
              <div class="text-muted-on-dark font-bold uppercase tracking-wider text-[10px]">
                {isDirty ? 'Resumo do rascunho' : 'Resumo dos valores salvos'}
              </div>
              <div class="flex justify-between">
                <span>PIX sem indicação:</span>
                <span class="text-paper">{previewCurrency(numFullPix)}</span>
              </div>
              <div class="flex justify-between">
                <span>PIX com indicação:</span>
                <span class="text-muted-on-dark">{previewCurrency(numPromoPix)}</span>
              </div>
              <div class="flex justify-between">
                <span>Cartão sem indicação:</span>
                <span class="text-paper">{cardInstallments}x de {previewCurrency(fullInstallment)}</span>
              </div>
              <div class="flex justify-between">
                <span>Cartão com indicação:</span>
                <span class="text-muted-on-dark">{cardInstallments}x de {previewCurrency(promoInstallment)}</span>
              </div>
              <div class="flex justify-between">
                <span>Auto-Matrícula Promotor:</span>
                <span class="text-muted-on-dark">Paga com desconto</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </fieldset>
  {/if}
</div>

<style>
  .pricing-view { color: var(--paper); }
  .pricing-view .btn { font-size: 0.875rem; padding: 0.85rem 1.25rem; }
  .pricing-view button:focus-visible { outline: 3px solid var(--yellow); outline-offset: 3px; }
  .pricing-status { display: inline-block; border-radius: var(--radius-pill); background: var(--info-bg); color: var(--info); padding: 0.75rem 1rem; font-size: 0.875rem; font-weight: 700; }
  .pricing-status.warning { background: var(--warning-bg); color: var(--warning); }
  .pricing-alert { border-radius: var(--radius); padding: 1rem; font-size: 0.875rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .pricing-alert.danger, .pricing-field-error { color: var(--danger); background: var(--danger-bg); }
  .pricing-alert.success { color: var(--success); background: var(--success-bg); }
  .pricing-field-error { border-radius: var(--input-radius); padding: 0.5rem; margin-top: 0.5rem; font-size: 0.875rem; }
</style>
