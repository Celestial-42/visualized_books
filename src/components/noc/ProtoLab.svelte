<script lang="ts">
  import { PROTOCOLS, workloadCost, transaction, type Protocol, type Op, type MsgKind } from '../../lib/noc/proto';
  import { lang, t } from '../../lib/lang.svelte';

  let protocol = $state<Protocol>('mesi');
  let sharers = $state(2);
  let dirty = $state(true);
  let op = $state<Op>('read');

  const MIX = $derived({ read: 0.6, write: 0.15, upgrade: 0.15, writeback: 0.1, sharers, dirtyOwner: dirty });

  const costs = $derived(PROTOCOLS.map((p) => ({ ...p, cost: workloadCost(p.id, MIX) })));
  const maxFlits = $derived(Math.max(...costs.map((c) => c.cost.flits)));
  const tx = $derived(transaction(protocol, op, sharers, dirty));

  const OPS: { id: Op; label: string; labelEn: string }[] = [
    { id: 'read', label: '读缺失', labelEn: 'read miss' },
    { id: 'write', label: '写缺失', labelEn: 'write miss' },
    { id: 'upgrade', label: '升级 S→M', labelEn: 'upgrade S→M' },
    { id: 'writeback', label: '脏块替换', labelEn: 'dirty replace' }
  ];

  const KINDS: MsgKind[] = ['req', 'fwd', 'inv', 'ack', 'data'];
</script>

<div class="lab">
  <div class="toolbar">
    <div class="seg">
      {#each PROTOCOLS as p}
        <button class:active={protocol === p.id} onclick={() => (protocol = p.id)}>{p.label}</button>
      {/each}
    </div>
    <label class="knob">
      <span>{t('其他持有者', 'Other sharers')}</span>
      <input type="range" min="0" max="3" step="1" bind:value={sharers} />
      <b class="mono">{sharers}</b>
    </label>
    <button class="btn small" class:primary={dirty} onclick={() => (dirty = !dirty)}>
      {dirty ? t('有脏持有者', 'dirty owner') : t('无脏持有者', 'no dirty owner')}
    </button>
  </div>

  <div class="two">
    <div class="panel">
      <span class="eyebrow">{t('一笔事务的消息', 'Messages for one transaction')}</span>
      <div class="seg small">
        {#each OPS as o}
          <button class:active={op === o.id} onclick={() => (op = o.id)}>
            {lang.value === 'en' ? o.labelEn : o.label}
          </button>
        {/each}
      </div>

      <div class="msgs">
        {#each tx as m}
          <div class="msg">
            <span class={`kind k-${m.kind}`}>{m.kind}</span>
            <span class="path mono">{m.from} → {m.to}</span>
            <span class="fl mono">{m.flits} flit</span>
          </div>
        {/each}
      </div>

      <p class="sum mono">
        {tx.length} {t('条消息', 'messages')} · {tx.reduce((n, m) => n + m.flits, 0)} flit
      </p>
      <p class="mini-note">
        {t(
          '包头 1 flit，64 B 数据 4 flit（16 B/flit）。协议决定消息，网络只负责搬。',
          'One flit of header, four flits for a 64 B line at 16 B per flit. The protocol decides the messages; the network only carries them.'
        )}
      </p>
    </div>

    <div class="panel">
      <span class="eyebrow">{t('同一负载下三种协议的代价', 'The same workload, three protocols')}</span>
      {#each costs as c}
        <div class="bar-row">
          <span class="bl">{c.label}</span>
          <span class="bar"><i style={`width:${(c.cost.flits / maxFlits) * 100}%`}></i></span>
          <span class="bv mono">{c.cost.flits}</span>
        </div>
      {/each}
      <p class="mini-note">
        {t(
          '负载取 60% 读、15% 写、15% 升级、10% 脏替换。数字是 1000 笔事务的 flit 总量；MOESI 省下的是脏持有者被读时不必回内存。',
          'The mix is 60% reads, 15% writes, 15% upgrades and 10% dirty replacements, over 1000 transactions. MOESI saves the memory read when a dirty owner supplies the line.'
        )}
      </p>
      <table class="table">
        <thead>
          <tr>
            <th>{t('消息类型', 'Kind')}</th>
            {#each costs as c}<th class="num">{c.label}</th>{/each}
          </tr>
        </thead>
        <tbody>
          {#each KINDS as kind}
            <tr>
              <td class="mono">{kind}</td>
              {#each costs as c}<td class="num">{c.cost.byKind[kind]}</td>{/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .knob {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 10.5px;
    color: var(--muted);
  }

  .knob input[type='range'] {
    width: 90px;
    height: 2px;
    appearance: none;
    background: var(--line);
    border-radius: 2px;
  }

  .knob input[type='range']::-webkit-slider-thumb {
    appearance: none;
    width: 11px;
    height: 11px;
    background: var(--accent);
    border-radius: 50%;
  }

  .knob b {
    color: var(--ink);
    font-weight: 500;
  }

  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 13px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
    min-width: 0;
  }

  .seg.small button {
    padding: 3px 7px;
    font-size: 10px;
  }

  .msgs {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .msg {
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr) 46px;
    align-items: center;
    gap: 8px;
    padding: 4px 7px;
    font-size: 10.5px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 6px;
  }

  .kind {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    text-align: center;
    border-radius: 4px;
    padding: 1px 0;
  }

  .k-req {
    color: var(--accent-deep);
    background: var(--accent-soft);
  }

  .k-fwd {
    color: var(--st-o);
    background: #f6eedf;
  }

  .k-inv {
    color: var(--ember);
    background: var(--ember-soft);
  }

  .k-ack {
    color: var(--muted);
    background: var(--paper-2);
  }

  .k-data {
    color: #3f6b4f;
    background: #eaf1ea;
  }

  .path {
    color: var(--ink-2);
  }

  .fl {
    color: var(--muted);
    text-align: right;
  }

  .sum {
    font-size: 11px;
    color: var(--accent-deep);
  }

  .bar-row {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr) 56px;
    align-items: center;
    gap: 8px;
    font-size: 11px;
  }

  .bl {
    font-family: 'JetBrains Mono', monospace;
    color: var(--muted);
  }

  .bar {
    display: block;
    height: 7px;
    border-radius: 3px;
    background: var(--paper-3);
    overflow: hidden;
  }

  .bar i {
    display: block;
    height: 100%;
    background: var(--accent);
  }

  .bv {
    text-align: right;
    color: var(--ink-2);
  }

  .mini-note {
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--muted);
  }

  @media (max-width: 780px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
