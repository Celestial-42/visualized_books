<script lang="ts">
  import RingView from './RingView.svelte';
  import { makePacketRing, tickPacketRing, runPacketRing, packetRingOccupancy, type PacketRing } from '../../lib/noc/flow';
  import { lang, t } from '../../lib/lang.svelte';

  let slots = $state(2);
  let mode = $state<'plain' | 'bubble'>('plain');
  let ring = $state.raw(makePacketRing({ slots: 2, mode: 'plain' }));
  let version = $state(0);
  let ran = $state(false);

  const rebuild = () => {
    ring = makePacketRing({ slots, mode });
    ran = false;
    version++;
  };

  const step = () => {
    tickPacketRing(ring);
    version++;
  };

  const run = () => {
    runPacketRing(ring, 100);
    ran = true;
    version++;
  };

  const view = $derived.by(() => {
    version;
    return {
      ticks: ring.ticks,
      delivered: ring.delivered,
      blocked: ring.blocked,
      occupancy: packetRingOccupancy(ring),
      capacity: ring.routers * ring.slots,
      stuck: ring.stuckTicks,
      channels: ring.channels.map((c) => ({ from: c.from, to: c.to, buf: c.buf.slice() })),
      pending: [...ring.pending.entries()].map(([from, q]) => ({ from, waiting: q.length }))
    };
  });

  const deadlocked = $derived(view.stuck >= 6);

  const ringChannels = $derived(
    view.channels.map((c) => ({ from: c.from, to: c.to, used: c.buf.length, capacity: slots }))
  );
</script>

<div class="lab">
  <div class="toolbar">
    <div class="seg">
      <button class:active={mode === 'plain'} onclick={() => { mode = 'plain'; rebuild(); }}>
        {t('单 VC · 普通注入', 'One VC · plain injection')}
      </button>
      <button class:active={mode === 'bubble'} onclick={() => { mode = 'bubble'; rebuild(); }}>
        {t('气泡流控（注入要 2 个空位）', 'Bubble (2 free slots to inject)')}
      </button>
    </div>
    <div class="seg">
      {#each [2, 3, 4] as s}
        <button class:active={slots === s} onclick={() => { slots = s; rebuild(); }}>{t(`${s} 包/缓冲`, `${s} pkt/buffer`)}</button>
      {/each}
    </div>
  </div>

  <div class="status">
    <span class="badge" class:ok={!deadlocked} class:bad={deadlocked}>
      {#if deadlocked}
        {t(`死锁 @ 周期 ${view.ticks}`, `deadlock @ cycle ${view.ticks}`)}
      {:else if ran}
        {t('持续流动', 'keeps flowing')}
      {:else}
        {t('等待开始', 'ready')}
      {/if}
    </span>
    <span class="st">{t('周期', 'cycle')} <b class="mono">{view.ticks}</b></span>
    <span class="st">{t('完成包', 'delivered')} <b class="mono">{view.delivered}</b></span>
    <span class="st">{t('被拦下的注入', 'blocked injections')} <b class="mono">{view.blocked}</b></span>
    <span class="st">{t('占用/容量', 'occupancy')} <b class="mono">{view.occupancy}/{view.capacity}</b></span>
    <span class="spacer"></span>
    <button class="btn small" onclick={step} disabled={deadlocked}>{t('单步', 'Step')}</button>
    <button class="btn small primary" onclick={run} disabled={deadlocked}>{t('跑 100 拍', 'Run 100')}</button>
    <button class="btn small ghost" onclick={rebuild}>{t('重置', 'Reset')}</button>
  </div>

  <RingView channels={ringChannels} {deadlocked} height={230} />
  <p class="topo-note">
    {t(
      '四个路由器首尾相接，箭头粗细 = 这条信道已放的包数（容量见右侧数字）。气泡流控真正约束的是“注入这一步”：目标信道必须还空两个包位。',
      'Four routers in a loop; arrow thickness is how many packets a channel holds (capacity on the right). Bubble flow control only constrains injection: the target channel must still have two free packet slots.'
    )}
  </p>

  <div class="ring">
    {#each view.channels as ch}
      <div class="chan">
        <div class="chan-head">
          <span class="mono">R{ch.from} → R{ch.to}</span>
          <span class="chan-count mono">{ch.buf.length}/{slots}</span>
        </div>
        <div class="slots">
          {#each Array(slots) as _, i}
            {@const pkt = ch.buf[i]}
            <span class="slot" class:filled={pkt !== undefined}>
              {#if pkt !== undefined}<span class="pid mono">P{pkt}</span>{/if}
            </span>
          {/each}
        </div>
        <span class="queue mono">
          {t('待注入', 'queued')} {view.pending.find((p) => p.from === ch.from)?.waiting ?? 0}
        </span>
      </div>
    {/each}
  </div>

  <p class="note-line">
    {#if mode === 'plain'}
      {t(
        '四个源各有两个包急着进环，2 包/缓冲刚好等于在途包数：每个缓冲被填满，每个包头都在等下一个满缓冲——环闭合。缓冲加到 3 个时这批负载放得下，但负载一涨还会回来。',
        'Four sources, two packets each, and two slots per buffer: every buffer fills, every head waits on a full buffer, and the cycle closes. Three slots fit this particular load — raise the load and it returns.'
      )}
    {:else}
      {t(
        '注入前要求目标缓冲还留两个空包位，于是每次注入后至少剩一个空位。转发只搬包、不减少环里的空位总数，所以环里永远有一个“气泡”，总有人能往前走。',
        'Injection requires two free packet slots, so at least one survives. Forwarding only moves packets and never reduces the ring’s total free slots, so one bubble always exists and somebody can always advance.'
      )}
    {/if}
  </p>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 12px;
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

  .topo-note {
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--muted);
    text-align: center;
  }

  .chan {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 9px 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .chan-head {
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
    color: var(--muted);
  }

  .chan-count {
    color: var(--gold);
  }

  .slots {
    display: flex;
    gap: 4px;
  }

  .slot {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    height: 24px;
    background: var(--paper-2);
    border: 1px dashed var(--line);
    border-radius: 5px;
  }

  .slot.filled {
    background: var(--accent-soft);
    border: 1px solid #cfded9;
  }

  .pid {
    font-size: 8.5px;
    color: var(--accent-deep);
  }

  .queue {
    font-size: 9px;
    color: var(--muted);
  }

  .note-line {
    font-size: 11.5px;
    line-height: 1.7;
    color: var(--ink-3);
  }

  @media (max-width: 780px) {
    .ring {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
