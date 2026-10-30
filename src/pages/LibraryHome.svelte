<script lang="ts">
  import { BOOKS, readyChapters, type Book } from '../lib/books';
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
    {#each BOOKS as book}
      <button class="book" onclick={() => open(book)}>
        <div class="book-top">
          <span class="book-chip" aria-hidden="true">{book.no}</span>
          <span class="book-no mono">BOOK {book.no}</span>
          <span class="book-pages mono">{book.pages} p · {readyChapters(book).length}/{book.chapters.length} ch</span>
        </div>

        <h2 class="display">{lang.value === 'en' ? book.titleEn : book.title}</h2>
        {#if lang.value !== 'en'}<p class="book-en">{book.titleEn}</p>{/if}
        <p class="book-sub" title={`${book.authors} · ${book.edition}`}>{book.authors} · {book.edition}</p>

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
        {:else if book.id === 'on-chip-networks'}
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
        {:else}
          <svg class="art" viewBox="0 0 420 96" fill="none" aria-hidden="true">
            <g class="turn">
              {#each [0, 1, 2] as r}
                {#each [0, 1, 2] as c}
                  <rect x={28 + c * 62} y={10 + r * 26} width="14" height="14" rx="3.4" class="node" />
                {/each}
              {/each}
              <path d="M35 17H97M97 17H159M35 43H97M97 43H159M35 69H97M97 69H159" class="link" />
              <path d="M42 24V36M104 24V36M166 24V36M42 50V62M104 50V62M166 50V62" class="link" />
              <path d="M35 17V43H97V69H159" class="route" />
              <path d="M159 69H221" class="route bad" />
              <text x="266" y="30" class="art-note">{t('通道相关图', 'channel dependency graph')}</text>
              <text x="266" y="46" class="art-note">{t('有环 = 死锁', 'cycle = deadlock')}</text>
              <text x="266" y="62" class="art-note">{t('禁两个转向即可解开', 'forbid two turns and it opens')}</text>
            </g>
          </svg>
        {/if}

        <div class="book-foot">
          <div class="book-progress">
            <div class="progress-line"><i style={`width:${Math.round((doneIn(book) / readyChapters(book).length) * 100)}%`}></i></div>
            <span>{t(`已读 ${doneIn(book)}/${readyChapters(book).length}`, `${doneIn(book)}/${readyChapters(book).length} read`)}</span>
          </div>
          <span class="book-open">{t('进入 →', 'Open →')}</span>
        </div>
      </button>
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
    padding-top: 48px;
  }

  .hero {
    max-width: 660px;
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
    margin: 12px 0 0;
    font-size: clamp(32px, 4.4vw, 50px);
    font-weight: 400;
    line-height: 1.04;
    letter-spacing: -0.035em;
  }

  .hero-sub {
    margin-top: 14px;
    max-width: 560px;
    font-size: 14px;
    line-height: 1.75;
    color: var(--ink-3);
  }

  .hero-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
    font-size: 11px;
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
    margin-top: 32px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(276px, 1fr));
    gap: 14px;
  }

  .book {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 16px 18px 14px;
    text-align: left;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 14px;
    box-shadow: var(--shadow);
    transition: transform 0.3s var(--ease), box-shadow 0.3s var(--ease), border-color 0.3s var(--ease);
  }

  .book:hover {
    transform: translateY(-2px);
    border-color: #d9cfba;
    box-shadow: var(--shadow-lift);
  }

  .book-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .book-chip {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    flex: none;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 11px;
    color: #eef3ee;
    background: linear-gradient(160deg, #2f5d62, #24484c);
    border-radius: 7px;
  }

  .book-no {
    font-size: 8.5px;
    letter-spacing: 0.14em;
    color: var(--muted);
  }

  .book-pages {
    margin-left: auto;
    font-size: 9px;
    color: var(--muted);
    letter-spacing: 0.04em;
  }

  .book h2 {
    margin-top: 8px;
    font-size: 20px;
    font-weight: 500;
    line-height: 1.2;
    letter-spacing: -0.015em;
  }

  .book-en {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 11px;
    font-style: italic;
    color: var(--muted);
  }

  .book-sub {
    margin-top: 3px;
    font-size: 10px;
    line-height: 1.5;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .art {
    width: 100%;
    height: auto;
    margin: 8px 0 2px;
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

  .turn .node {
    fill: var(--card-2);
    stroke: var(--line);
  }

  .turn .link {
    stroke: var(--line);
    stroke-width: 0.8;
  }

  .turn .route {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.2;
  }

  .turn .route.bad {
    stroke: var(--ember);
    stroke-dasharray: 3 3;
  }

  .book-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: auto;
    padding-top: 9px;
    border-top: 1px solid var(--line-2);
  }

  .book-progress {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
    font-size: 10px;
    color: var(--muted);
    white-space: nowrap;
  }

  .book-progress .progress-line {
    flex: 1;
    max-width: 120px;
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
    font-size: 11px;
    font-weight: 500;
    color: var(--accent);
  }

  .colophon {
    margin-top: 30px;
    padding-top: 16px;
    border-top: 1px solid var(--line);
    max-width: 600px;
    font-size: 11px;
    line-height: 1.7;
    color: var(--muted);
  }

  @media (max-width: 720px) {
    .library {
      padding-top: 34px;
    }

    .hero h1 {
      font-size: clamp(30px, 9vw, 40px);
    }

    .shelf {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }

    .book h2 {
      font-size: 19px;
    }
  }
</style>
