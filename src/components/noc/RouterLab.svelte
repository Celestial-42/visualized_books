<script lang="ts">
  import { allocate, arbiterTrace, maxMatching, pipeline, zeroLoadLatency } from '../../lib/noc/router';
  import { lang, t } from '../../lib/lang.svelte';

  const N = 4;

  let req = $state<boolean[][]>([
    [true, true, false, false],
    [true, false, false, false],
    [false, false, true, false],
    [false, false, false, true]
  ]);
  let speculate = $state(false);
  let lookahead = $state(false);
  let vcs = $state(2);

  const matching = $derived(allocate(req, 'input'));
  const best = $derived(maxMatching(req));
  const requests = $derived(
    Array.from({ length: 6 }, (_, tick) => Array.from({ length: N }, (_, i) => (i + tick) % N !== 3))
  );
  const rr = $derived(arbiterTrace('rr', requests));
  const matrixTrace = $derived(arbiterTrace('matrix', requests));

  const pipe = $derived(pipeline({ vcs, speculate, lookahead }));
  const latency = $derived(zeroLoadLatency(4, pipe.perHop, 4));

  const toggle = (i: number, j: number) => {
    req = req.map((row, ri) => row.map((v, ci) => (ri === i && ci === j ? !v : v)));
  };
</script>

<div class="lab">
  <div class="grid-area">
    <div class="matrix-head">
      <span class="eyebrow">{t('请求矩阵 · 输入想要哪个输出', 'Request matrix · which input wants which output')}</span>
      <span class="hint">{t('点格子切换', 'click a cell to toggle')}</span>
    </div>

    <div class="matrix">
      <span></span>
      {#each Array(N) as _, j}
        <span class="col-head mono">O{j}</span>
      {/each}
      {#each req as row, i}
        <span class="row-head mono">I{i}</span>
        {#each row as on, j}
          {@const matched = matching.pairs.some(([a, b]) => a === i && b === j)}
          <button class="cell" class:on class:hit={matched} onclick={() => toggle(i, j)}>
            {#if matched}✓{/if}
          </button>
        {/each}
      {/each}
    </div>

    <p class="result">
      {t(
        `两轮贪心匹配 ${matching.pairs.length} 对，而这张矩阵的最优匹配是 ${best} 对` +
          `（未匹配输入 ${matching.unmatchedIn.length}，未匹配输出 ${matching.unmatchedOut.length}）`,
        `Two greedy rounds match ${matching.pairs.length}, while this matrix admits ${best}` +
          ` (${matching.unmatchedIn.length} unmatched inputs, ${matching.unmatchedOut.length} unmatched outputs)`
      )}
    </p>
    <p class="match-list mono">
      {matching.pairs.map(([a, b]) => `I${a}→O${b}`).join('  ') || '—'}
    </p>
  </div>

  <div class="two">
    <div class="panel">
      <span class="eyebrow">{t('仲裁：同样的请求，两种公平', 'Arbitration: same requests, two kinds of fairness')}</span>
      <div class="arb">
        <div class="arb-col">
          <span class="arb-title">round-robin</span>
          {#each rr as r}
            <div class="tick">
              <span class="t mono">t{r.tick}</span>
              <span class="w mono">{r.winner >= 0 ? `I${r.winner}` : '—'}</span>
            </div>
          {/each}
        </div>
        <div class="arb-col">
          <span class="arb-title">matrix</span>
          {#each matrixTrace as r}
            <div class="tick">
              <span class="t mono">t{r.tick}</span>
              <span class="w mono">{r.winner >= 0 ? `I${r.winner}` : '—'}</span>
            </div>
          {/each}
        </div>
      </div>
      <p class="mini-note">
        {t(
          '轮询靠指针往前走；矩阵仲裁把刚赢的那个排到最后。前者简单，后者能给严格优先级。',
          'Round-robin advances a pointer; a matrix arbiter moves the winner to the back. The first is simple, the second can express strict priority.'
        )}
      </p>
    </div>

    <div class="panel">
      <span class="eyebrow">{t('每跳几拍', 'Cycles per hop')}</span>
      <div class="toggles">
        <button class="chip-btn" class:on={speculate} onclick={() => (speculate = !speculate)}>
          {t('VA/SA 并行', 'speculate VA/SA')}
        </button>
        <button class="chip-btn" class:on={lookahead} onclick={() => (lookahead = !lookahead)}>
          {t('lookahead bypass', 'lookahead bypass')}
        </button>
        <div class="seg small">
          {#each [1, 2, 4, 8] as v}
            <button class:active={vcs === v} onclick={() => (vcs = v)}>{v} VC</button>
          {/each}
        </div>
      </div>
      <table class="table pipe">
        <tbody>
          {#each pipe.stages as st}
            <tr>
              <td>{lang.value === 'en' ? st.labelEn : st.label}</td>
              <td class="num">{st.cycles}</td>
            </tr>
          {/each}
          <tr class="total">
            <td>{t('每跳合计', 'Per hop')}</td>
            <td class="num">{pipe.perHop}</td>
          </tr>
        </tbody>
      </table>
      <p class="mini-note">
        {t(
          `${vcs} 条 VC 时，4 跳、4 flit 的包零负载延迟 ${latency} 拍。`,
          `With ${vcs} VCs, a 4-hop 4-flit packet has a zero-load latency of ${latency} cycles.`
        )}
      </p>
    </div>
  </div>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .grid-area {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .matrix-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .hint {
    font-size: 10px;
    color: var(--muted);
  }

  .matrix {
    display: grid;
    grid-template-columns: 24px repeat(4, 34px);
    gap: 5px;
    align-items: center;
  }

  .col-head,
  .row-head {
    font-size: 9.5px;
    color: var(--muted);
    text-align: center;
  }

  .cell {
    width: 34px;
    height: 26px;
    font-size: 11px;
    color: #fdfaf3;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 6px;
    transition: background 0.15s var(--ease), border-color 0.15s var(--ease);
  }

  .cell.on {
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .cell.hit {
    color: var(--accent-deep);
    background: #d5e6df;
    border-color: var(--accent);
    font-weight: 600;
  }

  .result {
    font-size: 12px;
    color: var(--ink-2);
  }

  .match-list {
    font-size: 11px;
    color: var(--accent-deep);
  }

  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 13px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .arb {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .arb-col {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .arb-title {
    font-size: 9px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .tick {
    display: flex;
    justify-content: space-between;
    padding: 2px 6px;
    font-size: 10.5px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 5px;
  }

  .tick .t {
    color: var(--muted);
  }

  .tick .w {
    color: var(--accent-deep);
  }

  .toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .chip-btn {
    padding: 4px 9px;
    font-size: 10.5px;
    color: var(--muted);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 7px;
  }

  .chip-btn.on {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .seg.small button {
    padding: 3px 7px;
    font-size: 10px;
  }

  .pipe tr.total td {
    font-weight: 600;
    color: var(--ink);
    border-top: 1px solid var(--line);
  }

  .mini-note {
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--muted);
  }

  @media (max-width: 780px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
