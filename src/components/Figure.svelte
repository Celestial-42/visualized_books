<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    no,
    caption,
    wide = true,
    flush = false,
    children
  }: { no: string; caption: string; wide?: boolean; flush?: boolean; children: Snippet } = $props();
</script>

<figure class="figure" class:wide>
  <div class="fig-frame" class:flush>
    {@render children()}
  </div>
  <figcaption>
    <span class="fig-no">{no}</span>
    <span>{caption}</span>
  </figcaption>
</figure>
