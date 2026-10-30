<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import RouteLab from '../../components/noc/RouteLab.svelte';
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
      <h3><span class="h-no">4.1</span>{t('三类路由', 'Three families')}</h3>
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
      {/if}
    </div>

    <Figure
      no={t('图 4.1', 'Figure 4.1')}
      caption={t(
        '同一对端点，四种算法的实际路径。Valiant 会先绕到一个中间节点，跳数立刻变多——它买的是负载均衡，不是延迟。',
        'The same endpoints under four algorithms. Valiant detours through an intermediate node and pays hops immediately — it is buying balance, not latency.'
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
          Figure 4.1 finds that cycle and prints it.
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
          一个方格的四条边就接通了——图 4.1 里的引擎会把这个环找出来并打印给你看。
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
      {#if en}
        <p>
          This is also why the escape-route tricks in Chapter 5 work. Virtual channels, datelines and bubbles are all
          different ways of making sure the dependency graph, restricted to each escape class, stays acyclic.
        </p>
      {:else}
        <p>
          这也是第 5 章那些“逃生方案”能成立的原因。虚拟信道、dateline、气泡流控，本质上都是同一种手段：
          保证在每一个逃生类别内部，依赖图仍然无环。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">4.3</span>{t('多播：一棵树省下多少', 'Multicast: what a tree saves')}</h3>
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
      no={t('图 4.2', 'Figure 4.2')}
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
      <h3><span class="h-no">4.4</span>{t('不规则拓扑与实现', 'Irregular topologies and implementation')}</h3>
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
      <h3><span class="h-no">4.5</span>{t('自测', 'Check yourself')}</h3>
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
