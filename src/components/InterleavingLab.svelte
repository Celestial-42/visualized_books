<script lang="ts">
  import {
    PROGRAMS,
    allDone,
    enumerate,
    formatOutcome,
    initialState,
    isDone,
    outcomeKey,
    step,
    type Program,
    type State,
    type Step
  } from '../lib/litmus';
  import { lang, t } from '../lib/lang.svelte';

  const en = $derived(lang.value === 'en');

  let pid = $state<'sb' | 'mp'>('sb');
  let history = $state<Step[]>([]);
  let running = $state(false);
  let runId = 0;

  const p = $derived(PROGRAMS[pid]);

  function replay(prog: Program, hist: Step[]): State {
    let s = initialState(prog);
    for (const h of hist) {
      const r = step(prog, s, h.core);
      if (!r) break;
      s = r.state;
    }
    return s;
  }

  const cur = $derived(replay(p, history));
  const done = $derived(allDone(p, cur));
  const outcomes = $derived(enumerate(p));
  const total = $derived(outcomes.reduce((n, o) => n + o.count, 0));

  function combos(n: number, vals: number[] = [0, 1], acc: number[] = []): number[][] {
    if (acc.length === n) return [acc];
    return vals.flatMap((v) => combos(n, vals, [...acc, v]));
  }

  const grid = $derived(
    combos(p.regs.length).map((vals) => {
      const key = vals.join(',');
      const hit = outcomes.find((o) => o.key === key);
      return { key, vals, count: hit?.count ?? 0, trace: hit?.trace ?? null };
    })
  );

  const activeKey = $derived(done ? outcomeKey(p, cur.regs) : '');
  const activeCount = $derived(outcomes.find((o) => o.key === activeKey)?.count ?? 0);
  const missing = $derived(grid.filter((g) => g.count === 0));

  const goal = $derived(
    pid === 'sb'
      ? t('能不能让 r1 = 0 且 r2 = 0？', 'Can we get both r1 = 0 and r2 = 0?')
      : t('C2 能不能在 flag 发布前读到 data？', 'Can C2 read data before flag is published?')
  );

  function play(c: number) {
    if (running) return;
    const r = step(p, cur, c, history.length + 1);
    if (!r) return;
    history = [...history, r.step];
  }

  function switchProgram(id: 'sb' | 'mp') {
    runId += 1;
    running = false;
    pid = id;
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
    const trace = outcomes[0]?.trace;
    if (!trace) return;
    running = true;
    history = [];
    const token = ++runId;
    for (const t of trace) {
      await new Promise((r) => setTimeout(r, 500));
      if (token !== runId) return;
      history = [...history, t];
    }
    running = false;
  }

  function showTrace(trace: Step[] | null) {
    if (!trace || running) return;
    runId += 1;
    history = trace;
  }

  const memKeys = $derived(Object.keys(p.init));
</script>

<div class="lab">
  <div class="lab-bar">
    <div class="seg">
      <button class:active={pid === 'sb'} onclick={() => switchProgram('sb')}>Store Buffering</button>
      <button class:active={pid === 'mp'} onclick={() => switchProgram('mp')}>Message Passing</button>
    </div>
    <span class="goal">{goal}</span>
    <div class="actions">
      <button class="btn small" disabled={running || !history.length} onclick={undo}>{t('撤销', 'Undo')}</button>
      <button class="btn small primary" disabled={running || done} onclick={autoPlay}>
        {running ? t('执行中…', 'Running…') : t('自动排一个', 'Auto-schedule')}
      </button>
      <button class="btn small ghost" disabled={running} onclick={reset}>{t('重来', 'Reset')}</button>
    </div>
  </div>

  <div class="board">
    <div class="cores">
      {#each p.cores as core, c}
        <div class="core" class:halted={isDone(p, cur, c)}>
          <div class="core-head">
            <span class="core-id mono">{core.id}</span>
            <span class="core-name">{t(core.name, core.nameEn ?? 'core')}</span>
            {#if isDone(p, cur, c)}<span class="halt">halt</span>{/if}
          </div>
          <div class="ops">
            {#each core.ops as op, j}
              {@const current = cur.pc[c] === j && !isDone(p, cur, c)}
              {@const past = j < cur.pc[c]}
              <button
                class="op"
                class:current
                class:past
                disabled={!current || running}
                onclick={() => play(c)}
                title={current
                  ? t('执行这条指令', 'Execute this instruction')
                  : past
                    ? t('已执行', 'Already executed')
                    : t('必须按程序顺序，先执行上面那条', 'Program order: execute the instruction above first')}
              >
                <span class="op-id mono">{op.id}</span>
                <span class="op-text mono">{op.text}</span>
                {#if op.note}<span class="op-note">{t(op.note, op.noteEn ?? op.note)}</span>{/if}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="state">
      <div class="state-block">
        <span class="state-k">{t('内存', 'Memory')}</span>
        {#each memKeys as k}
          <div class="state-row">
            <span class="sk mono">{k}</span>
            <span class="sv mono">{cur.mem[k] ?? 0}</span>
          </div>
        {/each}
      </div>
      <div class="state-block">
        <span class="state-k">{t('寄存器', 'Registers')}</span>
        {#each p.regs as r}
          <div class="state-row">
            <span class="sk mono">{r}</span>
            <span class="sv mono" class:pending={!done && !history.some((h) => h.op.reg === r)}>
              {history.some((h) => h.op.reg === r) ? cur.regs[r] : '—'}
            </span>
          </div>
        {/each}
      </div>
      <div class="state-foot">
        <span class="mono">{history.length}</span> {t('步 · 顺序由你决定', 'steps · the order is yours')}
      </div>
    </div>
  </div>

  <div class="track">
    {#if history.length === 0}
      <span class="track-empty">{t(
        '点某个核的当前指令（带描边的那条），把它放到全序的下一位。同一核内不能跳序。',
        'Click the outlined instruction of either core to place it next in the total order. A core may not skip ahead of itself.'
      )}</span>
    {:else}
      <div class="track-flow">
        {#each history as h, i}
          <span class="tick" title={`${p.cores[h.core].id} · ${h.op.text}`}>
            <i>{i + 1}</i>
            <b class="mono">{h.op.id}</b>
            <span class="tick-core">{p.cores[h.core].id}</span>
          </span>
          {#if i < history.length - 1}<span class="tick-arrow">›</span>{/if}
        {/each}
      </div>
    {/if}
  </div>

  <div class="result" class:ok={done}>
    {#if done}
      <span class="res-tag">{t('SC 合法', 'SC legal')}</span>
      <div class="res-body">
        <strong>{t('你排出的结果：', 'Your outcome: ')}{formatOutcome(p, cur.regs)}</strong>
        {#if en}
          <span>
            It appears {activeCount} times among the {total} legal interleavings enumerated by the engine{#if missing.length};
            {missing.length} other outcome{missing.length === 1 ? '' : 's'} never appear at all — see the cards below{/if}.
          </span>
        {:else}
          <span>
            在引擎枚举的 {total} 条合法交错中，这个结果出现 {activeCount} 次
            {#if missing.length}；另有 {missing.length} 个结果一条都没有出现，见下面的结果卡片{/if}。
          </span>
        {/if}
      </div>
    {:else}
      <span class="res-tag idle">{t('进行中', 'In progress')}</span>
      <div class="res-body">
        <strong>{history.length
          ? t('继续排，直到两个核都 halt。', 'Keep going until both cores halt.')
          : t('还没开始。', 'Not started yet.')}</strong>
        <span>{t(
          'SC 只要求存在这样一个全序：每核保持自己的程序顺序，load 读到全序上最近一次写。你正在构造它。',
          'SC asks only that some total order exists in which each core keeps its program order and every load reads the most recent write in that order. You are building it.'
        )}</span>
      </div>
    {/if}
  </div>

  <div class="outcomes">
    <div class="outcomes-head">
      <span class="oh-title">{t('SC 允许的全部结果', 'Every outcome SC allows')}</span>
      <span class="oh-sub">{t(
        `引擎穷举了 ${total} 条交错，按寄存器结果去重 · 点卡片可回放`,
        `The engine enumerated ${total} interleavings and deduplicated by register outcome · click a card to replay`
      )}</span>
    </div>
    <div class="ogrid">
      {#each grid as g}
        <button
          class="ocard"
          class:zero={g.count === 0}
          class:active={g.key === activeKey}
          disabled={!g.trace || running}
          onclick={() => showTrace(g.trace)}
        >
          <span class="oc-regs mono">
            {#each p.regs as r, i}
              <span class="oc-r">{r}=<b>{g.vals[i]}</b></span>
            {/each}
          </span>
          <span class="oc-count mono">{g.count} {t('条', g.count === 1 ? 'trace' : 'traces')}</span>
          <span class="oc-flag">{g.count === 0 ? t('不可达', 'unreachable') : t('可回放', 'replay')}</span>
        </button>
      {/each}
    </div>
    <p class="oh-note">
      {#if pid === 'sb'}
        {t(
          '(0, 0) 永远是 0 条。这不是概率小，而是不存在：两个核都先写后读，全序无论怎么切，总有一个读会落在对方的写之后。',
          '(0, 0) is always zero traces. This is not unlikely \u2014 it is nonexistent. Both cores write before they read, so however you cut the total order, one read must land after the other core\u2019s write.'
        )}
      {:else}
        {t(
          '只有 (1, 1) 可达。C2 的 spin 保证它不会越过 flag，而 data 又一定排在 flag 之前——这就是 message passing 在 SC 下成立的原因。',
          'Only (1, 1) is reachable. C2\u2019s spin keeps it from moving past flag, and data is always ordered before flag \u2014 that is why message passing holds under SC.'
        )}
      {/if}
    </p>
  </div>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 14px;
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

  @media (max-width: 560px) {
    .goal {
      width: 100%;
    }

    .lab-bar .actions {
      width: 100%;
      margin-left: 0;
    }
  }

  .board {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 178px;
    gap: 14px;
  }

  .cores {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .core {
    padding: 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .core.halted {
    background: #f7f4ec;
  }

  .core-head {
    display: flex;
    align-items: baseline;
    gap: 7px;
    margin-bottom: 8px;
  }

  .core-id {
    font-size: 10px;
    color: var(--gold);
  }

  .core-name {
    font-size: 10.5px;
    color: var(--ink-3);
  }

  .halt {
    margin-left: auto;
    padding: 0 5px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    color: var(--muted);
    background: var(--paper-3);
    border-radius: 4px;
  }

  .ops {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .op {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 7px 9px;
    text-align: left;
    background: var(--card);
    border: 1px solid transparent;
    border-radius: 8px;
    transition: border-color 0.2s var(--ease), background 0.2s var(--ease), box-shadow 0.2s var(--ease);
  }

  .op.current {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(47, 93, 98, 0.1);
  }

  .op.current:hover {
    background: #f4f8f6;
  }

  .op.past {
    background: transparent;
    opacity: 0.5;
  }

  .op:disabled {
    cursor: default;
  }

  .op:disabled:not(.current) {
    opacity: 0.52;
  }

  .op-id {
    flex: none;
    font-size: 9px;
    color: var(--gold);
  }

  .op-text {
    font-size: 10.5px;
    color: var(--ink-2);
  }

  .op-note {
    margin-left: auto;
    font-size: 9px;
    color: var(--muted);
  }

  .state {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 11px 12px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .state-block {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .state-k {
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .state-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 3px 7px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 6px;
  }

  .sk {
    font-size: 10px;
    color: var(--ink-3);
  }

  .sv {
    font-size: 11px;
    color: var(--accent-deep);
  }

  .sv.pending {
    color: var(--muted);
  }

  .state-foot {
    margin-top: auto;
    font-size: 10px;
    color: var(--muted);
  }

  .state-foot .mono {
    color: var(--ink-3);
  }

  .track {
    min-height: 34px;
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

  .tick-core {
    font-size: 8.5px;
    color: var(--gold);
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

  .result.ok {
    background: var(--accent-soft);
    border-color: #d5e2dd;
  }

  .res-tag {
    flex: none;
    align-self: flex-start;
    padding: 1px 7px;
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
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ink-2);
  }

  .res-body span {
    display: block;
    margin-top: 2px;
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .outcomes {
    padding-top: 14px;
    border-top: 1px solid var(--line-2);
  }

  .outcomes-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    margin-bottom: 10px;
  }

  .oh-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-3);
  }

  .oh-sub {
    font-size: 10.5px;
    color: var(--muted);
  }

  .ogrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .ocard {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 9px 10px;
    text-align: left;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 9px;
    transition: border-color 0.2s var(--ease), background 0.2s var(--ease);
  }

  .ocard:hover:not(:disabled) {
    border-color: #d5c8ae;
    background: var(--card);
  }

  .ocard.active {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .ocard.zero {
    background: #fbf2ec;
    border-color: #eed8ce;
  }

  .ocard:disabled {
    cursor: default;
  }

  .oc-regs {
    display: flex;
    gap: 8px;
    font-size: 9.5px;
    color: var(--muted);
  }

  .oc-r b {
    margin-left: 2px;
    font-weight: 500;
    color: var(--ink-2);
  }

  .ocard.zero .oc-r b {
    color: var(--ember);
  }

  .oc-count {
    font-size: 11px;
    color: var(--ink-2);
  }

  .oc-flag {
    font-size: 9px;
    color: var(--muted);
  }

  .ocard.zero .oc-flag {
    color: var(--ember);
  }

  .oh-note {
    margin-top: 9px;
    font-size: 10.5px;
    line-height: 1.65;
    color: var(--muted);
  }

  @media (max-width: 780px) {
    .board {
      grid-template-columns: minmax(0, 1fr);
    }

    .ogrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 560px) {
    .cores {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
