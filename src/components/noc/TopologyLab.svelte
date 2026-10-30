<script lang="ts">
  import GraphView from './GraphView.svelte';
  import { buildTopology, metrics, pathBetween, type TopoKind } from '../../lib/noc/topology';
  import { t } from '../../lib/lang.svelte';

  type Kind = TopoKind;
  type Size = '9' | '16';

  const KINDS: Kind[] = ['ring', 'mesh', 'torus', 'crossbar', 'fattree'];
  const LABEL: Record<Kind, string> = {
    ring: 'ring',
    mesh: 'mesh',
    torus: 'torus',
    crossbar: 'crossbar',
    fattree: 'fat-tree'
  };

  let kind = $state<Kind>('mesh');
  let size = $state<Size>('16');
  let picks = $state<number[]>([]);

  const dims = $derived.by(() => {
    if (kind === 'ring' || kind === 'crossbar') return { w: Number(size), h: 1 };
    if (kind === 'fattree') return { w: 4, h: 1 };
    const side = size === '9' ? 3 : 4;
    return { w: side, h: side };
  });

  const graph = $derived(buildTopology(kind, dims.w, dims.h));
  const m = $derived(metrics(graph));

  const path = $derived(picks.length === 2 ? pathBetween(graph, picks[0], picks[1]) : []);

  const comparison = $derived(
    (['ring', 'mesh', 'torus', 'crossbar', 'fattree'] as Kind[]).map((k) => {
      const g = buildTopology(k, k === 'mesh' || k === 'torus' ? 4 : k === 'fattree' ? 4 : 16, k === 'mesh' || k === 'torus' ? 4 : 1);
      return { kind: k, ...metrics(g), label: LABEL[k] };
    })
  );

  const pick = (node: number) => {
    picks = picks.length >= 2 ? [node] : [...picks, node];
  };

  const f = (v: number) => v.toFixed(2);
</script>

<div class="lab">
  <div class="toolbar">
    <div class="seg">
      {#each KINDS as k}
        <button class:active={kind === k} onclick={() => { kind = k; picks = []; }}>
          {LABEL[k]}
        </button>
      {/each}
    </div>
    <div class="seg">
      {#each ['9', '16'] as s}
        <button class:active={size === s} disabled={kind === 'fattree'} onclick={() => { size = s as Size; picks = []; }}>{s} nodes</button>
      {/each}
    </div>
    <span class="spacer"></span>
    <span class="hint">
      {kind === 'fattree'
        ? t('4 元 fat-tree：16 个终端 + 20 个交换节点', '4-ary fat-tree: 16 terminals + 20 switches')
        : t('点两个节点看最短路径', 'Pick two nodes to see a shortest path')}
    </span>
  </div>

  <GraphView {graph} selected={picks[0] ?? -1} dest={picks[1] ?? -1} routes={path.length ? [path] : []} onpick={pick} height={kind === 'fattree' ? 320 : 286} />

  {#if path.length}
    <p class="route-note mono">
      {picks[0]} → {picks[1]} · {path.length - 1} {t('跳', 'hops')} · {path.join(' → ')}
    </p>
  {/if}

  <div class="stats">
    <div class="stat">
      <span class="k">{t('度数', 'Degree')}</span>
      <b class="mono">{m.degreeMin}–{m.degreeMax}</b>
      <span class="sub">{t('通道端口数', 'ports per router')}</span>
    </div>
    <div class="stat">
      <span class="k">{t('直径', 'Diameter')}</span>
      <b class="mono">{m.diameter}</b>
      <span class="sub">{t('最坏跳数', 'worst-case hops')}</span>
    </div>
    <div class="stat">
      <span class="k">{t('平均跳数', 'Avg hops')}</span>
      <b class="mono">{f(m.avgHops)}</b>
      <span class="sub">{t('全部节点对', 'over all pairs')}</span>
    </div>
    <div class="stat">
      <span class="k">{t('对剖', 'Bisection')}</span>
      <b class="mono">{m.bisection}</b>
      <span class="sub">{t('条链路', 'links cut')}</span>
    </div>
    <div class="stat">
      <span class="k">{t('链路', 'Links')}</span>
      <b class="mono">{m.links}</b>
      <span class="sub">{t('单向计算', 'counted once')}</span>
    </div>
    <div class="stat">
      <span class="k">{t('路径数', 'Paths')}</span>
      <b class="mono">{f(m.diversity)}</b>
      <span class="sub">{t('每对平均最短路', 'shortest paths per pair')}</span>
    </div>
  </div>

  <table class="table compare">
    <thead>
      <tr>
        <th>{t('拓扑（16 节点）', 'Topology (16 nodes)')}</th>
        <th>{t('度数', 'Degree')}</th>
        <th>{t('直径', 'Diameter')}</th>
        <th>{t('平均跳数', 'Avg hops')}</th>
        <th>{t('对剖', 'Bisection')}</th>
        <th>{t('链路', 'Links')}</th>
      </tr>
    </thead>
    <tbody>
      {#each comparison as row}
        <tr class:on={row.kind === kind}>
          <td><span class="swatch" class:sel={row.kind === kind}></span>{row.label}</td>
          <td class="num">{row.degreeMin}–{row.degreeMax}</td>
          <td class="num">{row.diameter}</td>
          <td class="num">{f(row.avgHops)}</td>
          <td class="num">{row.bisection}</td>
          <td class="num">{row.links}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <p class="caption">
    {t(
      '同一个 16 节点的四种连法：ring 便宜但慢，torus 把直径砍到 4 却把链路数翻倍，crossbar 一跳直达但端口数与对剖都随节点数线性涨。',
      'Four ways to connect the same 16 nodes: a ring is cheap but slow; a torus halves the diameter and doubles the links; a crossbar is one hop away but its ports and bisection grow linearly with the node count.'
    )}
  </p>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .hint {
    font-size: 10.5px;
    color: var(--muted);
  }

  .route-note {
    margin-top: -4px;
    font-size: 10.5px;
    color: var(--accent-deep);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 8px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 9px 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .stat .k {
    font-size: 9.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .stat b {
    font-size: 18px;
    font-weight: 500;
    color: var(--ink);
  }

  .stat .sub {
    font-size: 9.5px;
    color: var(--muted);
  }

  .compare {
    margin-top: 2px;
  }

  .compare tr.on td {
    background: var(--accent-soft);
    color: var(--accent-deep);
  }

  .swatch {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-right: 6px;
    border-radius: 2px;
    background: var(--line);
  }

  .swatch.sel {
    background: var(--accent);
  }

  .caption {
    font-size: 11.5px;
    line-height: 1.7;
    color: var(--ink-3);
  }

  @media (max-width: 780px) {
    .stats {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
