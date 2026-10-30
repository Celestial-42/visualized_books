<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import ScalingLab from '../../components/noc/ScalingLab.svelte';
  import { lang, t } from '../../lib/lang.svelte';
  import { navigate } from '../../lib/router.svelte';
  import { nearestMesh } from '../../lib/noc/scaling';

  const en = $derived(lang.value === 'en');
  const mesh = nearestMesh(16);
  const open = (slug: string) => navigate(`/book/on-chip-networks/${slug}`);
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={1}
      title="引言：从总线到网络"
      en="Introduction"
      lede={t(
        '总线的问题不是“线不够宽”，而是它只有一条。核数上去以后，带宽被所有核平分，线也长到跨不过一个周期。片上网络是把“一根线服务所有人”换成“一张网服务每一对”。',
        'The problem with a bus is not that it is too narrow but that there is only one of it. As cores multiply, every core divides the same bandwidth and the wire grows longer than a cycle. An on-chip network replaces one wire for everybody with a network for every pair.'
      )}
    />

    <div class="prose">
      <h3><span class="h-no">1.1</span>{t('总线在哪里崩掉', 'Where the bus breaks')}</h3>
      {#if en}
        <p>
          A bus is a broadcast medium with an arbiter. It is cheap, it is simple, and it has two hard walls. The first is
          bandwidth: every transaction passes through the same set of wires, so the aggregate throughput is fixed no
          matter how many cores ask for it. The second is wire delay: as dies grow, the wire from one corner to the other
          stops fitting in a clock period, and no amount of buffering brings the frequency back.
        </p>
        <p>
          Networks attack both walls at once. Bandwidth comes from many links working in parallel — the bisection of a
          mesh grows with the edge, not with the area. Delay comes from breaking the long wire into short ones, with a
          router at every tile to regenerate the signal.
        </p>
      {:else}
        <p>
          总线的本质是一条广播通道加一个仲裁器。它便宜、简单，但有两堵墙。第一堵是带宽：所有事务挤在同一组线上，
          无论多少核来要，总吞吐是固定的。第二堵是线延迟：芯片越大，从一角到另一角的线就越放不进一个时钟周期，
          加多少缓冲也换不回频率。
        </p>
        <p>
          网络同时对付这两堵墙。带宽来自很多条链路并行——mesh 的对剖随边长增长，而不是随面积。
          延迟来自把一条长线切成很多短线，每个格点放一个路由器，把信号重新打一拍。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 1.1', 'Figure 1.1')}
      caption={t(
        '同一个 8 flit 的包，在总线与 mesh 上的完成时间。拖核数看两条线的距离怎么拉开：总线是 N 倍串行，mesh 只按平均跳数增长。',
        'The same 8-flit packet finishing on a bus versus a mesh. Drag the core count and watch the two curves separate: a bus serialises N times, a mesh only grows with average hop count.'
      )}
    >
      <ScalingLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Note what the comparison does <em>not</em> say. A mesh is not free: each packet now pays a router pipeline per
          hop, and the tile area grows with the number of ports. Chapter 3 makes that cost explicit by measuring the
          graph; the point here is only that the bus's cost grows with the <em>number</em> of cores while a mesh's grows
          with the <em>edge</em> of the array.
        </p>
      {:else}
        <p>
          注意这个对比没有说什么。mesh 不是免费的：每个包每跳都要付一次路由器流水线，格点面积也随端口数增长。
          第 3 章会用图的方式把这些代价算清楚；这里只想说明一件事——总线的代价随核<em>数</em>增长，
          而 mesh 的代价随阵列<em>边长</em>增长。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">1.2</span>{t('四个可独立设计的问题', 'Four questions you can answer separately')}</h3>
      {#if en}
        <p>
          An on-chip network is usually described as four layers, and the layers are nearly independent. That
          independence is the whole reason the field has a vocabulary: you can change the topology without touching flow
          control, or change the router pipeline without changing a single route.
        </p>
      {:else}
        <p>
          片上网络通常被描述成四层，而且这四层几乎可以独立设计。正因为独立，这个领域才有一套共同的词汇：
          你可以只换拓扑而不动流控，也可以只改路由器流水线而不改一条路由。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 1.2', 'Figure 1.2')}
      caption={t(
        '四层各回答一个问题。本章之后，第 3–6 章正好按这个顺序展开。',
        'Each layer answers one question. After this chapter, Chapters 3–6 follow exactly this order.'
      )}
    >
      <div class="layers">
        <div class="layer">
          <span class="lno display">01</span>
          <div>
            <strong>{t('拓扑', 'Topology')}</strong>
            <p>{t('谁和谁直接相连。决定度数、直径、对剖。', 'Who is wired to whom. Fixes degree, diameter, bisection.')}</p>
          </div>
          <span class="lch">Ch.3</span>
        </div>
        <div class="layer">
          <span class="lno display">02</span>
          <div>
            <strong>{t('路由', 'Routing')}</strong>
            <p>{t('一个包沿哪条路走。决定用不用得上拓扑给的多样性。', 'Which path a packet takes. Decides whether the topology’s diversity is used.')}</p>
          </div>
          <span class="lch">Ch.4</span>
        </div>
        <div class="layer">
          <span class="lno display">03</span>
          <div>
            <strong>{t('流控', 'Flow control')}</strong>
            <p>{t('一条路上的资源怎么分。决定缓冲、虚拟信道与死锁。', 'How a path’s resources are shared. Fixes buffers, virtual channels, deadlock.')}</p>
          </div>
          <span class="lch">Ch.5</span>
        </div>
        <div class="layer">
          <span class="lno display">04</span>
          <div>
            <strong>{t('路由器微架构', 'Router microarchitecture')}</strong>
            <p>{t('一个路由器每个周期做什么。决定每跳几拍。', 'What one router does each cycle. Fixes cycles per hop.')}</p>
          </div>
          <span class="lch">Ch.6</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      <div class="note">
        <b>{t('这本书的立场：', 'The book’s stance: ')}</b>
        {t(
          '每一层都可以被量化。直径是图上算出来的，环是信道依赖图里找出来的，每跳几拍是流水线加出来的。所以这个网站里的每个数字都有出处，且可以在 src/lib/noc/ 里复算。',
          'every layer can be quantified. Diameter comes from the graph, cycles from the channel dependency graph, cycles per hop from the pipeline. So every number on this site has a derivation in src/lib/noc/.'
        )}
      </div>
      {#if en}
        <p>
          One warning before the tour: a {mesh.w}×{mesh.h} mesh is the default picture in this book, but “mesh” is a
          choice, not a law. Chapter 8 walks through seventeen real chips that made different choices for different
          reasons.
        </p>
      {:else}
        <p>
          开始之前提醒一句：这本书默认的图是 {mesh.w}×{mesh.h} mesh，但 mesh 是一种选择，不是定律。
          第 8 章会走一遍 17 个真实芯片，它们出于不同的理由做了不同的选择。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">1.3</span>{t('这本书怎么读', 'How this book is organised')}</h3>
      <ul>
        {#if en}
          <li><b>Chapter 2</b> connects the network to the system: coherence and message passing decide which packets exist.</li>
          <li><b>Chapters 3–6</b> are the four layers above, each with the metrics and the failure modes attached.</li>
          <li><b>Chapter 7</b> is how you would know: traffic patterns, queueing, and the latency-throughput curve.</li>
          <li><b>Chapter 8</b> is the field’s answers, chip by chip.</li>
        {:else}
          <li><b>第 2 章</b>把网络接回系统：一致性与消息传递决定了网络上到底有哪几种包。</li>
          <li><b>第 3–6 章</b>就是上面四层，每一层都带着自己的度量和失效模式。</li>
          <li><b>第 7 章</b>讲你怎么知道它好不好：流量模式、排队，以及延迟-吞吐曲线。</li>
          <li><b>第 8 章</b>是工业界的答案，一个芯片一个芯片地看。</li>
        {/if}
      </ul>
    </div>

    <div class="prose">
      <h3><span class="h-no">1.4</span>{t('自测', 'Check yourself')}</h3>
      <Quiz
        questions={[
          {
            q: t('核数从 4 涨到 16，总线的总带宽怎么变？', 'Cores go from 4 to 16. What happens to aggregate bus bandwidth?'),
            options: [
              t('涨 4 倍，因为有 4 倍的请求', 'It grows 4×, because there are 4× the requests'),
              t('不变，那组线还是同一组', 'It stays the same: it is still the same wires'),
              t('涨 2 倍，和边长一致', 'It doubles, tracking the edge')
            ],
            answer: 1,
            why: t('带宽由线宽和频率决定，与请求数无关。多出来的核只是分同一块蛋糕。', 'Bandwidth is set by the wires and the clock, not by demand. Extra cores only divide the same cake.')
          },
          {
            q: t('mesh 的“代价随边长增长”具体指什么？', 'What does “a mesh’s cost grows with the edge” mean concretely?'),
            options: [
              t('对剖链路数和平均跳数都按 √N 增长', 'Bisection links and average hops both grow as √N'),
              t('链路总数恒定', 'The total link count is constant'),
              t('路由器面积与核数无关', 'Router area is independent of the core count')
            ],
            answer: 0,
            why: t('边长 √N：对剖随它线性增长，平均跳数也是；而总线的这两项都随 N 增长。', 'With edge √N, bisection and average hops both scale with the edge; for a bus both scale with N.')
          },
          {
            q: t('换一个路由算法，需要重新设计流控吗？', 'If you change the routing algorithm, must you redesign flow control?'),
            options: [
              t('需要，两者耦合', 'Yes — they are coupled'),
              t('通常不需要，四层可以分层设计', 'Usually not: the layers are designed separately'),
              t('只影响拓扑', 'It only affects topology')
            ],
            answer: 1,
            why: t('分层正是为了互不牵连；但路由与流控在“死锁”这一点上会互相约束，第 4、5 章会正面处理。', 'Layering exists precisely to decouple them — though routing and flow control constrain each other on deadlock, which Chapters 4 and 5 take head-on.')
          }
        ]}
      />
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => open('ch2')}>
          <span class="next-no display">02</span>
          <strong>{t('与系统架构的接口', 'Interface with system architecture')}</strong>
          <span>{t('一致性协议一次读 Miss，在网络上是哪几个包。', 'What one coherence read miss looks like on the wire.')}</span>
        </button>
        <button class="next-card" onclick={() => open('ch3')}>
          <span class="next-no display">03</span>
          <strong>{t('拓扑', 'Topology')}</strong>
          <span>{t('直径、平均跳数、对剖：四个数，全部现算。', 'Diameter, average hops, bisection: four numbers, all computed.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .layers {
    display: grid;
    gap: 8px;
  }

  .layer {
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr) 40px;
    align-items: baseline;
    gap: 12px;
    padding: 12px 14px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 11px;
  }

  .lno {
    font-size: 12px;
    color: var(--gold);
  }

  .layer strong {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
  }

  .layer p {
    margin-top: 2px;
    font-size: 11.5px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .lch {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--muted);
    text-align: right;
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
