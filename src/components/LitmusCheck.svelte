<script lang="ts">
  import { lang, t } from '../lib/lang.svelte';

  type TestId = 'mp' | 'sb' | 'corr';
  type Model = 'sc' | 'tso' | 'relaxed';
  type NodeId = 'S1' | 'S2' | 'L1' | 'L2';

  const en = $derived(lang.value === 'en');

  type Outcome = { a: string; b: string; sc: boolean; tso: boolean; relaxed: boolean };

  type Test = {
    id: TestId;
    label: string;
    c1: { op: string; note: string }[];
    c2: { op: string; note: string }[];
    outcomes: Outcome[];
    nodes: Partial<Record<NodeId, { x: number; y: number; label: string; sub: string }>>;
  };

  const tests: Test[] = [
    {
      id: 'mp',
      label: 'MP',
      c1: [
        { op: 'S1: data = 1', note: 'store' },
        { op: 'S2: flag = 1', note: 'store' }
      ],
      c2: [
        { op: 'L1: r1 = flag', note: 'load' },
        { op: 'L2: r2 = data', note: 'load' }
      ],
      outcomes: [
        { a: '0', b: '0', sc: true, tso: true, relaxed: true },
        { a: '0', b: '1', sc: true, tso: true, relaxed: true },
        { a: '1', b: '1', sc: true, tso: true, relaxed: true },
        { a: '1', b: '0', sc: false, tso: false, relaxed: true }
      ],
      nodes: {
        S1: { x: 110, y: 80, label: 'S1', sub: 'data = 1' },
        S2: { x: 110, y: 220, label: 'S2', sub: 'flag = 1' },
        L1: { x: 410, y: 80, label: 'L1', sub: 'r1 = flag' },
        L2: { x: 410, y: 220, label: 'L2', sub: 'r2 = data' }
      }
    },
    {
      id: 'sb',
      label: 'SB',
      c1: [
        { op: 'S1: x = 1', note: 'store' },
        { op: 'L1: r1 = y', note: 'load' }
      ],
      c2: [
        { op: 'S2: y = 1', note: 'store' },
        { op: 'L2: r2 = x', note: 'load' }
      ],
      outcomes: [
        { a: '0', b: '0', sc: false, tso: true, relaxed: true },
        { a: '0', b: '1', sc: true, tso: true, relaxed: true },
        { a: '1', b: '0', sc: true, tso: true, relaxed: true },
        { a: '1', b: '1', sc: true, tso: true, relaxed: true }
      ],
      nodes: {
        S1: { x: 110, y: 80, label: 'S1', sub: 'x = 1' },
        L1: { x: 110, y: 220, label: 'L1', sub: 'r1 = y' },
        S2: { x: 410, y: 80, label: 'S2', sub: 'y = 1' },
        L2: { x: 410, y: 220, label: 'L2', sub: 'r2 = x' }
      }
    },
    {
      id: 'corr',
      label: 'CoRR',
      c1: [{ op: 'S1: x = 1', note: 'store' }],
      c2: [
        { op: 'L1: r1 = x', note: 'load' },
        { op: 'L2: r2 = x', note: 'load' }
      ],
      outcomes: [
        { a: '0', b: '0', sc: true, tso: true, relaxed: true },
        { a: '0', b: '1', sc: true, tso: true, relaxed: true },
        { a: '1', b: '1', sc: true, tso: true, relaxed: true },
        { a: '1', b: '0', sc: false, tso: false, relaxed: false }
      ],
      nodes: {
        S1: { x: 110, y: 150, label: 'S1', sub: 'x = 1' },
        L1: { x: 410, y: 80, label: 'L1', sub: 'r1 = x' },
        L2: { x: 410, y: 220, label: 'L2', sub: 'r2 = x' }
      }
    }
  ];

  let testId = $state<TestId>('mp');
  let model = $state<Model>('sc');
  let outcomeIdx = $state(3);

  const test = $derived(tests.find((x) => x.id === testId)!);
  const outcome = $derived(test.outcomes[outcomeIdx] ?? test.outcomes[0]);
  const allowed = $derived(
    model === 'sc' ? outcome.sc : model === 'tso' ? outcome.tso : outcome.relaxed
  );

  function questionFor(id: TestId): string {
    if (id === 'mp') return t('C2 看到 flag 后，是否必然看到 data？', 'Must C2 see data after it sees the flag?');
    if (id === 'sb') return t('两个核各自先写后读，能否都读到旧值？', 'Can both cores read the old value after writing?');
    return t('同一个核读到新值后，另一个核还能读到更旧的值吗？', 'After one core reads a new value, may another read an older one?');
  }

  function pick(id: TestId) {
    testId = id;
    outcomeIdx = id === 'mp' ? 3 : id === 'sb' ? 0 : 3;
  }

  const nodes = $derived.by(() => {
    const arr = Object.entries(test.nodes).map(([id, n]) => ({ id: id as NodeId, ...n }));
    return arr;
  });

  type Edge = { from: NodeId; to: NodeId; kind: 'po' | 'rf' | 'fr' | 'co'; label: string };

  const edges = $derived.by(() => {
    const out: Edge[] = [];
    if (testId === 'mp') {
      out.push({ from: 'S1', to: 'S2', kind: 'po', label: 'po' });
      out.push({ from: 'L1', to: 'L2', kind: 'po', label: 'po' });
      out.push({ from: outcome.a === '1' ? 'S2' : 'L1', to: outcome.a === '1' ? 'L1' : 'S2', kind: outcome.a === '1' ? 'rf' : 'fr', label: outcome.a === '1' ? 'rf' : 'fr' });
      out.push({ from: outcome.b === '1' ? 'S1' : 'L2', to: outcome.b === '1' ? 'L2' : 'S1', kind: outcome.b === '1' ? 'rf' : 'fr', label: outcome.b === '1' ? 'rf' : 'fr' });
    } else if (testId === 'sb') {
      out.push({ from: 'S1', to: 'L1', kind: 'po', label: 'po' });
      out.push({ from: 'S2', to: 'L2', kind: 'po', label: 'po' });
      out.push({ from: outcome.a === '1' ? 'S2' : 'L1', to: outcome.a === '1' ? 'L1' : 'S2', kind: outcome.a === '1' ? 'rf' : 'fr', label: outcome.a === '1' ? 'rf' : 'fr' });
      out.push({ from: outcome.b === '1' ? 'S1' : 'L2', to: outcome.b === '1' ? 'L2' : 'S1', kind: outcome.b === '1' ? 'rf' : 'fr', label: outcome.b === '1' ? 'rf' : 'fr' });
    } else {
      out.push({ from: 'L1', to: 'L2', kind: 'po', label: 'po' });
      out.push({ from: outcome.a === '1' ? 'S1' : 'L1', to: outcome.a === '1' ? 'L1' : 'S1', kind: outcome.a === '1' ? 'rf' : 'fr', label: outcome.a === '1' ? 'rf' : 'fr' });
      out.push({ from: outcome.b === '1' ? 'S1' : 'L2', to: outcome.b === '1' ? 'L2' : 'S1', kind: outcome.b === '1' ? 'rf' : 'fr', label: outcome.b === '1' ? 'rf' : 'fr' });
      if (outcome.a === '1' && outcome.b === '0') out.push({ from: 'L1', to: 'L2', kind: 'co', label: 'co' });
    }
    return out;
  });

  const hasCycle = $derived.by(() => {
    const adj = new Map<string, string[]>();
    for (const e of edges) {
      if (e.kind === 'po' || e.kind === 'rf' || e.kind === 'fr') {
        if (!adj.has(e.from)) adj.set(e.from, []);
        adj.get(e.from)!.push(e.to);
      }
    }
    const seen = new Set<string>();
    const stack = new Set<string>();
    const dfs = (n: string): boolean => {
      if (stack.has(n)) return true;
      if (seen.has(n)) return false;
      seen.add(n);
      stack.add(n);
      for (const m of adj.get(n) ?? []) if (dfs(m)) return true;
      stack.delete(n);
      return false;
    };
    return [...adj.keys()].some(dfs);
  });

  const coBad = $derived(testId === 'corr' && outcome.a === '1' && outcome.b === '0');
  const bad = $derived(!allowed || coBad);

  const verdict = $derived.by(() => {
    if (testId === 'corr' && outcome.a === '1' && outcome.b === '0')
      return {
        zh: '违反 coherence：L1 读到了新值，之后 L2 却又读到旧值；同一地址的副本不可能倒着走。',
        en: 'Coherence violation: L1 reads the new value, then L2 reads an older one; copies of one address cannot move backwards.'
      };
    if (testId === 'mp' && outcome.a === '1' && outcome.b === '0')
      return {
        zh: '在 SC / TSO 下，po、rf、fr 构成一个环：S1 → S2 → L1 → L2 → S1。只有更弱的模型才允许它。',
        en: 'Under SC / TSO, po, rf, and fr form a cycle: S1 → S2 → L1 → L2 → S1. Only weaker models allow it.'
      };
    if (testId === 'sb' && outcome.a === '0' && outcome.b === '0')
      return {
        zh: 'SC 下两个核的 store 在全局序里必有一个在前，对应 load 必然看到它；TSO 的 store buffer 才允许两边都读到旧值。',
        en: 'Under SC one of the two stores must precede the other in global order, so the matching load sees it; TSO store buffers allow both to miss.'
      };
    if (testId === 'corr')
      return {
        zh: '同地址的读没有出现逆序：这是 coherence 允许的。',
        en: 'The reads of one address do not move backwards; coherence allows this.'
      };
    return {
      zh: '这个结果在所选模型下合法：找不到违反顺序或数据值的环。',
      en: 'This outcome is legal under the selected model: no cycle violates order or data value.'
    };
  });

  function edgePath(e: Edge): string {
    const a = test.nodes[e.from]!;
    const b = test.nodes[e.to]!;
    if (e.kind === 'po' && a.x === b.x) {
      return `M${a.x},${a.y + 26} L${b.x},${b.y - 28}`;
    }
    if (e.kind === 'po') {
      return `M${a.x + 60},${a.y} L${b.x - 62},${b.y}`;
    }
    if (e.kind === 'co') {
      return `M${a.x + 62},${a.y + 8} C${a.x + 40},${a.y + 80} ${b.x - 40},${b.y - 80} ${b.x - 62},${b.y - 8}`;
    }
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const sx = a.x + (dx / len) * 62;
    const sy = a.y + (dy / len) * 27;
    const ex = b.x - (dx / len) * 64;
    const ey = b.y - (dy / len) * 29;
    return `M${sx},${sy} L${ex},${ey}`;
  }

  function edgeColor(e: Edge): string {
    return e.kind === 'po'
      ? '#b9ac95'
      : e.kind === 'rf'
        ? '#2f5d62'
        : e.kind === 'fr'
          ? '#b98a63'
          : '#b4543a';
  }

  function modelName(m: Model): string {
    return m === 'sc' ? 'SC' : m === 'tso' ? 'TSO' : 'Relaxed (XC)';
  }
</script>

<div class="lab">
  <div class="bar">
    <div class="seg">
      {#each tests as tt}
        <button class:active={testId === tt.id} onclick={() => pick(tt.id)}>{tt.label}</button>
      {/each}
    </div>
    <div class="seg">
      {#each ['sc', 'tso', 'relaxed'] as m}
        <button class:active={model === m} onclick={() => (model = m as Model)}>{modelName(m as Model)}</button>
      {/each}
    </div>
    <span class="q">{questionFor(testId)}</span>
  </div>

  <div class="bench">
    <div class="prog">
      <div class="thread">
        <span class="th mono">C1</span>
        {#each test.c1 as line}
          <span class="ln mono"><i>{line.note}</i>{line.op}</span>
        {/each}
      </div>
      <div class="thread">
        <span class="th mono">C2</span>
        {#each test.c2 as line}
          <span class="ln mono"><i>{line.note}</i>{line.op}</span>
        {/each}
      </div>
      <div class="prog-note">
        {t(
          'po 是程序顺序；rf / fr 由这次执行实际读到的值决定。换一个读值，图就换一组边。',
          'po is program order; rf / fr come from the values this execution actually read. Change an outcome and the edges change.'
        )}
      </div>
      <div class="rel-list">
        <div class="rel"><b class="mono">po</b><span>{t('同一核内的程序顺序', 'program order within a core')}</span></div>
        <div class="rel"><b class="mono">rf</b><span>{t('load 的值来自哪个 store', 'which store a load read from')}</span></div>
        <div class="rel"><b class="mono">fr</b><span>{t('读到旧值 → 指向它没看到的 store', 'read an old value → points at the store it missed')}</span></div>
      </div>
    </div>

    <div class="graph">
      <svg viewBox="0 0 520 300" role="img" aria-label="execution graph">
        <defs>
          <marker id="lc-arr-po" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#b9ac95" />
          </marker>
          <marker id="lc-arr-rf" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#2f5d62" />
          </marker>
          <marker id="lc-arr-fr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#b98a63" />
          </marker>
          <marker id="lc-arr-co" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#b4543a" />
          </marker>
        </defs>

        {#each edges as e}
          <path
            d={edgePath(e)}
            fill="none"
            stroke={edgeColor(e)}
            stroke-width={e.kind === 'po' ? 1.5 : 1.5}
            stroke-dasharray={e.kind === 'fr' ? '4 3' : e.kind === 'co' ? '2 3' : undefined}
            marker-end="url(#lc-arr-{e.kind})"
          />
        {/each}

        {#each nodes as n}
          <rect x={n.x - 52} y={n.y - 26} width="104" height="52" rx="9" fill="#fffdf8" stroke="#e0d7c6" />
          <text class="nid" x={n.x} y={n.y - 2} text-anchor="middle">{n.label}</text>
          <text class="nsub" x={n.x} y={n.y + 14} text-anchor="middle">{n.sub}</text>
        {/each}
      </svg>
      <div class="legend">
        <span><b class="ln-po"></b>po</span>
        <span><b class="ln-rf"></b>rf</span>
        <span><b class="ln-fr"></b>fr</span>
        {#if coBad}<span><b class="ln-co"></b>co</span>{/if}
      </div>
    </div>
  </div>

  <div class="outs">
    <span class="outs-k">{t('所有可能的读值', 'all observed values')}</span>
    <div class="out-grid">
      {#each test.outcomes as o, i}
        <button
          class="out"
          class:sel={i === outcomeIdx}
          class:ok={model === 'sc' ? o.sc : model === 'tso' ? o.tso : o.relaxed}
          class:no={!(model === 'sc' ? o.sc : model === 'tso' ? o.tso : o.relaxed)}
          onclick={() => (outcomeIdx = i)}
        >
          <span class="out-v mono">r1 = {o.a}, r2 = {o.b}</span>
          <span class="out-t">
            {(model === 'sc' ? o.sc : model === 'tso' ? o.tso : o.relaxed)
              ? t('允许', 'allowed')
              : t('禁止', 'forbidden')}
          </span>
        </button>
      {/each}
    </div>
  </div>

  <div class="verdict" class:bad>
    <div class="v-head">
      <span class="v-tag">{allowed && !coBad ? t('legal', 'legal') : t('illegal', 'illegal')}</span>
      <span class="v-model mono">{modelName(model)}</span>
      {#if hasCycle}<span class="v-cycle">{t('SC 下成环', 'cycle under SC')}</span>{/if}
    </div>
    <p>{en ? verdict.en : verdict.zh}</p>
  </div>

  <div class="note">
    {t(
      '这张图只画出 po（程序顺序）、rf（读自哪个写）与 fr（读到了更旧的值）。模型的任务，就是规定这些边能不能闭合成环。',
      'The graph shows only po (program order), rf (read-from), and fr (reads an older value). A model\u2019s job is to say whether these edges may close a cycle.'
    )}
  </div>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 10px;
  }

  .q {
    flex: 1 1 300px;
    font-size: 10px;
    color: var(--muted);
  }

  .bench {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 10px;
  }

  .prog {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .thread {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 8px 9px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 8px;
  }

  .th {
    font-size: 8.5px;
    color: var(--gold);
  }

  .ln {
    display: flex;
    gap: 7px;
    font-size: 9px;
    color: var(--ink-2);
  }

  .ln i {
    flex: none;
    width: 34px;
    font-style: normal;
    font-size: 7.5px;
    color: var(--muted);
  }

  .prog-note {
    padding: 7px 8px;
    font-size: 8.5px;
    line-height: 1.55;
    color: var(--muted);
    background: var(--paper-2);
    border-radius: 6px;
  }

  .rel-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .rel {
    display: flex;
    align-items: baseline;
    gap: 7px;
    padding: 3px 6px;
    font-size: 8.5px;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 5px;
  }

  .rel b {
    flex: none;
    width: 18px;
    font-size: 8.5px;
    font-weight: 500;
    color: var(--accent-deep);
  }

  .graph {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px;
    background: var(--paper-2);
    border: 1px solid var(--line-2);
    border-radius: 9px;
  }

  .graph svg {
    width: 100%;
    max-width: 560px;
    align-self: center;
  }

  .nid {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    fill: var(--accent-deep);
  }

  .nsub {
    font-family: 'Inter', sans-serif;
    font-size: 8px;
    fill: var(--muted);
  }

  .legend {
    display: flex;
    gap: 12px;
    padding: 2px 8px 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    color: var(--muted);
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .ln-po,
  .ln-rf,
  .ln-fr,
  .ln-co {
    display: inline-block;
    width: 16px;
    height: 0;
    border-top: 2px solid #b9ac95;
  }

  .ln-rf {
    border-color: #2f5d62;
  }

  .ln-fr {
    border-color: #b98a63;
    border-top-style: dashed;
  }

  .ln-co {
    border-color: #b4543a;
    border-top-style: dotted;
  }

  .outs {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .outs-k {
    font-size: 9px;
    color: var(--muted);
  }

  .out-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .out {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 8px;
    text-align: left;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 7px;
  }

  .out.sel {
    border-color: var(--accent);
    background: var(--card);
  }

  .out-v {
    font-size: 9px;
    color: var(--ink-2);
  }

  .out-t {
    font-size: 8px;
    color: var(--muted);
  }

  .out.ok .out-t {
    color: var(--accent-deep);
  }

  .out.no .out-t {
    color: var(--ember);
  }

  .verdict {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 9px 11px;
    background: var(--accent-soft);
    border: 1px solid #cfded9;
    border-radius: 9px;
  }

  .verdict.bad {
    background: #fbf3ee;
    border-color: #e3cbbf;
  }

  .v-head {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .v-tag {
    font-size: 8.5px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent-deep);
  }

  .verdict.bad .v-tag {
    color: #a3523b;
  }

  .v-model {
    font-size: 8.5px;
    color: var(--muted);
  }

  .v-cycle {
    margin-left: auto;
    font-size: 8px;
    color: #a3523b;
  }

  .verdict p {
    margin: 0;
    font-size: 9.5px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .note {
    font-size: 9px;
    line-height: 1.5;
    color: var(--muted);
  }

  @media (max-width: 820px) {
    .bench {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 560px) {
    .out-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
