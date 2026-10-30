<script lang="ts">
  import GraphView from './GraphView.svelte';
  import { profile, TRAFFICS, delayCurve, idealLatency, meshHopFormula, type TrafficId } from '../../lib/noc/perf';
  import { lang, t } from '../../lib/lang.svelte';

  type Topo = 'mesh' | 'torus' | 'ring' | 'crossbar';

  let topo = $state<Topo>('mesh');
  let traffic = $state<TrafficId>('uniform');
  let routing = $state<'xy' | 'west'>('xy');

  const dims = $derived(topo === 'mesh' || topo === 'torus' ? { w: 4, h: 4 } : { w: 16, h: 1 });
  const p = $derived(profile(topo, dims.w, dims.h, traffic, routing));

  const heat = $derived.by(() => {
    const m = new Map<string, number>();
    const max = p.maxLoad || 1;
    for (const l of p.links) m.set(`${l.from}-${l.to}`, l.load / max);
    return m;
  });

  const curve = $derived(delayCurve(p.baseLatency));
  const ideal = $derived(curve.map((c) => ({ load: c.load, latency: idealLatency(p.baseLatency, c.load) })));
  // an ideal fabric has infinite bandwidth: its latency never leaves the zero-load value
  const fabric = $derived(curve.map((c) => ({ load: c.load, latency: p.baseLatency })));
  const maxLat = $derived(Math.max(...curve.map((c) => c.latency), ...ideal.map((c) => c.latency)));
  const toXY = (c: { load: number; latency: number }) => `${10 + c.load * 270},${104 - (c.latency / maxLat) * 84}`;
  const points = $derived(curve.map(toXY).join(' '));
  const idealPoints = $derived(ideal.map(toXY).join(' '));
  const fabricPoints = $derived(fabric.map(toXY).join(' '));

  const info = $derived(TRAFFICS.find((x) => x.id === traffic) ?? TRAFFICS[0]);
  const formula = $derived(meshHopFormula(4));

  const TOPOS: { id: Topo; label: string }[] = [
    { id: 'mesh', label: 'mesh 4×4' },
    { id: 'torus', label: 'torus 4×4' },
    { id: 'ring', label: 'ring 16' },
    { id: 'crossbar', label: 'crossbar 16' }
  ];
</script>

<div class="lab">
  <div class="toolbar">
    <div class="seg">
      {#each TOPOS as x}
        <button class:active={topo === x.id} onclick={() => (topo = x.id)}>{x.label}</button>
      {/each}
    </div>
    <div class="seg">
      {#each TRAFFICS as x}
        <button class:active={traffic === x.id} onclick={() => (traffic = x.id)}>
          {lang.value === 'en' ? x.labelEn : x.label}
        </button>
      {/each}
    </div>
    <div class="seg">
      <button class:active={routing === 'xy'} onclick={() => (routing = 'xy')}>XY</button>
      <button class:active={routing === 'west'} onclick={() => (routing = 'west')}>West-first</button>
    </div>
  </div>

  <p class="traffic-note">{lang.value === 'en' ? info.noteEn : info.note}</p>

  <div class="two">
    <div class="viz">
      <GraphView graph={p.graph} {heat} height={250} showIds={false} />
      <p class="viz-note">{t('链路颜色深浅 = 该链路承载的流量', 'Link intensity = traffic carried')}</p>
    </div>

    <div class="chart">
      <span class="eyebrow">{t('延迟 - 注入率', 'Latency vs injection rate')}</span>
      <svg viewBox="0 0 290 116" fill="none" aria-hidden="true">
        <path d="M10 104H282" class="axis" />
        <path d="M10 104V12" class="axis" />
        <polyline points={idealPoints} class="ideal" />
        <polyline points={fabricPoints} class="fabric" />
        <polyline points={points} class="curve" />
        <text x="146" y="114" class="axis-l" text-anchor="middle">{t('注入率 / 饱和注入率', 'load / saturation')}</text>
        <text x="6" y="10" class="axis-l">{t('延迟', 'latency')}</text>
      </svg>
      <p class="legend">
        <span class="sw curve-sw"></span>{t('本页模型（M/D/1）', 'this page’s model (M/D/1)')}
        <span class="sw ideal-sw"></span>{t('纯排队理想 1/(1−ρ)', 'pure queue 1/(1−ρ)')}
        <span class="sw fabric-sw"></span>{t('理想互连（带宽无限）', 'ideal fabric (infinite bandwidth)')}
      </p>
      <p class="viz-note">
        {t(
          '两条线形状一样，差在膝盖的软硬：真实网络的排队比理想队列更早“硬”起来。',
          'Same shape, different knee: a real network stiffens earlier than the ideal queue.'
        )}
      </p>
    </div>
  </div>

  <div class="stats">
    <div class="stat">
      <span class="k">{t('最大链路负载', 'Max link load')}</span>
      <b class="mono">{p.maxLoad.toFixed(2)}</b>
      <span class="sub">{t('每节点每包', 'per packet per node')}</span>
    </div>
    <div class="stat">
      <span class="k">{t('饱和注入率', 'Saturation')}</span>
      <b class="mono">{p.saturation.toFixed(3)}</b>
      <span class="sub">{t('包/节点/周期', 'packets/node/cycle')}</span>
    </div>
    <div class="stat">
      <span class="k">{t('平均跳数', 'Avg hops')}</span>
      <b class="mono">{p.metrics.avgHops.toFixed(2)}</b>
      <span class="sub">{t('决定零负载延迟', 'sets zero-load latency')}</span>
    </div>
    <div class="stat">
      <span class="k">{t('对剖', 'Bisection')}</span>
      <b class="mono">{p.metrics.bisection}</b>
      <span class="sub">{t('跨线流量的上限', 'ceiling for crossing traffic')}</span>
    </div>
  </div>

  <p class="note-line">
    {t(
      `同样的图，换成 ${lang.value === 'en' ? info.labelEn : info.label} 之后，最忙的那条链路决定饱和点：最大负载 ${p.maxLoad.toFixed(2)}，于是饱和注入率是 ${p.saturation.toFixed(3)} 包/节点/周期。`,
      `Same graph, different pattern: the busiest link sets the saturation point. Max load ${p.maxLoad.toFixed(2)} gives a saturation injection rate of ${p.saturation.toFixed(3)} packets per node per cycle.`
    )}
  </p>

  {#if topo === 'mesh' && traffic === 'uniform'}
    <p class="formula mono">
      {t('公式校验', 'formula check')}: E|d| = 2k/3 = {formula.toFixed(3)} {t('（不含自身对）', '(distinct pairs)')} ·
      {t('BFS 实测', 'BFS measured')} {p.metrics.avgHops.toFixed(3)}
    </p>
  {/if}
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .traffic-note {
    font-size: 11px;
    color: var(--muted);
  }

  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    align-items: start;
  }

  .viz,
  .chart {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .chart svg {
    width: 100%;
    height: auto;
  }

  .axis {
    stroke: var(--line);
    stroke-width: 1;
  }

  .curve {
    stroke: var(--accent);
    stroke-width: 1.4;
    fill: none;
  }

  .ideal {
    stroke: var(--gold);
    stroke-width: 1;
    stroke-dasharray: 3 3;
    fill: none;
  }

  .fabric {
    stroke: var(--st-e);
    stroke-width: 1;
    stroke-dasharray: 1 3;
    fill: none;
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 9.5px;
    color: var(--muted);
  }

  .sw {
    width: 12px;
    height: 2px;
    border-radius: 1px;
  }

  .curve-sw {
    background: var(--accent);
  }

  .ideal-sw {
    background: var(--gold);
  }

  .fabric-sw {
    background: var(--st-e);
  }

  .axis-l {
    font-family: 'Inter', sans-serif;
    font-size: 6.5px;
    fill: var(--muted);
  }

  .viz-note {
    font-size: 10px;
    color: var(--muted);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
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

  .note-line {
    font-size: 11.5px;
    line-height: 1.7;
    color: var(--ink-3);
  }

  .formula {
    padding: 7px 10px;
    font-size: 10px;
    line-height: 1.6;
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-radius: 8px;
  }

  @media (max-width: 780px) {
    .two,
    .stats {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
