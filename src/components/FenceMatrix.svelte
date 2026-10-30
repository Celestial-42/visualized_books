<script lang="ts">
  import { R_MP, enumerate } from '../lib/relaxed';
  import { t } from '../lib/lang.svelte';

  type Cell = { bad: number; total: number; ok: boolean };

  function cell(f1: boolean, f2: boolean): Cell {
    const outs = enumerate(R_MP, 'xc', { F1: f1, F2: f2 });
    const total = outs.reduce((n, o) => n + o.count, 0);
    const bad = outs.find((o) => o.key === '1,0')?.count ?? 0;
    return { bad, total, ok: bad === 0 };
  }

  const rows = $derived([
    { label: t('F1 关', 'F1 off'), cells: [cell(false, false), cell(false, true)] },
    { label: t('F1 开', 'F1 on'), cells: [cell(true, false), cell(true, true)] }
  ]);
</script>

<div class="fm">
  <div class="fm-head">
    <span class="fm-title">MP · XC</span>
    <span class="fm-sub">
      {t(
        '在 r1 = SET 的前提下，r2 = 0 还有多少条 memory order？',
        'With r1 = SET, how many memory orders still give r2 = 0?'
      )}
    </span>
  </div>

  <div class="matrix">
    <span class="corner"></span>
    <span class="col">{t('F2 关', 'F2 off')}</span>
    <span class="col">{t('F2 开', 'F2 on')}</span>

    {#each rows as row}
      <span class="row">{row.label}</span>
      {#each row.cells as c}
        <div class="cell" class:ok={c.ok}>
          <span class="verdict">{c.ok ? t('已排除', 'excluded') : t('仍可达', 'still reachable')}</span>
          <span class="count mono">{c.bad} / {c.total} {t('条', c.total === 1 ? 'trace' : 'traces')}</span>
          <span class="key mono">r2 = 0</span>
        </div>
      {/each}
    {/each}
  </div>

  <p class="fm-note">
    {t(
      '只有两条 FENCE 同时打开，(1, 0) 才变成 0 条。F1 把 data 钉在 flag 之前，F2 把第二条 load 钉在 spin 之后——少了任何一边，环上都留着一个缺口。',
      'Only with both FENCEs on does (1, 0) drop to zero traces. F1 pins data before flag; F2 pins the second load after the spin — remove either side and the cycle keeps a gap.'
    )}
  </p>
</div>

<style>
  .fm {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .fm-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
  }

  .fm-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: var(--accent-deep);
  }

  .fm-sub {
    font-size: 11px;
    color: var(--ink-3);
  }

  .matrix {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) minmax(0, 1fr);
    gap: 7px;
  }

  .corner {
    display: block;
  }

  .col,
  .row {
    display: flex;
    align-items: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    color: var(--muted);
  }

  .col {
    justify-content: center;
    padding-bottom: 1px;
  }

  .row {
    justify-content: flex-end;
    padding-right: 5px;
  }

  .cell {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 10px 12px;
    background: var(--ember-soft);
    border: 1px solid #eed8ce;
    border-radius: 10px;
    transition: background 0.2s var(--ease);
  }

  .cell.ok {
    background: var(--accent-soft);
    border-color: #d5e2dd;
  }

  .verdict {
    font-size: 10.5px;
    font-weight: 600;
    color: var(--ember);
  }

  .cell.ok .verdict {
    color: var(--accent-deep);
  }

  .count {
    font-size: 13px;
    color: var(--ink-2);
  }

  .key {
    font-size: 9px;
    color: var(--muted);
  }

  .fm-note {
    font-size: 10.5px;
    line-height: 1.65;
    color: var(--muted);
  }

  @media (max-width: 560px) {
    .matrix {
      grid-template-columns: 38px minmax(0, 1fr) minmax(0, 1fr);
    }

    .cell {
      padding: 8px 9px;
    }
  }
</style>
