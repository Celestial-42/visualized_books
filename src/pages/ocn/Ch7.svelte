<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import PerfLab from '../../components/noc/PerfLab.svelte';
  import { buildTopology, metrics } from '../../lib/noc/topology';
  import { profile } from '../../lib/noc/perf';
  import { lang, t } from '../../lib/lang.svelte';
  import { navigate } from '../../lib/router.svelte';

  const en = $derived(lang.value === 'en');
  const open = (slug: string) => navigate(`/book/on-chip-networks/${slug}`);

  const PER_HOP = 5;
  const FLITS = 4;

  const models = [
    { id: 'mesh', label: 'mesh 4×4', kind: 'mesh', w: 4, h: 4 },
    { id: 'torus', label: 'torus 4×4', kind: 'torus', w: 4, h: 4 },
    { id: 'ring', label: 'ring 16', kind: 'ring', w: 16, h: 1 },
    { id: 'crossbar', label: 'crossbar 16', kind: 'crossbar', w: 16, h: 1 }
  ].map((m) => {
    const g = buildTopology(m.kind as never, m.w, m.h);
    const met = metrics(g);
    const p = profile(m.kind as never, m.w, m.h, 'uniform', 'xy');
    return {
      ...m,
      hops: met.avgHops,
      zeroLoad: met.avgHops * PER_HOP + FLITS,
      bisection: met.bisection,
      saturation: p.saturation
    };
  });
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={7}
      title="建模与评估"
      en="Modeling and Evaluation"
      lede={t(
        '网络好不好，不能只看直径。延迟-吞吐曲线才是它的体检报告：零负载延迟告诉你平均跳数加流水线的代价，饱和点告诉你哪条链路先撑不住。这一章给的是怎么把两者都算出来。',
        'A network is not judged by its diameter. The latency-throughput curve is its medical report: zero-load latency is average hops plus pipeline depth, and the saturation point says which link gives up first. This chapter is about computing both.'
      )}
    />

    <div class="prose">
      <h3><span class="h-no">7.1</span>{t('三个指标，一条曲线', 'Three metrics, one curve')}</h3>
      {#if en}
        <p>
          <b>Latency</b> is the time from injection to ejection; it has a floor (zero-load) and grows as queues build.
          <b>Throughput</b> is accepted traffic per cycle. <b>Energy</b> per bit moves with distance and with how often a
          flit is buffered. Plot latency against offered load and you get the shape every NoC paper shows: flat, then
          a knee, then a vertical wall at saturation.
        </p>
        <p>
          The wall is not a property of the whole network. It is a property of <em>one</em> link: the one carrying the
          most traffic under this pattern. That is why the same topology saturates at very different rates under
          uniform, transpose and hotspot traffic.
        </p>
      {:else}
        <p>
          <b>延迟</b>是从注入到弹出的时间，它有一个地板（零负载延迟），并随排队增长。<b>吞吐</b>是每周期被接收的流量。
          <b>能耗</b>按 bit 计，随距离变化，也随一个 flit 被缓冲的次数变化。把延迟对注入率画出来，
          就是每篇 NoC 论文都有的形状：先平、再拐、到饱和点直接竖起来。
        </p>
        <p>
          那堵墙不是整个网络的属性，而是<em>某一条</em>链路的属性——这种流量模式下负载最重的那条。
          所以同一张拓扑在均匀、转置、热点三种流量下的饱和点相差很远。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 7.1', 'Figure 7.1')}
      caption={t(
        '换拓扑与流量模式，看链路热力图与曲线怎么变。饱和注入率 = 1 / 最忙链路的负载，全部由逐对路由累加得出；实线是本页模型，虚线是纯排队理想 1/(1−ρ)，点线是带宽无限时的理想互连。',
        'Change topology and pattern to watch the heat map and the curve move. Saturation is 1 / busiest-link load, accumulated by routing every pair; the solid line is this page’s model, the dashed one is the pure queue 1/(1−ρ), and the dotted one is an ideal fabric with infinite bandwidth.'
      )}
    >
      <PerfLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Read the numbers from the engine rather than from memory. On a 4×4 mesh under uniform traffic the busiest
          link carries 32 of the 240 flows, which normalises to 2.13 per injected packet and puts saturation at 0.469
          packets per node per cycle. Nearest-neighbour traffic only lifts that to 0.500, because short hops still
          funnel through the middle; transpose makes two crossing bands hotter at 0.333; a hotspot collapses the ring
          to 0.083. The topology never changed — only the traffic did.
        </p>
      {:else}
        <p>
          这些数字请从引擎里读，不要凭记忆。4×4 mesh 在均匀流量下，最忙的一条链路承载 240 条流中的 32 条，
          折算成每包注入是 2.13，于是饱和点在 0.469 包/节点/周期。换成邻居流量只抬到 0.500——
          每跳虽短，但流量仍然从中间过；转置让两条交叉带更热，掉到 0.333；热点则直接塌到 0.083。
          拓扑一点没变，变的只是流量。
        </p>
      {/if}
    </div>

    <div class="prose">
      {#if en}
        <p>
          The third line in the plot is the book’s <b>ideal interconnect</b>: infinite bandwidth, so its latency never
          rises no matter the load. It is not a design target — it is a ruler. The distance between the flat line and
          the real curve is exactly what the network topology, buffers and flow control are paying for; a good design
          keeps that gap small until it gets close to saturation.
        </p>
      {:else}
        <p>
          图里第三条线是书里的<b>理想互连</b>：带宽无限，所以无论负载多高延迟都不涨。它不是设计目标，而是一把尺子——
          平线与真实曲线之间的距离，就是拓扑、缓冲与流控正在付出的代价。好的设计会在接近饱和之前一直把这个差距压得很小。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">7.1.1</span>{t('零负载延迟与饱和点可以手算', 'Zero-load latency and saturation, by hand')}</h3>
      {#if en}
        <p>
          Both ends of the curve have closed forms. Zero-load latency is hops × cycles-per-hop plus one serialisation:
          with a five-cycle router and a four-flit packet, a 4×4 mesh pays 2.67 × 5 + 4 ≈ 17 cycles. Saturation is set by
          the busiest link, which the routing function decides — the table measures it on the graph.
        </p>
      {:else}
        <p>
          曲线的两端都有闭式解。零负载延迟 = 平均跳数 × 每跳拍数 + 一次序列化：五级流水、4 flit 的包，
          4×4 mesh 就是 2.67 × 5 + 4 ≈ 17 拍。饱和点由最忙的那条链路决定，而哪条链路最忙取决于路由函数——
          下表是在图上逐对路由量出来的。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 7.2', 'Figure 7.2')}
      caption={t(
        '四张拓扑的解析值与引擎实测值并排。零负载延迟只依赖平均跳数；饱和注入率只依赖最忙链路（一条链路每拍只送一个 flit、双向共享），所以两者由不同的量决定——“延迟低”和“吞吐高”经常不是同一个选择。torus 与 ring 按环绕最短路计。',
        'Analytical and measured values side by side. Zero-load latency depends only on average hops; saturation only on the busiest link (one flit per cycle per link, shared across both directions), so different quantities decide them — which is why “low latency” and “high throughput” are often different choices. Torus and ring are routed along wrap-around shortest paths.'
      )}
    >
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{t('拓扑', 'Topology')}</th>
              <th>{t('平均跳数', 'Avg hops')}</th>
              <th>{t('零负载延迟', 'Zero-load latency')}</th>
              <th>{t('对剖', 'Bisection')}</th>
              <th>{t('饱和注入率', 'Saturation')}</th>
            </tr>
          </thead>
          <tbody>
            {#each models as m}
              <tr>
                <td class="mono">{m.label}</td>
                <td class="num">{m.hops.toFixed(2)}</td>
                <td class="num">{m.zeroLoad.toFixed(1)} {t('拍', 'cyc')}</td>
                <td class="num">{m.bisection}</td>
                <td class="num">{m.saturation.toFixed(3)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          The queueing half is one more line: for a Poisson arrival and a fixed service time, the mean wait is
          ρ / (2(1−ρ)) service times. Multiply by the per-packet service time and add the zero-load latency and you have
          the curve in Figure 7.1 — flat, then a knee, then a wall. Nothing in that formula knows about topology; the
          topology enters only through the zero-load term and the ρ at which the busiest link saturates.
        </p>
      {:else}
        <p>
          排队那一半只多一行：泊松到达、固定服务时间时，平均等待是 ρ / (2(1−ρ)) 个服务时间。
          乘上每包的服务时间、再加上零负载延迟，就是图 7.1 那条曲线——先平、再拐、最后竖起来。
          公式本身完全不知道拓扑；拓扑只通过两个数进来：零负载项，以及“最忙链路在多高的 ρ 上饱和”。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">7.2</span>{t('从哪来的数：三种模型', 'Where the numbers come from: three models')}</h3>
      <div class="models">
        <div class="model">
          <span class="m-no display">01</span>
          <strong>{t('周期级仿真', 'Cycle-level simulation')}</strong>
          <p>{t(
            '每拍推进每个路由器与链路的状态，最准，也最慢。研究里的主力，配置错一个参数结论就会反过来。',
            'Advance every router and link each cycle: most accurate, slowest. The workhorse of research, and one wrong parameter reverses the conclusion.'
          )}</p>
          <span class="m-cost">{t('精度高 · 慢', 'accurate · slow')}</span>
        </div>
        <div class="model">
          <span class="m-no display">02</span>
          <strong>{t('解析模型', 'Analytical models')}</strong>
          <p>{t(
            '排队论 + 零负载延迟：几行公式给出曲线形状，适合设计空间探索与快速对比。',
            'Queueing plus zero-load latency: a few formulas give the curve’s shape, ideal for design-space exploration.'
          )}</p>
          <span class="m-cost">{t('快 · 假设多', 'fast · heavy assumptions')}</span>
        </div>
        <div class="model">
          <span class="m-no display">03</span>
          <strong>{t('RTL / FPGA', 'RTL and FPGA')}</strong>
          <p>{t(
            '把路由器真的做出来再跑流量。能抓住综合后的关键路径、功耗与面积——这些仿真器永远给不了。',
            'Build the router and run traffic through it. It captures post-synthesis critical paths, power and area — things a simulator never gives you.'
          )}</p>
          <span class="m-cost">{t('最真 · 最贵', 'truest · most expensive')}</span>
        </div>
      </div>
      {#if en}
        <p>
          An analytical model is usually two terms: a zero-load latency that the topology and router fix, plus a
          queueing term that the load fixes. Figure 7.1 draws both: the solid line is an M/D/1 queue on top of the
          measured zero-load latency, the dashed line is the pure 1/(1−ρ) ideal. Same shape, and the difference is the
          knee — a real network stiffens earlier because contention is spatial, not just statistical.
        </p>
      {:else}
        <p>
          解析模型通常是两项：拓扑与路由器决定的零负载延迟，加上由负载决定的排队项。图 7.1 把两者都画了出来：
          实线是在实测零负载延迟之上加 M/D/1 排队，虚线是纯 1/(1−ρ) 理想。形状一样，差别在膝盖——
          真实网络更早“硬”起来，因为竞争是空间性的，不只是统计性的。
        </p>
      {/if}
      <div class="note">
        <b>{t('先验后仿：', 'Model first, simulate second: ')}</b>
        {t(
          '平均跳数可以先用手算：k×k mesh 每个维度 E|d| = (k²−1)/3k，二维相加即可。图和公式对不上，先别跑仿真——那说明图建错了。',
          'average hops can be checked by hand: on a k×k mesh each dimension has E|d| = (k²−1)/3k, and two dimensions add. If the formula and the graph disagree, fix the graph before running a simulation.'
        )}
      </div>

      <h4>{t('功耗与面积模型', 'Power and area models')}</h4>
      <p>
        {t(
          '周期级仿真只给时间和 flit，不给焦耳和平方毫米。所以评估里还要一套解析的功耗/面积模型（Orion、DSENT 这一类）：把路由器拆成缓冲、交叉开关、链路三块，用每 bit 的能量系数乘上访问次数。片上短链路的能量在 0.1–0.5 pJ/bit 量级，并且大部分花在驱动线和重复器上；路由器内部一次 flit 的处理往往比走一毫米线还贵。',
          'A cycle-level simulator gives time and flits, not joules or square millimetres. So evaluation also needs an analytical power/area model (Orion, DSENT and friends): split the router into buffers, crossbar and links, and multiply per-bit energy by access counts. On-chip links land around 0.1–0.5 pJ/bit, mostly in drivers and repeaters — and one flit passing through a router often costs more than a millimetre of wire.'
        )}
      </p>
      <div class="note">
        <b>{t('为什么面积模型也要解析：', 'Why area is analytical too: ')}</b>
        {t(
          '缓冲是 SRAM（面积随深度线性、每 bit 便宜），交叉开关是逻辑（面积随端口数平方、每 bit 贵）。同一个总预算下，把面积从交叉开关挪到缓冲，通常能换来更高的吞吐——第 6 章那张 P² 表就是这件事的来源。',
          'buffers are SRAM (linear in depth, cheap per bit) while the crossbar is logic (area with the square of the port count, expensive per bit). Moving area from crossbar to buffers usually buys throughput — that is where the P² table in Chapter 6 comes from.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">7.3</span>{t('流量：合成还是真实', 'Traffic: synthetic or real')}</h3>
      <p>
        {t(
          '合成流量（均匀、位反转、转置、热点、邻居）的好处是可比：大家用同样的模式，曲线就能放在一张图里。坏处是它从不代表真实程序。真实流量的做法是从应用 trace 或硬件计数器里提取通信图，再映射到拓扑上——而“映射”本身就是一个 NP 难问题，通常用启发式。',
          'Synthetic patterns (uniform, bit-reversal, transpose, hotspot, nearest neighbour) are comparable: everyone uses the same ones, so curves can share an axis. The catch is that no real program looks like them. Application traffic comes from traces or hardware counters, turned into a communication graph and mapped onto the topology — and that mapping is NP-hard, so it is done heuristically.'
        )}
      </p>
      <div class="note">
        <b>{t('一个常被忽略的细节：', 'An often-missed detail: ')}</b>
        {t(
          '协议消息的大小并不一样。请求 1 flit、数据 4–5 flit、侦听 1 flit，混在一起时“平均包长”这个词就没什么意义了。评估时要按类别分开看。',
          'protocol messages are not the same size. Requests are one flit, data is four or five, snoops are one — once mixed, “average packet size” means very little. Evaluate per class.'
        )}
      </div>
      <h4>{t('虚拟网络与顺序', 'Virtual networks and ordering')}</h4>
      <p>
        {t(
          '一个协议通常需要“同一类消息保序、不同类之间不保序”。于是网络上开几条独立的虚拟网络：请求、侦听、响应、数据各走一条。两条好处同时到手——保序只需在同类内部维护（比如按源 ID 排序），而大块数据不会把一条侦听堵在缓冲里。代价是每类都要自己的缓冲与仲裁，这也是路由器面积的主要来源之一。',
          'A protocol usually wants ordering inside a class and no ordering across classes. So the network exposes several independent virtual networks — request, snoop, response, data. Two wins at once: ordering only has to be maintained within a class (say, by source ID), and a bulk data transfer cannot park a snoop in a buffer. The price is buffers and arbitration per class, which is one of the main sources of router area.'
        )}
      </p>
    </div>

    <div class="prose">
      <h3><span class="h-no">7.4</span>{t('调试方法论', 'Debug methodology')}</h3>
      <p>
        {t(
          'NoC 的 bug 有三类：功能（包去了错的地方）、性能（没死锁但慢得不合理）、以及一致性（协议与网络交互处）。三类用的工具不同：功能靠断言与事务日志，性能靠计数器与曲线，一致性靠把消息序列还原成时序图。第 8 章的每个真实芯片，都是靠这三套工具一起收敛的。',
          'NoC bugs come in three kinds: functional (a packet went somewhere wrong), performance (no deadlock, but inexplicably slow), and coherence (where the protocol meets the network). Each needs different tools: assertions and transaction logs for the first, counters and curves for the second, reconstructed message timelines for the third. Every chip in Chapter 8 converged with all three.'
        )}
      </p>
    </div>

    <div class="prose">
      <h3><span class="h-no">7.5</span>{t('生成器：别手写', 'Generators: do not hand-write it')}</h3>
      <p>
        {t(
          '参数化的 NoC 生成器（BookSim、DSENT、OpenSoC Fabric、OpenPiton 的 NoC 配置等）能把拓扑、路由、流控、缓冲深度一起扫一遍。它们的价值不是省代码，而是让“这个参数到底值多少”变成一个可重复的问题。',
          'Parameterised generators (BookSim, DSENT, OpenSoC Fabric, OpenPiton’s NoC configuration…) sweep topology, routing, flow control and buffer depth together. Their value is not saved code — it is turning “what is this knob worth” into a repeatable question.'
        )}
      </p>
      <div class="pull">
        {t(
          '先问“最忙的那条链路是谁”，再问“延迟多少”——顺序反了，优化就会打在没用的地方。',
          'Ask which link is busiest before asking how high latency is — reverse the order and you optimise the wrong thing.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">7.6</span>{t('自测', 'Check yourself')}</h3>
      <Quiz
        questions={[
          {
            q: t('均匀流量下，4×4 mesh 的饱和点由什么决定？', 'Under uniform traffic, what sets a 4×4 mesh’s saturation point?'),
            options: [
              t('对剖有 4 条链路', 'The bisection has four links'),
              t('最忙的那条链路被 32 条流穿过', 'The busiest link is crossed by 32 flows'),
              t('平均跳数是 2.67', 'Average hops are 2.67')
            ],
            answer: 1,
            why: t('把 16×15 条流逐对累加，最忙链路被 32 条穿过；每个源向 15 个目的各发 λ，负载即 32λ/15，λ≈0.47 时饱和。', 'Accumulating all 16×15 flows, the busiest link is crossed by 32 of them; each source sends λ to 15 destinations, so the load is 32λ/15 and saturation lands near λ = 0.47.')
          },
          {
            q: t('热点流量下瓶颈在哪里？', 'Where is the bottleneck under hotspot traffic?'),
            options: [
              t('对剖的中点', 'The bisection midpoint'),
              t('通向目的节点的那一跳', 'The last hop into the destination'),
              t('均匀分布，没有瓶颈', 'It is uniform; there is no bottleneck')
            ],
            answer: 1,
            why: t('所有流量都汇向同一个节点，它的一条注入链路要吞下全网的流量；拓扑再宽也没用。', 'All traffic converges on one node, whose single injection link must swallow the whole network’s load. No amount of bisection helps.')
          },
          {
            q: t('为什么解析模型仍值得用？', 'Why still use analytical models?'),
            options: [
              t('因为它们比仿真更准', 'Because they are more accurate than simulation'),
              t('因为可以快速扫设计空间，抓住趋势', 'Because they sweep design space quickly and capture trends'),
              t('因为它们不需要假设', 'Because they need no assumptions')
            ],
            answer: 1,
            why: t('解析模型的价值在速度和趋势，绝对值仍要周期级仿真或 RTL 校准。', 'Their value is speed and trend; absolute values still need calibration against cycle-level simulation or RTL.')
          }
        ]}
      />
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => open('ch8')}>
          <span class="next-no display">08</span>
          <strong>{t('案例研究', 'Case studies')}</strong>
          <span>{t('17 个真实芯片，把这些参数一样一样地摆在桌上。', 'Seventeen real chips, every parameter laid out on the table.')}</span>
        </button>
        <button class="next-card" onclick={() => open('ch3')}>
          <span class="next-no display">03</span>
          <strong>{t('回到拓扑', 'Back to topology')}</strong>
          <span>{t('饱和点和直径不是一回事，但它们住在一起。', 'Saturation and diameter are not the same number, but they are neighbours.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .table-wrap {
    overflow-x: auto;
  }

  .table-wrap .table {
    min-width: 480px;
  }

  .models {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .model {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 13px 14px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 11px;
  }

  .m-no {
    font-size: 12px;
    color: var(--gold);
  }

  .model strong {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink);
  }

  .model p {
    font-size: 11px;
    line-height: 1.65;
    color: var(--ink-3);
  }

  .m-cost {
    margin-top: auto;
    padding-top: 4px;
    font-size: 9.5px;
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
    .models,
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
