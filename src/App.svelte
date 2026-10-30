<script lang="ts">
  import SiteRail from './components/SiteRail.svelte';
  import Home from './pages/Home.svelte';
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
  import { router } from './lib/router.svelte';
  import { chapterBySlug } from './lib/content';
  import { markVisited } from './lib/progress.svelte';
  import { t } from './lib/lang.svelte';

  const slug = $derived(router.path.split('/')[1] ?? '');
  const chapter = $derived(chapterBySlug(slug));

  $effect(() => {
    if (chapter?.status === 'ready') markVisited(chapter.slug);
  });
</script>

<div class="shell">
  <SiteRail />
  <main class="main">
    {#if slug === ''}
      <Home />
    {:else if slug === 'ch1'}
      <Ch1 />
    {:else if slug === 'ch2'}
      <Ch2 />
    {:else if slug === 'ch3'}
      <Ch3 />
    {:else if slug === 'ch4'}
      <Ch4 />
    {:else if slug === 'ch5'}
      <Ch5 />
    {:else if slug === 'ch6'}
      <Ch6 />
    {:else if slug === 'ch7'}
      <Ch7 />
    {:else if slug === 'ch8'}
      <Ch8 />
    {:else if slug === 'ch9'}
      <Ch9 />
    {:else if slug === 'ch10'}
      <Ch10 />
    {:else if slug === 'ch11'}
      <Ch11 />
    {:else}
      <div class="page">
        <div class="emptiness">
          <span class="eyebrow">Not found</span>
          <h1 class="display">{t('页面不存在', 'Page not found')}</h1>
          <p>
            {t(
              '检查地址，或从左侧目录进入。',
              'Check the URL, or use the contents on the left.'
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
