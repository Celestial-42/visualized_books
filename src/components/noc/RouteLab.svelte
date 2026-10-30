<script lang="ts">
  import GraphView from './GraphView.svelte';
  import { bfs, buildTopology } from '../../lib/noc/topology';
  import { routeBy, routingVerdict, TURN_SETS, ALL_TURNS, type RoutingId } from '../../lib/noc/routing';
  import { lang, t } from '../../lib/lang.svelte';

  const graph = buildTopology('mesh', 4, 4);

  let algo = $state<RoutingId>('xy');
  let set = $state('xy');
  let src = $state(0);
  let dst = $state(15);

  const ALGOS: { id: RoutingId; label: string; labelEn: string }[] = [
    { id: 'xy', label: 'XY 维序', labelEn: 'XY dimension order' },
    { id: 'west', label: 'West-first', labelEn: 'West-first' },
    { id: 'valiant', label: 'Valiant（oblivious）', labelEn: 'Valiant (oblivious)' },
    { id: 'yx', label: 'YX 维序', labelEn: 'YX dimension order' }
  ];

  const path = $derived(routeBy(graph, src, dst, algo));
  const dist = $derived(bfs(graph, src).dist);
  const minimal = $derived(dist[dst] ?? 0);
  const hops = $derived(path.length - 1);

  const turns = $derived(TURN_SETS.find((s) => s.id === set) ?? TURN_SETS[0]);
  const verdict = $derived(routingVerdict(graph, turns.turns));

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
      <span>{t('操作', 'How')}</span>
      <b class="mono small">{t('点节点换目的地', 'click a node to move the destination')}</b>
      <span class="sub">{t('端点对调用左侧的“交换端点”', 'use “swap endpoints” to reverse the pair')}</span>
    </div>
  </div>

  <div class="turns">
    <div class="turns-head">
      <span class="eyebrow">{t('转向模型 → 信道依赖图', 'Turn model → channel dependency graph')}</span>
      <span class="badge" class:ok={verdict.safe} class:bad={!verdict.safe}>
        {verdict.safe ? t('无环 · 无死锁', 'acyclic · deadlock-free') : t('成环 · 会死锁', 'cycle · deadlocks')}
      </span>
    </div>
    <div class="seg">
      {#each TURN_SETS as s}
        <button class:active={set === s.id} onclick={() => (set = s.id)}>
          {lang.value === 'en' ? s.labelEn : s.label}
        </button>
      {/each}
    </div>
    <p class="note-line">{lang.value === 'en' ? turns.noteEn : turns.note}</p>

    <div class="turn-grid">
      {#each ALL_TURNS as turn}
        <span class="turn" class:on={turns.turns.includes(turn)}>{turn[0]}→{turn[1]}</span>
      {/each}
    </div>

    {#if verdict.cycle}
      <div class="cycle">
        <span class="cycle-label">{t('找到的环（信道 → 信道）', 'Cycle found (channel → channel)')}</span>
        <div class="cycle-chain mono">
          {#each verdict.cycle as hop, i}
            <span class="hop">{hop}</span>{#if i < verdict.cycle.length - 1}<span class="arrow">→</span>{/if}
          {/each}
        </div>
      </div>
    {:else}
      <p class="safe-note">
        {t(
          '这张 24 条有向信道的依赖图上，DFS 没有找到回路——这四个转向恰好把 mesh 的 8 个转向切成了两半。',
          'DFS over all 24 directed channels finds no cycle: these four turns cut the mesh’s eight turns into two halves.'
        )}
      </p>
    {/if}
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

  .turns {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .turns-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .note-line {
    font-size: 11.5px;
    line-height: 1.65;
    color: var(--ink-3);
  }

  .turn-grid {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 5px;
  }

  .turn {
    padding: 5px 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    text-align: center;
    color: var(--muted);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 6px;
  }

  .turn.on {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .cycle {
    padding: 10px 12px;
    background: var(--ember-soft);
    border: 1px solid #eed8ce;
    border-radius: 10px;
  }

  .cycle-label {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ember);
  }

  .cycle-chain {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    margin-top: 6px;
    font-size: 11px;
    color: var(--ink-2);
  }

  .hop {
    padding: 2px 6px;
    background: var(--card);
    border: 1px solid #eed8ce;
    border-radius: 5px;
  }

  .arrow {
    color: var(--ember);
  }

  .safe-note {
    font-size: 11px;
    line-height: 1.6;
    color: var(--muted);
  }

  @media (max-width: 780px) {
    .readout {
      grid-template-columns: 1fr 1fr;
    }

    .turn-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
</style>
