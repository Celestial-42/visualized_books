<script lang="ts">
  import {
    MODELS,
    R_PROGRAMS,
    allDone,
    applyPlacement,
    enabled,
    enumerate,
    formatOutcome,
    initialState,
    outcomeKey,
    play,
    predecessors,
    readyChoices,
    settle,
    type FenceState,
    type Model,
    type RPlacement,
    type RProgram,
    type RState,
    type RPid
  } from '../lib/relaxed';
  import { lang, t } from '../lib/lang.svelte';

  const en = $derived(lang.value === 'en');

  let model = $state<Model>('xc');
  let pid = $state<RPid>('sb');
  let fences = $state<FenceState>({ F1: true, F2: true });
  let history = $state<RPlacement[]>([]);
  let running = $state(false);
  let runId = 0;

  const p = $derived(R_PROGRAMS[pid]);
  const modelLabel = $derived(MODELS.find((m) => m.id === model)!.label);
  const modelDef = $derived(MODELS.find((m) => m.id === model)!);
  const hint = $derived(t(modelDef.hint, modelDef.hintEn));
  const totalOps = $derived(
    p.cores.reduce((n, c) => n + c.ops.filter((o) => enabled(o, fences)).length, 0)
  );

  function replay(prog: RProgram, m: Model, f: FenceState, hist: RPlacement[]): RState {
    let s = settle(prog, m, f, initialState(prog));
    for (const h of hist) {
      const nx = applyPlacement(prog, m, f, s, h.core, h.index);
      if (!nx) break;
      s = nx;
    }
    return s;
  }

  const cur = $derived(replay(p, model, fences, history));
  const ready = $derived(readyChoices(p, model, fences, cur));
  const done = $derived(allDone(p, model, fences, cur));
  const outcomes = $derived(enumerate(p, model, fences));
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

  const watchKey = $derived(pid === 'sb' ? '0,0' : pid === 'lb' ? '1,1' : '1,0');

  const goal = $derived(
    pid === 'sb'
      ? t('能不能让 r1 = 0 且 r2 = 0？', 'Can we get both r1 = 0 and r2 = 0?')
      : pid === 'lb'
        ? t('两个 load 能不能都读到 1？', 'Can both loads read 1?')
        : t('r1 已经等到 SET，r2 还能读到 0 吗？', 'r1 already waited for SET — can r2 still read 0?')
  );

  const bothFences = $derived(fences.F1 !== false && fences.F2 !== false);

  const targetKey = $derived(
    pid === 'mp' ? (bothFences ? '1,1' : '1,0') : pid === 'lb' ? (model === 'xc' ? '1,1' : '0,0') : model === 'sc' ? '1,1' : '0,0'
  );
  const targetOutcome = $derived(outcomes.find((o) => o.key === targetKey) ?? outcomes[0]);

  const note = $derived.by(() => {
    if (pid === 'sb') {
      if (model === 'sc')
        return t(
          '(0, 0) 是 0 条。两个核都先写后读，全序里总有一个 load 落在对方的 store 之后。',
          '(0, 0) has zero traces. Both cores write before they read, so in any total order one load lands after the other core\u2019s store.'
        );
      return t(
        '(0, 0) 出现了，因为 store → load 可以重排。SB 只关心 store 何时可见，所以 TSO 与 XC 在这道题上没有区别。',
        '(0, 0) appears because store → load may reorder. SB only cares when a store becomes visible, so TSO and XC agree on this test.'
      );
    }
    if (pid === 'lb') {
      if (model === 'xc')
        return t(
          '(1, 1) 出现了：load → store 在 XC 里默认不保序，两个 load 都可以排到本核 store 之后。这是 TSO 与 XC 真正拉开差距的地方。',
          '(1, 1) appears: XC does not order load → store by default, so both loads may be placed after their own core\u2019s store. This is where TSO and XC truly diverge.'
        );
      return t(
        '(1, 1) 排不出来：load → store 保序，要读到对方的 1，就得让自己的 store 已经落地，四条边首尾相接成环。',
        '(1, 1) cannot be ordered: load → store stays ordered, so reading the other core\u2019s 1 requires your own store to have landed, and the four edges close into a cycle.'
      );
    }
    if (model !== 'xc')
      return t(
        '只有 (1, 1)。SC / TSO 本来就保序，FENCE 在这两个模型下是冗余的。',
        'Only (1, 1). SC / TSO already preserve this order, so FENCE is redundant under those two models.'
      );
    if (bothFences)
      return t(
        '两条 FENCE 都在，(1, 0) 消失：F1 把 data 排在 flag 之前，F2 把 r1 的读排在 r2 的读之前。',
        'Both FENCEs are on and (1, 0) disappears: F1 orders data before flag, and F2 orders the read of r1 before the read of r2.'
      );
    return t(
      '少一条 FENCE，(1, 0) 就回来了：F1 关掉时 data 可以晚于 flag 落地；F2 关掉时第二条 load 可以越过 flag 的 spin。',
      'Remove one FENCE and (1, 0) returns: without F1, data may land after flag; without F2, the second load may pass the spin on flag.'
    );
  });

  function readyHere(c: number, i: number): boolean {
    return ready.some((r) => r.c === c && r.i === i);
  }

  function positionOf(c: number, i: number): number {
    return cur.seq.findIndex((q) => q.core === c && q.index === i);
  }

  function blockedWhy(c: number, i: number): string {
    const op = p.cores[c].ops[i];
    if (op.kind === 'spin') return t('先等某条 store 把 flag 写成 SET', 'wait for a store to set flag = SET');
    const preds = predecessors(p, model, fences, c, i).filter((x) => !cur.placed[x.c][x.i]);
    if (!preds.length) return '';
    const ids = preds.map((x) => x.id).join(en ? ', ' : '、');
    return t(
      `先让 ${ids} 进入 memory order`,
      `first place ${ids} into the memory order`
    );
  }

  function step(c: number, i: number) {
    if (running) return;
    const nx = play(p, model, fences, cur, c, i);
    if (!nx) return;
    history = nx.seq;
  }

  function switchModel(m: Model) {
    runId += 1;
    running = false;
    model = m;
    history = [];
  }

  function switchProgram(id: RPid) {
    runId += 1;
    running = false;
    pid = id;
    history = [];
  }

  function toggleFence(id: string) {
    runId += 1;
    running = false;
    fences = { ...fences, [id]: fences[id] === false };
    history = [];
  }

  function undo() {
    if (running || !history.length) return;
    let cut = history.length;
    while (cut > 0 && history[cut - 1].fence) cut -= 1;
    if (cut > 0) cut -= 1;
    history = history.slice(0, cut);
  }

  function reset() {
    runId += 1;
    running = false;
    history = [];
  }

  async function autoPlay() {
    if (running) return;
    const trace = targetOutcome?.trace;
    if (!trace) return;
    running = true;
    history = [];
    const token = ++runId;
    for (const t of trace) {
      await new Promise((r) => setTimeout(r, 380));
      if (token !== runId) return;
      history = [...history, t];
    }
    running = false;
  }

  function showTrace(trace: RPlacement[] | null) {
    if (!trace || running) return;
    runId += 1;
    running = false;
    history = trace;
  }

  const memKeys = $derived(Object.keys(p.init));
  const hasFences = $derived(p.cores.some((c) => c.ops.some((o) => o.kind === 'fence')));
</script>

<div class="lab">
  <div class="lab-bar">
    <div class="seg">
      {#each MODELS as m}
        <button class:active={model === m.id} onclick={() => switchModel(m.id)}>{m.label}</button>
      {/each}
    </div>
    <div class="seg">
      <button class:active={pid === 'sb'} onclick={() => switchProgram('sb')}>
        <span class="lg">Store Buffering</span><span class="sm">SB</span>
      </button>
      <button class:active={pid === 'lb'} onclick={() => switchProgram('lb')}>
        <span class="lg">Load Buffering</span><span class="sm">LB</span>
      </button>
      <button class:active={pid === 'mp'} onclick={() => switchProgram('mp')}>
        <span class="lg">Message Passing</span><span class="sm">MP</span>
      </button>
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

  <p class="model-hint">
    <b>{modelLabel}</b>
    {#if en}
      orders: {hint}.
    {:else}
      保序的范围：{hint}。
    {/if}
    {#if hasFences && model !== 'xc'}<span class="redundant">{t('此模型下 FENCE 是冗余的。', 'FENCE is redundant under this model.')}</span>{/if}
  </p>

  <div class="board">
    <div class="cores">
      {#each p.cores as core, c}
        <div class="core">
          <div class="core-head">
            <span class="core-id mono">{core.id}</span>
            <span class="core-name">{t(core.name, core.nameEn ?? 'core')}</span>
          </div>

          <div class="ops">
            {#each core.ops as op, j}
              {@const on = fences[op.id] !== false}
              {@const pos = positionOf(c, j)}
              {@const isReady = readyHere(c, j)}
              {#if op.kind === 'fence'}
                <button
                  class="op fence"
                  class:off={!on}
                  class:placed={pos >= 0}
                  onclick={() => toggleFence(op.id)}
                  title={on
                    ? t('点一下关掉这条 FENCE（会重置）', 'Click to turn this FENCE off (resets the trace)')
                    : t('点一下打开这条 FENCE（会重置）', 'Click to turn this FENCE on (resets the trace)')}
                >
                  <span class="op-id mono">{op.id}</span>
                  <span class="op-text mono">FENCE</span>
                  {#if op.note}<span class="op-note">{t(op.note, op.noteEn ?? op.note)}</span>{/if}
                  <span class="switch" class:on>{on ? 'on' : 'off'}</span>
                </button>
              {:else}
                <button
                  class="op"
                  class:ready={isReady}
                  class:placed={pos >= 0}
                  disabled={!isReady || running}
                  onclick={() => step(c, j)}
                  title={pos >= 0
                    ? t(`已在 memory order 的第 ${pos + 1} 位`, `already at position ${pos + 1} in the memory order`)
                    : isReady
                      ? t('把它放进 memory order 的下一位', 'Place it next in the memory order')
                      : blockedWhy(c, j)}
                >
                  <span class="op-id mono">{op.id}</span>
                  <span class="op-text mono">{op.text}</span>
                  {#if op.note}<span class="op-note">{t(op.note, op.noteEn ?? op.note)}</span>{/if}
                  {#if pos >= 0}<span class="pos mono">{pos + 1}</span>{/if}
                </button>
              {/if}
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
            <span class="sv mono" class:pending={!cur.seq.some((q) => q.op.reg === r)}>
              {cur.seq.some((q) => q.op.reg === r) ? cur.regs[r] : '—'}
            </span>
          </div>
        {/each}
      </div>
      <div class="state-foot">
        <span class="mono">{cur.seq.length}</span> / {totalOps} {t('条已进入', 'placed')}
      </div>
    </div>
  </div>

  <div class="track">
    {#if history.length === 0}
      <span class="track-empty">
        {t(
          '点高亮的指令，把它放进 memory order 的下一位。同地址与被 FENCE 夹住的指令会互相挡住，其余随便排。',
          'Click a highlighted instruction to place it next in the memory order. Same-address pairs and anything pinned by a FENCE block each other; everything else is free.'
        )}
      </span>
    {:else}
      <div class="track-flow">
        {#each cur.seq as h, i}
          <span class="tick" class:fence-tick={h.fence} title={`${p.cores[h.core].id} · ${h.op.text}`}>
            <i>{i + 1}</i>
            <b class="mono">{h.fence ? 'FENCE' : h.op.id}</b>
            {#if !h.fence}<span class="tick-core">{p.cores[h.core].id}</span>{/if}
            {#if h.value !== undefined}<span class="tick-val mono">={h.value}</span>{/if}
          </span>
          {#if i < cur.seq.length - 1}<span class="tick-arrow">›</span>{/if}
        {/each}
      </div>
    {/if}
  </div>

  <div class="result" class:ok={done}>
    {#if done}
      <span class="res-tag">{t(`${modelLabel} 合法`, `${modelLabel} legal`)}</span>
      <div class="res-body">
        <strong>{t('你排出的结果：', 'Your outcome: ')}{formatOutcome(p, cur.regs)}</strong>
        <span>
          {#if en}
            Among the {total} memory orders the engine enumerates, this outcome appears {activeCount}
            {activeCount === 1 ? 'time' : 'times'}.
          {:else}
            在引擎枚举的 {total} 条 memory order 中，这个结果出现 {activeCount} 次。
          {/if}
        </span>
      </div>
    {:else}
      <span class="res-tag idle">{t('进行中', 'In progress')}</span>
      <div class="res-body">
        <strong>
          {history.length
            ? t('继续排，直到所有指令都进入 memory order。', 'Keep going until every instruction has entered the memory order.')
            : t('还没开始。', 'Not started yet.')}
        </strong>
        <span>
          {t(
            'load 读到的值由它前面的 store 决定；同地址的 store / load 与 FENCE 会约束排版顺序，其余组合由你决定。',
            'A load reads from the nearest store before it; same-address pairs and FENCE constrain the layout, and you choose everything else.'
          )}
        </span>
      </div>
    {/if}
  </div>

  <div class="outcomes">
    <div class="outcomes-head">
      <span class="oh-title">{t(`${modelLabel} 允许的全部结果`, `All outcomes allowed by ${modelLabel}`)}</span>
      <span class="oh-sub">
        {t(
          `穷举 ${total} 条 memory order，按寄存器结果去重 · 点卡片可回放`,
          `enumerates ${total} memory orders, deduplicated by register result · click a card to replay`
        )}
      </span>
    </div>
    <div class="ogrid">
      {#each grid as g}
        <button
          class="ocard"
          class:zero={g.count === 0}
          class:active={g.key === activeKey}
          class:watch={g.key === watchKey}
          disabled={!g.trace || running}
          onclick={() => showTrace(g.trace)}
        >
          <span class="oc-regs mono">
            {#each p.regs as r, i}
              <span class="oc-r">{r}=<b>{g.vals[i]}</b></span>
            {/each}
          </span>
          <span class="oc-count mono">{g.count} {t('条', g.count === 1 ? 'trace' : 'traces')}</span>
          <span class="oc-flag">
            {g.count === 0
              ? t('不可达', 'unreachable')
              : g.key === watchKey
                ? t('看点', 'watch')
                : t('可回放', 'replay')}
          </span>
        </button>
      {/each}
    </div>
    <p class="oh-note">{note}</p>
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

  .sm {
    display: none;
  }

  .model-hint {
    margin: -2px 0 0;
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--muted);
  }

  .model-hint b {
    font-weight: 600;
    color: var(--ink-3);
  }

  .redundant {
    margin-left: 4px;
    color: var(--ember);
  }

  .board {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 198px;
    gap: 12px;
  }

  .cores {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
    gap: 10px;
  }

  .core {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .core-head {
    display: flex;
    align-items: baseline;
    gap: 7px;
  }

  .core-id {
    font-size: 10px;
    color: var(--gold);
  }

  .core-name {
    font-size: 10.5px;
    color: var(--ink-3);
  }

  .ops {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .op {
    display: flex;
    align-items: baseline;
    gap: 7px;
    padding: 7px 9px;
    text-align: left;
    background: var(--card);
    border: 1px solid transparent;
    border-radius: 8px;
    transition: border-color 0.2s var(--ease), background 0.2s var(--ease), box-shadow 0.2s var(--ease), opacity 0.2s var(--ease);
  }

  .op.ready {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(47, 93, 98, 0.1);
  }

  .op.ready:hover {
    background: #f4f8f6;
  }

  .op.placed {
    background: transparent;
    opacity: 0.52;
  }

  .op.fence {
    border-style: dashed;
    border-color: var(--line);
    background: var(--paper-2);
  }

  .op.fence.off {
    opacity: 0.45;
  }

  .op:disabled {
    cursor: default;
  }

  .op:disabled:not(.ready) {
    opacity: 0.5;
  }

  .op.fence.placed {
    border-color: var(--gold);
    opacity: 0.62;
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
    font-size: 8.5px;
    color: var(--muted);
    white-space: nowrap;
  }

  .switch {
    flex: none;
    padding: 0 5px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    color: var(--muted);
    background: var(--paper-3);
    border-radius: 4px;
  }

  .switch.on {
    color: var(--accent-deep);
    background: var(--accent-soft);
  }

  .pos {
    flex: none;
    margin-left: auto;
    padding: 0 5px;
    font-size: 8.5px;
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-radius: 4px;
  }

  .state {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-content: start;
    gap: 11px 10px;
    padding: 10px 11px;
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
    grid-column: 1 / -1;
    padding-top: 2px;
    border-top: 1px solid var(--line-2);
    font-size: 9.5px;
    line-height: 1.5;
    color: var(--muted);
  }

  .state-foot .mono {
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

  .tick.fence-tick {
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

  .tick-core {
    font-size: 8.5px;
    color: var(--gold);
  }

  .tick-val {
    font-size: 9px;
    color: var(--accent-deep);
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
    padding-top: 13px;
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

  .ocard.zero.watch {
    border-color: var(--ember);
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

  .ocard.watch:not(.zero) .oc-flag {
    color: var(--accent-deep);
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
    .lg {
      display: none;
    }

    .sm {
      display: inline;
    }

    .goal {
      width: 100%;
    }

    .lab-bar .actions {
      width: 100%;
      margin-left: 0;
    }

    .cores {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
