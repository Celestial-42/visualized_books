<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import TurnVcLab from '../../components/icn/TurnVcLab.svelte';
  import FairnessLab from '../../components/icn/FairnessLab.svelte';
  import { buildTopology } from '../../lib/noc/topology';
  import { routingVerdict, type Turn } from '../../lib/noc/routing';
  import { lang, t } from '../../lib/lang.svelte';
  import { navigate } from '../../lib/router.svelte';

  const en = $derived(lang.value === 'en');
  const open = (book: string, slug: string) => navigate(`/book/${book}/${slug}`);

  const mesh = buildTopology('mesh', 3, 3);
  const SETS: { id: string; zh: string; en: string; banned: string; turns: Turn[] }[] = [
    {
      id: 'xy',
      zh: '维序 XY',
      en: 'dimension order XY',
      banned: '无（只留 X→Y）',
      turns: ['EN', 'ES', 'WN', 'WS']
    },
    {
      id: 'neg',
      zh: '负向优先',
      en: 'negative-first',
      banned: '东→南、北→西',
      turns: ['EN', 'WN', 'WS', 'NE', 'SE', 'SW']
    },
    {
      id: 'west',
      zh: '西向优先',
      en: 'west-first',
      banned: '北→西、南→西',
      turns: ['EN', 'ES', 'WN', 'WS', 'NE', 'SE']
    },
    {
      id: 'north',
      zh: '北向最后',
      en: 'north-last',
      banned: '东→北、西→北',
      turns: ['ES', 'WS', 'NE', 'NW', 'SE', 'SW']
    },
    {
      id: 'all',
      zh: '全部 8 转向',
      en: 'all eight turns',
      banned: '无',
      turns: ['EN', 'ES', 'WN', 'WS', 'NE', 'NW', 'SE', 'SW']
    }
  ];
  const verdicts = SETS.map((s) => ({ ...s, verdict: routingVerdict(mesh, s.turns) }));
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={3}
      title="死锁、活锁及饿死"
      en="Deadlock, Livelock, and Starvation"
      lede={t(
        '互连网络里最贵的 bug 不是算错，而是停住。这一章把“停住”拆成三种：谁也不动（死锁）、一直在动却到不了（活锁）、以及有人永远轮不到（饿死）。三种失效要三份独立的证明，第一种可以化成一张图上有没有环。',
        'The most expensive bug in an interconnect is not a wrong answer but a stall. This chapter splits “stalled” into three: nobody moves (deadlock), everybody moves but nothing arrives (livelock), and somebody never gets a turn (starvation). Three failures, three separate proofs — and the first one reduces to a cycle in a graph.'
      )}
    />

    <div class="prose">
      <h3><span class="h-no">3.1</span>{t('资源、等待与死锁的必要条件', 'Resources, waits, and the necessary conditions')}</h3>
      {#if en}
        <p>
          Start with the resource model. A packet in flight occupies a set of resources: the input virtual channel it
          sits in, the physical link it will use, the output virtual channel it has been granted, and the switch
          bandwidth for the cycle. It advances only when it acquires the next resource while still holding the current
          one. Any network, whatever its switching technique, can be described this way.
        </p>
        <p>
          Deadlock is then the classical four-condition pathology: resources are finite, they are held exclusively, they
          cannot be preempted, and there is a circular wait. In an interconnect the first three are given by construction,
          so deadlock-freedom is entirely about the fourth: can a set of packets wait on each other in a cycle?
        </p>
        <p>
          Wormhole routing makes the fourth easy to reach. Because a packet occupies a chain of channels simultaneously,
          one blocked head freezes a whole worm across several routers; and because buffers are only a few flits deep,
          filling a ring takes a handful of packets. Figure 3.1 is the smallest instance: four routers, one packet each,
          every buffer full.
        </p>
      {:else}
        <p>
          先建立资源模型。一个在途的包占着一组资源：它所在的那条输入虚拟信道、它将要使用的物理链路、
          已经分配给它的输出虚拟信道，以及这一拍它要用的交叉开关带宽。它只有在继续持有当前资源的同时拿到下一份资源，才能前进。
          任何网络，不管用什么交换技术，都可以这样描述。
        </p>
        <p>
          于是死锁就是经典的四条件病理：资源有限、独占持有、不可抢占、存在循环等待。在互连网络里，前三个是构造上给定的，
          所以“无死锁”完全等价于否定第四件事：会不会出现一组包互相等待成环？
        </p>
        <p>
          虫孔路由让第四件事特别容易发生。一个包同时占着一条通道链，头一堵就把整条“虫”冻在好几个路由器上；
          而缓冲只有几个 flit 深，填满一个环只需要很少几个包。图 3.1 是最小的例子：四个路由器、每核一个包、每个缓冲都满。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 3.1', 'Figure 3.1')}
      caption={t(
        '四路由器环上的最小死锁配置：每个包占着一条信道、等它顺时针的下一条。四条边闭合，依赖图里就是一个环。',
        'The smallest deadlock on a four-router ring: every packet holds one channel and waits for the next one clockwise. Four edges close into a cycle.'
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
      {#if en}
        <p>
          One more piece of vocabulary before the graph: a <em>routing function</em> R maps (current node, destination)
          to a set of admissible output channels. Deterministic routing returns one; adaptive returns many. The set of
          channels a packet can ever use is what the graph will be built from, so the definition of R — not the topology
          — is what we are really testing.
        </p>
      {:else}
        <p>
          在画图之前先补一个词：<em>路由函数</em> R 把（当前节点，目的节点）映射到一组允许的输出信道。确定性路由返回一个，
          自适应路由返回多个。一个包可能用到的信道集合，正是后面那张图要用的东西——所以真正被检验的是 R 的定义，而不是拓扑本身。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">3.2</span>{t('通道相关图：Dally 与 Seitz 的判据', 'The channel dependency graph: Dally and Seitz')}</h3>
      {#if en}
        <p>
          Build a directed graph whose nodes are the network’s directed channels. Add an edge from channel a to channel
          b whenever a packet holding a may be routed to b. That is the <em>channel dependency graph</em>. The theorem is
          short: if no cycle exists in this graph, the routing function is deadlock-free.
        </p>
        <p>
          The proof is by contradiction and worth remembering. Suppose a deadlock configuration existed. Follow one
          blocked packet: it holds a channel and waits for the next, so there is an edge from the held channel to the
          wanted one. Do this for every packet in the configuration; since resources are finite and nobody advances, the
          walk must revisit a channel — a cycle. Conversely, if the graph is acyclic, order channels by any topological
          sort: the packet waiting on the “smallest” channel in that order can never be blocked forever.
        </p>
        <p>
          Two practical notes. First, the criterion is <em>sufficient, not necessary</em> — there are deadlock-free
          functions with cyclic channel graphs, and Chapter 4 is largely about exploiting that gap. Second, the graph is
          built from what R <em>may</em> do, not from what one particular packet does: a single unlucky packet cannot
          deadlock the network, but a routing function that permits the turns can.
        </p>
      {:else}
        <p>
          以网络的有向信道为节点建一张有向图：只要“持有 a 的包可能被路由到 b”，就从 a 连边到 b。这就是<em>通道相关图</em>。
          定理很短：这张图里没有环，路由函数就无死锁。
        </p>
        <p>
          证明用反证法，值得记住。假设存在一个死锁配置，沿一个被阻塞的包走：它占着一条信道、等另一条，于是有一条从所占信道指向所需信道的边。
          对配置里的每个包都这样做；资源有限、谁都不前进，于是这条走法必然重复经过某条信道——即存在环。
          反过来，若图无环，按任一拓扑序给信道排序：在等待链上排在“最前”的那个包，永远不会被无限期挡住。
        </p>
        <p>
          两个实用提醒。第一，这是<em>充分</em>而非必要条件——存在通道图有环却仍无死锁的路由函数，第 4 章大半内容都在利用这个缺口。
          第二，图是按 R <em>可能</em>做的事建的，而不是按某一个包实际走的路径：单个不幸的包不会把网络卡死，但一个允许这些转向的路由函数会。
        </p>
      {/if}
    </div>

    <div class="prose">
      {#if en}
        <p>
          The lab below makes the two levels concrete. The first row is the channel graph of the turn set you select;
          the second row is the extended graph once virtual channels are added. Try the four presets: XY and
          negative-first both give acyclic channel graphs (that is why both are legal deterministic or partially
          adaptive bases), while all eight turns close a square on a 3-D mesh immediately.
        </p>
      {:else}
        <p>
          下面的实验把两个层次摆在一起：第一行是你所选转向集的通道图判定，第二行是加入虚拟信道之后的扩展图判定。
          四个预设都试一下：XY 与负向优先的通道图都无环（这正是两者都能当确定性/部分自适应基础的原因），
          而全部 8 个转向会立刻把网格上的一个方格接通。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 3.2', 'Figure 3.2')}
      caption={t(
        '8 个转向随你勾选，VC 可切到 2 条。上一行是通道级判定，下一行是扩展图判定：勾满 8 个转向时通道图成环；再加 VC 但转向不变，环还在；只有把转向拆到两条 VC 上，扩展图才无环。',
        'Toggle the eight turns and switch to two VCs. The first row is the channel-level verdict, the second the extended one: all eight turns cycle at channel level; a second VC with the same turns does not help; splitting the turns across the two VCs does.'
      )}
    >
      <TurnVcLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          That last observation is the hinge of the whole chapter. Virtual channels do not change which turns are
          <em>allowed</em>; they change which turns belong to which class. A cycle survives unless the classes are
          ordered so that a packet can move up but never back down. In the extended graph this shows up as an edge
          direction restriction: channel class 0 may depend on class 1, never the other way round.
        </p>
      {:else}
        <p>
          最后这一点是全章的枢纽。虚拟信道并不改变哪些转向被<em>允许</em>，它改变的是“哪个转向属于哪个类”。
          环之所以能消失，是因为类之间有了顺序：包可以往上升，但回不去。在扩展图里，这表现为边方向上的限制——
          类 0 可以依赖类 1，反过来不行。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 3.3', 'Figure 3.3')}
      caption={t(
        '五个转向集在 3×3 网格上的判定（由图上穷举依赖现算，不是查表）。四个经典模型各自只禁两个转向就够：负向优先禁“东→南、北→西”，西向优先禁两个“→西”，北向最后禁两个“→北”；8 个转向全开必成环。',
        'Five turn sets judged on a 3×3 mesh by enumerating dependencies. Each classical model forbids just two turns: negative-first bans E→S and N→W, west-first bans the two turns into west, north-last bans the two into north. All eight turns always cycle.'
      )}
    >
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{t('转向集', 'Turn set')}</th>
              <th>{t('禁止的转向', 'Forbidden')}</th>
              <th>{t('允许数', 'Allowed')}</th>
              <th>{t('通道图', 'Channel graph')}</th>
              <th>{t('找到的环', 'Cycle found')}</th>
            </tr>
          </thead>
          <tbody>
            {#each verdicts as row}
              <tr>
                <td>{lang.value === 'en' ? row.en : row.zh}</td>
                <td class="small">{row.banned}</td>
                <td class="num">{row.turns.length}</td>
                <td class="num">{row.verdict.safe ? t('无环', 'acyclic') : t('有环', 'cycle')}</td>
                <td class="mono small">
                  {row.verdict.cycle ? row.verdict.cycle.slice(0, 4).join(' → ') + ' → …' : '—'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">3.2.1</span>{t('扩展通道相关图与“类”', 'Extended dependency graphs and channel classes')}</h3>
      {#if en}
        <p>
          Once virtual channels exist, a channel is no longer the right unit: two packets can hold the same physical
          channel at the same time, in different buffers. What matters is the <em>class</em> — the set of VCs a packet can
          move into at the next hop. The extended channel dependency graph has channel classes as nodes; an edge exists
          when a packet occupying one class can proceed into another.
        </p>
        <p>
          The book distinguishes <em>direct</em> and <em>indirect</em> dependencies. A direct dependency is one hop: the
          packet leaves class a and immediately enters class b. An indirect dependency chains through a path that the
          packet has already been routed along — it can matter when the packet is still occupying upstream buffers while
          requesting a downstream one. Both are needed for the proof; drawing only the direct ones is a common way to
          “prove” a cyclic function safe by accident.
        </p>
        <p>
          A concrete pattern from the book: partition the mesh into eastward and westward virtual networks. The
          eastward network holds eastward channels plus the channels on the east edge; the westward one mirrors it. A
          packet entering one virtual network can never use channels of the other, so there are no dependencies between
          the two C<sub>i</sub> sets at all — and it is enough to show that each extended graph is acyclic on its own.
        </p>
        <p>
          The book’s Example 3.13 is the trap in full. Take a mesh with dimension-order routing as R1 and minimal fully
          adaptive routing as R. R1 is acyclic on its own, so the extended graph looks safe if you only draw the direct
          dependencies — the solid arcs are identical to the plain channel graph. But there are <b>direct cross
          dependencies</b> (dashed arcs): a packet that is still allowed to use an adaptive-only channel can request an
          R1 channel, and an R1 packet can be asked to wait behind it. Those cross arcs close a cycle, and the network
          can deadlock even though every class in isolation is fine. Ignoring cross dependencies is exactly how a design
          gets “proved” safe and then hangs once a week.
        </p>
      {:else}
        <p>
          一旦有了虚拟信道，“通道”就不再是合适的单位：两个包可以同时占着同一条物理信道，只是在不同缓冲里。
          真正重要的是<em>类</em>——包在下一跳可以进入的那组 VC。扩展通道相关图以通道类为节点，
          当“占据类 a 的包能继续进入类 b”时连一条边。
        </p>
        <p>
          书里区分<em>直接</em>相关与<em>间接</em>相关。直接相关是一跳之内：包离开类 a、立刻进入类 b。
          间接相关则要穿过一段它已经走过的路径——当包还占着上游缓冲、却已经在请求下游缓冲时，这种相关才会起作用。
          证明两者都要；只画直接相关，是一不小心就把有环的函数“证明”成安全的常见方式。
        </p>
        <p>
          书上给的一个具体构造：把网格分成东向与西向两个虚拟网络。东向网络包含所有东向信道以及网格东边缘上的信道，
          西向网络与之镜像。进入其中一个虚拟网络的包永远不会用到另一个的通道，于是两个 C<sub>i</sub> 集合之间根本不存在相关——
          只需分别证明各自的扩展图无环即可。
        </p>
        <p>
          书里的例 3.13 把这个陷阱完整演示了一遍。取维序路由作 R1、最小完全自适应路由作 R，R1 自己无环，
          所以只画直接相关时扩展图看起来很安全——实线弧与普通通道图完全一样。但还存在<b>直接交叉相关</b>（虚线弧）：
          一个仍被允许走自适应专用通道的包，可以请求一条 R1 通道；而一个 R1 包可能被要求排在它后面。
          这些交叉弧闭合了环，于是网络会死锁——尽管每个“类”单独看都没问题。忽略交叉相关，正是设计“被证明安全”、
          然后每周挂一次的最常见途径。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">3.2.2</span>{t('定理 3.1：一个连接的无环子函数就够了', 'Theorem 3.1: a connected acyclic subfunction suffices')}</h3>
      {#if en}
        <p>
          Requiring the whole dependency graph to be acyclic is a strong demand, and it throws away most of the
          adaptivity you might want. Duato’s theorem relaxes it to three conditions. Let R be the routing function and
          let R1 be a routing subfunction of R that only uses a subset C1 of the channels. If
        </p>
        <ol>
          <li>the dependency graph of R1 is acyclic,</li>
          <li>R1 is connected — it can route between every pair of nodes, and</li>
          <li>every channel reachable under R can reach some channel of C1,</li>
        </ol>
        <p>
          then R is deadlock-free. The intuition is a topological argument again: a packet that can always be moved onto
          R1 will always drain, so any cycle in R must have an exit, and a cycle with an exit cannot stay closed.
        </p>
        <p>
          This is what makes fully adaptive routing affordable: C1 is one acyclic escape lane (dimension order, usually),
          and the rest of the network may allow anything. The cost is the extra virtual channel that hosts the escape
          lane, plus the allocator fairness that guarantees a packet can actually get into it — a detail that Chapter 6
          of the on-chip networks book turns into a lab.
        </p>
      {:else}
        <p>
          要求整张依赖图无环是很强的条件，也把大部分想要的自适应扔掉了。Duato 的定理把它放松成三个条件。
          设 R 是路由函数，R1 是 R 的一个路由子函数，只使用通道子集 C1。如果
        </p>
        <ol>
          <li>R1 的依赖图无环；</li>
          <li>R1 是连接的——它能路由任意两个节点之间；</li>
          <li>在 R 下可达的每条通道，都能到达 C1 中的某条通道；</li>
        </ol>
        <p>
          那么 R 无死锁。直觉仍然是一个拓扑论证：能被挪到 R1 上的包一定能排空，于是 R 里的任何环都必有出口，而有出口的环无法永远闭合。
        </p>
        <p>
          这就是“完全自适应路由可以很便宜”的来源：C1 只是一条无环的逃逸通道（通常是维序），其余部分随便。
          代价是承载逃逸通道的额外虚拟信道，以及保证包真的能挤进这条通道的分配公平性——片上网络那本书的第 6 章把这个细节做成了实验。
        </p>
      {/if}
      <div class="note">
        <b>{t('三个条件缺一不可：', 'All three conditions matter: ')}</b>
        {t(
          '子函数无环、子函数连接、以及其他通道都能摸到它。少任何一个都能构造出反例：无环但不连通只是把死锁挪到别处；可达性缺失则意味着有些包永远不会被送上逃逸通道。',
          'acyclic, connected, and reachable. Drop any one and a counter-example exists: acyclic but disconnected just moves the deadlock elsewhere; without reachability some packets never get onto the escape lane at all.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">3.3</span>{t('死锁恢复：检测之后做什么', 'Deadlock recovery: what happens after detection')}</h3>
      {#if en}
        <p>
          Recovery strategies accept that deadlock can occur and plan for it. Both need a <em>detector</em>, and the
          detector is the hard part: a timeout is trivial to build but fires late, while a distributed detector (each
          router watches whether progress is being made on a set of channels) is fast but costs messages and state.
        </p>
        <p>
          <b>Progressive</b> recovery keeps the packets. When a configuration is detected, one packet is moved into a
          dedicated recovery resource — an extra buffer, a low-latency side network — which breaks the cycle without
          losing work. The book’s DISHA-style designs use exactly this: a small deadlock buffer big enough for the
          packets that can be simultaneously caught, plus a policy that drains it as fast as possible.
        </p>
        <p>
          <b>Regressive</b> recovery throws work away: the offending packet is dropped or aborted back to its source and
          re-injected later. No extra buffer is needed, but the network pays in wasted bandwidth and in the tail latency
          of retried messages, and the protocol above must be able to tolerate a dropped packet.
        </p>
      {:else}
        <p>
          恢复策略承认死锁会发生，并提前为它做准备。两者都需要<em>检测器</em>，而检测器才是难点：
          超时器极好实现但反应迟，分布式检测器（每个路由器观察一组信道上是否有进展）反应快，但要花消息和状态。
        </p>
        <p>
          <b>前进型</b>恢复不丢包。检测到某个配置后，把一个包搬进专用的恢复资源——额外缓冲、低延迟旁路网络——环就断了，
          而且没有工作被丢掉。书里 DISHA 一类的设计正是如此：一块小死锁缓冲，刚好装得下可能同时被困住的那几个包，
          再加一套尽快排空它的策略。
        </p>
        <p>
          <b>回退型</b>恢复则扔掉工作：把肇事的包丢弃、或中止回源头，稍后重发。不需要额外缓冲，
          但网络要用浪费的带宽和重传消息的尾部延迟付账，而且上层协议必须能容忍丢包。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 3.4', 'Figure 3.4')}
      caption={t(
        '两种恢复策略的账。前进型把成本放在面积上，回退型放在带宽与尾延迟上；检测成本两者都要付。',
        'The bill for both strategies: progressive pays in area, regressive in bandwidth and tail latency; detection is paid by both.'
      )}
    >
      <div class="table-wrap">
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
            <tr>
              <td>{t('对路由的要求', 'requirement on routing')}</td>
              <td>{t('可以不设子网（最大自适应）', 'no subnetwork needed (maximally adaptive)')}</td>
              <td>{t('同上，但每跳的状态要能重建', 'same, but per-hop state must be reconstructible')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">3.4</span>{t('死锁预防：把环提前删掉', 'Deadlock prevention: deleting the cycle up front')}</h3>
      {#if en}
        <p>
          Prevention is the opposite stance: never allow the configuration. The three classical tools are the ones the
          rest of this book builds on — restrict the turns (turn models), restrict the channels a packet may use
          (routing subfunctions), and restrict which buffers a packet may enter (virtual channel classes). All three
          are edits to the dependency graph, made before the chip exists.
        </p>
        <p>
          A useful exercise is the torus. Dimension order is sufficient on a mesh, but a torus has wraparound links, and
          those close new cycles. Splitting every physical channel into two virtual channels — one for the “no wrap”
          part of the path and one for the part after the wrap — restores the acyclic argument. This is exactly the
          dateline trick from the on-chip networks book, derived here from the graph instead of from a timing diagram.
        </p>
      {:else}
        <p>
          预防是相反的立场：根本不允许那种配置出现。三个经典手段也是本书后面反复引用的——限制转向（转弯模型）、
          限制包可用的信道（路由子函数）、限制包可进入的缓冲（虚拟信道类）。三者都是对依赖图的编辑，而且在流片之前就做完。
        </p>
        <p>
          一个有用的练习是环网。维序在网格上就够，但环网有环绕链路，那些链路会闭合新的环。
          把每条物理信道拆成两条虚拟信道——一条走路径中“未跨环绕”的部分，一条走跨越之后的部分——无环论证就恢复了。
          这正是片上网络那本书里的 dateline 技巧，只不过这里是从图上推出来的，而不是从时序图上画出来的。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">3.5</span>{t('电路交换与流水电路交换里的死锁', 'Deadlock in circuit and pipelined circuit switching')}</h3>
      {#if en}
        <p>
          Circuit switching moves the problem to the setup phase. Two setup packets can each hold half a path and wait
          for the other half; the data path is never involved, but the reservation is a resource all the same. Pipelined
          circuit switching answers with backtracking: a probe header walks forward reserving nothing, retreats when it
          finds a busy channel, and only sends data once a complete path is confirmed.
        </p>
        <p>
          Two consequences follow. First, deadlock is impossible by construction — no data is ever buffered on a partial
          path — so the proof obligation moves to the setup protocol, which must guarantee that probes cannot starve.
          Second, the cost moves from buffers to setup latency: a probe that backtracks several times pays the full
          path length each attempt.
        </p>
      {:else}
        <p>
          电路交换把问题挪到建路阶段：两个建路包可以各占半条路、互相等对方那一半；数据通路还没参与，但预留本身也是资源。
          流水电路交换用回退作答：探测头向前走、不预留任何东西，遇到忙信道就退回，确认整条通路之后才发数据。
        </p>
        <p>
          由此产生两个推论。第一，死锁在构造上就不可能——数据从不在半条路上被缓冲——于是证明义务转移到建路协议上，
          协议必须保证探测头不会互相饿死。第二，代价从缓冲挪到了建路延迟：回退几次的探测头，每次都要重付一遍路径长度。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">3.6</span>{t('活锁与饥饿：还在动，但轮不到', 'Livelock and starvation: moving, but never served')}</h3>
      {#if en}
        <p>
          <b>Livelock</b> is the non-minimal cousin of deadlock: the packet keeps moving and keeps not arriving. Any
          routing function that lets a packet take a hop away from its destination needs a progress bound — a hop
          counter, a deterministic phase, or a rule that forces minimal routing after a while. Without it, an adversarial
          sequence of choices can keep a packet in the network indefinitely.
        </p>
        <p>
          <b>Starvation</b> is a scheduling property, not a routing one. If arbitration always prefers the same
          requester, the others wait forever even though the network is never deadlocked. The fix is a fair arbiter
          (round-robin, matrix) rather than a better route.
        </p>
        <p>
          The two are independent of deadlock as well, which is the point of keeping them in the same chapter: a network
          can be deadlock-free and still livelock (non-minimal routing without a bound), and livelock-free and still
          starve a flow (unfair arbitration). Three failure modes, three proofs.
        </p>
      {:else}
        <p>
          <b>活锁</b>是死锁的非最小表亲：包一直在走，却一直到不了。任何允许“背离目的地”一跳的路由函数都需要进展保证——
          跳数计数器、确定性阶段，或“走够若干跳后强制最短”的规则。没有它，一串恶意（或仅仅是倒霉）的选择就能把包永远留在网络里。
        </p>
        <p>
          <b>饥饿</b>是调度性质，不是路由性质。如果仲裁总是偏袒同一个请求者，其他人就永远等，尽管网络从未死锁。
          解法是公平仲裁（轮询、矩阵），而不是更好的路径。
        </p>
        <p>
          这两件事也都不依赖死锁，这正是把它们放在同一章的理由：网络可以无死锁却会活锁（非最小路由没有上限），
          也可以无活锁却饿死某条流（仲裁不公）。三种失效模式，三份独立的证明。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 3.5', 'Figure 3.5')}
      caption={t(
        '上：三种仲裁策略在同一输出端口上的服务次数，固定优先级会让两个请求者一次也拿不到。下：随机非最小路由的 200 次试验，加不加跳数上限对最长路径的影响。',
        'Top: service counts for three arbitration policies on one output; fixed priority starves two requesters. Bottom: 200 trials of a random non-minimal walk, with and without a hop bound.'
      )}
    >
      <FairnessLab />
    </Figure>

    <div class="prose">
      <h3><span class="h-no">3.7</span>{t('死锁到底有多常见：恢复派的经济学', 'How often does deadlock actually happen?')}</h3>
      {#if en}
        <p>
          Every argument above is worst-case. The engineering question is how often the worst case occurs, because that
          decides whether a recovery mechanism is affordable at all. The book’s answer, citing both early estimates and
          later simulation studies: in networks with few virtual channels, low node degree and permissive routing
          restrictions, the probability of deadlock is <em>very</em> small. That single empirical fact is what keeps
          recovery-based routing alive — a design that occasionally has to recover can afford to allow every path, and
          therefore to be faster in the common case.
        </p>
        <p>
          Two caveats keep the argument honest. First, “rare” is not “never”, and the rare cases cluster exactly where
          you cannot afford them: near saturation, where recovery traffic competes with the traffic that caused the
          problem. Second, performance can degrade sharply <em>before</em> any deadlock forms, whenever cyclic
          dependencies between channels are permitted — the network approaches its saturation point and latency rises
          steeply with load. So a recovery-based design needs enough escape bandwidth to drain a cycle quickly, or it
          needs something else to keep the network away from saturation.
        </p>
        <p>
          That “something else” is <b>injection limiting</b> (§9.9): cap how many packets may be in the network at once, so
          the network never parks at saturation. It is not a deadlock-avoidance technique in the formal sense — it does not
          change the channel dependency graph — but it lowers the deadlock frequency to something negligible and prevents
          the pre-deadlock collapse. The same logic explains why VCT networks, where deadlock is less likely because a
          whole packet is buffered at each hop, still need protection, and why deflection routing is an effective one:
          deflecting a packet costs a hop, while stalling it costs a cycle of progress.
        </p>
        <p>
          There is one more engineering consequence the book draws out: message length. A recovery mechanism based on a
          timeout has to be tuned against the length of the packet it is watching, and long packets make the optimum
          drift. Hence the advice to use short messages, or to split long messages into fixed-length packets — which is
          also what the central buffer of a Disha router wants to see.
        </p>
      {:else}
        <p>
          上面所有论证都是最坏情况。工程问题是：最坏情况多久发生一次？因为这决定了恢复机制到底养不养得起。
          书里给出的答案（既引早期估计也引后来的模拟研究）是：在虚拟信道少、节点度小、路由限制宽松的网络里，
          死锁概率<em>非常</em>小。正是这一条经验事实让“恢复派”活得下去——偶尔需要恢复的设计，才敢允许每一条路径，
          也才能在常见情况下更快。
        </p>
        <p>
          两个前提让这个论证保持诚实。第一，“罕见”不等于“不会”，而且罕见情形恰好集中在最不该出现的地方：
          接近饱和点时，恢复流量要和造成问题的流量抢带宽。第二，只要允许通道之间存在环相关，性能会在<em>死锁真正形成之前</em>
          就急剧下降——网络逼近饱和点，延迟随负载陡升。所以恢复派要么给足够的逃逸带宽把环迅速排空，
          要么用别的手段把网络挡在饱和点之外。
        </p>
        <p>
          这个“别的手段”就是<b>注入限制</b>（§9.9）：限制网络里同时存在的包数，使网络永远停在饱和点之下。
          它在形式意义上不是死锁避免技术——它不改变通道相关图——但它把死锁频率压到可以忽略，并挡住死锁前的塌陷。
          同一套逻辑也解释了：VCT 网络里死锁概率更低（每跳都缓存整包），却仍然需要保护；以及为什么偏转路由是有效的保护——
          偏转一个包只花一跳，而让它停住会花掉整整一个周期的进展。
        </p>
        <p>
          书里还引出另一条工程结论：报文长度。基于超时的恢复机制必须按它所观察的包长来调，长包会让最优值漂移。
          所以建议用短报文，或把长报文切成定长小包——这也正是 Disha 路由器的中央缓冲希望看到的形状。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">3.8</span>{t('工程问题：把证明变成参数', 'Engineering issues: turning the proof into parameters')}</h3>
      {#if en}
        <p>
          Three things from this chapter end up as numbers on a specification: how many recovery buffers per router,
          what detection threshold (timeout or progress counter), and which arbiter. The chapter’s engineering advice
          is plain: decide how much tail latency you can afford first, then choose whether to buy area with a proof
          (progressive, subnetwork) or bandwidth with a proof (regressive, recovery).
        </p>
        <p>
          Two traps are worth naming. Sizing recovery buffers for the <em>average</em> deadlock rather than the
          simultaneous worst case leaves you recovering forever under load. And proving acyclic on the direct
          dependencies only — forgetting the indirect and, above all, the <em>cross</em> dependencies of §3.2.1 — is the
          single most common way a design ships with a deadlock that appears once a week.
        </p>
      {:else}
        <p>
          这一章的三样东西，最后都会变成规格书上的数字：每个路由器几块恢复缓冲、检测阈值设多少（超时还是进展计数）、仲裁器用哪种。
          书里“工程问题”的提醒很朴素：先决定你能承受多少尾部延迟，再决定是用证明换面积（前进型、子网），还是用证明换带宽（回退型、恢复）。
        </p>
        <p>
          有两类陷阱值得点名。第一，按<em>平均</em>死锁规模而不是同时发生的最坏情况来定恢复缓冲，会在高负载下变成“永远在恢复”。
          第二，只对直接相关证明无环、却忽略间接相关，是设计带着一个“每周出现一次”的死锁出货的最常见方式。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">3.9</span>{t('延伸阅读：书里指到哪儿', 'Further reading: where the book points')}</h3>
      {#if en}
        <p>
          The book’s reference list for this chapter reads as a short history of the subject. Dally and Seitz supply the
          channel dependency graph and the sufficient condition; the turn model of Glass and Ni reframes the whole
          question as “which turns form cycles”; Duato relaxes the condition to a connected acyclic subfunction, which is
          the version everything in Chapter 4 uses; and the recovery line runs from the regressive retry schemes to
          Disha, whose measured deadlock frequencies are what justify the approach in the first place.
        </p>
        <p>
          Two pointers forward matter for the rest of the site. Fault-tolerant variants — what happens to these proofs
          when a link fails — are Chapter 6. Injection limiting and the saturation behaviour discussed in §3.7 are §9.9.
          And the turn model gets its full treatment in Chapter 4, including the three classical variants whose verdicts
          Figure 3.3 computes here.
        </p>
      {:else}
        <p>
          书里这一章的参考文献读起来就是这个领域的简史。Dally 与 Seitz 给出通道相关图与充分条件；
          Glass 与 Ni 的转弯模型把整个问题重述为“哪些转向会成环”；Duato 把条件放松成“连接的无环子函数”，
          也就是第 4 章全部算法使用的版本；恢复这一线从回归型重试一路走到 Disha，而正是“实测死锁频率极低”让这条路线站得住。
        </p>
        <p>
          往前看，还有两条线索与本站后续相关：容错变体（链路失效时这些证明怎么办）在第 6 章；§3.7 讨论的注入限制与饱和行为在 §9.9。
          转弯模型的完整处理在第 4 章，包括图 3.3 在这里现算判定的三个经典变体。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">3.10</span>{t('自测', 'Check yourself')}</h3>
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
            why: t('它排除了资源循环等待，因此不会死锁；拥塞与最小性都是另外的问题。', 'It rules out a circular wait, hence deadlock; congestion and minimality are separate questions.')
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
            q: t('定理 3.1 里的三个条件，缺了“连接”会怎样？', 'In Theorem 3.1, what breaks if the subfunction is not connected?'),
            options: [
              t('逃逸通道无法把包送到所有目的地，死锁被挪到别处', 'The escape lane cannot deliver everywhere, so the deadlock reappears elsewhere'),
              t('什么都不会变', 'Nothing changes'),
              t('网络会变成非最小路由', 'The network becomes non-minimal')
            ],
            answer: 0,
            why: t('连接性保证子网自身能排空任何落在它上面的包；少了它，包可能进去却出不来。', 'Connectivity is what guarantees the subnetwork can drain any packet that lands on it; without it a packet can get in and never get out.')
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
          },
          {
            q: t('只画直接相关、漏掉直接交叉相关，会出什么错？', 'What goes wrong if you draw direct dependencies but miss direct cross dependencies?'),
            options: [
              t('没有影响，交叉相关只是细节', 'Nothing — cross dependencies are a detail'),
              t('会把本该死锁的路由“证明”成安全', 'A routing function that can deadlock gets “proved” safe'),
              t('会让网络变成非最小路由', 'The network becomes non-minimal')
            ],
            answer: 1,
            why: t('自适应类可以请求逃逸类通道，反方向的交叉弧会闭合环；漏掉它们，扩展图看起来无环，实际却会挂。', 'An adaptive-class packet can request an escape-class channel, and the cross arcs close a cycle; miss them and the extended graph looks acyclic while the network hangs.')
          },
          {
            q: t('注入限制能防死锁吗？', 'Does injection limiting prevent deadlock?'),
            options: [
              t('能，它从通道相关图上删掉了环', 'Yes — it deletes cycles from the channel dependency graph'),
              t('不能，它改变的是网络占用率，但它把死锁频率压到可以忽略', 'No — it changes occupancy, not the graph, but it pushes the deadlock frequency to something negligible'),
              t('能，它增加了缓冲深度', 'Yes — it deepens the buffers')
            ],
            answer: 1,
            why: t('它不改依赖图，所以不是形式意义上的死锁避免；但它让网络远离饱和点，实测频率低到可以按“偶发”来设计。', 'It leaves the dependency graph alone, so it is not avoidance in the formal sense; it keeps the network away from saturation, which is what makes “rare enough to recover” a workable design point.')
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

  .table-wrap {
    overflow-x: auto;
  }

  .table-wrap .table {
    min-width: 520px;
  }

  .table .small {
    font-size: 10px;
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
