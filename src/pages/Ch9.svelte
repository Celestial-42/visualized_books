<script lang="ts">
  import ChapterHead from '../components/ChapterHead.svelte';
  import Figure from '../components/Figure.svelte';
  import FalseShareLab from '../components/FalseShareLab.svelte';
  import { navigate } from '../lib/router.svelte';
  import { lang, t } from '../lib/lang.svelte';

  const en = $derived(lang.value === 'en');
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={9}
      title="缓存一致性进阶"
      en="Advanced Topics in Coherence"
      lede={en
        ? 'The previous chapters kept the world simple: data caches, one level, one protocol. Real machines add instruction caches, translations, DMA, and hierarchies. This chapter follows coherence into those corners, then asks a harder question than correctness: does the system keep making progress?'
        : '前几章把世界简化了：只有数据 cache、一层结构、一种协议。真实机器还有指令 cache、地址翻译、DMA 与多级层次。这一章把 coherence 带进这些角落，然后问一个比正确性更难的问题：系统是否还在前进？'}
    />

    <div class="prose">
      {#if en}
        <h3><span class="h-no">9.1</span>Other structures that cache</h3>
        <p>
          Coherence is about copies, and data caches are not the only structure that keeps them. Each of the
          following raises the same question in a different shape: which copies exist, and how does a writer
          reach them?
        </p>
        <p>
          The answers are not always “run the same protocol”. Some structures are read-mostly enough that
          invalidation is rare; some need a different mechanism entirely, such as a TLB shootdown; and some,
          like DMA, are easier to handle by making the device a coherence agent than by flushing caches around it.
        </p>
      {:else}
        <h3><span class="h-no">9.1</span>其他会缓存的部件</h3>
        <p>
          coherence 讲的是副本，而保存副本的不止数据 cache。下面每个部件都换了个形状提出同一个问题：
          哪些副本存在，写者怎么找到它们？
        </p>
        <p>
          答案不一定都是“跑同一套协议”。有些结构几乎只读，invalidation 很少；有些需要完全不同的机制，
          比如 TLB shootdown；还有些（如 DMA）与其在设备周围反复 flush，不如把设备变成 coherence agent。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 9.1', 'Figure 9.1')}
      caption={t(
        '六种“会缓存”的部件，以及它们各自的 coherence 问题。',
        'Six structures that cache, and the coherence question each one raises.'
      )}
    >
      <div class="models">
        <div class="model">
          <span class="model-k mono">I-cache</span>
          <p>{t('指令副本也要与数据写保持一致；自修改代码需要显式同步或 I-cache invalidation。', 'Instruction copies must agree with data writes; self-modifying code needs explicit synchronization or I-cache invalidation.')}</p>
          <span class="model-tag">{t('只读为主', 'mostly read-only')}</span>
        </div>
        <div class="model">
          <span class="model-k mono">TLB</span>
          <p>{t('页表项的副本散落在各核；改映射要 TLB shootdown，ASID 让切换地址空间不必全刷。', 'Copies of page-table entries sit in every core; remapping needs a shootdown, and ASIDs avoid flushing on a context switch.')}</p>
          <span class="model-tag">{t('翻译缓存', 'translation cache')}</span>
        </div>
        <div class="model">
          <span class="model-k mono">{t('虚拟缓存', 'virtual cache')}</span>
          <p>{t('同义（synonym）与同音（homonym）问题；VIPT 用虚拟索引、物理 tag，大多数情况下避开同义。', 'Synonyms and homonyms; VIPT (virtual index, physical tag) avoids synonyms in most cases.')}</p>
          <span class="model-tag">{t('地址别名', 'address aliases')}</span>
        </div>
        <div class="model">
          <span class="model-k mono">{t('写透 cache', 'write-through')}</span>
          <p>{t('每次 store 都写内存，没有 dirty 状态；coherence 更简单，但带宽压力大，通常配 write buffer。', 'Every store writes memory, so there is no dirty state; coherence is simpler, but bandwidth pressure grows and write buffers appear.')}</p>
          <span class="model-tag">{t('无脏状态', 'no dirty state')}</span>
        </div>
        <div class="model">
          <span class="model-k mono">DMA</span>
          <p>{t('设备绕过 cache 读写内存。要么软件 flush / invalidate，要么让设备成为 coherence agent（coherent DMA）。', 'Devices read and write memory around the caches. Either software flushes and invalidates, or the device becomes a coherence agent (coherent DMA).')}</p>
          <span class="model-tag">{t('设备也是 agent', 'device as agent')}</span>
        </div>
        <div class="model">
          <span class="model-k mono">{t('多级 cache', 'multi-level')}</span>
          <p>{t('L1 / L2 都保存副本；inclusion 让上层能代表下层，exclusion 保证只在一层。', 'Both L1 and L2 keep copies; inclusion lets the upper level represent the lower, exclusion keeps a line in exactly one level.')}</p>
          <span class="model-tag">{t('层次', 'hierarchy')}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">9.2</span>Hierarchies: inclusion, exclusion, NINE</h3>
        <p>
          With more than one level, a designer chooses whether the levels duplicate lines. <b>Inclusive</b> means
          everything in L1 is also in L2. That is convenient: the L2 tags are a directory, and evicting an L2 line
          can <b>back-invalidate</b> the L1 copies. It is also a constraint: L1 cannot hold a line that L2 does not.
        </p>
        <p>
          <b>Exclusive</b> means a line lives in exactly one level; an L1 eviction fills L2. It uses the hierarchy
          as a victim cache and gets more capacity, but a hit in L2 requires a swap. <b>NINE</b> (neither inclusive
          nor exclusive) allows duplicates without a containment rule, which is flexible but forces a separate
          directory or snoop filter to know what is where.
        </p>
      {:else}
        <h3><span class="h-no">9.2</span>层次：inclusion、exclusion 与 NINE</h3>
        <p>
          有了一层以上，设计者要决定各层是否重复保存同一条 line。<b>Inclusive</b> 指 L1 里的东西一定也在 L2。
          这很方便：L2 的 tag 就是目录，驱逐 L2 的 line 可以 <b>back-invalidate</b> L1 的副本。
          它也是约束：L1 不能持有 L2 没有的 line。
        </p>
        <p>
          <b>Exclusive</b> 指一条 line 只存在于一层；L1 驱逐时填入 L2。它把层次当成 victim cache，容量更大，
          但 L2 命中要交换。 <b>NINE</b>（既非 inclusive 也非 exclusive）允许重复但不要求包含，
          灵活，却必须另设目录或 snoop filter 才知道谁有什么。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 9.2', 'Figure 9.2')}
      caption={t(
        '包含关系决定“上层能否代表下层”。inclusive 让 L2 成为目录；exclusive 把 L2 当 victim cache；NINE 两者都不承诺。',
        'Containment decides whether the upper level can represent the lower. Inclusive makes L2 a directory; exclusive makes it a victim cache; NINE promises neither.'
      )}
    >
      <div class="hier">
        <div class="hier-card">
          <div class="hier-head"><span class="mono">inclusive</span><span class="hier-tag">{t('包含', 'contains')}</span></div>
          <div class="hier-draw inc">
            <div class="l2">
              <span class="lv">L2</span>
              <div class="l1s"><span class="l1">L1</span><span class="l1">L1</span></div>
            </div>
          </div>
          <p>{t('L2 驱逐时 back-invalidate L1；L2 tag 可直接当目录。', 'L2 eviction back-invalidates L1; L2 tags can serve as a directory.')}</p>
        </div>
        <div class="hier-card">
          <div class="hier-head"><span class="mono">exclusive</span><span class="hier-tag">{t('不重复', 'no duplicate')}</span></div>
          <div class="hier-draw exc">
            <div class="l1 solo">L1</div>
            <span class="swap">⇅</span>
            <div class="l2 solo">L2</div>
          </div>
          <p>{t('L1 驱逐填入 L2；容量变大，但跨层命中要交换。', 'L1 evictions fill L2; more capacity, but cross-level hits swap.')}</p>
        </div>
        <div class="hier-card">
          <div class="hier-head"><span class="mono">NINE</span><span class="hier-tag">{t('不承诺', 'neither')}</span></div>
          <div class="hier-draw nine">
            <div class="l1 side">L1</div>
            <div class="l2 side">L2</div>
          </div>
          <p>{t('可能重复、也可能不；需要独立目录 / snoop filter。', 'May or may not duplicate; needs a separate directory or snoop filter.')}</p>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">9.3</span>Performance: migration and false sharing</h3>
        <p>
          Two access patterns dominate coherence performance. <b>Migratory sharing</b> is a block that bounces
          between cores, each reading and then writing it. The baseline pays a transfer and an upgrade on every
          hop. The optimization notices the pattern and grants write permission on the read, so the following
          store is silent.
        </p>
        <p>
          <b>False sharing</b> is the opposite failure: two cores write <i>different</i> variables that happen to
          share a cache line. There is no data race, yet every write invalidates the other core's copy. Padding
          separates the variables; a smaller block does the same at the cost of more tags and more misses.
        </p>
      {:else}
        <h3><span class="h-no">9.3</span>性能：迁移与 false sharing</h3>
        <p>
          两种访问模式主导 coherence 性能。<b>Migratory sharing</b> 是一条在核间来回弹的 block：每个核先读、
          再写。基线每跳都要付一次传输加一次 upgrade。优化会识别这个模式，在读时就授予写权限，
          于是随后的 store 是静默的。
        </p>
        <p>
          <b>False sharing</b> 是相反的失败：两个核写的是<i>不同</i>变量，却恰好共享一条 cache line。
          没有 data race，但每次写都会作废对方的副本。padding 把变量分开；更小的 block 也能做到，
          代价是更多 tag 与更多 miss。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 9.3', 'Figure 9.3')}
      caption={t(
        'migratory sharing：基线在每次迁移时多付一次 upgrade；迁移优化在读时就给写权限。',
        'Migratory sharing: the baseline pays an upgrade on every move; the optimization grants write permission on the read.'
      )}
    >
      <div class="lanes">
        <div class="lane">
          <div class="lane-head"><span class="mono">{t('基线', 'baseline')}</span><span class="lane-count">{t('4 次事务', '4 transactions')}</span></div>
          <div class="lane-row">
            <span class="lstep"><b class="mono">C1</b>read</span>
            <span class="lstep"><b class="mono">C1</b>write <i>upg</i></span>
            <span class="lstep"><b class="mono">C2</b>read <i>fwd</i></span>
            <span class="lstep"><b class="mono">C2</b>write <i>upg</i></span>
          </div>
          <p class="lane-note">{t('每次换主人后，第一次写都要再收一次权限。', 'After every ownership change, the first write must take permission again.')}</p>
        </div>
        <div class="lane accent">
          <div class="lane-head"><span class="mono">{t('迁移优化', 'migratory')}</span><span class="lane-count">{t('2 次事务', '2 transactions')}</span></div>
          <div class="lane-row">
            <span class="lstep"><b class="mono">C1</b>read <i>E</i></span>
            <span class="lstep silent"><b class="mono">C1</b>write <i>silent</i></span>
            <span class="lstep"><b class="mono">C2</b>read <i>M</i></span>
            <span class="lstep silent"><b class="mono">C2</b>write <i>silent</i></span>
          </div>
          <p class="lane-note">{t('读时直接拿到独占 / 读写权限，省掉两次 upgrade。', 'The read already carries exclusive / write permission, removing two upgrades.')}</p>
        </div>
      </div>
      <p class="fig-foot">
        {t(
          '迁移优化需要判断“这个块最近是否总被改写”，否则会误把只读共享也升级成独占。',
          'The optimization must detect that the block is being rewritten; otherwise it wrongly upgrades read-only sharing.'
        )}
      </p>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">9.4</span>Try it: false sharing, 8 writes</h3>
        <p>
          The lab runs the same eight alternating writes under two layouts. The only difference is whether x and
          y share a cache line. Nothing about the program changes; everything about the traffic does.
        </p>
      {:else}
        <h3><span class="h-no">9.4</span>试一试：false sharing，8 次写</h3>
        <p>
          实验在两种布局下执行同样的 8 次交替写。唯一区别是 x 与 y 是否共享一条 cache line。
          程序逻辑完全没变，总线流量完全变了。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 9.4', 'Figure 9.4')}
      caption={t(
        '同一组 8 次写：共享 line 时每次换写者都要搬整条 line；padding 后只剩两次首次取块。',
        'The same eight writes: with a shared line every ownership change moves the whole line; with padding only the two first fills remain.'
      )}
    >
      <FalseShareLab />
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">9.5</span>Liveness: deadlock, livelock, starvation</h3>
        <p>
          Correctness says “bad outcomes never happen”. Liveness says “good outcomes eventually do”. Coherence
          protocols can fail the second without failing the first. The three failure modes are different, and so
          are the fixes.
        </p>
        <p>
          <b>Deadlock</b> is a cycle of resource waits: nothing moves. <b>Livelock</b> is motion without progress:
          requests are retried forever, often because of NACKs or a window of vulnerability. <b>Starvation</b> is
          progress for others but never for one request, usually because arbitration is unfair.
        </p>
      {:else}
        <h3><span class="h-no">9.5</span>进展：deadlock、livelock、starvation</h3>
        <p>
          正确性说“坏结果永远不会发生”；liveness 说“好结果最终会发生”。coherence 协议可以正确却不 live。
          三种失败模式不同，解法也不同。
        </p>
        <p>
          <b>Deadlock</b> 是资源等待成环：谁都不动。<b>Livelock</b> 是动了却没进展：请求永远在重试，
          常见于 NACK 或 window of vulnerability。<b>Starvation</b> 是别人都在前进，只有一个请求永远轮不到，
          通常因为仲裁不公平。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 9.5', 'Figure 9.5')}
      caption={t(
        '三种“没有进展”：环、空转、被饿死。修复分别针对资源、重试策略与公平性。',
        'Three ways to make no progress: a cycle, spinning, and starvation. The fixes target resources, retry policy, and fairness.'
      )}
    >
      <div class="live">
        <div class="live-card">
          <div class="live-head"><span class="mono">deadlock</span><span class="live-tag">{t('都不动', 'nothing moves')}</span></div>
          <div class="live-art dead">
            <span class="node">C1</span><span class="rel">⇄</span><span class="node">C2</span>
            <span class="loop-note">{t('互等资源', 'waiting on resources')}</span>
          </div>
          <p>{t('请求触发的转发 / 响应形成资源环。', 'Requests trigger forwards and responses that form a resource cycle.')}</p>
          <span class="live-fix">{t('拆消息类 / 虚拟网络；资源排序。', 'Separate message classes / virtual networks; order resources.')}</span>
        </div>
        <div class="live-card">
          <div class="live-head"><span class="mono">livelock</span><span class="live-tag">{t('空转', 'spinning')}</span></div>
          <div class="live-art live">
            <span class="loop">↻</span>
            <span class="loop-note">{t('重试 → 又被作废 → 重试', 'retry → invalidated → retry')}</span>
          </div>
          <p>{t('NACK 或 window of vulnerability 让请求反复失败。', 'NACKs or the window of vulnerability make a request fail repeatedly.')}</p>
          <span class="live-fix">{t('退避 / 优先级；收到数据时完成那次 load。', 'Backoff / priority; complete the load when data arrives.')}</span>
        </div>
        <div class="live-card">
          <div class="live-head"><span class="mono">starvation</span><span class="live-tag">{t('轮不到', 'never scheduled')}</span></div>
          <div class="live-art starve">
            <span class="node win">C1</span><span class="node">C2</span><span class="node">C3</span>
            <span class="loop-note">{t('总有人插队', 'others always win')}</span>
          </div>
          <p>{t('仲裁或资源分配长期偏向某些请求。', 'Arbitration or allocation persistently favors some requests.')}</p>
          <span class="live-fix">{t('公平仲裁 / aging；有界重试。', 'Fair arbitration / aging; bounded retries.')}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">9.6</span>Token coherence, and why coherence stays</h3>
        <p>
          Token coherence replaces state bits with <b>tokens</b>. A block has a fixed number of tokens; caches may
          pass them around but never create or destroy them. One or more tokens allow reading; all tokens allow
          writing. Safety becomes a conservation law, and liveness is handed to a separate substrate.
        </p>
        <p>
          The performance protocol chooses how requests travel: broadcast in TokenB, a predicted sharer set in
          TokenM. MSI snooping is the special case with broadcast and all/some/none of the tokens. The idea
          matters beyond tokens: it separates “never violate SWMR” from “make progress”, the two properties every
          protocol must satisfy.
        </p>
      {:else}
        <h3><span class="h-no">9.6</span>Token coherence，以及 coherence 为什么还在</h3>
        <p>
          token coherence 用 <b>token</b> 取代状态位。一条 block 有固定数量的 token；cache 之间可以转交，
          但不能创造或销毁。持有一个或更多 token 就能读；持有全部 token 才能写。安全性变成一条守恒律，
          liveness 则交给独立的 substrate。
        </p>
        <p>
          性能协议决定请求怎么走：TokenB 广播，TokenM 发给预测的 sharer 集合。MSI snooping 就是“广播 +
          全部 / 部分 / 零 token”的特例。这个想法超出 token 本身：它把“绝不违反 SWMR”与“最终能前进”
          分开——这正是每个协议都必须满足的两件事。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 9.6', 'Figure 9.6')}
      caption={t(
        'token coherence：token 只能转交、不能增删；全部 token = 可写，≥1 个 = 可读。',
        'Token coherence: tokens are passed, never created or destroyed; all tokens mean write, at least one means read.'
      )}
    >
      <div class="tokens">
        <div class="tok-card">
          <span class="tok-k">{t('4 个 token，初始全在 home', '4 tokens, all at home')}</span>
          <div class="tok-row">
            <span class="tok">T</span><span class="tok">T</span><span class="tok">T</span><span class="tok">T</span>
            <span class="tok-home mono">Dir</span>
          </div>
        </div>
        <div class="tok-split">
          <div class="tok-card">
            <span class="tok-k">{t('C1 拿到全部 → 可写', 'C1 has all → may write')}</span>
            <div class="tok-row">
              <span class="tok mine">T</span><span class="tok mine">T</span><span class="tok mine">T</span><span class="tok mine">T</span>
              <span class="tok-home mono">C1</span>
            </div>
          </div>
          <div class="tok-card">
            <span class="tok-k">{t('C1 与 C2 各持一部分 → 都只读', 'C1 and C2 split → both read-only')}</span>
            <div class="tok-row">
              <span class="tok mine">T</span><span class="tok mine">T</span>
              <span class="tok other">T</span><span class="tok other">T</span>
              <span class="tok-home mono">C1 / C2</span>
            </div>
          </div>
        </div>
        <p class="tok-note">
          {t(
            'token 总数不变，所以不可能同时出现两个写者；请求如何到达持有者，是性能协议的自由。',
            'The token count never changes, so two writers cannot exist at once; how a request finds the holders is up to the performance protocol.'
          )}
        </p>
      </div>
    </Figure>

    <div class="prose">
      <div class="pull">
        {t(
          '正确性只要“坏结果不发生”；liveness 要求“好结果最终发生”。coherence 的难点，最终都落在这两句话之间。',
          'Correctness asks only that bad outcomes never happen; liveness asks that good outcomes eventually do. The hard part of coherence lives between those two sentences.'
        )}
      </div>
      <p>
        {t(
          '下一章离开同构 CPU：GPU 的 temporal coherence、release consistency-directed coherence，以及 scope 如何成为一等概念。',
          'The next chapter leaves homogeneous CPUs: GPU temporal coherence, release consistency-directed coherence, and how scope becomes a first-class concept.'
        )}
      </p>
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => navigate('/ch10')}>
          <span class="next-no display">10</span>
          <strong>{t('异构系统', 'Heterogeneous Systems')}</strong>
          <span>{t('GPU 的 temporal coherence 与 RC-directed coherence：scope 决定谁需要看见。', 'GPU temporal coherence and RC-directed coherence: scope decides who needs to see what.')}</span>
        </button>
        <button class="next-card" onclick={() => navigate('/ch8')}>
          <span class="next-no display">08</span>
          <strong>{t('回到目录协议', 'Back to directories')}</strong>
          <span>{t('本章的 inclusion、死锁与 starvation，都能在目录协议的细节里找到影子。', 'Inclusion, deadlock, and starvation all echo details from the directory chapter.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .models {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .model {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 10px 11px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 9px;
  }

  .model-k {
    font-size: 9.5px;
    color: var(--accent-deep);
  }

  .model p {
    margin: 0;
    font-size: 9px;
    line-height: 1.55;
    color: var(--ink-3);
  }

  .model-tag {
    margin-top: auto;
    padding-top: 4px;
    font-size: 8px;
    color: var(--gold);
    border-top: 1px solid var(--line-2);
  }

  .hier {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }

  .hier-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 11px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .hier-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px;
    font-size: 9.5px;
    color: var(--accent-deep);
  }

  .hier-tag {
    font-size: 8.5px;
    color: var(--gold);
  }

  .hier-draw {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 84px;
    padding: 8px;
    background: var(--paper-2);
    border-radius: 7px;
  }

  .hier-draw.inc .l2 {
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: 100%;
    padding: 6px;
    border: 1px dashed #cfded9;
    border-radius: 6px;
  }

  .lv {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    color: var(--accent-deep);
  }

  .l1s {
    display: flex;
    gap: 5px;
  }

  .l1 {
    flex: 1;
    padding: 5px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    text-align: center;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  .hier-draw.exc {
    flex-direction: column;
    gap: 2px;
  }

  .hier-draw.exc .solo {
    width: 70%;
    padding: 5px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    text-align: center;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  .swap {
    font-size: 11px;
    color: var(--gold);
  }

  .hier-draw.nine {
    gap: 8px;
  }

  .hier-draw.nine .side {
    flex: 1;
    padding: 12px 5px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    text-align: center;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  .hier-card p {
    margin: 0;
    font-size: 9px;
    line-height: 1.55;
    color: var(--ink-3);
  }

  .lanes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .lane {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 11px;
  }

  .lane.accent {
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .lane-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    font-size: 9.5px;
    color: var(--accent-deep);
  }

  .lane-count {
    font-size: 8.5px;
    color: var(--muted);
  }

  .lane-row {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .lstep {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    padding: 4px 6px;
    font-size: 8.5px;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 5px;
  }

  .lstep b {
    font-size: 8.5px;
    font-weight: 500;
    color: var(--gold);
  }

  .lstep i {
    font-style: normal;
    color: var(--accent-deep);
  }

  .lstep.silent {
    border-style: dashed;
    border-color: #cfded9;
  }

  .lane-note {
    margin: 0;
    font-size: 8.5px;
    line-height: 1.5;
    color: var(--muted);
  }

  .live {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }

  .live-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 11px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .live-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px;
    font-size: 9.5px;
    color: var(--accent-deep);
  }

  .live-tag {
    font-size: 8.5px;
    color: var(--gold);
  }

  .live-art {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 66px;
    padding: 8px;
    background: var(--paper-2);
    border-radius: 7px;
  }

  .node {
    padding: 3px 7px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    color: var(--ink-2);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  .node.win {
    border-color: #cfded9;
    background: var(--accent-soft);
  }

  .rel {
    font-size: 12px;
    color: #a3523b;
  }

  .loop {
    font-size: 20px;
    color: #a3523b;
  }

  .loop-note {
    flex-basis: 100%;
    font-size: 8px;
    text-align: center;
    color: var(--muted);
  }

  .live-card p {
    margin: 0;
    font-size: 9px;
    line-height: 1.55;
    color: var(--ink-3);
  }

  .live-fix {
    margin-top: auto;
    padding-top: 5px;
    font-size: 8.5px;
    line-height: 1.5;
    color: var(--muted);
    border-top: 1px solid var(--line-2);
  }

  .tokens {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .tok-split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }

  .tok-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 9px;
  }

  .tok-k {
    font-size: 9px;
    color: var(--ink-3);
  }

  .tok-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .tok {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: var(--muted);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 50%;
  }

  .tok.mine {
    color: var(--accent-deep);
    border-color: #cfded9;
    background: var(--accent-soft);
  }

  .tok.other {
    color: #8a6a2f;
    border-color: #ecdfc6;
    background: #f7efdf;
  }

  .tok-home {
    margin-left: auto;
    font-size: 9px;
    color: var(--gold);
  }

  .tok-note {
    margin: 0;
    font-size: 9.5px;
    line-height: 1.6;
    color: var(--muted);
  }

  .fig-foot {
    margin: 8px 0 0;
    font-size: 9.5px;
    line-height: 1.6;
    color: var(--muted);
  }

  .next {
    margin-top: 40px;
  }

  .next-label {
    display: block;
    margin-bottom: 10px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .next-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .next-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
    text-align: left;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
    transition: border-color 0.2s var(--ease), background 0.2s var(--ease);
  }

  .next-card:hover {
    border-color: #d5c8ae;
    background: var(--card);
  }

  .next-no {
    font-size: 15px;
    color: var(--gold);
  }

  .next-card strong {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink-2);
  }

  .next-card > span:not(.next-no) {
    font-size: 10.5px;
    line-height: 1.55;
    color: var(--muted);
  }

  @media (max-width: 820px) {
    .models,
    .hier,
    .lanes,
    .live {
      grid-template-columns: minmax(0, 1fr);
    }

    .tok-split {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 560px) {
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
