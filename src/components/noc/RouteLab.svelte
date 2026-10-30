<script lang="ts">
  import GraphView from './GraphView.svelte';
  import { bfs, buildTopology } from '../../lib/noc/topology';
  import { adaptivePath, routeBy, sourceRoute, type RoutingId } from '../../lib/noc/routing';
  import { profile } from '../../lib/noc/perf';
  import { lang, t } from '../../lib/lang.svelte';

  const graph = buildTopology('mesh', 4, 4);

  type Algo = RoutingId | 'adaptive';

  let algo = $state<Algo>('xy');
  let src = $state(0);
  let dst = $state(15);

  const ALGOS: { id: Algo; label: string; labelEn: string }[] = [
    { id: 'xy', label: 'XY 维序', labelEn: 'XY dimension order' },
    { id: 'west', label: 'West-first', labelEn: 'West-first' },
    { id: 'valiant', label: 'Valiant（oblivious）', labelEn: 'Valiant (oblivious)' },
    { id: 'adaptive', label: '最小自适应', labelEn: 'Minimal adaptive' },
    { id: 'yx', label: 'YX 维序', labelEn: 'YX dimension order' }
  ];

  // congestion the adaptive router looks at: link loads of uniform all-to-all
  const congestion = $derived.by(() => {
    const p = profile('mesh', 4, 4, 'uniform', 'xy');
    const m = new Map<string, number>();
    for (const l of p.links) m.set(`${l.from}-${l.to}`, l.load);
    return m;
  });

  const adaptive = $derived(adaptivePath(graph, src, dst, congestion));
  const path = $derived(algo === 'adaptive' ? adaptive.path : routeBy(graph, src, dst, algo as RoutingId));
  const dirs = $derived(sourceRoute(graph, path));
  const dist = $derived(bfs(graph, src).dist);
  const minimal = $derived(dist[dst] ?? 0);
  const hops = $derived(path.length - 1);

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

  <GraphView {graph} selected={src} dest={dst} routes={[path]} onpick={pick} height={280} />

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
      <span class="sub">
        {#if algo === 'adaptive'}
          {t(`自适应选了 ${adaptive.picked.toUpperCase()}`, `adaptive picked ${adaptive.picked.toUpperCase()}`)}
        {:else}
          {t('按跳序排列的方向串', 'one direction per hop')}
        {/if}
      </span>
    </div>
  </div>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .readout {
    display: grid;
    grid-template-columns: 1.6fr 0.8fr 0.8fr 1.6fr;
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

  @media (max-width: 780px) {
    .readout {
      grid-template-columns: 1fr 1fr;
    }

  }
</style>
