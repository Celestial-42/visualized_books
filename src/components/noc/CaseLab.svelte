<script lang="ts">
  import GraphView from './GraphView.svelte';
  import { CASE_ROW, CASES, caseMetrics, computedCases } from '../../lib/noc/cases';
  import { buildTopology } from '../../lib/noc/topology';
  import { lang, t } from '../../lib/lang.svelte';

  let id = $state('eyeriss');
  const chip = $derived(CASES.find((c) => c.id === id) ?? CASES[0]);
  const graph = $derived(chip.kind === 'other' ? null : buildTopology(chip.kind, chip.w, chip.h));
  const m = $derived(caseMetrics(chip));
  const rows = $derived(
    computedCases.map((c) => ({ c, m: CASE_ROW(c) })).sort((a, b) => a.c.year - b.c.year)
  );
  const most = $derived(Math.max(...rows.map((r) => r.m.bisection)));
</script>

<div class="lab">
  <div class="chips-row">
    {#each CASES as c}
      <button class="chip-btn" class:on={id === c.id} onclick={() => (id = c.id)}>
        {c.name}
        <span class="yr mono">{c.year}</span>
      </button>
    {/each}
  </div>

  <div class="two">
    <div class="viz">
      {#if graph}
        <GraphView {graph} height={250} showIds={false} />
      {:else}
        <div class="no-graph">
          <span>{t('这一款不是四类规则拓扑之一，图上没有可比的四个数。', 'Not one of the four regular families — no comparable four numbers on a graph.')}</span>
        </div>
      {/if}
    </div>

    <div class="detail">
      <div class="d-head">
        <span class="d-name">{chip.name}</span>
        <span class="d-org mono">{chip.org} · {chip.year}</span>
      </div>
      <p class="d-what">{lang.value === 'en' ? chip.whatEn : chip.what}</p>
      <div class="d-meta">
        <span class="tag">{t('路由', 'routing')} <b>{chip.routing}</b></span>
        <span class="tag">{t('流控', 'flow')} <b>{chip.flow}</b></span>
      </div>

      {#if m}
        <div class="mini-stats">
          <div><span>{t('节点', 'nodes')}</span><b class="mono">{m.nodes}</b></div>
          <div><span>{t('链路', 'links')}</span><b class="mono">{m.links}</b></div>
          <div><span>{t('直径', 'diameter')}</span><b class="mono">{m.diameter}</b></div>
          <div><span>{t('平均跳数', 'avg hops')}</span><b class="mono">{m.avgHops.toFixed(2)}</b></div>
          <div><span>{t('对剖', 'bisection')}</span><b class="mono">{m.bisection}</b></div>
          <div><span>{t('度数', 'degree')}</span><b class="mono">{m.degreeMax}</b></div>
        </div>
        <p class="mini-note">
          {t(
            `这组数由 ${chip.w}×${chip.h} 的图和 BFS 直接算出，不是引用。`,
            `These numbers come from the ${chip.w}×${chip.h} graph and BFS, not from a slide.`
          )}
        </p>
      {/if}
    </div>
  </div>

  <table class="table cases">
    <thead>
      <tr>
        <th>{t('芯片', 'Chip')}</th>
        <th>{t('年份', 'Year')}</th>
        <th>{t('拓扑', 'Topology')}</th>
        <th>{t('节点', 'Nodes')}</th>
        <th>{t('直径', 'Diameter')}</th>
        <th>{t('平均跳数', 'Avg hops')}</th>
        <th>{t('对剖', 'Bisection')}</th>
        <th class="col-bar"></th>
      </tr>
    </thead>
    <tbody>
      {#each rows as r}
        <tr class:on={r.c.id === id} onclick={() => (id = r.c.id)}>
          <td>{r.c.name}</td>
          <td class="num">{r.c.year}</td>
          <td class="mono">{r.c.kind === 'ring' ? 'ring' : r.c.kind === 'crossbar' ? 'crossbar' : `${r.c.w}×${r.c.h}`}</td>
          <td class="num">{r.m.nodes}</td>
          <td class="num">{r.m.diameter}</td>
          <td class="num">{r.m.avgHops.toFixed(2)}</td>
          <td class="num">{r.m.bisection}</td>
          <td class="col-bar"><span class="mini"><i style={`width:${(r.m.bisection / most) * 100}%`}></i></span></td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 13px;
  }

  .chips-row {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .chip-btn {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
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

  .yr {
    font-size: 8.5px;
    opacity: 0.7;
  }

  .two {
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 12px;
    align-items: start;
  }

  .viz,
  .detail {
    padding: 12px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
    min-width: 0;
  }

  .no-graph {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 24px;
    font-size: 11px;
    line-height: 1.7;
    color: var(--muted);
    text-align: center;
    border: 1px dashed var(--line);
    border-radius: 10px;
  }

  .detail {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .d-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }

  .d-name {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 15px;
    color: var(--ink);
  }

  .d-org {
    font-size: 9px;
    color: var(--muted);
  }

  .d-what {
    font-size: 11.5px;
    line-height: 1.7;
    color: var(--ink-3);
  }

  .d-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag {
    padding: 2px 7px;
    font-size: 9.5px;
    color: var(--muted);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 999px;
  }

  .tag b {
    color: var(--ink-2);
    font-weight: 500;
  }

  .mini-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .mini-stats div {
    display: flex;
    flex-direction: column;
    padding: 6px 8px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 8px;
  }

  .mini-stats span {
    font-size: 8.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .mini-stats b {
    font-size: 14px;
    font-weight: 500;
    color: var(--ink);
  }

  .mini-note {
    font-size: 10px;
    line-height: 1.6;
    color: var(--muted);
  }

  .cases {
    margin-top: 2px;
  }

  .cases tr {
    cursor: pointer;
  }

  .cases tr.on td {
    background: var(--accent-soft);
    color: var(--accent-deep);
  }

  .col-bar {
    width: 70px;
  }

  .mini {
    display: block;
    height: 4px;
    border-radius: 2px;
    background: var(--paper-3);
    overflow: hidden;
  }

  .mini i {
    display: block;
    height: 100%;
    background: var(--accent);
  }

  @media (max-width: 780px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
