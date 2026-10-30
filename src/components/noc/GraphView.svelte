<script lang="ts">
  import type { Graph } from '../../lib/noc/topology';

  let {
    graph,
    routes = [],
    heat,
    selected = -1,
    dest = -1,
    onpick,
    showIds = true,
    height = 300
  }: {
    graph: Graph;
    routes?: number[][];
    heat?: Map<string, number>;
    selected?: number;
    dest?: number;
    onpick?: (node: number) => void;
    showIds?: boolean;
    height?: number;
  } = $props();

  const isMesh = $derived(graph.kind === 'mesh' || graph.kind === 'torus');
  const nodeSize = $derived(isMesh ? 5.4 : graph.kind === 'fattree' || graph.kind === 'butterfly' ? 3.4 : 4.6);
  const drawn = $derived(
    graph.kind === 'fattree' || graph.kind === 'butterfly' ? [...Array(graph.n).keys()] : graph.terminals
  );
  const isTerminal = (node: number) => graph.terminals.includes(node);
</script>

<svg class="graph" viewBox="-6 -6 112 112" style={`height:${height}px`} role="img">
  {#each graph.links as [a, b]}
    {@const key = a < b ? `${a}-${b}` : `${b}-${a}`}
    {@const h = heat?.get(key) ?? 0}
    <line
      x1={graph.pos[a].x}
      y1={graph.pos[a].y}
      x2={graph.pos[b].x}
      y2={graph.pos[b].y}
      class="link"
      class:loaded={h > 0}
      stroke-width={0.5 + h * 2.6}
      opacity={heat ? 0.18 + h * 0.82 : 1}
    />
  {/each}

  {#each routes as route, ri}
    {#if route.length > 1}
      <polyline
        points={route.map((i) => `${graph.pos[i].x},${graph.pos[i].y}`).join(' ')}
        class={`route r${ri % 3}`}
      />
    {/if}
  {/each}

  {#each drawn as node}
    <g
      class="node"
      class:sel={selected === node}
      class:dest={dest === node}
      class:switch={!isTerminal(node)}
      onclick={() => isTerminal(node) && onpick?.(node)}
      role={onpick && isTerminal(node) ? 'button' : undefined}
    >
      <rect
        x={graph.pos[node].x - nodeSize / 2}
        y={graph.pos[node].y - nodeSize / 2}
        width={nodeSize}
        height={nodeSize}
        rx="1.3"
      />
      {#if showIds && isTerminal(node)}
        <text x={graph.pos[node].x} y={graph.pos[node].y + 1.5} text-anchor="middle">{node}</text>
      {/if}
    </g>
  {/each}
</svg>

<style>
  .graph {
    display: block;
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
  }

  .link {
    stroke: var(--line);
    stroke-width: 0.6;
    transition: stroke 0.2s var(--ease);
  }

  .link.loaded {
    stroke: var(--ember);
    stroke-linecap: round;
  }

  .node rect {
    fill: var(--card);
    stroke: var(--line);
    transition: fill 0.18s var(--ease), stroke 0.18s var(--ease);
  }

  .node text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 3.1px;
    fill: var(--muted);
    pointer-events: none;
  }

  .node.sel rect {
    fill: var(--accent-soft);
    stroke: var(--accent);
  }

  .node.sel text {
    fill: var(--accent-deep);
    font-weight: 600;
  }

  .node.dest rect {
    fill: var(--ember-soft);
    stroke: var(--ember);
  }

  .node.dest text {
    fill: var(--ember);
  }

  .node:hover rect {
    stroke: var(--accent);
  }

  .node.switch rect {
    fill: var(--paper-2);
    stroke: var(--line);
  }

  .node.switch:hover rect {
    stroke: var(--line);
  }

  .route {
    fill: none;
    stroke-width: 0.9;
    stroke-linejoin: round;
    stroke-linecap: round;
    opacity: 0.9;
  }

  .route.r0 {
    stroke: var(--accent);
  }

  .route.r1 {
    stroke: var(--gold);
  }

  .route.r2 {
    stroke: var(--ember);
  }
</style>
