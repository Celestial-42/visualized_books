<script lang="ts">
  import { BOOKS, bookHref, chapterHref, readyChapters, type Route } from '../lib/books';
  import { navigate, router } from '../lib/router.svelte';
  import { visitedIn } from '../lib/progress.svelte';
  import { lang, setLang, t } from '../lib/lang.svelte';

  let { route }: { route: Route } = $props();

  const book = $derived(route.kind === 'book' || route.kind === 'chapter' ? route.book : null);
  const activeSlug = $derived(route.kind === 'chapter' ? route.chapter.slug : '');
  const ready = $derived(book ? readyChapters(book) : []);
  const done = $derived(book ? visitedIn(book.id, ready.map((c) => c.slug)) : 0);
  const pct = $derived(book && ready.length ? Math.round((done / ready.length) * 100) : 0);

  // reading every book from the shelf view still needs a number that moves
  const libraryDone = $derived(
    BOOKS.reduce((n, b) => n + visitedIn(b.id, readyChapters(b).map((c) => c.slug)), 0)
  );
  const libraryTotal = $derived(BOOKS.reduce((n, b) => n + readyChapters(b).length, 0));

  $effect(() => {
    if (!activeSlug) return;
    if (!matchMedia('(max-width: 960px)').matches) return;
    document
      .querySelector('.rail-link.active')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  });
</script>

<aside class="rail">
  <a class="rail-brand" href="#/" onclick={(e) => { e.preventDefault(); navigate('/'); }}>
    <svg class="mark" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <g stroke="currentColor" stroke-width="1.15">
        <rect x="3.2" y="3.2" width="8.1" height="8.1" rx="2.2" />
        <rect x="14.7" y="3.2" width="8.1" height="8.1" rx="2.2" />
        <rect x="3.2" y="14.7" width="8.1" height="8.1" rx="2.2" />
        <rect x="14.7" y="14.7" width="8.1" height="8.1" rx="2.2" />
      </g>
      <circle cx="7.25" cy="7.25" r="1.5" fill="var(--ember)" />
      <circle cx="18.75" cy="18.75" r="1.5" fill="currentColor" />
    </svg>
    <span class="title">{t('可视化书库', 'Visualized Books')}</span>
    <span class="sub">
      {#if book}
        {t(`第 ${Number(book.no)} 本：${book.title}`, `Book ${book.no} · ${book.titleEn}`)}
      {:else}
        {t('书目', 'All books')}
      {/if}
    </span>
  </a>

  <div class="rail-lang" role="group" aria-label={t('语言', 'Language')}>
    <button class:active={lang.value === 'zh'} aria-pressed={lang.value === 'zh'} onclick={() => setLang('zh')}>中文</button>
    <span class="lang-div"></span>
    <button class:active={lang.value === 'en'} aria-pressed={lang.value === 'en'} onclick={() => setLang('en')}>English</button>
  </div>

  {#if book}
    <a class="rail-back" href="#/" onclick={(e) => { e.preventDefault(); navigate('/'); }}>
      <span aria-hidden="true">←</span>{t('全部书目', 'All books')}
    </a>

    {#each book.parts as part}
      <div class="rail-group">
        <span class="label">{lang.value === 'en' ? part.en : part.label}</span>
        {#each book.chapters.filter((c) => c.part === part.id) as ch}
          {#if ch.status === 'ready'}
            <a
              class="rail-link"
              class:active={activeSlug === ch.slug}
              href={chapterHref(book.id, ch.slug)}
              onclick={(e) => { e.preventDefault(); navigate(`/book/${book.id}/${ch.slug}`); }}
            >
              <span class="n">{String(ch.n).padStart(2, '0')}</span>
              <span>{lang.value === 'en' ? ch.shortEn : ch.title}</span>
            </a>
          {:else}
            <span class="rail-link planned" title={t('即将上线', 'Coming soon')}>
              <span class="n">{String(ch.n).padStart(2, '0')}</span>
              <span>{lang.value === 'en' ? ch.shortEn : ch.title}</span>
            </span>
          {/if}
        {/each}
      </div>
    {/each}
  {:else}
    <div class="rail-group">
      <span class="label">{t('书目', 'Books')}</span>
      {#each BOOKS as b}
        <a
          class="rail-link"
          href={bookHref(b.id)}
          onclick={(e) => { e.preventDefault(); navigate(`/book/${b.id}`); }}
        >
          <span class="n">{b.no}</span>
          <span>{lang.value === 'en' ? b.titleEn : b.title}</span>
        </a>
      {/each}
    </div>
  {/if}

  <div class="rail-foot">
    <div class="progress-line">
      <i style={`width:${book ? pct : Math.round((libraryDone / libraryTotal) * 100)}%`}></i>
    </div>
    <div>
      {#if book}
        {#if lang.value === 'en'}
          {done}/{ready.length} chapters read · every verdict is computed, not drawn
        {:else}
          已读 {done}/{ready.length} 章 · 全部结论由内置引擎枚举得出
        {/if}
      {:else}
        {#if lang.value === 'en'}
          {libraryDone}/{libraryTotal} chapters read across {BOOKS.length} books
        {:else}
          两本书共读 {libraryDone}/{libraryTotal} 章
        {/if}
      {/if}
    </div>
  </div>
</aside>

<style>
  .rail-lang {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 2px;
    padding: 2px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 8px;
  }

  .rail-lang button {
    padding: 3px 8px;
    font-size: 10.5px;
    font-weight: 500;
    line-height: 1.5;
    color: var(--muted);
    border-radius: 6px;
    transition: background 0.18s var(--ease), color 0.18s var(--ease);
  }

  .rail-lang button:hover {
    color: var(--ink-2);
  }

  .rail-lang button.active {
    color: var(--accent-deep);
    background: var(--card);
    box-shadow: var(--shadow-sm);
  }

  .lang-div {
    width: 1px;
    height: 10px;
    background: var(--line);
  }

  .rail-back {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: -8px;
    font-size: 10.5px;
    letter-spacing: 0.04em;
    color: var(--muted);
    text-decoration: none;
  }

  .rail-back:hover {
    color: var(--accent);
  }

  @media (max-width: 960px) {
    .rail-lang {
      position: sticky;
      left: 0;
      z-index: 2;
      flex: none;
      align-self: center;
      background: var(--paper-2);
      box-shadow: -14px 0 0 0 var(--paper), 10px 0 14px -12px rgba(40, 35, 25, 0.28);
    }

    .rail-back {
      flex: none;
      margin-top: 0;
      padding: 4px 8px;
      border: 1px solid var(--line);
      border-radius: 8px;
      white-space: nowrap;
    }
  }

  @media (max-width: 560px) {
    .rail-lang button {
      padding: 3px 6px;
      font-size: 10px;
    }

    .rail-back {
      font-size: 10px;
    }
  }
</style>
