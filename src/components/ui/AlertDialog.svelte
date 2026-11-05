<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    isOpen?: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "info";
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    children?: Snippet;
  }

  let {
    isOpen = false,
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    variant = "danger",
    loading = false,
    onConfirm,
    onCancel,
    children,
  }: Props = $props();

  function handleKeyDown(e: KeyboardEvent) {
    if (!isOpen || loading) return;
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  const confirmColors = {
    danger: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30",
    warning: "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-900/30",
    info: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30",
  };
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
  <div
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="alert-dialog-title"
    aria-describedby="alert-dialog-desc"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
  >
    <div
      class="w-full max-w-md rounded-2xl border border-white/20 bg-[var(--ink-soft)] text-white shadow-2xl p-6 sm:p-7 flex flex-col gap-5 backdrop-blur-2xl animate-in zoom-in-95 duration-150"
    >
      <div class="flex items-start gap-4">
        <div class="size-11 rounded-xl flex items-center justify-center text-xl shrink-0 {variant === 'danger' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
          {variant === 'danger' ? '⚠️' : 'ℹ️'}
        </div>

        <div class="flex flex-col gap-1">
          <h2 id="alert-dialog-title" class="text-base sm:text-lg font-bold font-sans text-white">
            {title}
          </h2>
          <p id="alert-dialog-desc" class="text-xs sm:text-sm text-white/70 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {#if children}
        <div class="pt-1">
          {@render children()}
        </div>
      {/if}

      <div class="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
        <button
          type="button"
          disabled={loading}
          onclick={onCancel}
          class="min-h-[44px] px-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 transition cursor-pointer disabled:opacity-50"
        >
          {cancelLabel}
        </button>

        <button
          type="button"
          disabled={loading}
          onclick={onConfirm}
          class="min-h-[44px] px-5 rounded-xl font-bold text-xs shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50 {confirmColors[variant]}"
        >
          {#if loading}
            <span class="inline-block size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>Processando…</span>
          {:else}
            <span>{confirmLabel}</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
