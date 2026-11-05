<script lang="ts">
  import { LOGIC_CHAPTERS, LOGIC_PARTS } from '../../lib/logic/content';
  import { bookById, chapterHref } from '../../lib/books';
  import { navigate } from '../../lib/router.svelte';
  import { lang, t } from '../../lib/lang.svelte';

  const book = bookById('typical-logic')!;
  const ready = LOGIC_CHAPTERS.filter((c) => c.status === 'ready');
  const open = (slug: string) => navigate(`/book/typical-logic/${slug}`);
</script>

<div class="page home">
  <header class="hero">
    <div class="hero-library">
      <span class="lib-badge">VISUALIZED BOOKS</span>
      <span class="lib-line"></span>
      <span class="lib-text">{t('可视化书库 · 第四本', 'Book 04 · Typical Logic Circuits')}</span>
    </div>
    <div class="source-line">
      <span class="sl-tag">{t('原创', 'Original')}</span>
      <span class="sl-title">{book.origin}</span>
      {#if lang.value !== 'en' && book.originZh}<span class="sl-zh">{book.originZh}</span>{/if}
      <span class="sl-meta">{book.authors} · {lang.value === 'en' ? book.editionEn ?? book.edition : book.edition}</span>
    </div>
    <h1 class="display">Typical<span class="times">×</span><br class="hero-break" />Logic</h1>
    <p class="hero-sub">
      {#if lang.value === 'en'}
        Every logic block is three bills: state, timing and area. This book starts with the FIFO — one memory,
        two pointers, three ways to decide full and empty — and turns each boundary into something you can step through.
      {:else}
        每个逻辑电路都记三笔账：状态、时序、面积。这本书从 FIFO 开始——一块存储、两个指针、三种满空判定——
        把每一个边界都做成可以单步走过去的实验。
      {/if}
    </p>
    <div class="hero-meta">
      <span>{t(`${LOGIC_CHAPTERS.length} 章`, `${LOGIC_CHAPTERS.length} chapters`)}</span><i></i><span>{t(`${ready.length} 章已上线`, `${ready.length} chapter live`)}</span><i></i>
      <span>{t('原创讲义', 'original notes')}</span><i></i>
      <span>{t('结论由引擎现算', 'verdicts computed live')}</span>
    </div>
  </header>

  <section class="lenses single">
    <button class="lens" onclick={() => open('ch1')}>
      <div class="lens-head">
        <span class="lens-no">01</span>
        <div>
          <h2 class="display">FIFO</h2>
          <span class="lens-en">{t('第 1 章 · §1.1 同步 FIFO（已上线）', 'Chapter 1 · §1.1 synchronous FIFO (live)')}</span>
        </div>
      </div>

      <svg class="lens-art" viewBox="0 0 680 150" fill="none" aria-hidden="true">
        <g class="ring">
          {#each Array(8) as _, i}
            <rect
              x={22 + i * 46}
              y="26"
              width="38"
              height="34"
              rx="7"
              class="cell"
              class:filled={i > 1 && i < 7}
              class:head={i === 2}
            />
            <text x={41 + i * 46} y="47" class="idx" text-anchor="middle">{i}</text>
          {/each}
          <path d="M152 76V92H104" class="ptr" marker-end="url(#lw)" />
          <path d="M380 76V92H332" class="ptr w" marker-end="url(#lw2)" />
          <text x="104" y="108" class="cap" text-anchor="middle">rptr</text>
          <text x="332" y="108" class="cap w" text-anchor="middle">wptr</text>
          <text x="220" y="108" class="cap mid" text-anchor="middle">{t('5 个有效字 · 回绕', 'five valid words · wrap')}</text>

          <g class="wave" transform="translate(430 18)">
            <text x="0" y="0" class="cap">{t('同一块存储，两个节拍', 'one memory, two beats')}</text>
            <path d="M0 14H24V24H48V34H72V44H96" class="sig" />
            <text x="106" y="48" class="cap">clk</text>
            <path d="M0 58H24V68H48V78H72V88H96" class="sig acc" />
            <text x="106" y="92" class="cap">wr_en</text>
            <path d="M0 102H24V112H48V122H72V132H96" class="sig ember" />
            <text x="106" y="136" class="cap">rd_en</text>
          </g>

          <defs>
            <marker id="lw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#b4543a" />
            </marker>
            <marker id="lw2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#2f5d62" />
            </marker>
          </defs>
        </g>
      </svg>

      <p class="lens-text">
        {t(
          '先把“不丢数、不读空”做成一条能检查的契约，再把满/空判定、读出延迟和深度计算各拆成一个实验。四个实验全部由引擎现算：填到满、读到空、同拍读写、回绕，每一步都能看见指针与 count 怎么走。',
          'First make “never lose a word, never read empty” a checkable contract, then split full/empty detection, readout latency and depth sizing into one experiment each. All four are computed live: fill it, drain it, read and write in the same cycle, wrap the pointers, and watch count move.'
        )}
      </p>
      <span class="lens-go">{t('第 1 章 · FIFO →', 'Chapter 1 · FIFO →')}</span>
    </button>
  </section>

  <section class="contents">
    <div class="contents-head">
      <h2 class="display">{t('全书目录', 'Contents')}</h2>
      <span>{t('自定大纲；灰色章节尚未上线', 'Original outline; grey chapters are not live yet')}</span>
    </div>

    {#each LOGIC_PARTS as part}
      <div class="part">
        <div class="part-head">
          <span class="part-label">{t(part.label, part.en)}</span>
          {#if lang.value !== 'en'}<span class="part-en">{part.en}</span>{/if}
          <span class="part-rule"></span>
        </div>
        <div class="grid">
          {#each LOGIC_CHAPTERS.filter((c) => c.part === part.id) as ch}
            {#if ch.status === 'ready'}
              <a
                class="ch-card ready"
                href={chapterHref('typical-logic', ch.slug)}
                onclick={(e) => { e.preventDefault(); open(ch.slug); }}
              >
                <div class="ch-top">
                  <span class="ch-n display">{String(ch.n).padStart(2, '0')}</span>
                  <span class="ch-pages mono">{t('已上线', 'live')}</span>
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
                  <span class="ch-pages mono">—</span>
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
        '本书是本站原创讲义，不依据特定出版物；大纲按“状态、时序、面积”三笔账组织。第 1 章 FIFO 先上线 1.1 同步 FIFO；1.2 异步 FIFO 与第 2 章跨时钟域列在后续。',
        'This is an original course sequence, not tied to a particular publication; the outline follows three bills: state, timing and area. Chapter 1 FIFO starts with §1.1 synchronous FIFO; §1.2 asynchronous FIFO and Chapter 2 clock-domain crossing follow.'
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

  .lenses.single {
    grid-template-columns: minmax(0, 1fr);
    max-width: 900px;
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
    max-width: 720px;
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

  .ring .cell {
    fill: var(--paper-2);
    stroke: var(--line);
  }

  .ring .cell.filled {
    fill: var(--card);
    stroke: #cfded9;
  }

  .ring .cell.head {
    stroke: var(--ember);
    stroke-width: 1.2;
  }

  .ring .idx {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    fill: var(--muted);
  }

  .ring .ptr {
    stroke: var(--ember);
    stroke-width: 1.1;
    fill: none;
  }

  .ring .ptr.w {
    stroke: var(--accent);
  }

  .ring .cap {
    font-family: 'Inter', sans-serif;
    font-size: 8px;
    fill: var(--muted);
  }

  .ring .cap.w {
    fill: var(--accent);
  }

  .ring .cap.mid {
    fill: var(--ink-3);
  }

  .ring .sig {
    fill: none;
    stroke: var(--ink-3);
    stroke-width: 1;
  }

  .ring .sig.acc {
    stroke: var(--accent);
  }

  .ring .sig.ember {
    stroke: var(--ember);
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
    font-size: 9px;
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
