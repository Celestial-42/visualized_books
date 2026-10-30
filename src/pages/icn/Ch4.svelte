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
  const freedom = PAIRS.map(([s, dst]) => ({ s, d: dst, paths: countShortest(mesh, s, dst) }));

  const CUBE: [number, number][] = [
    [0b0000, 0b0001],
    [0b0011, 0b0110],
    [0b0101, 0b1000],
    [0b0000, 0b1111]
  ];
  const cube = CUBE.map(([s, d]) => {
    const xor = s ^ d;
    const bits: number[] = [];
    for (let b = 3; b >= 0; b--) if ((xor >> b) & 1) bits.push(b);
    return { s, d, xor, hops: bits.length, order: bits };
  });

  const hops = (a: number, b: number, k = 4) =>
    Math.abs((a % k) - (b % k)) + Math.abs(Math.floor(a / k) - Math.floor(b / k));

  // Valiant: detour through a uniformly random midpoint. Expected hops are exact, not sampled.
  const valiantAverage = (s: number, d: number) => {
    let acc = 0;
    for (let m = 0; m < mesh.n; m++) acc += hops(s, m) + hops(m, d);
    return acc / mesh.n;
  };
  const VALIANT_PAIRS: [number, number][] = [
    [0, 15],
    [0, 5],
    [5, 10],
    [0, 1]
  ];
  const valiantRows = VALIANT_PAIRS.map(([s, d]) => {
    const minimal = hops(s, d);
    const v = valiantAverage(s, d);
    return { s, d, minimal, val: v, ratio: minimal ? v / minimal : 1 };
  });
  const valiantAll = (() => {
    let minSum = 0;
    let valSum = 0;
    let pairs = 0;
    for (let s = 0; s < mesh.n; s++) {
      for (let d = 0; d < mesh.n; d++) {
        if (s === d) continue;
        minSum += hops(s, d);
        valSum += valiantAverage(s, d);
        pairs++;
      }
    }
    return { min: minSum / pairs, val: valSum / pairs };
  })();

  const MIN_DESTS = [0b000, 0b011, 0b101, 0b111];
  const minRows = MIN_DESTS.map((d) => ({
    d,
    bits: d.toString(2).padStart(3, '0').split('').map(Number)
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
      <h3><span class="h-no">4.1</span>{t('分类：三条轴，六档', 'A taxonomy: three axes, six levels')}</h3>
      {#if en}
        <p>
          Three questions classify a routing algorithm. Is the path <em>minimal</em> — does the packet ever move away
          from its destination? Does the function depend on the <em>state</em> of the network, or only on the source and
          destination? And how much choice does it leave at each hop — one output, a subset, or all of them?
        </p>
        <p>
          The middle question separates the two families that are often lumped together: deterministic routing never
          looks at the network, and neither does <em>oblivious</em> routing, which randomises the path but is still blind
          to congestion. Adaptive routing is the only family that reacts. Minimality is a latency decision — every extra
          hop is a router pipeline and a link; choice is a throughput decision — with more paths a busy link can be
          avoided instead of queued behind. The art is getting choice without giving up the proof.
        </p>
        <p>
          Implementation is a fourth, orthogonal axis that the book keeps returning to: the path can be computed
          <em>distributed</em> at each router from (current, destination), or <em>source-routed</em> and carried in the
          header. Everything in this chapter is stated as a routing function R, which both implementations realise —
          Myrinet, for instance, ships middle-switch port addresses in the first few header flits.
        </p>
      {:else}
        <p>
          三个问题就能给路由算法分类。路径是否<em>最小</em>——包会不会背离目的地？路由函数是否依赖<em>网络状态</em>，
          还是只看源和目的？以及每一跳留了多少选择——一个输出、一个子集、还是全部都行？
        </p>
        <p>
          中间那个问题，把经常被混为一谈的两族拆开了：确定性路由从不看网络，<em>无意识</em>（oblivious）路由也不看——
          它把路径随机化，但对拥塞仍是盲的。只有自适应路由会对状态作出反应。最小性是延迟决策，多走一跳就是一个路由器流水线加一段链路；
          选择权是吞吐决策，路多，忙链路就可以绕开而不是排队。难点在于“要选择权，又不放弃证明”。
        </p>
        <p>
          第四条正交的轴是实现方式，书里反复回到它：路径可以在每个路由器上由（当前，目的）<em>分布式</em>算出，
          也可以由源端算好、<em>源路由</em>写进包头。本章一律用路由函数 R 陈述，两种实现都在实现 R——
          例如 Myrinet 就把中间交换机的端口地址放在报文头的前几个微片里。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 4.1', 'Figure 4.1')}
      caption={t(
        '六档算法与它们各自的“通行证”。越往右自由度越大，需要的死锁论证或额外机制也越贵；无意识路由不在这条轴上——它用随机化换负载均衡，代价直接写在跳数里。',
        'Six levels and the permit each one needs. More freedom to the right, at a more expensive proof or mechanism. Oblivious routing sits outside this ladder: it buys load balance with randomness and pays in hops.'
      )}
    >
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{t('类别', 'Class')}</th>
              <th>{t('看网络状态', 'Reads state')}</th>
              <th>{t('可用的路径', 'Paths allowed')}</th>
              <th>{t('死锁依据', 'Deadlock argument')}</th>
              <th>{t('额外代价', 'Extra cost')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t('确定性', 'Deterministic')}</td>
              <td>{t('否', 'no')}</td>
              <td>{t('每条流一条固定路', 'one fixed path per pair')}</td>
              <td>{t('通道图无环', 'acyclic channel graph')}</td>
              <td>{t('无', 'none')}</td>
            </tr>
            <tr>
              <td>{t('无意识', 'Oblivious')}</td>
              <td>{t('否（用随机数）', 'no — uses randomness')}</td>
              <td>{t('随机选，常走非最小', 'random, often non-minimal')}</td>
              <td>{t('两阶段：任意中间点', 'two-phase to a random midpoint')}</td>
              <td>{t('跳数约翻倍', 'roughly double the hops')}</td>
            </tr>
            <tr>
              <td>{t('部分自适应', 'Partially adaptive')}</td>
              <td>{t('是', 'yes')}</td>
              <td>{t('一组最短路', 'a subset of shortest paths')}</td>
              <td>{t('转弯模型 / 平面划分', 'turn model / plane partition')}</td>
              <td>{t('平面自适应 3 条 VC；转弯模型 0 条', '3 VCs for planar, 0 for turn models')}</td>
            </tr>
            <tr>
              <td>{t('完全自适应', 'Fully adaptive')}</td>
              <td>{t('是', 'yes')}</td>
              <td>{t('全部最短路', 'all shortest paths')}</td>
              <td>{t('定理 3.1（连接的无环子函数）', 'Theorem 3.1 (connected acyclic subfunction)')}</td>
              <td>{t('每物理通道 ≥2 条 VC', '≥2 VCs per physical channel')}</td>
            </tr>
            <tr>
              <td>{t('最大自适应', 'Maximally adaptive')}</td>
              <td>{t('是', 'yes')}</td>
              <td>{t('全部最短路（不设子网）', 'all shortest paths, no subnetwork')}</td>
              <td>{t('恢复机制兜底', 'recovery-based')}</td>
              <td>{t('中央缓冲 + 检测', 'central buffer, detection')}</td>
            </tr>
            <tr>
              <td>{t('非最小', 'Non-minimal')}</td>
              <td>{t('是（必须）', 'yes — required')}</td>
              <td>{t('含绕行的路径', 'paths that detour')}</td>
              <td>{t('上述之一 + 进展上限', 'any of the above plus a progress bound')}</td>
              <td>{t('跳数上限 / 阶段约束 / 偏转', 'hop bound, phase rule, or deflection')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">4.2</span>{t('确定性路由：e-cube 与维序', 'Deterministic routing: e-cube and dimension order')}</h3>
      {#if en}
        <p>
          In a hypercube, e-cube routing compares the current and destination addresses bit by bit and corrects one
          differing bit per hop, from the most significant down. The number of hops is the Hamming distance of the two
          addresses — nothing else can happen, which is exactly what makes the proof trivial. The table below computes
          that distance and the hop order for a few pairs.
        </p>
        <p>
          On a 2-D mesh the same rule uses only two dimensions: all X hops, then all Y hops, which is dimension order.
          The channel dependency graph of XY contains exactly four turns — east or west followed by north or south — and
          those four cannot close a square, because a square needs a Y→X turn as well.
        </p>
        <p>
          Wraparound changes the story. A torus adds the links that return from the last row or column to the first, and
          those links complete new cycles: a packet can now go east→south→west→north and come back to where it started.
          The classical fix is to split every physical channel into two virtual channels and forbid the wrap on the
          first one — the dateline of Chapter 5 of the on-chip networks book, or the east/west virtual networks of §3.2.1
          here.
        </p>
      {:else}
        <p>
          在超立方上，e-cube 路由逐位比较当前地址与目的地址，每跳修正一个不同的位，从最高位往下。
          跳数就是两个地址的汉明距离——不会发生别的事，这正是证明变得平凡的原因。下面的表为几对地址现算了距离与跳序。
        </p>
        <p>
          在二维网格上同一条规则只有两个维度可用：先走完全部 X，再走完全部 Y，也就是维序。XY 的通道相关图里恰好只有四个转向——
          东或西之后接北或南——而这四个闭不成一个方格，因为方格还需要一次 Y→X 的转向。
        </p>
        <p>
          环绕会改变结论。环网加上了从最后一行/列回到第一行的链路，这些链路补齐了新的环：包现在可以东→南→西→北回到原处。
          经典解法是把每条物理信道拆成两条虚拟信道，并在第一条上禁止跨越环绕——这就是片上网络那本书第 5 章的 dateline，
          也是本章 §3.2.1 里的东/西虚拟网络。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 4.2', 'Figure 4.2')}
      caption={t(
        'e-cube 的算术：两地址异或，非零位就是要修正的维度，跳序从高位到低位。跳数恒等于汉明距离，即异或里 1 的个数——四行的距离分别是 1、2、3、4，全部由位运算现算。',
        'The arithmetic of e-cube: XOR the two addresses; every set bit is a dimension to fix, most significant first. Hops always equal the Hamming distance — the number of 1s in the XOR. The four rows have distance 1, 2, 3 and 4, all computed from the bits.'
      )}
    >
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{t('源', 'Source')}</th>
              <th>{t('目的', 'Destination')}</th>
              <th>{t('异或', 'XOR')}</th>
              <th>{t('跳数', 'Hops')}</th>
              <th>{t('修正顺序（位）', 'Fix order (bit)')}</th>
            </tr>
          </thead>
          <tbody>
            {#each cube as row}
              <tr>
                <td class="mono">{row.s.toString(2).padStart(4, '0')}</td>
                <td class="mono">{row.d.toString(2).padStart(4, '0')}</td>
                <td class="mono">{row.xor.toString(2).padStart(4, '0')}</td>
                <td class="num">{row.hops}</td>
                <td class="mono">{row.order.length ? row.order.join(' → ') : '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">4.3</span>{t('无意识路由：用随机换均衡', 'Oblivious routing: balance bought with randomness')}</h3>
      {#if en}
        <p>
          Between “one path” and “reacts to congestion” sits a family that is easy to overlook: the route is chosen
          randomly, without reading a single queue. Valiant’s construction is the canonical one. Pick a random
          intermediate node m with probability 1/N, route minimally from s to m, then minimally from m to d. No packet
          ever needs to know whether a link is busy, yet no link carries far more traffic than any other — for
          <em>any</em> traffic pattern, with high probability.
        </p>
        <p>
          That is the property determinism cannot offer: a deterministic minimal algorithm maps a hot source-destination
          pair onto one path, and a single congested link then caps the whole flow. Valiant’s guarantee is usually stated
          as a competitive ratio: randomised oblivious routing reaches throughput within a factor of two of the best
          possible for every traffic matrix. The price is written directly in the hop count — two random minimal paths
          instead of one.
        </p>
        <p>
          Practical variants trade some of that balance back. Two-phase routing fixes the first phase to reach a midpoint
          drawn from the network’s middle (ROMM does this with multiple rounds of minimal routing), and adaptive variants
          keep Valiant only as the escape hatch used when the minimal path is congested. The book’s point is that
          oblivious routing defines the baseline: any adaptive scheme should be compared against it, because that is what
          “spreading load without knowing anything” already achieves.
        </p>
      {:else}
        <p>
          在“一条路”和“对拥塞作出反应”之间，坐着一族容易被忽略的路由：路径是随机选的，完全不读队列。Valiant 的构造最典型——
          以 1/N 的概率随机挑一个中间节点 m，先最小路走到 m，再从 m 最小路走到目的。没有包需要知道任何链路忙不忙，
          可也没有哪条链路比别的承担明显更多的流量——对<em>任意</em>流量模式，以高概率成立。
        </p>
        <p>
          这正是确定性给不了的性质：确定性最小算法把一条热点流对钉死在一条路上，随后一条拥塞链路就限制了整条流。
          Valiant 的保证通常写成竞争比：随机无意识路由对<em>每一个</em>流量矩阵都能达到最优吞吐的一半以内。
          代价直接写在跳数里——两条随机最短路代替一条。
        </p>
        <p>
          实用变体把一部分均衡换回来。两阶段路由把第一阶段固定成“走到网络中部某个节点”（ROMM 用多轮最小路由实现），
          自适应变体则只在最短路拥塞时才启用 Valiant 当逃逸口。书里的要点是：无意识路由定义了基准线——
          任何自适应方案都该和它比，因为“什么都不看、纯靠撒开”已经能做到这一步。
        </p>
      {/if}
      <div class="note">
        <b>{t('无意识 ≠ 确定性：', 'Oblivious is not deterministic: ')}</b>
        {t(
          '两者都不看网络状态，区别在于“同一对端点是否总走同一条路”。确定性答“是”，无意识答“否”。也正因为随机，它对流量模式不敏感——这是它唯一的强项，也是它省不掉额外跳数的原因。',
          'neither reads network state; the difference is whether a given pair always takes the same path. Deterministic says yes, oblivious says no. Being random is exactly why it is insensitive to the traffic pattern — its one strength, and the reason the extra hops cannot be avoided.'
        )}
      </div>
    </div>

    <Figure
      no={t('图 4.3', 'Figure 4.3')}
      caption={t(
        'Valiant 路由的跳数账，在 4×4 网格上对全部中间节点取精确平均（不是抽样）。全域平均 2.67 → 5.00 跳；短流最吃亏（0→1 付 5.5 倍），而 0→15 这种角到角反而一分不多——所有中间点都落在它的最短路上。',
        'The hop bill for Valiant routing, averaged exactly over all midpoints on a 4×4 mesh (not sampled). Network-wide, 2.67 hops become 5.00; short flows suffer most (0→1 pays 5.5×), while a corner-to-corner pair pays nothing extra — every midpoint already lies on its shortest path.'
      )}
    >
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{t('端点', 'Pair')}</th>
              <th>{t('最短路跳数', 'minimal hops')}</th>
              <th>{t('Valiant 平均跳数', 'Valiant mean hops')}</th>
              <th>{t('倍数', 'ratio')}</th>
            </tr>
          </thead>
          <tbody>
            {#each valiantRows as row}
              <tr>
                <td class="mono">{row.s} → {row.d}</td>
                <td class="num">{row.minimal}</td>
                <td class="num">{row.val.toFixed(2)}</td>
                <td class="num">{row.ratio.toFixed(2)}×</td>
              </tr>
            {/each}
            <tr>
              <td><b>{t('全域平均', 'all pairs')}</b></td>
              <td class="num">{valiantAll.min.toFixed(2)}</td>
              <td class="num">{valiantAll.val.toFixed(2)}</td>
              <td class="num">{(valiantAll.val / valiantAll.min).toFixed(2)}×</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">4.4</span>{t('部分自适应', 'Partially adaptive routing')}</h3>
      {#if en}
        <p>
          Partial adaptivity is the interesting middle: it keeps the acyclic proof but allows a packet more than one
          minimal path. Three constructions dominate the literature and this chapter.
        </p>
      {:else}
        <p>
          部分自适应是最有意思的中间地带：保留无环证明，却允许一个包有多条最短路。文献里（也是本章里）主导的有三种构造。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h4>4.4.1 {t('平面自适应', 'Planar-adaptive routing')}</h4>
      {#if en}
        <p>
          Split the mesh into two planes. A packet first moves freely within the +X or −X plane — using only two
          dimensions — and then switches to a +Y/−Y plane for the rest of the route. Each plane is a small acyclic
          network; the switch happens once, in a fixed order, so the concatenation is acyclic too.
        </p>
        <p>
          The number that matters is <b>three virtual channels per physical channel</b> in a 2-D mesh: the two X planes
          need a class each, and the Y plane needs a third. That is the price the book prints, and it is why
          planar-adaptive never became the default: three VCs per link is a large buffer budget for a freedom that is
          still only partial.
        </p>
        <p>
          The gain is real but bounded: a packet can choose among paths that differ in the first dimension, not among all
          shortest paths. That is why planar-adaptive sits in the “partial” row of Figure 4.1. Its place in history is
          being the first scheme to combine adaptivity with a proof that needed no recovery — and the first place where
          “how many VCs does this cost?” became the deciding question.
        </p>
      {:else}
        <p>
          把网格切成两个平面。包先在 +X 或 −X 平面里自由走（只涉及两个维度），再切到 +Y/−Y 平面走完剩下的路。
          每个平面都是一张小的无环网络；切换只发生一次且顺序固定，所以拼接起来仍然无环。
        </p>
        <p>
          真正要紧的数字是<b>每条物理信道 3 条虚拟信道</b>（二维网格）：两个 X 平面各占一类，Y 平面再占第三类。
          这就是书上给出的代价，也是平面自适应没成为默认选项的原因——为了一个仍然只是“部分”的自由度，每条链路上要多付三倍缓冲。
        </p>
        <p>
          收益真实但有限：包能在第一个维度上选不同的路，而不是在所有最短路里选。这就是图 4.1 里平面自适应落在“部分”这一行、
          而不是“完全自适应”那一行的原因。它在历史上的位置是：第一个把自适应和无恢复证明结合起来的方案，
          也是第一个让“这要花几条 VC？”成为决定性问题的方案。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h4>4.4.2 {t('转弯模型', 'Turn models')}</h4>
      {#if en}
        <p>
          A turn model works directly on the graph. Of the eight 90° turns on a mesh, forbid two, chosen so that
          <em>every</em> cycle would need at least one of them. The three classical choices forbid a different pair:
        </p>
        <ul>
          <li><b>West-first</b> — a packet that still has to go west goes west first; forbidden are N→W and S→W.</li>
          <li><b>Negative-first</b> — take all negative hops (west, south) before any positive one; forbidden are E→S and N→W.</li>
          <li><b>North-last</b> — postpone every northward hop to the end; forbidden are E→N and W→N.</li>
        </ul>
        <p>
          Each leaves six of the eight turns and needs <em>no</em> virtual channels — the cheapest adaptive routing that
          exists. The proof is one sentence: take the “last” turn of a cycle in the forbidden direction, and that turn is
          not allowed. Chapter 3’s Figure 3.3 evaluates exactly these sets on a mesh and finds no cycle, while all eight
          turns close one immediately.
        </p>
        <p>
          The catch is that the rule is global: a packet must know the shape of its remaining path, not just the next
          hop, because “have I already gone west?” decides which turns are legal. Routers keep a little per-packet state,
          or the header carries it — cheap, but not free.
        </p>
      {:else}
        <p>
          转弯模型直接在图上动刀。网格上八种 90° 转向里禁两个，使得<em>每一个</em>环都至少需要其中一个被禁的转向。
          三个经典选择禁的是不同的两对：
        </p>
        <ul>
          <li><b>西向优先</b>——还要往西走的包先往西；禁掉“北→西”和“南→西”。</li>
          <li><b>负向优先</b>——先把负方向的跳（西、南）走完，再走正方向；禁掉“东→南”和“北→西”。</li>
          <li><b>北向最后</b>——把所有向北的跳推到最末；禁掉“东→北”和“西→北”。</li>
        </ul>
        <p>
          每个都留下八个转向里的六个，而且<em>一条虚拟信道都不需要</em>——这是现存最便宜的自适应路由。
          证明只有一句话：取环里“最后”那个朝被禁方向的转向，而它不被允许。第 3 章的图 3.3 正是在网格上现算这几个集合，
          结果无环，而八个转向全开立刻成环。
        </p>
        <p>
          代价是这条规则是全局的：包必须知道整条剩余路径的形状，而不仅是下一跳，因为“我是否已经往西走过”决定了哪些转向合法。
          路由器要为每个包存一点状态，或者由包头携带——便宜，但不是免费。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h4>4.4.3 {t('虚拟网络：把两类流量分开', 'Virtual networks: separating two classes of traffic')}</h4>
      {#if en}
        <p>
          The third construction adds a dimension the turn model does not have: split the network itself into virtual
          networks and let a packet choose one on entry. The book’s standard example is the torus. Dimension order is
          acyclic on a mesh but not on a torus, so eastward traffic gets one virtual network and westward traffic
          another; each is ordered by the dimension-order rule, and a packet never leaves the VN it entered.
        </p>
        <p>
          Because the two virtual networks share no channels, there is no dependency between them at all — the extended
          graph is a disjoint union, and it suffices to show each half acyclic. This is the same argument as the
          dateline of the on-chip networks book, and the same mechanism that puts “two VCs” in the price column of
          Figure 4.1. Note what it buys: routing inside each VN stays <em>minimal and deterministic</em>, so this is
          adaptivity across virtual networks, not within one packet’s path.
        </p>
      {:else}
        <p>
          第三种构造给转弯模型补上一个它没有的维度：把网络本身切成若干虚拟网络，让包在入口处选一个。书里的标准例子是环网。
          维序在网格上无环、在环网上不行；解法是让东向流量进一个虚拟网络、西向流量进另一个，各自按维序规则排序，
          而包一旦进入某个虚拟网络就不再离开。
        </p>
        <p>
          因为两个虚拟网络不共用任何信道，它们之间根本不存在相关——扩展图是不交并，只需证明两半各自无环。
          这与片上网络那本书的 dateline 是同一个论证，也是图 4.1 里“两条 VC”这个价码的来源。要注意它买到的是什么：
          每个虚拟网络内部仍然<em>最小、确定</em>，所以这是“跨虚拟网络的自适应”，而不是“一条路上的自适应”。
        </p>
      {/if}
      <div class="note">
        <b>{t('三种部分自适应怎么选：', 'Choosing among the three: ')}</b>
        {t(
          '要最省缓冲就选转弯模型（0 条 VC，代价是包头状态）；要“每条流都还有得选”就选虚拟网络（2 条 VC，代价是缓冲）；要在路径中途真的换方向，才需要平面自适应（3 条 VC）。自由度依次变大，成本也依次变大——但都停在“部分”。',
          'fewest buffers: turn models (no VCs, at the cost of header state). Per-flow choice: virtual networks (2 VCs). Genuinely changing direction mid-path: planar-adaptive (3 VCs). Freedom grows left to right and so does cost — but all three stop at “partial”.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">4.5</span>{t('完全自适应：三种花法', 'Fully adaptive: three ways to pay')}</h3>
      {#if en}
        <p>
          Fully adaptive routing allows every minimal path, so the dependency graph necessarily contains cycles;
          removing or surviving those cycles becomes the only route to a proof. The book groups the answers into three
          families, and they differ in <em>where</em> the cost lands: in virtual channels (Linder–Harden and its
          descendants), in buffer space (Cypher–Gravano), or in recovery hardware (Disha). The next three subsections
          take them in that order — cheapest proof first, cheapest buffer last.
        </p>
      {:else}
        <p>
          完全自适应允许每一条最短路，于是依赖图必然有环；“消掉这些环”或“扛住这些环”就成了唯一出路。书里把答案分成三族，
          差别在于成本落在哪里：落在虚拟信道上（Linder–Harden 及其后裔）、落在缓冲空间上（Cypher–Gravano）、
          还是落在恢复硬件上（Disha）。接下来三小节按这个顺序走——先讲证明最便宜的，最后讲缓冲最便宜的。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h4>4.5.1 {t('最大自适应：double-y 与 opt-y', 'Maximally adaptive: double-y and opt-y')}</h4>
      {#if en}
        <p>
          Linder and Harden’s construction is the one most later algorithms are measured against. On a 2-D mesh, give
          the X dimension’s physical channels <b>two</b> virtual channels and the Y dimension’s <b>one</b>; swap the
          dimensions and you get the same algorithm rotated, which the book calls <b>double-y</b>. The X+ and X− traffic
          use separate classes, so a packet can move freely in X while the Y hop stays on a single ordered class. The
          dependency graph has cycles inside a class but none across the ordering, which is why two VCs are enough.
        </p>
        <p>
          Glass and Ni then read double-y as a turn model and deleted the restrictions it does not need, giving <b>mad-y</b>
          (maximally adaptive double-y): more turns are allowed, so more minimal paths are usable, and the proof still
          holds because the remaining class ordering is acyclic. Schwiebert and Jayasimha went one step further with
          <b>opt-y</b>: it permits turns between X+ and Y2− and between X− and Y2+ that mad-y forbids, which makes it
          deadlock-free with <em>fewer</em> restrictions on the virtual channels — the maximum adaptivity achievable
          without introducing cyclic dependencies between channels.
        </p>
        <p>
          The generalised version is the punchline: the first VC class carries fully adaptive minimal routing; the second
          class is also fully adaptive once a packet has finished all its “preferred direction” hops, and partially
          adaptive before that. So the second class is a legal escape route precisely because, by the time a packet needs
          it, the packet has committed to a direction.
        </p>
        <p>
          The other line that matters is <b>Duato’s protocol</b>, and it is the one Theorem 3.1 was written for. Split
          each physical channel into two non-empty classes: an <em>adaptive</em> class and a <em>deterministic</em> class.
          A packet always tries an adaptive channel first; only when none is available does it fall back to the
          deterministic class. The deterministic class is the acyclic routing subfunction of the theorem; the adaptive
          class may contain any number of cycles, because every channel in it can reach the escape class. The book’s
          pseudo-code is a two-line case analysis on the sign of (destination − current) in each dimension — which is
          exactly why the protocol is cheap to build.
        </p>
      {:else}
        <p>
          Linder 与 Harden 的构造是后来所有算法的参照物。二维网格上，给 X 维的物理信道<b>两条</b>虚拟信道、Y 维<b>一条</b>；
          把维度对调就得到同一个算法旋转 90° 的版本，书里叫 <b>double-y</b>。X+ 与 X− 的流量各占一类，
          于是包可以在 X 上自由走，而 Y 方向的那一跳留在一条有序的类上。依赖图在类内部有环，跨类却没有，
          这就是“两条 VC 够用”的原因。
        </p>
        <p>
          Glass 与 Ni 随后把 double-y 当成转弯模型重读，删掉不需要的限制，得到 <b>mad-y</b>（最大自适应 double-y）：
          允许的转向更多、可用的最短路更多，而证明依然成立，因为剩下的类顺序仍是无环的。
          Schwiebert 与 Jayasimha 再进一步给出 <b>opt-y</b>：它允许 mad-y 禁止的 X+↔Y2−、X−↔Y2+ 转向，
          于是在虚拟信道上限制更少的情况下仍然无死锁——这是“不引入通道间环相关”所能达到的最大自适应度。
        </p>
        <p>
          推广版才是要点：第一类 VC 上跑完全自适应最小路由；第二类 VC 在包走完所有“首选方向”的跳之后也是完全自适应，
          在那之前只做部分自适应。换句话说，第二类之所以是合法的逃逸通道，正是因为包一旦需要它，就已经选定方向了。
        </p>
        <p>
          另一条重要路线是 <b>Duato 协议</b>——定理 3.1 本来就是为它写的。把每条物理信道分成两个非空类：
          <em>自适应</em>类与<em>确定性</em>类。包总是先试自适应通道；只有在一条都拿不到时，才退回确定性类。
          确定性类就是定理里那个无环路由子函数；自适应类里可以有任意多的环，因为其中每条通道都能到达逃逸类。
          书里的伪代码只是按每个维度上（目的−当前）的符号做两分支——这正是这个协议便宜的原因。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h4>4.5.2 {t('最省缓冲：Cypher–Gravano 与四种节点排序', 'Minimum buffering: Cypher–Gravano and four node orderings')}</h4>
      {#if en}
        <p>
          The opposite question is how little buffer a fully adaptive algorithm can get away with. For store-and-forward
          on a torus, Cypher and Gravano gave two algorithms that are provably optimal in buffer space for
          deadlock-avoidance routing, and both allow cyclic dependencies between queues. The first needs only
          <b>three central queues</b>, independent of the number of dimensions; the second uses boundary buffers and
          needs <b>two buffers per input channel</b>. Both extend to VCT switching — and, the book is careful to say,
          <em>not</em> to wormhole, because wormhole packets occupy many channels at once.
        </p>
        <p>
          The trick is an ordering of the nodes, and the book defines four: <b>right-ascending</b> (ordinary row-major),
          <b>left-ascending</b> (its reverse), <b>in-ascending</b> (smallest values at the perimeter, largest at the
          centre), and <b>out-ascending</b> (the reverse). A packet may only take a hop that respects the ordering, so
          its progress is monotone; when it runs out of options it parks in a central queue rather than waiting in the
          network. The tables in the book print all four orderings for an 8×8 torus, which is also the cleanest way to
          see why “in-ascending” is the one that works with wrap-around links.
        </p>
      {:else}
        <p>
          反过来的问题是：完全自适应到底能把缓冲省到什么程度。对环网上的存储转发，Cypher 与 Gravano 给出两个算法，
          可以证明它们在“死锁避免型路由”这个前提下缓冲用量最优，而且两者都允许队列之间存在环相关。
          第一个只需要<b>三条中央队列</b>，与维数无关；第二个用边界缓冲，<b>每条输入信道两个缓冲</b>。
          两者都能推广到 VCT 交换——书里特意强调，<em>不能</em>推广到虫孔，因为虫孔包会同时占住多条信道。
        </p>
        <p>
          诀窍是给节点排序，书里定义了四种：<b>右升</b>（普通行优先）、<b>左升</b>（反过来）、
          <b>内升</b>（周边的节点取最小值、中心取最大值）、<b>外升</b>（反过来）。
          包只能沿“符合排序”的方向跳，于是进展是单调的；一旦无路可走，它就去中央队列里待着，而不是在网络里干等。
          书里把四种排序在 8×8 环网上的取值全表列出，那也是看清“为什么内升排序才配得上环绕链路”的最快方式。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h4>4.5.3 {t('真完全自适应：Disha', 'Truly fully adaptive: Disha')}</h4>
      {#if en}
        <p>
          The first two families still avoid deadlock by restricting routing somewhere. Disha refuses that trade: every
          minimal path is allowed, the dependency graph may cycle freely, and a small amount of recovery hardware absorbs
          the rare configuration that actually closes a cycle. Recovery runs <em>concurrently</em> with normal routing,
          which is why the book calls it “truly” fully adaptive — the recovery mechanism does not sit in the data path
          and does not slow down the deadlock-free case.
        </p>
        <p>
          The hardware is small and specific. A <b>central buffer</b> holds the packet that is pulled out of the cycle:
          with serial recovery one flit-sized central buffer suffices for <em>any</em> topology, and with concurrent
          recovery at most two are needed for any topology that admits a Hamiltonian path or a spanning tree. Detection
          uses a <b>circular token</b> that walks the network and is passed on only when a packet makes progress; a
          router that keeps the token too long concludes that its packets are stuck and moves one into the central buffer.
          Each input virtual channel needs a counter and a comparator to implement the timeout, and the token circuit is a
          single point of failure — which concurrent recovery removes, at the cost of the second buffer.
        </p>
        <p>
          Because every VC can be used for fully adaptive routing, the extra VC a Disha router buys is spent on
          <em>throughput</em>, not on an escape lane: on a torus, deadlock-avoidance fully adaptive routing needs at least
          three VCs per physical channel with only one of them doing adaptive work, while Disha needs one VC plus the
          central buffer.
        </p>
        <p>
          The weakness is the tail. A central buffer has little bandwidth: fine for the short packets that usually
          deadlock, expensive when a long message does, because every other stuck packet then waits for the buffer to
          drain. The timeout threshold also has to be tuned against message length, and the optimum drifts unless routers
          snoop their neighbours’ physical channels. Hence the book’s advice: use short messages, or split long messages
          into fixed-length packets, and cap injection (§9.9) so the network never parks at saturation, where recovery
          traffic itself becomes the bottleneck.
        </p>
      {:else}
        <p>
          前两族仍然在某个地方限制路由来避开死锁。Disha 拒绝这笔交易：每条最短路都允许，依赖图可以有环，
          让少量恢复硬件去吸收那少数真正闭合的环。恢复过程与正常路由<em>并发</em>进行，这正是书里称它“真”完全自适应的原因——
          恢复机制不在数据通路上，也不会拖慢无死锁时的转发。
        </p>
        <p>
          硬件很小也很具体。一块<b>中央缓冲</b>用来装那个被从环里拉出来的包：串行恢复下，一个微片大小的中央缓冲对<em>任意</em>拓扑都够；
          并发恢复下，对任何能定义哈密尔顿路径或生成树的拓扑最多需要两个。检测靠一个<b>循环令牌</b>在网络里巡游，
          只有包取得进展时才传递；某个路由器持有令牌过久，就断定自己的包卡住了，把一个搬进中央缓冲。
          每条输入虚拟信道需要一个计数器和比较器来实现超时，而令牌电路是单点失效——并发恢复用第二个缓冲换掉了这个弱点。
        </p>
        <p>
          因为每条 VC 都能用于完全自适应路由，Disha 多开的那条 VC 花在<em>吞吐</em>上，而不是当逃逸通道：
          在环网上，死锁避免型完全自适应路由至少需要每物理信道三条 VC，其中只有一条真正做自适应；而 Disha 只要一条 VC 加中央缓冲。
        </p>
        <p>
          弱点在长尾。中央缓冲带宽很小：对通常死锁的短报文够用，可一旦长报文死锁，恢复就要花很久，其他被困的包只能排队等它排空。
          超时阈值还得随报文长度调，除非路由器去监听相邻节点的物理信道，否则最优值会漂移。所以书里的建议是：
          用短报文，或把长报文切成定长小包，并用注入限制（§9.9）压住饱和点，否则恢复流量本身会成为瓶颈。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 4.4', 'Figure 4.4')}
      caption={t(
        '完全自适应的三族做法，按“多花什么”排序：多花 VC（Linder–Harden / opt-y）、多花缓冲（Cypher–Gravano）、多花恢复硬件（Disha）。前两族给出无死锁的证明，第三族给出“卡住了也能解开”的证明。',
        'The three fully adaptive families, sorted by what they spend: VCs (Linder–Harden / opt-y), buffering (Cypher–Gravano), recovery hardware (Disha). The first two prove “it cannot jam”; the third proves “if it jams it will unjam”.'
      )}
    >
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{t('方案', 'Scheme')}</th>
              <th>{t('每物理信道 VC', 'VCs per channel')}</th>
              <th>{t('额外的什么', 'What else')}</th>
              <th>{t('证明方式', 'Proof')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>double-y / opt-y</td>
              <td class="num">{t('X 维 2、Y 维 1', '2 on X, 1 on Y')}</td>
              <td>{t('类之间的顺序', 'class ordering')}</td>
              <td>{t('依赖图无环（含类顺序）', 'acyclic graph with class order')}</td>
            </tr>
            <tr>
              <td>Cypher–Gravano</td>
              <td class="num">{t('边界缓冲 2', '2 boundary buffers')}</td>
              <td>{t('中央/边界队列 + 节点排序', 'central or boundary queues + node ordering')}</td>
              <td>{t('排序单调，缓冲用量最优', 'monotone ordering, optimal buffering')}</td>
            </tr>
            <tr>
              <td>Disha</td>
              <td class="num">{t('1（可用于吞吐）', '1 (usable for throughput)')}</td>
              <td>{t('中央缓冲 + 循环令牌 + 计数器', 'central buffer + token + counters')}</td>
              <td>{t('恢复：卡住必被搬出', 'recovery: a stuck packet gets moved')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">4.6</span>{t('非最小路由', 'Non-minimal routing')}</h3>
      {#if en}
        <p>
          Non-minimal routing adds paths that deliberately move away from the destination. There are two reasons to want
          them: to route around congestion (a busy link should be avoided, not queued behind), and to make progress
          possible in networks that offer no empty buffer at all — deflection, or “hot potato”, routing sends a packet out
          of some port every cycle and lets a neighbour sort it out later.
        </p>
        <p>
          Valiant’s randomised detour (§4.3) is the load-balancing version; the west-first turn model has a non-minimal
          form too, in which the same ordering argument is applied while allowing hops that move away. Chaos is the
          classic deflection router: it tries the minimal path first, retries for a fixed time, and then stores the packet
          in a central queue so the network never has to stall — the same recovery instinct as Disha, used to break
          livelock instead of deadlock. The central queue is what turns “deflect forever” into “eventually deliver”.
        </p>
        <p>
          The book’s warning is worth repeating: non-minimal routing is only safe with a bound on how far a packet may
          wander. Without one, the routing function is deadlock-free and still useless, because packets can circulate
          forever. The bounds in practice are a hop counter, a deterministic phase (minimal until the counter expires),
          or a distance rule such as “misroute only while farther than x hops from the destination” — the TPB-x and MB-m
          protocols of §4.7 are exactly such bounds, in the backtracking setting.
        </p>
      {:else}
        <p>
          非最小路由故意加入背离目的地的路径。想要它们的理由有两个：绕开拥塞（忙链路该绕，而不是排队），
          以及在完全没有空闲缓冲可用的网络里也能前进——偏转路由（“热土豆”路由）每个周期把包从某个端口扔出去，
          让邻居去操心下一跳。
        </p>
        <p>
          Valiant 的随机绕行（§4.3）是负载均衡版本；西向优先转弯模型也有非最小形式，做法是把同一套排序论证用在允许绕行的前提下。
          Chaos 是经典的偏转路由器：先试最短路，重试固定时间，然后把包存进中央队列，于是网络永远不必停住——
          这和 Disha 是同一种恢复直觉，只是用来断活锁而不是断死锁。中央队列正是把“永远偏转”变成“迟早送达”的东西。
        </p>
        <p>
          书里的警告值得重复：非最小路由只有在“包最多能走多远”有上限时才是安全的。没有上限，路由函数虽然无死锁，却依然没用，
          因为包可以永远转下去。实践中的上限有三种：跳数计数器、确定性阶段（计数未到期前只走最短路），
          或距离规则（“离目的地还有 x 跳以上时才允许绕行”）——§4.7 里的 TPB-x 与 MB-m 协议正是这种上限在回溯场景下的化身。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">4.7</span>{t('回溯协议', 'Backtracking protocols')}</h3>
      {#if en}
        <p>
          Backtracking protocols replace buffering with search. A probe header walks the network without reserving
          anything; if it finds a busy channel it retreats to the last decision point and tries another output; only when
          a complete path is confirmed does the data follow. Pipelined circuit switching is the classical setting, but
          the idea applies to any network that can afford the setup time.
        </p>
        <p>
          Deadlock is impossible by construction — data is never buffered on a partial path — so the proof obligation
          moves to two other places: the probe must not starve (a fairness problem, §3.6 again), and the state left
          behind along the explored paths must be bounded, otherwise the search itself becomes an unbounded resource.
        </p>
        <p>
          The engineering detail that decides whether it works is where the search history lives. The straightforward
          version keeps it in the routing header, which makes the probe grow with every explored branch — and in the
          misrouting variants the number of links explored during setup can get large, so the probe itself becomes a
          latency source. The book’s fix is to distribute the history: each node keeps history bits per input link, sized
          by the node’s channel count, plus a node history vector; a candidate output is marked “tried” by setting its
          bit, so the header shrinks back to roughly e-cube size.
        </p>
        <p>
          Two refinements bound the search. The optimistic multi-link protocol does not retreat on a busy channel at all:
          it keeps the path and waits, assuming the channel will free up — which is fast when it is right and wasteful
          when it is wrong, because a reserved path can be long and a long wait holds link bandwidth. The two-phase
          backtracking protocol TPB-x does the opposite split: exhaustive minimal search while the probe is farther than
          x hops from the destination, exhaustive misrouting once it is inside that radius, switching phases as often as
          needed. MB-m caps the number of misrouted hops at m. Both are progress bounds (§4.6) expressed in a
          backtracking setting.
        </p>
      {:else}
        <p>
          回溯协议用搜索代替缓冲。探测头沿网络前进、不预留任何东西；遇到忙信道就退回上一个决策点，换一个输出再试；
          只有确认了完整通路，数据才跟上。流水电路交换是它的经典场景，但这个思路适用于任何付得起建路时间的网络。
        </p>
        <p>
          死锁在构造上不可能——数据从不在半条路上被缓冲——于是证明义务转到另外两处：探测头不能饿死（又是 §3.6 的公平性问题），
          以及沿探索路径留下的状态必须有界，否则搜索本身就成了无界资源。
        </p>
        <p>
          决定成败的工程细节是“搜索历史存在哪里”。直白做法把它放进路由头，于是探测头随每次分支探索而变大；
          在绕道变体里，建路时探索的链路数可能很大，探测头本身就成了延迟来源。书里的解法是把历史分散开：
          每个节点为每条输入链路保存一个历史位向量（位数等于该节点的信道数），外加一个节点历史向量；
          某个候选输出被探过就把对应位置为“已试”，于是包头可以缩回接近 e-cube 的大小。
        </p>
        <p>
          两种改进用来给搜索加上界。乐观多链路协议遇到忙信道根本不退：它保留路径等下去，猜对了很快、猜错了很浪费——
          预留的路径可能很长，而长等待占着链路带宽。两阶段回溯协议 TPB-x 反过来切分：探测头离目的地超过 x 跳时做穷尽最小搜索，
          进入这个半径后做穷尽绕道搜索，可以在一趟路由里多次切换阶段。MB-m 则把任意时刻允许绕行的跳数上限设为 m。
          两者都是 §4.6 说的进展上限，只是写在回溯场景里。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">4.8</span>{t('多级互连网络中的路由', 'Routing in multistage networks')}</h3>
      {#if en}
        <p>
          In an omega or butterfly network the route is determined by the destination address alone: at stage s the
          packet leaves through the port named by bit s of the destination. That is <em>self-routing</em>, and it means
          the only thing that can go wrong is contention — two packets wanting the same output — not a routing cycle. The
          table computes the port sequence for a few destinations on a three-stage, eight-terminal network.
        </p>
        <p>
          Hardware does not recompute this at every stage. The destination address itself, rotated by the network’s
          shuffle permutation, <em>is</em> the routing tag: the switch at each stage reads the top bit of the tag, forwards
          on that port, and rotates the tag left. Because the tag is carried in the header, the switch needs no routing
          table at all — which is exactly why these networks are cheap, and why the book writes the intermediate output
          address as a formula in the destination bits rather than as a table lookup.
        </p>
        <p>
          Self-routing also explains the lack of path diversity: one destination, one path. Two-way (bidirectional) MINs
          add the interesting case — a path may use forward and backward links, and then the deadlock argument must be
          stated over pairs of channels: the number of forward channels must equal the number of backward ones, and a
          path may not use both directions of the same port pair, otherwise redundant communication becomes possible.
        </p>
        <p>
          The consequence is architectural. Adding adaptivity to a MIN means adding a stage of arbitration and giving up
          the unique-tag property, so MINs dominate switch fabrics, where the traffic is uniform, and not processor
          interconnects, where it is not.
        </p>
      {:else}
        <p>
          在 omega 或 butterfly 网络里，路径只由目的地址决定：第 s 级从目的地址第 s 位所指定的端口出去。这就是<em>自路由</em>，
          它意味着唯一会出问题的是竞争——两个包抢同一个输出——而不是路由环。下面的表为一个三级、八终端的网络算出了几个目的地址的端口序列。
        </p>
        <p>
          硬件不会在每一级重算这件事。目的地址本身，按网络自身的混洗置换旋转之后，<em>就是</em>路由标志：
          每一级的开关读标志的最高位、从那个端口转发、再把标志循环左移。因为标志就在包头里，开关连路由表都不需要——
          这正是这类网络便宜的原因，也是书里把中间输出地址写成“目的地址各位的表达式”而不是查表的原因。
        </p>
        <p>
          自路由也解释了它为什么没有路径多样性：一个目的地、一条路。双向 MIN 补上有意思的那一半——
          路径可以同时用前向与后向链路，这时死锁论证必须写在通道对上：前向通道的数目要等于后向通道的数目，
          且路径不能同时使用同一端口对的两个方向，否则会出现冗余通信。
        </p>
        <p>
          结论落在体系结构上：给 MIN 加自适应，意味着加一级仲裁并放弃“唯一标志”这个性质。所以它们统治交换结构（流量均匀），
          而不统治处理器互连（流量不均匀）。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 4.5', 'Figure 4.5')}
      caption={t(
        '三级 omega 网络的自路由：目的地址的每一位依次选中该级的输出端口，这一串位本身就是路由标志。表由位运算现算；端口序列唯一，路径也唯一。',
        'Self-routing in a three-stage omega: each destination bit picks that stage’s output, and that bit string is the routing tag. Computed from the bits; the port sequence is unique, and so is the path.'
      )}
    >
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{t('目的', 'Destination')}</th>
              <th>{t('二进制', 'Binary')}</th>
              <th>{t('第 1 级', 'Stage 1')}</th>
              <th>{t('第 2 级', 'Stage 2')}</th>
              <th>{t('第 3 级', 'Stage 3')}</th>
            </tr>
          </thead>
          <tbody>
            {#each minRows as row}
              <tr>
                <td class="mono">{row.d}</td>
                <td class="mono">{row.bits.join('')}</td>
                <td class="num">{row.bits[0]}</td>
                <td class="num">{row.bits[1]}</td>
                <td class="num">{row.bits[2]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">4.9</span>{t('不规则拓扑', 'Irregular topologies')}</h3>
      {#if en}
        <p>
          Switch fabrics built from arbitrary links have no dimensions to order by, so the graph itself has to be turned
          into something routable. The classical construction is <b>up*/down*</b>, and it proceeds in three steps.
        </p>
        <ol>
          <li>
            Build a spanning tree of the switch graph, rooted at some node. The book’s tie-breaking is by switch ID: when
            two candidates are at the same level, the lower ID wins, and the links that loop back to the same switch are
            simply dropped from the tree.
          </li>
          <li>
            Orient every tree edge away from the root and every non-tree edge from the deeper end to the shallower one.
            The result is a DAG: every cycle in the fabric necessarily contains at least one edge pointing up and one
            pointing down.
          </li>
          <li>
            Allow only routes that go <em>up</em> toward a common ancestor and then <em>down</em> to the destination. The
            shape of the route — up, then down — is what makes the channel dependency graph acyclic.
          </li>
        </ol>
        <p>
          The cost is path length: up*/down* can be much worse than the shortest path, and the tree is a single
          structure whose root choice affects everyone. The book also gives a way to <em>extend</em> an existing
          deadlock-free routing to a new channel set without redoing the proof: double every physical channel, or split
          each into two virtual channels, then let newly injected messages use the new channels freely as long as every
          new channel can reach the old ones. That is Theorem 3.1’s escape-lane argument applied to an upgrade path.
        </p>
        <p>
          Source routing and node tables (§4.8 of the on-chip networks book) are the implementation side of the same
          idea: if the graph is not regular, ship the path in the header or store it in a table, and compute the table
          once at configuration time.
        </p>
      {:else}
        <p>
          由任意链路搭成的交换网没有维度可依，只能把图本身变成可路由的东西。经典构造是 <b>up*/down*</b>，分三步。
        </p>
        <ol>
          <li>
            先对交换机图跑一棵生成树，选定一个根。书里的平局规则是按交换机 ID：同层时取 ID 较小的那一端，
            并且把“回到同一交换机”的链路直接从树里略去。
          </li>
          <li>
            把树边指向背离根的方向、把非树边从较深一端指向较浅一端。结果是一个 DAG：网络里每个回路都至少有一条向上边、一条向下边。
          </li>
          <li>
            只允许“先向上走到公共祖先、再向下到目的”的路径。正是“先上后下”这个形状让通道相关图无环。
          </li>
        </ol>
        <p>
          代价是路径长度：up*/down* 可能远长于最短路，而且整棵树是单一结构，根选在哪里影响所有人。
          书里还给了一个<em>扩展</em>已有无死锁路由的办法，不必重做证明：把每条物理信道加倍、或各拆成两条虚拟信道，
          然后允许新注入的报文自由使用新信道，只要每条新信道都能到达旧信道。这就是定理 3.1 的逃逸通道论证用在“升级路径”上。
        </p>
        <p>
          源路由与节点表（片上网书 §4.8）是同一想法的实现层面：图不规则，就把路径写进包头、或者存进表里，配置时算一次。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">4.10</span>{t('资源分配：路由之后，谁来挑', 'Resource allocation: after routing, who chooses')}</h3>
      {#if en}
        <p>
          The book separates “which paths are allowed” from “who goes now”. A routing function produces a set of
          candidate output channels; a <em>selection function</em> picks one, usually the least congested. This
          separation matters because the deadlock proof depends only on the routing function — so the selection policy can
          be tuned (thresholds, hysteresis, age-based priority) without invalidating the proof. Underneath sits
          arbitration for the physical resource: one output port, several requesters.
        </p>
      {:else}
        <p>
          书里把“哪些路允许”和“现在谁走”分开：路由函数给出一组候选输出通道，<em>选择函数</em>从中挑一个，通常挑最不拥塞的。
          这个分离很关键，因为死锁证明只依赖路由函数——于是选择策略可以随便调（阈值、迟滞、按年龄的优先级），证明都不会失效。
          再往下是物理资源的仲裁：一个输出端口、多个请求者。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h4>4.10.1 {t('选择函数', 'The selection function')}</h4>
      {#if en}
        <p>
          The selection function is where “adaptive” becomes real. Two properties are worth checking in any design.
          First, <em>it must not defeat the routing function</em>: if it always prefers the same queue, the network is
          adaptive on paper and deterministic in practice — the failure mode noted in §4.11. Second, <em>it must not
          starve a candidate</em>: a threshold that permanently excludes one output is a routing restriction introduced
          by the back door, and it can invalidate a proof that assumed the output was reachable.
        </p>
        <p>
          Typical policies are: prefer the output with the largest number of free buffers; prefer the one whose downstream
          router is idle; prefer the straight-through output unless a threshold is exceeded; or use age — the older the
          packet, the lower the bar for taking a non-preferred output. The Figure 4.6 table is the set of candidates such
          a function chooses from: the number of shortest paths is the size of the decision problem.
        </p>
      {:else}
        <p>
          选择函数是“自适应”真正落地的地方。任何设计都值得检查两条性质。第一，<em>它不能把路由函数的自由度抵消掉</em>：
          如果它永远偏好同一条队列，网络就是“纸面自适应、实际确定”——这正是 §4.11 提到的失效模式。
          第二，<em>它不能把某个候选饿死</em>：一个永久排除某输出的阈值，就是走后门引入的路由限制，可能让“该输出可达”的证明失效。
        </p>
        <p>
          常见策略有：优先空闲缓冲最多的输出；优先下游路由器空闲的输出；优先直行输出，除非超过阈值；或者按年龄——
          包越老，选非首选输出的门槛越低。图 4.6 的表就是这类函数要挑选的候选集合：最短路的条数，就是决策问题的规模。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 4.6', 'Figure 4.6')}
      caption={t(
        '4×4 网格上四对端点的最短路条数（由图上穷举得出）。确定性只走其中一条；部分自适应在一组里挑；完全自适应可以用满——这就是选择函数的候选规模，也就是“自由度”的量化。',
        'The number of shortest paths for four endpoint pairs on a 4×4 mesh, counted on the graph. Deterministic takes one, partially adaptive picks inside a subset, fully adaptive can use them all — the size of the selection function’s menu, freedom quantified.'
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
      <h4>4.10.2 {t('仲裁、复用与优先级', 'Arbitration, multiplexing, priorities')}</h4>
      {#if en}
        <p>
          Once a candidate is chosen, the packet still has to win the physical resource. Three mechanisms share the work.
          <b>Arbitration</b> decides which of several requesters gets an output port this cycle — round-robin for
          fairness, a matrix arbiter when the request latency matters, priority when a class of traffic must win. This is
          the same slot where starvation (§3.6) is decided: a fixed-priority arbiter is a livelock-free network that
          still starves a requester.
        </p>
        <p>
          <b>Multiplexing</b> decides how virtual channels share a physical channel: the physical link carries one flit
          per cycle, so VCs take turns, and the schedule is what makes virtual channels look like independent links to
          the routing proof. <b>Priorities</b> sit on top: request and reply traffic are usually separated so a reply never
          queues behind a long request, and when several priority classes exist, each physical channel is split into as
          many VCs as there are classes — which is why a design with four priority levels and two routing classes pays
          for eight VCs per link.
        </p>
      {:else}
        <p>
          候选挑定之后，包还得赢下物理资源。三套机制分担这件事。<b>仲裁</b>决定这一拍哪个请求者拿到输出端口——
          要公平用轮询，在意请求延迟用矩阵仲裁器，要让某类流量优先就用优先级。饥饿（§3.6）也正是在这里被决定的：
          固定优先级仲裁器给出的是一个无活锁、却会饿死请求者的网络。
        </p>
        <p>
          <b>多路复用</b>决定虚拟信道如何共享一条物理信道：物理链路每拍只走一个微片，于是各 VC 轮流，而正是这套调度让 VC
          对路由证明看起来像独立的链路。<b>优先级</b>叠在最上层：请求与响应流量通常被分开，好让响应不会排在长请求后面；
          当存在多个优先级类时，每条物理信道会被拆成与类数一样多的 VC——这就是为什么“四级优先级 + 两类路由”的设计，
          每条链路要付八条 VC。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h4>4.10.3 {t('长报文的通道分配', 'Channel allocation for long messages')}</h4>
      {#if en}
        <p>
          The last piece is specific to long messages. If a physical channel is handed to a long message and held to the
          end, short messages queue behind it for a long time; if the channel is re-arbitrated every flit, the long
          message loses its pipelined flow and pays a latency penalty at every hop. The book’s compromise is an
          <b>interleaved allocation</b>: after each segment of the long message, the channel checks whether a short
          message is waiting, and if so lets it through, then resumes the long message right behind it. One channel then
          serves one long message and several short ones, which is the usual traffic mix.
        </p>
        <p>
          This is the point where routing meets scheduling. Nothing in this chapter’s deadlock proofs cares how the
          channel is allocated; everything in the latency and fairness numbers does. That is why the book puts resource
          allocation in its own section rather than folding it into routing.
        </p>
      {:else}
        <p>
          最后一块专门针对长报文。如果把一条物理信道整段交给长报文并一直持有到结束，短报文就会在它后面排很久；
          如果每个微片都重新仲裁，长报文又失去流水、每一跳都付延迟代价。书里的折中是<b>交叉分配</b>：
          长报文每传完一段，信道就检查有没有短报文在等，有就让短报文先过，紧接着再恢复长报文。
          于是一条信道同时服务一个长报文和若干短报文——这也正是常见的流量构成。
        </p>
        <p>
          这里是路由与调度交汇的地方。本章所有死锁证明都不关心信道怎么分配；而所有延迟与公平性数字都关心。
          这也正是书里把资源分配单列一节、而不并进路由的原因。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">4.11</span>{t('定性性能：没有普遍最优的算法', 'Qualitative performance: no universally best algorithm')}</h3>
      {#if en}
        <p>
          The book closes with a deliberately qualitative section, and its first conclusion is negative: even ignoring
          cost, there is no routing algorithm that is best for every traffic pattern. A deterministic algorithm wins at
          low load because it has no selection overhead and its paths are the shortest; an adaptive one wins exactly
          where non-uniform traffic makes a deterministic path the bottleneck; Valiant-style oblivious routing wins on
          adversarial patterns and loses on uniform ones, where it pays the hop doubling for balance it does not need.
        </p>
        <p>
          The second conclusion is about the price of adaptivity in <em>wormhole</em> networks: fully adaptive routing needs
          several virtual channels per physical channel, and more VCs per link means more state in the allocator and a
          longer critical path — the clock frequency drops. This is why the adaptive algorithms that shipped are the ones
          that bought freedom with few VCs (turn models, opt-y, Disha with its central buffer) rather than the ones that
          bought it with many.
        </p>
        <p>
          The third conclusion is about what happens <em>before</em> deadlock: performance can collapse sharply as the
          network approaches saturation, even with no deadlock at all, whenever cyclic dependencies between channels are
          permitted. The escape bandwidth must therefore be high enough to drain the cycle fast; otherwise the design
          needs injection limiting (§9.9), which both prevents the saturation collapse and makes deadlock rare enough to
          ignore.
        </p>
        <p>
          And the engineering order the chapter ends on: this chapter’s trade ends up as three numbers — VCs per channel,
          paths allowed, and the selection threshold. Decide first how strong a deadlock argument you can afford (is
          recovery acceptable? is determinism acceptable?), and only then how much freedom to hand out. The reverse order
          usually produces a design that is adaptive on paper and takes one path in practice, because the selection
          function always picks the shortest queue, and the shortest queue is usually the same one.
        </p>
      {:else}
        <p>
          书末这一节刻意写成定性讨论，第一个结论是否定的：即使不考虑成本，也不存在对<em>所有</em>流量模式都最优的路由算法。
          确定性算法在低负载下赢，因为它没有选择开销、路径又最短；自适应算法恰好在“不均匀流量把确定性路径变成瓶颈”时赢；
          Valiant 一类的无意识路由在对抗性模式上赢，在均匀模式上输，因为它在不需要均衡的时候多付了一倍跳数。
        </p>
        <p>
          第二个结论关于自适应在<em>虫孔</em>网络里的价格：完全自适应要求每条物理信道多条 VC，而每条链路 VC 越多，
          分配器状态越多、关键路径越长——时钟频率会掉。这正是已上机的自适应算法普遍是“用很少的 VC 换自由度”的那一类
          （转弯模型、opt-y、以及用中央缓冲的 Disha），而不是“用很多 VC 换自由度”的那一类。
        </p>
        <p>
          第三个结论关于死锁<em>之前</em>会发生什么：只要允许通道之间存在环相关，即使完全没有死锁，性能也会在接近饱和点之前急剧下降。
          所以逃逸带宽必须高到能迅速排空环；否则就要靠注入限制（§9.9）——它既挡住饱和塌陷，也把死锁频率压到可以忽略。
        </p>
        <p>
          最后是这一章收尾的工程顺序：取舍最终落在三个数字上——每通道几条 VC、允许多少条路、选择阈值设在哪。
          先确定你能承受多强的死锁论证（能不能接受恢复、能不能牺牲确定性），再决定给多少自由度。反过来做，
          通常得到一个“理论自适应、实际只走一条路”的设计，因为选择函数总是挑最短队列，而最短队列往往就是同一条。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">4.12</span>{t('延伸阅读：书里指到哪儿', 'Further reading: where the book points')}</h3>
      {#if en}
        <p>
          The book’s own reference list for this chapter is a map of the field: Dally and Seitz for the sufficient
          condition behind §4.2, Glass and Ni for the turn model, Linder and Harden, then Schwiebert and Jayasimha for
          the opt-y line, Cypher and Gravano for minimum buffering, Duato for the protocol in §4.5, and Disha for
          recovery-based fully adaptive routing. It also points forward: fault-tolerant variants of these algorithms
          are Chapter 6, and injection limiting is §9.9.
        </p>
        <p>
          The one reading order worth recommending is Chapter 3 first. Every algorithm in this chapter is an answer to
          the question “which dependency graph will this produce?”, and the answer is only checkable with the two graphs
          of §3.2 — the channel graph and the extended one. Read without them, this chapter is a list of algorithms;
          read with them, it is one argument applied six times.
        </p>
      {:else}
        <p>
          书里这一章的参考文献本身就是一张领域地图：Dally 与 Seitz 给 §4.2 背后的充分条件，Glass 与 Ni 给转弯模型，
          Linder 与 Harden 以及后来的 Schwiebert 与 Jayasimha 给 opt-y 这一线，Cypher 与 Gravano 给最小缓冲，
          Duato 给 §4.5 的协议，Disha 给基于恢复的完全自适应路由。书里还向前指：这些算法的容错版本在第 6 章，注入限制在 §9.9。
        </p>
        <p>
          唯一值得推荐的阅读顺序是先读第 3 章。本章每个算法都是在回答“它会造出怎样的依赖图”，而这个问题只能用 §3.2 的两张图来检查——
          通道图和扩展图。离开它们，这一章是一串算法；带着它们，这一章是同一个论证用了六次。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">4.13</span>{t('自测', 'Check yourself')}</h3>
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
            q: t('维序路由在环网上为什么要两条虚拟信道？', 'Why does dimension order need two VCs on a torus?'),
            options: [
              t('因为环绕链路补齐了新的环', 'Because the wrap links complete new cycles'),
              t('因为环网带宽更高', 'Because a torus has more bandwidth'),
              t('因为包更长', 'Because packets are longer')
            ],
            answer: 0,
            why: t('mesh 上四个转向闭不成环；加上环绕链路后能绕一圈回来，必须用断点把环切成链。', 'On a mesh the four turns cannot close a cycle; wrap links let a packet go all the way round, so a dateline has to cut the ring into a chain.')
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
          },
          {
            q: t('Valiant 路由为什么能均衡负载？代价是什么？', 'Why does Valiant routing balance load, and what does it cost?'),
            options: [
              t('因为每个包都读队列挑最空的链路；代价是缓冲区变大', 'Because each packet reads queues and picks the emptiest link; the cost is bigger buffers'),
              t('因为中间节点随机，负载不依赖流量模式；代价是跳数约翻倍', 'Because the midpoint is random, so load does not depend on the traffic pattern; the cost is roughly double the hops'),
              t('因为它绕开死锁；代价是必须加一条 VC', 'Because it avoids deadlock; the cost is one extra VC')
            ],
            answer: 1,
            why: t('随机中间点让任何流量矩阵都被摊平（竞争比 2 以内），而代价写在跳数里：4×4 网格上 2.67 跳变成 5.33 跳。', 'A random midpoint spreads any traffic matrix (competitive ratio within two), and the price is in hops: 2.67 becomes 5.33 on a 4×4 mesh.')
          },
          {
            q: t('二维网格上平面自适应要几条虚拟信道？为什么？', 'How many virtual channels does planar-adaptive need on a 2-D mesh, and why?'),
            options: [
              t('1 条，因为它只走最短路', 'One — it only uses shortest paths'),
              t('2 条，正负方向各一条', 'Two — one per direction'),
              t('3 条：两个 X 平面各一类，Y 平面再一类', 'Three — a class each for the two X planes and one for the Y plane')
            ],
            answer: 2,
            why: t('平面划分要保证跨平面的依赖只能朝一个方向，于是每个平面都得有自己的一类，共三类。', 'The plane split must ensure dependencies cross in one direction only, so each plane needs its own class — three in total.')
          },
          {
            q: t('Disha 多出来的那条虚拟信道用来做什么？', 'What does Disha’s extra virtual channel buy?'),
            options: [
              t('当逃逸通道，只在死锁时使用', 'An escape lane used only during deadlock'),
              t('用于吞吐——所有 VC 都能做完全自适应路由', 'Throughput — every VC can carry fully adaptive routing'),
              t('存放检测计数器', 'Storage for the detection counters')
            ],
            answer: 1,
            why: t('死锁交给中央缓冲 + 环形令牌处理，所以 VC 不必留一条当逃逸，全部可以参与自适应——这正是“真”完全自适应的含义。', 'Deadlock is handled by the central buffer and the circulating token, so no VC has to be reserved as an escape; all of them can be adaptive — that is what “truly” fully adaptive means.')
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
