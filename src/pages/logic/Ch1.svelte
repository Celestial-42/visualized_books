<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import FifoLab from '../../components/logic/FifoLab.svelte';
  import FlagLab from '../../components/logic/FlagLab.svelte';
  import TimeLab from '../../components/logic/TimeLab.svelte';
  import DepthLab from '../../components/logic/DepthLab.svelte';
  import { analyzeDepth, depthExample } from '../../lib/logic/fifo';
  import { lang, t } from '../../lib/lang.svelte';
  import { navigate } from '../../lib/router.svelte';

  const en = $derived(lang.value === 'en');
  const open = (book: string, slug: string) => navigate(`/book/${book}/${slug}`);

  const depthRows = [
    { burst: 4, rate: 0.5, reaction: 1 },
    { burst: 8, rate: 0.5, reaction: 1 },
    { burst: 16, rate: 0.5, reaction: 2 },
    { burst: 16, rate: 0.25, reaction: 2 },
    { burst: 32, rate: 0.5, reaction: 4 }
  ].map((row) => ({ ...row, ...analyzeDepth({ burst: row.burst, readRate: row.rate, reaction: row.reaction }) }));
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={1}
      title="FIFO"
      en="First In, First Out"
      lede={t(
        'FIFO 的难点从来不是“存”，而是边界：满时再写会丢数，空时再读会拿到过期数据，而 full 与 empty 又必须赶在同一个时钟沿之前说清楚。本章先把 FIFO 拆成同步 FIFO 的五个问题，再用四个实验把每个结论跑一遍。',
        'The hard part of a FIFO is never storage but the boundary: a write when full loses data, a read when empty returns something stale, and full/empty must be settled before the same clock edge. This chapter splits FIFO into five synchronous questions and runs every verdict through an experiment.'
      )}
    />

    <div class="prose">
      {#if en}
        <p>
          A FIFO is a queue with two independent ports and one clock. The producer appends at the tail; the consumer
          removes from the head; order is preserved. Nothing shifts: the data stays in a memory array and two pointers
          walk around it. The only thing the FIFO promises is that the oldest unread word is the next one out.
        </p>
        <p>
          That promise becomes a contract at the clock edge. A write is accepted only when <code>wr_en && !full</code>;
          a read only when <code>rd_en && !empty</code>. The flags are not decoration: a false full throws away
          bandwidth, and a false empty either returns stale data or advances the read pointer past a word nobody read.
          A FIFO that is “almost right” is worse than no FIFO, because the failure appears once every million cycles.
          There is one refinement we will meet in §1.1.3: if a full FIFO serves a read in the same cycle, a lookahead
          policy may let the write use the slot that read frees. Read the rule literally for now.
        </p>
        <p>
          This chapter is deliberately single-clock. Every flop is sampled by the same edge, and both flags are defined
          in that clock. Crossing domains needs a different machine — Gray pointers, synchronisers, and a full/empty
          proof per domain — which is §1.2 here, with the general machinery in Chapter 2. Do not smuggle a binary
          pointer across a clock boundary and call it done; the extra bit that solves full/empty here does nothing for
          metastability.
        </p>
      {:else}
        <p>
          一个 FIFO 就是一块有两个独立端口、共用一个时钟的队列。生产者从尾部追加，消费者从头部取走，顺序不变。
          数据不搬家：它就待在存储阵列里，两个指针绕着它走。FIFO 唯一承诺的事，是“最旧的未读字就是下一个出来的字”。
        </p>
        <p>
          这个承诺在时钟沿上变成一份契约：只有 <code>wr_en && !full</code> 时写才算数，只有 <code>rd_en && !empty</code>
          时读才算数。full/empty 不是装饰：假的 full 会白白丢带宽，假的 empty 要么返回过期数据，要么把读指针推过一个没人读过的字。
          一个“差不多对”的 FIFO 比没有 FIFO 更危险，因为故障可能一百万拍才出现一次。§1.1.3 还会补一个细化：
          满 FIFO 在同一拍服务了读时，前视策略可以让写使用读腾出的位置；现在先按字面理解这条契约。
        </p>
        <p>
          本章刻意只讲单时钟：所有触发器由同一个沿采样，full/empty 也在这个时钟里定义。跨时钟是另一台机器——
          格雷码指针、同步器、以及在各自时钟域里分别成立的满空证明——那是 §1.2，更一般的机制在第 2 章。
          不要把二进制指针直接搬过时钟沿，这里多出来的那一位解决不了亚稳态。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 1.1', 'Figure 1.1')}
      caption={t(
        '同步 FIFO 的端口契约。full/empty 必须在时钟沿之前已经稳定；almost_full/almost_empty 是提前量，不是第二个 full。',
        'The synchronous FIFO contract. full/empty must be stable before the edge; almost_full/almost_empty are early warning, not a second full.'
      )}
    >
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{t('信号', 'Signal')}</th>
              <th>{t('方向', 'Dir')}</th>
              <th>{t('含义', 'Meaning')}</th>
              <th>{t('规则', 'Rule')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="mono">clk</td>
              <td>{t('输入', 'in')}</td>
              <td>{t('唯一的采样时钟', 'the only sampling clock')}</td>
              <td>{t('所有端口在同一个上升沿动作', 'every port acts on the same rising edge')}</td>
            </tr>
            <tr>
              <td class="mono">wr_en / wr_data</td>
              <td>{t('输入', 'in')}</td>
              <td>{t('写请求与写入字', 'write request and word')}</td>
              <td>{t('wr_en && !full 时在沿上接收（满 + 同拍读可前视放行）', 'accepted when wr_en && !full (a lookahead policy may use a same-cycle read)')}</td>
            </tr>
            <tr>
              <td class="mono">full</td>
              <td>{t('输出', 'out')}</td>
              <td>{t('没有空位；再写会丢数', 'no free slot; another write loses data')}</td>
              <td>{t('必须与当前占用一致，不能滞后', 'must match occupancy; it may not lag')}</td>
            </tr>
            <tr>
              <td class="mono">rd_en / rd_data</td>
              <td>{t('输入 / 输出', 'in / out')}</td>
              <td>{t('读请求与读出字', 'read request and word')}</td>
              <td>{t('rd_en && !empty 时弹出队头', 'pops the head when rd_en && !empty')}</td>
            </tr>
            <tr>
              <td class="mono">empty</td>
              <td>{t('输出', 'out')}</td>
              <td>{t('没有未读字；再读无效', 'no unread word; another read is invalid')}</td>
              <td>{t('与队列内容一致，不是输出寄存器空', 'matches queue contents, not the output register')}</td>
            </tr>
            <tr>
              <td class="mono">almost_full / almost_empty</td>
              <td>{t('输出', 'out')}</td>
              <td>{t('提前量，供上游/下游刹车', 'early warning for either side')}</td>
              <td>{t('阈值可编程；不改变硬边界', 'programmable threshold; the hard boundary is unchanged')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">1.1</span>{t('同步 FIFO', 'Synchronous FIFO')}</h3>
      {#if en}
        <p>
          We will answer five questions in order: where the words live, how full and empty are decided, when read data
          becomes usable, how deep the FIFO must be, and what to check before trusting it. Each question has one
          experiment, and each experiment computes its own answer from the same engine the page uses for its prose.
        </p>
      {:else}
        <p>
          下面按顺序回答五个问题：字存在哪里、满空怎么判、读出什么时候算到手、深度要多少、以及流片前该检查什么。
          每个问题配一个实验，实验里的结论由页面同一套引擎现算，不是画上去的。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">1.1.1</span>{t('一块存储、两个指针', 'One memory, two pointers')}</h3>
      {#if en}
        <p>
          Take a memory of depth <code>D = 2^N</code>, one write port and one read port. The write pointer
          <code>wptr</code> points at the next free slot; the read pointer <code>rptr</code> points at the oldest
          unread word. A write stores at <code>wptr</code> and advances it; a read returns <code>mem[rptr]</code> and
          advances it. Both pointers wrap modulo <code>D</code>, which is why the array is called a ring.
        </p>
        <p>
          This layout maps directly onto a simple dual-port SRAM: one write address, one read address, no shifting,
          one word per cycle in each direction. The pointers are the only state besides the array. Occupancy is the
          number of valid words, <code>count = (wptr − rptr) mod 2D</code> if the pointers carry an extra bit, or a
          separate up/down counter. The low <code>N</code> bits are the address; the extra bit, when present, is what
          separates empty from full in the next section.
        </p>
        <p>
          Reading does not erase a cell. The slot still contains the old value after <code>rptr</code> moves on; it is
          simply outside the valid window. This is normal and saves a write on every read. It also means
          <b>validity comes from the pointers, never from the data</b>: a stale word and a live word are bit-identical
          in storage. If you debug a FIFO by looking at memory contents, you will see “data” in an empty FIFO and
          conclude the wrong thing.
        </p>
      {:else}
        <p>
          取一块深度为 <code>D = 2^N</code> 的存储，一个写端口、一个读端口。写指针 <code>wptr</code> 指向下一个空位，
          读指针 <code>rptr</code> 指向最旧的未读字。写把数据放进 <code>wptr</code> 再前进；读返回 <code>mem[rptr]</code>
          再前进。两个指针都按 <code>D</code> 回绕，所以这块阵列叫环形缓冲。
        </p>
        <p>
          这种布局直接映射到简单双端口 SRAM：一个写地址、一个读地址，不搬数据，每个方向每拍一个字。指针是阵列之外唯一的状态。
          占用字数可以写成 <code>count = (wptr − rptr) mod 2D</code>（指针多一位时），也可以单独维护一个加减计数器。
          低 <code>N</code> 位是地址；多出来的那一位，正是下一节用来区分空与满的东西。
        </p>
        <p>
          读出不会清空存储单元。读指针走开之后，那个格子仍然留着旧值，只是落在有效窗口之外。这既正常又省事——不必为每次读再写一次。
          但这也意味着<b>有效性只来自指针，绝不来自数据</b>：一个过期字和一个有效字在存储里长得一模一样。
          如果你靠“看存储内容”调试 FIFO，就会在空 FIFO 里看到数据，然后得出错误结论。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 1.2', 'Figure 1.2')}
      caption={t(
        '8 深同步 FIFO 工作台。填满看 full、排空看 empty、同拍读写看 count 是否原地不动；打开“允许违规”再写满一次，会看到最旧的字被覆盖、丢失计数加一。',
        'An 8-deep synchronous FIFO workbench. Fill it to see full, drain it to see empty, and use read+write to watch count stand still. Turn on violations and write once more when full: the oldest word is overwritten and the loss counter increments.'
      )}
    >
      <FifoLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Two details in the lab are worth pausing on. First, at full, <code>wptr</code> and <code>rptr</code> point at
          the same cell: the next free slot is also the oldest unread word. A write would overwrite exactly the word
          the next read wants. That is why “full” cannot be detected from the address alone, and why the loss counter
          increments the moment you allow the write.
        </p>
        <p>
          Second, the lab applies a read before a write in the same cycle. When the FIFO is full and you press
          “read + write”, the read frees a slot and the write fills it again, so <code>count</code> stays at
          <code>D</code> and no word is lost. Turn off “let the read free a slot” and the same click rejects the
          write: the conservative flag saw full at the start of the cycle. Both are legal designs; they differ in
          whether a full FIFO can sustain one word per cycle while both sides are active. We will price that choice in
          §1.1.3.
        </p>
      {:else}
        <p>
          实验里有两处值得停一下。第一，满的时候 <code>wptr</code> 和 <code>rptr</code> 指向同一个格子：
          下一个空位恰好就是最旧的未读字。此时再写，覆盖的正是下一次读想要的那个字。所以“满”不可能只靠地址判断，
          也正是你打开违规写之后，丢失计数会加一的原因。
        </p>
        <p>
          第二，实验在同一拍里先读后写。FIFO 满时按“同拍读写”，读先腾出一个位置，写又把它填上，
          于是 <code>count</code> 原地不动、也没有丢字。把“满时同拍读写”关掉，同一次点击就会拒绝写：
          保守的满标志在周期开始时就看到了 full。两种都是合法设计，差别只在“满 FIFO 在两侧同时活跃时还能不能每拍过一个字”。
          这个选择的账，§1.1.3 再算。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">1.1.2</span>{t('满与空：等号不能同时成立', 'Full and empty cannot share one equality')}</h3>
      {#if en}
        <p>
          Empty is easy: <code>wptr == rptr</code> (all address bits equal). Full is the problem: after
          <code>D</code> writes, the write pointer has wrapped all the way around and the two addresses are equal
          again. The same equality now means “full”. This is not a coding slip; it is a missing bit of state. There
          are three standard ways to supply it.
        </p>
        <p>
          <b>Extra pointer bit.</b> Make each pointer <code>N+1</code> bits. Empty is still “all bits equal”. Full is
          “the low <code>N</code> bits are equal, but the MSBs differ”. One extra flop per pointer, one <code>N</code>-bit
          compare, and the address is just the low bits. It is the cheapest fast solution, but it does not give you an
          almost threshold for free: an almost-full comparison needs an offset, not equality.
        </p>
        <p>
          <b>Counter.</b> Keep <code>count ∈ [0, D]</code>; full is <code>count == D</code>, empty is
          <code>count == 0</code>. A write increments, a read decrements, and a simultaneous read+write leaves it
          unchanged. The counter is exact, makes almost thresholds a simple comparison, and is the easiest scheme to
          reason about in a scoreboard. The cost is an up/down counter and two comparators in the flag path.
        </p>
        <p>
          <b>Registered flags.</b> When the comparator is too slow, register the verdict so it is ready at the start
          of the next cycle. The trap is <i>what</i> you register. It must be the <b>next-state</b> verdict, computed
          from today’s flags plus this cycle’s read and write. If you simply register today’s comparator, the
          flag lags by one state change: at <code>count = D−1</code> with a write, the delayed full is still 0, so the
          producer writes one extra word into a full FIFO; at <code>count = D</code> with a read, the delayed full
          stays 1, so you stall one cycle for nothing.
        </p>
        <p>
          Simultaneous read/write is where the schemes diverge in cost. The counter cancels naturally; the extra-bit
          pointers both advance; registered flags need the operation inputs in the next-state expression. If a full
          FIFO receives a read and a write in the same cycle, you must decide whether the read frees a slot for the
          write. A lookahead full expression says yes and keeps one word per cycle; a conservative one says no and
          inserts a bubble. Neither is wrong — but the choice must be the same in the flag, the write-enable gating
          and the verification.
        </p>
      {:else}
        <p>
          空很好判：<code>wptr == rptr</code>（地址位全部相等）。麻烦的是满：写完 <code>D</code> 个字之后，
          写指针绕了一整圈，两个地址又相等了，同一个等号现在表示“满”。这不是代码写错，而是少了一位状态。
          标准解法有三种。
        </p>
        <p>
          <b>指针多一位。</b>把两个指针都做成 <code>N+1</code> 位。空仍是“所有位相等”；满则是“低 <code>N</code> 位相等，
          但最高位相反”。代价是每个指针多一个触发器、一个 <code>N</code> 位比较器，地址仍取低位。这是最快也最便宜的做法，
          但它不白送 almost 阈值：almost_full 需要带偏移的比较，不是等号。
        </p>
        <p>
          <b>计数器。</b>维护 <code>count ∈ [0, D]</code>：<code>count == D</code> 为满，<code>count == 0</code> 为空。
          写加一、读减一，同拍读写抵消。计数器精确，almost 阈值只是一个比较，scoreboard 也最好写。
          代价是标志路径上多一个加减计数器与两个比较器。
        </p>
        <p>
          <b>寄存满/空。</b>比较器太慢时，把判定结果寄存一拍，让它在下一拍开头就绪。陷阱在于寄存<b>什么</b>：
          必须是<b>下一拍</b>的判定，由今天的标志加上本拍的读、写算出来。如果只是把今天的比较器打一拍，
          标志就会落后一次状态变化：<code>count = D−1</code> 且本拍写时，延迟后的 full 仍是 0，
          生产者会往已经满的 FIFO 里多写一个字；<code>count = D</code> 且本拍读时，延迟后的 full 仍为 1，
          你会白白停一拍。
        </p>
        <p>
          同拍读写是三种写法成本开始分叉的地方。计数器自然抵消；多一位指针两边都前进；寄存标志则必须把操作输入写进下一拍表达式。
          满 FIFO 在同一拍收到一读一写时，你得决定“读是否给写腾出位置”：带前视的 full 说可以，保持每拍一字；
          保守的 full 说不可以，插一个气泡。两者都不错——但标志、写使能门控和验证必须是同一个选择。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 1.3', 'Figure 1.3')}
      caption={t(
        '以 4 深为例：同样的低 2 位地址 10，左边是空、右边是满。多出来的最高位（010 对 110，或一个计数器）才是区分两者的那一位状态；只看地址永远解不开这个等号。',
        'Depth 4, so each pointer is three bits: the same low address 10 is empty on the left and full on the right. The extra MSB (010 versus 110, or a counter) is the missing state; the address alone can never tell them apart.'
      )}
    >
      <div class="eq-art">
        <svg viewBox="0 0 560 168" fill="none" aria-hidden="true">
          <g transform="translate(22 18)">
            <text x="0" y="0" class="eq-title">empty</text>
            {#each Array(4) as _, i}
              <rect x={i * 48} y="18" width="38" height="32" rx="6" class="eq-cell" class:hot={i === 2} />
              <text x={i * 48 + 19} y="38" class="eq-idx" text-anchor="middle">{i}</text>
            {/each}
            <path d="M115 54V68" class="eq-ptr" marker-end="url(#eqa)" />
            <text x="115" y="82" class="eq-cap" text-anchor="middle">rptr = wptr = 010</text>
            <text x="0" y="106" class="eq-note">
              {t('count = 0；两个指针完全相等', 'count = 0; both pointers identical')}
            </text>
          </g>

          <g transform="translate(300 18)">
            <text x="0" y="0" class="eq-title">full</text>
            {#each Array(4) as _, i}
              <rect x={i * 48} y="18" width="38" height="32" rx="6" class="eq-cell filled" class:hot={i === 2} />
              <text x={i * 48 + 19} y="38" class="eq-idx" text-anchor="middle">{i}</text>
            {/each}
            <path d="M115 54V68H56" class="eq-ptr" marker-end="url(#eqa)" />
            <path d="M115 54V68H174" class="eq-ptr acc" marker-end="url(#eqb)" />
            <text x="56" y="82" class="eq-cap" text-anchor="middle">rptr = 010</text>
            <text x="180" y="82" class="eq-cap acc" text-anchor="middle">wptr = 110</text>
            <text x="0" y="106" class="eq-note">
              {t('count = 4；低位相等，最高位相反', 'count = 4; same low bits, opposite MSBs')}
            </text>
          </g>

          <text x="280" y="150" class="eq-center" text-anchor="middle">
            {t('地址是 10，状态却不同', 'address 10, two different states')}
          </text>
          <defs>
            <marker id="eqa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#b4543a" />
            </marker>
            <marker id="eqb" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#2f5d62" />
            </marker>
          </defs>
        </svg>
      </div>
    </Figure>

    <Figure
      no={t('图 1.4', 'Figure 1.4')}
      caption={t(
        '同一拍、同一个 count，三种写法的对照。把深度设 8、占用设 7、操作选“写”，寄存卡会显示“两种写法有别”：下一拍已经满，延迟比较器却还给出 0。',
        'The same cycle and the same count under three schemes. Set depth 8, occupancy 7 and operation “write”: the register card reports “the two differ” — full next cycle, while the delayed comparator still says 0.'
      )}
    >
      <FlagLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          The lab’s stale case is the one that ships. A designer needs one more cycle of timing margin, registers the
          comparator, and the flag is now a cycle late at exactly the boundary that matters. The fix is not a faster
          comparator but a different equation: register the next-state verdict, computed from this cycle’s flags and
          operations. For the conservative policy (a full FIFO blocks the write),
          <code>full_next = (count == D−1 && write && !read) || (full && !read)</code>. For the lookahead policy the
          second term becomes <code>full && (!read || write)</code>, because a read only frees a slot if no write takes
          it in the same cycle. The empty mirror is analogous. The value that appears next cycle is then the truth for
          next cycle.
        </p>
        <p>
          Almost flags belong to the same family, but they are a policy, not a state. <code>almost_full</code> should
          assert early enough that the producer can stop before the last free slot is consumed: with a producer that
          takes <code>R</code> cycles to react and writes one word per cycle, the threshold is
          <code>depth − R</code>. If you set it by taste instead of arithmetic, the hard full becomes the thing that
          stops the producer, which is exactly the case that overflows when the reaction is late.
        </p>
      {:else}
        <p>
          实验里的“落后一拍”才是会流片的那一种。设计者想多要一拍时序余量，把比较器寄存了，于是标志恰好在最要命的边界上晚了一拍。
          解法不是换更快的比较器，而是换一条式子：寄存“下一拍判定”，由本拍的标志与操作算出来。
          保守策略（满时挡住写）下，<code>full_next = (count == D−1 && write && !read) || (full && !read)</code>；
          前视策略（满时若有读，写可以放行）下，第二项变成 <code>full && (!read || write)</code>——
          读只有在同拍没有写占用这个空位时，才真的让 FIFO 变不满。empty 同理。下一拍出现的值，才是下一拍的真相。
        </p>
        <p>
          almost 标志是同一家人，但它是策略，不是状态。<code>almost_full</code> 要早到“生产者还来得及停”：
          如果生产者从看到标志到真正停手需要 <code>R</code> 拍，并且每拍写一个字，阈值就应设成
          <code>depth − R</code>。如果凭感觉设，最后挡住生产者的就是硬 full——而那恰好是反应稍晚就会溢出的场景。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 1.5', 'Figure 1.5')}
      caption={t(
        '满空判定的四种写法。前三种都正确，第四种（直接延迟比较器）是常见错误；它只在边界上出错，所以最容易通过随机测试。',
        'Four ways to decide full/empty. The first three are correct; the fourth (delayed comparator) is the common bug. It fails only at the boundary, which is why random tests miss it.'
      )}
    >
      <div class="table-wrap">
        <p class="table-hint">{t('左右滑动查看全部列', 'scroll sideways for all columns')}</p>
        <table class="table wide-table">
          <thead>
            <tr>
              <th>{t('写法', 'Scheme')}</th>
              <th>{t('需要的状态', 'State')}</th>
              <th>full</th>
              <th>empty</th>
              <th>{t('代价 / 陷阱', 'Cost / trap')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t('计数器', 'counter')}</td>
              <td class="mono">count ∈ [0, D]</td>
              <td class="mono">count == D</td>
              <td class="mono">count == 0</td>
              <td>{t('加减计数器；almost 阈值最方便', 'up/down counter; easiest almost thresholds')}</td>
            </tr>
            <tr>
              <td>{t('指针多一位', 'extra pointer bit')}</td>
              <td class="mono">wptr, rptr (N+1 bit)</td>
              <td class="mono">{t('低位相等 && 最高位相反', 'low bits equal && MSBs differ')}</td>
              <td class="mono">wptr == rptr</td>
              <td>{t('两个指针各多一个触发器；almost 需偏移比较', 'one extra flop per pointer; almost needs an offset compare')}</td>
            </tr>
            <tr>
              <td>{t('寄存下一拍判定', 'register next-state flags')}</td>
              <td class="mono">{t('full_r, empty_r + 本拍输入', 'full_r, empty_r + this cycle’s inputs')}</td>
              <td class="mono">full_next</td>
              <td class="mono">empty_next</td>
              <td>{t('时序好；下一拍开头就绪，不能直接延迟比较器', 'better timing; ready at the next cycle — never simply delay the comparator')}</td>
            </tr>
            <tr class="bad-row">
              <td>{t('直接延迟比较器（错）', 'delayed comparator (wrong)')}</td>
              <td class="mono">full_r = full_comb</td>
              <td class="mono">full_comb(t−1)</td>
              <td class="mono">empty_comb(t−1)</td>
              <td>{t('边界少/多一拍；随机测试极难命中', 'loses or adds a cycle at the boundary; random tests rarely hit it')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">1.1.3</span>{t('读出与握手：数据什么时候算“到手”', 'Readout and handshake: when is a word delivered?')}</h3>
      {#if en}
        <p>
          Writes are easy to time: data is captured at the edge when <code>wr_en && !full</code>. Reads have a choice.
          In a <b>standard</b> FIFO, <code>rd_en</code> pops the head into an output register; <code>dout</code> is
          valid in the next cycle. The read latency is one cycle. In a <b>first-word fall-through</b> (FWFT, or
          show-ahead) FIFO, the head is already on <code>dout</code>; <code>rd_en</code> simply pops it and the next
          head appears. The latency from “word is at the head” to “consumer can take it” is zero.
        </p>
        <p>
          Both can sustain one word per cycle while data is available. The difference shows up at the start and at
          every stall. With a standard FIFO, the consumer must assert <code>rd_en</code> one cycle before it can
          capture the data; if its ready drops after the request, the output register holds the word and no new read
          can start until it is taken. With FWFT, the head is visible before the request, so a consumer that becomes
          ready can take it in that same cycle. This is why many AXI/NoC-style pipes use FWFT or a skid buffer: they
          remove the bubble between “ready goes high” and “data is usable”.
        </p>
        <p>
          There is a subtle flag distinction. With a standard output register, <code>empty</code> can be 1 while
          <code>dout</code> still holds a valid word: the FIFO has no <i>next</i> word, but the output register has one.
          A consumer must therefore use a “dout valid” signal (or a read-valid pipeline) rather than
          <code>!empty</code> to decide whether <code>dout</code> is usable. Confusing the two is a classic way to drop
          the last word of a packet.
        </p>
        <p>
          At the boundary, read and write may hit the same address in the same cycle. A simple dual-port memory can do
          both; check the read-during-write behavior of the memory you infer. If the FIFO is full and a read frees a
          slot, a lookahead full flag lets the write proceed and keeps full throughput; a conservative flag inserts a
          bubble. This is the same choice as §1.1.2, now visible on the waveform.
        </p>
      {:else}
        <p>
          写的时间好定：<code>wr_en && !full</code> 时，数据在沿上被接收。读则有一个选择。<b>标准 FIFO</b> 里，
          <code>rd_en</code> 把队头弹进输出寄存器，<code>dout</code> 下一拍才有效，读延迟是一拍。
          <b>首字直通</b>（FWFT，first-word fall-through / show-ahead）里，队头本来就摆在 <code>dout</code> 上；
          <code>rd_en</code> 只是把它弹走，下一个队头接上来。从“字在队头”到“消费者能取”的延迟是零。
        </p>
        <p>
          数据够的时候，两者都能每拍过一个字。差别出现在启动和每一次停顿。标准 FIFO 的消费者必须提前一拍发
          <code>rd_en</code>，下一拍才能取；如果它发完请求后 ready 掉了，输出寄存器会扣住这个字，取走之前无法开始下一次读。
          FWFT 则先把队头亮出来，消费者一旦 ready 就能在同一拍取走。这正是很多 AXI/NoC 管道用 FWFT 或 skid buffer 的原因：
          它们消掉了“ready 拉高”到“数据可用”之间的气泡。
        </p>
        <p>
          标志上还有一个细微区别。标准 FIFO 有输出寄存器时，<code>empty</code> 可能为 1，而 <code>dout</code> 仍握着一个有效字：
          FIFO 里没有<i>下一个</i>字，但输出寄存器里有一个。因此消费者要用“dout 有效”信号（或读有效流水线）判断
          <code>dout</code> 能不能用，而不是用 <code>!empty</code>。把两者混为一谈，是丢掉一个包最后一个字的经典方式。
        </p>
        <p>
          边界上，同一拍读和写可能打到同一个地址。简单双端口存储可以同时做；但要确认你推断出的存储的 read-during-write 行为。
          如果 FIFO 满而读腾出了一个位置，带前视的 full 会让写继续、保持满吞吐；保守的 full 则插一个气泡。
          这就是 §1.1.2 的选择，只是现在搬到了波形上。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 1.6', 'Figure 1.6')}
      caption={t(
        '同一串 4 个字、同一组 ready，标准 FIFO 与 FWFT 的波形。切到“每隔一拍 ready”最容易看出区别：标准 FIFO 的输出寄存器会把字扣住，FWFT 则把下一个队头直接亮出来。首字、末字与空拍都由引擎现算。',
        'The same four words and the same ready pattern through standard and FWFT FIFOs. “Ready every other cycle” shows the difference best: the standard output register holds a word, while FWFT presents the next head. First/last/bubbles are computed.'
      )}
    >
      <TimeLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Read the waveform as two questions: when is the first word taken, and how many bubbles sit between the
          first and the last? With an always-ready consumer, FWFT takes the first word one cycle earlier and drains
          one cycle earlier; both eventually sustain one word per cycle. With an alternating-ready consumer, both
          FIFOs transfer on every ready pulse and end up with the same number of bubbles; the standard FIFO simply
          starts two cycles later. What FWFT really removes is the start-up cycle and the need to request one cycle
          ahead: after an idle gap, it can take the head on the first ready pulse. Neither is “faster memory” — the
          SRAM is the same. The difference is where the register sits and what the consumer must know.
        </p>
        <p>
          The price of FWFT is a wider read path: the output mux must select between the memory output and the
          next-head path, and <code>empty</code> must be exact for the same cycle in which the consumer decides. If
          the path is too long, a skid buffer after a standard FIFO is often the better trade: it adds one register
          and a little control, but keeps the memory-to-output timing short. The right question is not “which FIFO is
          faster?” but “where do I want the register, and who pays for the bubble?”
        </p>
      {:else}
        <p>
          把波形读成两个问题：第一个字什么时候被取走，第一个和最后一个之间有多少空拍。消费者一直 ready 时，
          FWFT 早一拍取到首字、早一拍排空；两者最终都能每拍一个字。消费者每隔一拍 ready 时，两种 FIFO 都在每个 ready 脉冲上完成一次传输，
          空拍数也相同；只是标准 FIFO 晚两拍启动。FWFT 真正省掉的是启动那一拍，以及要求消费者提前一拍发请求的麻烦——
          空闲之后第一次 ready，它就能直接取走队头。两者都不是“更快的存储”——SRAM 完全一样，
          差别在寄存器放在哪里，以及消费者需要知道什么。
        </p>
        <p>
          FWFT 的代价是更宽的读路径：输出选择器要在存储输出与下一队头之间选，而且 <code>empty</code> 必须在消费者做决定的同一拍精确。
          如果这条路太长，标准 FIFO 后面接一个 skid buffer 往往更划算：多一个寄存器加一点控制，换来存储到输出的短路径。
          该问的不是“哪种 FIFO 更快”，而是“我想把寄存器放在哪，气泡由谁付账”。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 1.7', 'Figure 1.7')}
      caption={t(
        '标准读出与 FWFT 的账。吞吐上限相同，差别在首字延迟、停顿后的恢复，以及读路径上多出来的选择器。',
        'The bill for standard readout and FWFT. The throughput ceiling is the same; the difference is first-word latency, recovery after a stall, and the extra mux in the read path.'
      )}
    >
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{t('维度', 'Aspect')}</th>
              <th>{t('标准 FIFO', 'standard FIFO')}</th>
              <th>{t('FWFT', 'FWFT')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t('首字延迟', 'first-word latency')}</td>
              <td>{t('rd_en 后 1 拍', 'one cycle after rd_en')}</td>
              <td>{t('队头出现即可取，0 拍', 'head is visible; zero cycles')}</td>
            </tr>
            <tr>
              <td>{t('持续吞吐', 'sustained throughput')}</td>
              <td>{t('1 字/拍（数据足够时）', 'one word/cycle when fed')}</td>
              <td>{t('1 字/拍（数据足够时）', 'one word/cycle when fed')}</td>
            </tr>
            <tr>
              <td>{t('停顿后恢复', 'after a stall')}</td>
              <td>{t('输出寄存器占着字，需先取走', 'the output register holds a word until taken')}</td>
              <td>{t('下一个队头已在 dout，ready 即取', 'next head is already on dout')}</td>
            </tr>
            <tr>
              <td>{t('读路径', 'read path')}</td>
              <td>{t('存储 → 输出寄存器', 'memory → output register')}</td>
              <td>{t('存储 → 选择器 → dout', 'memory → mux → dout')}</td>
            </tr>
            <tr>
              <td>{t('消费者复杂度', 'consumer complexity')}</td>
              <td>{t('要提前一拍发 rd_en', 'must issue rd_en one cycle early')}</td>
              <td>{t('ready 与 dout 同拍对齐', 'ready and dout align in the same cycle')}</td>
            </tr>
            <tr>
              <td>{t('典型用法', 'typical use')}</td>
              <td>{t('面积紧、路径短；后面接 skid buffer', 'tight area / short path; follow with a skid buffer')}</td>
              <td>{t('AXI/NoC 管道、需要零气泡启动', 'AXI/NoC pipes, zero-bubble startup')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">1.1.4</span>{t('深度：突发与反压的账', 'Depth: the burst and backpressure bill')}</h3>
      {#if en}
        <p>
          “How deep?” is two questions. The first is capacity: how many words can arrive while the consumer is slower,
          without dropping any? The second is elasticity: how much room do you need for the full-flag round trip while
          the producer is still finishing the writes it already committed? A FIFO that is too shallow overflows; one
          that is too deep costs area and adds queueing latency, and can hide a backpressure problem instead of
          solving it.
        </p>
        <p>
          Start with a burst of <code>B</code> words arriving at one word per cycle while the consumer drains at
          <code>r</code> words per cycle. During the burst the consumer removes about <code>B × r</code> words, so the
          backlog is about <code>B × (1 − r)</code>. Now add the reaction: after <code>full</code> asserts, the
          producer’s logic, synchronisers and in-flight writes take <code>R</code> cycles to stop. Those
          <code>R</code> writes still need slots, so
        </p>
        <p class="formula">depth ≥ B × (1 − r) + R × w</p>
        <p>
          where <code>w</code> is the producer’s write rate (one word per cycle in the lab). If the consumer is at
          least as fast as the producer, the first term vanishes and the depth is just the reaction margin plus one:
          the FIFO is an elastic pipe, not a rate converter. If the average producer rate exceeds the consumer rate,
          no finite depth saves you; that is what backpressure or credit is for.
        </p>
        <p>
          The formula is an estimate, not a law. The discrete order of read and write can add one word; a burst that
          starts while the FIFO is already partly full starts from a higher floor; and a consumer that stalls in the
          middle of a burst is worse than the average rate suggests. Size with the simulation, use the formula as a
          sanity check, and leave one or two words of margin. Then set <code>almost_full</code> at
          <code>depth − R × w</code> so the producer gets the warning before the hard wall.
        </p>
      {:else}
        <p>
          “深度要多少”其实是两个问题。第一是容量：消费者较慢时，最多能接住多少个字而不丢？第二是弹性：
          从 full 拉高，到生产者真正停下已经发出但还在路上的写，需要多少余量？太浅会溢出；太深费面积、增加排队延迟，
          还可能把反压问题藏起来，而不是解决它。
        </p>
        <p>
          先看一个长度为 <code>B</code> 的突发，按每拍一个字到达，消费者每拍排掉 <code>r</code> 个字。突发期间消费者大约排掉
          <code>B × r</code> 个，所以积压约为 <code>B × (1 − r)</code>。再算反应：<code>full</code> 拉高之后，
          生产者的组合逻辑、同步器和已在途的写还要 <code>R</code> 拍才停。这 <code>R</code> 个写仍然需要位置，于是
        </p>
        <p class="formula">depth ≥ B × (1 − r) + R × w</p>
        <p>
          其中 <code>w</code> 是生产者的写入速率（实验里是每拍一个字）。如果消费者不比生产者慢，第一项消失，
          深度只剩下反应余量加一：这时 FIFO 是一根弹性管道，不是变速器。如果平均写入速率高于消费速率，再多深度也救不了，
          该上的是反压或 credit。
        </p>
        <p>
          这个式子是估算，不是定律。读写在同拍的先后可能多出一个字；突发来临时 FIFO 里已经有一些存货，起始水位更高；
          消费者在突发中间停一下，比平均速率描述的更糟。用仿真定深度，用式子做 sanity check，再留一两个字余量。
          然后把 <code>almost_full</code> 设在 <code>depth − R × w</code>，让生产者在硬墙之前收到警告。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 1.8', 'Figure 1.8')}
      caption={t(
        '深度计算器。曲线是无反压时 FIFO 的占用；虚线是你选的深度。把深度调到峰值以下，卡片会显示丢了多少字；点“对齐所需深度”看仿真峰值加反应余量。',
        'The depth calculator. The curve is occupancy without backpressure; the dashed line is your chosen depth. Drop it below the peak and the card reports lost words; “match required” sets peak plus reaction margin.'
      )}
    >
      <DepthLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          The worked example in this section uses <code>B = 16</code>, <code>r = 0.5</code> and
          <code>R = 2</code>. The engine finds a peak of {depthExample.peak} words, so the required depth is
          {' '}{depthExample.required} ({depthExample.peak} + 2); the closed-form estimate is
          {' '}{depthExample.formula}. Here the two agree. When they differ by a word, take the larger — a one-word
          miss is exactly the kind of thing that makes a “depth 10” FIFO fail once in a while. The table below runs five
          more combinations through the same engine.
        </p>
      {:else}
        <p>
          本页用的算例是 <code>B = 16</code>、<code>r = 0.5</code>、<code>R = 2</code>。引擎算出峰值为 {depthExample.peak} 个字，
          所以所需深度是 {depthExample.required}（{depthExample.peak} + 2），闭式估算也是 {depthExample.formula}。
          这组参数下两者一致；若差一个字，取较大值——正是这种“差一个字”会让按 10 深设计的 FIFO 偶尔出错。
          下表再用同一套引擎跑五组组合。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 1.9', 'Figure 1.9')}
      caption={t(
        '五组突发参数下由引擎算出的深度。峰值与估算可能差一个字；设计时取两者较大值，再按反应时间加余量。',
        'Depth for five burst settings, computed by the engine. The peak and the estimate may differ by one word; take the larger, then add the reaction margin.'
      )}
    >
      <div class="table-wrap">
        <p class="table-hint">{t('左右滑动查看全部列', 'scroll sideways for all columns')}</p>
        <table class="table wide-table">
          <thead>
            <tr>
              <th>{t('突发 B', 'burst B')}</th>
              <th>{t('消费速率 r', 'rate r')}</th>
              <th>{t('反应 R', 'reaction R')}</th>
              <th>{t('仿真峰值', 'peak')}</th>
              <th>{t('所需深度', 'required')}</th>
              <th>{t('闭式估算', 'estimate')}</th>
              <th>{t('空档', 'gap')}</th>
            </tr>
          </thead>
          <tbody>
            {#each depthRows as row}
              <tr>
                <td class="num">{row.burst}</td>
                <td class="num">{row.rate}</td>
                <td class="num">{row.reaction}</td>
                <td class="num">{row.peak}</td>
                <td class="num strong">{row.required}</td>
                <td class="num">{row.formula}</td>
                <td class="num">{row.gap}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">1.1.5</span>{t('实现与验证清单', 'Implementation and verification checklist')}</h3>
      {#if en}
        <p>
          A synchronous FIFO is small enough to fit on one screen, which is exactly why the details matter. Reset the
          pointers and the count, but do not reset the memory array: resetting a RAM costs gates and can stop it from
          inferring. After reset, the flags must say empty, not “whatever the uninitialised count happens to be”. If
          the flags are registered, initialise them to empty as well; otherwise the first cycle after reset can present
          a phantom full.
        </p>
        <p>
          Map the array to a simple dual-port memory with one write and one read. Decide and document the
          read-during-write behaviour, especially when the read and write addresses collide. If byte enables are
          needed, make sure the write pointer advances once per word, not once per byte. Keep the flag path exact: a
          registered next-state flag is fine, a delayed comparator is not. Use the same lookahead policy in the flag,
          the write-enable gating and the assertions.
        </p>
        <p>
          And keep the boundary in mind: everything here is one clock. An asynchronous FIFO needs Gray-coded pointers,
          two-flop synchronisers, and a full/empty decision made separately in each domain. A binary pointer crossing a
          clock can change several bits in one sample; no amount of extra-bit logic fixes that. That machine is §1.2
          and Chapter 2; do not mix it into a synchronous design “for safety”.
        </p>
        <p>
          Verification should attack the corners, not the average. The invariants are short: <code>0 ≤ count ≤ D</code>;
          never accept a write when full; never accept a read when empty; the read order equals the write order; and
          reset during traffic leaves the FIFO empty. The interesting sequences are wrap, full, empty, simultaneous
          read/write at both boundaries, back-to-back bursts, and a reset in the middle of a burst. A scoreboard with a
          reference queue catches data loss and duplication; a formal property catches the one-cycle flag bugs that
          random traffic rarely reaches.
        </p>
      {:else}
        <p>
          同步 FIFO 小到能放在一屏里，所以细节才要命。复位指针和 count，但不要复位存储阵列：给 RAM 加复位既费门，
          又可能让它推断不出来。复位之后标志必须说 empty，而不是“未初始化的 count 碰巧是多少”。如果标志是寄存的，
          也要把它初始化成 empty；否则复位后的第一拍就可能冒出一个假的 full。
        </p>
        <p>
          把阵列映射成简单双端口存储，一个写、一个读。明确并记录 read-during-write 行为，尤其是读写地址相撞的时候。
          如果需要字节使能，确认写指针每个字只前进一次，不是每个字节一次。标志路径要精确：寄存“下一拍判定”可以，
          延迟比较器不行。标志、写使能门控和断言必须使用同一个前视策略。
        </p>
        <p>
          还要记住边界：这里全是单时钟。异步 FIFO 需要格雷码指针、两级同步器，以及在两个时钟域里分别做出的满空判定。
          二进制指针跨时钟时可能多位同时变化，再多一位逻辑也救不了。那台机器属于 §1.2 与第 2 章，不要为了“保险”把它混进同步设计。
        </p>
        <p>
          验证要打角落，不要打平均。不变量很短：<code>0 ≤ count ≤ D</code>；full 时不接受写；empty 时不接受读；
          读出顺序等于写入顺序；流量中途复位后 FIFO 为空。真正有意思的序列是回绕、满、空、两个边界上的同拍读写、
          背靠背突发，以及突发中途复位。带参考队列的 scoreboard 抓丢数和重复；形式化属性抓随机流量很难碰到的一拍标志错误。
        </p>
      {/if}
      <div class="note">
        <b>{t('四条可以带走的断言：', 'Four assertions worth carrying: ')}</b>
        {t(
          '写只在 !full 时被接受；读只在 !empty 时被接受；count 永远在 [0, D]；复位后第一拍 empty=1。前两条挡功能错，第三条挡标志算错，第四条挡复位漏项。',
          'a write is accepted only when !full; a read only when !empty; count stays in [0, D]; empty is 1 on the first cycle after reset. The first two catch function, the third catches flag arithmetic, the fourth catches reset omissions.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">1.1.6</span>{t('自测', 'Check yourself')}</h3>
      <Quiz
        questions={[
          {
            q: t('看到 wptr 与 rptr 的地址位相等，能立刻断定什么？', 'What can you conclude when the address bits of wptr and rptr are equal?'),
            options: [
              t('FIFO 为空', 'The FIFO is empty'),
              t('FIFO 为满', 'The FIFO is full'),
              t('可能是空，也可能是满，需要额外状态', 'It may be empty or full; extra state is needed')
            ],
            answer: 2,
            why: t('回绕一圈之后地址会再次相等；要靠多一位、计数器或寄存标志区分。', 'After a full wrap the addresses coincide again; an extra bit, a counter or registered flags separate the two states.')
          },
          {
            q: t('“指针多一位”里的那一位，主要解决什么？', 'What does the extra pointer bit solve?'),
            options: [
              t('跨时钟域的亚稳态', 'Metastability across clock domains'),
              t('区分空与满', 'Distinguishing empty from full'),
              t('提高存储带宽', 'Increasing memory bandwidth')
            ],
            answer: 1,
            why: t('它只记录“绕过一圈没有”，与亚稳态无关；跨时钟要另做同步。', 'It only records whether the pointer has wrapped; it says nothing about metastability, which needs synchronisers.')
          },
          {
            q: t('把满/空比较器直接打一拍，最可能在哪儿出错？', 'Where does a delayed full/empty comparator fail?'),
            options: [
              t('平均流量下随机出错', 'Randomly under average traffic'),
              t('在 count 跨过 0 或 D 的那一拍', 'At the cycle count crosses 0 or D'),
              t('只在复位时', 'Only during reset')
            ],
            answer: 1,
            why: t('它滞后一次状态变化，只在边界上多写或多读一拍；随机测试很难命中。', 'It lags one state change, so it writes or reads one extra time at the boundary — exactly what random tests miss.')
          },
          {
            q: t('标准 FIFO 与 FWFT 的主要差别是什么？', 'What is the main difference between a standard FIFO and FWFT?'),
            options: [
              t('FWFT 的存储更快', 'FWFT uses faster memory'),
              t('FWFT 把队头提前放到 dout，首字少一拍', 'FWFT presents the head early, saving one cycle on the first word'),
              t('标准 FIFO 不能每拍过一个字', 'A standard FIFO cannot sustain one word per cycle')
            ],
            answer: 1,
            why: t('存储和吞吐上限相同；差别在输出寄存器的位置与停顿后的恢复。', 'The memory and throughput ceiling are the same; the difference is where the output register sits and how it recovers after a stall.')
          },
          {
            q: t('B=16、r=0.5、反应 2 拍，按本章引擎至少要多深？', 'With B=16, r=0.5 and a 2-cycle reaction, what depth does this chapter’s engine require?'),
            options: [
              t('8', '8'),
              t('10', '10'),
              t('11', '11')
            ],
            answer: 1,
            why: t('仿真峰值 8，再加 2 拍反应余量得到 10；闭式估算同样是 10。', 'The simulated peak is 8; adding two cycles of reaction gives 10. The closed form also says 10.')
          },
          {
            q: t('average 写入速率高于消费速率时，加深 FIFO 能解决吗？', 'If the average write rate exceeds the read rate, does a deeper FIFO solve it?'),
            options: [
              t('能，只要足够深', 'Yes, if it is deep enough'),
              t('不能，平均速率差会一直累积，必须反压或限速', 'No — the average gap accumulates forever; you need backpressure or rate control'),
              t('能，但会增加延迟', 'Yes, at the cost of latency')
            ],
            answer: 1,
            why: t('有限深度只能吸收突发；平均入大于出时，任何有限深度最终都会满。', 'Finite depth absorbs bursts; when average in exceeds out, every finite depth eventually fills.')
          }
        ]}
      />
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <div class="next-card planned">
          <span class="next-no display">1.2</span>
          <strong>{t('异步 FIFO（计划中）', 'Asynchronous FIFO (planned)')}</strong>
          <span>{t('同一章的第二小节：格雷码指针、两级同步器，以及各自时钟域里的满空证明。', 'The second section of this chapter: Gray pointers, two-flop synchronisers, and a full/empty proof in each clock domain.')}</span>
          <span class="soon">{t('尚未上线', 'not live yet')}</span>
        </div>
        <button class="next-card" onclick={() => open('memory-primer', 'ch4')}>
          <span class="next-no display">04</span>
          <strong>{t('对照：TSO 的 store buffer', 'Contrast: the TSO store buffer')}</strong>
          <span>{t('每个核一个 FIFO，正是本章的电路；区别是它只要求“对本核可见、对别人晚一点可见”。', 'One FIFO per core is exactly this circuit; the twist is that it only promises local visibility and delayed global visibility.')}</span>
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
    min-width: 560px;
  }

  .table .strong {
    font-weight: 600;
    color: var(--ink);
  }

  .table-hint {
    display: none;
    margin-bottom: 6px;
    font-size: 9px;
    color: var(--muted);
  }

  .bad-row td {
    background: #fff8f5;
  }

  .formula {
    padding: 8px 12px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 13px !important;
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-radius: 7px;
    text-align: center;
  }

  .eq-art svg {
    display: block;
    width: 100%;
    height: auto;
    max-width: 560px;
    margin: 0 auto;
  }

  .eq-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 11px;
    font-style: italic;
    fill: var(--muted);
  }

  .eq-cell {
    fill: var(--paper-2);
    stroke: var(--line);
  }

  .eq-cell.filled {
    fill: var(--card);
    stroke: #cfded9;
  }

  .eq-cell.hot {
    stroke: var(--ember);
    stroke-width: 1.2;
  }

  .eq-idx {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    fill: var(--muted);
  }

  .eq-ptr {
    stroke: var(--ember);
    stroke-width: 1.1;
    fill: none;
  }

  .eq-ptr.acc {
    stroke: var(--accent);
  }

  .eq-cap {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    fill: var(--ember);
  }

  .eq-cap.acc {
    fill: var(--accent);
  }

  .eq-note {
    font-family: 'Inter', sans-serif;
    font-size: 8.5px;
    fill: var(--ink-3);
  }

  .eq-center {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 10px;
    font-style: italic;
    fill: var(--gold);
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

  .next-card.planned {
    opacity: 0.72;
    cursor: default;
  }

  .next-card.planned:hover {
    transform: none;
    border-color: var(--line);
    box-shadow: none;
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

  .next-card .soon {
    margin-top: 4px;
    font-size: 9px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }

  @media (max-width: 560px) {
    .table-wrap .table {
      min-width: 0;
      font-size: 10px;
    }

    .table-wrap .table th {
      padding: 6px 6px;
      font-size: 8.5px;
      white-space: normal;
    }

    .table-wrap .table td {
      padding: 6px 6px;
    }

    .table-wrap .table .mono {
      font-size: 9px;
      overflow-wrap: anywhere;
    }

    .table-wrap .table.wide-table {
      min-width: 520px;
    }

    .table-wrap .table.wide-table .mono {
      white-space: nowrap;
      overflow-wrap: normal;
    }

    .table-hint {
      display: block;
    }

    .formula {
      font-size: 11px !important;
    }
  }

  @media (max-width: 780px) {
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .eq-center {
      display: none;
    }
  }
</style>
