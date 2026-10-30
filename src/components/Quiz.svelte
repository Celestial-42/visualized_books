<script lang="ts">
  type Q = { q: string; options: string[]; answer: number; why: string };

  let { questions }: { questions: Q[] } = $props();
  let picked = $state<Record<number, number>>({});

  const choose = (qi: number, oi: number) => {
    if (picked[qi] !== undefined) return;
    picked[qi] = oi;
  };
</script>

<div class="quiz">
  {#each questions as item, qi}
    <div class="q" class:answered={picked[qi] !== undefined}>
      <div class="q-head">
        <span class="q-no mono">Q{qi + 1}</span>
        <p>{item.q}</p>
      </div>
      <div class="q-opts">
        {#each item.options as opt, oi}
          <button
            class="q-opt"
            class:correct={picked[qi] !== undefined && oi === item.answer}
            class:wrong={picked[qi] === oi && oi !== item.answer}
            onclick={() => choose(qi, oi)}
          >
            <span class="marker">{String.fromCharCode(65 + oi)}</span>
            <span>{opt}</span>
          </button>
        {/each}
      </div>
      {#if picked[qi] !== undefined}
        <p class="q-why" class:bad={picked[qi] !== item.answer}>
          {#if picked[qi] === item.answer}<b>对了。</b>{:else}<b>不对。</b>{/if}
          {item.why}
        </p>
      {/if}
    </div>
  {/each}
</div>

<style>
  .quiz {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .q {
    padding-bottom: 18px;
    border-bottom: 1px solid var(--line-2);
  }

  .q:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .q-head {
    display: flex;
    gap: 10px;
    align-items: baseline;
  }

  .q-no {
    flex: none;
    font-size: 10.5px;
    color: var(--gold);
    letter-spacing: 0.06em;
  }

  .q-head p {
    font-size: 13.5px;
    line-height: 1.65;
    color: var(--ink-2);
  }

  .q-opts {
    display: grid;
    gap: 6px;
    margin: 10px 0 0 32px;
  }

  .q-opt {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 8px 11px;
    font-size: 12.5px;
    line-height: 1.55;
    text-align: left;
    color: var(--ink-2);
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 9px;
    transition: background 0.18s var(--ease), border-color 0.18s var(--ease);
  }

  .q-opt:hover {
    border-color: #d9cfba;
    background: var(--card);
  }

  .q .marker {
    flex: none;
    width: 16px;
    height: 16px;
    margin-top: 1px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    line-height: 16px;
    text-align: center;
    color: var(--muted);
    background: var(--paper-2);
    border-radius: 4px;
  }

  .q-opt.correct {
    border-color: #cfe0d2;
    background: #f1f7f1;
  }

  .q-opt.correct .marker {
    color: #3f6b4f;
    background: #dcecdf;
  }

  .q-opt.wrong {
    border-color: #eed3c7;
    background: var(--ember-soft);
  }

  .q-opt.wrong .marker {
    color: var(--ember);
    background: #f3ded4;
  }

  .q-why {
    margin: 10px 0 0 32px;
    font-size: 12px;
    line-height: 1.7;
    color: #3f6b4f;
  }

  .q-why.bad {
    color: var(--ember);
  }

  .q-why b {
    font-weight: 600;
  }
</style>
