<script lang="ts">
  import { ICN_CHAPTERS, ICN_PARTS } from '../../lib/icn/content';
  import { chapterHref } from '../../lib/books';
  import { navigate } from '../../lib/router.svelte';
  import { lang, t } from '../../lib/lang.svelte';

  const ready = ICN_CHAPTERS.filter((c) => c.status === 'ready');
  const open = (slug: string) => navigate(`/book/interconnection-networks/${slug}`);
</script>

<div class="page home">
  <header class="hero">
    <div class="hero-library">
      <span class="lib-badge">VISUALIZED BOOKS</span>
      <span class="lib-line"></span>
      <span class="lib-text">{t('可视化书库 · 第三本', 'Book 03 · Interconnection Networks')}</span>
    </div>
    <div class="hero-kicker eyebrow">Interconnection Networks · An Engineering Approach</div>
    <h1 class="display">Deadlock<span class="times">×</span><br class="hero-break" />Routing</h1>
    <p class="hero-sub">
      {#if lang.value === 'en'}
        A deadlock is a cycle in a graph; routing is the choice of which edges you are allowed to add.
        This book turns “will it jam?” into a property you can check, then spends a chapter spending that freedom carefully.
      {:else}
        死锁是图上的一个环；路由就是“你被允许加哪些边”的选择。
        这本书先把“会不会卡死”变成可以检查的性质，再用一整章谨慎地花掉这份自由。
      {/if}
    </p>
    <div class="hero-meta">
      <span>{t('400 页', '400 pages')}</span><i></i><span>{t('9 章', '9 chapters')}</span><i></i>
      <span>{t(`${ready.length} 章已上线`, `${ready.length} chapters live`)}</span><i></i>
      <span>{t('中文版依据', 'based on the Chinese edition')}</span>
    </div>
  </header>

  <section class="lenses">
    <button class="lens" onclick={() => open('ch3')}>
      <div class="lens-head">
        <span class="lens-no">03</span>
        <div>
          <h2 class="display">Deadlock</h2>
          <span class="lens-en">{t('死锁、活锁与饿死', 'Deadlock, livelock, starvation')}</span>
        </div>
      </div>

      <svg class="lens-art" viewBox="0 0 320 132" fill="none" aria-hidden="true">
        <g class="ring">
          <rect x="40" y="16" width="52" height="26" rx="6" class="node" />
          <text x="66" y="33" class="lbl" text-anchor="middle">R0</text>
          <rect x="228" y="16" width="52" height="26" rx="6" class="node" />
          <text x="254" y="33" class="lbl" text-anchor="middle">R1</text>
          <rect x="228" y="86" width="52" height="26" rx="6" class="node" />
          <text x="254" y="103" class="lbl" text-anchor="middle">R2</text>
          <rect x="40" y="86" width="52" height="26" rx="6" class="node" />
          <text x="66" y="103" class="lbl" text-anchor="middle">R3</text>
          <path d="M96 29H224" class="edge" />
          <path d="M254 46V82" class="edge" />
          <path d="M224 99H96" class="edge" />
          <path d="M66 82V46" class="edge" />
          <text x="160" y="24" class="cap" text-anchor="middle">{t('占着缓冲', 'holds a buffer')}</text>
          <text x="160" y="112" class="cap" text-anchor="middle">{t('等下一级', 'waits for the next')}</text>
          <text x="160" y="64" class="center" text-anchor="middle">{t('四边闭合 = 死锁', 'four edges close = deadlock')}</text>
        </g>
      </svg>

      <p class="lens-text">
        {t(
          '通道相关图把“谁在等谁”画成有向图：无环就一定无死锁。自适应路由的自由度，本质上就是在这张图上加边。',
          'The channel dependency graph draws “who waits for whom”. No cycle means no deadlock — and every bit of routing freedom is an edge you add to that graph.'
        )}
      </p>
      <span class="lens-go">{t('第 3 章 · 死锁 →', 'Chapter 3 · Deadlock →')}</span>
    </button>

    <button class="lens" onclick={() => open('ch4')}>
      <div class="lens-head">
        <span class="lens-no">04</span>
        <div>
          <h2 class="display">Routing</h2>
          <span class="lens-en">{t('从确定性到最大自适应', 'From deterministic to maximally adaptive')}</span>
        </div>
      </div>

      <svg class="lens-art" viewBox="0 0 320 132" fill="none" aria-hidden="true">
        <g class="mesh">
          {#each [0, 1, 2, 3] as r}
            {#each [0, 1, 2, 3] as c}
              <rect x={54 + c * 54} y={16 + r * 26} width="14" height="14" rx="3.4" class="node" />
            {/each}
          {/each}
          <path d="M61 23H115M115 23H169M169 23H223M61 49H115M115 49H169M169 49H223M61 75H115M115 75H169M169 75H223M61 101H115M115 101H169M169 101H223" class="link" />
          <path d="M68 30V49M68 56V75M68 82V101M122 30V49M122 56V75M122 82V101M176 30V49M176 56V75M176 82V101M230 30V49M230 56V75M230 82V101" class="link" />
          <path d="M61 23H169V75H223" class="route det" />
          <path d="M61 23V49H115V75H223" class="route alt" />
          <path d="M61 23V75H115V49M176 49V101H230V23" class="route alt2" />
          <text x="160" y="124" class="cap" text-anchor="middle">{t('同一对端点：1 条 / 4 条 / 6 条最短路', 'one, four or six shortest paths for the same pair')}</text>
        </g>
      </svg>

      <p class="lens-text">
        {t(
          '确定性路由只用一条最短路；部分自适应用一组；完全自适应用全部最短路；最大自适应连非最短路也用。每一档都用死锁条件付账。',
          'Deterministic uses one shortest path, partially adaptive a subset, fully adaptive all of them, and maximally adaptive even paths that are not shortest. Each step is paid for with a deadlock condition.'
        )}
      </p>
      <span class="lens-go">{t('第 4 章 · 路由算法 →', 'Chapter 4 · Routing algorithms →')}</span>
    </button>
  </section>

  <section class="contents">
    <div class="contents-head">
      <h2 class="display">{t('全书目录', 'Contents')}</h2>
      <span>{t('按书中章节顺序；灰色章节尚未上线', 'In book order; grey chapters are not live yet')}</span>
    </div>

    {#each ICN_PARTS as part}
      <div class="part">
        <div class="part-head">
          <span class="part-label">{t(part.label, part.en)}</span>
          {#if lang.value !== 'en'}<span class="part-en">{part.en}</span>{/if}
          <span class="part-rule"></span>
        </div>
        <div class="grid">
          {#each ICN_CHAPTERS.filter((c) => c.part === part.id) as ch}
            {#if ch.status === 'ready'}
              <a
                class="ch-card ready"
                href={chapterHref('interconnection-networks', ch.slug)}
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
      {t(
        '内容依据 Duato、Yalamanchili、Ni 所著《并行计算机互连网络技术——一种工程方法》（中文版，2004）。目前按用户要求只上线第 3、4 章。',
        'Based on Duato, Yalamanchili and Ni, Interconnection Networks: An Engineering Approach (Chinese edition, 2004). Only Chapters 3 and 4 are live for now.'
      )}
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

  .hero-kicker {
    color: var(--gold);
  }

  .hero h1 {
    margin: 18px 0 0;
    font-size: clamp(46px, 7.5vw, 82px);
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

  .ring .node {
    fill: var(--card-2);
    stroke: var(--line);
  }

  .ring .edge {
    stroke: var(--ember);
    stroke-width: 1.1;
    fill: none;
  }

  .ring .lbl {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    fill: var(--ink-3);
  }

  .ring .cap {
    font-family: 'Inter', sans-serif;
    font-size: 7.6px;
    fill: var(--muted);
  }

  .ring .center {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 10px;
    fill: var(--ember);
  }

  .mesh .node {
    fill: var(--card-2);
    stroke: var(--line);
  }

  .mesh .link {
    stroke: var(--line);
    stroke-width: 0.7;
  }

  .mesh .route {
    fill: none;
    stroke-width: 1.1;
  }

  .mesh .route.det {
    stroke: var(--accent);
  }

  .mesh .route.alt {
    stroke: var(--gold);
    stroke-dasharray: 3 3;
  }

  .mesh .route.alt2 {
    stroke: var(--ember);
    stroke-dasharray: 2 4;
  }

  .mesh .cap {
    font-family: 'Inter', sans-serif;
    font-size: 7.4px;
    fill: var(--muted);
  }

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
  }

  .ch-pages {
    font-size: 9.5px;
    color: var(--muted);
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

  @media (max-width: 900px) {
    .lenses,
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 560px) {
    .hero h1 {
      font-size: clamp(36px, 11vw, 52px);
    }

    .hero-break {
      display: inline;
    }

    .home {
      padding-top: 36px;
    }
  }
</style>
