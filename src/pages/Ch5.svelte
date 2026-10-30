<script lang="ts">
  import ChapterHead from '../components/ChapterHead.svelte';
  import Figure from '../components/Figure.svelte';
  import RelaxLab from '../components/RelaxLab.svelte';
  import FenceMatrix from '../components/FenceMatrix.svelte';
  import { lang, t } from '../lib/lang.svelte';
  import { navigate } from '../lib/router.svelte';

  const en = $derived(lang.value === 'en');
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={5}
      title="Relaxed 内存模型"
      en="Relaxed Memory Consistency"
      lede={t(
        'TSO 只松开一条边，就换回了整个 store buffer。那把四条边全部松开、再用 FENCE 把真正需要的顺序钉回去呢？XC 给出一个可判定的答案；release consistency 把 FENCE 缩减成单向；Power 则连“全局 memory order”都放弃了。',
        'TSO gave up one edge and bought the whole store buffer. What if we relax all four edges and use FENCE to pin back only the order the program truly needs? XC gives a decidable answer; release consistency shrinks FENCE to one direction; Power even gives up a global memory order.'
      )}
    />

    <div class="prose">
      <h3><span class="h-no">5.1</span>{t('为什么要放松', 'Why relax at all')}</h3>
      {#if en}
        <p>
          Single-thread semantics only demand that this core appears to execute in order. Cross-core correctness usually
          comes from locks: how the loads and stores inside a critical section are ordered among themselves — as long as
          no single address is involved — is something the program simply does not care about. SC and TSO pin all of them
          down anyway.
        </p>
        <p>
          The book's example is typical: C1 writes two data values, then flag; C2 spins until flag becomes SET, then
          reads the two data values. The program truly depends on only two publication chains; the other two are extra
          order that the strong model imposes.
        </p>
      {:else}
        <p>
          单线程语义只要求“本核看起来是按顺序执行的”。跨核正确性则通常靠锁：临界区内部那些 load 与 store 之间
          怎么排，只要不涉及同一地址，程序根本不关心。SC 和 TSO 却仍然把它们全部钉死。
        </p>
        <p>
          书里的例子很典型：C1 先写两条 data，再写 flag；C2 spin 等 flag 变成 SET，然后读两条 data。
          程序真正依赖的顺序只有两条发布链，其余两条是强模型额外加上的。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 5.1', 'Figure 5.1')}
      caption={t(
        'Table 5.1 里真正被程序依赖的顺序，与 SC / TSO 额外强加的顺序。放松模型要做的，就是把右边这两条不必要的边拿掉。',
        'The order Table 5.1 actually depends on, versus the order SC / TSO impose extra. A relaxed model\u2019s job is to remove the two unnecessary edges on the right.'
      )}
    >
      <div class="need-grid">
        <div class="need-card">
          <span class="need-k">{t('程序真正依赖', 'Actually required')}</span>
          <div class="chain">
            <span class="node mono">S1</span><span class="arrow">→</span>
            <span class="node mono">S3</span><span class="arrow">→</span>
            <span class="node mono">L1</span><span class="arrow">→</span>
            <span class="node mono">L2</span>
          </div>
          <div class="chain">
            <span class="node mono">S2</span><span class="arrow">→</span>
            <span class="node mono">S3</span><span class="arrow">→</span>
            <span class="node mono">L1</span><span class="arrow">→</span>
            <span class="node mono">L3</span>
          </div>
          <p>{t(
            'S3 发布 flag；L1 读到 SET 之后，两条 data 必须已经可见。',
            'S3 publishes flag; once L1 reads SET, both data values must already be visible.'
          )}</p>
        </div>
        <div class="need-card extra-card">
          <span class="need-k">{t('SC / TSO 额外强加', 'SC / TSO impose extra')}</span>
          <div class="chain">
            <span class="node extra mono">S1</span><span class="arrow extra">→</span>
            <span class="node extra mono">S2</span>
          </div>
          <div class="chain">
            <span class="node extra mono">L2</span><span class="arrow extra">→</span>
            <span class="node extra mono">L3</span>
          </div>
          <p>{t(
            '两条 data store 的先后、两条 data load 的先后，程序并不依赖，却挡住了非 FIFO write buffer 和 load 重排。',
            'The order between the two data stores, and between the two data loads, is not something the program depends on — yet it blocks non-FIFO write buffers and load reordering.'
          )}</p>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Remove those unnecessary orders and loads and stores may reorder by default; that is a relaxed (weak) model.
          The cost moves to the programmer: wherever order really is needed, you must say so. There is one tool:
          <b>FENCE</b>.
        </p>
        <ul>
          <li>
            <b>non-FIFO coalescing write buffer:</b> stores to different addresses can merge into one buffer entry;
            TSO's FIFO constraint blocks that.
          </li>
          <li>
            <b>simpler speculation:</b> an SC core must check whether a speculative load has passed a coherence request;
            under a relaxed model such a load is not speculative in the first place.
          </li>
          <li>
            <b>opening the coherence box:</b> allowing a store to become visible to some cores before others. Power
            allows this optimization, at the cost of no longer ruling out IRIW.
          </li>
        </ul>
      {:else}
        <p>
          把这些不必要的顺序去掉，load 与 store 默认就可以自由重排，这就是 relaxed（weak）模型。
          代价转移给了程序员：哪些地方真的需要顺序，必须自己说出来。工具只有一个——<b>FENCE</b>。
        </p>
        <ul>
          <li><b>non-FIFO coalescing write buffer：</b>不同序的 store 可以合并进同一个 buffer entry，TSO 的 FIFO 约束会挡住它。</li>
          <li><b>更简单的 speculation：</b>SC 的核必须检查投机 load 有没有越过 coherence 请求；relaxed 模型里这类 load 本来就不算投机。</li>
          <li><b>打开 coherence 盒子：</b>允许一条 store 对一部分核先可见、对另一部分核后可见。Power 就允许这种优化，代价是 IRIW 不再被排除。</li>
        </ul>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">5.2</span>{t('XC：把顺序交给 FENCE', 'XC: hand ordering to FENCE')}</h3>
      {#if en}
        <p>
          XC is a relaxed model designed for teaching: it still assumes a global memory order &lt;m&gt; on which every
          operation occupies a position. There are only three rules:
        </p>
        <ul>
          <li>
            <b>FENCE isolates both directions:</b> loads and stores before the FENCE are ordered before it, and those
            after are ordered after it; two FENCEs on the same core are also ordered. A FENCE names no address and does
            not constrain other cores' own order.
          </li>
          <li>
            <b>Same-address ordering:</b> L → L, L → S, and S → S to the same address keep program order, so a single
            core still appears sequential.
          </li>
          <li>
            <b>Same-address S → L must bypass:</b> a store may be ordered after a later load, but the load must
            immediately see the value of the earlier store from its own core.
          </li>
        </ul>
      {:else}
        <p>
          XC 是一个为教学设计的 relaxed 模型：它仍然假设存在一条全局 memory order &lt;m&gt;，所有操作都在这条序上
          占一个位置。规则只有三条：
        </p>
        <ul>
          <li><b>FENCE 双向隔离：</b>FENCE 之前的 load / store 都排在 FENCE 之前，之后的都排在之后；同核的两个 FENCE 也保序。FENCE 不指定地址，也不影响别的核自己的顺序。</li>
          <li><b>同地址保序：</b>L → L、L → S、S → S 到同一地址时保持程序顺序，这样单个核看起来仍然是顺序执行的。</li>
          <li><b>同地址 S → L 要 bypass：</b>store 可以排到后面的 load 之后，但 load 必须立刻看到本核之前那条 store 的值。</li>
        </ul>
      {/if}
    </div>

    <Figure
      no={t('图 5.2', 'Figure 5.2')}
      caption={t(
        'Table 5.5：XC 的保序规则。A 只在同地址时生效，B 表示同地址时要 bypass，X 是无条件——FENCE 与任何操作之间都保序。',
        'Table 5.5: XC\u2019s ordering rules. A applies only to the same address, B means same-address bypass, and X is unconditional — FENCE is ordered with every operation.'
      )}
    >
      <div class="rules">
        <span class="rc"></span>
        <span class="rc head">Load</span>
        <span class="rc head">Store</span>
        <span class="rc head">RMW</span>
        <span class="rc head">FENCE</span>

        <span class="rc row-h mono">Load</span>
        <span class="rc a">A</span>
        <span class="rc a">A</span>
        <span class="rc a">A</span>
        <span class="rc x">X</span>

        <span class="rc row-h mono">Store</span>
        <span class="rc b">B</span>
        <span class="rc a">A</span>
        <span class="rc a">A</span>
        <span class="rc x">X</span>

        <span class="rc row-h mono">RMW</span>
        <span class="rc a">A</span>
        <span class="rc a">A</span>
        <span class="rc a">A</span>
        <span class="rc x">X</span>

        <span class="rc row-h mono">FENCE</span>
        <span class="rc x">X</span>
        <span class="rc x">X</span>
        <span class="rc x">X</span>
        <span class="rc x">X</span>
      </div>
      <div class="rules-legend">
        <span><b class="mk a">A</b>{t('同地址才保序', 'same address only')}</span>
        <span><b class="mk b">B</b>{t('同地址必须 bypass', 'same-address bypass')}</span>
        <span><b class="mk x">X</b>{t('无条件保序', 'always ordered')}</span>
        <span class="rules-diff">{t(
          '与 TSO 的差别：S → L，以及不同地址上的 L → S、L → L、S → S。',
          'The difference from TSO: S → L, and L → S, L → L, S → S at different addresses.'
        )}</span>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Read the table as one sentence: <b>except for the same address and FENCE, XC guarantees nothing</b>. SB's
          (0, 0) is of course legal; even LB's (1, 1) is legal — a load may be ordered after its own core's store.
          This is the real watershed between TSO and XC: TSO's store buffer gives up only store → load, while XC gives
          up all four edges.
        </p>
      {:else}
        <p>
          把这张表读成一句话：<b>除了同一地址和 FENCE，XC 什么都不保证</b>。SB 的 (0, 0) 当然合法；
          连 LB 的 (1, 1) 也合法——load 可以排到本核 store 之后。这是 TSO 与 XC 真正的分水岭：
          TSO 的 store buffer 只松开 store → load，而 XC 把四条边全部松开。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 5.3', 'Figure 5.3')}
      caption={t(
        '先选模型，再逐条把指令放进 memory order。被 po 挡住的指令在强模型下点不动；换到 XC，同一道题的可选集合会立刻变大。FENCE 就位后会自动进入序中。',
        'Pick a model, then place instructions into the memory order one at a time. Instructions blocked by po are unclickable under strong models; switch to XC and the legal set immediately grows. A FENCE enters the order on its own once placed.'
      )}
    >
      <RelaxLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Switch models on the three tests and you see three different things. SB only cares when a store becomes
          visible, so TSO and XC give the same answer; LB exposes the extra load → store edge XC gives up; MP needs a
          FENCE to pin the publication chain back down.
        </p>
        <p>
          The engine decides directly: generate the order constraints for the chosen model, enumerate every &lt;m&gt;
          satisfying them, and let each load read the latest preceding store. The resulting set is every history the
          model allows — not a probability, and not a coincidence of one implementation.
        </p>
      {:else}
        <p>
          在三道题上切换模型，可以看到三件不同的事。SB 只关心 store 何时可见，所以 TSO 和 XC 给出同样的答案；
          LB 才暴露 XC 额外松开的那条 load → store；MP 则需要 FENCE 来把发布链重新钉住。
        </p>
        <p>
          引擎的判定方式很直接：按选定模型生成“必须保序”的约束，枚举所有满足约束的 &lt;m&gt;，每条 load 读它前面最近一次
          store。结果集合就是模型允许的全部历史——不是概率，也不是某一种实现的巧合。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">5.3</span>{t('FENCE 放在哪里', 'Where to put the FENCE')}</h3>
      {#if en}
        <p>
          Table 5.3 puts two FENCEs into MP: the producer places F1 between data and flag, and the consumer places F2
          between the spin and the following load. F1 is easy to see; F2 is often overlooked — if the two loads could
          reorder, they would make “stores that executed in program order” look out of order, and r2 would read 0.
        </p>
      {:else}
        <p>
          书里的 Table 5.3 在 MP 里放了两条 FENCE：生产者把 F1 放在 data 与 flag 之间，消费者把 F2 放在 spin 与
          后面的 load 之间。F1 很好理解，F2 却常被忽略——如果允许两条 load 重排，它们可以让“按程序顺序执行的 store”
          看起来像乱序，r2 就读到 0。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 5.4', 'Figure 5.4')}
      caption={t(
        'MP 在 XC 下、两条 FENCE 的四种组合。(1, 0) 的条数由引擎穷举得到；只有两条 FENCE 同时打开，它才被完全排除。',
        'MP under XC with the four combinations of the two FENCEs. The (1, 0) counts come from exhaustive enumeration; only with both FENCEs on is it fully excluded.'
      )}
    >
      <FenceMatrix />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Both are needed: F1 establishes data → flag, F2 establishes flag → the read of data. Without F1, data can land
          after flag; without F2, the second load can pass the spin. Together they form the complete publish–subscribe
          chain.
        </p>
        <p>Critical sections work the same way. Table 5.4's conservative approach puts a FENCE on both sides of every acquire / release:</p>
      {:else}
        <p>
          两边缺一不可：F1 建立 data → flag，F2 建立 flag → data 的读。少了 F1，data 可以晚于 flag 落地；
          少了 F2，第二条 load 可以越过 spin。两者合起来，才是完整的发布—订阅链。
        </p>
        <p>
          临界区也是同一回事。Table 5.4 的保守做法是给每个 acquire / release 前后都套上 FENCE：
        </p>
      {/if}
      <div class="chain-box mono">All L1i, S1j → F13 → R11 → A21 → F22 → All L2i, S2j</div>
      {#if en}
        <p>
          F13 guarantees that accesses inside the critical section are ordered before release, and F22 that they are
          ordered after acquire. F11, F14, F21, and F24 are redundant — an operation after release executing early does
          no harm, and one before acquire executing late does none either. That observation leads straight to release
          consistency (5.5).
        </p>
        <div class="note">
          <b>How to implement a FENCE:</b> treat it as a no-op SC (the academic approach); or wait for all earlier
          operations to complete before letting anything through, the common “FENCE as drain”, simple but expensive; or
          push only the necessary order onto the memory order, fast but hard to design and verify.
        </div>
        <p>
          Atomic RMW has a shortcut under XC too: obtain read-write coherence permission for the block, execute the load
          and store halves without releasing it in between; no need to drain the write buffer as under TSO. Lock idioms
          change accordingly: the acquire RMW is followed by a FENCE, and the release store is preceded by one.
        </p>
      {:else}
        <p>
          其中 F13 保证临界区内的访问排在 release 之前，F22 保证它们排在 acquire 之后。
          F11、F14、F21、F24 其实是多余的——release 之后的操作提前执行没有坏处，acquire 之前的操作拖后也没有。
          这个观察直接通向 release consistency（5.5）。
        </p>
        <div class="note">
          <b>FENCE 怎么实现：</b>可以把它当成 no-op 的 SC（学术方案）；也可以等前面所有操作都完成再放行，这是常见的
          “FENCE as drain”，简单但贵；还可以只把必要的顺序推到 memory order 上，性能好但难设计、难验证。
        </div>
        <p>
          原子 RMW 在 XC 下也有一条捷径：先拿到 block 的 read-write coherence 权限，再执行 load 与 store 两半，
          中间不放手；不需要像 TSO 那样先把 write buffer drain 干净。锁的写法也随之变化：acquire 的 RMW 之后要跟一条
          FENCE，release 的 store 之前要有 FENCE。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">5.4</span>SC for DRF</h3>
      {#if en}
        <p>
          If every programmer had to face XC's rules directly, no one would use a relaxed model. Fortunately, for
          <b>data-race-free</b> programs, reasoning can fall back to SC. A data race is: two threads access the same
          address, at least one is a write, and no synchronization lies between them.
        </p>
        <p>
          The book compares two cases of the same program: C1 writes data1, data2, and C2 reads data2, data1 in reverse.
          If C2 takes no lock, races exist between both loads and both stores, and all four outcomes can appear; if C2
          takes the same lock, the critical sections serialize and only (0, 0) and (1, 1) remain — just like SC.
        </p>
      {:else}
        <p>
          如果每个程序员都必须直接面对 XC 的规则，relaxed 模型就不会有人用。幸运的是，对
          <b>data-race-free</b> 程序，可以把推理退回 SC。data race 的定义是：两个线程访问同一地址、至少一个是写、
          中间没有同步操作。
        </p>
        <p>
          书里用同一个程序对比了两种情况：C1 写 data1、data2，C2 反序读 data2、data1。如果 C2 不拿锁，
          两个 load 与两个 store 之间都存在 race，四个结果都可能出现；如果 C2 拿同一把锁，临界区被串行化，
          只剩 (0, 0) 和 (1, 1)——和 SC 一样。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 5.5', 'Figure 5.5')}
      caption={t(
        'Table 5.7 / 5.8：同一个程序，C2 有没有拿同一把锁，允许的结果集合完全不同。锁把两个临界区串起来，race 消失了。',
        'Tables 5.7 / 5.8: the same program, with and without the same lock on C2, permits completely different outcome sets. The lock chains the critical sections together and the race disappears.'
      )}
    >
      <div class="drf-grid">
        <div class="drf-card bad">
          <span class="drf-k">{t('没有同步 · 有 data race', 'No synchronization · data race')}</span>
          <div class="drf-prog mono">
            <span>C1: data1 = NEW; data2 = NEW</span>
            <span>C2: r2 = data2; r1 = data1</span>
          </div>
          <div class="mini-grid">
            <span class="chip mono">(0, 0)</span>
            <span class="chip mono">(0, 1)</span>
            <span class="chip mono">(1, 0)</span>
            <span class="chip mono">(1, 1)</span>
          </div>
          <p>{t(
            '两个 load 之间、两个 store 之间都没有顺序，四个组合全都在。',
            'No order between the two loads or between the two stores, so all four combinations remain.'
          )}</p>
        </div>
        <div class="drf-card good">
          <span class="drf-k">{t('同一把锁 · DRF', 'Same lock · DRF')}</span>
          <div class="drf-prog mono">
            <span>C1: acquire; S1; S2; release</span>
            <span>C2: acquire; L1; L2; release</span>
          </div>
          <div class="mini-grid">
            <span class="chip mono">(0, 0)</span>
            <span class="chip no mono">(0, 1)</span>
            <span class="chip no mono">(1, 0)</span>
            <span class="chip mono">(1, 1)</span>
          </div>
          <p>{t(
            '临界区整体串行；内部的 store / load 怎么排，都不影响这两个结果。',
            'The critical sections serialize as a whole; how the stores / loads inside are ordered does not change these two outcomes.'
          )}</p>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          <b>SC for DRF</b> generalizes these examples into a theorem: if a program is DRF under SC and every
          synchronization operation is surrounded by FENCEs, then every execution under XC is an SC execution.
          Programmers keep reasoning with SC, and the hardware keeps the performance of a relaxed model.
        </p>
        <div class="note">
          <b>The cost:</b> which operations might race is undecidable in general (it would solve the halting problem),
          so FENCEs can only be placed conservatively: when unsure, add one, losing at most performance. If a data race
          really exists, executions may no longer be SC, and you must reason from the model itself.
        </div>
      {:else}
        <p>
          <b>SC for DRF</b> 把这两个例子推广成一条定理：如果程序在 SC 下是 DRF 的，并且所有同步操作前后都有
          FENCE，那么它在 XC 下的每一条执行都是 SC 执行。程序员可以继续用 SC 推理，硬件继续享受 relaxed 的性能。
        </p>
        <div class="note">
          <b>代价：</b>“哪些操作可能 race”在一般情况下不可判定（要解 halting problem），所以 FENCE 只能靠保守放置：
          不确定就多放一条，最多损失性能。真有 data race 时，执行可能不再是 SC，就只能回到模型本身推理。
        </div>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">5.5</span>release consistency、causality {t('与 write atomicity', 'and write atomicity')}</h3>
      {#if en}
        <p>
          Release consistency (RC) observes that fencing both sides of a synchronization operation overprotects. Acquire
          only needs to block later accesses and release only earlier ones. So the FENCE splits into two one-way
          operations.
        </p>
      {:else}
        <p>
          release consistency（RC）的观察是：给同步操作两边都套 FENCE 属于过度保护。acquire 只需要挡住后面的访问，
          release 只需要挡住前面的访问。于是 FENCE 被拆成两个单向操作。
        </p>
      {/if}
    </div>

    <Figure no={t('图 5.6', 'Figure 5.6')} caption={t(
      'FENCE 双向隔离；ACQUIRE 与 RELEASE 各自只挡一个方向。',
      'FENCE isolates both directions; ACQUIRE and RELEASE each block one.'
    )}>
      <div class="dir-table">
        <span class="dh"></span>
        <span class="dh">{t('前面的操作能排到后面吗？', 'can earlier operations move later?')}</span>
        <span class="dh">{t('后面的操作能排到前面吗？', 'can later operations move earlier?')}</span>

        <span class="dk mono">FENCE</span>
        <span class="dv no">{t('挡住', 'blocked')}</span>
        <span class="dv no">{t('挡住', 'blocked')}</span>

        <span class="dk mono">ACQUIRE</span>
        <span class="dv yes">{t('可以', 'allowed')}</span>
        <span class="dv no">{t('挡住', 'blocked')}</span>

        <span class="dk mono">RELEASE</span>
        <span class="dv no">{t('挡住', 'blocked')}</span>
        <span class="dv yes">{t('可以', 'allowed')}</span>
      </div>
      <p class="dir-note">
        {t(
          'RC 的规则：ACQUIRE → Load/Store；Load/Store → RELEASE；ACQUIRE 与 RELEASE 之间再按 SC 保序。这样一个临界区只需要 release 前的 FENCE 和 acquire 后的 FENCE，而不是前后各一条。',
          'RC\u2019s rules: ACQUIRE → Load/Store; Load/Store → RELEASE; and ACQUIRE / RELEASE are ordered as under SC. A critical section then needs only a FENCE before release and one after acquire, not one on each side.'
        )}
      </p>
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Two concepts often appear alongside RC. <b>Causality</b> says: if I saw it and told you, you should see it
          too. C1 writes data1, C2 sees it and writes data2, C3 sees data2 and then reads data1 — r3 should always be
          NEW. <b>Write atomicity</b> is stronger: a store takes effect for all cores at the same instant, with no state
          in which some cores see it and others do not.
        </p>
      {:else}
        <p>
          两个概念经常和 RC 一起出现。<b>Causality</b> 说：“如果我看到了，并告诉了你，那你也应该看到。”
          C1 写 data1，C2 看到后写下 data2，C3 看到 data2 后再读 data1——r3 应该一定是 NEW。
          <b>Write atomicity</b> 更强：一条 store 对所有核在同一时刻生效，中间没有“部分核已看到、部分核还没看到”的状态。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 5.7', 'Figure 5.7')}
      caption={t(
        'Table 5.9 的因果链。每一步都建立在“看到”之上；如果 C3 最后读到 0，因果关系就断了。',
        'The causal chain of Table 5.9. Every step builds on “seeing”; if C3 finally reads 0, causality is broken.'
      )}
    >
      <div class="causal">
        <div class="c-core">
          <span class="c-id mono">C1</span>
          <span class="c-op mono">S1: data1 = NEW</span>
        </div>
        <span class="c-link">
          <span class="c-link-k">{t('被 C2 看到', 'seen by C2')}</span>
          <span class="c-arrow">→</span>
        </span>
        <div class="c-core">
          <span class="c-id mono">C2</span>
          <span class="c-op mono">{t('L1: spin 到 data1 = NEW', 'L1: spin until data1 = NEW')}</span>
          <span class="c-op mono">F1: FENCE</span>
          <span class="c-op mono">S2: data2 = NEW</span>
        </div>
        <span class="c-link">
          <span class="c-link-k">{t('被 C3 看到', 'seen by C3')}</span>
          <span class="c-arrow">→</span>
        </span>
        <div class="c-core">
          <span class="c-id mono">C3</span>
          <span class="c-op mono">{t('L2: spin 到 data2 = NEW', 'L2: spin until data2 = NEW')}</span>
          <span class="c-op mono">F2: FENCE</span>
          <span class="c-op mono">L3: r3 = data1</span>
          <span class="c-q mono">r3 = NEW?</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          XC is write atomic: its &lt;m&gt; is itself a global order, a store has a point at which it takes effect,
          nobody sees it before that point and every core sees it after. Write atomicity implies causality. The
          converse fails: two cores sharing one write buffer (say, two thread contexts on the same core) can build a
          system with causality but also the crossed IRIW outcome.
        </p>
        <p>
          IRIW is the standard test for write atomicity: C3 sees S1 then S2, C4 sees S2 then S1. That demands both
          “S1 before S2” and “S2 before S1” — unsolvable unless stores become visible to different cores at different
          times. XC rules it out; Power does not.
        </p>
      {:else}
        <p>
          XC 是 write atomic 的：它的 &lt;m&gt; 本身就是一条全局序，store 在序上有一个生效点，生效之前谁都看不到，
          生效之后所有核都能看到。write atomicity 蕴含 causality。
          反过来不成立：两个核共享一个 write buffer（比如同一个核的两个线程上下文）就能做出因果成立、但
          IRIW 交叉结果也成立的系统。
        </p>
        <p>
          IRIW 是检验 write atomicity 的标准题：C3 先看到 S1 再看到 S2，C4 先看到 S2 再看到 S1。
          这要求“S1 先于 S2”和“S2 先于 S1”同时成立——除非 store 对不同核在不同时刻可见，否则无解。
          XC 排除它；Power 不排除。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">5.6</span>Power {t('与模型比较', 'and comparing models')}</h3>
      {#if en}
        <p>
          Power is the extreme case on this path. It has no global memory order: a store does not take effect “on
          memory” but is <b>performed w.r.t. each core</b>. One store may already be performed w.r.t. C2 and not yet
          w.r.t. C3. FENCE still guarantees order: if C1 uses a FENCE to order S1 before S2, then that order holds for
          every core.
        </p>
        <p>
          Power's FENCE is also <b>cumulative</b>: it drags in accesses other cores have already ordered before, and
          pushes out accesses ordered after through a dependency or another FENCE. XC's FENCE is cumulative too, but
          that falls out of the global order automatically.
        </p>
      {:else}
        <p>
          Power 是这条路线上的极端案例。它没有全局 memory order：store 不是“对内存”生效，而是
          <b>performed w.r.t. 每一个核</b>。一条 store 可能对 C2 已经生效、对 C3 还没生效。FENCE 仍然保证
          顺序：如果 C1 用 FENCE 把 S1 排在 S2 前，那么对每个核都按这个顺序生效。
        </p>
        <p>
          Power 的 FENCE 还是 <b>cumulative</b> 的：它会把其他核已经排在前面的访问拉进 FENCE 之前，
          也会把通过依赖或另一条 FENCE 排在后面的访问推出去。XC 的 FENCE 也 cumulative，但那是由全局序自动给的。
        </p>
      {/if}
    </div>

    <Figure no={t('图 5.8', 'Figure 5.8')} caption={t(
      'Power 的三种 FENCE。HWSYNC 连 store → load 都挡，LWSYNC 不挡；ISYNC 排的是指令，不是内存访问。',
      'Power\u2019s three FENCEs. HWSYNC blocks even store → load; LWSYNC does not; ISYNC orders instructions, not memory accesses.'
    )}>
      <div class="fences">
        <div class="fence-card">
          <span class="f-name mono">HWSYNC / SYNC</span>
          <span class="f-tag">{t('全部保序 · cumulative', 'all orders · cumulative')}</span>
          <p>{t(
            'load、store 的所有组合都挡，包括 store → load。SB / Dekker 这种“先写后读”的题必须用它。',
            'Blocks every combination of loads and stores, including store → load. SB / Dekker-style “write then read” tests need it.'
          )}</p>
        </div>
        <div class="fence-card">
          <span class="f-name mono">LWSYNC</span>
          <span class="f-tag">{t('只挡 L → L、L → S、S → S', 'blocks only L → L, L → S, S → S')}</span>
          <p>{t(
            '不挡 store → load，但已经足够把 data 发布到 flag 之前。MP 用 LWSYNC 就够了。',
            'Does not block store → load, yet is enough to publish data before flag. LWSYNC suffices for MP.'
          )}</p>
        </div>
        <div class="fence-card">
          <span class="f-name mono">ISYNC</span>
          <span class="f-tag">{t('排两条 load 的指令顺序', 'orders the instruction stream of two loads')}</span>
          <p>{t(
            '它不是 FENCE：不 cumulative，也不约束 memory access。书中例子不用它。',
            'Not a FENCE: not cumulative and does not constrain memory accesses. The book\u2019s examples do not use it.'
          )}</p>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <div class="note">
          <b>Dependencies are order too:</b> if a load's result feeds the address of a later load, or the address /
          data of a later store, Power orders that load before that access. XC has no such rule — one reason the two
          models are incomparable.
        </div>
        <p>
          On Power, SB needs HWSYNC; LWSYNC does not block store → load, so (0, 0) still appears. MP needs only
          LWSYNC. For IRIW, even two HWSYNCs cannot block the crossed outcome, because Power does not guarantee write
          atomicity in the first place — a FENCE establishes the order each core sees, not one order shared by all
          cores.
        </p>
        <p>
          Line the models up and the relationships are: SC is strictest; TSO additionally allows store → load; XC also
          lets accesses to different addresses go. Power is weaker than TSO but incomparable with XC — it allows the
          crossed IRIW outcome, yet governs dependency chains more strictly than XC.
        </p>
      {:else}
        <div class="note">
          <b>依赖也是顺序：</b>如果 load 的结果被用来算后面 load 的地址，或者后面 store 的地址 / 数据，Power 会把这条
          load 排在那条访问之前。XC 没有这条规则——这是两个模型不可比的原因之一。
        </div>
        <p>
          Power 上做 SB，必须用 HWSYNC；LWSYNC 不挡 store → load，(0, 0) 仍然能出现。做 MP，LWSYNC 就够。
          做 IRIW，即使两条 HWSYNC 也挡不住交叉结果，因为 Power 本来就不保证 write atomicity——
          FENCE 建立的是每个核各自看到的顺序，不是一条所有核共享的序。
        </p>
        <p>
          把模型排成一排，关系是这样的：SC 最严格；TSO 多允许 store → load；XC 再把不同地址的访问也放开。
          Power 比 TSO 松，但与 XC 不可比——它允许 IRIW 的交叉结果，却比 XC 多管依赖链。
        </p>
      {/if}
    </div>

    <Figure no={t('图 5.9', 'Figure 5.9')} caption={t(
      'Figure 5.5：越往外层，允许的执行越多。Power 与 XC 谁也不包含谁。',
      'Figure 5.5: the further out, the more executions allowed. Neither Power nor XC contains the other.'
    )}>
      <div class="ladder">
        <div class="tier xc">
          <div class="tier-head">
            <span class="tier-k mono">XC · Alpha · ARM · RMO</span>
            <span class="tier-d">{t('不同地址也放开，只剩 FENCE 兜底', 'different addresses relaxed too; FENCE is the only backstop')}</span>
          </div>
          <div class="tier tso">
            <div class="tier-head">
              <span class="tier-k mono">TSO</span>
              <span class="tier-d">{t('只放开 store → load', 'only store → load relaxed')}</span>
            </div>
            <div class="tier sc">
              <div class="tier-head">
                <span class="tier-k mono">SC</span>
                <span class="tier-d">{t('一条全局序，每核保持程序顺序', 'one global order, each core in program order')}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="power-card">
          <span class="power-k mono">Power</span>
          <span class="power-rel">{t('与 XC 不可比', 'incomparable with XC')}</span>
          <span class="power-d">{t(
            '允许 IRIW 交叉；但依赖链、cumulative FENCE 比 XC 更严。',
            'Allows crossed IRIW; but dependency chains and cumulative FENCE are stricter than XC.'
          )}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          To evaluate a relaxed model the book still uses Adve's 3P plus precision: programmability (SC for DRF makes
          it acceptable), performance (how much better than TSO depends on the microarchitecture), portability (staying
          inside DRF is manageable; stepping outside is hard), and precision (many models have only informal
          descriptions). The conclusion is not pretty: <b>there is no simple conclusion.</b>
        </p>
      {:else}
        <p>
          评价一个 relaxed 模型，书里还是用 Adve 的 3P 加上“精确”：可编程性（SC for DRF 让它可接受）、性能
          （比 TSO 好多少取决于微架构）、可移植性（停留在 DRF 内还 manageable，越界就很难）、精确性（很多模型只有
          非形式描述）。结论并不漂亮：<b>没有简单的结论</b>。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">5.7</span>{t('高级语言的内存模型', 'High-level language memory models')}</h3>
      {#if en}
        <p>
          Hardware models specify behavior “between hardware and low-level software”; Java and C++ must also specify
          behavior “between the language and the programmer”. Both rest on SC for DRF: the programmer marks
          synchronized accesses with <code>volatile</code>, <code>atomic</code>, or locks, and the compiler and runtime
          may freely reorder, coalesce, or even delete accesses between synchronization points.
        </p>
        <p>
          That also explains why a compiler dares hoist a load out of a loop or coalesce repeated loads into one: absent
          a data race, other threads “cannot see” those reorderings. Once a data race really exists at the HLL level,
          the guarantee lapses, and another thread may observe a non-SC execution caused by register allocation.
        </p>
      {:else}
        <p>
          硬件模型规定的是“硬件与底层软件之间”的行为；Java 与 C++ 还要规定“语言与程序员之间”的行为。
          两者的基石都是 SC for DRF：程序员用 <code>volatile</code>、<code>atomic</code> 或锁标出同步访问，
          编译器与运行时可以在同步点之间自由重排、合并甚至删除访存。
        </p>
        <p>
          这也解释了为什么编译器敢把循环里的 load 提到循环外、把重复 load 合并成一个：在没有 data race 的前提下，
          其他线程“看不见”这些重排。一旦 HLL 层真的出现 data race，这套保证就失效了，另一个线程可能观察到
          寄存器分配造成的非 SC 执行。
        </p>
      {/if}
    </div>

    <div class="prose">
      <div class="pull">
        {t(
          '放松不是“不要顺序”，而是把“哪些顺序真的需要”从硬件的默认行为，变成程序员显式的声明。',
          'Relaxation is not “no order”; it moves the question of which order is truly needed from the hardware\u2019s default behavior into the programmer\u2019s explicit declarations.'
        )}
      </div>
      {#if en}
        <p>
          The next chapter leaves CPU cores and enters coherence protocols themselves: state machines, tabular
          specifications, and the vocabulary that every later protocol shares.
        </p>
      {:else}
        <p>
          下一章离开 CPU 核心，进入 coherence 协议本身：状态机、表格化规格，以及后面所有协议共用的语言。
        </p>
      {/if}
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => navigate('/ch6')}>
          <span class="next-no display">06</span>
          <strong>{t('缓存一致性协议框架', 'The coherence protocol framework')}</strong>
          <span>{t(
            '控制器状态机、表格化规格、状态与事务。',
            'Controller state machines, tabular specifications, states and transactions.'
          )}</span>
        </button>
        <button class="next-card" onclick={() => navigate('/ch4')}>
          <span class="next-no display">04</span>
          <strong>{t('回到 TSO', 'Back to TSO')}</strong>
          <span>{t(
            'store buffer 只松开一条边，SB 与 MP 的答案由此分岔。',
            'A store buffer relaxes one edge; that is where the answers for SB and MP diverge.'
          )}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .need-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .need-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 13px 14px;
    background: var(--card);
    border: 1px solid #d5e2dd;
    border-radius: 12px;
  }

  .need-card.extra-card {
    background: var(--ember-soft);
    border-color: #eed8ce;
  }

  .need-k {
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--accent-deep);
  }

  .extra-card .need-k {
    color: var(--ember);
  }

  .chain {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
  }

  .node {
    padding: 2px 7px;
    font-size: 10px;
    color: var(--ink-2);
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 5px;
  }

  .node.extra {
    color: var(--ember);
    background: rgba(255, 253, 248, 0.7);
    border-color: #e6c8ba;
    border-style: dashed;
  }

  .arrow {
    font-size: 11px;
    color: var(--gold);
  }

  .arrow.extra {
    color: var(--ember);
  }

  .need-card p {
    margin: 0;
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .rules {
    display: grid;
    grid-template-columns: 54px repeat(4, minmax(0, 1fr));
    gap: 5px;
  }

  .rc {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 30px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    border-radius: 6px;
  }

  .rc.head {
    font-size: 9.5px;
    color: var(--muted);
  }

  .rc.row-h {
    justify-content: flex-end;
    padding-right: 4px;
    font-size: 9.5px;
    color: var(--muted);
  }

  .rc.a {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border: 1px solid #d5e2dd;
  }

  .rc.b {
    color: var(--ember);
    background: var(--ember-soft);
    border: 1px solid #eed8ce;
  }

  .rc.x {
    color: var(--gold);
    background: var(--paper-2);
    border: 1px solid var(--line);
  }

  .rules-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    margin-top: 11px;
    font-size: 10px;
    color: var(--muted);
  }

  .rules-legend span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .mk {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    border-radius: 3px;
  }

  .mk.a {
    color: var(--accent-deep);
    background: var(--accent-soft);
  }

  .mk.b {
    color: var(--ember);
    background: var(--ember-soft);
  }

  .mk.x {
    color: var(--gold);
    background: var(--paper-3);
  }

  .rules-diff {
    flex-basis: 100%;
    font-size: 10px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .chain-box {
    margin: 4px 0 14px;
    padding: 9px 12px;
    font-size: 10px;
    line-height: 1.6;
    color: var(--ink-2);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow-x: auto;
    white-space: nowrap;
  }

  .drf-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .drf-card {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 13px 14px;
    background: var(--ember-soft);
    border: 1px solid #eed8ce;
    border-radius: 12px;
  }

  .drf-card.good {
    background: var(--accent-soft);
    border-color: #d5e2dd;
  }

  .drf-k {
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ember);
  }

  .drf-card.good .drf-k {
    color: var(--accent-deep);
  }

  .drf-prog {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 9.5px;
    line-height: 1.55;
    color: var(--ink-3);
  }

  .mini-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 5px;
  }

  .chip {
    padding: 4px 0;
    font-size: 9.5px;
    text-align: center;
    color: var(--ink-2);
    background: rgba(255, 253, 248, 0.75);
    border: 1px solid var(--line);
    border-radius: 5px;
  }

  .chip.no {
    color: #9d8f85;
    text-decoration: line-through;
    text-decoration-color: #c8a493;
    background: transparent;
    border-color: #d8cdc1;
    border-style: dashed;
  }

  .drf-card p {
    margin: 0;
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .dir-table {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr) minmax(0, 1fr);
    gap: 6px;
  }

  .dh {
    display: flex;
    align-items: flex-end;
    padding: 0 6px 4px;
    font-size: 9.5px;
    line-height: 1.45;
    color: var(--muted);
  }

  .dk {
    display: flex;
    align-items: center;
    font-size: 10px;
    color: var(--ink-3);
  }

  .dv {
    padding: 8px 10px;
    font-size: 10.5px;
    text-align: center;
    border-radius: 7px;
  }

  .dv.yes {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border: 1px solid #d5e2dd;
  }

  .dv.no {
    color: var(--ember);
    background: var(--ember-soft);
    border: 1px solid #eed8ce;
  }

  .dir-note {
    margin: 11px 0 0;
    font-size: 10.5px;
    line-height: 1.65;
    color: var(--muted);
  }

  .causal {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 62px minmax(0, 1.35fr) 62px minmax(0, 1.35fr);
    align-items: center;
    gap: 6px;
  }

  .c-core {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 11px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .c-id {
    font-size: 9px;
    color: var(--gold);
  }

  .c-op {
    font-size: 9.5px;
    line-height: 1.5;
    color: var(--ink-3);
  }

  .c-q {
    margin-top: 2px;
    padding: 2px 6px;
    align-self: flex-start;
    font-size: 9.5px;
    color: var(--ember);
    background: var(--ember-soft);
    border-radius: 4px;
  }

  .c-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .c-link-k {
    font-size: 8.5px;
    text-align: center;
    line-height: 1.3;
    color: var(--muted);
  }

  .c-arrow {
    font-size: 14px;
    color: var(--gold);
  }

  .fences {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }

  .fence-card {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 12px 13px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 11px;
  }

  .fence-card:first-child {
    border-color: #d9cfba;
    background: var(--paper-2);
  }

  .f-name {
    font-size: 11px;
    color: var(--accent-deep);
  }

  .f-tag {
    font-size: 9px;
    color: var(--gold);
  }

  .fence-card p {
    margin: 2px 0 0;
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .ladder {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }

  .tier {
    padding: 9px 10px;
    border: 1px solid #d5e2dd;
    border-radius: 11px;
    background: rgba(228, 236, 232, 0.35);
  }

  .tier.tso {
    border-color: #cfded9;
    background: rgba(228, 236, 232, 0.6);
  }

  .tier.sc {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .tier-k {
    display: block;
    font-size: 9.5px;
    color: var(--accent-deep);
  }

  .tier-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px 12px;
    margin-bottom: 7px;
  }

  .tier-d {
    font-size: 9.5px;
    color: var(--muted);
  }

  .tier.sc .tier-k {
    font-weight: 600;
  }

  .tier.sc .tier-d {
    color: var(--ink-3);
  }

  .power-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 13px 14px;
    background: var(--paper-2);
    border: 1px dashed var(--gold);
    border-radius: 11px;
  }

  .power-k {
    font-size: 12px;
    color: var(--gold);
  }

  .power-rel {
    font-size: 10px;
    color: var(--ember);
  }

  .power-d {
    font-size: 10px;
    line-height: 1.6;
    color: var(--ink-3);
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
    .need-grid,
    .drf-grid,
    .fences,
    .ladder {
      grid-template-columns: minmax(0, 1fr);
    }

    .causal {
      grid-template-columns: minmax(0, 1fr);
      gap: 8px;
    }

    .c-link {
      flex-direction: row;
      gap: 7px;
      justify-content: center;
    }

    .c-arrow {
      transform: rotate(90deg);
    }

    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 560px) {
    .rules {
      grid-template-columns: 42px repeat(4, minmax(0, 1fr));
    }

    .rc {
      min-height: 27px;
      font-size: 10px;
    }

    .mini-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dir-table {
      grid-template-columns: 62px minmax(0, 1fr) minmax(0, 1fr);
    }

    .dh {
      font-size: 9px;
    }
  }
</style>
