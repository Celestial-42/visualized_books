<script lang="ts">
  import { arbitrationFairness, livelockTrials, type AwardPolicy } from '../../lib/icn/analysis';
  import { lang, t } from '../../lib/lang.svelte';

  let policy = $state<AwardPolicy>('rr');
  let ticks = $state(30);
  const fair = $derived(arbitrationFairness(policy, ticks));
  const maxCount = $derived(Math.max(...fair.counts, 1));

  let bounded = $state(true);
  const lv = $derived(livelockTrials(bounded ? 8 : null, 200));

  const POLICY: Record<AwardPolicy, { zh: string; en: string }> = {
    rr: { zh: '轮询', en: 'round-robin' },
    matrix: { zh: '矩阵仲裁', en: 'matrix arbiter' },
    priority: { zh: '固定优先级', en: 'fixed priority' }
  };
</script>

<div class="lab">
  <div class="panel">
    <div class="panel-head">
      <span class="eyebrow">{t('一个输出端口，三个请求者', 'One output port, three requesters')}</span>
      <div class="seg small">
        {#each ['rr', 'matrix', 'priority'] as p}
          <button class:active={policy === p} onclick={() => (policy = p as AwardPolicy)}>
            {lang.value === 'en' ? POLICY[p as AwardPolicy].en : POLICY[p as AwardPolicy].zh}
          </button>
        {/each}
      </div>
    </div>

    <div class="bars">
      {#each fair.counts as count, i}
        <div class="bar-row">
          <span class="bl mono">R{i}</span>
          <span class="bar"><i style={`width:${(count / maxCount) * 100}%`}></i></span>
          <span class="bv mono">{count}</span>
        </div>
      {/each}
    </div>

    <p class="mini" class:bad={fair.starved.length > 0}>
      {#if fair.starved.length}
        {t(`R${fair.starved.join('、R')} 一次也没被服务——饿死。`, `R${fair.starved.join(', R')} never gets served — starvation.`)}
      {:else}
        {t('三个请求者在 30 拍里都拿到了服务；数量可能不均，但没有饿死。', 'All three requesters are served within 30 cycles; the split may be uneven, but nobody starves.')}
      {/if}
    </p>
  </div>

  <div class="panel">
    <div class="panel-head">
      <span class="eyebrow">{t('非最小路由的活锁', 'Livelock in non-minimal routing')}</span>
      <div class="seg small">
        <button class:active={!bounded} onclick={() => (bounded = false)}>{t('无跳数上限', 'no hop bound')}</button>
        <button class:active={bounded} onclick={() => (bounded = true)}>{t('超过 8 跳后强制最短', 'minimal after 8 hops')}</button>
      </div>
    </div>

    <div class="stats">
      <div class="st"><span>{t('到达', 'delivered')}</span><b class="mono">{lv.completed}/{lv.trials}</b></div>
      <div class="st"><span>{t('平均跳数', 'avg hops')}</span><b class="mono">{lv.avgHops.toFixed(1)}</b></div>
      <div class="st"><span>{t('最长', 'max hops')}</span><b class="mono">{lv.maxHops}</b></div>
      <div class="st"><span>{t('≥100 跳', '≥100 hops')}</span><b class="mono">{lv.beyond100}</b></div>
    </div>

    <p class="mini">
      {t(
        '同一个随机非最小路由，200 次试验都到达了终点，但没有上限时最长的一次走了几百跳——平均延迟被拖垮，工程上就把它当活锁处理。加了 8 跳上限之后，长尾被切掉。',
        'The same random non-minimal walk reaches its destination in all 200 trials, but without a bound the worst case runs into the hundreds of hops — for engineering purposes that is livelock. The eight-hop bound truncates the tail.'
      )}
    </p>
  </div>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
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
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .seg.small button {
    padding: 3px 8px;
    font-size: 10px;
  }

  .bars {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .bar-row {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) 34px;
    align-items: center;
    gap: 8px;
    font-size: 10.5px;
  }

  .bl {
    color: var(--muted);
  }

  .bar {
    display: block;
    height: 8px;
    border-radius: 4px;
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

  .stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .st {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 8px 10px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 8px;
  }

  .st span {
    font-size: 9px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .st b {
    font-size: 15px;
    font-weight: 500;
    color: var(--ink);
  }

  .mini {
    font-size: 10.5px;
    line-height: 1.65;
    color: var(--muted);
  }

  .mini.bad {
    color: var(--ember);
  }

  @media (max-width: 780px) {
    .stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
