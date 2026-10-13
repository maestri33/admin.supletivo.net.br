<script lang="ts">
  import { onMount } from 'svelte';
  import { listLeads, getLeadDetail, updateLeadPricing, getErrorMessage, type StaffLeadOut, type LeadDetail } from '@/lib/api';
  let rows = $state<StaffLeadOut[]>([]), detail = $state<LeadDetail | null>(null);
  let loading = $state(true), busy = $state(false), error = $state(''), message = $state('');
  let pix = $state(0), installment = $state(0), installments = $state(12);
  function currency(value?: string) { const number = Number(value); return value && Number.isFinite(number) ? number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não informado'; }
  function date(value?: string | null) { return value ? new Date(value).toLocaleString('pt-BR') : 'Não informado'; }
  function contact(value?: string | null) { return value && /^https:\/\/wa\.me\/\d+(\?.*)?$/.test(value) ? value : null; }
  function customerContact(phone?: string | null) { let digits = (phone ?? '').replace(/\D/g, ''); if (digits.length === 10 || digits.length === 11) digits = '55' + digits; return /^55\d{10,11}$/.test(digits) ? `https://wa.me/${digits}` : null; }
  const quotedPix = $derived(detail?.pricing?.pix);
  const quotedCard = $derived(detail?.pricing?.card);
  async function load() { loading = true; error = ''; try { rows = (await listLeads()).filter(row => row.status !== 'paid'); } catch (cause) { error = getErrorMessage(cause); } finally { loading = false; } }
  async function select(id: string) { busy = true; error = ''; message = ''; detail = null; try { detail = await getLeadDetail(id); pix = Number(detail.pricing?.pix ?? 0); const card = detail.pricing?.card; installment = Number(card?.installment ?? 0); installments = card?.installments ?? 12; } catch (cause) { error = getErrorMessage(cause); } finally { busy = false; } }
  async function save(event: SubmitEvent) { event.preventDefault(); if (!detail || busy || detail.checkout) return; busy = true; error = ''; try { detail = await updateLeadPricing(detail.external_id, { pix: String(pix), card_installment: String(installment), card_installments: installments }); message = 'Valores da proposta atualizados.'; } catch (cause) { error = getErrorMessage(cause); } finally { busy = false; } }
  onMount(() => { void load(); });
</script>
<section class="leads-view" aria-busy={loading || busy}>
  <h1>Leads — propostas e responsáveis</h1>
  {#if error}<p role="alert">{error}</p>{/if}{#if message}<p role="status">{message}</p>{/if}
  {#if loading}<p role="status">Consultando leads…</p>{:else}
    <button onclick={load} disabled={busy}>Atualizar lista</button>
    <div class="lead-list">{#each rows as row (row.external_id)}<button onclick={() => select(row.external_id)} disabled={busy}>{row.name ?? row.phone ?? row.external_id} — {date(row.created_at)}</button>{:else}<p>Nenhum lead aguardando pagamento.</p>{/each}</div>
  {/if}
  {#if detail}
    <article><h2>{detail.customer.name ?? 'Dados do lead'}</h2>
      <dl>{#each [{ name: 'CPF', value: detail.customer.cpf }, { name: 'Telefone', value: detail.customer.phone }, { name: 'E-mail', value: detail.customer.email }, { name: 'Promotor', value: detail.promoter.name }, { name: 'Polo', value: detail.hub?.name }, { name: 'Coordenador', value: detail.hub?.coordinator_name }] as item}<div><dt>{item.name}</dt><dd>{item.value ?? 'Não informado'}</dd></div>{/each}<div><dt>Captado em</dt><dd>{date(detail.created_at)}</dd></div></dl>
      <div class="actions">{#if customerContact(detail.customer.phone)}<a href={customerContact(detail.customer.phone)!} target="_blank" rel="noopener noreferrer">Contatar aluno</a>{/if}{#if contact(detail.promoter.contact_url)}<a href={detail.promoter.contact_url!} target="_blank" rel="noopener noreferrer">Contatar promotor</a>{/if}{#if contact(detail.hub?.contact_url)}<a href={detail.hub!.contact_url!} target="_blank" rel="noopener noreferrer">Contatar polo</a>{/if}</div>
    </article>
    <article><h2>Valores da proposta</h2><p>Pix: {currency(quotedPix)} · Cartão: {quotedCard?.installments ?? '—'} × {currency(quotedCard?.installment)}</p>
      {#if detail.checkout}<p>A cobrança já foi emitida. Seus valores permanecem preservados.</p><dl><div><dt>Valor cobrado</dt><dd>{currency(detail.checkout.amount)}</dd></div><div><dt>Meio e provedor</dt><dd>{detail.checkout.payment_method === 'pix' ? 'Pix' : 'Cartão'} · {detail.checkout.provider}</dd></div><div><dt>Pagamento</dt><dd>{detail.checkout.is_paid ? date(detail.checkout.paid_at) : 'Aguardando confirmação'}</dd></div></dl>
      {:else}<form onsubmit={save}><label>Valor Pix (R$)<input type="number" min="0.01" step="0.01" bind:value={pix} required /></label><label>Valor da parcela no cartão (R$)<input type="number" min="0.01" step="0.01" bind:value={installment} required /></label><label>Parcelas<input type="number" min="1" max="12" step="1" bind:value={installments} required /></label><button disabled={busy}>Salvar valores desta proposta</button></form>{/if}
    </article>
  {/if}
</section>
<style>
  .leads-view, article, form, .lead-list { display: grid; gap: 1rem; }
  article { padding: 1.25rem; border: 1px solid var(--line-light); border-radius: var(--radius); }
  h1, h2 { font-family: var(--font-display); } h1 { font-size: var(--text-h2-sm); }
  button, a, input { min-height: var(--input-height); border-radius: var(--input-radius); padding: .75rem 1rem; }
  button, a { border: 1px solid var(--line-light); color: var(--paper); background: var(--ink-soft); cursor: pointer; }
  label { display: grid; gap: .5rem; } input { color: var(--ink); background: var(--paper); }
  dl { display: grid; gap: .75rem; } dt { color: var(--muted-on-dark); } dd { margin: 0; overflow-wrap: anywhere; }
  .actions { display: flex; flex-wrap: wrap; gap: .75rem; } :focus-visible { outline: 2px solid var(--yellow); outline-offset: 3px; }
</style>
