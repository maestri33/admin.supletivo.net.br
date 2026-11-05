<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    class?: string;
    children?: Snippet;
  }

  let { class: className = "", children }: Props = $props();
</script>

<div class="w-full overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] {className}">
  <table class="w-full text-left text-xs text-white/80">
    {#if children}
      {@render children()}
    {/if}
  </table>
</div>
