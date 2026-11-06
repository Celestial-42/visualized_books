<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    binary,
    captureLane,
    defaultDelays,
    type LaneCapture
  } from '../../lib/logic/async';
  import { t } from '../../lib/lang.svelte';

  const FAST = 24;
  const WIDTH = 4;
  const MOD = 16;
  const APERTURE = 0.012;

  let period = $state(4);
  let phase = $state(0.3);
  let spread = $state(0.9);
  let selected = $state(1);
  let playing = $state(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  const delays = $derived(defaultDelays(spread));

  type Capture = {
    index: number;
    tick: number;
    source: number;
    prev: number;
    skipped: number[];
    gray: LaneCapture;
    bin: LaneCapture;
  };

  const captures = $derived.by<Capture[]>(() => {
    const out: Capture[] = [];
    for (let index = 0; index * period < FAST; index += 1) {
      const tick = index * period;
      const source = tick % MOD;
      const prev = (source - 1 + MOD) % MOD;
      const input = { width: WIDTH, oldValue: prev, newValue: source, delays, phase, aperture: APERTURE };
      const skipped: number[] = [];
      if (index > 0) {
        for (let step = 1; step < period; step += 1) skipped.push((prev - (period - 1) + step + MOD) % MOD);
      }
      out.push({
        index,
        tick,
        source,
        prev,
        skipped,
        gray: captureLane('gray', input),
        bin: captureLane('binary', input)
      });
    }
    return out;
  });

  const current = $derived(captures[Math.min(selected, captures.length - 1)]);
  const invalidGray = $derived(captures.filter((c) => !c.gray.legal).length);
  const invalidBin = $derived(captures.filter((c) => !c.bin.legal).length);
  const maxSkipped = $derived(Math.max(0, ...captures.map((c) => c.skipped.length)));

  const strip = $derived(
    Array.from({ length: FAST }, (_, tick) => ({
      tick,
      value: tick % MOD,
      capture: tick % period === 0,
      selected: current && tick === current.tick
    }))
  );

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
    if (selected >= captures.length - 1) selected = 0;
    playing = true;
    timer = setInterval(() => {
      if (selected >= captures.length - 1) {
        stop();
        return;
      }
      selected += 1;
    }, 520);
  };

  const setPeriod = (value: number) => {
    stop();
    period = value;
    selected = 1;
  };

  const setPhase = (value: number) => {
    stop();
    phase = value;
  };

  const step = (delta: number) => {
    stop();
    selected = Math.max(0, Math.min(captures.length - 1, selected + delta));
  };

  onDestroy(stop);

  const bits = (v: number, width = WIDTH) => binary(v, width);
  const which = (lane: LaneCapture) =>
    lane.decoded === lane.newValue && lane.decoded !== lane.oldValue
      ? t('新', 'new')
      : lane.decoded === lane.oldValue
        ? t('旧', 'old')
        : t('非法', 'illegal');
</script>

<div class="lab">
  <div class="panel">
    <div class="top">
      <div class="title">
        <span class="eyebrow">{t('慢时钟采样快时钟', 'slow clock samples a fast bus')}</span>
        <b>{t('一个慢周期里，源端变了很多次', 'many source steps inside one slow period')}</b>
      </div>
      <div class="stats">
        <span>{t('采样次数', 'captures')} <b class="mono">{captures.length}</b></span>
        <span>{t('Gray 非法', 'Gray illegal')} <b class="mono ok">{invalidGray}</b></span>
        <span>{t('Binary 非法', 'binary illegal')} <b class="mono" class:bad={invalidBin > 0}>{invalidBin}</b></span>
        <span>{t('最多跳过', 'max skipped')} <b class="mono">{maxSkipped}</b></span>
      </div>
    </div>

    <div class="controls">
      <div class="seg small">
        {#each [2, 3, 4, 6] as p}
          <button class:active={period === p} onclick={() => setPeriod(p)}>{t(`${p} 拍/采样`, `${p} ticks/sample`)}</button>
        {/each}
      </div>
      <div class="ctl">
        <span class="lbl">{t('采样沿偏移', 'capture offset')}</span>
        <input type="range" min="0" max="0.36" step="0.01" value={phase} oninput={(e) => setPhase(Number(e.currentTarget.value))} />
        <span class="mono val">{phase.toFixed(2)}</span>
      </div>
      <div class="ctl">
        <span class="lbl">{t('位间偏斜', 'bit skew')}</span>
        <input type="range" min="0" max="1" step="0.02" value={spread} oninput={(e) => (spread = Number(e.currentTarget.value))} />
      </div>
      <div class="seg small">
        <button class:active={Math.abs(phase - 0.3) < 0.001} onclick={() => setPhase(0.3)}>{t('稳定后采', 'settled')}</button>
        <button class:active={Math.abs(phase - 0.12) < 0.001} onclick={() => setPhase(0.12)}>{t('对齐跳变', 'on transition')}</button>
      </div>
      <button class="btn small" onclick={() => step(-1)}>{t('上一次', 'prev')}</button>
      <button class="btn small primary" onclick={play}>{playing ? t('暂停', 'pause') : t('播放', 'play')}</button>
      <button class="btn small" onclick={() => step(1)}>{t('下一次', 'next')}</button>
    </div>

    <span class="scroll-hint">{t('源码条可横向滑动', 'scroll the source strip sideways')}</span>
    <div class="strip-wrap">
      <div class="source-strip">
        {#each strip as cell}
          <button
            class="sc"
            class:cap={cell.capture}
            class:sel={cell.selected}
            onclick={() => { if (cell.capture) { stop(); selected = Math.floor(cell.tick / period); } }}
          >
            <span class="tick mono">{cell.tick}</span>
            <span class="val mono">{cell.value}</span>
            {#if cell.capture}<span class="mark"></span>{/if}
          </button>
        {/each}
      </div>
    </div>

    <div class="capture-cards">
      <div class="cap-card gray">
        <div class="cc-head">
          <span class="name">Gray</span>
          <span class="mono">{bits(current.gray.oldCode)} → {bits(current.gray.newCode)}</span>
        </div>
        <div class="bits">
          {#each [3, 2, 1, 0] as b}
            <span class="bit mono" class:meta={current.gray.metaBits.includes(b)}>{current.gray.capturedBits[b]}</span>
          {/each}
        </div>
        <div class="cc-line">
          {t('采样码', 'captured')} <b class="mono">{bits(current.gray.capturedCode)}</b>
          → {t('指针', 'pointer')} <b class="mono">{current.gray.decoded}</b>
        </div>
        <div class="cc-verdict ok">
          {t(
            `合法：源端真实出现过的 ${current.gray.oldValue} 或 ${current.gray.newValue}`,
            `legal: one of the source’s real values, ${current.gray.oldValue} or ${current.gray.newValue}`
          )}
        </div>
      </div>

      <div class="cap-card binary" class:illegal={!current.bin.legal}>
        <div class="cc-head">
          <span class="name">Binary</span>
          <span class="mono">{bits(current.bin.oldCode)} → {bits(current.bin.newCode)}</span>
        </div>
        <div class="bits">
          {#each [3, 2, 1, 0] as b}
            <span class="bit mono" class:meta={current.bin.metaBits.includes(b)}>{current.bin.capturedBits[b]}</span>
          {/each}
        </div>
        <div class="cc-line">
          {t('采样码', 'captured')} <b class="mono">{bits(current.bin.capturedCode)}</b>
          → {t('指针', 'pointer')} <b class="mono">{current.bin.decoded}</b>
        </div>
        <div class="cc-verdict" class:bad={!current.bin.legal}>
          {#if current.bin.legal}
            {t('这个相位二进制也稳定', 'binary happens to be stable at this phase')}
          {:else}
            {t('非法：中间组合，源端从未出现', 'illegal: a mid-transition value that never existed')}
          {/if}
        </div>
      </div>
    </div>

    <p class="callout">
      <b>{t('慢采样跨过了：', 'this sample skipped: ')}</b>
      {#if current.skipped.length}
        <span class="mono">[{current.skipped.join(', ')}]</span>
        {t(
          `这次采样对应的源端区间是 ${(current.source - period + MOD) % MOD} → ${current.source}；慢域没有看见中间的码字，但每个采样本身仍是合法指针。`,
          `the source swept ${(current.source - period + MOD) % MOD} → ${current.source} between samples; the slow domain did not see the middle codes, yet each capture is still a legal pointer.`
        )}
      {:else}
        {t('这是第一次采样；从第二次开始会看到跳过的源码。', 'this is the first sample; later samples will show skipped source codes.')}
      {/if}
    </p>

    <p class="callout quiet">
      {t(
        '格雷码的 1 位性质约束的是“源端相邻两次变化”，不是“慢域相邻两次采样”。慢域采到 0、4、8 是完全正常的：它只是看不到中间的 1、2、3；每次采样本身仍然是一个合法码字。',
        'Gray’s one-bit promise is about consecutive source steps, not consecutive destination samples. The slow domain may sample 0, 4, 8: it simply does not see 1, 2, 3. Every capture is still a legal code.'
      )}
    </p>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{t('慢采样', 'capture')}</th>
            <th>{t('快拍', 'fast tick')}</th>
            <th>{t('源指针', 'source')}</th>
            <th>{t('跳过', 'skipped')}</th>
            <th>Gray</th>
            <th>Binary</th>
          </tr>
        </thead>
        <tbody>
          {#each captures as c}
            <tr class:sel={c.index === selected}>
              <td class="num">#{c.index}</td>
              <td class="num">t{c.tick}</td>
              <td class="num">{c.source}</td>
              <td class="mono small">{c.skipped.length ? c.skipped.join(', ') : '—'}</td>
              <td class="mono" class:bad={!c.gray.legal}>{c.gray.decoded} <span class="small">({which(c.gray)})</span></td>
              <td class="mono" class:bad={!c.bin.legal}>{c.bin.decoded} <span class="small">({which(c.bin)})</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <p class="note">
      {t(
        '问题里的“慢时钟一个周期里快时钟变了两三次”，说的是慢域两次采样之间发生了多次源端自增。每一次自增仍然只让格雷码变一位；慢域只是在做稀疏抽样，不要求抽到的两个值相邻。真正要保证的是：任何一次采样沿落在跳变上时，采到的仍是源端真实出现过的码字（旧值或新值），而不是二进制的中间组合。',
        'The “two or three fast edges inside one slow period” is about many source increments between two destination samples. Each increment still changes one Gray bit; the slow domain is simply decimating, and its consecutive samples are not required to be adjacent. What must hold is that a capture on a transition still returns a code the source actually had (old or new), never a binary intermediate.'
      )}
    </p>
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }

  .title {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title b {
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-2);
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 9px;
    color: var(--muted);
  }

  .stats b {
    font-size: 10px;
    font-weight: 500;
    color: var(--ink-2);
  }

  .stats b.ok {
    color: #3f6b4f;
  }

  .stats b.bad {
    color: var(--ember);
  }

  .controls {
    display: flex;
    align-items: end;
    gap: 7px;
    flex-wrap: wrap;
  }

  .seg.small button {
    padding: 3px 7px;
    font-size: 9.5px;
  }

  .ctl {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 160px;
  }

  .ctl .lbl {
    flex: none;
    font-size: 9px;
    color: var(--muted);
  }

  .ctl input {
    flex: 1;
    min-width: 70px;
    accent-color: var(--accent);
  }

  .val {
    font-size: 9px;
    color: var(--accent-deep);
  }

  .scroll-hint {
    display: none;
    font-size: 8.5px;
    color: var(--muted);
  }

  .strip-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 2px;
  }

  .source-strip {
    display: grid;
    grid-template-columns: repeat(24, minmax(25px, 1fr));
    gap: 3px;
    min-width: 660px;
  }

  .sc {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    min-height: 43px;
    padding: 3px 1px 5px;
    background: var(--paper-2);
    border: 1px solid var(--line-2);
    border-radius: 5px;
    color: var(--muted);
  }

  .sc .tick {
    font-size: 7px;
    opacity: 0.7;
  }

  .sc .val {
    font-size: 9px;
    color: var(--ink-2);
  }

  .sc.cap {
    border-color: #cfded9;
    background: var(--accent-soft);
  }

  .sc.cap .val {
    color: var(--accent-deep);
    font-weight: 600;
  }

  .sc.sel {
    box-shadow: 0 0 0 1.5px var(--gold);
  }

  .sc .mark {
    position: absolute;
    bottom: 2px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--gold);
  }

  .capture-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }

  .cap-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 9px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 8px;
  }

  .cap-card.illegal {
    border-color: #eed8ce;
    background: #fff9f6;
  }

  .cc-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 5px;
  }

  .name {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 12px;
    font-style: italic;
  }

  .cap-card.gray .name {
    color: var(--accent);
  }

  .cap-card.binary .name {
    color: var(--ember);
  }

  .cc-head .mono {
    font-size: 8px;
    color: var(--muted);
  }

  .bits {
    display: flex;
    gap: 3px;
  }

  .bit {
    display: grid;
    place-items: center;
    width: 19px;
    height: 17px;
    font-size: 8.5px;
    color: var(--ink-2);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  .bit.meta {
    color: var(--ember);
    background: var(--ember-soft);
    border-color: #eed8ce;
  }

  .cc-line {
    font-size: 9px;
    color: var(--muted);
  }

  .cc-line b {
    color: var(--ink-2);
  }

  .cc-verdict {
    padding: 3px 5px;
    font-size: 8.5px;
    line-height: 1.45;
    color: #3f6b4f;
    background: #f1f7f1;
    border-radius: 4px;
  }

  .cc-verdict.bad {
    color: var(--ember);
    background: var(--ember-soft);
  }

  .callout {
    padding: 7px 9px;
    font-size: 9px;
    line-height: 1.6;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 7px;
  }

  .callout.quiet {
    color: var(--muted);
  }

  .callout b {
    color: var(--ink-2);
  }

  .table-wrap {
    overflow-x: auto;
  }

  .table-wrap .table {
    min-width: 420px;
  }

  .table-wrap .table .small {
    font-size: 8.5px;
  }

  .table-wrap tr.sel td {
    background: var(--accent-soft);
  }

  .table-wrap td.bad {
    color: var(--ember);
    font-weight: 600;
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

    .capture-cards {
      grid-template-columns: minmax(0, 1fr);
    }

    .ctl {
      min-width: 100%;
    }

    .table-wrap .table {
      min-width: 0;
      font-size: 9px;
    }

    .table-wrap .table th,
    .table-wrap .table td {
      padding: 5px 3px;
    }

    .table-wrap .table .small {
      font-size: 8px;
    }
  }
</style>
