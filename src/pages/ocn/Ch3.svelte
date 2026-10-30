<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import TopologyLab from '../../components/noc/TopologyLab.svelte';
  import { lang, t } from '../../lib/lang.svelte';
  import { navigate } from '../../lib/router.svelte';

  const en = $derived(lang.value === 'en');
  const open = (slug: string) => navigate(`/book/on-chip-networks/${slug}`);
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={3}
      title="拓扑"
      en="Topology"
      lede={t(
        '拓扑是一张图，四个数就能说清它值不值：度数、直径、平均跳数、对剖。这一章没有一张图是画上去的——每张都是按邻接表生成的，每个数字都是在这张图上量出来的。',
        'A topology is a graph, and four numbers say most of what it is worth: degree, diameter, average hop count, bisection. Nothing on this page is drawn by hand — every graph comes from an adjacency list, and every number is measured on it.'
      )}
    />

    <div class="prose">
      <h3><span class="h-no">3.1</span>{t('四个数', 'The four numbers')}</h3>
      {#if en}
        <p>
          <b>Degree</b> is how many links a router has to drive; it sets the crossbar and the tile area.
          <b>Diameter</b> is the longest shortest path — the worst-case hop count, which sets zero-load latency.
          <b>Average hop count</b> is what the average packet actually pays. <b>Bisection width</b> is how many links
          you must cut to split the network in half; it bounds the throughput any traffic pattern that crosses the
          middle can ever reach.
        </p>
        <p>
          These four live in tension. A ring has degree 2 and is cheap, but its diameter grows with N. A crossbar has
          diameter 2 and is wonderful, until its port count and its wire count grow with N. Every real topology is a
          negotiated settlement between them.
        </p>
      {:else}
        <p>
          <b>度数</b>是一个路由器要驱动几条链路，它决定了交叉开关和格点面积。<b>直径</b>是最长的最短路，
          也就是最坏跳数，它决定零负载延迟。<b>平均跳数</b>是平均每个包真正付的钱。
          <b>对剖宽度</b>是把网络一分为二必须切断的链路数，它给所有跨中线的流量模式设了吞吐上限。
        </p>
        <p>
          这四个数互相牵制。ring 度数只有 2，很便宜，但直径随 N 增长；crossbar 直径只有 2，很完美，
          直到它的端口数和线数也随 N 增长。每一个真实的拓扑，都是这四项之间的谈判结果。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 3.1', 'Figure 3.1')}
      caption={t(
        '换拓扑、换规模，点两个节点看最短路径。下面的表格是另外三种连法在同一 16 节点下的实测值——全部由图上 BFS 算出。',
        'Change topology and size, then pick two nodes to see a shortest path. The table measures the other three on the same 16 nodes — all from BFS on the graph.'
      )}
    >
      <TopologyLab />
    </Figure>

    <div class="prose">
      <h3><span class="h-no">3.2</span>{t('直接网络：ring、mesh、torus', 'Direct networks: ring, mesh, torus')}</h3>
      {#if en}
        <p>
          In a direct network every node is both a terminal and a switch. A k-ary n-cube is the family: n dimensions,
          k nodes per dimension. A ring is 1-D (k = N), a mesh is 2-D without wraparound, a torus is 2-D with it.
        </p>
        <p>
          The numbers move in a way worth memorising. A 4×4 mesh has 24 links, degree 2–4, diameter 6, 2.67 average
          hops and a bisection of 4. Adding four wrap links to make it a 4×4 torus costs eight links and buys a
          diameter of 4 and 2.13 average hops — and doubles the bisection to 8. You did not get that for free: the wrap
          links are the longest wires on the die, and they are exactly the ones Chapter 4 has to be careful about.
        </p>
      {:else}
        <p>
          在直接网络里，每个节点既是终端又是交换节点。k 元 n 立方是它的家族：n 个维度，每维 k 个节点。
          ring 是 1 维（k = N），mesh 是没有环绕的 2 维，torus 是带环绕的 2 维。
        </p>
        <p>
          数字的变化方式值得记住。4×4 mesh 有 24 条链路，度数 2–4，直径 6，平均 2.67 跳，对剖 4。
          再加 4 条环绕线把它变成 4×4 torus，多花 8 条链路，换来直径 4、平均 2.13 跳——以及翻倍到 8 的对剖。
          这不是白给的：环绕线是芯片上最长的线，也恰恰是第 4 章必须小心处理的那几条。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 3.2', 'Figure 3.2')}
      caption={t(
        '从 ring 到 torus：每加一条环绕链路，直径和对剖各走一步，但最长的线也长了一截。',
        'From ring to torus: each wrap link buys a step in diameter and bisection, and adds one long wire.'
      )}
    >
      <div class="family">
        {#each [
          { name: 'ring (16)', d: 8, h: '4.27', b: 2, deg: '2', note: t('最便宜，最慢', 'cheapest, slowest') },
          { name: 'mesh 4×4', d: 6, h: '2.67', b: 4, deg: '2–4', note: t('落地最常用', 'the workhorse') },
          { name: 'torus 4×4', d: 4, h: '2.13', b: 8, deg: '4', note: t('多一倍链路换直径', 'twice the links, half the diameter') }
        ] as row}
          <div class="fam-card">
            <span class="fam-name mono">{row.name}</span>
            <div class="fam-row"><span>{t('直径', 'diameter')}</span><b class="mono">{row.d}</b></div>
            <div class="fam-row"><span>{t('平均跳数', 'avg hops')}</span><b class="mono">{row.h}</b></div>
            <div class="fam-row"><span>{t('对剖', 'bisection')}</span><b class="mono">{row.b}</b></div>
            <div class="fam-row"><span>{t('度数', 'degree')}</span><b class="mono">{row.deg}</b></div>
            <span class="fam-note">{row.note}</span>
          </div>
        {/each}
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">3.3</span>{t('间接网络：crossbar、butterfly、fat-tree', 'Indirect networks: crossbar, butterfly, fat-tree')}</h3>
      {#if en}
        <p>
          In an indirect network the switches are not terminals. A crossbar is the extreme: one switch, everything
          reaches everything in two hops. A butterfly adds stages so no single switch needs N ports. A fat tree makes
          the links towards the root fatter, which keeps the bisection constant no matter how many terminals you hang
          underneath.
        </p>
        <p>
          That is the trade in one sentence: direct networks spend <em>area on links</em>, indirect networks spend
          <em>area on stages</em>. A fat tree gives you a bisection that never becomes the bottleneck, and charges you
          for it in long wires into the core and a switching stage at every level.
        </p>
      {:else}
        <p>
          在间接网络里，交换节点不是终端。crossbar 是最极端的例子：一个交换结构，任何两点两跳可达。
          butterfly 加级数，让每个交换节点不需要 N 个端口。fat tree 则把通向根的链路加粗，
          于是无论底下挂多少终端，对剖都保持不变。
        </p>
        <p>
          一句话概括这笔交易：直接网络把面积花在<em>链路</em>上，间接网络把面积花在<em>级数</em>上。
          fat tree 给你一个永远不会成为瓶颈的对剖，代价是通向核心的长线，以及每一级都要多一个交换阶段。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 3.3', 'Figure 3.3')}
      caption={t(
        '两种“把面积花在哪”的思路。左边把链路铺满 2D，右边把交换级数叠起来。',
        'Two ways to spend area: lay links across a plane, or stack switching stages.'
      )}
    >
      <div class="compare-art">
        <div class="art-box">
          <span class="art-title">{t('直接：链路在平面上', 'Direct: links in a plane')}</span>
          <svg viewBox="0 0 200 120" fill="none" aria-hidden="true">
            {#each [0, 1, 2, 3] as r}
              {#each [0, 1, 2, 3] as c}
                <rect x={26 + c * 38} y={12 + r * 26} width="12" height="12" rx="3" class="n" />
              {/each}
            {/each}
            <path d="M44 18H62M82 18H100M120 18H138M44 44H62M82 44H100M120 44H138M44 70H62M82 70H100M120 70H138M44 96H62M82 96H100M120 96H138" class="l" />
            <path d="M38 24V38M76 24V38M114 24V38M152 24V38M38 50V64M76 50V64M114 50V64M152 50V64M38 76V90M76 76V90M114 76V90M152 76V90" class="l" />
            <text x="100" y="116" class="cap" text-anchor="middle">{t('24 条链路，度数 2–4', '24 links, degree 2–4')}</text>
          </svg>
        </div>
        <div class="art-box">
          <span class="art-title">{t('间接：级数在垂直方向', 'Indirect: stages in depth')}</span>
          <svg viewBox="0 0 200 120" fill="none" aria-hidden="true">
            {#each [0, 1, 2, 3] as i}
              <rect x={44 + i * 34} y="8" width="20" height="10" rx="2.5" class="n" />
              <rect x={44 + i * 34} y="55" width="20" height="10" rx="2.5" class="n" />
              <rect x={44 + i * 34} y="100" width="20" height="10" rx="2.5" class="n dim" />
            {/each}
            <path d="M54 18V30M54 30H78V55M88 18V30M88 30H112V55M122 18V30H78M122 30H112M132 18V30H112M78 65V76M78 76H54V100M112 65V76M112 76H122V100M78 65V76H54M112 65V76H122" class="l" />
            <text x="100" y="116" class="cap" text-anchor="middle">{t('根在上，叶在下，中间三级', 'root on top, leaves below, three stages')}</text>
          </svg>
        </div>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">3.4</span>{t('抽象度量会骗人', 'Abstract metrics lie a little')}</h3>
      {#if en}
        <p>
          All four numbers assume every link costs the same. On a real die they do not: a mesh link spans one tile, a
          torus wrap link spans the whole edge, and a fat-tree link into the core spans several tiles. A 4×4 torus has a
          better diameter than a 4×4 mesh on paper, and a worse one once you charge the wrap for its length.
        </p>
        <p>
          That is why the book ends Chapter 3 on place-and-route rather than on formulas: the graph is the design's
          skeleton, but the floorplan decides what the skeleton actually costs.
        </p>
      {:else}
        <p>
          这四个数都假设每条链路代价相同。在真实的芯片上并非如此：mesh 的一条链路跨一个格点，
          torus 的环绕链路跨过整个边长，fat-tree 通向核心的链路跨过好几个格点。
          纸面上 4×4 torus 的直径优于 4×4 mesh，一旦把环绕线的长度算进去，结论就可能反过来。
        </p>
        <p>
          这也是这本书把第 3 章结束在布局布线、而不是结束在公式上的原因：图是设计的骨架，
          但真正决定骨架成本的，是 floorplan。
        </p>
      {/if}
    </div>

    <div class="prose">
      <div class="pull">
        {t(
          '直径管延迟，对剖管带宽，度数管面积——没有拓扑能同时在三个方向上都赢。',
          'Diameter sets latency, bisection sets bandwidth, degree sets area — no topology wins all three at once.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">3.5</span>{t('自测', 'Check yourself')}</h3>
      <Quiz
        questions={[
          {
            q: t('16 节点时，为什么 torus 的对剖是 mesh 的两倍？', 'Why is a 16-node torus’s bisection twice a mesh’s?'),
            options: [
              t('因为 torus 的链路总数更多，切开时会被切到更多', 'A torus has more links in total, so a cut hits more of them'),
              t('因为环绕链路让两个方向的切边都要被切断', 'Wrap links make the cut cross both directions'),
              t('因为 torus 的度数更大', 'Because the degree is larger')
            ],
            answer: 1,
            why: t('切开一条中线时，mesh 只断 4 条，torus 除了这 4 条还要断反方向的 4 条环绕线。', 'Cutting the middle severs 4 links in a mesh; in a torus it also severs the 4 wrap links going the other way.')
          },
          {
            q: t('度数更高的直接代价是什么？', 'What is the direct cost of a higher degree?'),
            options: [
              t('路由算法更难', 'Routing gets harder'),
              t('交叉开关和端口面积更大', 'A larger crossbar and more ports'),
              t('直径变大', 'Diameter grows')
            ],
            answer: 1,
            why: t('度数是每个路由器的端口数，直接变成交叉开关的输入×输出和格点面积。radix 是面积的第一驱动力。', 'Degree is ports per router, which becomes crossbar inputs × outputs and tile area. Radix is the first driver of area.')
          },
          {
            q: t('为什么说抽象度量会骗人？', 'Why do abstract metrics mislead?'),
            options: [
              t('因为 BFS 算法不准', 'Because BFS is imprecise'),
              t('因为图上等长的链路在硅片上并不等长', 'Because equal-length links on the graph are not equal on silicon'),
              t('因为平均跳数没有意义', 'Because average hops are meaningless')
            ],
            answer: 1,
            why: t('torus 的环绕线和 fat-tree 的核心线跨好几个格点，线延迟与驱动代价远高于普通 mesh 链路。', 'Torus wrap links and fat-tree core links span several tiles, so their delay and drive cost dwarf a plain mesh link.')
          }
        ]}
      />
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => open('ch4')}>
          <span class="next-no display">04</span>
          <strong>{t('路由', 'Routing')}</strong>
          <span>{t('图给了多条路，算法决定用不用。转向一多，环就出来了。', 'The graph offers many paths; the algorithm decides. Permit the wrong turns and a cycle appears.')}</span>
        </button>
        <button class="next-card" onclick={() => open('ch2')}>
          <span class="next-no display">02</span>
          <strong>{t('回到系统接口', 'Back to the system interface')}</strong>
          <span>{t('一致性协议决定网络上跑哪几种包。', 'The coherence protocol decides which packets exist.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .family {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .fam-card {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 13px 14px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 11px;
  }

  .fam-name {
    font-size: 11.5px;
    color: var(--accent-deep);
    letter-spacing: 0.04em;
  }

  .fam-row {
    display: flex;
    justify-content: space-between;
    font-size: 11.5px;
    color: var(--muted);
  }

  .fam-row b {
    font-weight: 500;
    color: var(--ink);
  }

  .fam-note {
    margin-top: 4px;
    padding-top: 6px;
    border-top: 1px solid var(--line-2);
    font-size: 10.5px;
    color: var(--muted);
  }

  .compare-art {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .art-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .art-title {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .art-box svg {
    width: 100%;
    height: auto;
  }

  .n {
    fill: var(--card-2);
    stroke: var(--line);
  }

  .n.dim {
    opacity: 0.5;
  }

  .l {
    stroke: var(--line);
    stroke-width: 1;
  }

  .cap {
    font-family: 'Inter', sans-serif;
    font-size: 6.4px;
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
    .family,
    .compare-art,
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
