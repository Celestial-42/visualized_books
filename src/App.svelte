<script lang="ts">
  import type { Component } from 'svelte';
  import SiteRail from './components/SiteRail.svelte';
  import LibraryHome from './pages/LibraryHome.svelte';
  import Home from './pages/Home.svelte';
  import OcnHome from './pages/ocn/Home.svelte';
  import Ch1 from './pages/Ch1.svelte';
  import Ch2 from './pages/Ch2.svelte';
  import Ch3 from './pages/Ch3.svelte';
  import Ch4 from './pages/Ch4.svelte';
  import Ch5 from './pages/Ch5.svelte';
  import Ch6 from './pages/Ch6.svelte';
  import Ch7 from './pages/Ch7.svelte';
  import Ch8 from './pages/Ch8.svelte';
  import Ch9 from './pages/Ch9.svelte';
  import Ch10 from './pages/Ch10.svelte';
  import Ch11 from './pages/Ch11.svelte';
  import Ocn1 from './pages/ocn/Ch1.svelte';
  import Ocn2 from './pages/ocn/Ch2.svelte';
  import Ocn3 from './pages/ocn/Ch3.svelte';
  import Ocn4 from './pages/ocn/Ch4.svelte';
  import Ocn5 from './pages/ocn/Ch5.svelte';
  import Ocn6 from './pages/ocn/Ch6.svelte';
  import Ocn7 from './pages/ocn/Ch7.svelte';
  import Ocn8 from './pages/ocn/Ch8.svelte';
  import { parseRoute } from './lib/books';
  import { router } from './lib/router.svelte';
  import { markVisited } from './lib/progress.svelte';
  import { t } from './lib/lang.svelte';

  const route = $derived(parseRoute(router.path));

  const PAGES: Record<string, Component> = {
    'memory-primer/ch1': Ch1,
    'memory-primer/ch2': Ch2,
    'memory-primer/ch3': Ch3,
    'memory-primer/ch4': Ch4,
    'memory-primer/ch5': Ch5,
    'memory-primer/ch6': Ch6,
    'memory-primer/ch7': Ch7,
    'memory-primer/ch8': Ch8,
    'memory-primer/ch9': Ch9,
    'memory-primer/ch10': Ch10,
    'memory-primer/ch11': Ch11,
    'on-chip-networks/ch1': Ocn1,
    'on-chip-networks/ch2': Ocn2,
    'on-chip-networks/ch3': Ocn3,
    'on-chip-networks/ch4': Ocn4,
    'on-chip-networks/ch5': Ocn5,
    'on-chip-networks/ch6': Ocn6,
    'on-chip-networks/ch7': Ocn7,
    'on-chip-networks/ch8': Ocn8
  };

  const page = $derived(
    route.kind === 'chapter' ? PAGES[`${route.book.id}/${route.chapter.slug}`] : null
  );

  $effect(() => {
    if (route.kind === 'chapter' && route.chapter.status === 'ready') {
      markVisited(route.book.id, route.chapter.slug);
    }
  });
</script>

<div class="shell">
  <SiteRail {route} />
  <main class="main">
    {#if route.kind === 'library'}
      <LibraryHome />
    {:else if route.kind === 'book'}
      {#if route.book.id === 'memory-primer'}
        <Home />
      {:else}
        <OcnHome />
      {/if}
    {:else if route.kind === 'chapter' && page}
      {@const Page = page}
      <Page />
    {:else}
      <div class="page">
        <div class="emptiness">
          <span class="eyebrow">Not found</span>
          <h1 class="display">{t('页面不存在', 'Page not found')}</h1>
          <p>
            {t(
              '检查地址，或回到书目重新进入。',
              'Check the URL, or head back to the shelf.'
            )}
          </p>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  .emptiness {
    max-width: 520px;
    padding-top: 96px;
  }

  .emptiness h1 {
    margin: 12px 0 10px;
    font-size: 34px;
    font-weight: 500;
  }

  .emptiness p {
    font-size: 14px;
    color: var(--ink-3);
  }
</style>
