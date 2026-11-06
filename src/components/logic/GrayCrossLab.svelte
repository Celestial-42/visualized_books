<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    binary,
    captureLane,
    defaultDelays,
    summarizeSweep,
    sweepCapture,
    type LaneCapture
  } from '../../lib/logic/async';
  import { t } from '../../lib/lang.svelte';

  const WIDTH = 4;
  const OLD = 7;
  const NEW = 8;
  const APERTURE = 0.012;

  let spread = $state(0.9);
  let phase = $state(0.12);
  let playing = $state(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  const delays = $derived(defaultDelays(spread));
  const gray = $derived(
    captureLane('gray', { width: WIDTH, oldValue: OLD, newValue: NEW, delays, phase, aperture: APERTURE })
  );
  const bin = $derived(
    captureLane('binary', { width: WIDTH, oldValue: OLD, newValue: NEW, delays, phase, aperture: APERTURE })
  );
  const sweep = $derived(sweepCapture(WIDTH, OLD, NEW, delays, APERTURE, 101));
  const summary = $derived(summarizeSweep(sweep));

  const x0 = 92;
  const x1 = 648;
  const xOf = (p: number) => x0 + p * (x1 - x0);
  const laneRows = (lane: LaneCapture) =>
    [3, 2, 1, 0].map((bit) => ({
      bit,
      old: lane.oldBits[bit],
      next: lane.newBits[bit],
      changed: lane.oldBits[bit] !== lane.newBits[bit],
      captured: lane.capturedBits[bit],
      delay: delays[bit],
      meta: lane.metaBits.includes(bit)
    }));

  const stop = () => {
    playing = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const play = () => {
    if (playing) {
      stop();
      return;
    }
    if (phase >= 0.999) phase = 0;
    playing = true;
    timer = setInterval(() => {
      phase = Math.min(1, phase + 0.006);
      if (phase >= 1) stop();
    }, 28);
  };

  const setPhase = (value: number) => {
    stop();
    phase = value;
  };

  onDestroy(stop);

  const stateLabel = (lane: LaneCapture) =>
    lane.state === 'before'
      ? t('变化前', 'before')
      : lane.state === 'after'
        ? t('变化后', 'after')
        : t('变化中', 'during');

  const bit = (v: number) => (v ? '1' : '0');
</script>

<div class="lab">
  <div class="panel">
    <div class="top">
      <div class="pointer">
        <span class="eyebrow">{t('写指针跨域', 'pointer crossing')}</span>
        <b class="mono">7 → 8</b>
        <span class="mini">
          {t('格雷码 0100 → 1100（只变 1 位）', 'gray 0100 → 1100 (one bit)')}
        </span>
        <span class="mini">
          {t('二进制 0111 → 1000（变 4 位）', 'binary 0111 → 1000 (four bits)')}
        </span>
      </div>
      <div class="phase">
        <span class="eyebrow">{t('capture 相位', 'capture phase')}</span>
        <b class="mono">{phase.toFixed(2)}</b>
        <span class="mini">{t('周期', 'cycle')}</span>
      </div>
    </div>

    <div class="delays">
      <span class="lbl">{t('各位到达时间', 'bit arrival times')}</span>
      {#each delays as d, i}
        <div class="delay">
          <span class="mono">b{i}</span>
          <span class="bar"><i style={`width:${Math.min(100, (d / 0.37) * 100)}%`}></i></span>
          <span class="mono val">{d.toFixed(2)}</span>
        </div>
      {/each}
    </div>

    <span class="scroll-hint">{t('波形可横向滑动查看全部位', 'scroll sideways to see every bit')}</span>
    <div class="wave-wrap">
      <svg viewBox="0 0 720 360" role="img" aria-label={t('格雷码与二进制指针的逐位到达和采样', 'per-bit arrival and capture of gray and binary pointers')}>
        <line x1={x0} y1="25" x2={x1} y2="25" class="axis" />
        {#each [0, 0.25, 0.5, 0.75, 1] as tick}
          <line x1={xOf(tick)} y1="20" x2={xOf(tick)} y2="30" class="axis" />
          <text x={xOf(tick)} y="15" class="tick" text-anchor="middle">{tick.toFixed(2)}</text>
        {/each}

        <text x="8" y="58" class="lane-title gray">Gray</text>
        <text x="8" y="72" class="lane-sub">{t('一次一位', 'one bit at a time')}</text>
        {#each laneRows(gray) as row}
          <g>
            <text x="8" y={86 + (3 - row.bit) * 22 + 4} class="bl">{`G${row.bit}`}</text>
            <text x="32" y={86 + (3 - row.bit) * 22 + 4} class="small">{`${bit(row.old)}→${bit(row.next)}`}</text>
            {#if row.changed}
              <rect x={xOf(row.delay) - 4} y={78 + (3 - row.bit) * 22} width="8" height="16" class="aperture" />
            {/if}
            <line x1={x0} y1={86 + (3 - row.bit) * 22} x2={x1} y2={86 + (3 - row.bit) * 22} class="wire" />
            {#if row.changed}
              <line x1={x0} y1={86 + (3 - row.bit) * 22} x2={xOf(row.delay)} y2={86 + (3 - row.bit) * 22} class="edge old" />
              <line x1={xOf(row.delay)} y1={86 + (3 - row.bit) * 22} x2={x1} y2={86 + (3 - row.bit) * 22} class="edge new" />
              <circle cx={xOf(row.delay)} cy={86 + (3 - row.bit) * 22} r="3.2" class="dot" />
            {:else}
              <line x1={x0} y1={86 + (3 - row.bit) * 22} x2={x1} y2={86 + (3 - row.bit) * 22} class="edge same" />
            {/if}
            <rect x="656" y={78 + (3 - row.bit) * 22} width="18" height="16" rx="3" class="capbox" class:capbad={row.meta} />
            <text x="665" y={86 + (3 - row.bit) * 22 + 4} class="capbit" text-anchor="middle">{row.captured}</text>
          </g>
        {/each}

        <text x="8" y="190" class="lane-title binary">Binary</text>
        <text x="8" y="204" class="lane-sub">{t('可能多位', 'may change many')}</text>
        {#each laneRows(bin) as row}
          <g>
            <text x="8" y={218 + (3 - row.bit) * 22 + 4} class="bl">{`B${row.bit}`}</text>
            <text x="32" y={218 + (3 - row.bit) * 22 + 4} class="small">{`${bit(row.old)}→${bit(row.next)}`}</text>
            {#if row.changed}
              <rect x={xOf(row.delay) - 4} y={210 + (3 - row.bit) * 22} width="8" height="16" class="aperture" />
            {/if}
            <line x1={x0} y1={218 + (3 - row.bit) * 22} x2={x1} y2={218 + (3 - row.bit) * 22} class="wire" />
            {#if row.changed}
              <line x1={x0} y1={218 + (3 - row.bit) * 22} x2={xOf(row.delay)} y2={218 + (3 - row.bit) * 22} class="edge old" />
              <line x1={xOf(row.delay)} y1={218 + (3 - row.bit) * 22} x2={x1} y2={218 + (3 - row.bit) * 22} class="edge new binary" />
              <circle cx={xOf(row.delay)} cy={218 + (3 - row.bit) * 22} r="3.2" class="dot binary" />
            {:else}
              <line x1={x0} y1={218 + (3 - row.bit) * 22} x2={x1} y2={218 + (3 - row.bit) * 22} class="edge same" />
            {/if}
            <rect x="656" y={210 + (3 - row.bit) * 22} width="18" height="16" rx="3" class="capbox" class:capbad={row.meta} />
            <text x="665" y={218 + (3 - row.bit) * 22 + 4} class="capbit" text-anchor="middle">{row.captured}</text>
          </g>
        {/each}

        <line x1={xOf(phase)} y1="36" x2={xOf(phase)} y2="304" class="capture" />
        <path d={`M${xOf(phase) - 4} 32 L${xOf(phase)} 24 L${xOf(phase) + 4} 32 Z`} class="capmark" />
        <text x={xOf(phase)} y="324" class="sample" text-anchor="middle">{t('采样沿', 'capture')} {phase.toFixed(2)}</text>
      </svg>
    </div>

    <div class="lanes">
      <div class="lane-card" class:illegal={!gray.legal}>
        <div class="lane-head">
          <span class="name gray">Gray</span>
          <span class="state">{stateLabel(gray)}</span>
        </div>
        <div class="codes mono">0100 → 1100</div>
        <div class="capbits">
          {#each [3, 2, 1, 0] as b}
            <span class="cb" class:meta={gray.metaBits.includes(b)}>{gray.capturedBits[b]}</span>
          {/each}
        </div>
        <div class="decoded">
          {t('采样码', 'captured')} <b class="mono">{binary(gray.capturedCode, 4)}</b>
          → {t('指针', 'pointer')} <b class="mono">{gray.decoded}</b>
        </div>
        <div class="verdict ok">{t('只可能是 7 或 8：合法', 'only 7 or 8: legal')}</div>
      </div>

      <div class="lane-card" class:illegal={!bin.legal}>
        <div class="lane-head">
          <span class="name binary">Binary</span>
          <span class="state">{stateLabel(bin)}</span>
        </div>
        <div class="codes mono">0111 → 1000</div>
        <div class="capbits">
          {#each [3, 2, 1, 0] as b}
            <span class="cb" class:meta={bin.metaBits.includes(b)}>{bin.capturedBits[b]}</span>
          {/each}
        </div>
        <div class="decoded">
          {t('采样码', 'captured')} <b class="mono">{binary(bin.capturedCode, 4)}</b>
          → {t('指针', 'pointer')} <b class="mono">{bin.decoded}</b>
        </div>
        <div class="verdict" class:bad={!bin.legal}>
          {#if bin.legal}
            {t('这一相位恰好落在旧值或新值', 'this phase happens to hit old or new')}
          {:else}
            {t('非法指针：7 和 8 之间不存在的值', 'illegal pointer: a value between 7 and 8')}
          {/if}
        </div>
      </div>
    </div>

    {#if gray.metaBits.length || bin.metaBits.length}
      <p class="meta-note">
        <b>{t('采样窗口：', 'aperture: ')}</b>
        {t(
          `有 ${bin.metaBits.length} 位落在跳变窗口内，同步器会把它解析成 0 或 1；格雷码最多只有 ${gray.metaBits.length} 位处于不确定，所以指针仍只会是旧值或新值。`,
          `${bin.metaBits.length} bit(s) sit inside the transition aperture; the synchroniser resolves each to 0 or 1. Gray has at most ${gray.metaBits.length} uncertain bit, so the pointer is still old or new.`
        )}
      </p>
    {/if}

    <div class="sweep">
      <div class="sweep-head">
        <span class="eyebrow">{t('扫描 101 个采样相位', 'sweep 101 capture phases')}</span>
        <span class="mini">{t('红色 = 采样到非法指针', 'red = illegal pointer')}</span>
      </div>
      <div class="strip-row">
        <span class="mono gray">Gray</span>
        <div class="strip">
          {#each sweep as p}<i class:bad={!p.gray.legal}></i>{/each}
          <b class="cursor" style={`left:${phase * 100}%`}></b>
        </div>
        <span class="mono count">{summary.grayIllegal}/{summary.total}</span>
      </div>
      <div class="strip-row">
        <span class="mono binary">Bin</span>
        <div class="strip">
          {#each sweep as p}<i class:bad={!p.binary.legal}></i>{/each}
          <b class="cursor" style={`left:${phase * 100}%`}></b>
        </div>
        <span class="mono count" class:bad={summary.binaryIllegal > 0}>{summary.binaryIllegal}/{summary.total}</span>
      </div>
      <p class="summary">
        {t(
          `Gray 只出现 [${summary.grayValues.join(', ')}]；Binary 出现了 [${summary.binaryValues.join(', ')}]。偏斜越大，二进制越容易采到中间值。`,
          `Gray only produced [${summary.grayValues.join(', ')}]; binary produced [${summary.binaryValues.join(', ')}]. More skew means more intermediate values.`
        )}
      </p>
    </div>

    <div class="controls">
      <div class="ctl">
        <span class="lbl">{t('位间偏斜', 'bit skew')}</span>
        <input type="range" min="0" max="1" step="0.02" value={spread} oninput={(e) => (spread = Number(e.currentTarget.value))} />
      </div>
      <div class="ctl grow">
        <span class="lbl">{t('采样相位', 'capture phase')}</span>
        <input type="range" min="0" max="1" step="0.005" value={phase} oninput={(e) => setPhase(Number(e.currentTarget.value))} />
      </div>
      <button class="btn small primary" onclick={play}>{playing ? t('暂停', 'pause') : t('播放', 'play')}</button>
      <div class="seg small">
        <button onclick={() => setPhase(0.02)}>{t('变化前', 'before')}</button>
        <button onclick={() => setPhase(0.16)}>{t('变化中', 'during')}</button>
        <button onclick={() => setPhase(0.95)}>{t('变化后', 'after')}</button>
      </div>
    </div>

    <p class="note">
      {t(
        '看三件事：同一根总线的四个位在不同时间到达；采样线扫过跳变窗口时，格雷码的采样值只会从旧码跳到新码；二进制则可能出现从未存在过的指针。两级同步器只能消掉亚稳态，不能把多位的中间组合变成合法值。',
        'Watch three things: the four bits of the same bus arrive at different times; as the capture line sweeps the transition window, the Gray value only steps from old to new; binary can produce a pointer that never existed. A two-flop synchroniser removes metastability; it cannot turn a multi-bit intermediate combination into a legal value.'
      )}
    </p>
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 11px;
    padding: 14px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .pointer,
  .phase {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
  }

  .pointer b {
    font-size: 15px;
    color: var(--accent-deep);
  }

  .phase b {
    font-size: 13px;
    color: var(--gold);
  }

  .mini {
    font-size: 9px;
    line-height: 1.5;
    color: var(--muted);
  }

  .delays {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
  }

  .lbl {
    font-size: 9px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .delay {
    display: grid;
    grid-template-columns: 16px 46px 24px;
    align-items: center;
    gap: 3px;
    font-size: 8px;
    color: var(--muted);
  }

  .bar {
    display: block;
    height: 4px;
    background: var(--paper-3);
    border-radius: 2px;
    overflow: hidden;
  }

  .bar i {
    display: block;
    height: 100%;
    background: var(--accent);
  }

  .scroll-hint {
    display: none;
    font-size: 8.5px;
    color: var(--muted);
  }

  .wave-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .wave-wrap svg {
    display: block;
    width: 100%;
    min-width: 560px;
    height: auto;
  }

  .axis {
    stroke: var(--line);
    stroke-width: 1;
  }

  .tick {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.5px;
    fill: var(--muted);
  }

  .lane-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 13px;
    font-style: italic;
  }

  .lane-title.gray,
  .name.gray,
  .mono.gray {
    fill: var(--accent);
    color: var(--accent);
  }

  .lane-title.binary,
  .name.binary,
  .mono.binary {
    fill: var(--ember);
    color: var(--ember);
  }

  .lane-sub {
    font-family: 'Inter', sans-serif;
    font-size: 7px;
    fill: var(--muted);
  }

  .bl {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    fill: var(--ink-3);
  }

  .small {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7px;
    fill: var(--muted);
  }

  .wire {
    stroke: var(--line);
    stroke-width: 0.8;
  }

  .edge.old {
    stroke: #d9cfba;
    stroke-width: 2.4;
  }

  .edge.new {
    stroke: var(--accent);
    stroke-width: 2.4;
  }

  .edge.new.binary {
    stroke: var(--ember);
  }

  .edge.same {
    stroke: var(--line);
    stroke-width: 1.2;
  }

  .dot {
    fill: var(--accent);
  }

  .dot.binary {
    fill: var(--ember);
  }

  .aperture {
    fill: rgba(185, 138, 99, 0.16);
    stroke: none;
  }

  .capbox {
    fill: var(--card);
    stroke: var(--line);
  }

  .capbox.capbad {
    fill: var(--ember-soft);
    stroke: var(--ember);
  }

  .capbit {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    fill: var(--ink-2);
  }

  .capture {
    stroke: var(--gold);
    stroke-width: 1;
    stroke-dasharray: 3 2;
  }

  .capmark {
    fill: var(--gold);
  }

  .sample {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.5px;
    fill: var(--gold);
  }

  .lanes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }

  .lane-card {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 9px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 9px;
  }

  .lane-card.illegal {
    border-color: #eed8ce;
    background: #fff9f6;
  }

  .lane-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .name {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 12px;
    font-style: italic;
  }

  .state {
    font-size: 8.5px;
    letter-spacing: 0.04em;
    color: var(--muted);
  }

  .codes {
    font-size: 9px;
    color: var(--muted);
  }

  .capbits {
    display: flex;
    gap: 3px;
  }

  .cb {
    display: grid;
    place-items: center;
    width: 20px;
    height: 18px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: var(--ink-2);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  .cb.meta {
    color: var(--ember);
    background: var(--ember-soft);
    border-color: #eed8ce;
  }

  .decoded {
    font-size: 9.5px;
    color: var(--muted);
  }

  .decoded b {
    color: var(--ink-2);
  }

  .verdict {
    padding: 4px 6px;
    font-size: 9px;
    line-height: 1.5;
    color: #3f6b4f;
    background: #f1f7f1;
    border-radius: 5px;
  }

  .verdict.bad {
    color: var(--ember);
    background: var(--ember-soft);
  }

  .meta-note {
    padding: 7px 9px;
    font-size: 9px;
    line-height: 1.6;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 7px;
  }

  .meta-note b {
    color: var(--ink-2);
  }

  .sweep {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 9px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 8px;
  }

  .sweep-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .strip-row {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) 44px;
    align-items: center;
    gap: 6px;
  }

  .strip {
    position: relative;
    display: flex;
    gap: 1px;
    height: 9px;
    border-radius: 3px;
    overflow: hidden;
    background: var(--paper-2);
  }

  .strip i {
    flex: 1;
    height: 100%;
    background: var(--accent-soft);
  }

  .strip i.bad {
    background: var(--ember);
    opacity: 0.75;
  }

  .strip .cursor {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 1px;
    background: var(--gold);
  }

  .count {
    font-size: 9px;
    color: var(--muted);
    text-align: right;
  }

  .count.bad {
    color: var(--ember);
  }

  .summary {
    font-size: 9px;
    line-height: 1.6;
    color: var(--muted);
  }

  .controls {
    display: flex;
    align-items: end;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ctl {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 110px;
  }

  .ctl.grow {
    flex: 1;
    min-width: 150px;
  }

  .ctl input {
    width: 100%;
    accent-color: var(--accent);
  }

  .seg.small button {
    padding: 3px 7px;
    font-size: 9.5px;
  }

  .note {
    font-size: 9.5px;
    line-height: 1.65;
    color: var(--muted);
  }

  @media (max-width: 700px) {
    .scroll-hint {
      display: block;
    }

    .lanes {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
