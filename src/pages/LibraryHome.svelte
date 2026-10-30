<script lang="ts">
  import { BOOKS, bookHref, readyChapters, type Book } from '../lib/books';
  import { navigate } from '../lib/router.svelte';
  import { visitedIn } from '../lib/progress.svelte';
  import { lang, t } from '../lib/lang.svelte';

  const totalChapters = BOOKS.reduce((n, b) => n + readyChapters(b).length, 0);
  const doneIn = (b: Book) => visitedIn(b.id, readyChapters(b).map((c) => c.slug));

  const open = (b: Book) => navigate(`/book/${b.id}`);
</script>

<div class="page library">
  <header class="hero">
    <span class="lib-badge">VISUALIZED BOOKS</span>
    <h1 class="display">{t('可视化书库', 'Visualized Books')}</h1>
    <p class="hero-sub">
      {t(
        '把技术书逐章拆成可以亲手拨动的模型：拓扑能数、路由能走、死锁能复现。每个结论都由页面里的引擎算出来，不是画上去的。',
        'Technical books taken apart chapter by chapter into models you can move by hand: topologies you can count, routes you can walk, deadlocks you can reproduce. Every verdict is computed by an engine on the page, not drawn.'
      )}
    </p>
    <div class="hero-meta">
      <span>{t(`${BOOKS.length} 本书`, `${BOOKS.length} books`)}</span><i></i>
      <span>{t(`${totalChapters} 章已上线`, `${totalChapters} chapters live`)}</span><i></i>
      <span>{t('结论可复核', 'verdicts reproducible')}</span>
    </div>
  </header>

  <section class="shelf">
    {#each BOOKS as book, bi}
      <button class="book" onclick={() => open(book)}>
        <div class="spine" aria-hidden="true">
          <span class="spine-no">BOOK {book.no}</span>
          <span class="spine-title display">{book.spine}</span>
          <span class="spine-authors">{book.authors}</span>
        </div>

        <div class="book-body">
          <div class="book-top">
            <span class="book-no display">{book.no}</span>
            <span class="book-pages mono">{book.pages} p · {readyChapters(book).length} ch</span>
          </div>
          <h2 class="display">{lang.value === 'en' ? book.titleEn : book.title}</h2>
          {#if lang.value !== 'en'}<p class="book-en">{book.titleEn}</p>{/if}
          <p class="book-sub">{t(book.short, book.shortEn)} · {book.edition}</p>

          {#if book.id === 'memory-primer'}
            <svg class="art" viewBox="0 0 420 96" fill="none" aria-hidden="true">
              <g class="lanes">
                <text x="4" y="14" class="art-label">C1</text>
                <rect x="26" y="4" width="76" height="15" rx="4" class="op" />
                <text x="64" y="14.5" class="art-op" text-anchor="middle">S1: A=1</text>
                <text x="4" y="46" class="art-label">C2</text>
                <rect x="118" y="36" width="76" height="15" rx="4" class="op" />
                <text x="156" y="46.5" class="art-op" text-anchor="middle">S2: B=1</text>
                <text x="4" y="78" class="art-label">C3</text>
                <rect x="210" y="68" width="76" height="15" rx="4" class="op" />
                <text x="248" y="78.5" class="art-op" text-anchor="middle">L3: A</text>
              </g>
              <path d="M8 88H412" class="order-line" />
              <circle cx="70" cy="88" r="2.4" class="tick" />
              <circle cx="164" cy="88" r="2.4" class="tick" />
              <circle cx="248" cy="88" r="2.4" class="tick" />
              <text x="416" y="91" class="art-note" text-anchor="end">{t('全局顺序', 'total order')}</text>
              <g class="copies">
                <rect x="316" y="10" width="30" height="22" rx="5" class="cell" />
                <rect x="350" y="10" width="30" height="22" rx="5" class="cell hot" />
                <rect x="384" y="10" width="30" height="22" rx="5" class="cell" />
                <text x="331" y="25" class="cell-t" text-anchor="middle">S</text>
                <text x="365" y="25" class="cell-t hot" text-anchor="middle">M</text>
                <text x="399" y="25" class="cell-t" text-anchor="middle">I</text>
                <text x="365" y="46" class="art-note" text-anchor="middle">{t('单地址副本', 'one address')}</text>
              </g>
            </svg>
          {:else}
            <svg class="art" viewBox="0 0 420 96" fill="none" aria-hidden="true">
              <g class="mesh">
                {#each [0, 1, 2, 3] as r}
                  {#each [0, 1, 2, 3, 4, 5] as c}
                    <rect x={16 + c * 40} y={8 + r * 22} width="14" height="14" rx="3.2" class="node" class:hot={r === 1 && c === 1} class:dest={r === 2 && c === 4} />
                  {/each}
                {/each}
                <path d="M33 15H53M73 15H93M113 15H133M153 15H173M193 15H213" class="link" />
                <path d="M33 37H53M73 37H93M113 37H133M153 37H173M193 37H213" class="link" />
                <path d="M33 59H53M73 59H93M113 59H133M153 59H173M193 59H213" class="link" />
                <path d="M33 81H53M73 81H93M113 81H133M153 81H173M193 81H213" class="link" />
                <path d="M23 25V34M23 47V56M23 69V78M63 25V34M63 47V56M63 69V78M103 25V34M103 47V56M103 69V78M143 25V34M143 47V56M143 69V78M183 25V34M183 47V56M183 69V78" class="link" />
                <path d="M33 22H173V37H193V66H213" class="route" />
                <circle cx="23" cy="22" r="3" class="route-dot" />
                <circle cx="213" cy="66" r="3" class="route-dot dest" />
                <text x="252" y="34" class="art-note">{t('4×4 mesh · 16 个路由器', '4×4 mesh · 16 routers')}</text>
                <text x="252" y="50" class="art-note">{t('链路 24 条 · 对剖 4 条', '24 links · bisection 4')}</text>
                <text x="252" y="66" class="art-note">{t('平均 2.67 跳', '2.67 hops on average')}</text>
              </g>
            </svg>
          {/if}

          <div class="book-foot">
            <div class="book-progress">
              <div class="progress-line"><i style={`width:${Math.round((doneIn(book) / readyChapters(book).length) * 100)}%`}></i></div>
              <span>{t(`已读 ${doneIn(book)}/${readyChapters(book).length} 章`, `${doneIn(book)}/${readyChapters(book).length} read`)}</span>
            </div>
            <span class="book-open">{t('进入书库 →', 'Open book →')}</span>
          </div>
        </div>
      </button>
      {#if bi === 0}<div class="shelf-rule"></div>{/if}
    {/each}
  </section>

  <footer class="colophon">
    <p>
      {t(
        '每本书按原书章节顺序组织，一章一个页面。页面里的判定与数值都由 src/lib 下的引擎现算，源码可查。',
        'Each book follows its own chapter order, one page per chapter. Every verdict and number on a page is computed by an engine under src/lib.'
      )}
    </p>
  </footer>
</div>

<style>
  .library {
    padding-top: 64px;
  }

  .hero {
    max-width: 720px;
  }

  .lib-badge {
    display: inline-block;
    padding: 2px 7px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    letter-spacing: 0.11em;
    color: var(--accent-deep);
    background: var(--accent-soft);
    border: 1px solid #cfded9;
    border-radius: 4px;
  }

  .hero h1 {
    margin: 18px 0 0;
    font-size: clamp(44px, 7vw, 72px);
    font-weight: 400;
    line-height: 1.02;
    letter-spacing: -0.04em;
  }

  .hero-sub {
    margin-top: 22px;
    max-width: 600px;
    font-size: 15.5px;
    line-height: 1.8;
    color: var(--ink-3);
  }

  .hero-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 22px;
    font-size: 11.5px;
    letter-spacing: 0.04em;
    color: var(--muted);
  }

  .hero-meta i {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--gold);
    opacity: 0.7;
  }

  .shelf {
    margin-top: 52px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .shelf-rule {
    height: 1px;
    background: linear-gradient(90deg, var(--line), rgba(231, 223, 207, 0));
  }

  .book {
    display: grid;
    grid-template-columns: 132px minmax(0, 1fr);
    gap: 0;
    padding: 0;
    text-align: left;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: var(--shadow);
    transition: transform 0.35s var(--ease), box-shadow 0.35s var(--ease), border-color 0.35s var(--ease);
  }

  .book:hover {
    transform: translateY(-3px);
    border-color: #d9cfba;
    box-shadow: var(--shadow-lift);
  }

  .spine {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
    padding: 22px 16px 20px;
    background: linear-gradient(180deg, #2f5d62, #24484c);
    color: #eef3ee;
  }

  .spine-no {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    letter-spacing: 0.16em;
    white-space: nowrap;
    opacity: 0.62;
  }

  .spine-title {
    font-size: 17px;
    line-height: 1.28;
    letter-spacing: -0.01em;
  }

  .spine-authors {
    font-size: 9px;
    line-height: 1.5;
    letter-spacing: 0.04em;
    opacity: 0.66;
  }

  .book-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 20px 24px 18px;
    min-width: 0;
  }

  .book-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .book-no {
    font-size: 15px;
    color: var(--gold);
    letter-spacing: 0.04em;
  }

  .book-pages {
    font-size: 9.5px;
    color: var(--muted);
    letter-spacing: 0.04em;
  }

  .book-body h2 {
    font-size: 27px;
    font-weight: 500;
    line-height: 1.15;
    letter-spacing: -0.02em;
  }

  .book-en {
    margin-top: -2px;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 12px;
    font-style: italic;
    color: var(--muted);
  }

  .book-sub {
    font-size: 11.5px;
    color: var(--ink-3);
  }

  .art {
    width: 100%;
    height: auto;
    margin: 10px 0 4px;
  }

  .art-label {
    font-family: 'Inter', sans-serif;
    font-size: 7.5px;
    font-weight: 600;
    fill: var(--muted);
  }

  .art-op {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.2px;
    fill: var(--accent-deep);
  }

  .art-note {
    font-family: 'Inter', sans-serif;
    font-size: 7.4px;
    fill: var(--muted);
    letter-spacing: 0.03em;
  }

  .op {
    fill: var(--paper-2);
    stroke: var(--line);
  }

  .order-line {
    stroke: var(--line);
  }

  .tick {
    fill: var(--gold);
  }

  .cell {
    fill: var(--card-2);
    stroke: var(--line);
  }

  .cell.hot {
    fill: var(--ember-soft);
    stroke: #e4c6b8;
  }

  .cell-t {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    fill: var(--muted);
  }

  .cell-t.hot {
    fill: var(--st-m);
  }

  .mesh .node {
    fill: var(--card-2);
    stroke: var(--line);
  }

  .mesh .node.hot {
    fill: var(--accent-soft);
    stroke: var(--accent);
  }

  .mesh .node.dest {
    fill: var(--ember-soft);
    stroke: var(--ember);
  }

  .mesh .link {
    stroke: var(--line);
    stroke-width: 1;
  }

  .mesh .route {
    stroke: var(--ember);
    stroke-width: 1.1;
    stroke-dasharray: 3 3;
    fill: none;
  }

  .mesh .route-dot {
    fill: var(--accent);
  }

  .mesh .route-dot.dest {
    fill: var(--ember);
  }

  .book-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid var(--line-2);
  }

  .book-progress {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
    font-size: 10.5px;
    color: var(--muted);
    white-space: nowrap;
  }

  .book-progress .progress-line {
    flex: 1;
    max-width: 150px;
    height: 3px;
    border-radius: 2px;
    background: var(--paper-3);
    overflow: hidden;
  }

  .book-progress .progress-line > i {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width 0.4s var(--ease);
  }

  .book-open {
    flex: none;
    font-size: 11.5px;
    font-weight: 500;
    color: var(--accent);
  }

  .colophon {
    margin-top: 56px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
    max-width: 620px;
    font-size: 11.5px;
    line-height: 1.75;
    color: var(--muted);
  }

  @media (max-width: 720px) {
    .library {
      padding-top: 40px;
    }

    .book {
      grid-template-columns: minmax(0, 1fr);
    }

    .spine {
      flex-direction: row;
      align-items: baseline;
      justify-content: flex-start;
      gap: 10px;
      padding: 12px 18px;
    }

    .spine-title {
      font-size: 13px;
    }

    .spine-authors {
      margin-left: auto;
      max-width: 45%;
    }

    .book-body {
      padding: 18px 18px 16px;
    }

    .book-body h2 {
      font-size: 23px;
    }
  }
</style>
