<script lang="ts">
  import {
    D_SCENARIOS,
    applyD,
    initialD,
    validD,
    type DOp,
    type DScenario,
    type DSystem,
    type DEvent
  } from '../lib/dir';
  import { t } from '../lib/lang.svelte';

  type Sid = DScenario['id'];

  let scenario = $state<Sid>('share');
  let history = $state<DSystem[]>([]);
  let running = $state(false);
  let runId = 0;

  const scenarios = $derived([
    {
      id: 'first' as Sid,
      label: t('首次读', 'First read'),
      hint: t(
        'U 块第一次被读：目录从 U 变 S，只回一份数据，并记下 sharer。',
        'The first read of a U block: the directory moves to S, returns data, and records the sharer.'
      )
    },
    {
      id: 'share' as Sid,
      label: t('加入共享', 'Join sharing'),
      hint: t(
        '第二个读者加入：只多一条 GetS 和一条 Data，没有广播。',
        'A second reader joins: one more GetS and one more Data, no broadcast.'
      )
    },
    {
      id: 'invalidate' as Sid,
      label: t('写失效', 'Invalidate'),
      hint: t(
        '共享时写：GetM → 逐个 Inv → 收齐 Inv-Ack，写者才能动手。',
        'Writing while shared: GetM, then Inv per sharer, then Inv-Ack before the writer may proceed.'
      )
    },
    {
      id: 'migrate' as Sid,
      label: t('迁移', 'Migrate'),
      hint: t(
        'M 块被另一个核读：目录转发 Fwd-GetS，owner 直接把数据送给读者。',
        'An M block is read by another core: the directory forwards Fwd-GetS and the owner sends data directly.'
      )
    },
    {
      id: 'evict' as Sid,
      label: t('驱逐脏块', 'Evict dirty'),
      hint: t(
        'M 块被驱逐：PutM 带数据回目录，目录更新内存后回 Put-Ack。',
        'Evicting an M block: PutM carries data to the directory, which updates memory and returns Put-Ack.'
      )
    }
  ]);

  const current = $derived(scenarios.find((s) => s.id === scenario)!);
  const opsFor = $derived(D_SCENARIOS.find((s) => s.id === scenario)!.ops);
  const cur = $derived(history.length ? history[history.length - 1] : initialD());
  const lastGroup = $derived(cur.groups.length ? cur.groups[cur.groups.length - 1] : null);
  const ok = $derived(validD(cur));

  function opText(op: DOp): string {
    const verb = op.kind === 'load' ? t('读', 'load') : op.kind === 'store' ? t('写', 'store') : t('驱逐', 'evict');
    return `C${op.c + 1} ${verb}`;
  }

  function evClass(e: DEvent): string {
    if (e.kind === 'GetS' || e.kind === 'GetM' || e.kind === 'PutS' || e.kind === 'PutM') return 'req';
    if (e.kind === 'Data' || e.kind === 'InvAck') return 'resp';
    return 'fwd';
  }

  function evText(e: DEvent): string {
    const extra = e.extra ? ` · ${e.extra}` : '';
    switch (e.kind) {
      case 'hit':
        return t(`本地命中${extra}`, `local hit${extra}`);
      case 'write':
        return t(`写入 data = ${e.extra ?? ''}`, `write data = ${e.extra ?? ''}`);
      case 'wb':
        return t('写回内存', 'write back to memory');
      default:
        return e.kind + extra;
    }
  }

  function play(op: DOp) {
    if (running) return;
    const r = applyD(cur, op);
    if (!r) return;
    history = [...history, r.next];
  }

  function canEvict(c: number): boolean {
    return !running && cur.caches[c].state !== 'I';
  }

  function switchScenario(id: Sid) {
    runId += 1;
    running = false;
    scenario = id;
    history = [];
  }

  function undo() {
    if (running || !history.length) return;
    history = history.slice(0, -1);
  }

  function reset() {
    runId += 1;
    running = false;
    history = [];
  }

  async function autoPlay() {
    if (running) return;
    running = true;
    history = [];
    const token = ++runId;
    let s = initialD();
    for (const op of opsFor) {
      await new Promise((r) => setTimeout(r, 780));
      if (token !== runId) return;
      const r = applyD(s, op);
      if (!r) continue;
      s = r.next;
      history = [...history, s];
    }
    running = false;
  }

  const ownerName = $derived(cur.dir.owner === null ? '—' : `C${cur.dir.owner + 1}`);
</script>

<div class="lab">
  <div class="lab-bar">
    <div class="seg">
      {#each scenarios as s}
        <button class:active={scenario === s.id} onclick={() => switchScenario(s.id)}>{s.label}</button>
      {/each}
    </div>
    <span class="goal">{current.hint}</span>
    <div class="actions">
      <button class="btn small" disabled={running || !history.length} onclick={undo}>{t('撤销', 'Undo')}</button>
      <button class="btn small primary" disabled={running} onclick={autoPlay}>
        {running ? t('执行中…', 'Running…') : t('自动演示', 'Auto-play')}
      </button>
      <button class="btn small ghost" disabled={running} onclick={reset}>{t('重来', 'Reset')}</button>
    </div>
  </div>

  <div class="board">
    <div class="caches">
      {#each cur.caches as cache, c}
        <div class="card cache-card" class:owned={cache.state === 'M'} class:shared={cache.state === 'S'}>
          <div class="card-head">
            <span class="card-id mono">C{c + 1}</span>
            <span class="card-name">{t('缓存', 'cache')}</span>
            <span class="state-chip {cache.state.toLowerCase()}">{cache.state}</span>
          </div>
          <div class="data-row">
            <span class="k">{t('副本', 'copy')}</span>
            <span class="v mono" class:empty={cache.data === null}>{cache.data === null ? '—' : cache.data}</span>
          </div>
          <div class="ops">
            <button class="op-btn" disabled={running} onclick={() => play({ kind: 'load', c })}>Load A</button>
            <button class="op-btn" disabled={running} onclick={() => play({ kind: 'store', c })}>Store A</button>
            <button
              class="op-btn ghost"
              disabled={!canEvict(c)}
              title={cache.state === 'I' ? t('没有副本可驱逐', 'nothing to evict') : t('换出这条块', 'evict this block')}
              onclick={() => play({ kind: 'evict', c })}
            >
              Evict
            </button>
          </div>
        </div>
      {/each}
    </div>

    <div class="card dir-card" class:u={cur.dir.state === 'U'} class:s={cur.dir.state === 'S'} class:m={cur.dir.state === 'M'}>
      <div class="card-head">
        <span class="card-id mono">Dir</span>
        <span class="card-name">{t('目录 / 内存', 'directory / memory')}</span>
        <span class="state-chip dir {cur.dir.state.toLowerCase()}">{cur.dir.state}</span>
      </div>

      <div class="dir-rows">
        <div class="dir-row">
          <span class="k">{t('owner', 'owner')}</span>
          <span class="v mono">{ownerName}</span>
        </div>
        <div class="dir-row">
          <span class="k">{t('sharer 位图', 'sharers')}</span>
          <span class="bits mono">
            {#each cur.dir.sharers as bit, i}
              <span class="bit" class:on={bit}>{bit ? 1 : 0}</span>
            {/each}
          </span>
        </div>
        <div class="dir-row">
          <span class="k">{t('内存值', 'memory')}</span>
          <span class="v mono">{cur.mem}</span>
        </div>
      </div>

      <div class="dir-note">
        {t(
          '目录知道谁有副本；请求只发给它，转发与失效也只发给相关的人。',
          'The directory knows who has a copy; requests reach it, and forwards / invalidations go only to the relevant cores.'
        )}
      </div>
    </div>
  </div>

  <div class="strip">
    <div class="stats">
      <div class="stat"><span>{t('目录请求', 'requests')}</span><b class="mono">{cur.reqs}</b></div>
      <div class="stat"><span>{t('转发 / 失效', 'forwards / inv')}</span><b class="mono">{cur.fwds}</b></div>
      <div class="stat"><span>{t('数据消息', 'data messages')}</span><b class="mono">{cur.dataMsgs}</b></div>
    </div>
    <span class="inv" class:bad={!ok}>{ok ? t('目录与 cache 一致 ✓', 'directory matches caches ✓') : t('状态不一致 ✗', 'state mismatch ✗')}</span>
  </div>

  <div class="log">
    {#if !cur.groups.length}
      <span class="log-empty">
        {t(
          '从任意一个核的 Load / Store 开始。所有请求先到目录；目录决定回数据、转发还是发失效。',
          'Start with a Load / Store on any core. Every request goes to the directory first; it decides whether to reply, forward, or invalidate.'
        )}
      </span>
    {:else}
      <div class="log-head">
        <span>{t('消息日志', 'message log')}</span>
        <span class="log-note">{t('最新一组在最下方', 'newest group at the bottom')}</span>
      </div>
      <div class="log-list">
        {#each cur.groups.slice(-5) as g, i}
          <div class="log-group" class:last={i === cur.groups.slice(-5).length - 1}>
            <span class="log-no mono">{String(cur.groups.length - Math.min(5, cur.groups.length) + i + 1).padStart(2, '0')}</span>
            <div class="log-body">
              <strong>{opText(g.op)}</strong>
              {#each g.events as e}
                {#if e.kind === 'hit' || e.kind === 'write' || e.kind === 'wb'}
                  <span class="log-ev">{evText(e)}</span>
                {:else}
                  <span class="log-ev msg {evClass(e)} mono">
                    <b>{e.from}</b><i>→</i><b>{e.to}</b><span>{e.kind}{e.extra ? ` [${e.extra}]` : ''}</span>
                  </span>
                {/if}
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="legend">
    <span><b class="mk u mono">U</b>{t('无人缓存', 'uncached')}</span>
    <span><b class="mk s mono">S</b>{t('若干 sharer', 'shared')}</span>
    <span><b class="mk m mono">M</b>{t('一个 owner', 'one owner')}</span>
    <span><b class="mk req mono">req</b>{t('请求：Get / Put', 'request: Get / Put')}</span>
    <span><b class="mk fwd mono">fwd</b>{t('转发 / 失效 / Put-Ack', 'forward / Inv / Put-Ack')}</span>
    <span><b class="mk resp mono">resp</b>{t('数据 / Inv-Ack', 'Data / Inv-Ack')}</span>
  </div>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 13px;
  }

  .lab-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }

  .lab-bar .actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  .goal {
    font-size: 11.5px;
    color: var(--ink-3);
  }

  .board {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 250px;
    align-items: stretch;
    gap: 12px;
  }

  .caches {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 11px;
    transition: border-color 0.2s var(--ease), background 0.2s var(--ease);
  }

  .cache-card.owned {
    border-color: #e3cbbf;
    background: #fbf3ee;
  }

  .cache-card.shared {
    border-color: #e9ddc6;
    background: #f9f3e7;
  }

  .card-head {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .card-id {
    font-size: 9.5px;
    color: var(--gold);
  }

  .card-name {
    font-size: 10px;
    color: var(--ink-3);
  }

  .state-chip {
    margin-left: auto;
    min-width: 20px;
    padding: 0 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    font-weight: 500;
    line-height: 1.8;
    text-align: center;
    border-radius: 5px;
    border: 1px solid transparent;
  }

  .state-chip.i {
    color: #6c665c;
    background: #f1ece1;
    border-color: #e5ddcb;
  }

  .state-chip.s {
    color: #8a6a2f;
    background: #f7efdf;
    border-color: #ecdfc6;
  }

  .state-chip.m {
    color: #a3523b;
    background: #f9e9e2;
    border-color: #ecd3c7;
  }

  .state-chip.dir.u {
    color: #6c665c;
    background: #f1ece1;
    border-color: #e5ddcb;
  }

  .state-chip.dir.s {
    color: #8a6a2f;
    background: #f7efdf;
    border-color: #ecdfc6;
  }

  .state-chip.dir.m {
    color: #a3523b;
    background: #f9e9e2;
    border-color: #ecd3c7;
  }

  .data-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 4px 7px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 6px;
  }

  .data-row .k {
    font-size: 9px;
    color: var(--muted);
  }

  .data-row .v {
    font-size: 11.5px;
    color: var(--accent-deep);
  }

  .data-row .v.empty {
    color: var(--muted);
  }

  .ops {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .op-btn {
    flex: 1;
    min-width: 0;
    padding: 4px 3px;
    font-size: 9px;
    color: var(--ink-2);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 6px;
    transition: border-color 0.18s var(--ease), background 0.18s var(--ease), opacity 0.18s var(--ease);
  }

  .op-btn:hover:not(:disabled) {
    border-color: var(--accent);
    background: #f4f8f6;
  }

  .op-btn:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .op-btn.ghost {
    background: var(--paper-2);
    border-style: dashed;
  }

  .dir-card {
    background: var(--paper-2);
    border-color: #d9cfba;
  }

  .dir-card.m {
    border-color: #e3cbbf;
  }

  .dir-rows {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .dir-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .dir-row .k {
    font-size: 9px;
    color: var(--muted);
  }

  .dir-row .v {
    font-size: 10.5px;
    color: var(--accent-deep);
  }

  .bits {
    display: inline-flex;
    gap: 3px;
  }

  .bit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 17px;
    height: 17px;
    font-size: 9px;
    color: var(--muted);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 3px;
  }

  .bit.on {
    color: #8a6a2f;
    background: #f7efdf;
    border-color: #ecdfc6;
  }

  .dir-note {
    margin-top: auto;
    padding-top: 6px;
    font-size: 9px;
    line-height: 1.55;
    color: var(--muted);
    border-top: 1px solid var(--line-2);
  }

  .strip {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    flex: 1 1 420px;
  }

  .stat {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 9px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: 9.5px;
    color: var(--ink-3);
  }

  .stat b {
    font-size: 11.5px;
    font-weight: 500;
    color: var(--accent-deep);
  }

  .inv {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: var(--accent-deep);
  }

  .inv.bad {
    color: var(--ember);
  }

  .log {
    min-height: 44px;
    padding: 9px 11px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .log-empty {
    font-size: 10.5px;
    line-height: 1.65;
    color: var(--muted);
  }

  .log-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .log-note {
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
    color: var(--muted);
  }

  .log-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
    max-height: 186px;
    overflow-y: auto;
  }

  .log-group {
    display: flex;
    gap: 8px;
    padding: 4px 6px;
    border-radius: 6px;
  }

  .log-group.last {
    background: var(--accent-soft);
  }

  .log-no {
    flex: none;
    width: 16px;
    font-size: 8.5px;
    color: var(--muted);
  }

  .log-body {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 3px 8px;
    min-width: 0;
  }

  .log-body strong {
    min-width: 54px;
    font-size: 9.5px;
    font-weight: 600;
    color: var(--ink-2);
  }

  .log-ev {
    font-size: 9px;
    color: var(--ink-3);
  }

  .log-ev.msg b {
    font-weight: 500;
    color: var(--ink-2);
  }

  .log-ev.msg i {
    margin: 0 3px;
    font-style: normal;
    color: var(--muted);
  }

  .log-ev.msg span {
    margin-left: 4px;
    color: var(--accent-deep);
  }

  .log-ev.msg.req span {
    color: var(--accent-deep);
  }

  .log-ev.msg.fwd span {
    color: var(--gold);
  }

  .log-ev.msg.resp span {
    color: var(--ember);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 13px;
    font-size: 9.5px;
    color: var(--muted);
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .mk {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    padding: 0 4px;
    font-size: 8.5px;
    line-height: 1.6;
    border-radius: 4px;
    border: 1px solid transparent;
  }

  .mk.u {
    color: #6c665c;
    background: #f1ece1;
    border-color: #e5ddcb;
  }

  .mk.s {
    color: #8a6a2f;
    background: #f7efdf;
    border-color: #ecdfc6;
  }

  .mk.m {
    color: #a3523b;
    background: #f9e9e2;
    border-color: #ecd3c7;
  }

  .mk.req {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .mk.fwd {
    color: var(--gold);
    background: #f6eedf;
    border-color: #ecdfc6;
  }

  .mk.resp {
    color: var(--ember);
    background: var(--ember-soft);
    border-color: #ecd3c7;
  }

  @media (max-width: 900px) {
    .board {
      grid-template-columns: minmax(0, 1fr);
    }

    .dir-card {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 14px;
    }

    .dir-card .card-head {
      flex-basis: 100%;
    }

    .dir-rows {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 4px 16px;
    }

    .dir-note {
      flex-basis: 100%;
      margin-top: 0;
    }
  }

  @media (max-width: 620px) {
    .caches {
      grid-template-columns: minmax(0, 1fr);
    }

    .dir-card {
      flex-direction: column;
      flex-wrap: nowrap;
      align-items: stretch;
    }

    .dir-card .card-head {
      flex-basis: auto;
    }

    .dir-rows {
      flex-direction: column;
      gap: 4px;
    }

    .dir-note {
      flex-basis: auto;
      margin-top: 0;
    }

    .goal {
      width: 100%;
    }

    .lab-bar .seg {
      width: 100%;
      grid-auto-flow: row;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .lab-bar .seg button {
      padding: 5px 4px;
      font-size: 10px;
      white-space: nowrap;
    }

    .lab-bar .actions {
      width: 100%;
      margin-left: 0;
    }

    .stats {
      grid-template-columns: minmax(0, 1fr);
      flex-basis: 100%;
    }
  }
</style>
