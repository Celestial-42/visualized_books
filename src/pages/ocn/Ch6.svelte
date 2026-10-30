<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import RouterLab from '../../components/noc/RouterLab.svelte';
  import AllocatorOrgLab from '../../components/noc/AllocatorOrgLab.svelte';
  import { lang, t } from '../../lib/lang.svelte';
  import { navigate } from '../../lib/router.svelte';
  import { pipeline, zeroLoadLatency } from '../../lib/noc/router';

  const en = $derived(lang.value === 'en');
  const open = (slug: string) => navigate(`/book/on-chip-networks/${slug}`);

  const base = pipeline({ vcs: 2, speculate: false, lookahead: false });
  const spec = pipeline({ vcs: 2, speculate: true, lookahead: false });
  const look = pipeline({ vcs: 2, speculate: false, lookahead: true });

  /** crossbar cost grows with the square of the port count, and again with speedup */
  const crossbarRows = [4, 8, 16, 32, 64].map((ports) => ({
    ports,
    area1: ports * ports,
    area2: ports * ports * 2
  }));
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={6}
      title="路由器微架构"
      en="Router Microarchitecture"
      lede={t(
        '路由器是网络里唯一“要花面积”的东西。它每拍做的事情固定：收 flit、算路由、分配 VC、分配交叉开关、穿过去。所有的设计选择，最后都落在“这几拍能不能合并”和“缓冲放在哪”上。',
        'The router is where all the area goes. What it does each cycle is fixed: buffer a flit, compute the route, allocate a VC, allocate the crossbar, traverse. Every design choice ends up as “can these cycles merge” and “where does the buffer sit”.'
      )}
    />

    <div class="prose">
      <h3><span class="h-no">6.1</span>{t('一个 VC 路由器的结构', 'Anatomy of a VC router')}</h3>
      {#if en}
        <p>
          A virtual-channel router has four blocks. <b>Input buffers</b> hold flits per VC. <b>Routing</b> computes the
          output from the head flit. <b>Allocation</b> decides which input VC gets which output VC this cycle.
          <b>Switch</b> moves the granted flits. Everything interesting is about who can do their job in parallel.
        </p>
      {:else}
        <p>
          一个虚拟信道路由器有四个部分。<b>输入缓冲</b>按 VC 存 flit。<b>路由</b>用头 flit 算出输出端口。
          <b>分配</b>决定这个周期哪个输入 VC 拿到哪个输出 VC。<b>交叉开关</b>把获批的 flit 送过去。
          所有有意思的讨论，都是关于“谁可以和谁并行”。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 6.1', 'Figure 6.1')}
      caption={t(
        '五级流水：缓冲写入、路由计算、VC 分配、交换分配、交叉开关/链路。带环的箭头是“下一拍才能用这个结果”。',
        'Five stages: buffer write, route compute, VC allocation, switch allocation, switch and link traversal. A looped arrow means the result is only usable next cycle.'
      )}
    >
      <div class="pipe-art">
        <svg viewBox="0 0 660 150" fill="none" aria-hidden="true">
          {#each [
            { x: 8, label: 'BW', sub: t('缓冲写入', 'buffer write') },
            { x: 136, label: 'RC', sub: t('路由计算', 'route compute') },
            { x: 264, label: 'VA', sub: t('VC 分配', 'VC alloc') },
            { x: 392, label: 'SA', sub: t('交换分配', 'switch alloc') },
            { x: 520, label: 'ST', sub: t('交叉开关', 'switch traversal') }
          ] as s, i}
            <rect x={s.x} y="38" width="110" height="52" rx="10" class="stage" class:last={i === 4} />
            <text x={s.x + 55} y="60" class="stage-k mono" text-anchor="middle">{s.label}</text>
            <text x={s.x + 55} y="76" class="stage-l" text-anchor="middle">{s.sub}</text>
            {#if i < 4}
              <path d={`M${s.x + 112} 64H${s.x + 126}`} class="arrow" marker-end="url(#pipe)" />
            {/if}
          {/each}
          <defs>
            <marker id="pipe" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#2f5d62" />
            </marker>
          </defs>
          <path d="M447 96V118H319V96" class="loop" marker-end="url(#pipe)" />
          <text x="383" y="132" class="loop-l" text-anchor="middle">{t('分配失败 → 下一拍重来', 'allocation fails → retry next cycle')}</text>
          <text x="8" y="24" class="stage-note">{t('头 flit 走完整条流水；尾随 flit 只走 BW 与 ST', 'the head flit walks the whole pipeline; body flits only need BW and ST')}</text>
        </svg>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">6.2</span>{t('缓冲：面积的真正主人', 'Buffers: where the area actually goes')}</h3>
      {#if en}
        <p>
          In a typical router, buffers are 40–60% of the area and a large share of the power. That single fact explains
          most of the architecture: wormhole instead of store-and-forward, virtual channels instead of separate
          physical links, and buffer sharing between ports when traffic is uneven.
        </p>
        <p>
          The input VC also carries a small state machine: <em>idle</em>, <em>routing</em>, <em>waiting for a VC</em>,
          <em>waiting for the switch</em>, <em>active</em>. Credit counters live here too, and they are why backpressure
          costs a few flops per hop.
        </p>
        <p>
          Where the buffer sits is a separate choice. Dedicated per input port per VC is easy to write and verify, but
          the buffers of an idle port cannot help a busy one. A shared buffer pools all inputs into one store, saving
          thirty to fifty percent of the area at the cost of address management and more read/write ports. Between them
          sits sharing across VCs inside one port. The difference is not “how big”, it is “whose idle space can be
          borrowed”.
        </p>
      {:else}
        <p>
          典型路由器里，缓冲占面积的四到六成，也是功耗的大头。仅这一条就解释了大部分架构选择：
          用 wormhole 而不是 store-and-forward，用虚拟信道而不是多套物理链路，以及在流量不均匀时让端口共享缓冲。
        </p>
        <p>
          输入 VC 还带一个小状态机：<em>空闲</em>、<em>路由中</em>、<em>等 VC</em>、<em>等开关</em>、<em>活跃</em>。
          credit 计数器也在这里，这就是反压为什么每跳要花几个触发器。
        </p>
        <p>
          缓冲怎么摆是另一个选择。最直接是“每个输入端口、每条 VC 各一块”，好写也好验，但流量偏向某一个端口时，
          别的端口的缓冲只能闲着。另一种是共享缓冲：所有输入共用一个存储池、按需分配，面积能省下三到五成，
          代价是地址管理与更多的读写端口。介于两者之间的是“端口内跨 VC 共享”。三种方案的区别不在“多大”，
          而在“忙的时候谁能借用谁的空闲”。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">6.3</span>{t('交叉开关：speedup 与 slicing', 'The crossbar: speedup and slicing')}</h3>
      {#if en}
        <p>
          A crossbar is an N×N switch: any input to any output in one cycle, provided no two want the same output.
          Two standard tricks reduce its cost. <b>Speedup</b> runs the crossbar faster than the links, so a burst can
          be drained in fewer cycles. <b>Slicing</b> splits the crossbar by bit-width or by port group, trading a
          little throughput for a large cut in area and arbitration complexity.
        </p>
      {:else}
        <p>
          交叉开关是一个 N×N 的开关：任意输入到任意输出，一拍可达，前提是没有两个输入抢同一个输出。
          两个常规手段降低它的代价。<b>speedup</b> 让交叉开关跑得比链路快，于是突发能在更少周期里排空。
          <b>slicing</b> 按位宽或按端口组把交叉开关切开，用少量吞吐换面积与仲裁复杂度的大幅下降。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 6.3', 'Figure 6.3')}
      caption={t(
        '交叉开关的相对面积随端口数平方增长，speedup 再乘一次。这就是为什么 64 端口的 Swizzle 要用完全不同的实现，而 Sparc T5 的 8×9 交叉开关面积已经约等于一个半 L3 bank。',
        'Relative crossbar area grows with the square of the port count, and speedup multiplies it again. That is why 64-port Swizzle needed a different implementation, and why Sparc T5’s 8×9 crossbar already rivals one and a half L3 banks in area.'
      )}
    >
      <div class="table-wrap">
        <table class="table">
        <thead>
          <tr>
            <th>{t('端口数', 'Ports')}</th>
            <th>{t('相对面积（speedup 1）', 'Relative area (speedup 1)')}</th>
            <th>{t('相对面积（speedup 2）', 'Relative area (speedup 2)')}</th>
            <th>{t('相对面积（slicing 4 组）', 'Relative area (4 slices)')}</th>
          </tr>
        </thead>
        <tbody>
          {#each crossbarRows as row}
            <tr>
              <td class="num">{row.ports}</td>
              <td class="num">{row.area1}</td>
              <td class="num">{row.area2}</td>
              <td class="num">{(row.area1 / 4).toFixed(0)}</td>
            </tr>
          {/each}
        </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Slicing looks like free area in that table, and it is not: four slices of a 16-port crossbar only connect
          within their own group unless you add a second stage. What you have really bought is a cheaper router for
          traffic that stays local, and a bigger problem for traffic that does not.
        </p>
      {:else}
        <p>
          表里 slicing 的那一列看起来是白送的面积，其实不是：把一个 16 端口的交叉开关切成 4 组，
          没有第二级的话组间就不通了。你真正买到的是“局部流量的便宜路由器”，以及“非局部流量更难处理”。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">6.4</span>{t('分配与仲裁：每拍都要做的选择', 'Allocation and arbitration: a choice every cycle')}</h3>
      {#if en}
        <p>
          Allocation is a matching problem: inputs have requests, outputs can serve one each. A separable allocator
          breaks it into two rounds — inputs pick, then outputs pick — which is cheap, and can leave a match on the
          table. Figure 6.2 opens on exactly such a matrix: three pairs when four are possible.
        </p>
        <p>
          Arbitration inside an input picks one of its VCs; round-robin treats everyone equally, a matrix arbiter can
          express priority.
        </p>
      {:else}
        <p>
          分配是一个匹配问题：输入有请求，输出每个只能服务一个。分离式分配器把它拆成两轮——输入先挑，输出再挑——
          代价低，但会把本可以配上的组合留在桌上。图 6.2 的默认矩阵就是这种情形：明明能配 4 对，两轮只配到 3 对。
        </p>
        <p>
          输入内部的仲裁则是在几条 VC 里选一个；轮询一视同仁，矩阵仲裁可以表达优先级。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 6.2', 'Figure 6.2')}
      caption={t(
        '点格子改请求矩阵，看两轮贪心比最优匹配少几对；右边的流水线开关实时改“每跳几拍”，零负载延迟随之计算。',
        'Toggle cells to change the request matrix and watch the gap between two greedy rounds and the optimum. The pipeline switches on the right change cycles per hop, and the zero-load latency is recomputed.'
      )}
    >
      <RouterLab />
    </Figure>

    <div class="prose">
      <h3><span class="h-no">6.4.1</span>{t('wavefront：用对角线再抢回一对', 'Wavefront: winning a match back with diagonals')}</h3>
      {#if en}
        <p>
          A separable allocator commits to its first-phase choices and cannot undo them. A wavefront allocator exploits a
          property of the matrix instead: requests with the same (input + output) mod N never share an input or an
          output, so one diagonal of the matrix can be granted in a single cycle with no conflict at all. Walk the
          diagonals in order and you get a maximal matching per pass; rotate the starting diagonal and take three
          passes, and the best of them usually beats the two-phase greedy.
        </p>
        <p>
          The lab’s default matrix is exactly that case: separable gets three pairs, the three wavefront passes find
          three, four and three, and the optimum is four. The extra pair was hidden in the choice the first phase made
          and could not take back.
        </p>
      {:else}
        <p>
          分离式分配器一旦在第一轮做了选择就不能反悔。wavefront 利用的是矩阵本身的性质：
          (输入 + 输出) mod N 相同的请求既不会抢同一个输入、也不会抢同一个输出，
          所以一条对角线可以在同一拍里全部批准，完全无冲突。按对角线顺序扫一遍就是一次极大匹配；
          换一个起始对角线再扫，三轮里取最好的那个，通常就能超过两轮贪心。
        </p>
        <p>
          实验里的默认矩阵正是这种情形：分离式配到 3 对，wavefront 三轮分别配到 3 / 4 / 3 对，最优是 4 对。
          多出来的那一对，就藏在第一轮做了一个没办法撤回的选择里。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">6.4.2</span>{t('分配器组织：路由函数返回几个候选，决定它长什么样', 'Allocator organisation: how many candidates decide its shape')}</h3>
      {#if en}
        <p>
          A deterministic routing function names exactly one output, so the allocator only has to bid for it. An adaptive
          function may name several, and that choice is what shapes the hardware. Three organisations are common: bid for
          one candidate and reroute when the bid loses (cheap logic, unpredictable latency); let the routing function hand
          back one candidate chosen on the fly; or offer every candidate at once, folding the choice into the first
          arbitration stage.
        </p>
        <p>
          The trade is visible in the fan-in. With V virtual channels per input and c candidates, offering everything turns
          the first stage into V×c : 1 arbiters, and buys the best matching a single round can reach. Bidding one
          candidate keeps the arbiter narrow and pays with retries.
        </p>
      {:else}
        <p>
          确定性路由只给出一个输出，分配器只为它投标就够了；自适应路由可能给出好几个，而“给几个”直接决定硬件长什么样。
          常见三种组织：只投一个候选、失败再重路由（逻辑最省、延迟不确定）；让路由函数当场先定一个（折中）；
          把所有候选一起投出去，把“选哪个”并进第一级仲裁。
        </p>
        <p>
          取舍体现在扇入上：每个输入有 V 条 VC、c 个候选时，“全投”会把第一级变成 V×c : 1 的仲裁器，
          换来的是一轮分配就能达到的最好匹配；“只投一个”让仲裁器保持窄，代价是可能要重试。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 6.4', 'Figure 6.4')}
      caption={t(
        '三种组织方式在 4 端口、每端口 3 条 VC 下的结构，以及同一张“每 VC 两个候选”矩阵上能配到的对数。候选数 c 可调，扇入随之变化。',
        'The three organisations for a four-port router with three VCs per port, and how many pairs each can match on the same “two candidates per VC” matrix. Drag c to watch the fan-in move.'
      )}
    >
      <AllocatorOrgLab />
    </Figure>

    <div class="prose">
      <h3><span class="h-no">6.5</span>{t('三种流水线，三个数字', 'Three pipelines, three numbers')}</h3>
      {#if en}
        <p>
          The canonical pipeline is five stages. Speculation merges VC and switch allocation into one cycle and saves
          one; a lookahead bypass lets switch traversal overlap with allocation and saves another. Both buy cycles with
          timing pressure — which is why the number that matters is not “how many stages” but “what does the critical
          path allow at your frequency”.
        </p>
      {:else}
        <p>
          经典流水线是五级。投机把 VC 分配与交换分配并进一拍，省一级；lookahead bypass 让交叉开关穿越与分配重叠，
          再省一级。两者都是拿时序压力换周期——所以真正重要的不是“分几级”，而是“在你的频率下关键路径允许你分几级”。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 6.5', 'Figure 6.5')}
      caption={t(
        '三种配置下，4 跳、4 flit 的包的零负载延迟。全部由上面的流水线级数算出：hops × 每跳 + 序列化。',
        'Zero-load latency of a 4-hop, 4-flit packet under three configurations — all computed as hops × per-hop + serialisation.'
      )}
    >
      <div class="pipes">
        {#each [
          { name: t('基础', 'baseline'), p: base },
          { name: t('投机', 'speculative'), p: spec },
          { name: t('lookahead', 'lookahead'), p: look }
        ] as row}
          <div class="pipe-card">
            <span class="pc-name">{row.name}</span>
            <b class="mono">{row.p.perHop}</b>
            <span class="pc-sub">{t('拍/跳', 'cycles/hop')}</span>
            <span class="pc-lat mono">{zeroLoadLatency(4, row.p.perHop, 4)} {t('拍', 'cycles')}</span>
          </div>
        {/each}
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">6.6</span>{t('功耗与物理实现', 'Power and physical reality')}</h3>
      <p>
        {t(
          '路由器的功耗分两部分：动态功耗来自开关翻转，交叉开关与链路驱动器是大头；漏电来自缓冲。所以低功耗路由器做的第一件事往往是“关掉没人用的 VC”，第二件事是缩短交叉开关的输入数。到了 floorplan，缓冲要不要贴边、交叉开关放在中间还是拆成几条，都会反过来影响线延迟与频率。',
          'Router power splits in two: dynamic power from toggling, dominated by the crossbar and link drivers; leakage from buffers. So a low-power router usually first gates unused VCs, then shrinks the crossbar’s input count. In floorplanning, whether buffers hug the edge and whether the crossbar sits in the middle or splits into lanes feeds straight back into wire delay and frequency.'
        )}
      </p>
    </div>

    <div class="prose">
      <div class="pull">
        {t(
          '流控决定“谁能发”，微架构决定“发一次要几拍”；两者相乘，才是这个路由器真实的代价。',
          'Flow control decides who may send; microarchitecture decides how many cycles one send takes. Multiply the two and you have the router’s real cost.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">6.7</span>{t('自测', 'Check yourself')}</h3>
      <Quiz
        questions={[
          {
            q: t('为什么路由器面积的大头通常是缓冲？', 'Why are buffers usually the largest part of a router?'),
            options: [
              t('因为 SRAM 比逻辑贵', 'Because SRAM is more expensive than logic'),
              t('因为每条 VC 的深度 × 端口数 × 位宽，乘起来很快超过交叉开关', 'Depth × ports × width per VC quickly exceeds the crossbar'),
              t('因为缓冲要跑更快的时钟', 'Because buffers need a faster clock')
            ],
            answer: 1,
            why: t('4 端口 × 4 VC × 8 flit × 64 bit 就已是一大块 SRAM；交叉开关随端口数平方增长，但常数更小。', 'Four ports × four VCs × eight flits × 64 bits is already a large SRAM; a crossbar grows with the square of the port count but with a much smaller constant.')
          },
          {
            q: t('分离式分配器为什么不是最优匹配？', 'Why is a separable allocator not an optimal matching?'),
            options: [
              t('因为输入和输出分两轮挑，第二轮拿不到第一轮剩下的最优组合', 'Inputs and outputs pick in separate rounds, so the second round cannot recover the best combination'),
              t('因为它只能用轮询', 'Because it can only use round-robin'),
              t('因为它不支持多播', 'Because it cannot multicast')
            ],
            answer: 0,
            why: t('两轮贪心会互相踩：I0 抢走 O0，而 I1 只请求 O0，于是空出一个输入。最优匹配会配 4 对，两轮只配 3 对。', 'Two greedy rounds step on each other: I0 takes O0, and I1 only asked for O0, so an input goes idle. The maximum matching here is four pairs; two rounds get three.')
          },
          {
            q: t('“投机”省下的一拍是用什么换的？', 'What does speculation trade for its saved cycle?'),
            options: [
              t('额外的缓冲', 'Extra buffers'),
              t('时序压力：分配必须在一拍内完成', 'Timing pressure: allocation must finish in one cycle'),
              t('路由的正确性', 'Routing correctness')
            ],
            answer: 1,
            why: t('把 VA 与 SA 合并缩短了流水线，但关键路径变长，频率可能守不住。', 'Merging VA and SA shortens the pipeline but lengthens the critical path, and the frequency may not hold.')
          }
        ]}
      />
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => open('ch7')}>
          <span class="next-no display">07</span>
          <strong>{t('建模与评估', 'Modeling and evaluation')}</strong>
          <span>{t('把上面所有参数放进一个模型，画出延迟-吞吐曲线。', 'Put every parameter above into one model and draw the latency-throughput curve.')}</span>
        </button>
        <button class="next-card" onclick={() => open('ch5')}>
          <span class="next-no display">05</span>
          <strong>{t('回到流控', 'Back to flow control')}</strong>
          <span>{t('VC 的数目既是流控参数，也是这里的面积参数。', 'VC count is a flow-control parameter and an area parameter at the same time.')}</span>
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

  .pipe-art svg {
    width: 100%;
    height: auto;
  }

  .stage {
    fill: var(--card-2);
    stroke: var(--line);
  }

  .stage.last {
    fill: var(--accent-soft);
    stroke: #cfded9;
  }

  .stage-k {
    font-size: 11px;
    fill: var(--accent-deep);
    font-weight: 600;
  }

  .stage-l {
    font-family: 'Inter', sans-serif;
    font-size: 7.5px;
    fill: var(--muted);
  }

  .stage-note {
    font-family: 'Inter', sans-serif;
    font-size: 7.5px;
    fill: var(--muted);
  }

  .arrow {
    stroke: var(--accent);
    stroke-width: 1.1;
    fill: none;
    color: var(--accent);
  }

  .loop {
    stroke: var(--ember);
    stroke-width: 1;
    stroke-dasharray: 3 3;
    fill: none;
    color: var(--ember);
  }

  .loop-l {
    font-family: 'Inter', sans-serif;
    font-size: 7.5px;
    fill: var(--ember);
  }

  .pipes {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .pipe-card {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 14px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 11px;
  }

  .pc-name {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .pipe-card b {
    font-size: 26px;
    font-weight: 400;
    color: var(--ink);
  }

  .pc-sub {
    font-size: 10px;
    color: var(--muted);
  }

  .pc-lat {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--line-2);
    font-size: 11px;
    color: var(--accent-deep);
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
    .pipes,
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
