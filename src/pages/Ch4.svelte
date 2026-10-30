<script lang="ts">
  import ChapterHead from '../components/ChapterHead.svelte';
  import Figure from '../components/Figure.svelte';
  import TsoLab from '../components/TsoLab.svelte';
  import { lang, t } from '../lib/lang.svelte';
  import { navigate } from '../lib/router.svelte';

  const en = $derived(lang.value === 'en');
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={4}
      title="TSO 与 x86 内存模型"
      en="Total Store Order"
      lede={t(
        'store buffer 让 store retire 后立即继续执行，代价是松开 SC 的一条边：store → load。只松这一条，SB 的 (0, 0) 就变成合法结果；也正因为只松这一条，message passing 不加任何 fence 依然正确。',
        'A store buffer lets a core continue right after a store retires, at the price of loosening one SC edge: store → load. Loosen only that edge and SB\u2019s (0, 0) becomes legal; and because only that edge is loosened, message passing stays correct without any fence.'
      )}
    />

    <div class="prose">
      <h3><span class="h-no">4.1</span>{t('store buffer 把 store 藏起来', 'The store buffer hides the store')}</h3>
      {#if en}
        <p>
          The expensive part of SC is the store: a write miss must wait until the cache obtains exclusive permission,
          and the core can only stall in the meantime. The store buffer moves that wait off the critical path — the
          store retires into a per-core FIFO, the core continues immediately, and the buffer drains the store to memory
          in the background.
        </p>
        <p>
          The cost is exactly one thing: a later load on the same core may execute even though the earlier store is not
          yet visible to other cores. In other words, TSO lets <b>store → load</b> reorder and leaves the other three
          pairs untouched.
        </p>
        <div class="note">
          <b>Loads are not fooled by stale values:</b> if a load's address hits a store in this core's own store
          buffer, it forwards that store's value instead of fetching the stale value from memory. Forwarding happens
          only inside the core; other cores still cannot see the store buffer.
        </div>
      {:else}
        <p>
          SC 最贵的地方在 store：一次 write miss 要等 cache 拿到独占权限才能完成，核在这段时间里只能停着。
          store buffer 把这段等待移出关键路径——store retire 后直接进入本核的 FIFO 队列，核立刻继续执行，
          store buffer 在后台把 store drain 到内存。
        </p>
        <p>
          代价只有一条：本核后续的 load 可以执行，即使前面那条 store 还没有对别的核可见。
          换句话说，TSO 让 <b>store → load</b> 可以重排，其余三对顺序原封不动。
        </p>
        <div class="note">
          <b>load 不会被旧值骗到：</b>如果 load 的地址命中本核 store buffer 里的某条 store，它会 forward 那条 store 的值，
          而不是去内存取旧值。forwarding 只发生在本核内部，别的核仍然看不见 store buffer。
        </div>
      {/if}
    </div>

    <Figure
      no={t('图 4.1', 'Figure 4.1')}
      caption={t(
        '点当前指令让它 retire；store 会先进 store buffer，也可以点 drain 把 buffer 头部的 store 写进内存。先让两个核各自 retire 一条 store，再各执行 load，就能亲手造出 (0, 0)。',
        'Click the current instruction to retire it; a store first enters the store buffer, and you can click drain to write the buffer head to memory. Retire one store on each core, then execute both loads, and you can produce (0, 0) yourself.'
      )}
    >
      <TsoLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          In SB, C1's <code>x = NEW</code> is still sitting in its own store buffer, so C2's <code>r2 = x</code> reads
          0; symmetrically, C2's <code>y = NEW</code> has not drained either, so C1's <code>r1 = y</code> also reads 0.
          Of the four edges that formed a cycle under SC, the first one, <b>S1 → L1</b>, may now be cut — the cycle no
          longer holds.
        </p>
      {:else}
        <p>
          在 SB 里，C1 的 <code>x = NEW</code> 还躺在自己的 store buffer 里，所以 C2 的 <code>r2 = x</code> 读到 0；
          对称地，C2 的 <code>y = NEW</code> 也还没有 drain，C1 的 <code>r1 = y</code> 也读到 0。
          SC 下那四条边组成的环，第一条边 <b>S1 → L1</b> 现在允许被切开——环不成立了。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">4.2</span>{t('TSO 的规则：只松一条边', 'TSO\u2019s rules: loosen exactly one edge')}</h3>
      {#if en}
        <p>
          Pair up each core's memory accesses and TSO treats the four pairs very asymmetrically. The three that are kept
          correspond exactly to what a store buffer cannot change: loads execute in program order, stores drain in FIFO
          order, and a store after a load cannot jump ahead.
        </p>
      {:else}
        <p>
          把每核的访存两两配对，TSO 对四对顺序的态度非常不对称。保留下来的三对，正好对应 store buffer 不会改变的事情：
          load 之间按程序顺序执行，store 之间按 FIFO drain，load 之后的 store 也不会提前。
        </p>
      {/if}
    </div>

    <Figure no={t('图 4.2', 'Figure 4.2')} caption={t(
      '四种相邻访存对的顺序。只有 store → load 被 relax，而且是以“store 延迟可见”的方式，而不是真的提前执行。',
      'Ordering of the four adjacent access pairs. Only store → load is relaxed, and it is relaxed by making the store\u2019s visibility later, not by actually executing it early.'
    )}>
      <div class="orders">
        <div class="order kept">
          <span class="op-pair mono">L → L</span>
          <strong>{t('保持', 'kept')}</strong>
          <span>{t(
            'load 按程序顺序 retire，后一个 load 不会先看到更新的值。',
            'loads retire in program order; a later load cannot see a newer value first.'
          )}</span>
        </div>
        <div class="order kept">
          <span class="op-pair mono">L → S</span>
          <strong>{t('保持', 'kept')}</strong>
          <span>{t(
            'load 先执行，后面的 store 才进 store buffer；不会出现“先写后读”的错觉。',
            'the load executes first, and only then does the store enter the store buffer; no illusion of a write before a read.'
          )}</span>
        </div>
        <div class="order kept">
          <span class="op-pair mono">S → S</span>
          <strong>{t('保持', 'kept')}</strong>
          <span>{t(
            '同一个 FIFO，drain 顺序就是程序顺序，其他核看到的 store 顺序一致。',
            'one FIFO, so drain order is program order and other cores see stores in the same order.'
          )}</span>
        </div>
        <div class="order relaxed">
          <span class="op-pair mono">S → L</span>
          <strong>relaxed</strong>
          <span>{t(
            '前一个 store 还在 store buffer 里，后一个 load 就可以执行——SB 的 (0, 0) 由此而来。',
            'the previous store is still in the store buffer while the next load executes — this is where SB\u2019s (0, 0) comes from.'
          )}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Two more rules govern when execution may continue: a load that hits this core's store buffer forwards the
          value from it; and a FENCE must wait until all earlier stores have drained (that is, are visible to all
          cores) before later accesses may execute.
        </p>
        <p>
          These three ordering rules have an important side effect: stores are <b>multi-copy atomic</b>. The moment a
          store leaves the store buffer it becomes visible to all cores at once; there is no intermediate state where C1
          sees it first and C3 later. This property rules out IRIW.
        </p>
      {:else}
        <p>
          还有两条规则约束“什么时候能继续”：load 命中本核 store buffer 时会 forward 其中的值；FENCE 必须等前面所有 store
          都 drain（即对所有核可见）之后，才允许后续访存执行。
        </p>
        <p>
          这三条保序规则带来一个重要的副作用：store 是 <b>multi-copy atomic</b> 的。一条 store 离开 store buffer 的那一刻，
          对所有核同时可见，不存在“C1 先看到、C3 后看到”的中间状态。这条性质会把 IRIW 排除掉。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">4.3</span>{t('换一个模型，结果怎么变', 'Change the model, change the outcome')}</h3>
      {#if en}
        <p>
          Run the litmus tests from Chapter 3 under TSO and only SB changes its answer. That is the point: a memory model
          is not a vague notion of strong or weak, but something decided edge by edge and outcome by outcome.
        </p>
      {:else}
        <p>
          把第 3 章那几道题放到 TSO 下重跑一遍，只有 SB 的答案变了。这正说明“内存模型”不是模糊的强弱，
          而是逐条边、逐个结果可以判定的东西。
        </p>
      {/if}
      <table class="table">
        <thead>
          <tr>
            <th>litmus test</th>
            <th>SC</th>
            <th>TSO</th>
            <th>{t('原因', 'Why')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>SB</b><span class="m-sub">r1 = y; r2 = x</span></td>
            <td class="num" data-label="SC">{t('(0, 0) 不可达', '(0, 0) unreachable')}</td>
            <td class="num ember" data-label="TSO">{t('(0, 0) 可达', '(0, 0) reachable')}</td>
            <td class="why">{t(
              '两个 store 都还在各自的 store buffer 里，两个 load 都读到初值。',
              'Both stores are still in their own store buffers, so both loads read the initial value.'
            )}</td>
          </tr>
          <tr>
            <td><b>SB + MFENCE</b><span class="m-sub">{t('store 与 load 之间加 fence', 'fence between store and load')}</span></td>
            <td class="num" data-label="SC">{t('(0, 0) 不可达', '(0, 0) unreachable')}</td>
            <td class="num" data-label="TSO">{t('(0, 0) 不可达', '(0, 0) unreachable')}</td>
            <td class="why">{t(
              'FENCE 等 store buffer drain，被 relax 的那条边又被补了回来。',
              'The fence waits for the store buffer to drain, restoring the relaxed edge.'
            )}</td>
          </tr>
          <tr>
            <td><b>MP</b><span class="m-sub">{t('flag 发布 data', 'flag publishes data')}</span></td>
            <td class="num" data-label="SC">{t('只有 (1, 1)', 'only (1, 1)')}</td>
            <td class="num" data-label="TSO">{t('只有 (1, 1)', 'only (1, 1)')}</td>
            <td class="why">{t(
              'store → store 与 load → load 都保持顺序，spin 也不会越过 flag。',
              'store → store and load → load are both ordered, and the spin cannot pass flag.'
            )}</td>
          </tr>
          <tr>
            <td><b>IRIW</b><span class="m-sub">{t('两个读者，两个写者', 'two readers, two writers')}</span></td>
            <td class="num" data-label="SC">{t('交叉结果不可达', 'crossed outcome unreachable')}</td>
            <td class="num" data-label="TSO">{t('交叉结果不可达', 'crossed outcome unreachable')}</td>
            <td class="why">{t(
              'store 对所有核同时可见，两个读者不可能看到相反的 store 顺序。',
              'Stores are visible to all cores at once, so two readers cannot observe opposite store orders.'
            )}</td>
          </tr>
        </tbody>
      </table>
      {#if en}
        <p>
          So “the x86 memory model is weak” deserves care: it permits exactly one more class of history than SC — a
          store being seen a little later. For the vast majority of correct programs that publish data with a flag,
          TSO and SC are indistinguishable; what needs care is code that writes one variable and then reads another.
        </p>
      {:else}
        <p>
          所以“x86 的内存模型很弱”这句话要小心：它只比 SC 多允许一类历史——store 晚一点被看见。
          对绝大多数依赖 flag 的正确程序，TSO 和 SC 没有区别；真正需要小心的是那些“先写一个变量、再读另一个变量”的代码。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">4.4</span>MFENCE {t('与 x86', 'and x86')}</h3>
      {#if en}
        <p>
          The most direct way to restore that edge on x86 is <code>MFENCE</code>: it guarantees that all earlier stores
          have drained before later loads or stores execute. Compiler synchronization primitives, Java volatile writes,
          and C++ seq_cst operations all end up on similar instructions.
        </p>
        <ul>
          <li><code>MFENCE</code>: a full barrier, constraining both stores and loads.</li>
          <li>
            <code>LOCK</code>-prefixed instructions and <code>XCHG</code>: they carry full-barrier semantics implicitly
            and usually cost more than a bare fence.
          </li>
          <li>
            <code>SFENCE</code> / <code>LFENCE</code>: constrain stores and loads respectively, but TSO already orders
            those, so ordinary synchronization rarely uses them alone.
          </li>
        </ul>
        <div class="note">
          <b>Why doesn't x86 just implement SC:</b> a store buffer hides store-miss latency, and stores make up a large
          share of real workloads. Giving up one edge buys a pipeline that does not stall on every write miss — a
          trade-off x86 has revisited for decades.
        </div>
        <p>
          The model that formalizes this behavior is <b>x86-TSO</b>: a per-core FIFO store buffer, loads that may
          forward, and stores that leave the buffer atomically. It is precise enough to decide litmus tests directly —
          the engine in this chapter is an executable version of it.
        </p>
      {:else}
        <p>
          在 x86 上把那条边补回来，最直接的办法是 <code>MFENCE</code>：它保证之前的 store 全部 drain 之后，
          之后的 load / store 才能执行。编译器同步原语、JVM 的 volatile 写、C++ 的 seq_cst 操作，最终都会落到类似的指令上。
        </p>
        <ul>
          <li><code>MFENCE</code>：全屏障，store 与 load 都受约束。</li>
          <li><code>LOCK</code> 前缀指令与 <code>XCHG</code>：隐含全屏障语义，通常比单独的 fence 更贵。</li>
          <li><code>SFENCE</code> / <code>LFENCE</code>：分别约束 store 与 load，但 TSO 本身已经保序，日常同步很少单独用它们。</li>
        </ul>
        <div class="note">
          <b>为什么 x86 不干脆做 SC：</b>store buffer 填平的是 store miss 的延迟，而 store 在真实负载里占比很高。
          松掉一条边，换回的是流水线不必为每次写 miss 停下——这是 x86 在几十年里反复权衡后的选择。
        </div>
        <p>
          形式化地描述这套行为的就是 <b>x86-TSO</b> 模型：每核一个 FIFO store buffer、load 可 forward、store 原子地离开 buffer。
          它足够精确，可以直接拿来做 litmus test 的判定——本章的引擎就是它的一个可执行版本。
        </p>
      {/if}
    </div>

    <div class="prose">
      <div class="pull">
        {t(
          'TSO 的边界很清楚：store 可以晚一点被看见，但绝不会被别的核提前看见；load 之间、store 之间仍然保序。',
          'TSO\u2019s boundary is clear: a store may be seen later, but never earlier by another core; loads stay ordered with each other, and so do stores.'
        )}
      </div>
      {#if en}
        <p>
          If even store → store and load → load were allowed to reorder, a store buffer would not be enough and a more
          general relaxed model would be needed. The next chapter takes the four edges apart one by one and shows how
          fences, dependencies, and release/acquire pin back the ones you need.
        </p>
      {:else}
        <p>
          如果连 store → store、load → load 也允许重排，store buffer 就不够用了，需要更一般的 relaxed 模型。
          下一章把这四条边逐一拆开，看 fence、依赖和 release/acquire 如何把需要的那几条重新钉住。
        </p>
      {/if}
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => navigate('/ch5')}>
          <span class="next-no display">05</span>
          <strong>{t('Relaxed 内存模型', 'Relaxed consistency')}</strong>
          <span>{t(
            '四条边全部 relax 之后，用什么把正确性找回来。',
            'What restores correctness after all four edges are relaxed.'
          )}</span>
        </button>
        <button class="next-card" onclick={() => navigate('/ch3')}>
          <span class="next-no display">03</span>
          <strong>{t('回到顺序连贯性', 'Back to sequential consistency')}</strong>
          <span>{t(
            'SC 的全序定义，以及 (0, 0) 的环证明。',
            'SC\u2019s total-order definition, and the cycle proof for (0, 0).'
          )}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .orders {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .order {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 12px 13px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 11px;
  }

  .order.kept {
    border-color: #d5e2dd;
  }

  .order.relaxed {
    background: var(--ember-soft);
    border-color: #eed8ce;
  }

  .op-pair {
    font-size: 12px;
    color: var(--accent-deep);
  }

  .order.relaxed .op-pair {
    color: var(--ember);
  }

  .order strong {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--ink-2);
  }

  .order span:last-child {
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .m-sub {
    display: block;
    margin-top: 2px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    color: var(--muted);
  }

  .table .ember {
    color: var(--ember);
  }

  .table td {
    vertical-align: top;
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
    .orders {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 560px) {
    .orders {
      grid-template-columns: minmax(0, 1fr);
    }

    .table thead {
      display: none;
    }

    .table,
    .table tbody,
    .table tr,
    .table td {
      display: block;
      width: 100%;
    }

    .table tr {
      margin-bottom: 9px;
      padding: 10px 12px;
      background: var(--card-2);
      border: 1px solid var(--line);
      border-radius: 10px;
    }

    .table tr:last-child {
      margin-bottom: 0;
    }

    .table td {
      padding: 1px 0;
      border: none;
    }

    .table td:first-child {
      padding-bottom: 5px;
    }

    .table td.num::before {
      content: attr(data-label);
      display: inline-block;
      width: 36px;
      font-family: 'Inter', sans-serif;
      font-size: 9.5px;
      letter-spacing: 0.06em;
      color: var(--muted);
    }

    .table td.why {
      margin-top: 5px;
      padding-top: 6px;
      border-top: 1px dashed var(--line);
      font-size: 10.5px;
      line-height: 1.6;
      color: var(--ink-3);
    }
  }
</style>
