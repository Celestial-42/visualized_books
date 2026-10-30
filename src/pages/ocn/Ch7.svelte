<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import PerfLab from '../../components/noc/PerfLab.svelte';
  import { lang, t } from '../../lib/lang.svelte';
  import { navigate } from '../../lib/router.svelte';

  const en = $derived(lang.value === 'en');
  const open = (slug: string) => navigate(`/book/on-chip-networks/${slug}`);
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
        '换拓扑与流量模式，看链路热力图与曲线怎么变。饱和注入率 = 1 / 最忙链路的负载，全部由逐对路由累加得出。',
        'Change topology and pattern to watch the heat map and the curve move. Saturation is 1 / busiest-link load, accumulated by routing every pair.'
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
