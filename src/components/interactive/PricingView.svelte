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

  // 1. Matrícula Aluno (Unificado: Sem Ref é Âncora; Com Ref é o Preço Promocional)
  let anchorFull = $state('1932.00'); // Preço Âncora / Tabela Sem Indicação
  let pricePix = $state('999.00'); // Valor PIX com Desconto de Indicação (?ref=)
  let priceCardReais = $state('1188.00'); // Valor Cartão Total com Desconto de Indicação (?ref=)
  const cardInstallments = 12; // 12 parcelas fixas (padrão comercial não editável)
  let description = $state('Matrícula Supletivo');

  // 2. Programa Promotor-Estudante (Bolsa por Metas de Captação)
  let promoterStudyUnlockThreshold = $state(3); // Meta para destravar matrícula
  let promoterStudyCompleteThreshold = $state(10); // Meta para quitação total / prova

  // 3. Comissões e Volume de Promotores
  let commissionDirect = $state('100.00');
  let commissionBonusFlat = $state('500.00');
  let commissionBonusThreshold = $state(5);
  let commissionCoordinator = $state('50.00');

  // Simulador de Vitrine: 'promo' (Com ?ref=) | 'regular' (Sem indicação)
  let previewMode = $state<'promo' | 'regular'>('promo');

  // Cálculos Derivados
  let numAnchor = $derived(parseFloat(anchorFull.replace(',', '.')) || 0);
  let numPricePix = $derived(parseFloat(pricePix.replace(',', '.')) || 0);
  let numPriceCard = $derived(parseFloat(priceCardReais.replace(',', '.')) || 0);

  // Parcelamento 12x fixas
  let anchorInstallment = $derived(numAnchor > 0 ? numAnchor / 12 : 0);
  let promoInstallment = $derived(numPriceCard > 0 ? numPriceCard / 12 : 0);

  // Economia da Indicação frente à Âncora
  let pixSavings = $derived(Math.max(0, numAnchor - numPricePix));
  let cardSavings = $derived(Math.max(0, numAnchor - numPriceCard));

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
        // Prioriza os valores de desconto/promocionais como a tabela comercial oficial com ref
        pricePix = p.promo_price_pix ?? p.price_pix ?? '999.00';
        priceCardReais = p.promo_price_card_reais ?? (p.promo_price_card_cents ? (p.promo_price_card_cents / 100).toFixed(2) : (p.price_card_reais ?? '1188.00'));
        anchorFull = p.anchor_full ?? '1932.00';
        description = p.description ?? 'Matrícula Supletivo';

        promoterStudyUnlockThreshold = p.promoter_study_unlock_threshold ?? 3;
        promoterStudyCompleteThreshold = p.promoter_study_complete_threshold ?? 10;
      }

      if (data.commissions) {
        const c = data.commissions;
        commissionDirect = c.commission_direct ?? '100.00';
        commissionBonusFlat = c.commission_bonus_flat ?? '500.00';
        commissionBonusThreshold = c.commission_bonus_threshold ?? 5;
        commissionCoordinator = c.commission_coordinator ?? '50.00';
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

      // Regra Canônica:
      // - Sem Ref: o preço é o preço âncora de tabela (anchor_full)
      // - Com Ref: o preço é o valor com desconto (promo_price_* e price_*)
      // - 12 parcelas fixas
      // - Promotor que pagar avulso: paga exatamente o preço anterior com desconto
      const pricingPayload: PricingUpdateIn = {
        price_pix: numPricePix.toFixed(2),
        price_card_cents: cardCents,
        promo_price_pix: numPricePix.toFixed(2),
        promo_price_card_cents: cardCents,
        card_installments: 12,
        anchor_full: numAnchor.toFixed(2),
        description: description.trim() || 'Matrícula Supletivo',
        promoter_study_unlock_threshold: Math.max(1, promoterStudyUnlockThreshold || 3),
        promoter_study_complete_threshold: Math.max(1, promoterStudyCompleteThreshold || 10),
        promoter_price_pix: numPricePix.toFixed(2),
        promoter_price_card_cents: cardCents,
      };

      const commissionsPayload = {
        commission_direct: (parseFloat(commissionDirect.replace(',', '.')) || 0).toFixed(2),
        commission_bonus_flat: (parseFloat(commissionBonusFlat.replace(',', '.')) || 0).toFixed(2),
        commission_bonus_threshold: Math.max(1, commissionBonusThreshold || 5),
        commission_coordinator: (parseFloat(commissionCoordinator.replace(',', '.')) || 0).toFixed(2),
      };

      const res = await updatePlatformSetup({
        pricing: pricingPayload,
        commissions: commissionsPayload,
      });

      if (res.pricing || res.commissions) {
        successMsg = 'Tabela de preços e regras de comissão salvas com sucesso! As alterações já estão sincronizadas com o backend e todas as vitrines.';
      }
    } catch (err: any) {
      errorMsg = err?.message || 'Falha ao salvar tabela de preços. Verifique suas permissões.';
    } finally {
      saving = false;
    }
  }
</script>

<div class="space-y-8 max-w-6xl mx-auto pb-12">
  <!-- Cabeçalho -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
    <div>
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
        <span>💰</span>
        <span>Gestão Comercial</span>
      </div>
      <h1 class="text-2xl sm:text-3xl font-display font-black text-white mt-1">
        Tabela de Preços & Regras Comerciais
      </h1>
      <p class="text-xs sm:text-sm text-white/60 max-w-2xl mt-1">
        Configure os valores do aluno (Preço Âncora e Preço com Indicação), metas da bolsa do promotor e comissões de venda.
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

  <!-- Alertas de Status -->
  {#if errorMsg}
    <div class="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-base">⚠️</span>
        <span>{errorMsg}</span>
      </div>
      <button type="button" onclick={() => (errorMsg = null)} class="text-white/60 hover:text-white font-bold px-2 cursor-pointer">✕</button>
    </div>
  {/if}

  {#if successMsg}
    <div class="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-base">✓</span>
        <span>{successMsg}</span>
      </div>
      <button type="button" onclick={() => (successMsg = null)} class="text-white/60 hover:text-white font-bold px-2 cursor-pointer">✕</button>
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
        <!-- 1. Tabela de Matrícula do Aluno (Unificado: Sem Ref é Âncora; Com Ref é Preço com Desconto) -->
        <div class="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-5">
          <div class="flex items-center gap-3 border-b border-emerald-500/20 pb-4">
            <div class="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-bold text-sm">
              1
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-bold text-white">Matrícula do Aluno</h2>
                <span class="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-extrabold text-emerald-300 uppercase">
                  Tabela Comercial
                </span>
              </div>
              <p class="text-xs text-white/60">
                Sem indicação é o preço âncora de tabela. Com indicação de consultor (?ref=), o aluno ganha o desconto no PIX e Cartão em 12x fixas.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Preço Âncora Riscado (Sem Indicação) -->
            <div class="sm:col-span-2">
              <label for="anchor-full" class="block text-xs font-semibold text-white/80 mb-1.5 flex items-center justify-between">
                <span>Preço Âncora de Tabela — Sem Indicação (R$)</span>
                <span class="text-[10px] text-amber-300 font-normal">Valor de vitrine / riscado</span>
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
              <p class="text-[11px] text-white/50 mt-1">
                Sem link de indicação, o lead vê e paga o valor cheio de {formatCurrencyBrl(numAnchor)} (12x de {formatCurrencyBrl(anchorInstallment)}).
              </p>
            </div>

            <!-- Valor PIX com Desconto de Indicação -->
            <div>
              <label for="price-pix" class="block text-xs font-semibold text-white/80 mb-1.5 flex items-center justify-between">
                <span>PIX à Vista com Desconto (?ref=)</span>
                <span class="text-[10px] text-emerald-400 font-bold">À Vista</span>
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">R$</span>
                <input
                  id="price-pix"
                  type="text"
                  bind:value={pricePix}
                  placeholder="999.00"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-emerald-400 transition"
                />
              </div>
              {#if pixSavings > 0}
                <p class="text-[11px] text-emerald-400 mt-1 font-semibold">
                  Economia de {formatCurrencyBrl(pixSavings)} vs preço âncora
                </p>
              {/if}
            </div>

            <!-- Valor Cartão Total com Desconto de Indicação -->
            <div>
              <label for="price-card" class="block text-xs font-semibold text-white/80 mb-1.5 flex items-center justify-between">
                <span>Cartão Total com Desconto (?ref=)</span>
                <span class="text-[10px] text-emerald-400 font-bold">12x Fixas</span>
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">R$</span>
                <input
                  id="price-card"
                  type="text"
                  bind:value={priceCardReais}
                  placeholder="1188.00"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-emerald-400 transition"
                />
              </div>
              <p class="text-[11px] text-emerald-400 mt-1 font-mono">
                12x de {formatCurrencyBrl(promoInstallment)}
                {#if cardSavings > 0}
                  <span class="text-white/60">({formatCurrencyBrl(cardSavings)} de desconto)</span>
                {/if}
              </p>
            </div>

            <!-- Parcelas Fixas (Padrão 12x não editável) -->
            <div class="sm:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
              <div class="space-y-0.5">
                <span class="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>💳</span> Parcelamento Cartão: 12x Fixas
                </span>
                <p class="text-[11px] text-white/50">
                  Padrão comercial oficial da plataforma. O valor de cada parcela é calculado automaticamente.
                </p>
              </div>
              <span class="px-3 py-1 rounded-full bg-white/10 text-white font-mono text-xs font-bold border border-white/10">
                12x de {formatCurrencyBrl(promoInstallment)}
              </span>
            </div>
          </div>
        </div>

        <!-- 2. Programa Promotor-Estudante (Bolsa por Metas de Alunos) -->
        <div class="rounded-3xl border border-purple-500/30 bg-purple-500/5 p-6 space-y-5">
          <div class="flex items-center gap-3 border-b border-purple-500/20 pb-4">
            <div class="h-9 w-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 font-bold text-sm">
              2
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-bold text-white">Programa Promotor-Estudante</h2>
                <span class="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-extrabold text-purple-300 uppercase">
                  Bolsa por Metas
                </span>
              </div>
              <p class="text-xs text-white/50">
                O promotor ingressa pela promoção para captar alunos. Ao bater as metas, estuda 100% de graça.
              </p>
            </div>
          </div>

          <!-- Justificativa Comercial Canônica -->
          <div class="rounded-2xl border border-purple-500/30 bg-purple-950/30 p-4 space-y-2 text-xs">
            <div class="font-bold text-purple-200 flex items-center gap-1.5">
              <span>🎯</span> Regra de Negócio & Auto-Matrícula:
            </div>
            <ul class="space-y-1 text-white/80 text-[11px] list-disc list-inside">
              <li>O promotor ingressa para divulgar e captar alunos na sua região.</li>
              <li>Ao atingir a <strong>meta de destravamento</strong>, tem sua matrícula gratuita liberada.</li>
              <li>Ao atingir a <strong>meta de quitação</strong>, tem seu curso 100% quitado e a prova final liberada.</li>
              <li>
                <strong>Se optar por pagar a matrícula de imediato</strong>: paga o <strong>preço com desconto</strong> configurado no Menu 1 ({formatCurrencyBrl(numPricePix)} no PIX ou 12x de {formatCurrencyBrl(promoInstallment)} no cartão).
              </li>
            </ul>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="promoter-unlock-threshold" class="block text-xs font-semibold text-white/80 mb-1.5">
                Meta para Destravar Matrícula (Alunos Pagos)
              </label>
              <input
                id="promoter-unlock-threshold"
                type="number"
                min="0"
                bind:value={promoterStudyUnlockThreshold}
                class="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-purple-400 transition"
              />
              <p class="text-[11px] text-white/40 mt-1">Alunos confirmados necessários para liberar o estudo</p>
            </div>

            <div>
              <label for="promoter-complete-threshold" class="block text-xs font-semibold text-white/80 mb-1.5">
                Meta para Quitação Total / Prova (Alunos Pagos)
              </label>
              <input
                id="promoter-complete-threshold"
                type="number"
                min="1"
                bind:value={promoterStudyCompleteThreshold}
                class="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-purple-400 transition"
              />
              <p class="text-[11px] text-white/40 mt-1">Ao atingir esta meta, o promotor estuda 100% grátis</p>
            </div>
          </div>
        </div>

        <!-- 3. Comissões e Bônus de Promotores -->
        <div class="rounded-3xl border border-blue-500/30 bg-blue-500/5 p-6 space-y-5">
          <div class="flex items-center gap-3 border-b border-blue-500/20 pb-4">
            <div class="h-9 w-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 font-bold text-sm">
              3
            </div>
            <div>
              <h2 class="text-base font-bold text-white">Comissões & Bônus de Promotores</h2>
              <p class="text-xs text-white/50">Valores propagados dinamicamente para o portal do promotor e calculadora de ganhos</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="commission-direct" class="block text-xs font-semibold text-white/80 mb-1.5">
                Comissão Direta por Matrícula (R$)
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">R$</span>
                <input
                  id="commission-direct"
                  type="text"
                  bind:value={commissionDirect}
                  placeholder="100.00"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-blue-400 transition"
                />
              </div>
              <p class="text-[11px] text-white/40 mt-1">Pago no PIX semanal por cada lead que concluiu pagamento</p>
            </div>

            <div>
              <label for="commission-bonus-flat" class="block text-xs font-semibold text-white/80 mb-1.5">
                Bônus de Volume por Bloco (R$)
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">R$</span>
                <input
                  id="commission-bonus-flat"
                  type="text"
                  bind:value={commissionBonusFlat}
                  placeholder="500.00"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-blue-400 transition"
                />
              </div>
              <p class="text-[11px] text-white/40 mt-1">Bônus adicional cumulativo por atingimento de meta de volume</p>
            </div>

            <div>
              <label for="commission-threshold" class="block text-xs font-semibold text-white/80 mb-1.5">
                Meta do Bloco Semanal (Qtd Matrículas)
              </label>
              <input
                id="commission-threshold"
                type="number"
                min="1"
                bind:value={commissionBonusThreshold}
                class="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-blue-400 transition"
              />
              <p class="text-[11px] text-white/40 mt-1">Quantidade de matrículas pagas na semana para destravar o bônus</p>
            </div>

            <div>
              <label for="commission-coordinator" class="block text-xs font-semibold text-white/80 mb-1.5">
                Comissão de Polo / Coordenador (R$)
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">R$</span>
                <input
                  id="commission-coordinator"
                  type="text"
                  bind:value={commissionCoordinator}
                  placeholder="50.00"
                  class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white font-mono text-sm focus:outline-none focus:border-blue-400 transition"
                />
              </div>
              <p class="text-[11px] text-white/40 mt-1">Repasse ao coordenador do polo por aluno vinculado</p>
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

      <!-- Coluna Lateral: Prévia ao Vivo da Vitrine -->
      <div class="lg:col-span-5 space-y-4 sticky top-6">
        <div class="rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 to-white/5 p-6 backdrop-blur-xl shadow-2xl space-y-6">
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Simulador de Vitrine</span>
              <h3 class="text-base font-bold text-white">Prévia em Tempo Real</h3>
            </div>

            <!-- Alternador de Visão: Com ?ref= vs Sem ref -->
            <div class="inline-flex rounded-xl bg-black/40 p-1 border border-white/10 text-xs">
              <button
                type="button"
                onclick={() => (previewMode = 'promo')}
                class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer {previewMode === 'promo' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-white/60 hover:text-white'}"
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

          <!-- Card de Visualização do Aluno -->
          <div class="space-y-4">
            {#if previewMode === 'promo'}
              <div class="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent p-3 text-xs text-emerald-200 flex items-center justify-between">
                <span class="font-bold flex items-center gap-1.5">
                  <span>🏷️</span> Indicação de Consultor Ativa
                </span>
                <span class="text-[10px] uppercase font-extrabold bg-emerald-400/20 px-2 py-0.5 rounded-full border border-emerald-400/30 text-emerald-300">
                  Desconto Aplicado
                </span>
              </div>
            {:else}
              <div class="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70 flex items-center justify-between">
                <span class="font-semibold flex items-center gap-1.5">
                  <span>🌐</span> Acesso Orgânico Direto
                </span>
                <span class="text-[10px] uppercase font-bold bg-white/10 px-2 py-0.5 rounded-full text-white/60">
                  Tabela Cheia
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
                <span class="text-xs text-white/60">em 12x no cartão de crédito</span>
                <div class="text-3xl font-display font-black text-white tracking-tight mt-0.5">
                  12x de {formatCurrencyBrl(previewMode === 'promo' ? promoInstallment : anchorInstallment)}
                </div>
                <span class="text-xs text-white/50">
                  Total no cartão: {formatCurrencyBrl(previewMode === 'promo' ? numPriceCard : numAnchor)}
                </span>
              </div>

              <div class="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span class="text-emerald-400 font-semibold flex items-center gap-1">
                  <span>⚡</span> PIX à vista
                </span>
                <span class="text-white font-mono font-bold">
                  {formatCurrencyBrl(previewMode === 'promo' ? numPricePix : numAnchor)}
                </span>
              </div>
            </div>

            <!-- Comparativo de Economia (quando com ref) -->
            {#if previewMode === 'promo' && (pixSavings > 0 || cardSavings > 0)}
              <div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2 text-xs">
                <div class="font-bold text-emerald-300 flex items-center gap-1.5">
                  <span>✨</span> Economia do Aluno com o Consultor:
                </div>
                <div class="space-y-1 text-white/80 font-mono text-[11px]">
                  <div class="flex justify-between">
                    <span>Desconto no PIX à Vista:</span>
                    <span class="font-bold text-emerald-400">{formatCurrencyBrl(pixSavings)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Desconto no Cartão (Total):</span>
                    <span class="font-bold text-emerald-400">{formatCurrencyBrl(cardSavings)}</span>
                  </div>
                </div>
              </div>
            {/if}

            <!-- Resumo Técnico de Gateway -->
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2 text-[11px] text-white/60 font-mono">
              <div class="text-white/80 font-bold uppercase tracking-wider text-[10px]">
                Configuração Sincronizada
              </div>
              <div class="flex justify-between">
                <span>Preço Âncora (Sem Ref):</span>
                <span class="text-white">{formatCurrencyBrl(numAnchor)}</span>
              </div>
              <div class="flex justify-between">
                <span>PIX Aluno (Com Ref):</span>
                <span class="text-emerald-400">{formatCurrencyBrl(numPricePix)}</span>
              </div>
              <div class="flex justify-between">
                <span>Cartão Aluno (Com Ref):</span>
                <span class="text-emerald-400">12x de {formatCurrencyBrl(promoInstallment)}</span>
              </div>
              <div class="flex justify-between">
                <span>Auto-Matrícula Promotor:</span>
                <span class="text-purple-300">Paga com desconto</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
