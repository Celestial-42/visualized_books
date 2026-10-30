<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import CaseLab from '../../components/noc/CaseLab.svelte';
  import { CASES } from '../../lib/noc/cases';
  import { lang, t } from '../../lib/lang.svelte';
  import { navigate } from '../../lib/router.svelte';

  const en = $derived(lang.value === 'en');
  const open = (slug: string) => navigate(`/book/on-chip-networks/${slug}`);

  const meshes = CASES.filter((c) => c.kind === 'mesh' || c.kind === 'torus');
  const rings = CASES.filter((c) => c.kind === 'ring');
  const others = CASES.filter((c) => c.kind === 'other' || c.kind === 'crossbar');

  const meshYear = Math.min(...meshes.map((c) => c.year));
  const lastMesh = meshes.reduce((a, b) => (a.year > b.year ? a : b));
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={8}
      title="案例研究"
      en="Case Studies"
      lede={t(
        '前七章讲的是选择空间，这一章讲别人选了什么。17 个芯片里，mesh 出现得最多，wormhole 几乎无处分没有，虚拟信道却只在需要的时候才出现——这不是巧合，是面积、带宽和验证成本三本账算出来的。',
        'The last seven chapters described the space of choices; this one describes the choices people made. Across seventeen chips, meshes dominate, wormhole is almost universal, and virtual channels appear only where needed — not coincidence, but the arithmetic of area, bandwidth and verification.'
      )}
    />

    <div class="prose">
      <h3><span class="h-no">8.1</span>{t('把尺寸代进同一套公式', 'Drop each chip’s dimensions into the same formulas')}</h3>
      {#if en}
        <p>
          The table below is not a summary of the book’s descriptions — it is what those descriptions measure out to.
          For every chip whose topology is one of the four regular families, the graph is rebuilt from its published
          dimensions, then diameter, average hop count and bisection are measured on it. A 12×14 CNN mesh and a 4×4
          compute mesh are then comparable on the same axis.
        </p>
      {:else}
        <p>
          下面这张表不是对书中描述的复述，而是那些描述量出来的结果。凡是拓扑属于四类规则族的芯片，
          都按其公开尺寸重建图，再在图上量直径、平均跳数与对剖。于是一块 12×14 的 CNN 网格和一块 4×4 的计算网格，
          就落在了同一根轴上。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 8.1', 'Figure 8.1')}
      caption={t(
        '点芯片看它的图与四个数；表格按年份排，条形是对剖。KAIST 与 STNoC 不是规则族，不参与这组比较。',
        'Pick a chip to see its graph and four numbers; the table is ordered by year, bars are bisection. KAIST and STNoC are not regular families, so they sit out this comparison.'
      )}
    >
      <CaseLab />
    </Figure>

    <div class="prose">
      <h3><span class="h-no">8.2</span>{t('三条反复出现的规律', 'Three patterns that keep recurring')}</h3>
      {#if en}
        <p>
          <b>Meshes win on regularity.</b> {meshes.length} of the {CASES.length} chips here are meshes, from {meshYear}
          to {lastMesh.year}. The reason is boring and decisive: layout, timing closure and verification all get easier
          when every tile is identical, and the diameter penalty is acceptable at 8×8 to 12×14 sizes.
        </p>
        <p>
          <b>Wormhole is the default; virtual channels are not.</b> Piton and Knights Landing both ship wormhole
          routers with no VCs at all, and keep deadlock away with routing restrictions and a single physical network per
          message class. VCs appear where one physical network must carry several classes — Anton 2 at the dateline,
          Tilera across its six meshes.
        </p>
        <p>
          <b>Broadcast and multicast show up where the workload is a pipeline.</b> Eyeriss multicasts a filter to every
          PE that needs it; the MIT Broadcast NoC routes writes over XY trees. When the same data goes to many
          destinations, replication at the source is the wrong answer.
        </p>
      {:else}
        <p>
          <b>规则性让 mesh 赢。</b>这里 {CASES.length} 个芯片中有 {meshes.length} 个是 mesh，从 {meshYear} 到 {lastMesh.year}。
          理由既不性感也不可辩驳：每个格点完全相同时，布局、时序收敛与验证都会变简单，
          而在 8×8 到 12×14 这个尺度上，直径的代价是可以接受的。
        </p>
        <p>
          <b>wormhole 是默认值，虚拟信道不是。</b>Piton 与 Knights Landing 都是没有 VC 的 wormhole 路由器，
          靠路由限制和“每类消息一条物理网络”把死锁挡在外面。VC 出现在一条物理网络必须承载多类消息的地方——
          Anton 2 的 dateline，Tilera 的六张 mesh。
        </p>
        <p>
          <b>只有当负载是流水线时才出现广播与多播。</b>Eyeriss 把一份 filter 多播给所有需要的 PE；
          MIT Broadcast NoC 用 XY 树路由写操作。同一份数据要去很多目的地时，在源头复制是最差的答案。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 8.2', 'Figure 8.2')}
      caption={t(
        '按拓扑类型看这些芯片。mesh 占了绝大多数；ring 与 crossbar 各自出现在很具体的场景里。',
        'The same chips by topology family. Meshes dominate; rings and crossbars each appear in a very specific niche.'
      )}
    >
      <div class="groups">
        <div class="group">
          <span class="g-label">{t('mesh / torus', 'mesh / torus')}</span>
          <span class="g-count mono">{meshes.length}</span>
          <div class="g-list">
            {#each meshes as c}
              <span class="g-item">{c.name} <i class="mono">{c.w}×{c.h}</i></span>
            {/each}
          </div>
        </div>
        <div class="group">
          <span class="g-label">ring</span>
          <span class="g-count mono">{rings.length}</span>
          <div class="g-list">
            {#each rings as c}
              <span class="g-item">{c.name} <i class="mono">{c.w}</i></span>
            {/each}
          </div>
        </div>
        <div class="group">
          <span class="g-label">{t('crossbar / 分层', 'crossbar / hierarchical')}</span>
          <span class="g-count mono">{others.length}</span>
          <div class="g-list">
            {#each others as c}
              <span class="g-item">{c.name}</span>
            {/each}
          </div>
        </div>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">8.3</span>{t('三个反例值得记住', 'Three counter-examples worth remembering')}</h3>
      <p>
        {t(
          `Swizzle Switch 在 64 个端口上直接做一个交叉开关，用 4.5 Tb/s 证明“拓扑简单”有时能换来更大的带宽，代价是面积随端口平方增长、只能服务于特定流量。IBM Cell 则用一条四环的 ring 连接 PPE 与 SPE，因为它要连的东西本来就只有 9 个，而 ring 上的往返时间恰好适合它的流水线。`,
          `Swizzle Switch builds a single crossbar across 64 ports and reaches 4.5 Tb/s — proof that a simple topology can buy bandwidth, at the cost of area growing with the square of the port count and a narrow traffic profile. IBM Cell instead uses a four-ring interconnect for its PPE and SPEs, because it only had nine things to connect and the ring’s round trip happened to fit its pipeline.`
        )}
      </p>
      <p>
        {t(
          `第三个反例是 MIT 的 SCORPIO：它在无序的 6×6 mesh 上做侦听一致性，靠的不是给 mesh 加 VC，而是另开一条无缓冲的广播网络专管“定序”。主网络随便乱序送数据，notification 网络用 OR 树把顺序钉死。这提醒一件事——网络不必只有一张，“搬数据的那张”和“定顺序的那张”可以分开设计，代价是两块面积与两套验证。`,
          `A third counter-example is MIT’s SCORPIO: it runs snoopy coherence over an unordered 6×6 mesh not by adding VCs but by adding a second, bufferless broadcast network that only fixes order. The main network delivers data in any order; the notification network pins the order down with OR-trees. The lesson is that a design does not need one network — “the one that moves data” and “the one that fixes order” can be separate, at the cost of two areas and two verification stories.`
        )}
      </p>
      <p>
        {t(
          `还有 Oracle Sparc T5：8 组 L2、8 个 L3 bank 与 IO 之间干脆一个 8×9 交叉开关（72 个终端），1 TB/s。终端只有十来个的时候，交叉开关的 P² 面积还付得起，mesh 平均几跳的延迟反而更贵。这也是第 6 章那张面积表的意义：P 小的时候，最简单的拓扑就是最便宜的。`,
          `Then Oracle’s Sparc T5: eight L2 pairs, eight L3 banks and IO joined by a single 8×9 crossbar (72 terminals) at 1 TB/s. With only a dozen-ish endpoints the P² crossbar area is still affordable, while a mesh’s multi-hop latency is the expensive part. That is the point of the area table in Chapter 6: for small P, the simplest topology is the cheapest.`
        )}
      </p>
      <div class="note">
        <b>{t('读案例的方法：', 'How to read a case study: ')}</b>
        {t(
          '不要问“它为什么不用 mesh”，要问“它的约束是什么”。加速器的约束是数据复用，跑 Linux 的多核约束是 cache 一致性与验证成本，跨 die 的约束是长线与可靠性。拓扑只是一个答案，约束才是题目。',
          'Do not ask why it did not use a mesh; ask what its constraints were. An accelerator’s constraint is data reuse, a Linux-capable multicore’s is coherence and verification cost, a cross-die link’s is wire length and reliability. The topology is an answer; the constraints are the question.'
        )}
      </div>
    </div>

    <div class="prose">
      <div class="pull">
        {t(
          '没有一个案例是“因为拓扑好”而成功的；它们都是“在约束下代价最小”。',
          'None of these chips succeeded because the topology was good; they succeeded because it was the cheapest answer to their constraints.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">8.4</span>{t('自测', 'Check yourself')}</h3>
      <Quiz
        questions={[
          {
            q: t('为什么 Piton 与 KNL 敢不用虚拟信道？', 'Why can Piton and KNL get away without virtual channels?'),
            options: [
              t('因为它们的核数少', 'Because they have few cores'),
              t('因为每类消息走独立的物理网络，且路由避开了成环', 'Each message class has its own physical network, and routing avoids cycles'),
              t('因为缓冲足够深', 'Because their buffers are deep')
            ],
            answer: 1,
            why: t('多头网络 + 受限路由把“多条流争一个缓冲”和“环”两个问题同时消掉；代价是线更多。', 'Multiple physical networks plus restricted routing remove both buffer sharing and cycles at once — and pay in wires.')
          },
          {
            q: t('Eyeriss 为什么需要多播？', 'Why does Eyeriss need multicast?'),
            options: [
              t('因为 PE 很多，一份 filter 要被很多 PE 同时使用', 'Many PEs consume the same filter at the same time'),
              t('因为它的 mesh 太小', 'Because its mesh is too small'),
              t('因为多播比单播省面积', 'Because multicast is cheaper in area')
            ],
            answer: 0,
            why: t('CNN 的数据复用是结构性的：同一份权重在空间上广播到整层 PE，源头复制等于把同一份流量发 N 次。', 'CNN reuse is structural: one weight goes to a whole layer of PEs, and replicating at the source means sending the same traffic N times.')
          },
          {
            q: t('12×14 mesh 的直径是多少？', 'What is the diameter of a 12×14 mesh?'),
            options: [
              t('24', '24'),
              t('26', '26'),
              t('168', '168')
            ],
            answer: 0,
            why: t('直径是两个维度最远距离之和：(12−1)+(14−1)=24。这一页上的数都是这样算出来的。', 'Diameter is the sum of the furthest distance in each dimension: (12−1)+(14−1) = 24. Every number on this page is computed this way.')
          }
        ]}
      />
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => navigate('/book/memory-primer')}>
          <span class="next-no display">01</span>
          <strong>{t('读另一本：共享内存图谱', 'Read the other book: Shared Memory Atlas')}</strong>
          <span>{t('网络之上的那一层：一致性协议怎么用它。', 'The layer above the network: what coherence does with it.')}</span>
        </button>
        <button class="next-card" onclick={() => open('ch7')}>
          <span class="next-no display">07</span>
          <strong>{t('回到评估', 'Back to evaluation')}</strong>
          <span>{t('把这些芯片的尺寸代进曲线，看谁离饱和更远。', 'Feed these dimensions into the curve and see who is furthest from saturation.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .groups {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 13px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 11px;
  }

  .g-label {
    font-size: 9.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .g-count {
    font-size: 22px;
    color: var(--accent-deep);
  }

  .g-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 4px;
    padding-top: 6px;
    border-top: 1px solid var(--line-2);
  }

  .g-item {
    font-size: 10.5px;
    line-height: 1.5;
    color: var(--ink-3);
  }

  .g-item i {
    color: var(--muted);
    font-style: normal;
    font-size: 9.5px;
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
    .groups,
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
