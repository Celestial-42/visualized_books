<script lang="ts">
  import { allocate, allocatorOrganization, maxMatching } from '../../lib/noc/router';
  import { lang, t } from '../../lib/lang.svelte';

  const PORTS = 4;
  const VCS = 3;

  let candidates = $state(2);

  // two candidate outputs per input VC — the case adaptive routing creates
  const full: boolean[][] = [
    [true, true, false, false],
    [true, false, false, false],
    [false, false, true, true],
    [false, false, false, true]
  ];
  // “picked one candidate first”: keep only the lowest-index request of each row
  const firstChoice = (m: boolean[][]) => m.map((row) => row.map((v, j) => v && row.indexOf(true) === j));

  const rows = $derived(allocatorOrganization(PORTS, VCS, candidates));
  const singleMatch = $derived(maxMatching(firstChoice(full)));
  const multiMatch = $derived(maxMatching(full));
  const allOne = $derived(allocate(full, 'input').pairs.length);

  const LABEL: Record<string, { zh: string; en: string; note: string; noteEn: string }> = {
    single: {
      zh: '确定性路由：只有一个候选',
      en: 'Deterministic: one candidate',
      note: '每个输入 VC 只为一个输出投标，分配器就是“3 个 VC 里选一个、4 个输入里选一个”的两级仲裁。',
      noteEn: 'Each input VC bids for exactly one output, so the allocator is the two-stage “pick 1 of 3 VCs, then 1 of 4 inputs” structure.'
    },
    retry: {
      zh: '自适应但先定一个：失败就重路由',
      en: 'Adaptive, pick one first: retry on failure',
      note: '硬件最简单，但一次失败要重新做路由计算再投标；最坏情况下要试 c 次，延迟不确定。',
      noteEn: 'The simplest hardware, but a lost arbitration means computing the route again and bidding anew: up to c attempts, with an unpredictable delay.'
    },
    multi: {
      zh: '自适应返回全部候选：一次投完',
      en: 'Adaptive returns all candidates: bid at once',
      note: '所有候选输出一起投标，一级仲裁的扇入从 V 变成 V×c；换来一次分配就拿到最好的匹配。',
      noteEn: 'Every candidate is offered at once, so the first-stage fan-in grows from V to V×c — and one allocation round gets the best matching it can.'
    }
  };
</script>

<div class="lab">
  <div class="knobs">
    <label>
      <span>{t('每个 VC 的候选输出数 c', 'candidate outputs per VC (c)')}</span>
      <input type="range" min="1" max="4" step="1" bind:value={candidates} />
      <b class="mono">{candidates}</b>
    </label>
    <span class="fixed mono">{t(`端口 ${PORTS} · 每端口 VC ${VCS}`, `${PORTS} ports · ${VCS} VCs each`)}</span>
  </div>

  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>{t('组织方式', 'Organisation')}</th>
          <th>{t('一级：仲裁器 × 扇入', 'Stage 1: arbiters × fan-in')}</th>
          <th>{t('二级：仲裁器 × 扇入', 'Stage 2: arbiters × fan-in')}</th>
          <th>{t('最坏尝试', 'Worst-case attempts')}</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row}
          <tr>
            <td>{lang.value === 'en' ? LABEL[row.mode].en : LABEL[row.mode].zh}</td>
            <td class="num">{row.stage1Count} × {row.stage1FanIn}:1</td>
            <td class="num">{row.stage2Count} × {row.stage2FanIn}:1</td>
            <td class="num">{row.worstAttempts}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="matches">
    <div class="m-item">
      <span class="m-k">{t('只投第一个候选（c=1）', 'bid the first candidate only')}</span>
      <b class="mono">{singleMatch} {t('对', 'pairs')}</b>
    </div>
    <div class="m-item">
      <span class="m-k">{t('分两轮贪心投全部候选', 'two greedy rounds over all candidates')}</span>
      <b class="mono">{allOne} {t('对', 'pairs')}</b>
    </div>
    <div class="m-item hot">
      <span class="m-k">{t('多候选上限（最优匹配）', 'ceiling with all candidates')}</span>
      <b class="mono">{multiMatch} {t('对', 'pairs')}</b>
    </div>
  </div>

  <p class="note-line">
    {t(
      '同一张“每个 VC 有两个候选输出”的矩阵：只认第一个候选只能配到 3 对，允许两个候选一起投标，匹配上限升到 4 对。这就是 §6.4.5 的取舍——路由函数愿意返回多少候选，决定了分配器能多复杂、也决定了它最多能配多好。',
      'Same matrix, two candidate outputs per VC: bidding only the first candidate caps at three pairs, while offering both raises the ceiling to four. That is the trade in §6.4.5 — how many candidates the routing function returns decides how complex the allocator must be, and how good its matching can get.'
    )}
  </p>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .knobs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }

  .knobs label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 10.5px;
    color: var(--muted);
  }

  .knobs input[type='range'] {
    width: 130px;
    height: 2px;
    appearance: none;
    background: var(--line);
    border-radius: 2px;
  }

  .knobs input[type='range']::-webkit-slider-thumb {
    appearance: none;
    width: 11px;
    height: 11px;
    background: var(--accent);
    border-radius: 50%;
  }

  .knobs b {
    color: var(--ink);
    font-weight: 500;
  }

  .fixed {
    font-size: 9.5px;
    color: var(--muted);
  }

  .table-wrap {
    overflow-x: auto;
  }

  .table-wrap .table {
    min-width: 520px;
  }

  .matches {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .m-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 9px 11px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 9px;
  }

  .m-item.hot {
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .m-k {
    font-size: 9.5px;
    line-height: 1.45;
    color: var(--muted);
  }

  .m-item b {
    font-size: 16px;
    font-weight: 500;
    color: var(--ink);
  }

  .note-line {
    font-size: 11px;
    line-height: 1.7;
    color: var(--ink-3);
  }

  @media (max-width: 780px) {
    .matches {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
