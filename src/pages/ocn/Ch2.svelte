<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import ProtoLab from '../../components/noc/ProtoLab.svelte';
  import ProtocolDeadlockLab from '../../components/noc/ProtocolDeadlockLab.svelte';
  import HierarchyLab from '../../components/noc/HierarchyLab.svelte';
  import { lang, t } from '../../lib/lang.svelte';
  import { navigate } from '../../lib/router.svelte';

  const en = $derived(lang.value === 'en');
  const open = (slug: string) => navigate(`/book/on-chip-networks/${slug}`);
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={2}
      title="与系统架构的接口"
      en="Interface with System Architecture"
      lede={t(
        '网络不产生流量，它只搬运别人产生的流量。所以设计 NoC 之前要先知道：cache 一致性协议、消息传递库、以及总线标准，各自会在网络上放下哪几种包、多少字节。',
        'A network does not create traffic; it carries what other layers create. So before designing one you need to know what coherence, message passing and bus standards each put on the wire — and in what sizes.'
      )}
    />

    <div class="prose">
      <h3><span class="h-no">2.1</span>{t('一致性协议是流量的第一来源', 'Coherence is the first source of traffic')}</h3>
      {#if en}
        <p>
          In a shared-memory multiprocessor, every cache miss becomes a network transaction: a request to the home node,
          sometimes a forward to the current owner, then data and acknowledgements. The protocol determines how many of
          each — and therefore what the network must be good at.
        </p>
        <p>
          The differences are not cosmetic. MSI invalidates on every write miss; MESI adds an Exclusive state so a
          private line can be written silently; MOESI lets a dirty owner supply data without a memory round trip. Each
          change removes messages from the network, which is why protocols and NoCs are designed together.
        </p>
      {:else}
        <p>
          在共享内存多处理器里，每一次 cache Miss 都会变成一次网络事务：请求送到 home 节点，有时还要转发给当前持有者，
          然后是数据与确认。协议决定了每种消息有几个——也就决定了网络必须擅长什么。
        </p>
        <p>
          这些差别不是装饰。MSI 在每次写 Miss 时都要失效；MESI 加了 Exclusive 状态，让私有行可以静默写入；
          MOESI 允许脏持有者直接供数据，省掉一次内存往返。每一处改动都会从网络上拿掉一些消息，
          这也是为什么协议和 NoC 要一起设计。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 2.1', 'Figure 2.1')}
      caption={t(
        '一笔读 Miss 在网络上的样子。切协议、拖动持有者数量，消息条数与 flit 总量都由协议规则算出，不是表格里抄的。',
        'One read miss on the wire. Switch protocols and drag the sharer count: message counts and flit totals are derived from the protocol rules, not looked up.'
      )}
    >
      <ProtoLab />
    </Figure>

    <div class="prose">
      <h3><span class="h-no">2.1.1</span>{t('协议级死锁：请求在等回复，回复在等缓冲', 'Protocol-level deadlock: requests wait for replies, replies wait for buffers')}</h3>
      {#if en}
        <p>
          Routing rules make a single network deadlock-free, but a coherence protocol can still close a cycle across
          <em>message classes</em>. The shape is always the same: a reply (data or ack) needs a free input buffer; that
          buffer is holding a request; the request is waiting for the very reply that cannot get in. Add the protocol’s
          own dependencies — a read request is not finished until its data returns, a write until its acks return — and
          you have a cycle that no amount of routing care can remove.
        </p>
        <p>
          The fix is structural, not buffering: put requests and replies on different virtual networks so the
          reply-to-request edge disappears. Chapter 7 turns this into the general rule that message classes get their
          own virtual networks.
        </p>
      {:else}
        <p>
          路由规则可以让一张网无死锁，但一致性协议仍然能在<em>消息类别</em>之间绕出一个环。形状总是同一个：
          回复（data / ack）需要一块空闲的输入缓冲，而那块缓冲里躺着一个请求，这个请求又恰恰在等这条进不来的回复。
          再加上协议自身的依赖——读请求要等数据回来、写请求要等确认回来——就构成一个路由再怎么小心也消不掉的环。
        </p>
        <p>
          解法是结构性的，不是加缓冲：把请求与回复放进不同的虚拟网络，让“回复 → 请求”这条边直接消失。
          第 7 章会把它一般化：每一类消息各给一条虚拟网络。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 2.2', 'Figure 2.2')}
      caption={t(
        '切换 VN 划分方式，看类别依赖图什么时候出现环。青色是协议依赖（请求等回复），虚线赭色是缓冲依赖（回复等缓冲空位）；两者同时存在就成环。',
        'Switch the VN layout and watch the class graph. Teal edges are protocol dependencies (request waits for reply); dashed ochre edges are buffer dependencies (reply waits for space). When both exist, the cycle closes.'
      )}
    >
      <ProtocolDeadlockLab />
    </Figure>

    <div class="prose">
      <h3><span class="h-no">2.1.2</span>{t('cache 层级：私有还是共享，决定了谁上网', 'Cache hierarchy: private or shared decides who enters the network')}</h3>
      {#if en}
        <p>
          The hierarchy is a traffic filter before it is anything else. With a private L2, an L1 miss is absorbed locally:
          only a miss that the private L2 also misses reaches the network, and that one costs two traversals — request
          out, data back. The router sees a single client (the L2), so its injection port is never shared.
        </p>
        <p>
          A shared L2 uses storage better and puts less pressure on off-chip bandwidth, but every L1 miss has to cross the
          network to reach the bank that owns the address, and both the L1 and the L2 share the router’s injection and
          ejection ports. The lab prices both with the same model: what changes is who filters the traffic and how many
          clients one port serves.
        </p>
      {:else}
        <p>
          层级首先是一道流量过滤器。用私有 L2 时，L1 Miss 先在本地被吸收：只有“私有 L2 也没命中”的请求才会上网，
          而它要花两趟穿越——请求出去、数据回来。路由器只面对 L2 一个客户端，注入端口不需要共享。
        </p>
        <p>
          共享 L2 更省存储、也减轻片外带宽压力，但每一次 L1 Miss 都要过网去访问持有该地址的 bank，
          而且 L1 与 L2 共享路由器的注入/弹出端口。下面用同一个模型给两者算账：变的只是“谁来过滤流量”和“一个端口服务几个客户端”。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 2.3', 'Figure 2.3')}
      caption={t(
        '私有 vs 共享 L2 的流量账（每千次 L1 访问、每笔请求 1 flit、数据 4 flit）。拖动命中率看两者何时互换优劣：命中率差得越大，共享 L2 省下的片外访问越多，但上网的穿越次数始终是每次 Miss 两趟。',
        'The traffic bill for private versus shared L2, per 1000 L1 accesses with one request flit and four data flits. Drag the hit rates to see them trade places: the bigger the hit-rate gap, the more off-chip traffic the shared cache saves — but it always sends two traversals per miss.'
      )}
    >
      <HierarchyLab />
    </Figure>

    <div class="prose">
      <h3><span class="h-no">2.2</span>{t('home 节点与 MSHR', 'The home node and its MSHRs')}</h3>
      {#if en}
        <p>
          Every line has a home — a slice of memory, or a directory entry — that serialises conflicting requests and
          tracks who holds the line. The home node is also a network endpoint with its own queueing: it sees the
          <em>sum</em> of all the misses in its address range, which makes it the most likely place on the chip to
          become a hotspot.
        </p>
        <p>
          MSHRs (miss status holding registers) are how a home node keeps many outstanding misses without stalling:
          one entry per pending line, mergeable requests for the same line, and a finite count that turns into
          backpressure when full. From the network’s point of view, the MSHR count is a traffic-shaping knob.
        </p>
      {:else}
        <p>
          每一行都有一个 home——内存的一个切片，或一个目录项——它负责串行化冲突请求，并记录谁持有这一行。
          home 节点同时也是一个网络端点，有自己的排队：它看到的是自己地址范围内所有 Miss 的<em>总和</em>，
          所以它最容易成为全片的热点。
        </p>
        <p>
          MSHR（miss status holding register，未完成 Miss 记录）让 home 节点能在不阻塞的情况下挂起很多 Miss：每一行一个表项，同一行的请求可以合并，
          表项满了就变成反压。从网络的角度看，MSHR 数量是一个调节流量的旋钮。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">2.3</span>{t('消息传递：另一种流量形状', 'Message passing: a different traffic shape')}</h3>
      {#if en}
        <p>
          Not every on-chip system is cache-coherent. Many-core accelerators and tile-based designs pass explicit
          messages instead: point-to-point, often bursty, sometimes with ordering requirements between a small set of
          peers. That shape favours a different network — lower hop count, simpler flow control, sometimes a dedicated
          physical channel per neighbour.
        </p>
        <p>
          The 2nd edition added message passing to the fundamentals for exactly this reason: a large share of
          production NoCs (Chapter 8) are not carrying coherence at all.
        </p>
      {:else}
        <p>
          不是每个片上系统都是 cache 一致的。众核加速器和 tile 化设计往往显式传消息：点对点、常常突发、
          有时对一小组对端之间有顺序要求。这种形状偏好另一种网络——更低的跳数、更简单的流控，
          有时干脆给每个邻居一条专用物理通道。
        </p>
        <p>
          第二版把消息传递加进基础章节，正是因为这个原因：很大一部分量产的 NoC（第 8 章）根本不跑一致性。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">2.4</span>{t('接口标准与解耦', 'Interface standards, and why they decouple')}</h3>
      {#if en}
        <p>
          Between the protocol and the network sits an interface: OCP, AXI, and today CHI or AMBA 5 compliant
          transports. The point of the standard is that the NoC vendor and the IP vendor do not have to agree on
          anything else — packets are defined by the socket, and the network is free to implement them however it likes.
        </p>
        <p>
          That freedom is where the interesting engineering lives: a CHI request, a coherence message and a DMA burst
          all ride the same wires, but they want different virtual networks so that a bulk copy cannot block a snoop.
        </p>
      {:else}
        <p>
          协议和网络之间隔着一个接口：OCP、AXI，如今是 CHI 或 AMBA 5 兼容的传输层。标准的意义在于：
          NoC 厂商和 IP 厂商不必再就其他任何事情达成一致——包由插槽定义，网络可以自由实现。
        </p>
        <p>
          这份自由正是有意思的工程所在：一个 CHI 请求、一条一致性消息、一段 DMA 突发，都跑在同一组线上，
          但它们需要不同的虚拟网络，否则一次大块拷贝就可能挡住一次 snoop。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 2.4', 'Figure 2.4')}
      caption={t(
        '从协议到网络：上层决定消息，接口固定格式，网络只负责按时送到。虚拟网络把不同类别的消息分开排队。',
        'From protocol to network: the upper layer decides the messages, the interface fixes the format, the network only has to deliver them. Virtual networks keep the classes in separate queues.'
      )}
    >
      <div class="stack">
        <div class="s-row">
          <span class="s-k">{t('协议层', 'Protocol')}</span>
          <span class="s-v">{t('一致性 / 消息传递 / DMA：决定有哪几种消息', 'coherence / message passing / DMA: which messages exist')}</span>
        </div>
        <div class="s-row">
          <span class="s-k">{t('接口', 'Interface')}</span>
          <span class="s-v mono">CHI · AXI · OCP</span>
        </div>
        <div class="s-row">
          <span class="s-k">{t('网络', 'Network')}</span>
          <span class="s-v">{t('虚拟网络分队列 · 拓扑 · 路由 · 流控', 'virtual networks · topology · routing · flow control')}</span>
        </div>
        <div class="s-vns">
          <span class="vn req">{t('请求', 'Req')}</span>
          <span class="vn snp">{t('侦听', 'Snoop')}</span>
          <span class="vn dat">{t('数据', 'Data')}</span>
          <span class="vn dma">DMA</span>
        </div>
        <p class="s-note">
          {t(
            '同一个网络，四条独立的虚拟网络；否则大块数据会把一个 snoop 堵在缓冲里。',
            'One network, four independent virtual networks — otherwise a bulk transfer parks a snoop in a buffer.'
          )}
        </p>
      </div>
    </Figure>

    <div class="prose">
      <div class="pull">
        {t(
          'NoC 的性能上限不是由 flit 决定的，而是由“协议愿意并发多少笔”决定的。',
          'A NoC’s ceiling is not set by flits but by how many transactions the protocol is willing to keep in flight.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">2.5</span>{t('自测', 'Check yourself')}</h3>
      <Quiz
        questions={[
          {
            q: t('MESI 相比 MSI，少掉的是哪类流量？', 'Compared with MSI, what traffic does MESI remove?'),
            options: [
              t('读 Miss 的数据返回', 'Data returns on read misses'),
              t('独占状态下的静默升级与部分失效', 'Silent upgrades and some invalidations in the Exclusive state'),
              t('写回', 'Writebacks')
            ],
            answer: 1,
            why: t('E 状态说明“只有我持有且干净”，写它不需要上网络；MSI 则每次都要发请求与失效。', 'Exclusive means “only I hold it, and it is clean”, so writing it needs no network at all; MSI must request and invalidate every time.')
          },
          {
            q: t('为什么 home 节点最容易成为热点？', 'Why is the home node the most likely hotspot?'),
            options: [
              t('因为它时钟最快', 'Because its clock is fastest'),
              t('因为它是一个地址区间的所有 Miss 的汇合点', 'Because every miss in its address range converges on it'),
              t('因为它的缓冲最小', 'Because its buffers are smallest')
            ],
            answer: 1,
            why: t('地址交织决定了流量分布；home 的带宽必须覆盖它那一片地址的全部 Miss。', 'Address interleaving sets the distribution; a home’s bandwidth must absorb every miss for its slice.')
          },
          {
            q: t('为什么不同类别的消息要分虚拟网络？', 'Why do message classes need separate virtual networks?'),
            options: [
              t('为了安全', 'For security'),
              t('为了避免大块数据把侦听消息堵在缓冲里', 'So a bulk transfer cannot block a snoop in a buffer'),
              t('为了减少包头', 'To shrink headers')
            ],
            answer: 1,
            why: t('虚拟网络是物理资源的分区，正好用来隔离类别；代价是每类都要自己的缓冲与仲裁。', 'A virtual network is a partition of physical resources, which isolates classes; each one pays for its own buffers and arbitration.')
          }
        ]}
      />
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => open('ch3')}>
          <span class="next-no display">03</span>
          <strong>{t('拓扑', 'Topology')}</strong>
          <span>{t('消息有了，接下来决定它们走哪张图。', 'Now that the messages exist, decide which graph carries them.')}</span>
        </button>
        <button class="next-card" onclick={() => open('ch1')}>
          <span class="next-no display">01</span>
          <strong>{t('回到引言', 'Back to the introduction')}</strong>
          <span>{t('总线为什么先撑不住。', 'Why the bus gives out first.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .s-row {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 10px;
    padding: 9px 12px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 9px;
    font-size: 11.5px;
    color: var(--ink-3);
  }

  .s-k {
    font-size: 9.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .s-vns {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-top: 2px;
  }

  .vn {
    padding: 3px 9px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--paper-2);
    color: var(--muted);
  }

  .vn.req {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .vn.snp {
    color: var(--st-o);
    background: #f6eedf;
    border-color: #ecdfc6;
  }

  .vn.dat {
    color: #3f6b4f;
    background: #eaf1ea;
    border-color: #d9e7da;
  }

  .vn.dma {
    color: var(--ember);
    background: var(--ember-soft);
    border-color: #eed8ce;
  }

  .s-note {
    font-size: 10.5px;
    line-height: 1.6;
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
