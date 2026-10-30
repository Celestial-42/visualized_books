<script lang="ts">
  import GraphView from './GraphView.svelte';
  import { bfs, buildTopology } from '../../lib/noc/topology';
  import { adaptivePath, routeBy, sourceRoute, valiantRoute, xyPath, yxPath, type RoutingId } from '../../lib/noc/routing';
  import { profile } from '../../lib/noc/perf';
  import { lang, t } from '../../lib/lang.svelte';

  const graph = buildTopology('mesh', 4, 4);

  type Algo = RoutingId | 'adaptive';

  let algo = $state<Algo>('xy');
  let src = $state(4);
  let dst = $state(11);
  let hotLink = $state<'none' | '5-6'>('5-6');

  const ALGOS: { id: Algo; label: string; labelEn: string; note: string; noteEn: string }[] = [
    {
      id: 'xy',
      label: 'XY 维序',
      labelEn: 'XY dimension order',
      note: '先把 X 走完再走 Y，最小路由，只需要 4 个转向，依赖图天然无环。',
      noteEn: 'All X hops, then all Y hops. Minimal, four turns only, acyclic by construction.'
    },
    {
      id: 'yx',
      label: 'YX 维序',
      labelEn: 'YX dimension order',
      note: '与 XY 对称：先走 Y 再走 X，跳数完全相同，只是先吃哪一维的拥塞不同。',
      noteEn: 'The mirror of XY: Y first, then X. Same hop count, a different dimension takes the congestion first.'
    },
    {
      id: 'west',
      label: 'West-first',
      labelEn: 'West-first',
      note: '要往西就先往西，剩下的北/南/东可以自适应；仍然是 4 个转向，仍然无环。',
      noteEn: 'Go west first, then adapt among north/south/east. Still four turns, still acyclic.'
    },
    {
      id: 'valiant',
      label: 'Valiant（oblivious）',
      labelEn: 'Valiant (oblivious)',
      note: '先绕到最远的中间节点，再按 XY 去目的：两段各自最小，合起来却明显更长。它完全不看拥塞，用额外跳数换负载均衡。',
      noteEn: 'Detour to the farthest intermediate node, then XY to the destination: each leg is minimal, the sum is not. It never looks at congestion — extra hops buy balance.'
    },
    {
      id: 'adaptive',
      label: '最小自适应',
      labelEn: 'Minimal adaptive',
      note: 'XY 与 YX 都是最短路；路由器读各链路负载，选总拥塞更低的那条。跳数不变，路径随热点改变。',
      noteEn: 'XY and YX are both shortest; the router reads link loads and takes the less congested one. Same hops, a path that moves with the hotspots.'
    }
  ];

  // congestion the adaptive router looks at: uniform all-to-all, plus an optional hotspot
  const congestion = $derived.by(() => {
    const p = profile('mesh', 4, 4, 'uniform', 'xy');
    const m = new Map<string, number>();
    for (const l of p.links) m.set(`${l.from}-${l.to}`, l.load);
    if (hotLink !== 'none') m.set(hotLink, (m.get(hotLink) ?? 0) + 6);
    return m;
  });

  const heat = $derived.by(() => {
    const max = Math.max(...congestion.values(), 0.0001);
    const m = new Map<string, number>();
    for (const [k, v] of congestion) m.set(k, v / max);
    return m;
  });

  const adaptive = $derived(adaptivePath(graph, src, dst, congestion));
  const valiant = $derived(valiantRoute(graph, src, dst));

  const path = $derived.by(() => {
    if (algo === 'adaptive') return adaptive.path;
    if (algo === 'valiant') return valiant.path;
    return routeBy(graph, src, dst, algo as RoutingId);
  });

  const altPath = $derived.by(() => {
    if (algo !== 'adaptive') return [];
    return adaptive.picked === 'xy' ? yxPath(graph, src, dst) : xyPath(graph, src, dst);
  });

  const dirs = $derived(sourceRoute(graph, path));
  const dist = $derived(bfs(graph, src).dist);
  const minimal = $derived(dist[dst] ?? 0);
  const hops = $derived(path.length - 1);
  const algoNote = $derived(ALGOS.find((a) => a.id === algo) ?? ALGOS[0]);
  const maxScore = $derived(Math.max(adaptive.xyScore, adaptive.yxScore, 0.001));

  const pick = (node: number) => {
    if (node !== src) dst = node;
  };

  const swap = () => {
    const s = src;
    src = dst;
    dst = s;
  };
</script>

<div class="lab">
  <div class="toolbar">
    <div class="seg">
      {#each ALGOS as a}
        <button class:active={algo === a.id} onclick={() => (algo = a.id)}>
          {lang.value === 'en' ? a.labelEn : a.label}
        </button>
      {/each}
    </div>
    <button class="btn small" onclick={swap}>{t('交换端点', 'Swap endpoints')}</button>
  </div>

  <p class="algo-note">
    {lang.value === 'en' ? algoNote.noteEn : algoNote.note}
    {#if algo === 'adaptive'}
      {t(
        '下面这一屏假设链路 5→6 被热点打满（可关掉），否则均匀流量下 XY 与 YX 的代价完全相同。',
        'This view assumes link 5→6 is hammered by a hotspot (it can be switched off); otherwise uniform traffic makes XY and YX cost exactly the same.'
      )}
    {/if}
  </p>

  <GraphView
    {graph}
    heat={algo === 'adaptive' ? heat : undefined}
    selected={src}
    dest={dst}
    routes={altPath.length ? [path, altPath] : [path]}
    onpick={pick}
    height={280}
  />

  {#if algo === 'adaptive'}
    <div class="hotbar">
      <span class="d-k">{t('热点', 'Hotspot')}</span>
      <div class="seg small">
        <button class:active={hotLink === 'none'} onclick={() => (hotLink = 'none')}>{t('无热点', 'none')}</button>
        <button class:active={hotLink === '5-6'} onclick={() => (hotLink = '5-6')}>{t('链路 5→6 打满', 'link 5→6 saturated')}</button>
      </div>
    </div>
    <p class="legend">
      <span class="sw chosen"></span>{t('选中的路径', 'chosen path')}
      <span class="sw other"></span>{t('另一条候选（同样是最短路）', 'the other candidate (equally short)')}
      <span class="sw hot"></span>{t('链路越红 = 负载越高', 'redder link = more loaded')}
    </p>
  {:else if algo === 'valiant'}
    <p class="legend">
      {#if valiant.mid >= 0}
        <span class="sw chosen"></span>{t(`经由中间节点 ${valiant.mid}：两段各自最小，合起来多绕`, `via intermediate node ${valiant.mid}: both legs minimal, the sum is not`)}
      {:else}
        {t(
          '这对端点是网格的对角：所有中间节点本来就在最短路上，Valiant 在这里绕不出更多跳数。换一对端点就能看到绕行。',
          'These endpoints are opposite corners, so every intermediate node already lies on a shortest path — Valiant cannot add hops here. Pick another pair to see the detour.'
        )}
      {/if}
    </p>
  {/if}

  <div class="readout">
    <div class="ro">
      <span>{t('路径', 'Path')}</span>
      <b class="mono">{src} → {dst}</b>
      <span class="sub mono">{path.join(' → ')}</span>
    </div>
    <div class="ro">
      <span>{t('跳数', 'Hops')}</span>
      <b class="mono">{hops}</b>
      <span class="sub">{t(`最短路 ${minimal}`, `shortest ${minimal}`)}</span>
    </div>
    <div class="ro">
      <span>{t('绕行', 'Detour')}</span>
      <b class="mono" class:bad={hops > minimal}>+{hops - minimal}</b>
      <span class="sub">{t('非最小路由的代价', 'price of non-minimal routing')}</span>
    </div>
    <div class="ro">
      <span>{t('源路由头', 'Source-route header')}</span>
      <b class="mono small">{dirs.join(' ') || '—'}</b>
      <span class="sub">{t('按跳序排列的方向串', 'one direction per hop')}</span>
    </div>
  </div>

  {#if algo === 'adaptive'}
    <div class="decision">
      <span class="d-k">{t('决策依据：每条候选路径经过链路的负载之和', 'Decision: sum of link loads along each candidate')}</span>
      <span class="d-row" class:win={adaptive.picked === 'xy' && Math.abs(adaptive.xyScore - adaptive.yxScore) > 0.01}>
        <b class="mono">XY</b>
        <span class="d-bar"><i style={`width:${(adaptive.xyScore / maxScore) * 100}%`}></i></span>
        <span class="mono">{adaptive.xyScore.toFixed(2)}</span>
      </span>
      <span class="d-row" class:win={adaptive.picked === 'yx' && Math.abs(adaptive.xyScore - adaptive.yxScore) > 0.01}>
        <b class="mono">YX</b>
        <span class="d-bar"><i style={`width:${(adaptive.yxScore / maxScore) * 100}%`}></i></span>
        <span class="mono">{adaptive.yxScore.toFixed(2)}</span>
      </span>
      <span class="d-note">
        {#if Math.abs(adaptive.xyScore - adaptive.yxScore) <= 0.01}
          {t('两条代价相同（对称网格上的平手），取 XY', 'Both cost the same — a tie on a symmetric mesh — so XY wins')}
        {:else}
          {t(`选了拥塞更低的 ${adaptive.picked.toUpperCase()}`, `took the less loaded ${adaptive.picked.toUpperCase()}`)}
        {/if}
      </span>
    </div>
  {/if}
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .algo-note {
    margin-top: -2px;
    font-size: 11.5px;
    line-height: 1.65;
    color: var(--ink-3);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
    font-size: 10px;
    line-height: 1.55;
    color: var(--muted);
  }

  .sw {
    display: inline-block;
    width: 14px;
    height: 2px;
    border-radius: 1px;
  }

  .sw.chosen {
    background: var(--accent);
  }

  .sw.other {
    background: var(--gold);
  }

  .sw.hot {
    height: 4px;
    background: var(--ember);
    opacity: 0.65;
  }

  .readout {
    display: grid;
    grid-template-columns: 1.6fr 0.7fr 0.7fr 1.4fr;
    gap: 8px;
  }

  .ro {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 9px 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
    min-width: 0;
  }

  .ro > span:first-child {
    font-size: 9.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .ro b {
    font-size: 17px;
    font-weight: 500;
    color: var(--ink);
  }

  .ro b.small {
    font-size: 11.5px;
    line-height: 1.4;
  }

  .ro b.bad {
    color: var(--ember);
  }

  .ro .sub {
    font-size: 9.5px;
    line-height: 1.5;
    color: var(--muted);
    overflow-wrap: anywhere;
  }

  .decision {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 10px 12px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .hotbar {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .seg.small button {
    padding: 3px 7px;
    font-size: 10px;
  }

  .d-k {
    font-size: 9.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .d-row {
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr) 48px;
    align-items: center;
    gap: 8px;
    font-size: 10.5px;
    color: var(--muted);
  }

  .d-row b {
    color: var(--ink-2);
  }

  .d-row.win b,
  .d-row.win span:last-child {
    color: var(--accent-deep);
    font-weight: 600;
  }

  .d-bar {
    display: block;
    height: 6px;
    border-radius: 3px;
    background: var(--paper-3);
    overflow: hidden;
  }

  .d-bar i {
    display: block;
    height: 100%;
    background: var(--muted);
  }

  .d-row.win .d-bar i {
    background: var(--accent);
  }

  .d-note {
    font-size: 10px;
    color: var(--muted);
  }

  @media (max-width: 780px) {
    .readout {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
