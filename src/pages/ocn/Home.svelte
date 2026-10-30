<script lang="ts">
  import { OCN_CHAPTERS, OCN_PARTS } from '../../lib/noc/content';
  import { bookById, chapterHref } from '../../lib/books';
  import { navigate } from '../../lib/router.svelte';
  import { lang, t } from '../../lib/lang.svelte';

  const book = bookById('on-chip-networks')!;
  const readyCount = OCN_CHAPTERS.filter((c) => c.status === 'ready').length;
  const open = (slug: string) => navigate(`/book/on-chip-networks/${slug}`);
</script>

<div class="page home">
  <header class="hero">
    <div class="hero-library">
      <span class="lib-badge">VISUALIZED BOOKS</span>
      <span class="lib-line"></span>
      <span class="lib-text">{t('可视化书库 · 第二本', 'Book 02 · On-Chip Networks')}</span>
    </div>
    <div class="source-line">
      <span class="sl-tag">{t('原书', 'Source')}</span>
      <span class="sl-title">{book.origin}</span>
      <span class="sl-meta">{book.authors} · {lang.value === 'en' ? book.editionEn ?? book.edition : book.edition}</span>
    </div>
    <h1 class="display">Topology<span class="times">×</span><br class="hero-break" />Flow</h1>
    <p class="hero-sub">
      {#if lang.value === 'en'}
        Topology decides what the network costs; flow control decides what it can carry.<br />
        A 142-page synthesis broken into graphs you can count on — diameter, average hops, bisection, deadlock cycles are all computed live.
      {:else}
        拓扑决定这张网要花多少，流控决定它能扛多少。<br />
        一本 142 页的综述被拆成可以数、可以走、可以卡死的图——直径、平均跳数、对剖带宽、死锁环，全部现算。
      {/if}
    </p>
    <div class="hero-meta">
      <span>{t('142 页', '142 pages')}</span><i></i><span>{t('8 章', '8 chapters')}</span><i></i>
      <span>{t(`${readyCount} 章已上线`, `${readyCount} chapters live`)}</span><i></i>
      <span>{t('结论可复核', 'verdicts reproducible')}</span>
    </div>
  </header>

  <section class="lenses">
    <button class="lens" onclick={() => open('ch3')}>
      <div class="lens-head">
        <span class="lens-no">01</span>
        <div>
          <h2 class="display">Topology</h2>
          <span class="lens-en">{t('拓扑 · 一张图的四个数', 'Topology · four numbers per graph')}</span>
        </div>
      </div>

      <svg class="lens-art" viewBox="0 0 320 132" fill="none" aria-hidden="true">
        <g class="mesh">
          {#each [0, 1, 2, 3] as r}
            {#each [0, 1, 2, 3] as c}
              <rect x={36 + c * 58} y={14 + r * 27} width="16" height="16" rx="3.6" class="node" />
            {/each}
          {/each}
          <path d="M54 22H78M112 22H136M170 22H194M54 49H78M112 49H136M170 49H194M54 76H78M112 76H136M170 76H194M54 103H78M112 103H136M170 103H194" class="link" />
          <path d="M44 32V41M44 59V68M44 86V95M102 32V41M102 59V68M102 86V95M160 32V41M160 59V68M160 86V95M218 32V41M218 59V68M218 86V95" class="link" />
          <path d="M44 22H160V76H218" class="route" />
          <circle cx="44" cy="22" r="3" class="dot" />
          <circle cx="218" cy="76" r="3" class="dot dest" />
          <text x="250" y="52" class="art-note">{t('4×4 · 16 节点', '4×4 · 16 nodes')}</text>
          <text x="250" y="68" class="art-note">{t('直径 6 · 平均 2.67 跳', 'diameter 6 · 2.67 hops')}</text>
        </g>
      </svg>

      <p class="lens-text">
        {t(
          '同样 16 个核，ring 直径 8、mesh 直径 6、torus 只有 4，但对剖链路翻了一倍。选拓扑就是选把成本压在哪。',
          'For the same 16 cores: a ring has diameter 8, a mesh 6, a torus 4 — and twice the bisection links. Choosing a topology is choosing where to spend.'
        )}
      </p>
      <span class="lens-go">{t('第 3 章 · 拓扑 →', 'Chapter 3 · Topology →')}</span>
    </button>

    <button class="lens" onclick={() => open('ch5')}>
      <div class="lens-head">
        <span class="lens-no">02</span>
        <div>
          <h2 class="display">Flow</h2>
          <span class="lens-en">{t('流控 · 缓冲与虚拟信道', 'Flow control · buffers and VCs')}</span>
        </div>
      </div>

      <svg class="lens-art" viewBox="0 0 320 132" fill="none" aria-hidden="true">
        <g class="router">
          <rect x="18" y="16" width="84" height="100" rx="10" class="box" />
          <rect x="126" y="16" width="84" height="100" rx="10" class="box" />
          <rect x="234" y="16" width="72" height="100" rx="10" class="box dim" />
          <text x="60" y="32" class="art-label" text-anchor="middle">R0</text>
          <text x="168" y="32" class="art-label" text-anchor="middle">R1</text>
          <text x="270" y="32" class="art-label" text-anchor="middle">R2</text>
          {#each [0, 1, 2, 3] as i}
            <rect x="30" y={44 + i * 16} width="26" height="10" rx="2.5" class="flit" class:on={i < 2} />
            <rect x="50" y={44 + i * 16} width="26" height="10" rx="2.5" class="flit" class:on={i < 1} />
            <rect x="138" y={44 + i * 16} width="26" height="10" rx="2.5" class="flit" />
            <rect x="158" y={44 + i * 16} width="26" height="10" rx="2.5" class="flit" class:on={i < 1} />
          {/each}
          <path d="M102 58H126" class="wire" />
          <path d="M210 58H234" class="wire" />
          <text x="168" y="112" class="art-note" text-anchor="middle">{t('head flit 占住通道', 'head flit holds the channel')}</text>
          <text x="60" y="112" class="art-note" text-anchor="middle">{t('VC0 / VC1', 'VC0 / VC1')}</text>
        </g>
      </svg>

      <p class="lens-text">
        {t(
          '一条物理链路上开几条虚拟信道，决定了一个包能不能绕过被堵住的另一个包。wormhole 省缓冲，代价是把链路借给了整条包。',
          'A few virtual channels per physical link decide whether one packet can slip past another. Wormhole saves buffers, at the price of lending the whole packet the link.'
        )}
      </p>
      <span class="lens-go">{t('第 5 章 · 流控 →', 'Chapter 5 · Flow Control →')}</span>
    </button>
  </section>

  <section class="contents">
    <div class="contents-head">
      <h2 class="display">{t('全书目录', 'Contents')}</h2>
      <span>{t('按书中章节顺序，每章一个可交互页面', 'In book order, one interactive page per chapter')}</span>
    </div>

    {#each OCN_PARTS as part}
      <div class="part">
        <div class="part-head">
          <span class="part-label">{t(part.label, part.en)}</span>
          {#if lang.value !== 'en'}<span class="part-en">{part.en}</span>{/if}
          <span class="part-rule"></span>
        </div>
        <div class="grid">
          {#each OCN_CHAPTERS.filter((c) => c.part === part.id) as ch}
            {#if ch.status === 'ready'}
              <a
                class="ch-card ready"
                href={chapterHref('on-chip-networks', ch.slug)}
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
        Based on <em>On-Chip Networks, Second Edition</em> by Natalie Enright Jerger, Tushar Krishna, and Li-Shiuan Peh
        (2017). Diameters, average hop counts, bisection widths, and deadlock cycles on these pages are computed from
        the graphs and channel dependencies in <span class="mono">src/lib/noc/</span>.
      {:else}
        内容依据 Enright Jerger、Krishna、Peh 所著 <em>On-Chip Networks, Second Edition</em>（2017）。
        页面里的直径、平均跳数、对剖带宽与死锁环，由 <span class="mono">src/lib/noc/</span> 下的引擎按图与信道依赖现算。
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

  .art-label {
    font-family: 'Inter', sans-serif;
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.04em;
    fill: var(--muted);
  }

  .art-note {
    font-family: 'Inter', sans-serif;
    font-size: 7.6px;
    fill: var(--muted);
    letter-spacing: 0.04em;
  }

  .mesh .node {
    fill: var(--card-2);
    stroke: var(--line);
  }

  .mesh .link {
    stroke: var(--line);
  }

  .mesh .route {
    stroke: var(--ember);
    stroke-dasharray: 3 3;
    fill: none;
  }

  .mesh .dot {
    fill: var(--accent);
  }

  .mesh .dot.dest {
    fill: var(--ember);
  }

  .router .box {
    fill: var(--card-2);
    stroke: var(--line);
  }

  .router .box.dim {
    opacity: 0.55;
  }

  .router .flit {
    fill: var(--paper-2);
    stroke: var(--line);
  }

  .router .flit.on {
    fill: var(--accent-soft);
    stroke: var(--accent);
  }

  .router .wire {
    stroke: var(--line);
    stroke-dasharray: 3 4;
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

  @media (max-width: 560px) {
    .hero h1 {
      font-size: clamp(40px, 12vw, 56px);
    }

    .hero-break {
      display: inline;
    }

    .home {
      padding-top: 36px;
    }

    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
