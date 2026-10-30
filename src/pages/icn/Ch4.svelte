<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import { buildTopology, countShortest } from '../../lib/noc/topology';
  import { lang, t } from '../../lib/lang.svelte';
  import { navigate } from '../../lib/router.svelte';

  const en = $derived(lang.value === 'en');
  const open = (book: string, slug: string) => navigate(`/book/${book}/${slug}`);

  const mesh = buildTopology('mesh', 4, 4);
  const PAIRS: [number, number][] = [
    [0, 5],
    [0, 10],
    [2, 13],
    [5, 10]
  ];
  const freedom = PAIRS.map(([s, dst]) => ({
    s,
    d: dst,
    paths: countShortest(mesh, s, dst)
  }));
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={4}
      title="路由算法"
      en="Routing Algorithms"
      lede={t(
        '第 3 章给了判据，这一章花掉它。确定性、部分自适应、完全自适应、最大自适应、非最小、回溯——每一档都比上一档多走几条路，代价是死锁条件更贵、缓冲更多、或者需要一个恢复机制兜底。',
        'Chapter 3 supplied the test; this chapter spends it. Deterministic, partially adaptive, fully adaptive, maximally adaptive, non-minimal, backtracking — each level takes more paths than the last, and pays with a stricter deadlock condition, more buffers, or a recovery mechanism.'
      )}
    />

    <div class="prose">
      <h3><span class="h-no">4.1</span>{t('分类：自由度与代价', 'A taxonomy: freedom against cost')}</h3>
      {#if en}
        <p>
          Routing algorithms are usually classified along two axes: whether the path is minimal, and how much choice the
          function leaves at each hop. Minimality controls latency; choice controls how well the network’s path diversity
          can be used under load.
        </p>
      {:else}
        <p>
          路由算法通常沿两条轴分类：路径是否最小，以及每一跳留了多少选择。最小性决定延迟，选择权决定负载下能用上多少路径多样性。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 4.1', 'Figure 4.1')}
      caption={t(
        '五档算法与它们各自的“通行证”。越往右自由度越大，需要的死锁论证或额外机制也越贵。',
        'Five levels and the permit each one needs. More freedom to the right, and a more expensive proof or mechanism to go with it.'
      )}
    >
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{t('类别', 'Class')}</th>
              <th>{t('可用的路径', 'Paths allowed')}</th>
              <th>{t('死锁依据', 'Deadlock argument')}</th>
              <th>{t('额外代价', 'Extra cost')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t('确定性', 'Deterministic')}</td>
              <td>{t('每条流一条固定路', 'one fixed path per pair')}</td>
              <td>{t('通道图无环', 'acyclic channel graph')}</td>
              <td>{t('无', 'none')}</td>
            </tr>
            <tr>
              <td>{t('部分自适应', 'Partially adaptive')}</td>
              <td>{t('一组最短路', 'a subset of shortest paths')}</td>
              <td>{t('转向模型 / 平面划分', 'turn model / plane partition')}</td>
              <td>{t('2 条 VC', 'two VCs')}</td>
            </tr>
            <tr>
              <td>{t('完全自适应', 'Fully adaptive')}</td>
              <td>{t('全部最短路', 'all shortest paths')}</td>
              <td>{t('定理 3.1（连接的无环子函数）', 'Theorem 3.1 (connected acyclic subfunction)')}</td>
              <td>{t('每物理通道 ≥2 VC', '≥2 VCs per physical channel')}</td>
            </tr>
            <tr>
              <td>{t('最大自适应', 'Maximally adaptive')}</td>
              <td>{t('全部最短路（不设子网）', 'all shortest paths, no subnetwork')}</td>
              <td>{t('恢复机制兜底', 'recovery-based')}</td>
              <td>{t('恢复缓冲 / 检测', 'recovery buffers, detection')}</td>
            </tr>
            <tr>
              <td>{t('非最小', 'Non-minimal')}</td>
              <td>{t('含绕行的路径', 'paths that detour')}</td>
              <td>{t('上述之一 + 进展上限', 'any of the above plus a progress bound')}</td>
              <td>{t('跳数上限 / 阶段约束', 'hop bound or phase rule')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">4.2</span>{t('确定性路由：e-cube 与维序', 'Deterministic routing: e-cube and dimension order')}</h3>
      {#if en}
        <p>
          A deterministic function computes the output from the current and destination node only. In a hypercube that
          is e-cube: compare address bits from the most significant one and fix them one at a time. In a 2-D mesh it is
          dimension order — all X hops, then all Y hops — which is the same rule with only two dimensions.
        </p>
        <p>
          Determinism is what makes the proof cheap: the channel dependency graph contains exactly the transitions the
          function can produce, so a small closed set of turns can be checked by inspection. The cost is on the other
          side of the ledger — one path per pair means a hot link has nowhere to go.
        </p>
      {:else}
        <p>
          确定性函数只根据当前节点与目的节点算输出。在超立方上是 e-cube：从最高位开始逐位比较、逐位修正。
          在二维网格上就是维序——先走完 X 再走 Y——同一条规则，只是维度只有两个。
        </p>
        <p>
          确定性让证明变便宜：通道相关图里只包含这个函数能产生的转向，一个很小的封闭集合，肉眼就能检查。
          代价记在另一本账上——每对节点只有一条路，出现热点链路就无处可去。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">4.3</span>{t('部分自适应：平面与转弯模型', 'Partially adaptive: planes and turn models')}</h3>
      {#if en}
        <p>
          Two classical constructions buy adaptivity without giving up the acyclic proof. <b>Planar-adaptive</b> routing
          splits the mesh into two virtual networks that each use at most two dimensions, so a packet can adapt inside a
          plane while the plane itself stays acyclic. <b>Turn models</b> (Glass and Ni) instead forbid a small set of
          turns — west-first forbids turning west after going north or south, negative-first forbids the mirror pair —
          and the remaining turns provably cannot close a cycle.
        </p>
        <p>
          Both need a second virtual channel in practice, because the two planes or the two phases must not share a
          buffer. That is the pattern you can see in the lab of Chapter 3: the freedom is real, and it is paid for in
          buffers and in the shape of the allowed turn set.
        </p>
      {:else}
        <p>
          两种经典构造可以在不放弃无环证明的前提下换来自适应。<b>平面自适应</b>把网格切成两个虚拟网络，每个最多用两个维度，
          于是包能在平面内自适应，而平面本身仍然无环。<b>转弯模型</b>（Glass 与 Ni）则禁止少数几个转向——
          西向优先禁止“先北/南再向西”，负向优先禁止镜像的那一对——剩下的转向可证闭不成环。
        </p>
        <p>
          两者在实践中都需要第二条虚拟信道，因为两个平面（或两个阶段）不能共用同一块缓冲。
          这正是第 3 章那个实验里的模式：自由度是真的，但要用缓冲和“允许转向集的形状”来付账。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 4.2', 'Figure 4.2')}
      caption={t(
        '4×4 网格上四对端点的最短路条数（由图上穷举得出）。确定性只走其中一条；部分自适应在一组里挑；完全自适应可以用满；这就是“自由度”的量化。',
        'The number of shortest paths for four endpoint pairs on a 4×4 mesh, counted on the graph. Deterministic takes one, partially adaptive picks inside a subset, fully adaptive can use them all — this is freedom, quantified.'
      )}
    >
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{t('端点', 'Pair')}</th>
              <th>{t('最短路条数', 'shortest paths')}</th>
              <th>{t('确定性用', 'deterministic uses')}</th>
              <th>{t('部分自适应用', 'partial')}</th>
              <th>{t('完全自适应用', 'fully adaptive')}</th>
            </tr>
          </thead>
          <tbody>
            {#each freedom as row}
              <tr>
                <td class="mono">{row.s} → {row.d}</td>
                <td class="num">{row.paths}</td>
                <td class="num">1</td>
                <td class="num">{Math.min(2, row.paths)}</td>
                <td class="num">{row.paths}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">4.4</span>{t('完全自适应：把环相关消掉', 'Fully adaptive: removing the cyclic dependencies')}</h3>
      <p>
        {t(
          '完全自适应允许包走任意一条最短路，于是依赖图里必然有环——“消除环相关”就成了唯一出路。书上给了三类做法：用结构化缓冲池把不同转向的流量隔离开、用虚拟网络把包分到互不依赖的类里、以及用自适应子网（也就是定理 3.1 里的那个 R1）留一条无环逃生通道。三者本质一致：图必须有环，但每条环上都要有一个“随时能离开”的出口。',
          'Fully adaptive routing lets a packet take any shortest path, so the dependency graph necessarily contains cycles — removing cyclic dependencies becomes the only way out. The book gives three families: structured buffer pools that isolate traffic by turn, virtual networks that put packets into mutually independent classes, and adaptive subnetworks (the R1 of Theorem 3.1) that keep one acyclic escape lane. They are the same idea: the graph may cycle, but every cycle must have an exit.'
        )}
      </p>
      <div class="note">
        <b>{t('为什么“真完全自适应”这么难：', 'Why “truly fully adaptive” is hard: ')}</b>
        {t(
          '环存在的条件下，你证明的不是“不会卡住”，而是“卡住之后一定会解开”。这需要检测、需要恢复资源，也需要一条与数据流隔离的控制通路——第 3 章的两条策略在这里重新出现。',
          'with cycles present you are no longer proving “it cannot jam”, but “if it jams it will unjam”. That needs detection, recovery resources, and a control path isolated from data — the two recovery strategies of Chapter 3 coming back.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">4.5</span>{t('最大自适应：用恢复换全部路径', 'Maximally adaptive: all paths, paid with recovery')}</h3>
      {#if en}
        <p>
          Maximally adaptive routing refuses the subnetwork discipline altogether: every minimal path is allowed, and a
          small amount of deadlock-recovery hardware absorbs the rare cycle that actually closes. DISHA is the canonical
          example. The pitch is latency and throughput under adversarial traffic; the price is that the network must
          detect a misbehaving configuration, which is a protocol problem as much as a routing one.
        </p>
      {:else}
        <p>
          最大自适应干脆不接受子网纪律：每条最短路都允许，少数真正闭合的环交给一点点死锁恢复硬件吸收，DISHA 是标准例子。
          它卖的是对抗性流量下的延迟与吞吐，代价是网络必须能发现“配置出问题了”——这既是路由问题，也是协议问题。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">4.6</span>{t('非最小路由与回溯协议', 'Non-minimal routing and backtracking')}</h3>
      {#if en}
        <p>
          Non-minimal routing adds paths that deliberately move away from the destination: Valiant’s random intermediate
          hop is the oldest trick, and every such function needs the progress bound from §3.6. Backtracking protocols go
          further: a probe header walks the network reserving nothing, retreats on a busy channel, and only then sends
          data. Deadlock becomes impossible by construction — no data is ever buffered on a partial path — and the price
          moves to setup latency and to the amount of state a probe leaves behind.
        </p>
      {:else}
        <p>
          非最小路由故意加入背离目的地的路径：Valiant 的随机中间跳是最老的一招，而每个这样的函数都需要 §3.6 里的进展上限。
          回溯协议走得更远：探测头沿网络前进、不预留任何东西，遇到忙信道就退回，确认通路后才发数据。
          死锁在构造上就不可能——数据从不在半条路上被缓冲——代价挪到了建路延迟，以及探测头在沿途留下的状态。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">4.7</span>{t('多级互连网络与不规则拓扑', 'Multistage networks and irregular topologies')}</h3>
      <p>
        {t(
          '多级网络（omega、butterfly）的路由是自路由：目的地址的每一位依次选中下一级的输出，路径唯一。因此它的阻塞不是死锁而是竞争——两个包争同一个输出，就必须有一个等。增量式 MIN 需要额外的仲裁与缓冲才能提供自适应，这也是它们更多出现在交换机而不是处理器互连里的原因。不规则拓扑（交换网）没有“按维度”可言，工程上常用 up*/down* 规则：先沿“向上”的路由到公共祖先，再向下，规则本身保证无环。',
          'Routing in a multistage network (omega, butterfly) is self-routing: each destination bit picks the next stage’s output, so the path is unique. What blocks is therefore contention, not deadlock — two packets wanting one output means one waits. Incremental MINs need extra arbitration and buffering to become adaptive, which is why they show up in switches more than in processor interconnects. Irregular topologies have no dimensions to order by, so practice uses a rule such as up*/down*: route up to a common ancestor, then down, which is acyclic by construction.'
        )}
      </p>
    </div>

    <div class="prose">
      <h3><span class="h-no">4.8</span>{t('资源分配：路由之后，谁来挑', 'Resource allocation: after routing, who chooses')}</h3>
      <p>
        {t(
          '书上把“选哪条路”和“现在让谁走”分成两层：路由函数给出候选，选择函数（selection function）在候选里按拥塞挑一个。这样自适应逻辑可以独立演进而不动路由的证明。再往下是仲裁与资源分配——输出端口只有一个，请求者有很多，公平性与优先级都在这里决定（见第 3 章图 3.4）。',
          'The book separates “which paths are allowed” from “who goes now”: a routing function produces candidates, and a selection function picks among them by congestion. That keeps adaptive policy evolving without touching the deadlock proof. Below that sits arbitration and resource allocation — one output port, several requesters — where fairness and priority are decided (Figure 3.4 in Chapter 3).'
        )}
      </p>
    </div>

    <div class="prose">
      <h3><span class="h-no">4.9</span>{t('自测', 'Check yourself')}</h3>
      <Quiz
        questions={[
          {
            q: t('转弯模型的本质是什么？', 'What is a turn model really doing?'),
            options: [
              t('禁止少数转向，使剩下的转向闭不成环', 'Forbidding a few turns so the rest cannot close a cycle'),
              t('让每个包都走最短路', 'Forcing every packet onto a shortest path'),
              t('增加缓冲深度', 'Deepening buffers')
            ],
            answer: 0,
            why: t('它是在通道相关图上删边：删掉的那两条转向，正好是闭合某个方格所需的。', 'It deletes edges from the channel dependency graph; the two removed turns are exactly what closing a square needs.')
          },
          {
            q: t('完全自适应路由允许全部最短路，为什么还能无死锁？', 'Fully adaptive allows every shortest path — why can it still be deadlock-free?'),
            options: [
              t('因为它不走最短路', 'Because it does not use shortest paths'),
              t('因为存在连接的无环路由子函数，且所有通道都能到达它', 'Because a connected acyclic routing subfunction exists and every channel reaches it'),
              t('因为缓冲足够多', 'Because there is enough buffering')
            ],
            answer: 1,
            why: t('这就是定理 3.1：图可以有环，但只要有一条“随时能离开”的无环通道，环不会永久闭合。', 'That is Theorem 3.1: the graph may cycle, but with an acyclic lane every channel can reach, no cycle stays closed.')
          },
          {
            q: t('多级互连网络里的“阻塞”主要指什么？', 'In a multistage network, what does “blocking” mostly mean?'),
            options: [
              t('死锁', 'Deadlock'),
              t('两个包争同一个输出造成的竞争', 'Contention when two packets want the same output'),
              t('链路断开', 'A broken link')
            ],
            answer: 1,
            why: t('自路由路径唯一，不存在路由死锁；等的是输出端口，不是对方的缓冲。', 'Self-routing gives a unique path, so there is no routing deadlock; packets wait for an output port, not for each other’s buffers.')
          }
        ]}
      />
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => open('interconnection-networks', 'ch3')}>
          <span class="next-no display">03</span>
          <strong>{t('回到死锁', 'Back to deadlock')}</strong>
          <span>{t('定理 3.1 的图，与它凭什么放松条件。', 'The graph behind Theorem 3.1, and why the condition can be relaxed.')}</span>
        </button>
        <button class="next-card" onclick={() => open('on-chip-networks', 'ch4')}>
          <span class="next-no display">02</span>
          <strong>{t('对照：片上网络的路由章', 'Contrast: the on-chip routing chapter')}</strong>
          <span>{t('同一批算法，换成可拨动的路径与转向实验。', 'The same algorithms, as draggable paths and turn experiments.')}</span>
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
    min-width: 520px;
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
