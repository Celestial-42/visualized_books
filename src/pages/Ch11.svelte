<script lang="ts">
  import ChapterHead from '../components/ChapterHead.svelte';
  import Figure from '../components/Figure.svelte';
  import LitmusCheck from '../components/LitmusCheck.svelte';
  import { navigate } from '../lib/router.svelte';
  import { lang, t } from '../lib/lang.svelte';

  const en = $derived(lang.value === 'en');
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={11}
      title="规格与验证"
      en="Specifying and Validating Memory Consistency Models and Cache Coherence"
      lede={en
        ? 'Everything before this chapter was a description. This chapter asks how to turn a description into a contract: a precise set of allowed behaviors, a way to enumerate them, and a way to show that an implementation stays inside the set.'
        : '前面所有章节都在“描述”。这一章问的是如何把描述变成契约：允许行为的精确集合、枚举这些行为的方法，以及证明实现没有越界的办法。'}
    />

    <div class="prose">
      {#if en}
        <h3><span class="h-no">11.1</span>A specification is a contract</h3>
        <p>
          A specification defines the legal behaviors of a system; an implementation defines how those
          behaviors are produced. For a memory model, the observable actions are loads, stores, and the values
          returned. For a coherence protocol, they are read-request, read-return, write-request, and
          write-return, because the pipeline also cares when an access completes.
        </p>
        <p>
          A specification has two halves. <b>Safety</b> says which behaviors are legal. <b>Liveness</b> says
          that good things eventually happen: a request must not wait forever. A system that accepts a request
          and halts forever is safe and useless; that is why both halves matter.
        </p>
      {:else}
        <h3><span class="h-no">11.1</span>规格就是契约</h3>
        <p>
          规格定义系统的合法行为；实现定义这些行为如何产生。对内存模型，可观察动作是 load、store 与返回的值；
          对 coherence 协议，是 read-request、read-return、write-request、write-return——因为流水线还在意
          访问什么时候完成。
        </p>
        <p>
          规格有两半。<b>Safety</b> 规定哪些行为合法；<b>liveness</b> 规定好事最终会发生：请求不能永远等下去。
          一个接收请求后永远停机的系统既安全又无用——这就是两半都重要的原因。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 11.1', 'Figure 11.1')}
      caption={t(
        '两种写法：operational 用一个参考状态机“怎么走”；axiomatic 用关系与公理“哪些结果可以存在”。',
        'Two styles: operational uses a reference state machine to say how it runs; axiomatic uses relations and axioms to say which outcomes may exist.'
      )}
    >
      <div class="styles">
        <div class="style-card">
          <div class="style-head"><span class="mono">operational</span><span class="style-tag">{t('参考实现', 'reference implementation')}</span></div>
          <div class="mini-steps">
            <span class="ms">fetch</span><span class="ms-arr">→</span>
            <span class="ms">issue</span><span class="ms-arr">→</span>
            <span class="ms">memory</span><span class="ms-arr">→</span>
            <span class="ms">return</span>
          </div>
          <p>{t('把系统写成一个状态机，能走出的所有行为就是规格。', 'Write the system as a state machine; every behavior it can produce is the specification.')}</p>
          <span class="style-foot">{t('直观，贴近 RTL；状态多时难以穷举。', 'Intuitive and close to RTL; state explosion when enumerating.')}</span>
        </div>
        <div class="style-card axiomatic">
          <div class="style-head"><span class="mono">axiomatic</span><span class="style-tag">{t('关系 + 公理', 'relations + axioms')}</span></div>
          <div class="mini-rel mono">
            <span>po</span><span>rf</span><span>fr</span><span class="plus">+</span><span>axioms</span>
          </div>
          <p>{t('定义动作之间的关系，再用公理排除不合法的组合。', 'Define relations between actions, then use axioms to rule out illegal combinations.')}</p>
          <span class="style-foot">{t('抽象，易探索；离实现更远。', 'Abstract and easy to explore; farther from the implementation.')}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">11.2</span>Operational: an abstract machine</h3>
        <p>
          The operational style describes a reference implementation. For SC, one model is an in-order pipeline
          feeding an <b>atomic memory</b>: a load reads memory and returns, a store writes memory and acks, and
          the pipeline blocks until the response. That reference machine cannot produce
          <code>S1, S2, L1:SET, L2:0</code>, so it defines SC.
        </p>
        <p>
          A second model replaces atomic memory with a <b>global FIFO store queue</b>. Writes are acked when
          queued and later acked again when they reach memory; loads wait for the queue to drain first. It still
          produces SC, but now a write can be visible to another core after its response — which is exactly the
          difference between <b>linearizability</b> (consistency-agnostic coherence) and a consistency-directed
          protocol.
        </p>
      {:else}
        <h3><span class="h-no">11.2</span>Operational：一台抽象机器</h3>
        <p>
          operational 风格描述一个参考实现。对 SC，一个模型是“顺序流水线 + 原子内存”：
          load 读内存并返回，store 写内存并 ack，流水线阻塞到响应到达。这台机器产生不了
          <code>S1, S2, L1:SET, L2:0</code>，于是它定义了 SC。
        </p>
        <p>
          第二个模型把原子内存换成 <b>全局 FIFO store queue</b>。写进入队列时先 ack，真正写入内存时再 late-ack；
          load 要等队列排空。它仍产生 SC，但一个写可能在响应之后才对别的核可见——这正是
          <b>linearizability</b>（consistency-agnostic coherence）与 consistency-directed 协议的区别。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 11.2', 'Figure 11.2')}
      caption={t(
        'SC 的 operational 参考机器：取指、发射并阻塞、原子内存、返回。每个核在同一时刻最多有一个未完成访问。',
        'An operational SC reference machine: fetch, issue and block, atomic memory, return. Each core has at most one outstanding access.'
      )}
    >
      <div class="machine">
        <div class="m-flow">
          <span class="mstep"><b class="mono">1</b>{t('取指', 'fetch')}</span>
          <span class="marr">→</span>
          <span class="mstep"><b class="mono">2</b>{t('发射并阻塞', 'issue & block')}</span>
          <span class="marr">→</span>
          <span class="mstep mem"><b class="mono">3</b>{t('原子内存', 'atomic memory')}</span>
          <span class="marr">→</span>
          <span class="mstep"><b class="mono">4</b>{t('返回', 'return')}</span>
        </div>
        <div class="m-note">
          {t(
            '把第 3 步换成 FIFO store queue，仍然 SC；但它允许写在自己的响应之后才落到内存，因此不是 linearizable。',
            'Replace step 3 with a FIFO store queue and it is still SC; but a write may land in memory after its response, so it is not linearizable.'
          )}
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">11.3</span>Axiomatic: relations and axioms</h3>
        <p>
          The axiomatic style keeps only the observable actions and defines relations over them:
          <b>program order</b> (po), <b>read-from</b> (rf), <b>from-read</b> (fr), and a global memory order.
          For SC the safety axioms are: global order preserves po; a load reads the most recent store before it;
          and the two halves of an RMW are adjacent. A liveness axiom adds that no operation is delayed forever.
        </p>
        <p>
          Coherence gets one extra axiom: a read or write must <i>perform</i> between its request and its
          response. That is linearizability, and it is composable per location — which is why each address can be
          made coherent independently.
        </p>
      {:else}
        <h3><span class="h-no">11.3</span>Axiomatic：关系与公理</h3>
        <p>
          axiomatic 风格只保留可观察动作，在它们之上定义关系：<b>program order</b>（po）、
          <b>read-from</b>（rf）、<b>from-read</b>（fr），以及一个全局内存序。SC 的安全公理是：
          全局序保持 po；load 读到它之前最近的 store；RMW 的两半相邻。再加一条 liveness：
          没有操作会被无限期拖延。
        </p>
        <p>
          coherence 多一条公理：读或写必须在请求与响应之间 <i>perform</i>。这就是 linearizability，
          而且它按地址可组合——所以每个地址可以独立地做 coherent。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 11.3', 'Figure 11.3')}
      caption={t(
        'SC 的三条安全公理与一条 liveness；右侧是 MP 的非法结果 (1,0) 被环排除。',
        'Three SC safety axioms plus liveness; on the right, the illegal MP outcome (1,0) is excluded by a cycle.'
      )}
    >
      <div class="axioms">
        <div class="ax-card">
          <div class="ax-head"><span class="ax-k mono">preserved po</span><span class="ax-tag">{t('安全', 'safety')}</span></div>
          <p>{t('全局内存序尊重每个核的程序顺序。', 'Global memory order respects each core\u2019s program order.')}</p>
        </div>
        <div class="ax-card">
          <div class="ax-head"><span class="ax-k mono">load value</span><span class="ax-tag">{t('安全', 'safety')}</span></div>
          <p>{t('load 读到全局序中它之前最近的 store。', 'A load reads the most recent store before it in global order.')}</p>
        </div>
        <div class="ax-card">
          <div class="ax-head"><span class="ax-k mono">atomicity</span><span class="ax-tag">{t('安全', 'safety')}</span></div>
          <p>{t('RMW 的 load 与 store 在全局序中相邻。', 'The load and store of an RMW are adjacent in global order.')}</p>
        </div>
        <div class="ax-card live">
          <div class="ax-head"><span class="ax-k mono">liveness</span><span class="ax-tag">{t('进展', 'progress')}</span></div>
          <p>{t('没有操作被无限多的操作永远挡在后面。', 'No operation is preceded forever by an infinite sequence of others.')}</p>
        </div>
        <div class="ax-graph">
          <svg viewBox="0 0 240 150" role="img" aria-label="MP cycle">
            <defs>
              <marker id="ax-po" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="#b9ac95" />
              </marker>
              <marker id="ax-rf" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="#2f5d62" />
              </marker>
              <marker id="ax-fr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="#b98a63" />
              </marker>
            </defs>
            <rect x="16" y="14" width="70" height="26" rx="6" fill="#fffdf8" stroke="#e0d7c6" />
            <text class="ax-n" x="51" y="31" text-anchor="middle">S1</text>
            <rect x="16" y="106" width="70" height="26" rx="6" fill="#fffdf8" stroke="#e0d7c6" />
            <text class="ax-n" x="51" y="123" text-anchor="middle">S2</text>
            <rect x="154" y="14" width="70" height="26" rx="6" fill="#fffdf8" stroke="#e0d7c6" />
            <text class="ax-n" x="189" y="31" text-anchor="middle">L1</text>
            <rect x="154" y="106" width="70" height="26" rx="6" fill="#fffdf8" stroke="#e0d7c6" />
            <text class="ax-n" x="189" y="123" text-anchor="middle">L2</text>
            <path d="M51,40 L51,106" stroke="#b9ac95" stroke-width="1.2" fill="none" marker-end="url(#ax-po)" />
            <path d="M189,40 L189,106" stroke="#b9ac95" stroke-width="1.2" fill="none" marker-end="url(#ax-po)" />
            <path d="M86,120 C120,120 120,40 154,27" stroke="#2f5d62" stroke-width="1.3" fill="none" marker-end="url(#ax-rf)" />
            <path d="M154,120 C120,120 120,40 86,27" stroke="#b98a63" stroke-width="1.3" stroke-dasharray="4 3" fill="none" marker-end="url(#ax-fr)" />
          </svg>
          <span class="ax-cap">{t('MP = (1,0)：po + rf + fr 闭成环，SC 排除。', 'MP = (1,0): po + rf + fr close a cycle, excluded by SC.')}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">11.4</span>Litmus tests and exploration</h3>
        <p>
          A litmus test is a tiny multithreaded program that isolates one synchronization question. MP asks
          whether a flag carries its data; SB asks whether two stores can both stay invisible; CoRR asks whether
          one address can move backwards. Vendors use them in manuals, and verification teams use them as
          regression units.
        </p>
        <p>
          Once the model is formal, exploration is mechanical: enumerate schedules, apply the axioms, collect the
          outcomes. The space grows quickly, which is why tools (herd, ppcmem, CppMem, RMEM) matter and why
          litmus suites are curated rather than random.
        </p>
      {:else}
        <h3><span class="h-no">11.4</span>Litmus test 与探索</h3>
        <p>
          litmus test 是一个极小的多线程程序，用来隔离一个同步问题。MP 问 flag 有没有把 data 带过来；
          SB 问两个 store 能否都保持不可见；CoRR 问同一个地址能否倒着走。厂商把它写进手册，
          验证团队把它当回归单元。
        </p>
        <p>
          模型一旦形式化，探索就是机械的：枚举调度、套用公理、收集结果。状态空间增长很快，
          所以需要工具（herd、ppcmem、CppMem、RMEM），也需要精心维护而不是随机的 litmus 集合。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 11.4', 'Figure 11.4')}
      caption={t(
        '执行检查器：选择 litmus 与模型，点一个读值组合，看来不来得及形成环、以及模型是否允许。',
        'Execution checker: choose a litmus and a model, click an outcome, and see whether it forms a cycle and whether the model allows it.'
      )}
    >
      <LitmusCheck />
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">11.5</span>Validating implementations</h3>
        <p>
          Formal methods compare a model of the implementation against the specification. Model checking
          explores the state space (Murphi, TLA); refinement proofs relate an operational implementation to an
          operational specification; PipeCheck compares an axiomatic pipeline model to an axiomatic memory model.
          Inductive methods such as PipeProof push the proof to programs of any length.
        </p>
        <p>
          Testing is still necessary. Offline testing runs programs on real or simulated machines: TSOtool
          generates tests and reconstructs a global order to check them (NP-complete in general, approximated in
          practice); litmus suites have known expected outcomes; McVersi generates tests that are likely to break
          a simulator. Online testing puts checkers in hardware and watches for violations in the field.
        </p>
      {:else}
        <h3><span class="h-no">11.5</span>验证实现</h3>
        <p>
          形式化方法把实现模型与规格对比。model checking 探索状态空间（Murphi、TLA）；refinement 证明把
          operational 实现与 operational 规格联系起来；PipeCheck 把 axiomatic 流水线模型与 axiomatic
          内存模型对比。PipeProof 这类归纳方法则把证明推广到任意长度的程序。
        </p>
        <p>
          测试仍然必要。离线测试在真实或模拟机器上跑程序：TSOtool 生成测试并重建全局序来检查
          （一般情形是 NP-complete，实践中做近似）；litmus 套件有已知的期望结果；
          McVersi 生成更容易在模拟器里暴露问题的测试。在线测试把检查器放进硬件，在部署后继续观察违规。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 11.5', 'Figure 11.5')}
      caption={t(
        '验证要覆盖整条栈：高级语言、编译器、ISA、微架构、RTL。每层都有对应的检查工具。',
        'Validation spans the stack: high-level language, compiler, ISA, microarchitecture, RTL, with tools at each layer.'
      )}
    >
      <div class="stack">
        <div class="layer"><span class="l-k mono">HLL</span><span class="l-d">{t('语言级一致性', 'language-level consistency')}</span><span class="l-t">TriCheck</span></div>
        <div class="layer"><span class="l-k mono">compiler</span><span class="l-d">{t('重排是否合法', 'are reorderings legal?')}</span><span class="l-t">{t('检查', 'check')}</span></div>
        <div class="layer"><span class="l-k mono">ISA</span><span class="l-d">{t('架构模型', 'architectural model')}</span><span class="l-t">{t('公理', 'axioms')}</span></div>
        <div class="layer wide"><span class="l-k mono">{t('microarchitecture', 'microarchitecture')}</span><span class="l-d">{t('流水线 + coherence 协议', 'pipeline + coherence protocol')}</span><span class="l-t">PipeCheck / PipeProof</span></div>
        <div class="layer"><span class="l-k mono">RTL</span><span class="l-d">{t('实现是否忠实', 'does RTL match?')}</span><span class="l-t">RTLCheck</span></div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">11.6</span>No single method is enough</h3>
        <p>
          Formal verification is hard to scale and hard to get right; testing is incomplete by construction.
          The practical answer is a combination: prove the small invariants, model-check the protocol, run
          litmus suites on the RTL and on silicon, and keep checking online after deployment.
        </p>
        <p>
          The thread through this whole primer is the same: coherence and consistency are contracts. A protocol
          table, an axiom set, and a litmus test are three views of one contract. The visualization in this site
          is a fourth: an execution you can inspect.
        </p>
      {:else}
        <h3><span class="h-no">11.6</span>没有一种方法是足够的</h3>
        <p>
          形式化验证难扩展、也容易写错规格；测试则在构造上就不完整。实际答案是组合：
          证明小不变量、对协议做 model checking、在 RTL 与硅片上跑 litmus 套件，部署后继续在线检查。
        </p>
        <p>
          整本 primer 的主线是同一件事：coherence 与 consistency 是契约。协议表、公理集、litmus test
          是同一份契约的三种视图。本站的可视化是第四种：一个你可以走进去看的执行。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 11.6', 'Figure 11.6')}
      caption={t(
        '形式化与测试各有所长：前者穷尽但难扩展，后者可扩展但不完整；真实流程两者并用。',
        'Formal methods and testing complement each other: exhaustive but hard to scale versus scalable but incomplete.'
      )}
    >
      <div class="methods">
        <div class="method">
          <div class="m-head"><span class="mono">{t('形式化', 'formal')}</span><span class="m-tag">{t('穷尽', 'exhaustive')}</span></div>
          <div class="m-list">
            <span>model checking</span>
            <span>refinement</span>
            <span>{t('归纳证明', 'induction')}</span>
            <span>PipeCheck / PipeProof</span>
          </div>
          <span class="m-foot">{t('局限：状态爆炸、规格本身可能写错。', 'Limits: state explosion; the spec itself can be wrong.')}</span>
        </div>
        <div class="method">
          <div class="m-head"><span class="mono">{t('测试', 'testing')}</span><span class="m-tag">{t('可扩展', 'scalable')}</span></div>
          <div class="m-list">
            <span>TSOtool</span>
            <span>litmus / diy</span>
            <span>McVersi</span>
            <span>{t('在线检查器', 'online checkers')}</span>
          </div>
          <span class="m-foot">{t('局限：只能证明存在，不能证明不存在。', 'Limits: can show a bug exists, never that none does.')}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      <div class="pull">
        {t(
          '协议表是“怎么走”，公理是“哪些结果可以存在”，litmus 是“这两个视图是否对得上”。',
          'A protocol table says how it runs; axioms say which outcomes may exist; litmus asks whether the two views agree.'
        )}
      </div>
      <p>
        {t(
          '读到这里，你已经走完从问题、模型、协议到验证的整条路径。回到目录，随手挑一个实验，试着用“状态、顺序、scope”三个词解释它。',
          'You have now walked the whole path from the problem to models, protocols, and validation. Go back to any lab and try to explain it with three words: state, order, scope.'
        )}
      </p>
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => navigate('/')}>
          <span class="next-no display">00</span>
          <strong>{t('回到总目录', 'Back to the atlas')}</strong>
          <span>{t('十一章、六种实验，从单地址到异构系统。', 'Eleven chapters and six labs, from one address to a heterogeneous system.')}</span>
        </button>
        <button class="next-card" onclick={() => navigate('/ch3')}>
          <span class="next-no display">03</span>
          <strong>{t('重看 SC 的 litmus', 'Revisit the SC litmus')}</strong>
          <span>{t('把本章的公理与第 3 章的交错排布放在一起看。', 'Read this chapter\u2019s axioms next to the interleavings from Chapter 3.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .styles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .style-card {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 12px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 11px;
  }

  .style-card.axiomatic {
    background: var(--paper-2);
  }

  .style-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    font-size: 10px;
    color: var(--accent-deep);
  }

  .style-tag {
    font-size: 8.5px;
    color: var(--gold);
  }

  .mini-steps {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  .ms {
    padding: 3px 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  .ms-arr {
    color: var(--gold);
    font-size: 10px;
  }

  .mini-rel {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    font-size: 9px;
  }

  .mini-rel span {
    padding: 2px 6px;
    color: var(--accent-deep);
    background: var(--card);
    border: 1px solid #cfded9;
    border-radius: 4px;
  }

  .mini-rel .plus {
    border: 0;
    background: none;
    color: var(--gold);
  }

  .style-card p {
    margin: 0;
    font-size: 9.5px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .style-foot {
    padding-top: 6px;
    font-size: 8.5px;
    color: var(--muted);
    border-top: 1px solid var(--line-2);
  }

  .machine {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .m-flow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .mstep {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    padding: 5px 8px;
    font-size: 9.5px;
    color: var(--ink-3);
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 6px;
  }

  .mstep b {
    font-size: 8.5px;
    font-weight: 500;
    color: var(--gold);
  }

  .mstep.mem {
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .marr {
    color: var(--gold);
    font-size: 11px;
  }

  .m-note {
    padding: 7px 9px;
    font-size: 9px;
    line-height: 1.55;
    color: var(--muted);
    background: var(--paper-2);
    border-radius: 6px;
  }

  .axioms {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 7px;
    align-items: stretch;
  }

  .ax-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 9px 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 8px;
  }

  .ax-card.live {
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .ax-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 5px;
  }

  .ax-k {
    font-size: 8.5px;
    color: var(--accent-deep);
  }

  .ax-tag {
    font-size: 7.5px;
    color: var(--gold);
  }

  .ax-card p {
    margin: 0;
    font-size: 8.5px;
    line-height: 1.5;
    color: var(--ink-3);
  }

  .ax-graph {
    display: flex;
    flex-direction: column;
    gap: 3px;
    grid-column: 1 / -1;
    padding: 8px;
    background: var(--paper-2);
    border: 1px solid var(--line-2);
    border-radius: 8px;
  }

  .ax-graph svg {
    width: 100%;
    max-width: 300px;
    align-self: center;
  }

  .ax-n {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    fill: var(--accent-deep);
  }

  .ax-cap {
    font-size: 8.5px;
    text-align: center;
    color: var(--muted);
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .layer {
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr) 150px;
    align-items: baseline;
    gap: 8px;
    padding: 6px 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 6px;
  }

  .layer.wide {
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .l-k {
    font-size: 8.5px;
    color: var(--accent-deep);
  }

  .l-d {
    font-size: 9px;
    color: var(--ink-3);
  }

  .l-t {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    color: var(--gold);
    text-align: right;
  }

  .methods {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .method {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 11px 12px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .m-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    font-size: 10px;
    color: var(--accent-deep);
  }

  .m-tag {
    font-size: 8.5px;
    color: var(--gold);
  }

  .m-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .m-list span {
    padding: 2px 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  .m-foot {
    padding-top: 5px;
    font-size: 8.5px;
    line-height: 1.5;
    color: var(--muted);
    border-top: 1px solid var(--line-2);
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

  @media (max-width: 900px) {
    .axioms {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 820px) {
    .styles,
    .methods {
      grid-template-columns: minmax(0, 1fr);
    }

    .layer {
      grid-template-columns: 96px minmax(0, 1fr);
    }

    .l-t {
      grid-column: 2;
      text-align: left;
    }
  }

  @media (max-width: 560px) {
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .axioms {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
