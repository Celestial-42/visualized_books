<script lang="ts">
  import { buildTopology } from '../../lib/noc/topology';
  import { routingVerdictSplit, ALL_TURNS, type Turn } from '../../lib/noc/routing';
  import { lang, t } from '../../lib/lang.svelte';

  const graph = buildTopology('mesh', 4, 4);
  const XY: Turn[] = ['EN', 'ES', 'WN', 'WS'];
  const WEST: Turn[] = ['EN', 'ES', 'NW', 'SW'];
  const BROKEN: Turn[] = [...XY, 'SW', 'NE'];

  const PLANS: { id: string; label: string; labelEn: string; vns: Turn[][]; note: string; noteEn: string }[] = [
    {
      id: 'xy',
      label: '单 VN：维序',
      labelEn: 'One VN: dimension order',
      vns: [XY],
      note: '只允许 4 个转向，网格上的环永远闭不上。',
      noteEn: 'Four turns, and no cycle on a mesh can close.'
    },
    {
      id: 'broken',
      label: '单 VN：多加两个转向',
      labelEn: 'One VN: two turns added',
      vns: [BROKEN],
      note: '再加 S→W 与 N→E，方格的四条边就接通了。',
      noteEn: 'Add S→W and N→E and all four edges of a square connect.'
    },
    {
      id: 'split',
      label: '双 VN：维序 + west-first',
      labelEn: 'Two VNs: XY + west-first',
      vns: [XY, WEST],
      note: '两个 VN 各自无环，且只允许 VN0→VN1 升级：8 个转向全用上，环仍然不存在。',
      noteEn: 'Each VN is acyclic and escalation only goes VN0→VN1: all eight turns in use, and still no cycle.'
    },
    {
      id: 'split-broken',
      label: '双 VN：维序 + 加了转向的集合',
      labelEn: 'Two VNs: XY + the broken set',
      vns: [XY, BROKEN],
      note: '分层不是万能的：VN1 自己有环，整张依赖图就还有环。',
      noteEn: 'Splitting is not magic: if VN1 itself has a cycle, the whole dependency graph still does.'
    }
  ];

  let planId = $state('split');
  const plan = $derived(PLANS.find((p) => p.id === planId) ?? PLANS[0]);
  const verdict = $derived(routingVerdictSplit(graph, plan.vns));
</script>

<div class="lab">
  <div class="seg">
    {#each PLANS as p}
      <button class:active={planId === p.id} onclick={() => (planId = p.id)}>
        {lang.value === 'en' ? p.labelEn : p.label}
      </button>
    {/each}
  </div>

  <div class="head">
    <span class="badge" class:ok={verdict.safe} class:bad={!verdict.safe}>
      {verdict.safe ? t('无环 · 不会因路由死锁', 'acyclic · no routing deadlock') : t('成环 · 会死锁', 'cycle · deadlocks')}
    </span>
    <span class="vns mono">{plan.vns.length} VN · {plan.vns.reduce((n, v) => n + v.length, 0)} 个转向</span>
  </div>

  <p class="note-line">{lang.value === 'en' ? plan.noteEn : plan.note}</p>

  <div class="grids">
    {#each plan.vns as turns, vi}
      <div class="vn">
        <span class="vn-head mono">VN{vi}</span>
        <div class="turn-grid">
          {#each ALL_TURNS as turn}
            <span class="turn" class:on={turns.includes(turn)}>{turn[0]}→{turn[1]}</span>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  {#if verdict.cycle}
    <div class="cycle">
      <span class="cycle-label">{t('依赖图里找到的环', 'Cycle found in the dependency graph')}</span>
      <div class="cycle-chain mono">
        {#each verdict.cycle as hop, i}
          <span class="hop">{hop}</span>{#if i < verdict.cycle.length - 1}<span class="arrow">→</span>{/if}
        {/each}
      </div>
      <p class="cycle-note">
        {t(
          '每个节点是“一条有向信道 @ 一个虚拟网络”。要判死锁，必须连 VN 一起摊开看。',
          'Each node is “one directed channel @ one virtual network”. Deadlock analysis has to lay out the VNs too.'
        )}
      </p>
    </div>
  {:else}
    <p class="safe-note">
      {t(
        `在 ${verdict.cdg.channels.length} 个 (信道, VN) 节点上没有找到回路——这就是“用虚拟信道买回两个转向”的完整代价。`,
        `No cycle among the ${verdict.cdg.channels.length} (channel, VN) nodes — this is the full price of buying those two turns back with a virtual channel.`
      )}
    </p>
  {/if}
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 11px;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .vns {
    font-size: 10px;
    color: var(--muted);
  }

  .note-line {
    font-size: 11.5px;
    line-height: 1.65;
    color: var(--ink-3);
  }

  .grids {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 8px;
  }

  .vn {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 9px 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .vn-head {
    font-size: 9.5px;
    color: var(--gold);
  }

  .turn-grid {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 4px;
  }

  .turn {
    padding: 4px 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    text-align: center;
    color: var(--muted);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 5px;
  }

  .turn.on {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .cycle {
    padding: 10px 12px;
    background: var(--ember-soft);
    border: 1px solid #eed8ce;
    border-radius: 10px;
  }

  .cycle-label {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ember);
  }

  .cycle-chain {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin-top: 6px;
    font-size: 10.5px;
    color: var(--ink-2);
  }

  .hop {
    padding: 2px 6px;
    background: var(--card);
    border: 1px solid #eed8ce;
    border-radius: 5px;
  }

  .arrow {
    color: var(--ember);
  }

  .cycle-note,
  .safe-note {
    margin-top: 6px;
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--muted);
  }
</style>
