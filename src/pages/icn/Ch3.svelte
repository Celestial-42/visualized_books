<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import TurnVcLab from '../../components/icn/TurnVcLab.svelte';
  import FairnessLab from '../../components/icn/FairnessLab.svelte';
  import { lang, t } from '../../lib/lang.svelte';
  import { navigate } from '../../lib/router.svelte';

  const en = $derived(lang.value === 'en');
  const open = (book: string, slug: string) => navigate(`/book/${book}/${slug}`);
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={3}
      title="死锁、活锁及饿死"
      en="Deadlock, Livelock, and Starvation"
      lede={t(
        '互连网络里最贵的 bug 不是算错，而是停住。这一章把“停住”拆成三种：谁也不动（死锁）、一直在动却到不了（活锁）、以及有人一直轮不到（饿死），并用一张图判断第一种。',
        'The most expensive bug in an interconnect is not a wrong answer but a stall. This chapter splits “stalled” into three: nobody moves (deadlock), everybody moves but the packet never arrives (livelock), and somebody never gets a turn (starvation) — then decides the first one with a graph.'
      )}
    />

    <div class="prose">
      <h3><span class="h-no">3.1</span>{t('死锁是资源的循环等待', 'Deadlock is a cycle of resource waits')}</h3>
      {#if en}
        <p>
          A packet needs four things at once: the channel it is about to leave, the buffer it wants to enter, and the
          permission to switch. When four packets each hold one buffer and each waits for the next, nothing can move —
          and no amount of retrying helps, because the wait is structural, not statistical.
        </p>
        <p>
          Two features of on-chip networks make this easy to hit. First, wormhole routing holds a chain of channels for
          the length of a packet: one packet can occupy several routers at once, so a single blocked head freezes
          everything behind it. Second, messages are short, so buffers are small — the ring in Figure 3.1 only needs two
          flits per channel to jam.
        </p>
      {:else}
        <p>
          一个包同时要四样东西：它正要离开的信道、它想进入的缓冲、以及通过开关的许可。当四个包各占一块缓冲、
          又都在等下一块时，谁也动不了——而且重试没用，因为这份等待是结构性的，不是统计性的。
        </p>
        <p>
          片上网络有两个特点让它特别容易撞上这件事。第一，虫孔路由会为整条包占住一串信道：一个包可以同时占着好几个路由器，
          于是头一堵，身后的 flit 全冻住。第二，消息短、缓冲小——图 3.1 那个环，每条信道只要两个 flit 就能卡死。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 3.1', 'Figure 3.1')}
      caption={t(
        '四路由器环上的经典配置：每个包占着一条信道、等它顺时针的下一条。四条边闭合，依赖图里就是一个环。',
        'The classic four-router ring: every packet holds one channel and waits for the next one clockwise. Four edges close, and the dependency graph contains a cycle.'
      )}
    >
      <div class="ring-art">
        <svg viewBox="0 0 420 150" fill="none" aria-hidden="true">
          <rect x="40" y="18" width="70" height="30" rx="7" class="rn" />
          <text x="75" y="37" class="rl" text-anchor="middle">R0</text>
          <rect x="310" y="18" width="70" height="30" rx="7" class="rn" />
          <text x="345" y="37" class="rl" text-anchor="middle">R1</text>
          <rect x="310" y="100" width="70" height="30" rx="7" class="rn" />
          <text x="345" y="119" class="rl" text-anchor="middle">R2</text>
          <rect x="40" y="100" width="70" height="30" rx="7" class="rn" />
          <text x="75" y="119" class="rl" text-anchor="middle">R3</text>

          <path d="M112 33H308" class="edge" marker-end="url(#a1)" />
          <path d="M345 50V98" class="edge" marker-end="url(#a1)" />
          <path d="M308 115H112" class="edge" marker-end="url(#a1)" />
          <path d="M75 98V50" class="edge" marker-end="url(#a1)" />

          <text x="210" y="27" class="cap" text-anchor="middle">{t('占着缓冲的包', 'packet holding the buffer')}</text>
          <text x="210" y="134" class="cap" text-anchor="middle">{t('等下一级 → 四边闭合', 'waits for the next → cycle closes')}</text>
          <defs>
            <marker id="a1" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#b4543a" />
            </marker>
          </defs>
        </svg>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">3.2</span>{t('通道相关图与扩展通道相关图', 'Channel and extended channel dependency graphs')}</h3>
      {#if en}
        <p>
          Dally and Seitz turned this picture into a decision procedure. Make a graph whose nodes are the directed
          channels, and draw an edge from channel a to channel b whenever a packet holding a may request b. If that graph
          is acyclic, the routing function is deadlock-free — routing is a subset of the graph’s edges, so removing edges
          can only help.
        </p>
        <p>
          Virtual channels complicate the counting: what matters is not the channel but the <em>class</em> of buffer a
          packet can move into. The extended channel dependency graph uses channel classes as nodes, and it is the one
          that tells you whether a second virtual channel actually bought you anything.
        </p>
      {:else}
        <p>
          Dally 和 Seitz 把这张图变成了判定方法：以有向通道为节点，只要“持有 a 的包可能请求 b”，就从 a 连一条边到 b。
          这张图无环，路由函数就无死锁——因为路由只是图的一个边子集，删边只会更安全。
        </p>
        <p>
          虚拟信道把这件事变细了：真正决定生死的不再是“通道”，而是包能进入的<em>缓冲类别</em>。
          扩展通道相关图以“通道类”为节点，它才能回答“多开一条 VC 到底换来了什么”。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 3.2', 'Figure 3.2')}
      caption={t(
        '8 个转向随你勾选，VC 可切到 2 条。上一行是通道级判定，下一行是扩展图判定：勾满 8 个转向时通道图成环；再加 VC 但转向不变，环还在；只有把转向拆到两条 VC 上，扩展图才无环。',
        'Toggle the eight turns and switch to two VCs. The first row is the channel-level verdict, the second the extended one: all eight turns cycle at channel level; adding a VC with the same turns does not help; splitting the turns across the two VCs does.'
      )}
    >
      <TurnVcLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Read the two rows as a hierarchy of guarantees. The channel graph is the coarser statement; the extended graph
          is the finer one, and it is the one a designer can actually move by adding buffers. That is also why
          “deadlock-free” is never a property of the network alone — it is a property of the routing function <em>and</em>
          the buffer assignment together.
        </p>
      {:else}
        <p>
          把两行读成两个层次的保证：通道图是粗的那一层，扩展图是细的那一层，而设计者真正能靠“加缓冲”改变的是后者。
          这也说明“无死锁”从来不是网络单独的性质，而是路由函数<em>和</em>缓冲分配共同的性质。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">3.3</span>{t('定理 3.1：存在一个连接的无环路由子函数就够了', 'Theorem 3.1: one connected acyclic subfunction is enough')}</h3>
      {#if en}
        <p>
          Requiring the whole dependency graph to be acyclic is sufficient but far from necessary. Duato’s theorem
          relaxes it: if a routing function R has a <em>connected</em> routing subfunction R1 whose dependency graph is
          acyclic, and every channel reachable under R can reach the channels of R1, then R is deadlock-free. The
          intuition is that a packet that lands on R1 always drains, so no cycle can stay closed forever.
        </p>
        <p>
          This is the theoretical licence for fully adaptive routing with very few virtual channels: reserve one
          acyclic escape lane (usually dimension order), let everything else be arbitrary. Chapter 5 of the on-chip
          networks book shows the same theorem as an escape-VC experiment; here it is the reason Chapter 4 can promise
          “fully adaptive” at all.
        </p>
      {:else}
        <p>
          要求整张依赖图无环是充分条件，但远非必要。Duato 的定理把它放松了：如果路由函数 R 有<em>连接的</em>路由子函数 R1，
          R1 的依赖图无环，并且 R 下每条可达的通道都能到达 R1 的通道，那么 R 无死锁。直觉是：落到 R1 上的包一定能排空，
          于是环不可能永远闭合。
        </p>
        <p>
          这正是“用很少的虚拟信道做完全自适应路由”的理论许可：留一条无环的逃逸通道（通常是维序），其余随便。
          片上网络那本书的第 5 章用实验演示了同一条定理；在这里，它是第 4 章敢说“完全自适应”的底气。
        </p>
      {/if}
      <div class="note">
        <b>{t('三个条件缺一不可：', 'All three conditions matter: ')}</b>
        {t(
          '子函数无环、子函数连接、以及其他通道都能摸到它。少任何一个，都能构造出不满足条件的反例——第 4 章各阶自适应的差别，本质上就是在这三条上做取舍。',
          'acyclic subfunction, connected subfunction, and reachability from every other channel. Drop any one and a counter-example exists — the difference between the levels of adaptivity in Chapter 4 is really a trade among these three.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">3.4</span>{t('死锁恢复：前进型与回退型', 'Deadlock recovery: progressive and regressive')}</h3>
      {#if en}
        <p>
          Recovery accepts that deadlock will happen and plans for it. <b>Progressive</b> recovery keeps the packets:
          a packet detected (or suspected) to be in a deadlock configuration is moved into a dedicated recovery
          resource — an extra buffer, a low-latency side network — and the cycle breaks. <b>Regressive</b> recovery
          throws work away: the offending packet is dropped (or aborted back to its source) and re-injected later.
        </p>
        <p>
          The trade is buffers versus bandwidth. Progressive recovery needs the extra resource on every router and a
          detection mechanism; regressive recovery needs neither, but pays in wasted bandwidth and in the tail latency of
          retried messages. Both need <em>detection</em>, and detection is where the engineering lives: a timeout is
          simple but late, a distributed detector is fast but adds messages.
        </p>
      {:else}
        <p>
          恢复策略承认死锁会发生，并提前为它做准备。<b>前进型</b>恢复不丢包：把被检测到（或被怀疑）处于死锁配置的包
          搬进专用的恢复资源——一块额外缓冲、一条低延迟旁路网络——环就断了。<b>回退型</b>恢复则扔掉工作：
          把肇事的包丢弃（或中止回源头）稍后重发。
        </p>
        <p>
          这是缓冲与带宽之间的交易。前进型要在每个路由器上加那份资源，还要一套检测机制；回退型两样都不需要，
          但要用浪费的带宽和重传消息的尾部延迟来付账。两者都离不开<em>检测</em>，而检测正是工程所在：
          超时简单但反应慢，分布式检测快但要多发消息。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 3.3', 'Figure 3.3')}
      caption={t(
        '两种恢复策略的账。前进型把成本放在面积上，回退型放在带宽与尾延迟上；检测成本两者都要付。',
        'The bill for both strategies: progressive pays in area, regressive in bandwidth and tail latency, and detection is paid by both.'
      )}
    >
      <table class="table">
        <thead>
          <tr>
            <th>{t('维度', 'Aspect')}</th>
            <th>{t('前进型（不丢包）', 'Progressive (no loss)')}</th>
            <th>{t('回退型（丢包重传）', 'Regressive (drop and retry)')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t('每路由器额外资源', 'extra resource per router')}</td>
            <td>{t('需要：恢复缓冲或旁路网络', 'needed: recovery buffer or side network')}</td>
            <td>{t('不需要', 'none')}</td>
          </tr>
          <tr>
            <td>{t('带宽', 'bandwidth')}</td>
            <td>{t('不浪费', 'no waste')}</td>
            <td>{t('重传会重复占用', 'retries consume it twice')}</td>
          </tr>
          <tr>
            <td>{t('尾延迟', 'tail latency')}</td>
            <td>{t('一次搬运就结束', 'one move and it is over')}</td>
            <td>{t('取决于重传策略', 'depends on the retry policy')}</td>
          </tr>
          <tr>
            <td>{t('必须有的东西', 'mandatory')}</td>
            <td>{t('检测机制', 'a detector')}</td>
            <td>{t('检测 + 可安全丢弃的协议语义', 'a detector plus drop-safe semantics')}</td>
          </tr>
        </tbody>
      </table>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">3.5</span>{t('电路交换与流水电路交换里的死锁', 'Deadlock in circuit and pipelined circuit switching')}</h3>
      {#if en}
        <p>
          Circuit switching moves the problem to the setup phase: two setup packets can each hold half a path and wait
          for the other half. Pipelined circuit switching answers with backtracking — a probe header walks forward and,
          on finding a busy channel, retreats and tries another route. The cost moves from buffers to setup latency, and
          the protocol needs a rule for when to give up and backtrack.
        </p>
      {:else}
        <p>
          电路交换把问题挪到了建路阶段：两个建路包可以各占半条路，互相等对方那一半。
          流水电路交换用“回退”作答——探测头向前走，遇到忙信道就退回，换一条路再试。
          代价从缓冲挪到了建路延迟，而协议必须规定“什么时候放弃并回退”。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">3.6</span>{t('活锁与饥饿：还在动，但轮不到', 'Livelock and starvation: moving, but never served')}</h3>
      {#if en}
        <p>
          <b>Livelock</b> is the non-minimal cousin of deadlock: the packet keeps moving and keeps not arriving.
          Any routing function that lets a packet take a hop away from its destination needs a progress bound — a hop
          counter, a deterministic phase, or a rule that forces minimal routing after a while.
        </p>
        <p>
          <b>Starvation</b> is a scheduling property, not a routing one. If arbitration always prefers the same
          requester, the others wait forever even though the network is never deadlocked. The fix is a fair arbiter
          (round-robin, matrix) rather than a better route.
        </p>
      {:else}
        <p>
          <b>活锁</b>是死锁的非最小表亲：包一直在走，却一直到不了。任何允许“背离目的地”一跳的路由函数都需要一个进展保证——
          跳数计数器、确定性阶段，或“走够若干跳后强制最短”的规则。
        </p>
        <p>
          <b>饥饿</b>是调度性质，不是路由性质。如果仲裁总是偏袒同一个请求者，其他人就永远等，尽管网络从未死锁。
          解法是公平仲裁（轮询、矩阵），而不是更好的路径。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 3.4', 'Figure 3.4')}
      caption={t(
        '上：三种仲裁策略在同一输出端口上的服务次数，固定优先级会让两个请求者一次也拿不到。下：随机非最小路由的 200 次试验，加不加跳数上限对最长路径的影响。',
        'Top: service counts for three arbitration policies on one output; fixed priority starves two requesters. Bottom: 200 trials of a random non-minimal walk, with and without a hop bound.'
      )}
    >
      <FairnessLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Note that the two halves are independent. A network can be deadlock-free and still livelock (non-minimal
          routing without a bound), and can be livelock-free and still starve a flow (unfair arbitration). The three
          failure modes need three separate proofs.
        </p>
      {:else}
        <p>
          注意上下两半互相独立。网络可以无死锁却会活锁（非最小路由没有上限），也可以无活锁却饿死某条流（仲裁不公）。
          三种失效模式，需要三份彼此独立的证明。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">3.7</span>{t('工程问题', 'Engineering issues')}</h3>
      <p>
        {t(
          '实际设计里，这一章的三样东西最后都变成参数：恢复缓冲给几个、超时阈值设多少、仲裁器用哪种。书上那句“工程问题”的提示很朴素——先算清楚你能承受多少尾部延迟，再决定用证明换面积（前进型）还是用证明换带宽（回退型）。',
          'In practice the three ideas become three parameters: how many recovery buffers, what timeout, which arbiter. The engineering advice is plain: decide how much tail latency you can afford, then choose whether to buy area with a proof (progressive) or bandwidth with a proof (regressive).'
        )}
      </p>
    </div>

    <div class="prose">
      <h3><span class="h-no">3.8</span>{t('自测', 'Check yourself')}</h3>
      <Quiz
        questions={[
          {
            q: t('通道相关图无环能推出什么？', 'What does an acyclic channel dependency graph imply?'),
            options: [
              t('该路由函数无死锁', 'The routing function is deadlock-free'),
              t('网络不会拥塞', 'The network never congests'),
              t('每个包都走最短路径', 'Every packet takes a shortest path')
            ],
            answer: 0,
            why: t('它排除了资源循环等待，因此不会死锁；拥塞和最短性都与它无关。', 'It rules out a circular wait, hence deadlock; congestion and minimality are separate questions.')
          },
          {
            q: t('多开一条虚拟信道、转向集不变，能消除死锁吗？', 'Does one more virtual channel with the same turn set remove deadlock?'),
            options: [
              t('能，缓冲变多了', 'Yes — there is more buffer'),
              t('不能，扩展图里环还在', 'No — the cycle survives in the extended graph'),
              t('取决于包长', 'It depends on packet size')
            ],
            answer: 1,
            why: t('扩展图的节点变多了，但依赖关系没被切断；必须改变允许的转向或类的顺序。', 'The extended graph has more nodes but the dependencies are unchanged; you must change the permitted turns or the class order.')
          },
          {
            q: t('饥饿属于哪一类问题？', 'What kind of problem is starvation?'),
            options: [
              t('路由', 'Routing'),
              t('仲裁与调度', 'Arbitration and scheduling'),
              t('拓扑', 'Topology')
            ],
            answer: 1,
            why: t('路径完全正确，但仲裁总是选别人。换成轮询或矩阵仲裁即可。', 'The path is fine; arbitration simply keeps picking someone else. A round-robin or matrix arbiter fixes it.')
          }
        ]}
      />
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => open('interconnection-networks', 'ch4')}>
          <span class="next-no display">04</span>
          <strong>{t('路由算法', 'Routing algorithms')}</strong>
          <span>{t('用这一章的条件，去给每一类路由算法记账。', 'Spend the conditions from this chapter on each class of routing algorithm.')}</span>
        </button>
        <button class="next-card" onclick={() => open('on-chip-networks', 'ch5')}>
          <span class="next-no display">02</span>
          <strong>{t('对照：片上网络的流控', 'Contrast: flow control in the on-chip book')}</strong>
          <span>{t('同一套死锁论证，换成 flit 级仿真的说法。', 'The same argument, told as a flit-level simulation.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .ring-art svg {
    width: 100%;
    height: auto;
    max-width: 520px;
    margin: 0 auto;
    display: block;
  }

  .rn {
    fill: var(--card-2);
    stroke: var(--line);
  }

  .rl {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    fill: var(--ink-3);
  }

  .edge {
    stroke: var(--ember);
    stroke-width: 1.2;
    fill: none;
  }

  .cap {
    font-family: 'Inter', sans-serif;
    font-size: 8px;
    fill: var(--muted);
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
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
