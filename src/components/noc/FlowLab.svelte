<script lang="ts">
  import RingView from './RingView.svelte';
  import { makeRing, tickRing, runRing, totalBuffered, transferLatency, type RingState } from '../../lib/noc/flow';
  import { lang, t } from '../../lib/lang.svelte';

  let depth = $state(2);
  let packetFlits = $state(2);
  let mode = $state<'plain' | 'dateline'>('plain');
  let ring = $state.raw(makeRing());
  let version = $state(0);
  let autoRun = $state(false);

  const rebuild = () => {
    ring = makeRing({ depth, packetFlits, mode });
    autoRun = false;
    version++;
  };

  const step = () => {
    tickRing(ring);
    version++;
  };

  const runAll = () => {
    runRing(ring, 120);
    autoRun = true;
    version++;
  };

  const view = $derived.by(() => {
    version;
    return {
      ticks: ring.ticks,
      delivered: ring.done.size,
      buffered: totalBuffered(ring),
      inFlight: ring.inFlight,
      stuck: ring.stuckTicks,
      channels: ring.channels.map((c) => ({
        from: c.from,
        to: c.to,
        bufs: c.vcs.map((v) => v.buf.map((f) => ({ pkt: f.pkt, idx: f.idx })))
      }))
    };
  });

  const deadlocked = $derived(view.stuck >= 6);
  const finished = $derived(!ring.respawn && view.inFlight === 0);

  const ringChannels = $derived(
    view.channels.map((c, i) => ({
      from: c.from,
      to: c.to,
      used: c.bufs.reduce((n, b) => n + b.length, 0),
      capacity: (mode === 'dateline' ? 2 : 1) * depth,
      index: i
    }))
  );

  const datelineIndex = $derived(mode === 'dateline' ? ring.dateline : null);

  const latency = $derived(
    (['sf', 'vct', 'wh'] as const).map((m) => ({ id: m, cycles: transferLatency(m, 3, 4) }))
  );
</script>

<div class="lab">
  <div class="toolbar">
    <div class="seg">
      <button class:active={mode === 'plain'} onclick={() => { mode = 'plain'; rebuild(); }}>
        {t('单 VC', 'One VC')}
      </button>
      <button class:active={mode === 'dateline'} onclick={() => { mode = 'dateline'; rebuild(); }}>
        dateline + VC1
      </button>
    </div>
    <div class="seg">
      {#each [2, 4, 8] as d}
        <button class:active={depth === d} onclick={() => { depth = d; rebuild(); }}>{t(`缓冲 ${d}`, `depth ${d}`)}</button>
      {/each}
    </div>
    <div class="seg">
      {#each [2, 4] as p}
        <button class:active={packetFlits === p} onclick={() => { packetFlits = p; rebuild(); }}>{t(`包 ${p} flit`, `packet ${p} flit`)}</button>
      {/each}
    </div>
  </div>

  <div class="status">
    <span class="badge" class:ok={!deadlocked} class:bad={deadlocked}>
      {#if deadlocked}
        {t(`死锁 @ 周期 ${ring.ticks}`, `deadlock @ cycle ${ring.ticks}`)}
      {:else if autoRun}
        {t('无死锁', 'no deadlock')}
      {:else}
        {t('等待开始', 'ready')}
      {/if}
    </span>
    <span class="st">{t('周期', 'cycle')} <b class="mono">{view.ticks}</b></span>
    <span class="st">{t('完成包', 'packets done')} <b class="mono">{view.delivered}</b></span>
    <span class="st">{t('在途 flit', 'flits in flight')} <b class="mono">{view.inFlight}</b></span>
    <span class="st">{t('占用缓冲', 'buffered')} <b class="mono">{view.buffered}</b></span>
    <span class="spacer"></span>
    <button class="btn small" onclick={step} disabled={deadlocked}>{t('单步', 'Step')}</button>
    <button class="btn small primary" onclick={runAll} disabled={deadlocked || (autoRun && finished)}>
      {t('跑到底', 'Run')}
    </button>
    <button class="btn small ghost" onclick={rebuild}>{t('重置', 'Reset')}</button>
  </div>

  <div class="topology">
    <RingView
      channels={ringChannels}
      dateline={datelineIndex}
      {deadlocked}
      height={240}
    />
    <p class="topo-note">
      {t(
        '四个路由器首尾相接，每条箭头是一条单向信道；箭头越粗越红，说明这条信道的缓冲越满，旁边数字是“已用/容量”。',
        'Four routers in a loop; each arrow is one direction of a channel. Thicker and redder means a fuller buffer, and the number is used/capacity.'
      )}
    </p>
  </div>

  <div class="ring">
    {#each view.channels as ch}
      <div class="chan">
        <div class="chan-head">
          <span class="mono">R{ch.from} → R{ch.to}</span>
          <span class="chan-count mono">{ch.bufs.reduce((n, b) => n + b.length, 0)}</span>
        </div>
        {#each ch.bufs as buf, vi}
          <div class="vc">
            {#if ch.bufs.length > 1}<span class="vc-label mono">VC{vi}</span>{/if}
            <div class="slots">
              {#each Array(depth) as _, si}
                {@const flit = buf[si]}
                <span class="slot" class:filled={!!flit} class:head={flit && flit.idx === 0} class:tail={flit && flit.idx === packetFlits - 1}>
                  {#if flit}<span class="pid mono">P{flit.pkt}</span>{/if}
                </span>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/each}
  </div>

  <p class="note-line">
    {#if mode === 'plain'}
      {t(
        '每个路由器都往顺时针方向发一个包，四个方向同时占满下一级缓冲——没有人能前进。加缓冲只能推迟这一刻。',
        'Every router sends clockwise, and all four fill the next buffer at once — nobody can advance. More buffers only postpone it.'
      )}
    {:else}
      {t(
        '越过断点的包被强制换到 VC1，依赖图被切开：VC1 只能等 VC1，不会再指回 VC0，环闭不上。',
        'Packets that cross the break are forced onto VC1, splitting the dependency graph: VC1 never waits on VC0, so the cycle cannot close.'
      )}
    {/if}
  </p>

  <table class="table lat">
    <thead>
      <tr>
        <th>{t('流控（3 跳、4 flit 的包）', 'Flow control (3 hops, 4-flit packet)')}</th>
        <th>{t('周期', 'Cycles')}</th>
        <th>{t('每路由器缓冲', 'Buffer per router')}</th>
      </tr>
    </thead>
    <tbody>
      {#each latency as row}
        <tr>
          <td class="mono">{row.id === 'sf' ? 'store-and-forward' : row.id === 'vct' ? 'virtual cut-through' : 'wormhole'}</td>
          <td class="num">{row.cycles}</td>
          <td class="num">{row.id === 'wh' ? 1 : 4}</td>
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

  .status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 14px;
  }

  .st {
    font-size: 10.5px;
    color: var(--muted);
  }

  .st b {
    color: var(--ink);
    font-weight: 500;
  }

  .ring {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .topology {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .topo-note {
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--muted);
    text-align: center;
  }

  .chan {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 9px 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .chan-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-size: 10.5px;
    color: var(--muted);
  }

  .chan-count {
    color: var(--gold);
  }

  .vc {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .vc-label {
    font-size: 8.5px;
    color: var(--muted);
  }

  .slots {
    display: flex;
    gap: 3px;
    flex: 1;
  }

  .slot {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    height: 20px;
    background: var(--paper-2);
    border: 1px dashed var(--line);
    border-radius: 4px;
  }

  .slot.filled {
    background: var(--accent-soft);
    border: 1px solid #cfded9;
  }

  .slot.head {
    background: #e3efe9;
    border-color: var(--accent);
  }

  .slot.tail {
    background: #eef4f1;
  }

  .pid {
    font-size: 8px;
    color: var(--accent-deep);
  }

  .note-line {
    font-size: 11.5px;
    line-height: 1.7;
    color: var(--ink-3);
  }

  .lat {
    margin-top: 2px;
  }

  @media (max-width: 780px) {
    .ring {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
