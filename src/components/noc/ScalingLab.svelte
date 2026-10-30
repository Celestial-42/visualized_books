<script lang="ts">
  import { busCompletion, meshCompletion, nearestMesh, wireDelay } from '../../lib/noc/scaling';
  import { lang, t } from '../../lib/lang.svelte';

  let cores = $state(16);
  let flits = $state(8);

  const bus = $derived(busCompletion(cores, flits));
  const mesh = $derived(meshCompletion(cores, flits));
  const meshSide = $derived(nearestMesh(cores));
  const wire = $derived(wireDelay(cores, 2, 60));
  const ratio = $derived(bus / mesh);

  const SIZES = [4, 9, 16, 25, 36, 64];
  const table = $derived(SIZES.map((n) => ({ n, bus: busCompletion(n, flits), mesh: meshCompletion(n, flits) })));
  const max = $derived(Math.max(...table.map((r) => r.bus)));
  const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
</script>

<div class="lab">
  <div class="knobs">
    <label>
      <span>{t('核数', 'Cores')}</span>
      <input type="range" min="4" max="64" step="1" bind:value={cores} />
      <b class="mono">{cores}</b>
    </label>
    <label>
      <span>{t('包长（flit）', 'Packet (flits)')}</span>
      <input type="range" min="4" max="32" step="2" bind:value={flits} />
      <b class="mono">{flits}</b>
    </label>
  </div>

  <div class="versus">
    <div class="side bus">
      <span class="tag">{t('共享总线', 'Shared bus')}</span>
      <b class="mono">{bus}</b>
      <span class="unit">{t('周期：所有核的包排队，一条一条过', 'cycles: every packet queues on the one wire')}</span>
      <div class="bar"><i style={`width:${100}%`}></i></div>
    </div>
    <div class="vs">{t('对', 'vs')}</div>
    <div class="side mesh">
      <span class="tag">{t(`${meshSide.w}×${meshSide.h} mesh`, `${meshSide.w}×${meshSide.h} mesh`)}</span>
      <b class="mono">{fmt(mesh)}</b>
      <span class="unit">{t('周期：包并行穿过 √N 条链路', 'cycles: packets cross √N links in parallel')}</span>
      <div class="bar"><i style={`width:${(mesh / bus) * 100}%`}></i></div>
    </div>
  </div>

  <p class="verdict">
    {#if lang.value === 'en'}
      At {cores} cores the mesh finishes the same traffic <b>{ratio.toFixed(1)}×</b> sooner — and the gap is what
      “the bus does not scale” means numerically.
    {:else}
      {cores} 个核时，mesh 用 <b>{ratio.toFixed(1)}×</b> 更少周期跑完同样的流量——这就是“总线不可扩展”的量化含义。
    {/if}
  </p>

  <table class="table">
    <thead>
      <tr>
        <th>{t('核数', 'Cores')}</th>
        <th>{t('总线周期', 'Bus cycles')}</th>
        <th>{t('mesh 周期', 'Mesh cycles')}</th>
        <th>{t('差距', 'Gap')}</th>
        <th class="col-bar"></th>
      </tr>
    </thead>
    <tbody>
      {#each table as row}
        <tr>
          <td class="num">{row.n}</td>
          <td class="num">{row.bus}</td>
          <td class="num">{fmt(row.mesh)}</td>
          <td class="num">{(row.bus / row.mesh).toFixed(1)}×</td>
          <td class="col-bar">
            <span class="mini"><i style={`width:${(row.bus / max) * 100}%`}></i></span>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <div class="wire">
    <span class="tag">{t('线延迟（每核 2 mm，60 ps/mm）', 'Wire delay (2 mm/core, 60 ps/mm)')}</span>
    <div class="wire-row">
      <span>{t('总线跨全片', 'Bus across the die')}</span>
      <b class="mono">{wire.bus.toFixed(0)} ps</b>
    </div>
    <div class="wire-row">
      <span>{t('mesh 单跳', 'One mesh link')}</span>
      <b class="mono">{wire.mesh.toFixed(0)} ps</b>
    </div>
    <p class="wire-note">
      {t(
        '总线的线随时钟频率一起“变慢”到不可达，而 mesh 的每一跳长度固定——这是第二个崩掉的地方。',
        'The bus wire lengthens with the die until it cannot be crossed in a cycle, while a mesh hop keeps a fixed length — the second thing that breaks.'
      )}
    </p>
  </div>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .knobs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }

  .knobs label {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    color: var(--muted);
  }

  .knobs b {
    font-size: 13px;
    color: var(--ink);
  }

  input[type='range'] {
    width: 100%;
    height: 2px;
    appearance: none;
    background: var(--line);
    border-radius: 2px;
  }

  input[type='range']::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: var(--accent);
    border-radius: 50%;
    cursor: pointer;
  }

  .versus {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: stretch;
    gap: 12px;
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .side b {
    font-size: 30px;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: var(--ink);
  }

  .side.bus b {
    color: var(--ember);
  }

  .side.mesh b {
    color: var(--accent);
  }

  .unit {
    font-size: 10.5px;
    line-height: 1.55;
    color: var(--muted);
  }

  .bar {
    margin-top: 8px;
    height: 4px;
    border-radius: 2px;
    background: var(--paper-3);
    overflow: hidden;
  }

  .bar i {
    display: block;
    height: 100%;
    background: var(--ember);
  }

  .side.mesh .bar i {
    background: var(--accent);
  }

  .vs {
    align-self: center;
    font-family: 'Fraunces', Georgia, serif;
    font-style: italic;
    font-size: 13px;
    color: var(--muted);
  }

  .tag {
    font-size: 9.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .verdict {
    font-size: 12.5px;
    line-height: 1.7;
    color: var(--ink-3);
  }

  .verdict b {
    color: var(--ink);
    font-weight: 600;
  }

  .col-bar {
    width: 90px;
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
    background: var(--ember);
  }

  .wire {
    padding: 12px 14px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .wire-row {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    font-size: 12px;
    color: var(--ink-2);
  }

  .wire-row b {
    font-weight: 500;
  }

  .wire-note {
    margin-top: 8px;
    font-size: 11px;
    line-height: 1.65;
    color: var(--muted);
  }

  @media (max-width: 720px) {
    .knobs,
    .versus {
      grid-template-columns: minmax(0, 1fr);
    }

    .vs {
      display: none;
    }
  }
</style>
