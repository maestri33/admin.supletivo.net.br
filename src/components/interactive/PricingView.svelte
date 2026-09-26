<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getPlatformSetup,
    updatePlatformSetup,
    type PlatformSetupPricing,
    type PricingUpdateIn,
  } from '@/lib/api';
  import { formatCurrencyBrl } from '@/lib/utils';

  let loading = $state(true);
  let saving = $state(false);
  let errorMsg = $state<string | null>(null);
  let successMsg = $state<string | null>(null);

  // Form Fields (editable)
  let pricePix = $state('1615.00');
  let priceCardReais = $state('1932.00');
  let promoPricePix = $state('999.00');
  let promoPriceCardReais = $state('1188.00');
  let cardInstallments = $state(12);
  let anchorFull = $state('1932.00');
  let description = $state('Matrícula Supletivo');

  // Promoter self-study program
  let promoterStudyUnlockThreshold = $state(3);
  let promoterStudyCompleteThreshold = $state(10);
  let promoterPricePix = $state('5.00');
  let promoterPriceCardReais = $state('1.00');

  // Live Preview Mode: 'regular' | 'promo'
  let previewMode = $state<'regular' | 'promo'>('promo');

  // Derived Calculations for Preview
  let numPricePix = $derived(parseFloat(pricePix.replace(',', '.')) || 0);
  let numPriceCard = $derived(parseFloat(priceCardReais.replace(',', '.')) || 0);
  let numPromoPix = $derived(parseFloat(promoPricePix.replace(',', '.')) || 0);
  let numPromoCard = $derived(parseFloat(promoPriceCardReais.replace(',', '.')) || 0);
  let numAnchor = $derived(parseFloat(anchorFull.replace(',', '.')) || 0);
  let numInstallments = $derived(Math.max(1, cardInstallments || 12));

  let regularInstallment = $derived(numInstallments > 0 ? (numPriceCard / numInstallments) : 0);
  let promoInstallment = $derived(numInstallments > 0 ? (numPromoCard / numInstallments) : 0);

  let pixSavings = $derived(Math.max(0, numPricePix - numPromoPix));
  let cardSavings = $derived(Math.max(0, numPriceCard - numPromoCard));

  onMount(async () => {
    await loadPricing();
  });

  async function loadPricing() {
    loading = true;
    errorMsg = null;
    try {
      const data = await getPlatformSetup();
      if (data.pricing) {
        const p = data.pricing;
        pricePix = p.price_pix ?? '1615.00';
        priceCardReais = p.price_card_reais ?? (p.price_card_cents ? (p.price_card_cents / 100).toFixed(2) : '1932.00');
        promoPricePix = p.promo_price_pix ?? '999.00';
        promoPriceCardReais = p.promo_price_card_reais ?? (p.promo_price_card_cents ? (p.promo_price_card_cents / 100).toFixed(2) : '1188.00');
        cardInstallments = p.card_installments ?? 12;
        anchorFull = p.anchor_full ?? '1932.00';
        description = p.description ?? 'Matrícula Supletivo';

        promoterStudyUnlockThreshold = p.promoter_study_unlock_threshold ?? 3;
        promoterStudyCompleteThreshold = p.promoter_study_complete_threshold ?? 10;
        promoterPricePix = p.promoter_price_pix ?? '5.00';
        promoterPriceCardReais = p.promoter_price_card_reais ?? (p.promoter_price_card_cents ? (p.promoter_price_card_cents / 100).toFixed(2) : '1.00');
      }
    } catch (err: any) {
      errorMsg = err?.message || 'Falha ao carregar configurações de preços do servidor.';
    } finally {
      loading = false;
    }
  }

  async function handleSave() {
    saving = true;
    errorMsg = null;
    successMsg = null;

    try {
      const cardCents = Math.round(numPriceCard * 100);
      const promoCardCents = Math.round(numPromoCard * 100);
      const promoterCardCents = Math.round((parseFloat(promoterPriceCardReais.replace(',', '.')) || 0) * 100);

      const pricingPayload: PricingUpdateIn = {
        price_pix: numPricePix.toFixed(2),
        price_card_cents: cardCents,
        promo_price_pix: numPromoPix.toFixed(2),
        promo_price_card_cents: promoCardCents,
        card_installments: numInstallments,
        anchor_full: numAnchor.toFixed(2),
        description: description.trim() || 'Matrícula Supletivo',
        promoter_study_unlock_threshold: Math.max(1, promoterStudyUnlockThreshold || 3),
        promoter_study_complete_threshold: Math.max(1, promoterStudyCompleteThreshold || 10),
        promoter_price_pix: (parseFloat(promoterPricePix.replace(',', '.')) || 0).toFixed(2),
        promoter_price_card_cents: promoterCardCents,
      };

      const res = await updatePlatformSetup({ pricing: pricingPayload });
      if (res.pricing) {
        successMsg = 'Preços e regras comerciais atualizados com sucesso! O cache foi invalidado e a vitrine já reflete os novos valores.';
      }
    } catch (err: any) {
      errorMsg = err?.message || 'Falha ao salvar tabela de preços. Verifique suas permissões.';
    } finally {
      saving = false;
    }
  }
</script>

<div class="space-y-8 max-w-6xl mx-auto pb-12">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
    <div>
      <div class="flex items-center gap-2">
        <span class="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
          Preços & Negócios
        </span>
        <span class="text-xs text-white/40 font-mono">PlatformSetting</span>
      </div>
      <h1 class="text-2xl sm:text-3xl font-display font-black text-white mt-1">
        Tabela de Preços & Regras Comerciais
      </h1>
      <p class="text-xs sm:text-sm text-white/60 max-w-2xl mt-1">
        Defina os valores de vitrine, desconto por link de consultor, parcelamento e regras da bolsa do promotor.
      </p>
    </div>

    <div class="flex items-center gap-3">
      <button
        type="button"
        onclick={loadPricing}
        disabled={loading || saving}
        class="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
      >
        Descartar / Recarregar
      </button>

      <button
        type="button"
        onclick={handleSave}
        disabled={loading || saving}
        class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center gap-2"
      >
        {#if saving}
          <span class="inline-block h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
          <span>Salvando...</span>
        {:else}
          <span>Salvar Alterações de Preço</span>
        {/if}
      </button>
    </div>
  </div>

  <!-- Alertas -->
  {#if errorMsg}
    <div class="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-base">⚠️</span>
        <span>{errorMsg}</span>
      </div>
      <button type="button" onclick={() => (errorMsg = null)} class="text-white/60 hover:text-white font-bold px-2">✕</button>
    </div>
  {/if}

  {#if successMsg}
    <div class="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-base">✓</span>
        <span>{successMsg}</span>
      </div>
      <button type="button" onclick={() => (successMsg = null)} class="text-white/60 hover:text-white font-bold px-2">✕</button>
    </div>
  {/if}

  {#if loading}
    <div class="rounded-3xl border border-white/10 bg-white/5 p-16 text-center text-white/60">
      <div class="inline-block h-8 w-8 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin mb-4"></div>
      <p class="text-sm font-medium">Carregando configurações de preços da plataforma...</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- Coluna de Configuração (Formulário) -->
      <div class="lg:col-span-7 space-y-6">
        <!-- 1. Tabela Padrão (Vitrine Aberta) -->
        <div class="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-5">
          <div class="flex items-center gap-3 border-b border-white/10 pb-4">
            <div class="h-9 w-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 font-bold text-sm">
              1
            </div>
            <div>
              <h2 class="text-base font-bold text-white">Matrícula Padrão (Sem Indicação)</h2>
              <p class="text-xs text-white/50">Cobrado quando o lead chega organicamente ou sem ref de promotor</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="price-pix" class="block text-xs font-semibold text-white/80 mb-1.5">
                Valor PIX à Vista (R$)
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">R$</span>
                <input
                  id="price-pix"
                  type="text"
                  bind:value={pricePix}
                  placeholder="1615.00"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-emerald-400 transition"
                />
              </div>
              <p class="text-[11px] text-white/40 mt-1">Ex: 1615.00 ou 5.00 em testes</p>
            </div>

            <div>
              <label for="price-card" class="block text-xs font-semibold text-white/80 mb-1.5">
                Valor Total no Cartão (R$)
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">R$</span>
                <input
                  id="price-card"
                  type="text"
                  bind:value={priceCardReais}
                  placeholder="1932.00"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-emerald-400 transition"
                />
              </div>
              <p class="text-[11px] text-white/40 mt-1">Total a ser cobrado no gateway</p>
            </div>

            <div>
              <label for="card-installments" class="block text-xs font-semibold text-white/80 mb-1.5">
                Parcelas Máximas Cartão
              </label>
              <input
                id="card-installments"
                type="number"
                min="1"
                max="24"
                bind:value={cardInstallments}
                class="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-emerald-400 transition"
              />
              <p class="text-[11px] text-emerald-400 mt-1 font-mono">
                {numInstallments}x de {formatCurrencyBrl(regularInstallment)}
              </p>
            </div>

            <div>
              <label for="anchor-full" class="block text-xs font-semibold text-white/80 mb-1.5">
                Preço Âncora Riscado (R$)
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">R$</span>
                <input
                  id="anchor-full"
                  type="text"
                  bind:value={anchorFull}
                  placeholder="1932.00"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-emerald-400 transition"
                />
              </div>
              <p class="text-[11px] text-white/40 mt-1">Aparece riscado ("de R$ 1.932 por...")</p>
            </div>
          </div>
        </div>

        <!-- 2. Tabela Promocional (Com Link de Consultor ?ref=) -->
        <div class="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-5">
          <div class="flex items-center gap-3 border-b border-amber-500/20 pb-4">
            <div class="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-sm">
              2
            </div>
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <span>Condição Especial de Consultor (?ref=)</span>
                <span class="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-extrabold text-amber-300 uppercase">
                  Desconto Ativo
                </span>
              </h2>
              <p class="text-xs text-white/50">Preço com desconto exclusivo para alunos captados por promotores</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="promo-pix" class="block text-xs font-semibold text-white/80 mb-1.5">
                Valor PIX Promocional (R$)
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">R$</span>
                <input
                  id="promo-pix"
                  type="text"
                  bind:value={promoPricePix}
                  placeholder="999.00"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-amber-400 transition"
                />
              </div>
              {#if pixSavings > 0}
                <p class="text-[11px] text-amber-300 mt-1 font-semibold">
                  Economia de {formatCurrencyBrl(pixSavings)} no PIX
                </p>
              {/if}
            </div>

            <div>
              <label for="promo-card" class="block text-xs font-semibold text-white/80 mb-1.5">
                Valor Cartão Promocional Total (R$)
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">R$</span>
                <input
                  id="promo-card"
                  type="text"
                  bind:value={promoPriceCardReais}
                  placeholder="1188.00"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-amber-400 transition"
                />
              </div>
              <p class="text-[11px] text-amber-300 mt-1 font-mono">
                {numInstallments}x de {formatCurrencyBrl(promoInstallment)}
                {#if cardSavings > 0}
                  <span class="text-white/60">({formatCurrencyBrl(cardSavings)} off)</span>
                {/if}
              </p>
            </div>
          </div>
        </div>

        <!-- 3. Auto-Matrícula do Promotor (Bolsa de Estudo) -->
        <div class="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-5">
          <div class="flex items-center gap-3 border-b border-white/10 pb-4">
            <div class="h-9 w-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 font-bold text-sm">
              3
            </div>
            <div>
              <h2 class="text-base font-bold text-white">Programa Promotor-Estudante</h2>
              <p class="text-xs text-white/50">Regras e valores para promotores ativos que querem concluir seus estudos</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="promoter-unlock-threshold" class="block text-xs font-semibold text-white/80 mb-1.5">
                Meta para Destravar Matrícula (Alunos)
              </label>
              <input
                id="promoter-unlock-threshold"
                type="number"
                min="0"
                bind:value={promoterStudyUnlockThreshold}
                class="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-purple-400 transition"
              />
              <p class="text-[11px] text-white/40 mt-1">Indicações confirmadas necessárias</p>
            </div>

            <div>
              <label for="promoter-complete-threshold" class="block text-xs font-semibold text-white/80 mb-1.5">
                Meta para Quitação Total / Prova (Alunos)
              </label>
              <input
                id="promoter-complete-threshold"
                type="number"
                min="1"
                bind:value={promoterStudyCompleteThreshold}
                class="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-purple-400 transition"
              />
              <p class="text-[11px] text-white/40 mt-1">Ao atingir, o promotor estuda 100% grátis</p>
            </div>

            <div>
              <label for="promoter-pix" class="block text-xs font-semibold text-white/80 mb-1.5">
                Valor PIX Promotor (R$)
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">R$</span>
                <input
                  id="promoter-pix"
                  type="text"
                  bind:value={promoterPricePix}
                  placeholder="5.00"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <p class="text-[11px] text-white/40 mt-1">Valor especial sem comissão repassada</p>
            </div>

            <div>
              <label for="promoter-card" class="block text-xs font-semibold text-white/80 mb-1.5">
                Valor Cartão Promotor (R$)
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">R$</span>
                <input
                  id="promoter-card"
                  type="text"
                  bind:value={promoterPriceCardReais}
                  placeholder="1.00"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <p class="text-[11px] text-white/40 mt-1">Cobrado no gateway para promotor</p>
            </div>
          </div>
        </div>

        <!-- 4. Metadados do Gateway -->
        <div class="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 class="text-sm font-bold text-white flex items-center gap-2">
            <span>⚙️ Metadados no Gateway de Pagamento</span>
          </h2>
          <div>
            <label for="enrollment-description" class="block text-xs font-semibold text-white/80 mb-1.5">
              Descrição da Cobrança (Aparece no extrato / fatura)
            </label>
            <input
              id="enrollment-description"
              type="text"
              bind:value={description}
              placeholder="Matrícula Supletivo"
              class="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white text-sm focus:outline-none focus:border-emerald-400 transition"
            />
            <p class="text-[11px] text-white/40 mt-1">Enviado para Asaas (PIX) e InfinitePay (Cartão)</p>
          </div>
        </div>
      </div>

      <!-- Coluna Lateral: Preview ao Vivo da Vitrine -->
      <div class="lg:col-span-5 space-y-4 sticky top-6">
        <div class="rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 to-white/5 p-6 backdrop-blur-xl shadow-2xl space-y-6">
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Simulador</span>
              <h3 class="text-base font-bold text-white">Preview em Tempo Real</h3>
            </div>

            <!-- Alternador de Visão -->
            <div class="inline-flex rounded-xl bg-black/40 p-1 border border-white/10 text-xs">
              <button
                type="button"
                onclick={() => (previewMode = 'promo')}
                class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer {previewMode === 'promo' ? 'bg-amber-500 text-slate-950 shadow' : 'text-white/60 hover:text-white'}"
              >
                Com ?ref=
              </button>
              <button
                type="button"
                onclick={() => (previewMode = 'regular')}
                class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer {previewMode === 'regular' ? 'bg-blue-600 text-white shadow' : 'text-white/60 hover:text-white'}"
              >
                Sem ref
              </button>
            </div>
          </div>

          <!-- Preview do Card de Aluno -->
          <div class="space-y-4">
            {#if previewMode === 'promo'}
              <div class="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent p-3 text-xs text-amber-200 flex items-center justify-between">
                <span class="font-bold flex items-center gap-1.5">
                  <span>🏷️</span> Indicação de Consultor Ativa
                </span>
                <span class="text-[10px] uppercase font-extrabold bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                  Economia Especial
                </span>
              </div>
            {/if}

            <!-- Card Destaque Parcelado -->
            <div class="rounded-2xl border border-white/15 bg-slate-900/80 p-5 space-y-3 relative overflow-hidden">
              <div class="flex justify-between items-start">
                <span class="text-xs uppercase font-extrabold tracking-wider text-white/50">Plano Oficial</span>
                {#if previewMode === 'promo'}
                  <span class="line-through text-xs font-mono text-white/40">
                    de {formatCurrencyBrl(numAnchor)}
                  </span>
                {/if}
              </div>

              <div>
                <span class="text-xs text-white/60">em até {numInstallments}x no cartão</span>
                <div class="text-3xl font-display font-black text-white tracking-tight mt-0.5">
                  {numInstallments}x de {formatCurrencyBrl(previewMode === 'promo' ? promoInstallment : regularInstallment)}
                </div>
                <span class="text-xs text-white/50">
                  Total no cartão: {formatCurrencyBrl(previewMode === 'promo' ? numPromoCard : numPriceCard)}
                </span>
              </div>

              <div class="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span class="text-emerald-400 font-semibold flex items-center gap-1">
                  <span>⚡</span> PIX à vista com desconto
                </span>
                <span class="text-white font-mono font-bold">
                  {formatCurrencyBrl(previewMode === 'promo' ? numPromoPix : numPricePix)}
                </span>
              </div>
            </div>

            <!-- Comparativo de Economia -->
            {#if previewMode === 'promo' && (pixSavings > 0 || cardSavings > 0)}
              <div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2 text-xs">
                <div class="font-bold text-emerald-300 flex items-center gap-1.5">
                  <span>✨</span> Vantagens percebidas pelo aluno com o consultor:
                </div>
                <div class="space-y-1 text-white/80 font-mono text-[11px]">
                  <div class="flex justify-between">
                    <span>Economia no PIX:</span>
                    <span class="font-bold text-emerald-400">{formatCurrencyBrl(pixSavings)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Economia no Cartão:</span>
                    <span class="font-bold text-emerald-400">{formatCurrencyBrl(cardSavings)}</span>
                  </div>
                </div>
              </div>
            {/if}

            <!-- Resumo Técnico de Gateway -->
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2 text-[11px] text-white/60 font-mono">
              <div class="text-white/80 font-bold uppercase tracking-wider text-[10px]">
                Integrações & Endpoints
              </div>
              <div class="flex justify-between">
                <span>GET /api/v1/clients/pricing:</span>
                <span class="text-emerald-400">Ativo</span>
              </div>
              <div class="flex justify-between">
                <span>Descrição da cobrança:</span>
                <span class="text-white truncate max-w-[140px]">{description}</span>
              </div>
              <div class="flex justify-between">
                <span>Centavos Cartão Regular:</span>
                <span class="text-white">{Math.round(numPriceCard * 100)}</span>
              </div>
              <div class="flex justify-between">
                <span>Centavos Cartão Promo:</span>
                <span class="text-white">{Math.round(numPromoCard * 100)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
