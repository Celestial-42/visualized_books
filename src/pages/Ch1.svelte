<script lang="ts">
  import ChapterHead from '../components/ChapterHead.svelte';
  import Figure from '../components/Figure.svelte';
  import Quiz from '../components/Quiz.svelte';
  import { navigate } from '../lib/router.svelte';
  import { lang, t } from '../lib/lang.svelte';

  let lens = $state<'coherence' | 'consistency'>('coherence');

  const en = $derived(lang.value === 'en');

  const quiz = $derived(
    en
      ? [
          {
            q: 'Two cores write address A one after the other, and a third core later reads A but sees an older value. Which class of problem is this?',
            options: ['Consistency', 'Coherence', 'Neither — it is a compiler problem', 'Both'],
            answer: 1,
            why: 'Only one address and its copies are involved, so this is coherence. Consistency governs the visible order across different addresses.'
          },
          {
            q: 'Core C1 writes A then B; core C2 observes B’s new value before A’s old value. Which class?',
            options: ['Coherence', 'Consistency', 'Not enough cache capacity', 'Not enough bus bandwidth'],
            answer: 1,
            why: 'Each address is coherent on its own; what breaks is the cross-address order “A before B”, which is exactly what a consistency model specifies.'
          },
          {
            q: 'A single core executes `A = 1; r = A;` and r reads 0. Which class?',
            options: ['Coherence', 'Consistency', 'Neither — this is single-core semantics', 'Depends on cache size'],
            answer: 2,
            why: 'A shared-memory model constrains visibility between cores. One core violating its own program order is an out-of-order / speculation rollback bug that the single-core ISA must forbid.'
          }
        ]
      : [
          {
            q: '两个核先后写同一个地址 A，第三个核随后读 A，却读到了更旧的值。这属于哪一类问题？',
            options: ['Consistency（连贯性）', 'Coherence（缓存一致性）', '都不是，是编译器的问题', '两者都是'],
            answer: 1,
            why: '只涉及一个地址的多个副本，属于 coherence。consistency 管的是多个地址之间的可见顺序。'
          },
          {
            q: '核 C1 依次写 A 和 B，核 C2 先看到 B 的新值，再看到 A 的旧值。这属于哪一类问题？',
            options: ['Coherence（缓存一致性）', 'Consistency（连贯性）', '缓存容量不足', '总线带宽不足'],
            answer: 1,
            why: '每个地址单独看都符合 coherence，坏掉的是“A 在 B 之前”这条跨地址顺序，正是 consistency 模型要规定的。'
          },
          {
            q: '单个核执行 `A = 1; r = A;`，结果 r 读到 0。这属于哪一类问题？',
            options: ['Coherence（缓存一致性）', 'Consistency（连贯性）', '两者都不是——这是单核语义问题', '取决于缓存大小'],
            answer: 2,
            why: '共享内存模型约束的是多核之间的可见性。同一个核违背自己的程序顺序，是乱序执行/投机没有正确回滚，单核 ISA 就该禁止。'
          }
        ]
  );
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={1}
      title="两个正交的问题"
      en="Introduction to Consistency and Coherence"
      lede={en
        ? 'Shared-memory “correctness” is subtler than intuition suggests: it is not a single verdict but a set of allowed executions. The book splits it into two non-overlapping questions — memory consistency and cache coherence — and the remaining chapters answer them.'
        : '共享内存的“正确”比直觉更微妙：它不是一个判断，而是很多个都被允许的执行。本书把它拆成两个互不重叠的问题——内存连贯性（memory consistency）与缓存一致性（cache coherence），后面九章都在回答这两问。'}
    />

    <div class="prose">
      {#if en}
        <h3><span class="h-no">1.1</span>Why shared memory needs a contract</h3>
        <p>
          The semantics of a single core is clear: given an input state, the core must finish with a determinate
          output state, even if it executes instructions out of order internally. Shared memory is different —
          multiple threads run concurrently and the ISA permits a huge number of legal interleavings, so
          “the correct result” becomes a set.
        </p>
        <p>
          So we need a contract that specifies <strong>in what order loads and stores may be observed</strong>.
          That contract is the memory consistency model. The stricter the contract, the easier programs are to
          write and the harder hardware is to build; the looser it is, the more freedom hardware gets and the
          more synchronization programmers must add themselves.
        </p>

        <div class="pull">
          “Correct” is not one trajectory but a set of allowed trajectories. Defining that set is defining the
          memory model.
        </div>

        <h3><span class="h-no">1.2</span>Consistency and coherence</h3>
        <p>
          The book splits shared-memory correctness into two layers. Memory consistency answers the order of
          visible accesses across addresses and cores; cache coherence answers whether multiple cached copies of
          a single address behave as if only one existed. The two are orthogonal: a system can be coherent yet
          weakly ordered, or strongly ordered yet incoherent (the latter is usually just called a bug).
        </p>
      {:else}
        <h3><span class="h-no">1.1</span>共享内存为什么需要一份“合同”</h3>
        <p>
          单个核的语义很清楚：给定输入状态，执行完必须得到一个确定的输出状态，哪怕中间乱序执行也一样。
          但共享内存不一样——多个线程并发跑，ISA 允许大量合法的指令交错，于是“正确的结果”本身变成了一个集合。
        </p>
        <p>
          所以我们需要一份合同，规定 <strong>load / store 之间允许以什么顺序被观察到</strong>。这份合同就是内存连贯性模型
          （memory consistency model，简称 memory model）。合同越严，程序越好写、硬件越难做；合同越松，硬件越自由、程序员越需要自己加同步。
        </p>

        <div class="pull">
          “正确”不是唯一的一条执行轨迹，而是一组被允许的轨迹。定义这组轨迹，就是定义内存模型。
        </div>

        <h3><span class="h-no">1.2</span>Consistency 与 Coherence</h3>
        <p>
          书中把共享内存的正确性拆成两层。内存连贯性（memory consistency，简称 consistency）回答跨地址、跨核的可见顺序；
          缓存一致性（cache coherence，简称 coherence）回答单个地址的多个副本是否表现得像只有一份。
          两者正交：一个系统可以缓存一致但顺序很松，也可以顺序很强却副本不一致（后者通常直接叫 bug）。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 1.1', 'Figure 1.1')}
      caption={t(
        '同一段程序，两个不同的问题。切换视角可以看到：coherence 只关心 A 的副本，consistency 关心 A 与 B 之间的顺序。',
        'One program, two different questions. Switch the lens: coherence only cares about the copies of A, while consistency cares about the order between A and B.'
      )}
    >
      <div class="lens-lab">
        <div class="lens-top">
          <div class="seg">
            <button class:active={lens === 'coherence'} onclick={() => (lens = 'coherence')}>{t('Coherence 视角', 'Coherence view')}</button>
            <button class:active={lens === 'consistency'} onclick={() => (lens = 'consistency')}>{t('Consistency 视角', 'Consistency view')}</button>
          </div>
          <span class="lens-q">
            {lens === 'coherence'
              ? t('问题：C2 读到的 A，是新的还是旧的？', 'Question: which copy of A does C2 read — the new one or the old one?')
              : t('问题：C2 看到 A 与 B 的顺序，必须和 C1 写它们的顺序相同吗？', 'Question: must C2 observe A and B in the order C1 wrote them?')}
          </span>
        </div>

        <div class="lens-body">
          <div class="prog">
            <div class="pcol">
              <span class="pct">{t('核 C1', 'Core C1')}</span>
              <div class="pline" class:lit={lens === 'coherence'}>
                <span class="pid mono">S1</span><span class="ptxt mono">A = 1</span>
              </div>
              <div class="pline" class:lit={lens === 'consistency'}>
                <span class="pid mono">S2</span><span class="ptxt mono">B = 1</span>
              </div>
              <div class="pblank"></div>
            </div>
            <div class="pcol">
              <span class="pct">{t('核 C2', 'Core C2')}</span>
              <div class="pline" class:lit={lens === 'consistency'}>
                <span class="pid mono">L1</span><span class="ptxt mono">r1 = B</span>
              </div>
              <div class="pline" class:lit={lens === 'coherence'}>
                <span class="pid mono">L2</span><span class="ptxt mono">r2 = A</span>
              </div>
              <div class="pblank"></div>
            </div>
          </div>

          {#if lens === 'coherence'}
            <div class="replicas">
              <div class="rep">
                <span class="rep-name">{t('C1 的缓存', 'C1’s cache')}</span>
                <span class="rep-val mono">A=1</span>
                <span class="chip m">M</span>
              </div>
              <div class="rep">
                <span class="rep-name">{t('C2 的缓存', 'C2’s cache')}</span>
                <span class="rep-val mono">A=?</span>
                <span class="chip i">I</span>
              </div>
              <div class="rep">
                <span class="rep-name">{t('内存', 'Memory')}</span>
                <span class="rep-val mono">A=1</span>
                <span class="chip plain">backing</span>
              </div>
              <p class="rep-note">
                {t(
                  'A 有三个副本。缓存一致性只要求它们表现得像被串行地读写：写要传播，旧的副本要么失效要么被更新。这里不关心 B 发生了什么。',
                  'A has three copies. Coherence only requires them to behave as if read and written one at a time: writes propagate, stale copies are invalidated or updated. It does not care what happens to B.'
                )}
              </p>
            </div>
          {:else}
            <div class="orders">
              <div class="ord">
                <span class="ord-tag">{t('C1 的程序顺序', 'C1’s program order')}</span>
                <div class="ord-flow">
                  <span class="ord-op mono">A = 1</span>
                  <span class="ord-arrow">→</span>
                  <span class="ord-op mono">B = 1</span>
                </div>
              </div>
              <div class="ord">
                <span class="ord-tag">{t('C2 实际观察到的顺序', 'What C2 actually observes')}</span>
                <div class="ord-flow">
                  <span class="ord-op mono">B = 1</span>
                  <span class="ord-arrow">→</span>
                  <span class="ord-op mono">A = 0</span>
                </div>
                <span class="ord-flag">{t('顺序被颠倒了', 'order reversed')}</span>
              </div>
              <p class="rep-note">
                {t(
                  '每个地址单独看都没问题，坏掉的是它们之间的顺序。要禁止这种执行，靠的是内存连贯性模型，而不是缓存一致性协议。',
                  'Each address is fine on its own; the order between them is broken. Preventing this execution is the job of the memory consistency model, not the coherence protocol.'
                )}
              </p>
            </div>
          {/if}
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">1.3</span>Why the split matters</h3>
        <p>
          Coherence is <strong>local</strong>: it looks at one address and a set of copies, and is usually handled
          by cache controllers and a protocol on the interconnect. Consistency is <strong>global</strong>: it
          constrains how the operations of one core become visible to another, and often needs costlier mechanisms
          (fences, store buffers, speculation checking). Once split, the two questions can be modeled with
          different abstractions — which is also the structure of this book.
        </p>

        <h4>Two new threads in the second edition</h4>
        <p>
          The 2011 first edition covered CPUs only. The second edition adds two chapters: <strong>Chapter 10</strong>
          applies the same analysis to GPUs and heterogeneous accelerators, where coherence can be temporal rather
          than value-based; <strong>Chapter 11</strong> shows how to write models as executable specifications, to
          enumerate and falsify them with litmus tests. The verdict engines on this site follow the Chapter 11 approach.
        </p>

        <div class="note">
          <b>What this book does not do:</b> it does not exhaust every commercial protocol, nor descend to RTL.
          Its goal is to let you read a protocol table, decide for yourself whether an execution is legal, and know
          which questions remain open.
        </div>

        <h3><span class="h-no">1.4</span>Quiz: separate the two questions</h3>
      {:else}
        <h3><span class="h-no">1.3</span>为什么必须拆开</h3>
        <p>
          缓存一致性是<strong>局部</strong>的：它只看一个地址、一组副本，通常由缓存控制器和互连上的协议解决。
          内存连贯性是<strong>全局</strong>的：它关心一个核发出的多个操作，在另一个核看来是什么次序，往往需要更贵的机制（fence、store buffer、投机校验）。
          拆开之后，两个问题可以分别用不同的抽象去建模，这也是本书的结构。
        </p>

        <h4>第二版新增的两条线</h4>
        <p>
          2011 年的第一版只有 CPU。第二版补了两章：<strong>第 10 章</strong>把同一套分析用到 GPU 与异构加速器上，
          那里的 coherence 可以是“时间上的”（temporal coherence）而不是“值上的”；<strong>第 11 章</strong>讲怎么把模型写成可执行的规格，
          用 litmus test 去枚举、去证伪。本手册的判定引擎就是按第 11 章的思路写的。
        </p>

        <div class="note">
          <b>本书不做什么：</b>不穷尽所有商用协议，也不展开到 RTL 级实现。它的目标是让你能读懂协议表、能自己判断一个执行是否合法，
          并且知道哪些问题还没有被回答。
        </div>

        <h3><span class="h-no">1.4</span>自测：分清两个问题</h3>
      {/if}
    </div>

    <Figure
      no={t('图 1.2', 'Figure 1.2')}
      caption={t(
        '三题都答对，说明两个问题的边界已经清楚；答错也没关系，第 2、3 章会把它们各自展开。',
        'Three correct answers mean the boundary is clear; if not, Chapters 2 and 3 take each question apart.'
      )}
    >
      <Quiz questions={quiz} />
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">1.5</span>How to use this manual</h3>
        <p>
          Every figure can step forward and back, and some let you weave an execution by hand. On figures marked
          <span class="badge">decidable</span>, the verdict comes from exhaustive enumeration: the engine enumerates
          every execution that respects program order, then de-duplicates the outcomes. The “allowed / forbidden”
          labels are computed, not written.
        </p>
      {:else}
        <h3><span class="h-no">1.5</span>怎么用这本手册</h3>
        <p>
          每章的图都可以单步、回退，有些还能让你亲手排执行。带 <span class="badge">可判定</span> 标记的图，
          结论来自穷举：引擎会枚举所有符合程序顺序的执行，再把不同的结果去重给你看。页面上的“允许 / 禁止”不是文案，是算出来的。
        </p>
      {/if}
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => navigate('/ch2')}>
          <span class="next-no display">02</span>
          <strong>{t('Coherence 基础', 'Coherence Basics')}</strong>
          <span>{t('副本为什么会不一致，两个不变量怎么定义“正确”。', 'Why copies diverge, and how two invariants define correctness.')}</span>
        </button>
        <button class="next-card" onclick={() => navigate('/ch3')}>
          <span class="next-no display">03</span>
          <strong>{t('顺序连贯性', 'Sequential Consistency')}</strong>
          <span>{t('亲手排一次交错，看 (0,0) 为什么排不出来。', 'Weave an interleaving yourself and see why (0,0) cannot appear.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .lens-lab {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .lens-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
  }

  .lens-q {
    font-size: 11.5px;
    color: var(--ink-3);
  }

  .lens-body {
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    gap: 20px;
    align-items: start;
  }

  .prog {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 14px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .pcol {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .pct {
    margin-bottom: 4px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .pline {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 6px 8px;
    border: 1px solid transparent;
    border-radius: 7px;
    transition: background 0.25s var(--ease), border-color 0.25s var(--ease), opacity 0.25s var(--ease);
    opacity: 0.42;
  }

  .pline.lit {
    background: var(--card);
    border-color: var(--line);
    box-shadow: var(--shadow-sm);
    opacity: 1;
  }

  .pid {
    font-size: 9.5px;
    color: var(--gold);
  }

  .ptxt {
    font-size: 12px;
    color: var(--ink-2);
  }

  .pblank {
    height: 22px;
  }

  .replicas,
  .orders {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .rep {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 10px;
    padding: 8px 11px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 9px;
  }

  .rep-name {
    font-size: 11.5px;
    color: var(--ink-3);
  }

  .rep-val {
    font-size: 11.5px;
    color: var(--accent-deep);
  }

  .rep-note {
    margin-top: 4px;
    font-size: 11.5px;
    line-height: 1.7;
    color: var(--muted);
  }

  .ord {
    padding: 9px 11px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 9px;
  }

  .ord-tag {
    display: block;
    margin-bottom: 6px;
    font-size: 10px;
    letter-spacing: 0.06em;
    color: var(--muted);
  }

  .ord-flow {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .ord-op {
    padding: 2px 7px;
    font-size: 11px;
    color: var(--ink-2);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 5px;
  }

  .ord-arrow {
    color: var(--gold);
  }

  .ord-flag {
    display: inline-block;
    margin-top: 8px;
    padding: 1px 7px;
    font-size: 10px;
    color: var(--ember);
    background: var(--ember-soft);
    border: 1px solid #eed8ce;
    border-radius: 4px;
  }

  .next {
    margin-top: 46px;
  }

  .next-label {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .next-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 12px;
  }

  .next-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px;
    text-align: left;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 14px;
    transition: transform 0.3s var(--ease), box-shadow 0.3s var(--ease), border-color 0.3s var(--ease);
  }

  .next-card:hover {
    transform: translateY(-2px);
    border-color: #d9cfba;
    box-shadow: var(--shadow-lift);
  }

  .next-no {
    font-size: 14px;
    color: var(--gold);
  }

  .next-card strong {
    font-size: 13.5px;
    font-weight: 600;
  }

  .next-card span:last-child {
    font-size: 11.5px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  @media (max-width: 780px) {
    .lens-body {
      grid-template-columns: minmax(0, 1fr);
    }

    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
