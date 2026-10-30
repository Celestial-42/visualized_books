<script lang="ts">
  import { getContext } from 'svelte';
  import { lang, t } from '../lib/lang.svelte';
  import type { Book } from '../lib/books';

  let {
    n,
    title,
    en,
    lede
  }: { n: number; title: string; en: string; lede: string } = $props();

  const ctx = getContext<{ book: Book | null } | undefined>('book');
  const book = $derived(ctx?.book ?? null);
</script>

<header class="chap-head">
  {#if book}
    <a class="source-line chap-source" href={`#/book/${book.id}`}>
      <span class="sl-tag">{t('原书', 'Source')}</span>
      <span class="sl-title">{book.origin}</span>
      {#if lang.value !== 'en' && book.originZh}<span class="sl-zh">{book.originZh}</span>{/if}
      <span class="sl-meta">{book.authors} · {lang.value === 'en' ? book.editionEn ?? book.edition : book.edition}</span>
    </a>
  {/if}
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

<style>
  .chap-source {
    max-width: 660px;
    margin-bottom: 18px;
  }
</style>
