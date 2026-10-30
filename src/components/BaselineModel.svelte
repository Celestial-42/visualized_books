<script lang="ts">
  import { t } from '../lib/lang.svelte';

  type St = 'I' | 'S' | 'M';
  type Line = { v: number | null; s: St };
  type Entry = { zh: string; en: string; tone?: 'bad' | 'ok' };

  let c1 = $state<Line>({ v: null, s: 'I' });
  let c2 = $state<Line>({ v: null, s: 'I' });
  let mem = $state({ A: 0 });
  let hot = $state<string[]>([]);
  let log = $state<Entry[]>([]);
  let busy = $state(false);
  let pulse = $state(0);

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const flash = (paths: string[]) => {
    hot = paths;
    pulse += 1;
    setTimeout(() => (hot = []), 900);
  };

  const push = (zh: string, en: string, tone?: 'bad' | 'ok') => {
    log = [{ zh, en, tone }, ...log].slice(0, 5);
  };

  function reset() {
    c1 = { v: null, s: 'I' };
    c2 = { v: null, s: 'I' };
    mem = { A: 0 };
    log = [];
    hot = [];
  }

  function read(which: 1 | 2) {
    const cache = which === 1 ? c1 : c2;
    const name = `C${which}`;
    if (cache.s !== 'I') {
      push(`${name} 读 A：命中，返回 ${cache.v}`, `${name} reads A: hit, returns ${cache.v}`);
      flash(which === 1 ? ['c1'] : ['c2']);
      return;
    }
    cache.v = mem.A;
    cache.s = 'S';
    push(
      `${name} 读 A：缺失，向内存取回 ${mem.A}，副本变 S`,
      `${name} reads A: miss, fetches ${mem.A} from memory, copy becomes S`
    );
    flash(which === 1 ? ['c1', 'c1-bus', 'bus-mem'] : ['c2', 'c2-bus', 'bus-mem']);
  }

  function write(which: 1 | 2) {
    const cache = which === 1 ? c1 : c2;
    const name = `C${which}`;
    const existed = cache.s !== 'I';
    cache.v = 1;
    cache.s = 'M';
    push(
      `${name} 写 A=1：${existed ? '写命中' : '写缺失后分配'}，只改本核副本；内存仍是 ${mem.A}，另一核的副本没人管`,
      `${name} writes A=1: ${existed ? 'write hit' : 'write miss, allocate'}, updates only its own copy; memory still ${mem.A}, the other copy is left alone`,
      'bad'
    );
    flash(which === 1 ? ['c1', 'c1-bus'] : ['c2', 'c2-bus']);
  }

  async function preset() {
    if (busy) return;
    busy = true;
    reset();
    await wait(420);
    read(2);
    await wait(820);
    read(1);
    await wait(820);
    write(1);
    await wait(900);
    read(2);
    busy = false;
  }

  const incoherent = $derived(c1.v !== null && c2.v !== null && c1.v !== c2.v);
  const cold = $derived(c1.v === null && c2.v === null);

  const stName = $derived((s: St) => s);
</script>

<div class="model">
  <svg viewBox="0 0 680 300" class="stage" role="img" aria-label={t('双核共享内存基线模型', 'Two-core shared-memory baseline system')}>
    <defs>
      <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
      </marker>
    </defs>

    <!-- cores + caches -->
    <g class="node" class:hot={hot.includes('c1')}>
      <text x="152" y="24" class="core-label" text-anchor="middle">{t('核 C1', 'Core C1')}</text>
      <rect x="62" y="38" width="180" height="76" rx="12" class="box" />
      <text x="76" y="58" class="tiny">{t('L1 缓存', 'L1 cache')}</text>
      <text x="76" y="84" class="val mono">{c1.v === null ? 'A = —' : `A = ${c1.v}`}</text>
      <g transform="translate(210,72)">
        <rect width="20" height="18" rx="5" class={`st st-${c1.s}`} />
        <text x="10" y="12.5" class="st-txt" text-anchor="middle">{stName(c1.s)}</text>
      </g>
    </g>

    <g class="node" class:hot={hot.includes('c2')}>
      <text x="532" y="24" class="core-label" text-anchor="middle">{t('核 C2', 'Core C2')}</text>
      <rect x="442" y="38" width="180" height="76" rx="12" class="box" />
      <text x="456" y="58" class="tiny">{t('L1 缓存', 'L1 cache')}</text>
      <text x="456" y="84" class="val mono">{c2.v === null ? 'A = —' : `A = ${c2.v}`}</text>
      <g transform="translate(590,72)">
        <rect width="20" height="18" rx="5" class={`st st-${c2.s}`} />
        <text x="10" y="12.5" class="st-txt" text-anchor="middle">{stName(c2.s)}</text>
      </g>
    </g>

    <!-- links to bus -->
    <path d="M152 114V170" class="wire" class:hot={hot.includes('c1-bus')} />
    <path d="M532 114V170" class="wire" class:hot={hot.includes('c2-bus')} />
    <path d="M340 170V212" class="wire" class:hot={hot.includes('bus-mem')} />

    <!-- bus -->
    <rect x="40" y="162" width="604" height="16" rx="8" class="bus" />
    <text x="52" y="198" class="tiny">{t('互连网络 · 这里先假设没有 coherence 协议', 'interconnect · no coherence protocol yet')}</text>

    <!-- memory -->
    <g class="node" class:hot={hot.includes('bus-mem')}>
      <rect x="250" y="212" width="180" height="64" rx="12" class="membox" />
      <text x="266" y="232" class="tiny">{t('内存', 'Memory')}</text>
      <text x="266" y="256" class="val mono">A = {mem.A}</text>
    </g>

    {#key pulse}
      {#if hot.length}
        <circle r="3.6" class="spark">
          <animateMotion dur="0.8s" path={hot.includes('bus-mem') ? 'M152,120 L152,165 L330,170 L340,212' : hot.includes('c1') ? 'M152,56 L152,80' : 'M532,56 L532,80'} />
        </circle>
      {/if}
    {/key}
  </svg>

  <div class="toolbar model-bar">
    <button class="btn small" disabled={busy} onclick={() => read(1)}>{t('C1 读 A', 'C1 reads A')}</button>
    <button class="btn small" disabled={busy} onclick={() => write(1)}>{t('C1 写 A', 'C1 writes A')}</button>
    <button class="btn small" disabled={busy} onclick={() => read(2)}>{t('C2 读 A', 'C2 reads A')}</button>
    <button class="btn small" disabled={busy} onclick={() => write(2)}>{t('C2 写 A', 'C2 writes A')}</button>
    <span class="spacer"></span>
    <button class="btn small primary" disabled={busy} onclick={preset}>{t('重放书中 2.2 节的例子', 'Replay the §2.2 example')}</button>
    <button class="btn small ghost" disabled={busy} onclick={reset}>{t('重置', 'Reset')}</button>
  </div>

  <div class="readout">
    <div class="log">
      {#if log.length === 0}
        <p class="log-empty">{t('点上面的按钮，观察每个副本发生了什么。', 'Use the buttons above and watch what happens to each copy.')}</p>
      {:else}
        {#each log as item}
          <p class="log-item" class:bad={item.tone === 'bad'}>{t(item.zh, item.en)}</p>
        {/each}
      {/if}
    </div>
    <div class="verdict" class:bad={incoherent} class:ok={!incoherent && !cold}>
      {#if incoherent}
        <span class="v-dot"></span>{t('两个副本已经不一致 —— coherence 被破坏', 'The two copies disagree — coherence is broken')}
      {:else if cold}
        <span class="v-dot"></span>{t('两个缓存都没有副本', 'Neither cache holds a copy')}
      {:else}
        <span class="v-dot"></span>{t('此刻副本一致（但协议能保证的远不止此刻）', 'Copies agree right now (a protocol must guarantee far more than this moment)')}
      {/if}
    </div>
  </div>
</div>

<style>
  .model {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .stage {
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .core-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    fill: var(--muted);
  }

  .box,
  .membox {
    fill: var(--card-2);
    stroke: var(--line);
    transition: fill 0.35s var(--ease), stroke 0.35s var(--ease);
  }

  .membox {
    fill: var(--accent-soft);
    stroke: #cfded9;
  }

  .node.hot .box {
    fill: #fdf6ec;
    stroke: #e3c9ad;
  }

  .tiny {
    font-size: 9px;
    letter-spacing: 0.05em;
    fill: var(--muted);
  }

  .val {
    font-size: 13px;
    fill: var(--ink-2);
  }

  .st {
    stroke: transparent;
  }

  .st-I {
    fill: #efe9dd;
  }

  .st-S {
    fill: #e2ecf3;
  }

  .st-M {
    fill: var(--ember-soft);
  }

  .st-txt {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 500;
    fill: var(--ink-3);
  }

  .st-S + .st-txt {
    fill: var(--st-s);
  }

  .wire {
    stroke: var(--line);
    stroke-width: 1.2;
    stroke-dasharray: 4 5;
    transition: stroke 0.3s var(--ease);
  }

  .wire.hot {
    stroke: #c9a17d;
  }

  .bus {
    fill: var(--paper-3);
    stroke: var(--line);
  }

  .spark {
    fill: var(--ember);
  }

  .model-bar {
    padding-top: 2px;
  }

  .readout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 16px;
    align-items: start;
    padding-top: 12px;
    border-top: 1px solid var(--line-2);
  }

  .log {
    min-height: 58px;
  }

  .log-empty {
    font-size: 11.5px;
    color: var(--muted);
  }

  .log-item {
    font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    font-size: 10.5px;
    line-height: 1.75;
    color: var(--ink-3);
  }

  .log-item:first-child {
    color: var(--ink-2);
  }

  .log-item.bad:first-child {
    color: var(--ember);
  }

  .verdict {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 6px 10px;
    font-size: 11px;
    line-height: 1.5;
    color: var(--ink-3);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    max-width: 260px;
  }

  .verdict .v-dot {
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--muted);
  }

  .verdict.ok .v-dot {
    background: var(--st-e);
  }

  .verdict.bad {
    color: var(--ember);
    background: var(--ember-soft);
    border-color: #eed8ce;
  }

  .verdict.bad .v-dot {
    background: var(--ember);
  }

  @media (max-width: 640px) {
    .readout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
