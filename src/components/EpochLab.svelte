<script lang="ts">
  import { t } from '../lib/lang.svelte';

  type Access = { kind: 'R' | 'W'; v: number };
  type Epoch = { cells: (Access | null)[] };
  type Scenario = { id: string; zh: string; en: string; zhHint: string; enHint: string; epochs: Epoch[] };

  const CORES = ['C1', 'C2', 'C3'];
  const INIT = 5;

  const SCENARIOS: Scenario[] = [
    {
      id: 'legal',
      zh: '合法',
      en: 'Legal',
      zhHint: '每段只有一个写者，读者看到的值都是最近一次写的结果。两个不变量同时成立。',
      enHint: 'Every epoch has a single writer, and readers see the most recent write. Both invariants hold.',
      epochs: [
        { cells: [{ kind: 'R', v: 5 }, { kind: 'R', v: 5 }, null] },
        { cells: [{ kind: 'W', v: 7 }, null, null] },
        { cells: [{ kind: 'R', v: 7 }, { kind: 'R', v: 7 }, null] }
      ]
    },
    {
      id: 'writers',
      zh: '两个写者',
      en: 'Two writers',
      zhHint: '两个核在同一段里各写一次，且都写了 7。所有副本的值仍然相同，data-value 抓不到它——这正是需要 SWMR 的原因。',
      enHint: 'Two cores each write once in the same epoch, and both write 7. Every copy still agrees, so data-value cannot catch it — which is exactly why SWMR is needed.',
      epochs: [
        { cells: [{ kind: 'R', v: 5 }, { kind: 'R', v: 5 }, null] },
        { cells: [{ kind: 'W', v: 7 }, { kind: 'W', v: 7 }, null] },
        { cells: [{ kind: 'R', v: 7 }, { kind: 'R', v: 7 }, null] }
      ]
    },
    {
      id: 'stale',
      zh: '读到旧值',
      en: 'Stale read',
      zhHint: '每段都只有一个写者，SWMR 成立；但 C2 在第三段仍读到旧值，副本之间不再相同。',
      enHint: 'Every epoch has one writer, so SWMR holds; but C2 still reads a stale value in the third epoch, and the copies no longer agree.',
      epochs: [
        { cells: [{ kind: 'R', v: 5 }, { kind: 'R', v: 5 }, null] },
        { cells: [{ kind: 'W', v: 7 }, null, null] },
        { cells: [{ kind: 'R', v: 7 }, { kind: 'R', v: 5 }, null] }
      ]
    }
  ];

  let picked = $state('legal');
  const scenario = $derived(SCENARIOS.find((s) => s.id === picked)!);

  type Check = { swmr: string[]; data: string[]; swmrBad: number[]; dataBad: number[] };

  function check(s: Scenario): Check {
    const swmr: string[] = [];
    const data: string[] = [];
    const swmrBad: number[] = [];
    const dataBad: number[] = [];
    let last = INIT;

    s.epochs.forEach((ep, i) => {
      const tag = `E${i + 1}`;
      const writers = ep.cells
        .map((c, ci) => ({ c, ci }))
        .filter((x) => x.c?.kind === 'W') as { c: Access; ci: number }[];

      if (writers.length > 1) {
        const names = writers.map((w) => CORES[w.ci]).join(t('、', ', '));
        swmr.push(t(`${tag} 里 ${names} 同时写`, `${tag} has ${names} writing at once`));
        swmrBad.push(i);
      }

      if (writers.length) last = writers[0].c.v;

      ep.cells.forEach((c, ci) => {
        if (c?.kind === 'R' && c.v !== last) {
          data.push(
            t(
              `${tag} ${CORES[ci]} 读到 ${c.v}，此时正确的值应是 ${last}`,
              `${tag} ${CORES[ci]} reads ${c.v}, but the correct value here is ${last}`
            )
          );
          dataBad.push(i);
        }
      });
    });

    return { swmr, data, swmrBad, dataBad };
  }

  const result = $derived(check(scenario));
  const clean = $derived(result.swmr.length === 0 && result.data.length === 0);
</script>

<div class="epoch-lab">
  <div class="lab-top">
    <div class="seg">
      {#each SCENARIOS as s}
        <button class:active={picked === s.id} onclick={() => (picked = s.id)}>{t(s.zh, s.en)}</button>
      {/each}
    </div>
    <span class="lab-hint">{t(
      `内存初值 A = ${INIT}；每个 E 是一段“看起来不可分割”的时间。`,
      `Initial A = ${INIT}; each E is a slice of time that looks indivisible.`
    )}</span>
  </div>

  <div class="strip">
    {#each scenario.epochs as ep, i}
      <div class="epoch" class:swmr-bad={result.swmrBad.includes(i)} class:data-bad={result.dataBad.includes(i)}>
        <div class="epoch-head">
          <span class="epoch-tag mono">E{i + 1}</span>
          {#if result.swmrBad.includes(i)}<span class="epoch-flag">SWMR</span>{/if}
          {#if result.dataBad.includes(i)}<span class="epoch-flag stale">value</span>{/if}
        </div>
        <div class="cells">
          {#each ep.cells as c, ci}
            <div class="cell" class:w={c?.kind === 'W'} class:r={c?.kind === 'R'} class:idle={!c}>
              <span class="cell-core">{CORES[ci]}</span>
              {#if c}
                <span class="cell-op mono">{c.kind}</span>
                <span class="cell-val mono">{c.v}</span>
              {:else}
                <span class="cell-op mono">·</span>
                <span class="cell-val mono">—</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <div class="checks">
    <div class="check" class:bad={result.swmr.length > 0}>
      <span class="dot"></span>
      <div>
        <strong>SWMR</strong>
        <span>{t('每一段最多一个写者，且写者独占', 'at most one writer per epoch, and it is exclusive')}</span>
        {#if result.swmr.length}
          <ul>
            {#each result.swmr as line}<li>{line}</li>{/each}
          </ul>
        {:else}
          <em>{t('成立', 'holds')}</em>
        {/if}
      </div>
    </div>
    <div class="check" class:bad={result.data.length > 0}>
      <span class="dot"></span>
      <div>
        <strong>data-value</strong>
        <span>{t('同一段内所有副本同值，且等于最近一次写', 'all copies in an epoch agree with the most recent write')}</span>
        {#if result.data.length}
          <ul>
            {#each result.data as line}<li>{line}</li>{/each}
          </ul>
        {:else}
          <em>{t('成立', 'holds')}</em>
        {/if}
      </div>
    </div>
  </div>

  <p class="verdict" class:bad={!clean}>
    {#if clean}
      {t(
        '两个不变量都成立。coherence 的定义就是：存在这样一段段的时间划分，使 SWMR 与 data-value 同时为真。',
        'Both invariants hold. Coherence means: there exists such a partition of time in which SWMR and data-value are true simultaneously.'
      )}
    {:else}
      {t(scenario.zhHint, scenario.enHint)}
    {/if}
  </p>
</div>

<style>
  .epoch-lab {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .lab-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
  }

  .lab-hint {
    font-size: 11px;
    color: var(--muted);
  }

  .strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .epoch {
    padding: 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
    transition: border-color 0.25s var(--ease), background 0.25s var(--ease);
  }

  .epoch.swmr-bad {
    border-color: #e6c3b4;
    background: #fdf6f1;
  }

  .epoch.data-bad {
    border-color: #e6d3ae;
    background: #fdf8ee;
  }

  .epoch-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }

  .epoch-tag {
    font-size: 10px;
    letter-spacing: 0.08em;
    color: var(--gold);
  }

  .epoch-flag {
    padding: 0 5px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    line-height: 1.5;
    color: var(--ember);
    background: var(--ember-soft);
    border-radius: 4px;
  }

  .epoch-flag.stale {
    color: var(--st-o);
    background: #f6eedf;
  }

  .cells {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .cell {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid transparent;
    transition: background 0.25s var(--ease), border-color 0.25s var(--ease);
  }

  .cell.idle {
    opacity: 0.45;
  }

  .cell.r {
    background: var(--card);
    border-color: var(--line);
  }

  .cell.w {
    background: var(--ember-soft);
    border-color: #eed8ce;
  }

  .cell-core {
    font-size: 10.5px;
    color: var(--ink-3);
  }

  .cell-op {
    font-size: 10px;
    font-weight: 500;
    color: var(--muted);
  }

  .cell.r .cell-op {
    color: var(--accent);
  }

  .cell.w .cell-op {
    color: var(--ember);
  }

  .cell-val {
    min-width: 12px;
    font-size: 11px;
    text-align: right;
    color: var(--ink-2);
  }

  .checks {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .check {
    display: flex;
    gap: 9px;
    padding: 10px 12px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .check .dot {
    flex: none;
    width: 7px;
    height: 7px;
    margin-top: 5px;
    border-radius: 50%;
    background: var(--st-e);
  }

  .check.bad .dot {
    background: var(--ember);
  }

  .check strong {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-2);
  }

  .check span {
    display: block;
    margin-top: 1px;
    font-size: 10.5px;
    line-height: 1.5;
    color: var(--muted);
  }

  .check em {
    display: inline-block;
    margin-top: 5px;
    font-size: 10.5px;
    font-style: normal;
    color: var(--st-e);
  }

  .check ul {
    margin: 5px 0 0;
    padding-left: 14px;
    font-size: 10.5px;
    line-height: 1.5;
    color: var(--ember);
  }

  .check li::marker {
    color: var(--ember);
  }

  .verdict {
    padding: 9px 12px;
    font-size: 12px;
    line-height: 1.65;
    color: var(--ink-3);
    background: var(--accent-soft);
    border: 1px solid #d5e2dd;
    border-radius: 9px;
  }

  .verdict.bad {
    color: var(--ink-2);
    background: #fbf4ec;
    border-color: #ead9c7;
  }

  @media (max-width: 700px) {
    .strip,
    .checks {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
