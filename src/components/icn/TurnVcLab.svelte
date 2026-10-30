<script lang="ts">
  import { buildTopology } from '../../lib/noc/topology';
  import { ALL_TURNS, type Turn } from '../../lib/noc/routing';
  import { NEGATIVE_FIRST, TURN_BY_ID, XY_TURNS, turnAnalysis } from '../../lib/icn/analysis';
  import { lang, t } from '../../lib/lang.svelte';

  const graph = buildTopology('mesh', 4, 4);

  let turns = $state<Turn[]>([...XY_TURNS]);
  let vcMode = $state<'one' | 'same' | 'split'>('one');

  const plans = $derived.by<{ label: string; labelEn: string; plans: Turn[][] }>(() => {
    if (vcMode === 'one') return { label: '1 条 VC', labelEn: 'one VC', plans: [turns] };
    if (vcMode === 'same') {
      return {
        label: '2 条 VC，同一转向集',
        labelEn: 'two VCs, same turn set',
        plans: [turns, turns]
      };
    }
    return {
      label: '2 条 VC，按转向拆分',
      labelEn: 'two VCs, turns split',
      plans: [turns.filter((x) => NEGATIVE_FIRST.includes(x)), turns.filter((x) => XY_TURNS.includes(x))]
    };
  });

  const verdict = $derived(turnAnalysis(graph, turns, plans.plans));

  const toggle = (turn: Turn) => {
    turns = turns.includes(turn) ? turns.filter((x) => x !== turn) : [...turns, turn];
  };

  const preset = (next: Turn[]) => {
    turns = [...next];
  };
</script>

<div class="lab">
  <div class="toolbar">
    <div class="seg">
      <button class:active={turns.length === XY_TURNS.length && XY_TURNS.every((x) => turns.includes(x))} onclick={() => preset(XY_TURNS)}>
        {t('维序（XY）4 转向', 'dimension order (4 turns)')}
      </button>
      <button class:active={turns.length === NEGATIVE_FIRST.length && NEGATIVE_FIRST.every((x) => turns.includes(x))} onclick={() => preset(NEGATIVE_FIRST)}>
        {t('负向优先 6 转向', 'negative-first (6 turns)')}
      </button>
      <button class:active={turns.length === ALL_TURNS.length} onclick={() => preset([...ALL_TURNS])}>
        {t('全部 8 转向', 'all eight turns')}
      </button>
    </div>
    <div class="seg">
      <button class:active={vcMode === 'one'} onclick={() => (vcMode = 'one')}>{t('1 条 VC', 'one VC')}</button>
      <button class:active={vcMode === 'same'} onclick={() => (vcMode = 'same')}>{t('2 条 VC（同集）', 'two VCs (same)')}</button>
      <button class:active={vcMode === 'split'} onclick={() => (vcMode = 'split')}>{t('2 条 VC（拆分）', 'two VCs (split)')}</button>
    </div>
  </div>

  <div class="turns">
    {#each ALL_TURNS as turn}
      <button class="turn" class:on={turns.includes(turn)} onclick={() => toggle(turn)}>
        {lang.value === 'en' ? TURN_BY_ID[turn].en : TURN_BY_ID[turn].zh}
      </button>
    {/each}
  </div>

  <div class="verdicts">
    <div class="v-row" class:ok={verdict.safeChannel} class:bad={!verdict.safeChannel}>
      <span class="v-k">{t('通道相关图（单 VC）', 'channel graph (one VC)')}</span>
      <b>{verdict.safeChannel ? t('无环', 'acyclic') : t('有环', 'cycle')}</b>
      <span class="v-d mono">{verdict.channelCycle ? verdict.channelCycle.slice(0, 4).join(' → ') + ' → …' : '—'}</span>
    </div>
    <div class="v-row" class:ok={verdict.safeExtended} class:bad={!verdict.safeExtended}>
      <span class="v-k">{t(`扩展通道相关图（${plans.label}）`, `extended graph (${plans.labelEn})`)}</span>
      <b>{verdict.safeExtended ? t('无环', 'acyclic') : t('有环', 'cycle')}</b>
      <span class="v-d mono">{verdict.extendedCycle ? verdict.extendedCycle.slice(0, 4).join(' → ') + ' → …' : '—'}</span>
    </div>
  </div>

  <p class="note-line">
    {t(
      '切到“全部 8 转向”看通道图成环；再把 VC 加到 2 条但转向集不变——环还在，因为多一条 VC 只是让图变大，没有切断依赖。只有把转向按“负向优先 / 维序”拆到两条 VC 上，扩展图才变无环：这就是 3.3 节里定理 3.1 那张“存在连接的无环路由子函数”的图形版本。',
      'Switch to all eight turns and the channel graph cycles. Add a second VC but keep the same turn set and the cycle survives — extra VCs only enlarge the graph, they do not cut dependencies. Split the turns across two VCs (negative-first, then dimension order) and the extended graph becomes acyclic: the picture behind Theorem 3.1’s “connected acyclic routing subfunction”.'
    )}
  </p>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 11px;
  }

  .turns {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 5px;
  }

  .turn {
    padding: 6px 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--muted);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 6px;
  }

  .turn.on {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .verdicts {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .v-row {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) 44px minmax(0, 1.4fr);
    align-items: baseline;
    gap: 10px;
    padding: 8px 11px;
    font-size: 11px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 9px;
  }

  .v-row.ok {
    background: #f1f7f1;
    border-color: #d7e5d8;
  }

  .v-row.bad {
    background: var(--ember-soft);
    border-color: #eed8ce;
  }

  .v-k {
    color: var(--ink-2);
  }

  .v-row b {
    font-size: 11px;
    color: var(--ink);
  }

  .v-row.ok b {
    color: #3f6b4f;
  }

  .v-row.bad b {
    color: var(--ember);
  }

  .v-d {
    font-size: 9.5px;
    color: var(--muted);
    overflow-wrap: anywhere;
  }

  .note-line {
    font-size: 11px;
    line-height: 1.7;
    color: var(--ink-3);
  }

  @media (max-width: 780px) {
    .turns {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .v-row {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
