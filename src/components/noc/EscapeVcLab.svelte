<script lang="ts">
  import { buildTopology } from '../../lib/noc/topology';
  import { ALL_TURNS, escapeAnalysis, type Turn, type Dir } from '../../lib/noc/routing';
  import { lang, t } from '../../lib/lang.svelte';

  const graph = buildTopology('mesh', 4, 4);
  const XY: Turn[] = ['EN', 'ES', 'WN', 'WS'];

  const MODES: {
    id: string;
    label: string;
    labelEn: string;
    escapeTurns: Turn[];
    escapeFilter: (d: Dir) => boolean;
    note: string;
    noteEn: string;
  }[] = [
    {
      id: 'none',
      label: '没有逃逸，全转向',
      labelEn: 'No escape, all turns',
      escapeTurns: ALL_TURNS,
      escapeFilter: () => true,
      note: '只有一条 VN，且允许全部 8 个转向：依赖图自己就成环，任何流量都能把它闭合。',
      noteEn: 'One VN with all eight turns: the dependency graph already cycles, and some traffic will close it.'
    },
    {
      id: 'full',
      label: '逃逸 = 维序（全信道）',
      labelEn: 'Escape = dimension order (all channels)',
      escapeTurns: XY,
      escapeFilter: () => true,
      note: '这才是 Duato 说的逃逸 VC：逃逸子网无环、连通，而且每条自适应信道都能摸到它。自适应部分可以完全没有转向限制。',
      noteEn: 'This is Duato’s escape VC: acyclic, connected, and reachable from every adaptive channel. The adaptive part can be fully unrestricted.'
    },
    {
      id: 'east',
      label: '逃逸 = 只在向东信道',
      labelEn: 'Escape only on eastward channels',
      escapeTurns: XY,
      escapeFilter: (d) => d === 'E',
      note: '逃逸子网无环、每条自适应信道也都能摸到它——但只能往东，回不来：子网不连通，条件不成立。这说明“有逃逸”不等于“逃逸够用”。',
      noteEn: 'Acyclic, and every adaptive channel can reach it — but it only goes east and never back, so the subnetwork is not connected. “Having an escape” is not the same as “having enough escape”.'
    },
    {
      id: 'fake',
      label: '伪逃逸：第二套 VC 但仍全转向',
      labelEn: 'Fake escape: a second VC with all turns',
      escapeTurns: ALL_TURNS,
      escapeFilter: () => true,
      note: '多开一条 VN、却不给它一个可证无环的路由函数：逃逸自己就有环，等于没逃。',
      noteEn: 'A second VN without a provably acyclic routing function cycles on its own — the escape escapes nothing.'
    }
  ];

  let modeId = $state('full');
  const mode = $derived(MODES.find((m) => m.id === modeId) ?? MODES[0]);
  const result = $derived(escapeAnalysis(graph, ALL_TURNS, mode.escapeTurns, mode.escapeFilter));

  const checks = $derived([
    {
      ok: result.escapeAcyclic,
      zh: '逃逸子网无环',
      en: 'escape subnetwork is acyclic',
      detail: result.escapeCycle ? result.escapeCycle.slice(0, 3).join(' → ') + ' → …' : ''
    },
    {
      ok: result.escapeConnected,
      zh: '逃逸子网连通（能路由到所有终端）',
      en: 'escape subnetwork is connected (reaches every terminal)',
      detail: ''
    },
    {
      ok: result.reachable === result.total,
      zh: `每条自适应信道都能到达逃逸（${result.reachable}/${result.total}）`,
      en: `every adaptive channel can reach the escape lane (${result.reachable}/${result.total})`,
      detail: result.unreachableSample.length ? result.unreachableSample.join('  ') : ''
    }
  ]);
</script>

<div class="lab">
  <div class="seg">
    {#each MODES as m}
      <button class:active={modeId === m.id} onclick={() => (modeId = m.id)}>
        {lang.value === 'en' ? m.labelEn : m.label}
      </button>
    {/each}
  </div>

  <p class="note-line">{lang.value === 'en' ? mode.noteEn : mode.note}</p>

  <div class="checks">
    {#each checks as c}
      <div class="check" class:ok={c.ok} class:bad={!c.ok}>
        <span class="mark">{c.ok ? '✓' : '✗'}</span>
        <span class="txt">
          {lang.value === 'en' ? c.en : c.zh}
          {#if c.detail}<span class="detail mono">{c.detail}</span>{/if}
        </span>
      </div>
    {/each}
  </div>

  <div class="verdict">
    <span class="badge" class:ok={result.safe} class:bad={!result.safe}>
      {result.safe ? t('满足 Duato 条件 · 无死锁', 'Duato’s condition holds · deadlock-free') : t('不满足条件 · 不保证无死锁', 'condition fails · not provably deadlock-free')}
    </span>
  </div>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 11px;
  }

  .note-line {
    font-size: 11.5px;
    line-height: 1.65;
    color: var(--ink-3);
  }

  .checks {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .check {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 8px 11px;
    font-size: 11.5px;
    line-height: 1.6;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 9px;
  }

  .check.ok {
    background: #f1f7f1;
    border-color: #d7e5d8;
  }

  .check.bad {
    background: var(--ember-soft);
    border-color: #eed8ce;
  }

  .mark {
    flex: none;
    width: 14px;
    font-family: 'JetBrains Mono', monospace;
    color: var(--muted);
  }

  .check.ok .mark {
    color: #3f6b4f;
  }

  .check.bad .mark {
    color: var(--ember);
  }

  .txt {
    color: var(--ink-2);
  }

  .detail {
    display: block;
    margin-top: 3px;
    font-size: 10px;
    color: var(--muted);
    overflow-wrap: anywhere;
  }

  .verdict {
    display: flex;
  }
</style>
