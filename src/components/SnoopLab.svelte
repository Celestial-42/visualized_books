<script lang="ts">
  import {
    S_SCENARIOS,
    applyS,
    initialS,
    stateLabel,
    validS,
    type SOp,
    type SScenario,
    type SState,
    type SSystem,
    type SEvent
  } from '../lib/snoop';
  import { lang, t } from '../lib/lang.svelte';

  type Sid = SScenario['id'];

  const en = $derived(lang.value === 'en');

  let scenario = $state<Sid>('share');
  let history = $state<SSystem[]>([]);
  let running = $state(false);
  let runId = 0;

  const scenarios = $derived([
    {
      id: 'share' as Sid,
      label: t('共享读', 'Share a read'),
      hint: t(
        '两个核先后读同一块：第一个拿到干净的 E，第二个把它降为 S。',
        'Two cores read the same block: the first gets a clean E, the second demotes it to S.'
      )
    },
    {
      id: 'silent' as Sid,
      label: t('静默升级', 'Silent upgrade'),
      hint: t(
        '先读后写：E 已经独占，store 直接变 M，总线上一个字都不用发。',
        'Read then write: E is already exclusive, so the store becomes M without a single bus transaction.'
      )
    },
    {
      id: 'upgrade' as Sid,
      label: t('升级作废', 'Upgrade & invalidate'),
      hint: t(
        '两个核都在 S 时写：必须发 BusUpgr 收走对方副本，数据不用搬。',
        'Writing while both copies are S: BusUpgr takes the other copy away; no data moves.'
      )
    },
    {
      id: 'migrate' as Sid,
      label: t('所有权迁移', 'Migrate ownership'),
      hint: t(
        '写者把块带到另一个核：先是 M 的 cache-to-cache 传输，再是新主人的 BusUpgr。',
        'A writer pulls the block to another core: first a cache-to-cache transfer from M, then a BusUpgr by the new owner.'
      )
    },
    {
      id: 'evict' as Sid,
      label: t('脏块驱逐', 'Evict dirty'),
      hint: t(
        'M 块被换出：必须发 PutM 把数据写回，否则新值就丢了。',
        'Evicting an M block requires PutM; otherwise the new value would be lost.'
      )
    }
  ]);

  const current = $derived(scenarios.find((s) => s.id === scenario)!);
  const opsFor = $derived(S_SCENARIOS.find((s) => s.id === scenario)!.ops);
  const cur = $derived(history.length ? history[history.length - 1] : initialS());
  const lastGroup = $derived(cur.groups.length ? cur.groups[cur.groups.length - 1] : null);
  const lastBus = $derived.by(() => {
    if (!lastGroup) return null;
    for (let i = lastGroup.events.length - 1; i >= 0; i--) {
      const e = lastGroup.events[i];
      if (e.type === 'bus') return e;
    }
    return null;
  });
  const ok = $derived(validS(cur));

  function opText(op: SOp): string {
    const name = op.kind === 'load' ? t('读', 'load') : op.kind === 'store' ? t('写', 'store') : t('驱逐', 'evict');
    return `C${op.c + 1} ${name}`;
  }

  function evText(e: SEvent): string {
    switch (e.type) {
      case 'hit':
        return t(`命中 ${e.state}，无需总线`, `hit ${e.state}, no bus needed`);
      case 'bus':
        return `${e.name} · ${t(`由 C${e.c + 1} 发出`, `issued by C${e.c + 1}`)}`;
      case 'data': {
        const from = e.from === 'mem' ? 'LLC' : `C${e.from + 1}`;
        const extra = e.from === 'mem' ? '' : t('（cache-to-cache）', ' (cache-to-cache)');
        return `${from} → C${e.to + 1} · data ${e.value}${extra}`;
      }
      case 'wb':
        return t(`C${e.c + 1} 写回 mem = ${e.value}`, `C${e.c + 1} writes back mem = ${e.value}`);
      case 'inval':
        return t(`C${e.c + 1} 副本作废 → I`, `C${e.c + 1} invalidated → I`);
      case 'silent':
        return e.what === 'upgrade'
          ? t('E → M（静默升级，无总线事务）', 'E → M (silent upgrade, no bus transaction)')
          : t('静默驱逐（干净块，无需写回）', 'silent eviction (clean block, no writeback)');
      case 'write':
        return t(`写入 data = ${e.value}`, `write data = ${e.value}`);
    }
  }

  function play(op: SOp) {
    if (running) return;
    const r = applyS(cur, op);
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
    let s = initialS();
    for (const op of opsFor) {
      await new Promise((r) => setTimeout(r, 760));
      if (token !== runId) return;
      const r = applyS(s, op);
      if (!r) continue;
      s = r.next;
      history = [...history, s];
    }
    running = false;
  }

  function chipClass(st: SState): string {
    return st.toLowerCase();
  }
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
        <div class="card cache-card" class:owned={cache.state === 'M'} class:clean-excl={cache.state === 'E'}>
          <div class="card-head">
            <span class="card-id mono">C{c + 1}</span>
            <span class="card-name">{t('缓存控制器', 'cache controller')}</span>
            <span class="state-chip {chipClass(cache.state)}">{cache.state}</span>
          </div>

          <div class="data-row">
            <span class="k">{t('副本数据', 'cached data')}</span>
            <span class="v mono" class:empty={cache.data === null}>{cache.data === null ? '—' : cache.data}</span>
            <span class="sem">{en ? stateLabel(cache.state).en : stateLabel(cache.state).zh}</span>
          </div>

          <div class="ops">
            <button class="op-btn" disabled={running} onclick={() => play({ kind: 'load', c })}>
              Load A
            </button>
            <button class="op-btn" disabled={running} onclick={() => play({ kind: 'store', c })}>
              Store A
            </button>
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

    <div class="side">
      <div class="card mem-card">
        <div class="card-head">
          <span class="card-id mono">LLC</span>
          <span class="card-name">{t('内存 / LLC', 'memory / LLC')}</span>
          <span class="state-chip llc">MEM</span>
        </div>
        <div class="data-row">
          <span class="k">{t('内存值', 'memory value')}</span>
          <span class="v mono">{cur.mem}</span>
        </div>
        <span class="idle-note">
          {t(
            '只有 M 块被驱逐，或 M 向别人供数时才写回；S / E 的驱逐是静默的。',
            'Memory is updated only by a PutM or when an M copy supplies data; evicting S / E is silent.'
          )}
        </span>
      </div>
    </div>
  </div>

  <div class="busbar" class:pulse={!!lastBus}>
    <span class="bus-k mono">BUS</span>
    <span class="bus-order">{t('serialization point', 'serialization point')}</span>
    <span class="bus-now mono">
      {#if lastBus}
        {lastBus.name} · C{lastBus.c + 1}
      {:else if lastGroup}
        {t('本轮无总线事务', 'no bus transaction')}
      {:else}
        {t('总线空闲', 'bus idle')}
      {/if}
    </span>
    <span class="inv" class:bad={!ok}>
      {ok ? 'SWMR ✓ · data value ✓' : 'SWMR ✗'}
    </span>
  </div>

  <div class="stats">
    <div class="stat"><span>{t('总线事务', 'bus transactions')}</span><b class="mono">{cur.reqs}</b></div>
    <div class="stat"><span>{t('数据搬运', 'data transfers')}</span><b class="mono">{cur.transfers}</b></div>
    <div class="stat"><span>{t('静默操作', 'silent ops')}</span><b class="mono">{cur.silent}</b></div>
  </div>

  <div class="log">
    {#if !cur.groups.length}
      <span class="log-empty">
        {t(
          '从任意一个核的 Load / Store 开始。每个动作都会立即走完整个总线事务，下方日志列出它实际发出的消息。',
          'Start with a Load / Store on either core. Each action runs the whole bus transaction at once; the log below lists the messages it actually sent.'
        )}
      </span>
    {:else}
      <div class="log-head">
        <span>{t('总线日志', 'bus log')}</span>
        <span class="log-note">{t('最新一组在最下方', 'newest group at the bottom')}</span>
      </div>
      <div class="log-list">
        {#each cur.groups.slice(-6) as g, i}
          <div class="log-group" class:last={i === cur.groups.slice(-6).length - 1}>
            <span class="log-no mono">{String(cur.groups.length - Math.min(6, cur.groups.length) + i + 1).padStart(2, '0')}</span>
            <div class="log-body">
              <strong>{opText(g.op)}</strong>
              {#each g.events as e}
                <span class="log-ev mono" class:bus-ev={e.type === 'bus'}>{evText(e)}</span>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="legend">
    <span><b class="mk i mono">I</b>{t('无效', 'invalid')}</span>
    <span><b class="mk s mono">S</b>{t('共享、干净', 'shared, clean')}</span>
    <span><b class="mk e mono">E</b>{t('独占、干净', 'exclusive, clean')}</span>
    <span><b class="mk m mono">M</b>{t('独占、脏', 'exclusive, dirty')}</span>
    <span class="lg-note">
      {t(
        'BusRd 取只读副本；BusUpgr 只收权限、不搬数据；BusRdX 取读写权限；PutM 把脏块写回。',
        'BusRd fetches a read-only copy; BusUpgr takes permission without data; BusRdX takes read-write permission; PutM writes a dirty block back.'
      )}
    </span>
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

  .cache-card.owned {
    border-color: #e3cbbf;
    background: #fbf3ee;
  }

  .cache-card.clean-excl {
    border-color: #cfded9;
    background: var(--accent-soft);
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
    min-width: 22px;
    padding: 0 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
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

  .state-chip.e {
    color: var(--accent-deep);
    background: rgba(255, 253, 248, 0.9);
    border-color: #cfded9;
  }

  .state-chip.m {
    color: #a3523b;
    background: #f9e9e2;
    border-color: #ecd3c7;
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

  .data-row .sem {
    margin-left: auto;
    font-size: 8.5px;
    color: var(--muted);
    text-align: right;
  }

  .ops {
    display: flex;
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

  .side {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .mem-card {
    background: var(--paper-2);
  }

  .idle-note {
    font-size: 9.5px;
    line-height: 1.55;
    color: var(--muted);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .stat {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 9px;
    font-size: 9.5px;
    color: var(--ink-3);
  }

  .stat b {
    font-size: 12px;
    font-weight: 500;
    color: var(--accent-deep);
  }

  .busbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: linear-gradient(var(--paper-2), var(--paper-2)) padding-box;
    border: 1px solid var(--line);
    border-radius: 10px;
    position: relative;
  }

  .busbar::before {
    content: '';
    position: absolute;
    left: 12px;
    right: 12px;
    top: 50%;
    border-top: 1px dashed #ddd3bf;
  }

  .busbar > * {
    position: relative;
    background: var(--paper-2);
    padding-right: 8px;
  }

  .busbar .inv {
    margin-left: auto;
    padding: 0 0 0 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: var(--accent-deep);
  }

  .busbar .inv.bad {
    color: var(--ember);
  }

  .busbar.pulse {
    border-color: #cfded9;
  }

  .bus-k {
    font-size: 9px;
    letter-spacing: 0.08em;
    color: var(--gold);
  }

  .bus-order {
    font-size: 8.5px;
    color: var(--muted);
  }

  .bus-now {
    font-size: 9.5px;
    color: var(--accent-deep);
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
    max-height: 188px;
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
    gap: 3px 9px;
    min-width: 0;
  }

  .log-body strong {
    min-width: 58px;
    font-size: 9.5px;
    font-weight: 600;
    color: var(--ink-2);
  }

  .log-ev {
    font-size: 9px;
    color: var(--ink-3);
  }

  .log-ev.bus-ev {
    color: var(--accent-deep);
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

  .mk.s {
    color: #8a6a2f;
    background: #f7efdf;
    border-color: #ecdfc6;
  }

  .mk.e {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .mk.m {
    color: #a3523b;
    background: #f9e9e2;
    border-color: #ecd3c7;
  }

  .lg-note {
    flex-basis: 100%;
    color: var(--ink-3);
  }

  @media (max-width: 820px) {
    .board {
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

    .bus-order {
      display: none;
    }

    .sem {
      display: none;
    }

    .stats {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
