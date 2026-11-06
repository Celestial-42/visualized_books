<script lang="ts">
  import { t } from '../../lib/lang.svelte';

  type Sample = { t: number; sVal: number; sInt: number; notS: number; y: number };

  let a = $state(1);
  let b = $state(1);
  let s = $state(0);
  let oldS = $state(1);
  let newS = $state(0);
  let inv = $state(0.25);
  let samples = $state<Sample[]>([]);

  const T_START = -0.2;
  const T_END = 1.2;
  const T_SEL = 0.12;

  const simulate = () => {
    const next: Sample[] = [];
    for (let t = T_START; t <= T_END + 0.0001; t += 0.01) {
      const sVal = t < 0 ? oldS : newS;
      const sInt = t >= T_SEL ? newS : oldS;
      const notS = t >= T_SEL + inv ? (1 - newS) : (1 - oldS);
      const y = (sInt && b ? 1 : 0) | (notS && a ? 1 : 0);
      next.push({ t: Number(t.toFixed(2)), sVal, sInt, notS, y });
    }
    samples = next;
  };

  const init = () => {
    oldS = 1;
    newS = 0;
    s = 0;
    simulate();
  };

  init();

  const toggleA = () => { a = 1 - a; simulate(); };
  const toggleB = () => { b = 1 - b; simulate(); };
  const flipS = () => {
    oldS = s;
    newS = 1 - s;
    s = newS;
    simulate();
  };

  const oldY = $derived(oldS ? b : a);
  const newY = $derived(newS ? b : a);
  const glitch = $derived(samples.some((p) => p.y !== oldY && p.y !== newY));
  const glitchPoints = $derived(samples.filter((p) => p.y !== oldY && p.y !== newY));
  const glitchWidth = $derived(glitchPoints.length * 0.01);

  const W = 680;
  const H = 190;
  const L = 58;
  const R = 16;
  const T = 18;
  const B = 26;
  const x = (t: number) => L + ((t - T_START) / (T_END - T_START)) * (W - L - R);
  const yRow = (row: number) => T + row * 34;

  const points = (pick: (p: Sample) => number, row: number) =>
    samples.map((p) => `${x(p.t).toFixed(1)},${(yRow(row) + 16 - pick(p) * 16).toFixed(1)}`).join(' ');

  const rows = $derived([
    { label: 'S', points: points((p) => p.sVal, 0), cls: 'sig' },
    { label: 'S_int', points: points((p) => p.sInt, 1), cls: 'sig acc' },
    { label: '~S_int', points: points((p) => p.notS, 2), cls: 'sig acc' },
    { label: 'Y', points: points((p) => p.y, 3), cls: glitch ? 'sig bad' : 'sig ember' }
  ]);
</script>

<div class="lab">
  <div class="panel">
    <div class="top">
      <div>
        <span class="eyebrow">{t('2:1 选择器', '2:1 multiplexer')}</span>
        <b class="eq mono">Y = S ? B : A</b>
      </div>
      <div class="inputs">
        <button class="bit-btn" class:on={a === 1} onclick={toggleA}>A = {a}</button>
        <button class="bit-btn" class:on={b === 1} onclick={toggleB}>B = {b}</button>
        <button class="bit-btn" class:on={s === 1} onclick={flipS}>{t('翻转 S（跑一次）', 'flip S (run)')}</button>
      </div>
    </div>

    <span class="scroll-hint">{t('波形可横向滑动', 'scroll the waveform sideways')}</span>
    <div class="wave-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('组合逻辑毛刺波形', 'combinational glitch waveform')}>
        {#each rows as row, i}
          <text x="8" y={yRow(i) + 20} class="rl mono">{row.label}</text>
          {#if i === 0}
            <line x1={x(0)} y1={T} x2={x(0)} y2={yRow(4) + 2} class="mark" />
          {/if}
          <line x1={L} y1={yRow(i) + 16} x2={W - R} y2={yRow(i) + 16} class="baseline" />
          <polyline points={row.points} class={row.cls} />
        {/each}

        {#if glitch}
          <rect x={x(glitchPoints[0].t)} y={yRow(3) + 4} width={Math.max(2, x(glitchPoints[glitchPoints.length - 1].t) - x(glitchPoints[0].t))} height="24" class="glitch-band" />
        {/if}

        <text x={x(0)} y={H - 8} class="axis-label" text-anchor="middle">0</text>
        <text x={x(0.5)} y={H - 8} class="axis-label" text-anchor="middle">0.5 ns</text>
        <text x={x(1.0)} y={H - 8} class="axis-label" text-anchor="middle">1.0 ns</text>
        <text x={x(T_SEL)} y={T + 4} class="axis-label" text-anchor="middle">{t('S_int 到达', 'S_int arrives')}</text>
      </svg>
    </div>

    <div class="bottom">
      <div class="truth">
        <span class="lbl">{t('静态真值表', 'static truth table')}</span>
        <table class="table">
          <thead>
            <tr><th>S</th><th>A</th><th>B</th><th>Y</th></tr>
          </thead>
          <tbody>
            {#each [{ s: 0, a: 0, b: 0 }, { s: 0, a: 0, b: 1 }, { s: 0, a: 1, b: 0 }, { s: 0, a: 1, b: 1 }, { s: 1, a: 0, b: 0 }, { s: 1, a: 0, b: 1 }, { s: 1, a: 1, b: 0 }, { s: 1, a: 1, b: 1 }] as row}
              {@const y = row.s ? row.b : row.a}
              <tr class:cur={row.s === s && row.a === a && row.b === b}>
                <td class="num">{row.s}</td>
                <td class="num">{row.a}</td>
                <td class="num">{row.b}</td>
                <td class="num">{y}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="verdict">
        <span class="lbl">{t('这一次 S 翻转', 'this S transition')}</span>
        <p class="mono">{oldS} → {newS}，{t('期望 Y', 'expected Y')} {oldY} → {newY}</p>
        {#if glitch}
          <p class="bad">
            {t(
              `出现毛刺：Y 有 ${glitchWidth.toFixed(2)} ns 停在一个不等于期望值 ${oldY} 的电平。`,
              `glitch: Y spends ${glitchWidth.toFixed(2)} ns at a level other than the expected ${oldY}.`
            )}
          </p>
          <p class="mini">
            {t(
              '根因是选择信号和它的反相路径延迟不同：两条数据路径在短时间内都关断。A=B 时最明显；A≠B 时毛刺被真正的输出跳变掩盖。',
              'The select signal and its inverted copy arrive at different times, so both data paths are off briefly. It is clearest when A=B; when A≠B the real output transition hides it.'
            )}
          </p>
        {:else}
          <p class="ok">{t('这一次没有毛刺：Y 只经过旧值和新值。', 'No glitch this time: Y passes only through old and new.')}</p>
          <p class="mini">{t('试着让 A=B，再翻转 S；或者把反相延迟调大。', 'Try A=B, then flip S; or increase the inverter delay.')}</p>
        {/if}
        <div class="ctl">
          <span class="lbl">{t('反相器延迟', 'inverter delay')}</span>
          <input type="range" min="0.02" max="0.45" step="0.01" value={inv} oninput={(e) => { inv = Number(e.currentTarget.value); simulate(); }} />
          <b class="mono">{inv.toFixed(2)} ns</b>
        </div>
        <p class="mini">
          {t(
            '组合逻辑没有状态，但在真实时间里输出是输入的函数加延迟。毛刺不是“逻辑错误”，是不等长路径的物理结果；同步设计在沿上采样前等它稳定，异步逻辑则可能把毛刺当成数据。',
            'Combinational logic has no state, but in real time its output is a delayed function of its inputs. A glitch is not a logic error; it is the physical result of unequal paths. Synchronous logic waits for settling before sampling; asynchronous logic may mistake the glitch for data.'
          )}
        </p>
      </div>
    </div>
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
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .eyebrow {
    display: block;
    margin-bottom: 3px;
  }

  .eq {
    font-size: 12px;
    color: var(--accent-deep);
  }

  .inputs {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .bit-btn {
    padding: 4px 9px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--muted);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 6px;
  }

  .bit-btn.on {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
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

  .rl {
    font-size: 8px;
    fill: var(--muted);
  }

  .baseline {
    stroke: var(--line-2);
    stroke-width: 0.7;
  }

  .sig {
    fill: none;
    stroke: var(--ink-3);
    stroke-width: 1.4;
    stroke-linejoin: round;
  }

  .sig.acc {
    stroke: var(--accent);
  }

  .sig.ember {
    stroke: var(--gold);
  }

  .sig.bad {
    stroke: var(--ember);
    stroke-width: 1.8;
  }

  .mark {
    stroke: var(--gold);
    stroke-width: 1;
    stroke-dasharray: 2 2;
  }

  .glitch-band {
    fill: rgba(180, 84, 58, 0.12);
  }

  .axis-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7px;
    fill: var(--muted);
  }

  .bottom {
    display: grid;
    grid-template-columns: 190px minmax(0, 1fr);
    gap: 14px;
    align-items: start;
  }

  .lbl {
    display: block;
    margin-bottom: 4px;
    font-size: 8.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .truth .table {
    font-size: 9px;
  }

  .truth .table th,
  .truth .table td {
    padding: 3px 5px;
  }

  .truth tr.cur td {
    color: var(--accent-deep);
    background: var(--accent-soft);
    font-weight: 600;
  }

  .verdict p {
    font-size: 10px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .verdict .mono {
    font-size: 9.5px;
    color: var(--accent-deep);
  }

  .verdict .bad {
    color: var(--ember);
  }

  .verdict .ok {
    color: #3f6b4f;
  }

  .mini {
    margin-top: 3px;
    font-size: 9px;
    line-height: 1.55;
    color: var(--muted);
  }

  .ctl {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    font-size: 9px;
    color: var(--muted);
  }

  .ctl input {
    flex: 1;
    accent-color: var(--accent);
  }

  @media (max-width: 700px) {
    .scroll-hint {
      display: block;
    }

    .bottom {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
