<script lang="ts">
  import { lang } from '../lib/lang.svelte';

  let {
    n,
    title,
    en,
    lede
  }: { n: number; title: string; en: string; lede: string } = $props();
</script>

<header class="chap-head">
  <div class="chap-kicker">
    <span class="no">Chapter {String(n).padStart(2, '0')}</span>
    {#if lang.value !== 'en'}<span>第 {n} 章</span>{/if}
    <span class="rule"></span>
  </div>
  <h1 class="chap-title">
    {lang.value === 'en' ? en : title}
    {#if lang.value !== 'en'}<span class="en">{en}</span>{/if}
  </h1>
  <p class="chap-lede">{lede}</p>
</header>
