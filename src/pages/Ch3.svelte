<script lang="ts">
  import ChapterHead from '../components/ChapterHead.svelte';
  import Figure from '../components/Figure.svelte';
  import InterleavingLab from '../components/InterleavingLab.svelte';
  import { lang, t } from '../lib/lang.svelte';
  import { navigate } from '../lib/router.svelte';

  const en = $derived(lang.value === 'en');
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={3}
      title="顺序连贯性"
      en="Sequential Consistency"
      lede={t(
        'SC 只有一句话：所有操作存在一个全序，每个核保持自己的程序顺序，load 读到全序上最近一次写。这句话强到足以把 (0,0) 排除在外——下面你可以亲手验证。',
        'SC is a single sentence: all operations have a total order, each core keeps its program order, and every load reads the most recent write in that order. That is strong enough to rule out (0, 0) — you can check it yourself below.'
      )}
    />

    <div class="prose">
      <h3><span class="h-no">3.1</span>{t('定义', 'Definition')}</h3>
      {#if en}
        <p>
          Lamport's definition is usually written as three conditions. An execution is legal if and only if there is a
          total order over all operations such that:
        </p>
        <ol>
          <li>the relative order of each core's operations in this total order matches its program order;</li>
          <li>each load reads the value of the most recent store to the same address before it in the total order;</li>
          <li>nothing else is constrained — every total order satisfying the first two conditions counts.</li>
        </ol>
        <p>
          The third condition is easy to overlook: SC does not dictate which core goes first. It only requires that
          <em>some</em> coherent global order exists. So judging whether an outcome is legal really means asking:
          can this total order be built?
        </p>
      {:else}
        <p>
          Lamport 的定义常被写成三句话。一个执行合法，当且仅当存在一个所有操作的全序，使得：
        </p>
        <ol>
          <li>每个核的操作在这个全序里的相对次序，与它的程序顺序相同；</li>
          <li>每个 load 读到的值，等于全序上它之前最近一次对同一地址的 store；</li>
          <li>没有任何额外约束——所有满足前两条的全序都算数。</li>
        </ol>
        <p>
          第三条很容易被忽略：SC 不规定不同核之间谁先谁后，它只要求“存在”一个说得通的全局顺序。
          所以判断一个结果是否合法，本质上是问：能不能找到一个全序，把它排出来。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 3.1', 'Figure 3.1')}
      caption={t(
        '点击带描边的指令，把它放到全序的下一位。每排完一次，引擎告诉你这个结果在全部合法交错里出现了几次；标着“不可达”的卡片，一次也没有出现。',
        'Click the outlined instruction to place it next in the total order. Each time you finish, the engine tells you how often that outcome occurs among all legal interleavings; cards marked “unreachable” never occur at all.'
      )}
    >
      <InterleavingLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Switch to Message Passing and look again: C2's spin keeps it from moving past flag, and data is always ordered
          before flag, so the data C2 reads can only be the new value. Run the same engine and only (1, 1) is reachable —
          that is not a convention, it is the result of enumeration.
        </p>
      {:else}
        <p>
          换成 Message Passing 再看一遍：C2 的 spin 让它无法越过 flag，而 data 一定排在 flag 之前，
          于是 C2 读到的 data 只能是新值。用同一台引擎排完，只有 (1, 1) 可达——这不是约定，是枚举的结果。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">3.2</span>{t('为什么 (0, 0) 排不出来', 'Why (0, 0) cannot be ordered')}</h3>
      {#if en}
        <p>
          Beyond enumeration there is a shorter argument. Suppose store buffering really produced r1 = 0 and r2 = 0.
          Then in the total order:
        </p>
        <ul>
          <li>r1 = 0 means C1's load precedes C2's store;</li>
          <li>r2 = 0 means C2's load precedes C1's store;</li>
          <li>and program order requires each core's store to precede its own load.</li>
        </ul>
        <p>Four edges close head to tail into a cycle — a total order cannot contain a cycle.</p>
      {:else}
        <p>
          枚举之外，还有一个更短的论证。假设 store buffering 真的出现了 r1 = 0、r2 = 0，那么在全序上：
        </p>
        <ul>
          <li>r1 = 0 说明 C1 的 load 先于 C2 的 store；</li>
          <li>r2 = 0 说明 C2 的 load 先于 C1 的 store；</li>
          <li>而程序顺序要求每个核的 store 先于自己的 load。</li>
        </ul>
        <p>四条边首尾相接，形成一个环——全序里不可能有环。</p>
      {/if}
    </div>

    <Figure
      no={t('图 3.2', 'Figure 3.2')}
      caption={t(
        '两条程序顺序边（青）与两条“读到 0”推出的边（赭）首尾相接构成环。环存在，就说明假设不成立。',
        'Two program-order edges (teal) and two edges implied by “read 0” (ochre) close head to tail into a cycle. A cycle means the assumption is false.'
      )}
    >
      <div class="cycle">
        <svg viewBox="0 0 660 232" role="img" aria-label={t(
          'store buffering 的不可达性证明：四条边构成环',
          'Unreachability proof for store buffering: four edges form a cycle'
        )}>
          <defs>
            <marker id="arw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#2f5d62" />
            </marker>
            <marker id="arw-d" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#b4543a" />
            </marker>
          </defs>

          <g class="c1">
            <rect x="55" y="22" width="150" height="42" rx="10" class="node" />
            <text x="130" y="39" class="op" text-anchor="middle">S1</text>
            <text x="130" y="54" class="txt" text-anchor="middle">x = NEW</text>
          </g>
          <g class="c1">
            <rect x="55" y="158" width="150" height="42" rx="10" class="node" />
            <text x="130" y="175" class="op" text-anchor="middle">L1</text>
            <text x="130" y="190" class="txt" text-anchor="middle">r1 = y</text>
          </g>
          <g class="c2">
            <rect x="455" y="158" width="150" height="42" rx="10" class="node" />
            <text x="530" y="175" class="op" text-anchor="middle">S2</text>
            <text x="530" y="190" class="txt" text-anchor="middle">y = NEW</text>
          </g>
          <g class="c2">
            <rect x="455" y="22" width="150" height="42" rx="10" class="node" />
            <text x="530" y="39" class="op" text-anchor="middle">L2</text>
            <text x="530" y="54" class="txt" text-anchor="middle">r2 = x</text>
          </g>

          <path d="M130 66V150" class="po" marker-end="url(#arw)" />
          <path d="M530 156V66" class="po" marker-end="url(#arw)" />
          <path d="M207 179H447" class="assume" marker-end="url(#arw-d)" />
          <path d="M453 43H213" class="assume" marker-end="url(#arw-d)" />

          <text x="142" y="112" class="edge-lbl">{t('程序顺序', 'program order')}</text>
          <text x="518" y="112" class="edge-lbl" text-anchor="end">{t('程序顺序', 'program order')}</text>
          <text x="330" y="171" class="edge-lbl" text-anchor="middle">{t('r1 = 0，所以先于 S2', 'r1 = 0, so before S2')}</text>
          <text x="330" y="36" class="edge-lbl" text-anchor="middle">{t('r2 = 0，所以先于 S1', 'r2 = 0, so before S1')}</text>

          <text x="330" y="108" class="center-a" text-anchor="middle">{t('四条边闭合', 'Four edges close')}</text>
          <text x="330" y="129" class="center-b" text-anchor="middle">{t('不存在这样的全序', 'no such total order exists')}</text>
        </svg>

        <ol class="cycle-list">
          <li><span class="dash prog"></span><b>S1 → L1</b><span>{t('程序顺序：C1 的 store 先于自己的 load', 'Program order: C1\u2019s store precedes its own load')}</span></li>
          <li><span class="dash read"></span><b>L1 → S2</b><span>{t('r1 = 0：L1 读到的只能是初值，所以排在 S2 之前', 'r1 = 0: L1 can only read the initial value, so it precedes S2')}</span></li>
          <li><span class="dash prog"></span><b>S2 → L2</b><span>{t('程序顺序：C2 的 store 先于自己的 load', 'Program order: C2\u2019s store precedes its own load')}</span></li>
          <li><span class="dash read"></span><b>L2 → S1</b><span>{t('r2 = 0：L2 读到的只能是初值，所以排在 S1 之前', 'r2 = 0: L2 can only read the initial value, so it precedes S1')}</span></li>
        </ol>
        <p class="cycle-close">{t(
          '回到 S1——四条边首尾相接，全序里不可能有环。',
          'Back to S1 — the four edges close head to tail, and a total order cannot contain a cycle.'
        )}</p>
      </div>
    </Figure>

    <div class="prose">
      <div class="pull">
        {t(
          '不可达性证明不需要枚举：只要假设与程序顺序一起推出环，这个结果就被 SC 排除。',
          'Unreachability needs no enumeration: if the assumption and program order together imply a cycle, SC rules the outcome out.'
        )}
      </div>
      {#if en}
        <p>
          Conversely, if the hardware lets a store disappear into a store buffer before it retires, L1 can pass S2 and
          L2 can pass S1, the cycle breaks, and (0, 0) becomes legal. That is exactly where Chapter 4 picks up TSO.
        </p>
      {:else}
        <p>
          反过来说，如果硬件允许 store 在 retire 前就“消失”进 store buffer，那么 L1 可以越过 S2、L2 可以越过 S1，
          环就断了，(0, 0) 变成合法结果。这正是第 4 章 TSO 的起点。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">3.3</span>{t('SC 的代价与实现', 'The cost of SC, and how to build it')}</h3>
      {#if en}
        <p>
          SC's difficulty is not the definition but the cost of waiting for the previous access to finish. The textbook
          gives three implementation levels; going down the list is faster and harder.
        </p>
      {:else}
        <p>
          SC 的问题不在定义，而在“等前面那条做完”很贵。教材给了三个层次的实现，越往下越快，也越难做。
        </p>
      {/if}
    </div>

    <Figure no={t('图 3.3', 'Figure 3.3')} caption={t(
      '三种达到 SC 的路线。共同点：都必须让 store 对其他核可见之后，后续 load 才能越过它。',
      'Three routes to SC. They share one requirement: a store must be visible to other cores before a later load may pass it.'
    )}>
      <div class="impls">
        <div class="impl">
          <span class="impl-no display">01</span>
          <strong>{t('没有 cache', 'No caches')}</strong>
          <p>{t(
            '所有访存经过一个原子切换的开关，一次只服务一个核。SC 自然成立，代价是每条指令都要排队。',
            'All accesses pass through a switch that atomically serves one core at a time. SC holds trivially; the cost is that every access queues.'
          )}</p>
          <span class="impl-cost">{t('简单 · 慢', 'simple · slow')}</span>
        </div>
        <div class="impl">
          <span class="impl-no display">02</span>
          <strong>{t('相干 cache + 顺序', 'Coherent caches + ordering')}</strong>
          <p>{t(
            '私有 cache 处理单地址，coherence 保证副本一致；写要等到失效确认返回，才允许后续 load 完成。',
            'Private caches handle single addresses and coherence keeps copies consistent; a write waits for invalidation acknowledgements before later loads may complete.'
          )}</p>
          <span class="impl-cost">{t('SC 成立 · 延迟高', 'SC holds · high latency')}</span>
        </div>
        <div class="impl">
          <span class="impl-no display">03</span>
          <strong>{t('乱序 + 投机', 'Out-of-order + speculation')}</strong>
          <p>{t(
            '内部乱序执行、预取、投机，只在 commit 阶段保持顺序（R10000 的做法）。对外仍是 SC。',
            'Out-of-order execution, prefetching, and speculation internally, with order enforced only at commit (as in the R10000). Still SC to the outside.'
          )}</p>
          <span class="impl-cost">{t('对外 SC · 实现复杂', 'SC externally · complex')}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          There is a cheaper shortcut: let a store sit in a store buffer and keep executing. That violates “a load may
          not pass a pending write”, so SC is given up — in exchange for TSO, the x86 memory model.
        </p>

        <h3><span class="h-no">3.4</span>How SC and coherence divide the work</h3>
        <p>
          SC is a global constraint, but it presumes single addresses are already handled: if you cannot even get the
          latest value of A, ordering A against B is meaningless. Real systems therefore stack two layers — coherence
          makes “one address looks like a single copy” true, and SC orders those addresses against each other.
        </p>
        <div class="note">
          <b>Common misconception:</b> “My caches are coherent, so my program is SC.” The two are independent:
          coherence can be perfectly correct while a store buffer still produces (0, 0).
        </div>
        <p>
          The next chapter adds the store buffer to the model, shows exactly where SC gets loosened, and why x86 chose to
          loosen that one small step.
        </p>
      {:else}
        <p>
          还有一条更便宜的捷径：让 store 进 store buffer 后立刻继续执行。这违反了“写完成前 load 不能越过”，
          于是 SC 被放弃——换来的是 TSO，也就是 x86 的内存模型。
        </p>

        <h3><span class="h-no">3.4</span>SC 与 coherence 的分工</h3>
        <p>
          SC 是全局约束，但它默认单地址已经被处理好：如果连 A 的最新值都拿不到，谈 A 与 B 的顺序没有意义。
          所以真实的系统是两层叠起来的——coherence 负责“一个地址看起来只有一份”，SC 负责“这些地址之间的顺序”。
        </p>
        <div class="note">
          <b>常见误解：</b>“我的 cache 是 coherent 的，所以程序是 SC 的。” 两件事互相独立：
          coherence 可以完全正确，而 store buffer 仍然让 (0, 0) 出现。
        </div>
        <p>
          下一章把 store buffer 正式加进模型，看 SC 到底在哪一步被松开，以及为什么 x86 选择松这一小步。
        </p>
      {/if}
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => navigate('/ch4')}>
          <span class="next-no display">04</span>
          <strong>{t('TSO 与 x86 内存模型', 'TSO and the x86 memory model')}</strong>
          <span>{t(
            '每核一个 FIFO store buffer，看 (0,0) 如何变成合法结果。',
            'One FIFO store buffer per core; see how (0, 0) becomes a legal outcome.'
          )}</span>
        </button>
        <button class="next-card" onclick={() => navigate('/ch2')}>
          <span class="next-no display">02</span>
          <strong>{t('回到缓存一致性', 'Back to cache coherence')}</strong>
          <span>{t(
            'SWMR 与 data-value，以及 coherence 的适用条件。',
            'SWMR, data-value, and when coherence applies.'
          )}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .cycle {
    padding: 4px 0;
  }

  .cycle svg {
    width: 100%;
    height: auto;
  }

  .cycle-list,
  .cycle-close {
    display: none;
  }

  .cycle-list {
    margin: 0;
    padding: 0;
    list-style: none;
    flex-direction: column;
    gap: 10px;
  }

  .cycle-list li {
    display: flex;
    align-items: baseline;
    gap: 9px;
    font-size: 11.5px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .cycle-list b {
    flex: none;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    color: var(--ink);
    white-space: nowrap;
  }

  .dash {
    flex: none;
    width: 16px;
    height: 2px;
    border-radius: 1px;
    transform: translateY(-3px);
  }

  .dash.prog {
    background: #2f5d62;
  }

  .dash.read {
    background: #b4543a;
  }

  .cycle-close {
    margin: 14px 0 0;
    padding-top: 10px;
    border-top: 1px solid var(--line-2);
    font-size: 11.5px;
    color: var(--ink-2);
  }

  @media (max-width: 560px) {
    .cycle svg {
      display: none;
    }

    .cycle-list {
      display: flex;
    }

    .cycle-close {
      display: block;
    }
  }

  .node {
    fill: var(--card-2);
    stroke: var(--line);
  }

  .c1 .node {
    fill: #eef4f1;
    stroke: #cfded9;
  }

  .c2 .node {
    fill: #f8f1e4;
    stroke: #e6d8bf;
  }

  .op {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    fill: var(--muted);
  }

  .txt {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    fill: var(--ink-2);
  }

  .po {
    stroke: var(--accent);
    stroke-width: 1.3;
    fill: none;
    color: var(--accent);
  }

  .assume {
    stroke: var(--ember);
    stroke-width: 1.3;
    stroke-dasharray: 5 4;
    fill: none;
    color: var(--ember);
  }

  .edge-lbl {
    font-size: 9.5px;
    fill: var(--muted);
  }

  .center-a {
    font-family: 'Fraunces', 'Noto Serif SC', Georgia, serif;
    font-size: 13px;
    fill: var(--ink-2);
  }

  .center-b {
    font-size: 10px;
    letter-spacing: 0.04em;
    fill: var(--muted);
  }

  .impls {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .impl {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 15px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .impl-no {
    font-size: 12px;
    color: var(--gold);
  }

  .impl strong {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
  }

  .impl p {
    font-size: 11.5px;
    line-height: 1.7;
    color: var(--ink-3);
  }

  .impl-cost {
    margin-top: auto;
    padding-top: 4px;
    font-size: 10px;
    letter-spacing: 0.04em;
    color: var(--muted);
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
    .impls,
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
