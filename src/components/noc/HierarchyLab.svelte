<script lang="ts">
  import { hierarchyCost } from '../../lib/noc/proto';
  import { lang, t } from '../../lib/lang.svelte';

  let misses = $state(60);
  let privateHit = $state(60);
  let sharedHit = $state(85);

  const rows = $derived(hierarchyCost({ misses, privateHit: privateHit / 100, sharedHit: sharedHit / 100 }));
  const maxTraffic = $derived(Math.max(...rows.map((r) => r.traversals), 1));
  const maxOff = $derived(Math.max(...rows.map((r) => r.offChip), 1));

  const LABEL = {
    private: { zh: '私有 L2', en: 'Private L2' },
    shared: { zh: '共享 L2', en: 'Shared L2' }
  } as const;
</script>

<div class="lab">
  <div class="knobs">
    <label>
      <span>{t('每千次 L1 访问的 Miss', 'L1 misses per 1000')}</span>
      <input type="range" min="20" max="200" step="10" bind:value={misses} />
      <b class="mono">{misses}</b>
    </label>
    <label>
      <span>{t('私有 L2 命中率', 'private L2 hit rate')}</span>
      <input type="range" min="40" max="90" step="5" bind:value={privateHit} />
      <b class="mono">{privateHit}%</b>
    </label>
    <label>
      <span>{t('共享 L2 命中率', 'shared L2 hit rate')}</span>
      <input type="range" min="60" max="98" step="2" bind:value={sharedHit} />
      <b class="mono">{sharedHit}%</b>
    </label>
  </div>

  <div class="cards">
    {#each rows as row}
      <div class="card" class:hot={row.id === 'shared'}>
        <div class="card-head">
          <span class="name">{t(LABEL[row.id].zh, LABEL[row.id].en)}</span>
          <span class="clients mono">
            {t(`端口客户端 ${row.portClients}`, `${row.portClients} client / port`)}
          </span>
        </div>

        <div class="metric">
          <span class="k">{t('网络穿越次数', 'network traversals')}</span>
          <b class="mono">{Math.round(row.traversals)}</b>
          <span class="bar"><i style={`width:${(row.traversals / maxTraffic) * 100}%`}></i></span>
        </div>
        <div class="metric">
          <span class="k">{t('网络 flits', 'network flits')}</span>
          <b class="mono">{Math.round(row.flits)}</b>
        </div>
        <div class="metric">
          <span class="k">{t('片外访问', 'off-chip accesses')}</span>
          <b class="mono">{Math.round(row.offChip)}</b>
          <span class="bar off"><i style={`width:${(row.offChip / maxOff) * 100}%`}></i></span>
        </div>
      </div>
    {/each}
  </div>

  <p class="note-line">
    {t(
      '私有 L2 只让“自己也没命中”的请求上网（每次 2 趟：请求出去、数据回来），但数据在多个 L2 里各存一份，片外访问更多；共享 L2 把数据集中存放、片外访问少，代价是每一次 L1 Miss 都要过网，而且 L1 和 L2 共享同一个注入/弹出端口。',
      'A private L2 lets only its own misses onto the network (two traversals each: request out, data back), but data is replicated and more of it spills off-chip. A shared L2 keeps one copy and off-chip traffic drops, at the price of sending every L1 miss across the network — and of both cache levels sharing one injection/ejection port.'
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
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .knobs label {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px 8px;
    font-size: 10.5px;
    color: var(--muted);
  }

  .knobs span {
    grid-column: 1 / -1;
  }

  .knobs b {
    color: var(--ink);
    font-weight: 500;
    text-align: right;
  }

  input[type='range'] {
    grid-column: 1;
    width: 100%;
    height: 2px;
    appearance: none;
    background: var(--line);
    border-radius: 2px;
  }

  input[type='range']::-webkit-slider-thumb {
    appearance: none;
    width: 11px;
    height: 11px;
    background: var(--accent);
    border-radius: 50%;
  }

  .cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 11px;
  }

  .card.hot {
    background: var(--card);
  }

  .card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .name {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 14px;
    color: var(--ink);
  }

  .clients {
    font-size: 9px;
    color: var(--muted);
  }

  .metric {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: 2px 8px;
    font-size: 10.5px;
    color: var(--muted);
  }

  .metric b {
    font-size: 15px;
    color: var(--ink);
  }

  .bar {
    grid-column: 1 / -1;
    display: block;
    height: 5px;
    border-radius: 3px;
    background: var(--paper-3);
    overflow: hidden;
  }

  .bar i {
    display: block;
    height: 100%;
    background: var(--accent);
  }

  .bar.off i {
    background: var(--gold);
  }

  .note-line {
    font-size: 11px;
    line-height: 1.7;
    color: var(--ink-3);
  }

  @media (max-width: 780px) {
    .knobs,
    .cards {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
