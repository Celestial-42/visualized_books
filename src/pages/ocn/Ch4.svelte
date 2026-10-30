<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import RouteLab from '../../components/noc/RouteLab.svelte';
  import TurnDeadlockLab from '../../components/noc/TurnDeadlockLab.svelte';
  import { buildTopology } from '../../lib/noc/topology';
  import { multicastTree, hamiltonianOrder } from '../../lib/noc/routing';
  import { lang, t } from '../../lib/lang.svelte';
  import { navigate } from '../../lib/router.svelte';

  const en = $derived(lang.value === 'en');
  const open = (slug: string) => navigate(`/book/on-chip-networks/${slug}`);

  const mesh = buildTopology('mesh', 4, 4);
  const dests = [5, 6, 9, 10];
  const tree = multicastTree(mesh, 0, dests);
  const sweep = hamiltonianOrder(mesh, 0).length - 1;
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={4}
      title="路由"
      en="Routing"
      lede={t(
        '拓扑只说了“能走哪”，路由决定“这次走哪”。最小路由省延迟，非最小路由换负载均衡；而只要转向允许得太多，信道依赖图上就会出现一个环——那是一个还没发生、但一定会发生的死锁。',
        'Topology says which paths exist; routing picks one this time. Minimal routing saves latency, non-minimal buys balance — and permit one turn too many, and a cycle appears in the channel dependency graph: a deadlock that has not happened yet but will.'
      )}
    />

    <div class="prose">
      <h3><span class="h-no">4.1</span>{t('三类路由，五种算法', 'Three families, five algorithms')}</h3>
      {#if en}
        <p>
          <b>Deterministic</b> routing computes the path from the source and destination alone: the same pair always
          takes the same route. Dimension order (XY) is the standard example, and it is minimal — no packet takes a hop
          away from its destination.
        </p>
        <p>
          <b>Oblivious</b> routing ignores congestion but not determinism: Valiant’s trick is to send to a random
          intermediate node first, then to the destination. Every pair now has many paths, and the price is extra hops
          whether the network is busy or not.
        </p>
        <p>
          <b>Adaptive</b> routing looks at the network and chooses. Minimal adaptive only picks among shortest paths;
          non-minimal adaptive may detour around congestion. Adaptivity is what turns the topology’s path diversity into
          throughput — and what makes deadlock analysis harder.
        </p>
        <p>
          Non-minimal adaptive deserves a sentence of its own: it treats “shortest” as optional. The usual scheme (UGAL)
          prices two candidates at once — the minimal path and a detour via a far node — and takes whichever looks
          emptier. Under light load the minimal path always looks cheaper, so it degenerates into deterministic routing;
          only a real hotspot makes the detour win. That property matters: average hop count is not dragged down by the
          non-minimal option.
        </p>
      {:else}
        <p>
          <b>确定性</b>路由只看源和目的：同一对节点永远走同一条路。维序（XY）是标准例子，而且它是最小的——
          没有任何一跳是背离目的地的。
        </p>
        <p>
          <b>Oblivious</b> 路由不看拥塞，但仍然确定：Valiant 的办法是先随机送到一个中间节点，再去目的。
          每一对节点于是有很多条路，代价是不管网络忙不忙都多走几跳。
        </p>
        <p>
          <b>自适应</b>路由会看网络状态再决定。最小自适应只在最短路里挑；非最小自适应可以绕开拥塞。
          自适应正是把拓扑的路径多样性变成吞吐的东西——也是让死锁分析变难的东西。
        </p>
        <p>
          非最小自适应值得单独说一句：它把“最短”也当成可选项。典型做法（UGAL）同时估两条候选路的代价——
          一条是最短路，一条是先绕到远处再回来——谁的链路占用更低就走谁。低负载时最短路的估计代价总是更低，
          于是行为退化成确定性路由；只有在热点出现之后，绕行才会被选中。这条“低负载时不像自适应”的性质很重要：
          它意味着平均跳数不会被非最小路由拖累。
        </p>
      {/if}

      <div class="table-wrap">
        <table class="table algo-table">
        <thead>
          <tr>
            <th>{t('算法', 'Algorithm')}</th>
            <th>{t('怎么选路', 'How it picks')}</th>
            <th>{t('跳数', 'Hops')}</th>
            <th>{t('死锁', 'Deadlock')}</th>
            <th>{t('买到了什么', 'What it buys')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="mono">XY</td>
            <td>{t('先把 X 走完，再走 Y', 'All X, then all Y')}</td>
            <td>{t('最小', 'minimal')}</td>
            <td>{t('无环（4 个转向）', 'acyclic (4 turns)')}</td>
            <td>{t('最简单的实现', 'the simplest logic')}</td>
          </tr>
          <tr>
            <td class="mono">YX</td>
            <td>{t('先把 Y 走完，再走 X', 'All Y, then all X')}</td>
            <td>{t('最小', 'minimal')}</td>
            <td>{t('无环（4 个转向）', 'acyclic (4 turns)')}</td>
            <td>{t('与 XY 对称，换一维先吃拥塞', 'XY’s mirror; the other dimension absorbs congestion first')}</td>
          </tr>
          <tr>
            <td class="mono">West-first</td>
            <td>{t('往西先走完，其余三个方向自适应', 'West first, then adapt among the other three')}</td>
            <td>{t('最小', 'minimal')}</td>
            <td>{t('无环（另一组 4 个转向）', 'acyclic (a different 4 turns)')}</td>
            <td>{t('非均匀流量下的一点均衡', 'some balance under skewed traffic')}</td>
          </tr>
          <tr>
            <td class="mono">Valiant</td>
            <td>{t('先到中间节点，再各自按 XY 走', 'Via an intermediate node, XY on each leg')}</td>
            <td>{t('非最小（明显变多）', 'non-minimal (clearly more)')}</td>
            <td>{t('每段无环，整体仍安全', 'each leg acyclic, so still safe')}</td>
            <td>{t('不看拥塞也能把热点摊开', 'spreads hotspots without looking at them')}</td>
          </tr>
          <tr>
            <td class="mono">{t('最小自适应', 'Minimal adaptive')}</td>
            <td>{t('在 XY / YX（或更多转向）里按链路负载挑', 'Choose among XY / YX (or more turns) by link load')}</td>
            <td>{t('最小', 'minimal')}</td>
            <td>{t('需要受限转向或 VC', 'needs restricted turns or VCs')}</td>
            <td>{t('跟着热点换路，吞吐更高', 'paths follow the hotspots; higher throughput')}</td>
          </tr>
        </tbody>
        </table>
      </div>
      <p class="table-note">
        {t(
          '关键在于“跳数”和“看不看拥塞”是两件独立的事：Valiant 不看拥塞却主动加跳，自适应看拥塞但不加跳。',
          'The point is that “hop count” and “does it look at congestion” are independent: Valiant ignores congestion and adds hops anyway, while adaptive reads congestion and adds none.'
        )}
      </p>
    </div>

    <Figure
      no={t('图 4.1', 'Figure 4.1')}
      caption={t(
        '同一对端点，五种算法的实际路径与决策依据。Valiant 会绕到最远的中间节点，跳数立刻变多；最小自适应会把 XY/YX 两条候选一起画出来、显示各自的链路负载之和，默认还假设链路 5→6 被打满，于是你能看到它为什么避开这条路。',
        'The same endpoints under five algorithms, with the reasoning on screen. Valiant detours through the farthest intermediate node and pays hops; minimal adaptive draws both XY and YX candidates with each one’s summed link load, and by default assumes link 5→6 is hammered — so you can see why it avoids it.'
      )}
    >
      <RouteLab />
    </Figure>

    <div class="prose">
      <h3><span class="h-no">4.2</span>{t('死锁：转向模型与信道依赖图', 'Deadlock: turn models and the channel dependency graph')}</h3>
      {#if en}
        <p>
          Deadlock in an interconnection network is a cycle of packets each waiting for a buffer the next one holds.
          The classical way to rule it out is to write down the <em>channel dependency graph</em>: nodes are directed
          channels, and an edge exists when a packet holding one channel may request another. If that graph is
          acyclic, no deadlock is possible — full stop.
        </p>
        <p>
          XY routing is deadlock-free for a beautifully simple reason: it permits only four of the eight turns on a
          mesh, and those four cannot close. West-first forbids a different four and is also acyclic. Take XY and add
          just <code>S→W</code> and <code>N→E</code> and the four edges of a single square close — the engine in
          Figure 4.2 finds that cycle and prints it.
        </p>
      {:else}
        <p>
          互连网络里的死锁，是每个包都在等下一个包占着的缓冲，首尾相接成环。经典的排除办法是写出
          <em>信道依赖图</em>：节点是有向信道，当一个包持有某信道、还可能请求另一条信道时，两者之间连一条边。
          这张图无环，就不可能死锁——没有例外。
        </p>
        <p>
          XY 路由无死锁的理由非常干净：mesh 上 8 个转向它只允许 4 个，而这 4 个闭不上。
          West-first 禁止的是另外 4 个，同样无环。而在 XY 上只加 <code>S→W</code> 和 <code>N→E</code>，
          一个方格的四条边就接通了——下面图 4.2 的引擎会把这个环找出来并打印给你看。
        </p>
      {/if}
    </div>

    <div class="prose">
      <div class="note">
        <b>{t('为什么“无环”就够了：', 'Why acyclicity is enough: ')}</b>
        {t(
          '缓冲占用关系沿着依赖图传递。如果依赖图无环，就存在一个拓扑序，最“后面”的包一定总有地方可去，于是总有人能前进。环一出现，这条论证就断了。',
          'buffer occupancy flows along the dependency graph. If the graph is acyclic there is a topological order, and the packet furthest along that order always has somewhere to go. A cycle breaks the argument.'
        )}
      </div>

      <h3><span class="h-no">4.3</span>{t('两种死锁，别混为一谈', 'Two deadlocks, and they are not the same')}</h3>
      {#if en}
        <p>
          <b>Routing deadlock</b> is a property of the path set: the turns you permit form a cycle in the channel
          dependency graph, so some traffic pattern can always close it, no matter how much buffering you buy.
          <b>Flow-control deadlock</b> is a property of an execution: buffers happen to be occupied in a cycle right now.
          The first is a design bug; the second can also happen in a correctly designed network if the routing is
          unrestricted.
        </p>
        <p>
          Chapter 5 attacks the second directly with buffers and virtual channels. This section is about the first: a
          cycle in the dependency graph is a <em>proof obligation</em>, and the proof is a graph traversal, not an
          argument from intuition.
        </p>
      {:else}
        <p>
          <b>路由死锁</b>是路径集合的性质：你允许的转向在信道依赖图里构成环，那么总存在某个流量模式能把它闭合，
          无论加多少缓冲。 <b>流控死锁</b>是一次执行的性质：此刻缓冲恰好被环形占用。前者是设计缺陷；
          后者即使设计正确、只要路由不加限制，也可能发生。
        </p>
        <p>
          第 5 章用缓冲与虚拟信道正面处理后者；这一节处理前者：依赖图里的环是一个<em>证明义务</em>，
          而证明的手段是图遍历，不是直觉。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 4.2', 'Figure 4.2')}
      caption={t(
        '把 VN 一起摊开再判环。单虚拟网络多加两个转向就成环；拆成“维序 + west-first”两个 VN、且只允许 VN0→VN1 升级，8 个转向全部可用却仍然无环——代价是多一套缓冲与仲裁。',
        'Lay the VNs out before you look for cycles. One VN plus two extra turns cycles; split into XY and west-first VNs with escalation only from VN0 to VN1, and all eight turns fit without a cycle — at the price of a second set of buffers and arbiters.'
      )}
    >
      <TurnDeadlockLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          That is the whole trade of virtual channels in routing: they do not change the topology, they buy back
          forbidden turns by splitting the dependency graph into ordered layers. Every extra VN is another set of
          buffers, another arbiter, and one more thing to verify.
        </p>
        <p>
          Notice what the lab does <em>not</em> show: splitting is not a magic wand. If the second VN's own turn set is
          cyclic, the layered graph cycles too — the last preset is exactly that case. Duato's escape-VC theorem is the
          stronger statement (a single acyclic sub-network reachable from every channel is enough), and Chapter 5 uses
          it at the flow-control level.
        </p>
      {:else}
        <p>
          这就是虚拟信道在路由层的全部交易：它不改变拓扑，而是把依赖图切成有序的几层，换回被禁止的转向。
          每多一个 VN，就多一套缓冲、一个仲裁器，以及一份要验证的东西。
        </p>
        <p>
          注意这个实验<strong>没有</strong>说明什么：分层不是万能钥匙。如果第二个 VN 自己的转向集就有环，
          分层后的图照样有环——最后一个预设正是这种情况。Duato 的逃逸 VC 定理是一个更强的结论
          （存在一个从任意信道可达的无环子网就够了），第 5 章会在流控层用到它。
        </p>
      {/if}
      {#if en}
        <p>
          Which is also why Chapter 6 cares so much about allocators: a VN only helps if a packet can actually get a
          buffer in it. An allocator that starves the escape VN starves the deadlock-freedom proof.
        </p>
      {:else}
        <p>
          这也解释了第 6 章为什么那么在意分配器：VN 只有在包真的能拿到它的缓冲时才有用。
          一个让逃逸 VN 饿死的分配器，会让“无死锁”的证明落空。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">4.4</span>{t('多播：一棵树省下多少', 'Multicast: what a tree saves')}</h3>
      {#if en}
        <p>
          When one message must reach several destinations, sending it several times wastes the shared prefix. The
          tree-based alternative routes once and branches at routers. The saving is measurable on the graph: the union
          of the individual shortest paths is the multicast tree, and its hop count is what you actually pay.
        </p>
      {:else}
        <p>
          一条消息要送到多个目的地时，分成多份单播会重复走公共前缀。树形做法是只路由一次，在路由器上分叉。
          省下多少可以在图上量：把各条最短路合并，就是多播树，它的跳数才是真正付出的代价。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 4.3', 'Figure 4.3')}
      caption={t(
        `4×4 mesh 上从 0 号节点发往 {${dests.join(', ')}} 四个目的地：树形 ${tree.treeHops} 跳，逐个单播 ${tree.unicastHops} 跳——公共前缀被合并掉了。`,
        `From node 0 to ${dests.join(', ')} on a 4×4 mesh: ${tree.treeHops} hops as a tree versus ${tree.unicastHops} as separate unicasts — the shared prefix is merged.`
      )}
    >
      <div class="mc">
        <div class="mc-rows">
          <div class="mc-row">
            <span class="mc-k">{t('树形（合并公共前缀）', 'Tree (shared prefix merged)')}</span>
            <b class="mono">{tree.treeHops}</b>
            <span class="mc-bar"><i style={`width:${(tree.treeHops / tree.unicastHops) * 100}%`}></i></span>
          </div>
          <div class="mc-row dim">
            <span class="mc-k">{t('逐个单播', 'Separate unicasts')}</span>
            <b class="mono">{tree.unicastHops}</b>
            <span class="mc-bar"><i style="width:100%"></i></span>
          </div>
        </div>
        <p class="mc-note">
          {t(
            '代价是路由器要维护复制与目的列表——第 8 章里 Eyeriss 与 KAIST 的多播网络就是拿这个换带宽的。',
            'The price is that routers must replicate and carry a destination list — exactly the trade Eyeriss and the KAIST multicast NoC make in Chapter 8.'
          )}
        </p>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">4.5</span>{t('不规则拓扑与实现', 'Irregular topologies and implementation')}</h3>
      <p>
        {t(
          `现成的芯片常常不是网格：外设、存储控制器、加速器摆在哪里，图就长成什么样。在不规则图上，XY 这种“按维度”的路由没有定义，通常改用源路由（包头带转向表）、节点表路由，或运行时算出的组合逻辑。代价是包头更宽、或者路由表要占面积。`,
          'Real chips are rarely a clean grid: the graph grows around where peripherals, memory controllers and accelerators sit. On an irregular graph, “by dimension” has no meaning; designs use source routing (the header carries a turn list), node-table routing, or a combinational circuit computed at run time — and pay in header width or table area.'
        )}
      </p>
      <p>
        {t(
          `多播还有一种极端做法：Hamiltonian 路径。一个包按固定顺序走遍所有节点，在每个节点丢弃属于自己的那一份。4×4 mesh 上这条路径有 ${sweep} 跳——比树更死板，但路由逻辑近乎没有。`,
          `One extreme form of multicast is a Hamiltonian walk: a single packet visits nodes in a fixed order, dropping a copy at each. On a 4×4 mesh that walk is ${sweep} hops — more rigid than a tree, but with almost no routing logic at all.`
        )}
      </p>
      <h4>{t('四种实现，四种代价', 'Four implementations, four costs')}</h4>
      <p>
        {t(
          '同一个路由算法可以落成很不一样的东西。源路由：包头里带一串转向，每个路由器只读下一位——逻辑几乎为零，代价是包头变宽（转向数 × 每转向 2 bit），而且包越远头越长。节点表路由：每个路由器存一张“去往目的 X 用输出 Y”的表——头很短，代价是表面积随节点数线性长，还要软件配置。组合逻辑：把不规则图的关键路径固化成门电路——延迟最低，但改一次图就要重做一次综合。自适应逻辑：在组合逻辑之外再看几路队列占用——最灵活，代价是比较器与仲裁的延迟。',
          'One routing function can be built four very different ways. Source routing puts a turn list in the header and each router reads one entry — almost no logic, at the price of a wider header that grows with distance. Node-table routing keeps a “destination X → output Y” table per router — short headers, but table area grows with the node count and it must be programmed. Combinational logic bakes the irregular graph’s paths into gates — lowest latency, and every graph change means resynthesis. Adaptive logic adds queue-occupancy comparisons on top — the most flexible, at the price of comparator and arbitration delay.'
        )}
      </p>
    </div>

    <div class="prose">
      <div class="pull">
        {t(
          '最小路由决定延迟，均衡决定吞吐；而死锁跟这两件事都无关——它只跟你允许了哪些转向有关。',
          'Minimality sets latency and balance sets throughput; deadlock is neither — it depends only on which turns you permit.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">4.6</span>{t('自测', 'Check yourself')}</h3>
      <Quiz
        questions={[
          {
            q: t('Valiant 路由为什么能均衡负载？', 'Why does Valiant routing balance load?'),
            options: [
              t('因为它总是走最短路径', 'Because it always takes a shortest path'),
              t('因为中间节点把任意一对端点拆成两段，路径集合变大', 'The intermediate node splits every pair into two legs, enlarging the path set'),
              t('因为它知道每条链路的队列长度', 'Because it knows every link’s queue length')
            ],
            answer: 1,
            why: t('先到随机（或固定伪随机）中间节点，再到目的，等价于把流量先撒开；它完全不看拥塞，但仍能显著抬高饱和吞吐。', 'Routing via an intermediate node spreads traffic without looking at congestion at all — oblivious, yet it raises saturation throughput substantially.')
          },
          {
            q: t('XY 为什么无死锁？', 'Why is XY deadlock-free?'),
            options: [
              t('因为它是最小路由', 'Because it is minimal'),
              t('因为它只允许四个转向，依赖图上闭不成环', 'It permits only four turns, which cannot close a cycle'),
              t('因为缓冲足够大', 'Because buffers are large enough')
            ],
            answer: 1,
            why: t('最小性本身不保证无环；是“只从水平转垂直、绝不反向”这一限制让信道依赖图有拓扑序。', 'Minimality alone guarantees nothing; the rule “horizontal then vertical, never back” is what gives the channel graph a topological order.')
          },
          {
            q: t('把 8 个转向拆到两个 VN 上，为什么就能无死锁？', 'Why does splitting the eight turns over two VNs remove the deadlock?'),
            options: [
              t('因为每个 VN 的转向集各自无环，且只允许从 VN0 升到 VN1', 'Each VN’s turn set is acyclic, and escalation only goes VN0 → VN1'),
              t('因为多了一套缓冲，容量变大了', 'Because the extra buffer makes the network bigger'),
              t('因为 VN1 比 VN0 快', 'Because VN1 is faster than VN0')
            ],
            answer: 0,
            why: t('依赖图按 (信道, VN) 展开后，升级边只朝一个方向，环就无法闭合；容量并不参与这个论证。', 'Once the graph is laid out per (channel, VN), the escalation edges point one way, so no cycle can close — capacity plays no part in the argument.')
          },
          {
            q: t('多播树省下的是什么？', 'What does a multicast tree actually save?'),
            options: [
              t('公共前缀上的重复链路占用', 'Duplicate link usage on the shared prefix'),
              t('路由计算时间', 'Route computation time'),
              t('包头数量', 'Header count')
            ],
            answer: 0,
            why: t('树把公共前缀只走一次；代价是路由器要复制、要带目的列表。', 'The tree walks the shared prefix once; the cost is replication and destination lists in the router.')
          }
        ]}
      />
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => open('ch5')}>
          <span class="next-no display">05</span>
          <strong>{t('流控', 'Flow control')}</strong>
          <span>{t('真正把环填满的是 flit。看点对点的环在缓冲里卡死，再被 dateline 救回来。', 'Flits are what actually fill the cycle. Watch a ring deadlock in its buffers, then get rescued by a dateline.')}</span>
        </button>
        <button class="next-card" onclick={() => open('ch3')}>
          <span class="next-no display">03</span>
          <strong>{t('回到拓扑', 'Back to topology')}</strong>
          <span>{t('路由能有几条路可走，取决于图给了多少。', 'How much choice routing has depends on what the graph offers.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .table-wrap {
    overflow-x: auto;
    margin-top: 18px;
  }

  .algo-table {
    margin-top: 0;
    min-width: 560px;
  }

  .algo-table td:first-child {
    white-space: nowrap;
    color: var(--accent-deep);
  }

  .table-note {
    margin-top: 10px;
    font-size: 11px;
    line-height: 1.65;
    color: var(--muted);
  }

  .mc {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mc-rows {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .mc-row {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) 40px minmax(0, 2fr);
    align-items: center;
    gap: 10px;
    font-size: 11.5px;
    color: var(--ink-2);
  }

  .mc-row.dim {
    opacity: 0.7;
  }

  .mc-k {
    color: var(--ink-3);
  }

  .mc-row b {
    font-weight: 500;
    text-align: right;
  }

  .mc-bar {
    display: block;
    height: 6px;
    border-radius: 3px;
    background: var(--paper-3);
    overflow: hidden;
  }

  .mc-bar i {
    display: block;
    height: 100%;
    background: var(--accent);
  }

  .mc-row.dim .mc-bar i {
    background: var(--muted);
  }

  .mc-note {
    font-size: 11px;
    line-height: 1.65;
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
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
