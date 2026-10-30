<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import FlowLab from '../../components/noc/FlowLab.svelte';
  import BubbleLab from '../../components/noc/BubbleLab.svelte';
  import { circuitCost, bufferFootprint, transferLatency } from '../../lib/noc/flow';
  import { creditThroughput } from '../../lib/noc/perf';
  import { lang, t } from '../../lib/lang.svelte';
  import { navigate } from '../../lib/router.svelte';

  const en = $derived(lang.value === 'en');
  const open = (slug: string) => navigate(`/book/on-chip-networks/${slug}`);

  const HOPS = 4;
  const circuitRows = [4, 16, 64].map((f) => ({
    flits: f,
    circuit: circuitCost(HOPS, f),
    wh: transferLatency('wh', HOPS, f),
    bufCircuit: bufferFootprint('circuit', f),
    bufWh: bufferFootprint('wh', f, 2),
    bufVct: bufferFootprint('vct', f, 2)
  }));

  const RTT = 8;
  const creditRows = [2, 4, 8, 16].map((d) => ({ depth: d, rate: creditThroughput(d, RTT) }));
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={5}
      title="流控"
      en="Flow Control"
      lede={t(
        '路由说“走哪”，流控说“什么时候可以走”。它决定一个包在链路上占多少、占多久，也决定当四个包互相等对方让路时，网络是卡死还是能自己解开。',
        'Routing says where a packet goes; flow control says when it may go. It decides how much of a link a packet occupies and for how long — and whether four packets waiting on each other freeze the network or work themselves free.'
      )}
    />

    <div class="prose">
      <h3><span class="h-no">5.1</span>{t('消息、包、flit、phit', 'Messages, packets, flits, phits')}</h3>
      {#if en}
        <p>
          A <b>message</b> is what the protocol wants to send; a <b>packet</b> is the unit the network routes; a
          <b>flit</b> is the unit a link transfers in one cycle; a <b>phit</b> is the unit a single wire group carries.
          Splitting a message into flits is what lets a packet be pipelined across routers instead of being received
          whole at every hop.
        </p>
      {:else}
        <p>
          <b>消息</b>是协议想发的东西；<b>包</b>是网络路由的单位；<b>flit</b> 是一条链路在一个周期能传的单位；
          <b>phit</b> 是一组线上能传的单位。把消息切成 flit，正是让一个包能在路由器之间流水起来、
          而不必每一跳都整包收下来的关键。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">5.2</span>{t('整包流控与 wormhole', 'Whole-packet flow control, and wormhole')}</h3>
      {#if en}
        <p>
          <b>Store-and-forward</b> receives the entire packet before forwarding any of it: latency grows with the
          packet length at every hop, and every router needs a full packet of buffer.
          <b>Virtual cut-through</b> forwards as soon as the next router can take the whole packet, so the packet
          streams once it fits. <b>Wormhole</b> forwards flit by flit and only needs one flit of buffer per router — the
          packet becomes a worm of flits stretching across several routers.
        </p>
        <p>
          Wormhole is what most on-chip networks use, and the reason is area: buffers dominate router area, and one
          flit beats a full packet. The price is that a blocked head blocks the body behind it across every router it
          already occupies.
        </p>
      {:else}
        <p>
          <b>Store-and-forward</b> 必须收完整包才转发一个 flit：延迟在每一跳都随包长增长，且每个路由器都要存一整包。
          <b>Virtual cut-through</b> 只要下一个路由器能把整包收下就转发，于是包一旦安顿下来就开始流水。
          <b>Wormhole</b> 逐 flit 转发，每个路由器只要一个 flit 的缓冲——一个包变成一条横跨好几个路由器的“虫”。
        </p>
        <p>
          片上网络大多用 wormhole，原因是面积：缓冲占路由器面积的大头，一个 flit 远小于一整包。
          代价是头被堵住时，它身后已经占住的那一串 flit 也一起堵，而且堵在每一个它已经经过的路由器上。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">5.3</span>{t('电路交换：先建路，再发数据', 'Circuit switching: build the path first')}</h3>
      {#if en}
        <p>
          A third family reserves the route before sending anything: a header walks to the destination, the path is
          latched, then data streams through with no per-hop buffering at all. Setup and teardown cost hops, so single
          messages pay more latency — what you buy is a guaranteed rate and zero flit buffers.
        </p>
        <p>
          That trade is measurable. For a 4-hop path the circuit pays 4 cycles of setup plus 4 of teardown; wormhole
          pays nothing upfront but needs flit buffers at every router. On a multi-core DSP array (AsAP in Chapter 8)
          the buffers were the scarce resource, so the circuit won.
        </p>
      {:else}
        <p>
          第三类是发送之前先建路：一个头包走到目的地，沿途把路径锁住，然后数据在没有任何逐跳缓冲的情况下流过去。
          建路与拆路各要若干跳，所以单条消息的延迟更高——换来的是一条保证速率、且 flit 缓冲为零的通道。
        </p>
        <p>
          这笔交易可以算。4 跳的路径，电路交换先付 4 拍建路、再付 4 拍拆路；wormhole 不用预付，
          但每个路由器都要 flit 缓冲。在 DSP 阵列（第 8 章的 AsAP）上，缓冲才是稀缺资源，于是电路交换赢了。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 5.1', 'Figure 5.1')}
      caption={t(
        '4 跳路径上，电路交换与 wormhole 的总周期与缓冲占用。缓冲数按 2 条 VC 计；电路的代价是固定的建路/拆路。',
        'Circuit versus wormhole on a 4-hop path: total cycles and buffer footprint, counted with two VCs. The circuit pays a fixed setup and teardown.'
      )}
    >
      <table class="table">
        <thead>
          <tr>
            <th>{t('包长（flit）', 'Packet (flits)')}</th>
            <th>{t('电路总周期', 'Circuit cycles')}</th>
            <th>{t('wormhole 总周期', 'Wormhole cycles')}</th>
            <th>{t('电路缓冲', 'Circuit buffers')}</th>
            <th>{t('wormhole 缓冲', 'Wormhole buffers')}</th>
            <th>{t('VCT 缓冲', 'VCT buffers')}</th>
          </tr>
        </thead>
        <tbody>
          {#each circuitRows as row}
            <tr>
              <td class="num">{row.flits}</td>
              <td class="num">{row.circuit}</td>
              <td class="num">{row.wh}</td>
              <td class="num">{row.bufCircuit}</td>
              <td class="num">{row.bufWh}</td>
              <td class="num">{row.bufVct}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">5.4</span>{t('真的把它卡死', 'Watch it actually deadlock')}</h3>
      {#if en}
        <p>
          The simulator below is a four-router ring, one packet per router, each needing to travel clockwise. Step it:
          every router fills the next buffer in the same cycle, and at depths that are too small the whole ring has no
          free slot anywhere. That is deadlock, not congestion — more buffer pushes the moment later but does not
          remove it while the cyclic dependency stands.
        </p>
        <p>
          Then switch to a dateline with a second virtual channel. Packets that cross the break are forced onto VC1,
          so a VC1 packet never waits on VC0; the cycle cannot close and the ring drains.
        </p>
      {:else}
        <p>
          下面的模拟器是四个路由器的环，每个路由器一个包，都顺时针走。单步推进：所有路由器在同一个周期填满下一级缓冲，
          当缓冲不够深时，整环找不到一个空位。这叫死锁，不叫拥塞——加缓冲只是把这一刻推迟，
          只要环形依赖还在，它就不会消失。
        </p>
        <p>
          然后切到 dateline + 第二条虚拟信道。越过断点的包被强制放进 VC1，于是 VC1 的包永远不会去等 VC0，
          环闭不上，环形网络就能排空。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 5.2', 'Figure 5.2')}
      caption={t(
        '单步或跑到底。单 VC 下很快出现“死锁 @ 周期 N”；打开 dateline 后同样的负载持续流动。三种流控的周期数在表里由公式算出。',
        'Step or run. One VC produces “deadlock @ cycle N” almost immediately; turn on the dateline and the same load keeps moving. The cycle counts for the three flow-control schemes are computed in the table.'
      )}
    >
      <FlowLab />
    </Figure>

    <div class="prose">
      <h3><span class="h-no">5.5</span>{t('虚拟信道：把一条线切成几条', 'Virtual channels: one wire, several lanes')}</h3>
      {#if en}
        <p>
          A virtual channel is a separate buffer on the same physical link, multiplexed by cycle. Two things come out
          of it. First, head-of-line blocking disappears: a packet stuck at a busy output no longer stops a packet
          behind it that wants a different output. Second, deadlock can be broken by segregating traffic into classes
          that never depend on each other.
        </p>
        <p>
          Both benefits are real, and both cost the same thing: more buffers, more arbitration, and a wider allocator.
        </p>
      {:else}
        <p>
          虚拟信道是同一条物理链路上的另一组缓冲，按周期复用。它带来两个好处。
          第一，队头阻塞消失：一个包卡在忙的输出上，不再挡住它身后想去别的输出的包。
          第二，可以通过把流量分到彼此不依赖的类别里，来打破死锁。
        </p>
        <p>
          两个好处都是真的，代价也一样：更多缓冲、更多仲裁、更宽的分配器。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 5.3', 'Figure 5.3')}
      caption={t(
        '左边是队头阻塞：A 要去北，B 要去东，但只有一个缓冲，B 只能等。右边两条 VC：B 从另一条通道直接过去。',
        'Left: head-of-line blocking — A wants north, B wants east, one buffer, so B waits. Right: two VCs, and B leaves through the other lane.'
      )}
    >
      <div class="hol">
        <div class="hol-box">
          <span class="hol-title">{t('单 VC · 队头阻塞', 'One VC · head-of-line blocking')}</span>
          <svg viewBox="0 0 220 110" fill="none" aria-hidden="true">
            <rect x="14" y="38" width="60" height="34" rx="7" class="rtr" />
            <text x="44" y="59" class="lbl" text-anchor="middle">R</text>
            <rect x="86" y="30" width="42" height="12" rx="3" class="fl a" />
            <text x="107" y="39" class="ft" text-anchor="middle">A</text>
            <rect x="86" y="46" width="42" height="12" rx="3" class="fl b" />
            <text x="107" y="55" class="ft" text-anchor="middle">B</text>
            <rect x="86" y="62" width="42" height="12" rx="3" class="fl empty" />
            <path d="M150 36H196" class="edge" />
            <text x="173" y="30" class="cap" text-anchor="middle">N</text>
            <path d="M150 52H196" class="edge blocked" />
            <text x="173" y="66" class="cap bad" text-anchor="middle">{t('E · 被挡住', 'E · blocked')}</text>
          </svg>
        </div>
        <div class="hol-box">
          <span class="hol-title">{t('两条 VC · 分开排队', 'Two VCs · separate lanes')}</span>
          <svg viewBox="0 0 220 110" fill="none" aria-hidden="true">
            <rect x="14" y="38" width="60" height="34" rx="7" class="rtr" />
            <text x="44" y="59" class="lbl" text-anchor="middle">R</text>
            <rect x="86" y="28" width="42" height="12" rx="3" class="fl a" />
            <text x="107" y="37" class="ft" text-anchor="middle">A · VC0</text>
            <rect x="86" y="52" width="42" height="12" rx="3" class="fl b" />
            <text x="107" y="61" class="ft" text-anchor="middle">B · VC1</text>
            <path d="M150 34H196" class="edge" />
            <text x="173" y="28" class="cap" text-anchor="middle">N</text>
            <path d="M150 58H196" class="edge ok" />
            <text x="173" y="72" class="cap good" text-anchor="middle">{t('E · 通过', 'E · goes')}</text>
          </svg>
        </div>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">5.6</span>{t('三种打破环的办法', 'Three ways to break the cycle')}</h3>
      {#if en}
        <p>
          The book gives three schemes, and they are three forms of one idea: make sure a cycle of buffers can never be
          fully occupied. A <b>dateline</b> cuts the ring into a chain and drops the two sides into different VCs, so
          the last channel can never wait on the first. An <b>escape VC</b> keeps one lane routed by a provably
          deadlock-free function (usually dimension order) reachable from every channel: a packet that is stuck can
          always be re-allocated onto it. <b>Bubble flow control</b> does not use a second lane at all — it constrains
          only injection, so that one packet-sized hole (a bubble) always survives in the ring.
        </p>
      {:else}
        <p>
          教材给了三种方案，它们其实是同一个想法的三种形式：保证一整套环形缓冲不可能被全部占满。
          <b>dateline</b> 把环切成一条链，两侧落进不同 VC，于是最后一条信道永远不会去等第一条。
          <b>逃逸 VC</b> 留一条按可证无死锁函数（通常是维序）走的通道，并且从任意信道都能进得去——
          卡住的包总有机会被重新分配上去。<b>气泡流控</b> 完全不用第二条通道，它只约束“注入”，
          让环里永远留下一个包大小的空洞。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 5.4', 'Figure 5.4')}
      caption={t(
        '气泡流控：包级 VCT，注入时要求目标缓冲还留两个空包位。单 VC 普通注入在 2 包/缓冲时立刻死锁；同一负载下打开气泡规则，环里始终留一个空位，流量持续。',
        'Bubble flow control: packet-level VCT, and injection requires two free packet slots. Plain injection deadlocks immediately at two slots per buffer; the same load under the bubble rule always keeps one hole free.'
      )}
    >
      <BubbleLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          The three schemes cost differently. A dateline wastes VC utilisation (traffic that never crosses the cut still
          sits on VC0). An escape VC needs a second buffer set and a fair allocator, but leaves every other VC free to
          be fully adaptive. A bubble needs no extra buffers at all, only an injection gate — which is why it shows up
          in rings and tori built from cheap routers.
        </p>
      {:else}
        <p>
          三种方案的代价不同。dateline 浪费 VC 利用率（不跨断点的流量仍挤在 VC0）；逃逸 VC 需要第二套缓冲和一个公平的分配器，
          但换来其余 VC 可以完全自适应；气泡完全不需要额外缓冲，只要一个注入闸门——
          这也是它出现在“用便宜路由器搭 ring / torus”的设计里的原因。
        </p>
      {/if}
      <div class="note">
        <b>{t('注意“无限缓冲”的误区：', 'The infinite-buffer myth: ')}</b>
        {t(
          '缓冲能推迟死锁，不能消除它。只要环形依赖还在，任意有限缓冲都存在一组负载让它卡住；真正的解法一定作用在依赖关系或注入规则上。',
          'buffers postpone deadlock, they do not remove it. With a cyclic dependency, any finite buffering has a load that jams it; the real fix acts on the dependency or on injection.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">5.7</span>{t('反压：credit 与缓冲深度', 'Backpressure: credits set the depth')}</h3>
      {#if en}
        <p>
          The other half of flow control is backpressure: how upstream learns that downstream has no room. On-chip
          networks usually use credits — each consumed flit returns one credit, and upstream may only send what it has
          credit for. The count is not a comfort knob; it is set by the round trip of the credit. If a link is eight
          cycles away and the buffer holds fewer than eight flits, the link idles for part of every round trip.
        </p>
      {:else}
        <p>
          流控的另一半是反压：下游没空间时，上游怎么知道。片上网络通常用 credit——下游每消费一个 flit 回送一个额度，
          上游只有拿到额度才敢发。额度不是舒适度旋钮，它由 credit 的往返决定：
          链路八拍之外、缓冲却装不下八个 flit 时，链路在每次往返里都会空转一段。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 5.5', 'Figure 5.5')}
      caption={t(
        '往返 8 拍时，缓冲深度与可持续速率的对应。深度到 8 才吃满一条链路——这就是“缓冲按 BDP 配”的量化版本。',
        'With an eight-cycle round trip, sustained rate against buffer depth. Depth eight is where the link finally saturates — the quantitative version of “size the buffer to the bandwidth-delay product”.'
      )}
    >
      <div class="credits">
        {#each creditRows as row}
          <div class="credit-row">
            <span class="cr-k mono">{t(`深度 ${row.depth}`, `depth ${row.depth}`)}</span>
            <span class="cr-bar"><i style={`width:${row.rate * 100}%`}></i></span>
            <span class="cr-v mono">{(row.rate * 100).toFixed(0)}%</span>
          </div>
        {/each}
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">5.8</span>{t('应用特定网络：把时间也当成资源', 'Application-specific networks: schedule the time')}</h3>
      <p>
        {t(
          '通用 NoC 用缓冲来协调竞争，代价是面积和不确定性。应用特定网络换个思路：既然通信图在编译期就知道，干脆把时间切成时隙，给每条流预定好（时隙 × 链路）。TDMA 风格的调度把仲裁、缓冲、甚至路由都省掉了，代价是没有突发余量——一个没按时刻表发车的核，会把整张表往后推。',
          'A general NoC coordinates contention with buffers, at the cost of area and unpredictability. Application-specific networks take another route: if the communication graph is known at compile time, cut time into slots and reserve (slot × link) for each flow. TDMA-style schedules remove arbitration, buffering and even routing — and give up all burst tolerance: one core that misses its slot pushes the whole table back.'
        )}
      </p>
      <p>
        {t(
          '第 8 章的 AsAP 就是电路交换 + 静态映射，Eyeriss 把多播按配置 ID 固化。它们的共同点不是拓扑，而是“把不确定性换成了面积或灵活性”。',
          'AsAP in Chapter 8 is circuit switching with a static mapping; Eyeriss bakes multicast into configured IDs. What they share is not a topology but a trade: uncertainty exchanged for area or flexibility.'
        )}
      </p>
    </div>

    <div class="prose">
      <div class="pull">
        {t(
          'wormhole 把缓冲省到极致，代价是把整条包借给了链路；VC 把这条包拆开，代价是缓冲又回来了。',
          'Wormhole saves buffers to the extreme and lends the whole packet to the link; virtual channels take the packet apart again, and the buffers come back.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">5.9</span>{t('自测', 'Check yourself')}</h3>
      <Quiz
        questions={[
          {
            q: t('wormhole 相比 store-and-forward 省了什么？', 'What does wormhole save over store-and-forward?'),
            options: [
              t('每跳的缓冲，从整包降到 1 个 flit', 'Per-hop buffers, from a whole packet down to one flit'),
              t('路由计算', 'Route computation'),
              t('链路带宽', 'Link bandwidth')
            ],
            answer: 0,
            why: t('吞吐相同（都是逐 flit 占用链路），差别在缓冲： wormhole 每路由器只要一个 flit，代价是阻塞会沿整条虫传递。', 'Throughput is the same — both occupy the link flit by flit. The difference is buffering: one flit per router, at the price of blocking that travels along the worm.')
          },
          {
            q: t('加缓冲能解决死锁吗？', 'Do more buffers solve deadlock?'),
            options: [
              t('能，只要够大', 'Yes, if they are large enough'),
              t('不能，只能推迟；要改依赖关系', 'No — only postpone it; the dependency must change'),
              t('只对 mesh 有效', 'Only on a mesh')
            ],
            answer: 1,
            why: t('环形依赖存在时，任意有限缓冲都能被填满；dateline / 逃逸 VC / 气泡都是在改依赖图。', 'With a cyclic dependency any finite buffer can be filled; datelines, escape VCs and bubbles change the graph itself.')
          },
          {
            q: t('气泡流控约束的是哪一步？', 'What exactly does bubble flow control constrain?'),
            options: [
              t('转发：每次只允许搬一个 flit', 'Forwarding: only one flit may move at a time'),
              t('注入：目标缓冲必须还能放下两个包', 'Injection: the target buffer must have room for two more packets'),
              t('路由：必须走维序', 'Routing: it must be dimension ordered')
            ],
            answer: 1,
            why: t('环内转发照常按 VCT 走；只有注入与换维度受约束，而这恰好保证环里始终留一个包大小的空位。', 'Forwarding inside the ring stays plain VCT; only injection and dimension changes are gated, which is exactly what keeps one packet-sized hole alive.')
          },
          {
            q: t('为什么说“加缓冲解决死锁”是错的？', 'Why is “add buffers to fix deadlock” wrong?'),
            options: [
              t('因为缓冲只会推迟，环形依赖还在', 'Buffers only postpone it while the cyclic dependency remains'),
              t('因为缓冲太贵', 'Because buffers are expensive'),
              t('因为缓冲会降低频率', 'Because buffers lower the clock')
            ],
            answer: 0,
            why: t('在本页的包里，2 包/缓冲就死锁，加到 3 只是让这批固定负载过关；流量一涨，同样的环会重新闭合。', 'In this lab two slots per buffer deadlock, and three only clears this fixed load; raise the load and the same cycle closes again.')
          },
          {
            q: t('电路交换在什么情况下赢？', 'When does circuit switching win?'),
            options: [
              t('单条短消息、低延迟要求', 'Short single messages with tight latency'),
              t('缓冲区与仲裁是稀缺资源、流量可预测时', 'When buffers and arbitration are scarce and traffic is predictable'),
              t('任何情况，因为它没有缓冲', 'Always, because it has no buffers')
            ],
            answer: 1,
            why: t('建路要付跳数，单条消息总是更慢；它换的是零 flit 缓冲与保证速率，适合静态映射的阵列。', 'Setup costs hops, so a single message is always slower; what it buys is zero flit buffers and a guaranteed rate, which suits statically mapped arrays.')
          }
        ]}
      />
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => open('ch6')}>
          <span class="next-no display">06</span>
          <strong>{t('路由器微架构', 'Router microarchitecture')}</strong>
          <span>{t('一个路由器每拍做什么：缓冲、分配、仲裁、交叉开关。', 'What one router does per cycle: buffers, allocation, arbitration, crossbar.')}</span>
        </button>
        <button class="next-card" onclick={() => open('ch4')}>
          <span class="next-no display">04</span>
          <strong>{t('回到路由', 'Back to routing')}</strong>
          <span>{t('路由决定了环能不能形成，流控决定了环什么时候真的卡住。', 'Routing decides whether a cycle can form; flow control decides when it actually jams.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .hol {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .credits {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .credit-row {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr) 44px;
    align-items: center;
    gap: 10px;
    font-size: 11px;
  }

  .cr-k {
    color: var(--muted);
  }

  .cr-bar {
    display: block;
    height: 8px;
    border-radius: 4px;
    background: var(--paper-3);
    overflow: hidden;
  }

  .cr-bar i {
    display: block;
    height: 100%;
    background: var(--accent);
  }

  .cr-v {
    text-align: right;
    color: var(--accent-deep);
  }

  .hol-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .hol-title {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .hol-box svg {
    width: 100%;
    height: auto;
  }

  .rtr {
    fill: var(--card-2);
    stroke: var(--line);
  }

  .fl {
    fill: var(--accent-soft);
    stroke: #cfded9;
  }

  .fl.b {
    fill: var(--ember-soft);
    stroke: #eed8ce;
  }

  .fl.empty {
    fill: var(--paper-2);
    stroke: var(--line);
    stroke-dasharray: 3 3;
  }

  .ft {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7px;
    fill: var(--accent-deep);
  }

  .lbl {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    fill: var(--muted);
  }

  .edge {
    stroke: var(--line);
    stroke-width: 1;
  }

  .edge.blocked {
    stroke: var(--ember);
    stroke-dasharray: 4 3;
  }

  .edge.ok {
    stroke: var(--accent);
  }

  .cap {
    font-family: 'Inter', sans-serif;
    font-size: 7px;
    fill: var(--muted);
  }

  .cap.bad {
    fill: var(--ember);
  }

  .cap.good {
    fill: var(--accent);
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
    .hol,
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
