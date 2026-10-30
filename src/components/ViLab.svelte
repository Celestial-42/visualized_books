<script lang="ts">
  import {
    VI_SCENARIOS,
    apply,
    describeBus,
    initialVi,
    isLegal,
    legalActions,
    type ViAction,
    type ViScenario,
    type ViStep
  } from '../lib/vi';
  import { lang, t } from '../lib/lang.svelte';

  type Sid = ViScenario['id'];

  const en = $derived(lang.value === 'en');

  let scenario = $state<Sid>('handoff');
  let history = $state<ViStep[]>([]);
  let running = $state(false);
  let runId = 0;

  const scenarios = $derived([
    {
      id: 'handoff' as Sid,
      label: t('读后转交', 'Read & handoff'),
      hint: t(
        'C1 读入后改写，再让 C2 读：V 只能有一个主人，数据怎么搬过去？',
        'C1 reads and writes, then C2 reads: with a single V owner, how does the block move?'
      )
    },
    {
      id: 'writeback' as Sid,
      label: t('脏块写回', 'Dirty write-back'),
      hint: t(
        'C1 写命中后直接 evict：新值什么时候才到内存？',
        'C1 writes on a hit and then evicts: when does the new value reach memory?'
      )
    },
    {
      id: 'pingpong' as Sid,
      label: t('两个核乒乓', 'Ping-pong'),
      hint: t(
        '两个核轮流读：VI 没有 Shared 状态，每次 Get 都会把对方踢回 I。',
        'Two cores alternate reads: VI has no Shared state, so every Get invalidates the other copy.'
      )
    }
  ]);

  const current = $derived(scenarios.find((s) => s.id === scenario)!);
  const actionsFor = $derived(VI_SCENARIOS.find((s) => s.id === scenario)!.actions);
  const cur = $derived(history.length ? history[history.length - 1].system : initialVi());
  const last = $derived(history.length ? history[history.length - 1] : null);
  const legal = $derived(legalActions(cur));

  const ownerCount = $derived(cur.caches.filter((c) => c.state === 'V').length);
  const swmrText = $derived(
    ownerCount === 0
      ? t('没有 cache 持有 V —— LLC/内存是 owner', 'No cache holds V — the LLC/memory is the owner')
      : t(`C${cur.caches.findIndex((c) => c.state === 'V') + 1} 持有唯一的 V`, `C${cur.caches.findIndex((c) => c.state === 'V') + 1} holds the only V`)
  );

  const busNote = $derived.by(() => {
    if (!cur.bus) return t('总线空闲：可以让某个核发请求，或处理已经完成的本地访问。', 'Bus idle: issue a core request, or process a completed local access.');
    if (cur.bus.type === 'Get')
      return cur.llc === 'I'
        ? t('LLC/内存是 owner：由它回 DataResp。', 'The LLC/memory is the owner: it answers with DataResp.')
        : t('某个缓存在 V：由它回 DataResp 并降为 I。', 'A cache holds V: it answers with DataResp and drops to I.');
    if (cur.bus.type === 'DataResp')
      return t('请求者处于 IVD：收到 DataResp 后才能进入 V 并完成原来的 load / store。', 'The requestor is in IVD: only DataResp can move it to V and complete the pending load / store.');
    return t('所有者已经发 Put：内存收到整块数据后，LLC 状态回到 I。', 'The owner has issued Put: once memory takes the block, the LLC state returns to I.');
  });

  function can(a: ViAction): boolean {
    return isLegal(cur, a);
  }

  function play(a: ViAction) {
    if (running) return;
    const r = apply(cur, a);
    if (!r) return;
    history = [...history, r.step];
  }

  function whyDisabled(c: number, kind: 'load' | 'store' | 'evict'): string {
    if (running) return t('正在自动执行', 'auto-running');
    const cache = cur.caches[c];
    if (cache.state === 'IVD') return t('stalled：正在等 DataResp', 'stalled: waiting for DataResp');
    if (cur.bus) return t('总线忙：先让当前事务完成', 'bus busy: finish the current transaction first');
    if (kind === 'evict' && cache.state !== 'V') return t('只有 V 才能发起 Put', 'only a V block can issue Put');
    return '';
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
    let s = initialVi();
    for (const a of actionsFor) {
      await new Promise((r) => setTimeout(r, 620));
      if (token !== runId) return;
      const step = apply(s, a);
      if (!step) break;
      s = step.state;
      history = [...history, step.step];
    }
    running = false;
  }

  const memRespond = $derived(legal.some((a) => a.kind === 'respond' && a.c === 'mem'));
  const handlePut = $derived(legal.some((a) => a.kind === 'handle-put'));
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
        <div
          class="card cache-card"
          class:owner={cache.state === 'V'}
          class:waiting={cache.state === 'IVD'}
        >
          <div class="card-head">
            <span class="card-id mono">C{c + 1}</span>
            <span class="card-name">{t('缓存控制器', 'cache controller')}</span>
            <span class="state-chip" class:i={cache.state === 'I'} class:ivd={cache.state === 'IVD'} class:v={cache.state === 'V'}>
              {cache.state}
            </span>
          </div>

          <div class="data-row">
            <span class="k">{t('数据', 'data')}</span>
            <span class="v mono" class:empty={cache.data === null}>{cache.data === null ? '—' : cache.data}</span>
            {#if cache.pending}
              <span class="pending mono">{cache.pending} {t('挂起', 'pending')}</span>
            {/if}
          </div>

          <div class="ops">
            <button
              class="op-btn"
              disabled={running || !can({ kind: 'core', c, op: 'load' })}
              onclick={() => play({ kind: 'core', c, op: 'load' })}
              title={whyDisabled(c, 'load') || t('从这个核发起 load', 'issue a load from this core')}
            >
              Load A
            </button>
            <button
              class="op-btn"
              disabled={running || !can({ kind: 'core', c, op: 'store' })}
              onclick={() => play({ kind: 'core', c, op: 'store' })}
              title={whyDisabled(c, 'store') || t('从这个核发起 store', 'issue a store from this core')}
            >
              Store A
            </button>
            <button
              class="op-btn ghost"
              disabled={running || !can({ kind: 'evict', c })}
              onclick={() => play({ kind: 'evict', c })}
              title={whyDisabled(c, 'evict') || t('让这条块被换出：发 Put 并回到 I', 'evict this block: issue Put and return to I')}
            >
              Evict
            </button>
          </div>

          {#if can({ kind: 'receive', c })}
            <button class="btn small primary wide" onclick={() => play({ kind: 'receive', c })}>
              {t('接收 DataResp → V', 'Receive DataResp → V')}
            </button>
          {:else if can({ kind: 'respond', c })}
            <button class="btn small primary wide" onclick={() => play({ kind: 'respond', c })}>
              {t('发送 DataResp → I', 'Send DataResp → I')}
            </button>
          {/if}
        </div>
      {/each}
    </div>

    <div class="side">
      <div class="card mem-card">
        <div class="card-head">
          <span class="card-id mono">LLC</span>
          <span class="card-name">{t('内存控制器', 'memory controller')}</span>
          <span class="state-chip llc" class:i={cur.llc === 'I'} class:v={cur.llc === 'V'}>{cur.llc}</span>
        </div>

        <div class="data-row">
          <span class="k">{t('内存值', 'memory')}</span>
          <span class="v mono">{cur.mem}</span>
        </div>

        {#if memRespond}
          <button class="btn small primary wide" onclick={() => play({ kind: 'respond', c: 'mem' })}>
            {t('发送 DataResp → V', 'Send DataResp → V')}
          </button>
        {:else if handlePut}
          <button class="btn small primary wide" onclick={() => play({ kind: 'handle-put' })}>
            {t('写入内存 → I', 'Update memory → I')}
          </button>
        {:else}
          <span class="idle-note">
            {cur.llc === 'I'
              ? t('没有收到 Get：内存是 owner，等待请求。', 'No Get pending: memory is the owner, waiting for a request.')
              : t('V 的副本在某个缓存里：请求由它回答。', 'A cache holds V: that cache answers requests.')}
          </span>
        {/if}
      </div>
    </div>
  </div>

  <div class="status">
    <div class="card bus-card">
      <div class="card-head">
        <span class="card-id mono">BUS</span>
        <span class="card-name">{t('互连总线', 'interconnect bus')}</span>
      </div>
      <span class="bus-msg mono" class:idle={!cur.bus}>{describeBus(cur.bus)}</span>
      <span class="bus-note">{busNote}</span>
    </div>

    <div class="invariant">
      <span class="inv-k">SWMR</span>
      <span class="inv-ok mono">✓</span>
      <span class="inv-text">{swmrText}</span>
    </div>
  </div>

  <div class="track">
    {#if history.length === 0}
      <span class="track-empty">
        {t(
          '从一个核的 Load / Store 开始。miss 会发 Get，块停在 IVD；等 DataResp 到达才能进入 V 并完成原来的访问。',
          'Start with a Load / Store on either core. A miss issues Get and parks the block in IVD; only DataResp can move it to V and finish the access.'
        )}
      </span>
    {:else}
      <div class="track-flow">
        {#each history as h, i}
          <span class="tick" class:mem-tick={h.actor === 'mem'} title={h.action}>
            <i>{i + 1}</i>
            <b class="mono">{h.actor === 'mem' ? 'LLC' : `C${h.actor + 1}`}</b>
            <span class="tick-event mono">{h.event}</span>
            <span class="tick-sep">·</span>
            <span class="tick-state mono">{h.from}→{h.to}</span>
          </span>
          {#if i < history.length - 1}<span class="tick-arrow">›</span>{/if}
        {/each}
      </div>
    {/if}
  </div>

  <div class="result" class:live={!!last}>
    {#if last}
      <span class="res-tag">{last.actor === 'mem' ? 'LLC' : `C${last.actor + 1}`}</span>
      <div class="res-body">
        <strong class="mono">
          {last.event} · {last.from} → {last.to} / {last.action}
        </strong>
        <span>
          {t(
            '每一步都是表 6.2 / 6.3 中的一行：状态、动作与下一条消息全部由协议决定。',
            'Every step is one row of Table 6.2 / 6.3: state, action, and the next message are all fixed by the protocol.'
          )}
        </span>
      </div>
    {:else}
      <span class="res-tag idle">{t('空闲', 'idle')}</span>
      <div class="res-body">
        <strong>{t('协议还没动。', 'The protocol has not moved yet.')}</strong>
        <span>
          {t(
            'VI 只有 I 和 V 两个稳定状态；IVD 是 V 之前的中转。每条 Get 都是原子的：事务期间总线不给别人用。',
            'VI has only two stable states, I and V; IVD is the stopover before V. Each Get is atomic: no other transaction may use the bus while it is in flight.'
          )}
        </span>
      </div>
    {/if}
  </div>

  <div class="legend">
    <span><b class="mk i mono">I</b>{t('无效：没有可用副本', 'invalid: no usable copy')}</span>
    <span><b class="mk ivd mono">IVD</b>{t('等待 DataResp 的中转状态', 'transient: waiting for DataResp')}</span>
    <span><b class="mk v mono">V</b>{t('有效：唯一的可读写副本', 'valid: the only read-write copy')}</span>
    <span class="lg-note">{t('消息只有 Get / DataResp / Put 三种。', 'Only three messages exist: Get, DataResp, Put.')}</span>
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
    grid-template-columns: minmax(0, 1fr) 226px;
    gap: 12px;
  }

  .caches {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
    gap: 10px;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 11px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
    transition: border-color 0.2s var(--ease), background 0.2s var(--ease);
  }

  .cache-card.owner {
    border-color: #cfded9;
    background: var(--accent-soft);
  }

  .cache-card.waiting {
    border-style: dashed;
    border-color: #d9cfba;
  }

  .card-head {
    display: flex;
    align-items: baseline;
    gap: 7px;
  }

  .card-id {
    font-size: 10px;
    color: var(--gold);
  }

  .card-name {
    font-size: 10.5px;
    color: var(--ink-3);
  }

  .state-chip {
    margin-left: auto;
    padding: 0 7px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 500;
    line-height: 1.8;
    border-radius: 5px;
    border: 1px solid transparent;
  }

  .state-chip.i {
    color: #6c665c;
    background: #f1ece1;
    border-color: #e5ddcb;
  }

  .state-chip.ivd {
    color: var(--gold);
    background: #f6eedf;
    border-color: #ecdfc6;
  }

  .state-chip.v {
    color: var(--accent-deep);
    background: rgba(255, 253, 248, 0.9);
    border-color: #cfded9;
  }

  .state-chip.llc {
    color: var(--ink-2);
    background: var(--card);
    border-color: var(--line);
  }

  .data-row {
    display: flex;
    align-items: baseline;
    gap: 7px;
    padding: 5px 8px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 7px;
  }

  .data-row .k {
    font-size: 9.5px;
    color: var(--muted);
  }

  .data-row .v {
    font-size: 12px;
    color: var(--accent-deep);
  }

  .data-row .v.empty {
    color: var(--muted);
  }

  .pending {
    margin-left: auto;
    font-size: 8.5px;
    color: var(--gold);
  }

  .ops {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .op-btn {
    flex: 1;
    min-width: 0;
    padding: 5px 4px;
    font-size: 9.5px;
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

  .wide {
    width: 100%;
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .status {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 226px;
    align-items: stretch;
    gap: 12px;
  }

  .mem-card .idle-note {
    font-size: 9.5px;
    line-height: 1.55;
    color: var(--muted);
  }

  .bus-card {
    background: var(--paper-2);
  }

  .bus-msg {
    font-size: 11px;
    color: var(--accent-deep);
  }

  .bus-msg.idle {
    color: var(--muted);
  }

  .bus-note {
    font-size: 9.5px;
    line-height: 1.55;
    color: var(--muted);
  }

  .invariant {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 6px;
    padding: 8px 10px;
    background: var(--accent-soft);
    border: 1px solid #d5e2dd;
    border-radius: 9px;
  }

  .inv-k {
    font-size: 8.5px;
    font-weight: 600;
    letter-spacing: 0.09em;
    color: var(--accent-deep);
  }

  .inv-ok {
    font-size: 11px;
    color: var(--accent-deep);
  }

  .inv-text {
    flex-basis: 100%;
    font-size: 9.5px;
    line-height: 1.5;
    color: var(--ink-3);
  }

  .track {
    min-height: 36px;
    padding: 8px 10px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .track-empty {
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--muted);
  }

  .track-flow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  .tick {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    padding: 2px 6px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 5px;
  }

  .tick.mem-tick {
    background: var(--paper-2);
    border-style: dashed;
    border-color: #d9cfba;
  }

  .tick i {
    font-size: 8px;
    font-style: normal;
    color: var(--muted);
  }

  .tick b {
    font-size: 9.5px;
    font-weight: 500;
    color: var(--ink-2);
  }

  .tick-event,
  .tick-state {
    font-size: 8.5px;
    color: var(--ink-3);
  }

  .tick-sep {
    font-size: 8.5px;
    color: var(--muted);
  }

  .tick-arrow {
    color: var(--gold);
    font-size: 11px;
  }

  .result {
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .result.live {
    background: var(--accent-soft);
    border-color: #d5e2dd;
  }

  .res-tag {
    flex: none;
    align-self: flex-start;
    padding: 1px 7px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 500;
    color: var(--accent-deep);
    background: rgba(255, 253, 248, 0.85);
    border: 1px solid #cfded9;
    border-radius: 4px;
  }

  .res-tag.idle {
    color: var(--muted);
    background: var(--card);
    border-color: var(--line);
  }

  .res-body strong {
    display: block;
    font-size: 10.5px;
    font-weight: 500;
    color: var(--ink-2);
  }

  .res-body span {
    display: block;
    margin-top: 3px;
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
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

  .mk.i {
    color: #6c665c;
    background: #f1ece1;
    border-color: #e5ddcb;
  }

  .mk.ivd {
    color: var(--gold);
    background: #f6eedf;
    border-color: #ecdfc6;
  }

  .mk.v {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .lg-note {
    flex-basis: 100%;
    color: var(--ink-3);
  }

  @media (max-width: 820px) {
    .board,
    .status {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 560px) {
    .caches {
      grid-template-columns: minmax(0, 1fr);
    }

    .goal {
      width: 100%;
    }

    .lab-bar .actions {
      width: 100%;
      margin-left: 0;
    }
  }
</style>
