<script lang="ts">
  import { t } from '../lib/lang.svelte';

  type Scenario = 'cta' | 'gpu' | 'cross';
  type Scope = 'cta' | 'gpu' | 'system';

  let scenario = $state<Scenario>('gpu');
  let scope = $state<Scope>('gpu');
  let fence = $state(true);

  const scenarios = $derived([
    {
      id: 'cta' as Scenario,
      label: t('同一 CTA', 'Same CTA'),
      hint: t('两个线程在同一个 SM，共享 L1', 'Two threads on one SM, sharing an L1')
    },
    {
      id: 'gpu' as Scenario,
      label: t('同一 GPU', 'Same GPU'),
      hint: t('两个线程在不同 CTA / 不同 SM，共享 L2', 'Two threads in different CTAs / SMs, sharing an L2')
    },
    {
      id: 'cross' as Scenario,
      label: t('跨设备', 'Cross-device'),
      hint: t('一个 GPU 线程与一个 CPU 线程，共享 LLC / 系统内存', 'One GPU thread and one CPU thread, sharing the LLC / system memory')
    }
  ]);

  const scopes = $derived([
    { id: 'cta' as Scope, label: t('CTA scope', 'CTA scope'), sub: t('同一个 workgroup', 'one workgroup') },
    { id: 'gpu' as Scope, label: t('GPU scope', 'GPU scope'), sub: t('同一个 device', 'one device') },
    { id: 'system' as Scope, label: t('System scope', 'System scope'), sub: t('整个系统', 'the whole system') }
  ]);

  const covers = $derived(
    scope === 'system' || (scope === 'gpu' && scenario !== 'cross') || (scope === 'cta' && scenario === 'cta')
  );
  const ordered = $derived(fence && covers);
  const current = $derived(scenarios.find((s) => s.id === scenario)!);

  const consumer = $derived(
    scenario === 'cross'
      ? t('CPU 线程 T2', 'CPU thread T2')
      : scenario === 'gpu'
        ? t('GPU 线程 T2（另一个 CTA）', 'GPU thread T2 (another CTA)')
        : t('GPU 线程 T2（同一 CTA）', 'GPU thread T2 (same CTA)')
  );

  const result = $derived(
    ordered
      ? {
          value: 'r1 = 1, r2 = 1',
          tag: t('必然', 'must'),
          tone: 'ok',
          why: t(
            'release 把 data 的写发布到 scope 内，acquire 在读到 flag 之后建立 happens-before。',
            'Release publishes the write to data within the scope; acquire establishes happens-before after observing the flag.'
          )
        }
      : !fence
        ? {
            value: 'r1 = 1, r2 = 0',
            tag: t('可能', 'may'),
            tone: 'bad',
            why: t(
              '没有 fence，relaxed 模型允许 flag 先于 data 可见；这不是 coherence 坏了，而是没有建立顺序。',
              'Without a fence, the relaxed model may make the flag visible before data; coherence is not broken, no order was requested.'
            )
          }
        : {
            value: 'r1 = 1, r2 = 0',
            tag: t('可能', 'may'),
            tone: 'bad',
            why: t(
              'fence 只对 scope 内的 agent 生效；T2 在 scope 之外，仍可能读到旧 data。',
              'A fence orders only agents in its scope; T2 lies outside it and may still read stale data.'
            )
          }
  );

  const agents = $derived([
    { name: 'T1', role: t('写者', 'writer'), inside: true },
    { name: 'T2', role: t('读者', 'reader'), inside: covers },
    { name: t('其他 CTA', 'other CTAs'), role: t('同一 GPU', 'same GPU'), inside: scope === 'system' || scope === 'gpu' },
    { name: t('CPU', 'CPU'), role: t('其他设备', 'other device'), inside: scope === 'system' }
  ]);
</script>

<div class="lab">
  <div class="controls">
    <div class="ctrl-row">
      <span class="ctrl-k">{t('两个线程的位置', 'where the threads are')}</span>
      <div class="seg">
        {#each scenarios as s}
          <button class:active={scenario === s.id} onclick={() => (scenario = s.id)}>{s.label}</button>
        {/each}
      </div>
    </div>
    <div class="ctrl-row">
      <span class="ctrl-k">{t('同步的 scope', 'scope of the synchronization')}</span>
      <div class="seg">
        {#each scopes as s}
          <button class:active={scope === s.id} onclick={() => (scope = s.id)}>{s.label}</button>
        {/each}
      </div>
    </div>
    <div class="ctrl-row">
      <span class="ctrl-k">{t('是否使用 fence', 'fence?')}</span>
      <div class="seg">
        <button class:active={!fence} onclick={() => (fence = false)}>{t('不加 fence', 'no fence')}</button>
        <button class:active={fence} onclick={() => (fence = true)}>{t('release + acquire', 'release + acquire')}</button>
      </div>
    </div>
    <p class="hint">{current.hint}</p>
  </div>

  <div class="stage">
    <div class="thread">
      <div class="th-head"><span class="mono">T1</span><span>{t('写者', 'writer')}</span></div>
      <div class="code mono">
        <span><i>1</i>data = 1</span>
        <span><i>2</i>flag = 1</span>
      </div>
      {#if fence}
        <span class="fence">{t('release · fence', 'release · fence')}</span>
      {:else}
        <span class="fence none">{t('无顺序', 'no order')}</span>
      {/if}
      <span class="th-note">
        {t('fence 之前的写，先在 scope 内完成。', 'Writes before the fence complete within the scope first.')}
      </span>
    </div>

    <div class="scope-vis">
      <div class="scope-head">
        <span class="scope-k mono">{scope === 'cta' ? 'CTA' : scope === 'gpu' ? 'GPU' : 'System'} scope</span>
        <span class="scope-sub">{scopes.find((s) => s.id === scope)!.sub}</span>
      </div>
      <div class="agents">
        {#each agents as a}
          <span class="agent" class:inside={a.inside} class:t2={a.name === 'T2'}>
            <b class="mono">{a.name}</b>
            <i>{a.role}</i>
            <em>{a.inside ? t('在 scope 内', 'inside') : t('在 scope 外', 'outside')}</em>
          </span>
        {/each}
      </div>
      <div class="cov" class:ok={covers}>
        {covers
          ? t('这个 scope 覆盖 T1 与 T2', 'This scope covers T1 and T2')
          : t('T2 不在这个 scope 内', 'T2 is outside this scope')}
      </div>
    </div>

    <div class="thread">
      <div class="th-head"><span class="mono">T2</span><span>{consumer}</span></div>
      <div class="code mono">
        <span><i>1</i>r1 = flag</span>
        <span><i>2</i>r2 = data</span>
      </div>
      {#if fence}
        <span class="fence">{t('acquire · fence', 'acquire · fence')}</span>
      {:else}
        <span class="fence none">{t('无顺序', 'no order')}</span>
      {/if}
      <span class="th-note">
        {t('读到 flag 之后，后续 load 必须看到新 data。', 'After observing the flag, later loads must see the new data.')}
      </span>
    </div>
  </div>

  <div class="result" class:ok={result.tone === 'ok'} class:bad={result.tone === 'bad'}>
    <div class="res-head">
      <span class="res-k">{t('可能的执行', 'possible execution')}</span>
      <span class="res-value mono">{result.value}</span>
      <span class="res-tag">{result.tag}</span>
    </div>
    <p>{result.why}</p>
  </div>

  <div class="legend">
    <span><b class="mk ok mono">✓</b>{t('scope 覆盖，顺序成立', 'in scope, order holds')}</span>
    <span><b class="mk no mono">✕</b>{t('scope 外，顺序不保证', 'outside, no guarantee')}</span>
    <span class="lg-note">
      {t(
        'coherence 管“副本何时一致”，scope 管“谁需要看见”；两者一起才构成一个内存模型。',
        'Coherence governs when copies agree; scope governs who must see it. Together they form a memory model.'
      )}
    </span>
  </div>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .ctrl-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .ctrl-k {
    flex: none;
    width: 150px;
    font-size: 9px;
    color: var(--muted);
  }

  .hint {
    margin: 0;
    font-size: 9.5px;
    color: var(--muted);
  }

  .stage {
    display: grid;
    grid-template-columns: 1fr 1.15fr 1fr;
    gap: 9px;
    align-items: stretch;
  }

  .thread {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 11px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .th-head {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .th-head .mono {
    font-size: 10px;
    color: var(--gold);
  }

  .th-head span:last-child {
    font-size: 8.5px;
    color: var(--muted);
  }

  .code {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 6px 7px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 6px;
  }

  .code span {
    font-size: 9px;
    color: var(--ink-2);
  }

  .code i {
    display: inline-block;
    width: 12px;
    font-style: normal;
    color: var(--muted);
  }

  .fence {
    align-self: flex-start;
    padding: 1px 6px;
    font-size: 8.5px;
    color: var(--accent-deep);
    background: var(--accent-soft);
    border: 1px solid #cfded9;
    border-radius: 4px;
  }

  .fence.none {
    color: var(--muted);
    background: var(--paper-2);
    border-color: var(--line);
    border-style: dashed;
  }

  .th-note {
    margin-top: auto;
    padding-top: 6px;
    font-size: 8px;
    line-height: 1.5;
    color: var(--muted);
    border-top: 1px solid var(--line-2);
  }

  .scope-vis {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 10px 11px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .scope-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px;
  }

  .scope-k {
    font-size: 9.5px;
    color: var(--accent-deep);
  }

  .scope-sub {
    font-size: 8.5px;
    color: var(--muted);
  }

  .agents {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .agent {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 4px 6px;
    font-size: 8.5px;
    color: var(--muted);
    background: var(--card);
    border: 1px dashed var(--line);
    border-radius: 5px;
  }

  .agent.inside {
    color: var(--ink-3);
    background: var(--accent-soft);
    border-style: solid;
    border-color: #cfded9;
  }

  .agent.t2.inside {
    border-color: var(--accent);
  }

  .agent b {
    font-size: 8.5px;
    font-weight: 500;
    color: var(--ink-2);
  }

  .agent i {
    font-style: normal;
  }

  .agent em {
    margin-left: auto;
    font-style: normal;
    font-size: 7.5px;
    color: var(--muted);
  }

  .agent.inside em {
    color: var(--accent-deep);
  }

  .cov {
    margin-top: auto;
    font-size: 8.5px;
    color: var(--muted);
  }

  .cov.ok {
    color: var(--accent-deep);
  }

  .result {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 9px 11px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 9px;
  }

  .result.ok {
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .result.bad {
    background: #fbf3ee;
    border-color: #e3cbbf;
  }

  .res-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
  }

  .res-k {
    font-size: 8.5px;
    color: var(--muted);
  }

  .res-value {
    font-size: 12px;
    color: var(--ink);
  }

  .res-tag {
    margin-left: auto;
    font-size: 8.5px;
    color: var(--gold);
  }

  .result p {
    margin: 0;
    font-size: 9.5px;
    line-height: 1.55;
    color: var(--ink-3);
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
    min-width: 18px;
    padding: 0 3px;
    font-size: 8px;
    line-height: 1.7;
    border-radius: 4px;
    border: 1px solid transparent;
  }

  .mk.ok {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .mk.no {
    color: var(--muted);
    background: var(--paper-2);
    border-color: var(--line);
    border-style: dashed;
  }

  .lg-note {
    flex-basis: 100%;
    color: var(--ink-3);
  }

  @media (max-width: 820px) {
    .stage {
      grid-template-columns: minmax(0, 1fr);
    }

    .ctrl-k {
      width: 100%;
    }
  }
</style>
