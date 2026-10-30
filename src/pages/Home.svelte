<script lang="ts">
  import { CHAPTERS, PARTS } from '../lib/content';
  import { bookById, chapterHref } from '../lib/books';
  import { navigate } from '../lib/router.svelte';
  import { lang, t } from '../lib/lang.svelte';

  const book = bookById('memory-primer')!;
  const readyCount = CHAPTERS.filter((c) => c.status === 'ready').length;
  const open = (slug: string) => navigate(`/book/memory-primer/${slug}`);
</script>

<div class="page home">
  <header class="hero">
    <div class="hero-library">
      <span class="lib-badge">VISUALIZED BOOKS</span>
      <span class="lib-line"></span>
      <span class="lib-text">{t('可视化书库 · 第一本', 'Book 01 · Shared Memory Atlas')}</span>
    </div>
    <div class="source-line">
      <span class="sl-tag">{t('原书', 'Source')}</span>
      <span class="sl-title">{book.origin}</span>
      <span class="sl-meta">{book.authors} · {lang.value === 'en' ? book.editionEn ?? book.edition : book.edition}</span>
    </div>
    <h1 class="display">Consistency<span class="times">×</span><br class="hero-break" />Coherence</h1>
    <p class="hero-sub">
      {#if lang.value === 'en'}
        Memory consistency and cache coherence: two orthogonal problems.<br />
        A 296-page textbook broken into models you can move by hand — every verdict is enumerated by an engine, not drawn.
      {:else}
        内存连贯性（memory consistency）与缓存一致性（cache coherence），两个正交的问题。<br />
        一本 296 页的教材被拆成可以亲手拨动的模型——每个结论都是引擎枚举出来的，不是画出来的。
      {/if}
    </p>
    <div class="hero-meta">
      <span>{t('296 页', '296 pages')}</span><i></i><span>{t('11 章', '11 chapters')}</span><i></i>
      <span>{t(`${readyCount} 章已上线`, `${readyCount} chapters live`)}</span><i></i>
      <span>{t('结论可复核', 'verdicts reproducible')}</span>
    </div>
  </header>

  <section class="lenses">
    <button class="lens" onclick={() => open('ch3')}>
      <div class="lens-head">
        <span class="lens-no">01</span>
        <div>
          <h2 class="display">Consistency</h2>
          <span class="lens-en">{t('内存连贯性 · 跨地址的可见顺序', 'Memory consistency · order across addresses')}</span>
        </div>
      </div>

      <svg class="lens-art" viewBox="0 0 320 132" fill="none" aria-hidden="true">
        <g class="lane">
          <text x="30" y="16" class="art-label">C1</text>
          <rect x="18" y="26" width="58" height="18" rx="5" class="op" />
          <text x="47" y="39" class="art-op">S1: A=1</text>
          <rect x="18" y="50" width="58" height="18" rx="5" class="op" />
          <text x="47" y="63" class="art-op">L1: B</text>
        </g>
        <g class="lane">
          <text x="130" y="16" class="art-label">C2</text>
          <rect x="118" y="72" width="58" height="18" rx="5" class="op" />
          <text x="147" y="85" class="art-op">S2: B=1</text>
          <rect x="118" y="96" width="58" height="18" rx="5" class="op" />
          <text x="147" y="109" class="art-op">L2: A</text>
        </g>
        <g class="lane">
          <text x="230" y="16" class="art-label">C3</text>
          <rect x="218" y="40" width="58" height="18" rx="5" class="op" />
          <text x="247" y="53" class="art-op">S3: A=1</text>
        </g>
        <path d="M96 36H112" class="wire" />
        <path d="M196 82H212" class="wire" />
        <text x="286" y="123" class="art-note" text-anchor="middle">{t('全局内存顺序', 'global memory order')}</text>
        <path d="M12 121H278" class="order-line" />
        <circle cx="46" cy="121" r="2.6" class="tick" />
        <circle cx="146" cy="121" r="2.6" class="tick" />
        <circle cx="246" cy="121" r="2.6" class="tick" />
      </svg>

      <p class="lens-text">
        {t(
          '多个地址、多个核之间，谁先看见谁。SC 要求存在一个全局全序，且每个核保持自己的程序顺序。',
          'Who sees what first, across addresses and cores. SC asks for one global total order that preserves each core’s program order.'
        )}
      </p>
      <span class="lens-go">{t('第 3 章 · 顺序连贯性 →', 'Chapter 3 · Sequential Consistency →')}</span>
    </button>

    <button class="lens" onclick={() => open('ch2')}>
      <div class="lens-head">
        <span class="lens-no">02</span>
        <div>
          <h2 class="display">Coherence</h2>
          <span class="lens-en">{t('缓存一致性 · 单地址的副本一致', 'Cache coherence · one address, one copy')}</span>
        </div>
      </div>

      <svg class="lens-art" viewBox="0 0 320 132" fill="none" aria-hidden="true">
        <g class="cc">
          <rect x="22" y="18" width="54" height="34" rx="7" class="cache" />
          <text x="49" y="33" class="art-label" text-anchor="middle">Cache 1</text>
          <text x="49" y="46" class="art-state" text-anchor="middle">S</text>
          <rect x="133" y="18" width="54" height="34" rx="7" class="cache hot" />
          <text x="160" y="33" class="art-label" text-anchor="middle">Cache 2</text>
          <text x="160" y="46" class="art-state hot" text-anchor="middle">M</text>
          <rect x="244" y="18" width="54" height="34" rx="7" class="cache" />
          <text x="271" y="33" class="art-label" text-anchor="middle">Cache 3</text>
          <text x="271" y="46" class="art-state" text-anchor="middle">I</text>
        </g>
        <path d="M49 52V88" class="wire" />
        <path d="M160 52V88" class="wire hot" />
        <path d="M271 52V88" class="wire" />
        <rect x="96" y="88" width="128" height="24" rx="6" class="mem" />
        <text x="160" y="104" class="art-mem" text-anchor="middle">Memory · A = 1</text>
        <text x="160" y="126" class="art-note" text-anchor="middle">{t('同一时刻只有一个写者', 'at most one writer at a time')}</text>
      </svg>

      <p class="lens-text">
        {t(
          '一个地址被多个缓存持有，写必须让其他副本失效或被更新。这是与 consistency 无关的局部问题。',
          'One address lives in several caches; a write must invalidate or update the other copies. It is a local problem, independent of consistency.'
        )}
      </p>
      <span class="lens-go">{t('第 2 章 · 缓存一致性基础 →', 'Chapter 2 · Coherence Basics →')}</span>
    </button>
  </section>

  <section class="contents">
    <div class="contents-head">
      <h2 class="display">{t('全书目录', 'Contents')}</h2>
      <span>{t('按书中章节顺序，每章一个可交互页面', 'In book order, one interactive page per chapter')}</span>
    </div>

    {#each PARTS as part}
      <div class="part">
        <div class="part-head">
          <span class="part-label">{t(part.label, part.en)}</span>
          {#if lang.value !== 'en'}<span class="part-en">{part.en}</span>{/if}
          <span class="part-rule"></span>
        </div>
        <div class="grid">
          {#each CHAPTERS.filter((c) => c.part === part.id) as ch}
            {#if ch.status === 'ready'}
              <a
                class="ch-card ready"
                href={chapterHref('memory-primer', ch.slug)}
                onclick={(e) => { e.preventDefault(); open(ch.slug); }}
              >
                <div class="ch-top">
                  <span class="ch-n display">{String(ch.n).padStart(2, '0')}</span>
                  <span class="ch-pages mono">{ch.pages}</span>
                </div>
                <h3>{lang.value === 'en' ? ch.en : ch.title}</h3>
                {#if lang.value !== 'en'}<p class="ch-en">{ch.en}</p>{/if}
                <p class="ch-blurb">{lang.value === 'en' ? ch.blurbEn : ch.blurb}</p>
                <span class="ch-open">{t('进入 →', 'Open →')}</span>
              </a>
            {:else}
              <div class="ch-card">
                <div class="ch-top">
                  <span class="ch-n display">{String(ch.n).padStart(2, '0')}</span>
                  <span class="ch-pages mono">{ch.pages}</span>
                </div>
                <h3>{lang.value === 'en' ? ch.en : ch.title}</h3>
                {#if lang.value !== 'en'}<p class="ch-en">{ch.en}</p>{/if}
                <p class="ch-blurb">{lang.value === 'en' ? ch.blurbEn : ch.blurb}</p>
                <span class="ch-soon">{t('规划中', 'Planned')}</span>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
  </section>

  <footer class="colophon">
    <p>
      {#if lang.value === 'en'}
        Based on <em>A Primer on Memory Consistency and Cache Coherence</em> by Sorin, Nagarajan, Hill, and Wood
        (2nd edition, 2020). Every legal / illegal verdict is obtained by exhaustively enumerating all
        program-order-respecting executions in <span class="mono">src/lib/litmus.ts</span> — nothing is simplified.
      {:else}
        内容依据 Sorin、Nagarajan、Hill、Wood 所著
        <em>A Primer on Memory Consistency and Cache Coherence</em>（第二版，2020）。
        页面中的合法 / 非法判定由 <span class="mono">src/lib/litmus.ts</span> 穷举所有符合程序顺序的执行得出，未做简化。
      {/if}
    </p>
  </footer>
</div>

<style>
  .home {
    padding-top: 64px;
  }

  .hero {
    max-width: 760px;
  }

  .hero-library {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 13px;
  }

  .lib-badge {
    padding: 2px 7px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    letter-spacing: 0.11em;
    color: var(--accent-deep);
    background: var(--accent-soft);
    border: 1px solid #cfded9;
    border-radius: 4px;
  }

  .lib-line {
    width: 22px;
    height: 1px;
    background: var(--line);
  }

  .lib-text {
    font-size: 9.5px;
    letter-spacing: 0.04em;
    color: var(--muted);
  }

  .hero h1 {
    margin: 18px 0 0;
    font-size: clamp(52px, 8vw, 88px);
    font-weight: 400;
    line-height: 0.98;
    letter-spacing: -0.045em;
  }

  .hero h1 .times {
    padding: 0 0.06em;
    font-size: 0.52em;
    font-weight: 300;
    color: var(--gold);
    vertical-align: 0.18em;
  }

  .hero-break {
    display: none;
  }

  @media (max-width: 560px) {
    .hero h1 {
      font-size: clamp(40px, 12vw, 56px);
    }

    .hero-break {
      display: inline;
    }

    .hero-library {
      flex-wrap: wrap;
      gap: 6px 8px;
    }

    .lib-line {
      display: none;
    }
  }

  .hero-sub {
    margin-top: 26px;
    font-size: 16px;
    line-height: 1.8;
    color: var(--ink-3);
  }

  .hero-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 24px;
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

  .lenses {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    margin-top: 56px;
  }

  .lens {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 22px 22px 20px;
    text-align: left;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow: var(--shadow);
    transition: transform 0.35s var(--ease), box-shadow 0.35s var(--ease), border-color 0.35s var(--ease);
  }

  .lens:hover {
    transform: translateY(-3px);
    border-color: #d9cfba;
    box-shadow: var(--shadow-lift);
  }

  .lens-head {
    display: flex;
    align-items: baseline;
    gap: 14px;
  }

  .lens-no {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 12px;
    color: var(--gold);
    letter-spacing: 0.06em;
  }

  .lens-head h2 {
    font-size: 25px;
    font-weight: 500;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  .lens-en {
    display: block;
    margin-top: 5px;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 11.5px;
    font-style: italic;
    color: var(--muted);
  }

  .lens-art {
    width: 100%;
    height: auto;
    margin: 2px 0 0;
  }

  .lens-text {
    font-size: 12.5px;
    line-height: 1.7;
    color: var(--ink-3);
  }

  .lens-go {
    margin-top: auto;
    padding-top: 4px;
    font-size: 11.5px;
    font-weight: 500;
    color: var(--accent);
  }

  /* --- svg bits --- */
  .art-label {
    font-family: 'Inter', sans-serif;
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.04em;
    fill: var(--muted);
  }

  .art-op {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.4px;
    fill: var(--accent-deep);
  }

  .art-note {
    font-family: 'Inter', sans-serif;
    font-size: 7.6px;
    fill: var(--muted);
    letter-spacing: 0.04em;
  }

  .art-state {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 500;
    fill: var(--muted);
  }

  .art-state.hot {
    fill: var(--st-m);
  }

  .art-mem {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.8px;
    fill: var(--ink-3);
  }

  .op {
    fill: var(--paper-2);
    stroke: var(--line);
  }

  .cache {
    fill: var(--card-2);
    stroke: var(--line);
  }

  .cache.hot {
    fill: var(--ember-soft);
    stroke: #e4c6b8;
  }

  .mem {
    fill: var(--accent-soft);
    stroke: #cfded9;
  }

  .wire {
    stroke: var(--line);
    stroke-width: 1;
    stroke-dasharray: 3 4;
  }

  .wire.hot {
    stroke: #d8b09f;
  }

  .order-line {
    stroke: var(--line);
    stroke-width: 1;
  }

  .tick {
    fill: var(--gold);
  }

  /* --- contents --- */
  .contents {
    margin-top: 76px;
  }

  .contents-head {
    display: flex;
    align-items: baseline;
    gap: 14px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--line);
  }

  .contents-head h2 {
    font-size: 22px;
    font-weight: 500;
  }

  .contents-head span {
    font-size: 11.5px;
    color: var(--muted);
  }

  .part {
    margin-top: 30px;
  }

  .part-head {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 12px;
  }

  .part-label {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-3);
  }

  .part-en {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 11px;
    font-style: italic;
    color: var(--muted);
  }

  .part-rule {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, var(--line), rgba(231, 223, 207, 0));
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .ch-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px 16px 44px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 14px;
    color: inherit;
    text-decoration: none;
    transition: transform 0.3s var(--ease), box-shadow 0.3s var(--ease), border-color 0.3s var(--ease);
  }

  .ch-card.ready:hover {
    transform: translateY(-2px);
    border-color: #d9cfba;
    box-shadow: var(--shadow-lift);
  }

  .ch-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .ch-n {
    font-size: 17px;
    color: var(--gold);
    letter-spacing: 0.02em;
  }

  .ch-pages {
    font-size: 9.5px;
    color: var(--muted);
    letter-spacing: 0.04em;
  }

  .ch-card h3 {
    font-size: 13.5px;
    font-weight: 600;
    line-height: 1.35;
    color: var(--ink);
  }

  .ch-en {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 10.5px;
    font-style: italic;
    line-height: 1.35;
    color: var(--muted);
  }

  .ch-blurb {
    margin-top: 6px;
    font-size: 11.5px;
    line-height: 1.62;
    color: var(--ink-3);
  }

  .ch-card:not(.ready) h3,
  .ch-card:not(.ready) .ch-blurb {
    opacity: 0.55;
  }

  .ch-open {
    position: absolute;
    left: 16px;
    bottom: 14px;
    font-size: 11px;
    font-weight: 500;
    color: var(--accent);
    opacity: 0;
    transform: translateX(-3px);
    transition: opacity 0.25s var(--ease), transform 0.25s var(--ease);
  }

  .ch-card.ready:hover .ch-open {
    opacity: 1;
    transform: none;
  }

  .ch-soon {
    position: absolute;
    left: 16px;
    bottom: 14px;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .colophon {
    margin-top: 64px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
    font-size: 11.5px;
    line-height: 1.75;
    color: var(--muted);
    max-width: 640px;
  }

  .colophon em {
    font-family: 'Fraunces', Georgia, serif;
    color: var(--ink-3);
  }

  @media (max-width: 900px) {
    .lenses {
      grid-template-columns: minmax(0, 1fr);
    }

    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 620px) {
    .home {
      padding-top: 36px;
    }

    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
