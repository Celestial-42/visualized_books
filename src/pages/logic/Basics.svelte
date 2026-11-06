<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import ComboGlitchLab from '../../components/logic/ComboGlitchLab.svelte';
  import SeqShiftLab from '../../components/logic/SeqShiftLab.svelte';
  import AsyncSampleLab from '../../components/logic/AsyncSampleLab.svelte';
  import { lang, t } from '../../lib/lang.svelte';
  import { navigate } from '../../lib/router.svelte';

  const en = $derived(lang.value === 'en');
  const open = (slug: string) => navigate(`/book/typical-logic/${slug}`);
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={1}
      title="基础知识"
      en="Foundations"
      lede={t(
        '在进入 FIFO 之前，先把三个词对齐：组合逻辑的输出只由当前输入决定；时序逻辑把状态锁在时钟沿上；异步则连共同的时钟都没有。三者的区别不是术语，而是你能否用同一个沿来解释电路的行为。',
        'Before the FIFO, align three words: combinational logic depends only on the current inputs; sequential logic stores state and updates it on a clock edge; asynchronous means there is no shared edge at all. The difference is not vocabulary — it is whether one edge can explain the behaviour.'
      )}
    />

    <div class="prose">
      {#if en}
        <p>
          Every circuit in the rest of this book is built from these three ideas. A multiplexer is combinational; a
          register is sequential; a pointer crossing between two clocks is asynchronous. Mixing them up produces the
          classic bugs: treating a glitch as a value, assuming a register sees an input at the same instant it changes,
          or sampling a multi-bit bus that has no reason to be stable.
        </p>
        <p>
          The chapter gives each idea one experiment and one honest definition. It does not try to replace a digital
          design course; it gives you the vocabulary and the failure modes that the FIFO chapters will spend later.
        </p>
      {:else}
        <p>
          后面每一章都建立在这三个词上：多路选择器是组合逻辑，寄存器是时序逻辑，在两个时钟之间传指针是异步。
          把它们混在一起，就会得到最经典的三类 bug：把毛刺当成数据、假设寄存器能在输入变化的同一瞬间看见它、
          或者去采样一根根本没有理由稳定的多比特总线。
        </p>
        <p>
          本章给每个概念一个实验和一个诚实的定义。它不替代数字设计课程，只提供后面 FIFO 章节要反复使用的词汇与失效模式。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">1.1</span>{t('组合逻辑：输出是当前输入的函数', 'Combinational logic: output is a function of the inputs')}</h3>
      {#if en}
        <p>
          Combinational logic has no memory. Its output at any instant is determined by the current inputs, plus the
          delay of the gates along the path. A mux, a decoder, an adder, a comparator: change an input and the output
          eventually follows; remove the input and there is nothing to remember. The static truth table is the
          contract, but it is not the whole timing story.
        </p>
        <p>
          Real gates have different delays. When a signal reconverges after taking two paths, one path can arrive
          earlier than the other; for a short window the output can take a value that is not in the truth table for
          either the old or the new input. That is a <b>glitch</b>, or hazard. It is not a logic bug in the equation;
          it is a physical consequence of unequal delays. Synchronous logic hides it by sampling only after the cloud
          has settled. Asynchronous logic may not have that luxury.
        </p>
        <p>
          The lab uses a 2:1 mux, <code>Y = S ? B : A</code>. Set <code>A = B = 1</code> and flip <code>S</code>:
          the output should stay 1, but the select signal and its inverted copy arrive at different times, so both
          data paths turn off briefly and <code>Y</code> shows a 0 pulse. Set <code>A ≠ B</code> and the same race is
          hidden inside a real 0→1 or 1→0 transition.
        </p>
      {:else}
        <p>
          组合逻辑没有记忆。它在任意时刻的输出由当前输入决定，再加上沿途门电路的延迟。多路选择器、译码器、加法器、比较器：
          改输入，输出过一会儿跟着变；撤掉输入，没有任何东西被记住。静态真值表是契约，但不是时序故事的全部。
        </p>
        <p>
          真实门电路延迟不同。一个信号分成两条路径再汇合时，一条可能先到、另一条后到；在很短的一段时间里，
          输出可以取一个既不属于旧输入、也不属于新输入的真值表值。这就是<b>毛刺</b>（hazard）。
          它不是等式里的逻辑错误，而是不等长路径的物理结果。时序逻辑只在组合云稳定之后采样，所以看不见它；
          异步逻辑未必有这个奢侈。
        </p>
        <p>
          实验用 2:1 选择器，<code>Y = S ? B : A</code>。令 <code>A = B = 1</code>，翻转 <code>S</code>：
          输出本应保持 1，但选择信号和它的反相副本到达时间不同，两条数据路径短暂都关断，<code>Y</code> 会出现一个 0 脉冲。
          令 <code>A ≠ B</code>，同样的竞争会被真正的 0→1 或 1→0 跳变掩盖。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 1.1', 'Figure 1.1')}
      caption={t(
        '组合逻辑毛刺实验。A=B=1 时翻转 S，期望 Y 保持不变，实际会出现一个由选择路径竞争产生的脉冲；拖动反相器延迟可以看到毛刺变宽。真值表由输入现算，波形由不等长路径模拟。',
        'A combinational glitch experiment. With A=B=1, flipping S should keep Y constant, but the select race produces a pulse. Drag the inverter delay to widen it. The truth table is computed from the inputs; the waveform comes from unequal path delays.'
      )}
    >
      <ComboGlitchLab />
    </Figure>

    <div class="prose">
      <div class="note">
        <b>{t('“组合逻辑是异步的”这句话要小心：', '“Combinational logic is asynchronous” is a trap: ')}</b>
        {t(
          '它在“没有时钟、输出跟着输入变”的意义上是异步的；但它不是跨时钟域。跨时钟域的“异步”指的是两个时钟没有固定相位关系。前者靠延迟分析，后者靠同步器与协议，不能混为一谈。',
          'it is asynchronous in the sense that it has no clock and follows its inputs; it is not a clock-domain crossing. Crossing means two clocks have no fixed phase. The first is handled by delay analysis, the second by synchronisers and protocols.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">1.2</span>{t('时序逻辑：把状态锁在沿上', 'Sequential logic: state locked to an edge')}</h3>
      {#if en}
        <p>
          A flip-flop adds memory. Its output is not a function of the current input alone; it is the value captured at
          the last active clock edge. That one change is enough to build counters, state machines, pipelines and FIFO
          pointers. The price is a timing contract: the input must be stable for a setup time before the edge and a
          hold time after it, and the output appears after a clock-to-Q delay.
        </p>
        <p>
          Between two edges, the combinational cloud in front of a flop is allowed to wobble; the flop only looks at
          the value at the edge. The design closes timing when the longest cloud delay, plus setup, fits inside one
          clock period. If it does not, the flop may capture an intermediate value or go metastable. That is the bridge
          from “logic” to “clock frequency”.
        </p>
        <p>
          The lab is a two-stage register. <code>D</code> is the input, <code>EN</code> holds both stages, and
          <code>RST</code> clears them. Each rising edge computes <code>q1' = RST ? 0 : EN ? D : q1</code> and
          <code>q2' = RST ? 0 : EN ? q1 : q2</code>. Toggle <code>D</code> between edges and watch it advance one stage
          per edge; turn <code>EN</code> off and both stages freeze.
        </p>
      {:else}
        <p>
          触发器加入记忆。它的输出不再是当前输入的单纯函数，而是上一个有效时钟沿采到的值。就这一条变化，
          足以构造计数器、状态机、流水线和 FIFO 指针。代价是一份时序契约：输入必须在沿之前稳定 setup 时间、沿之后保持 hold 时间，
          输出要等 clock-to-Q 延迟才出现。
        </p>
        <p>
          两个沿之间，触发器前面的组合云可以随便抖；触发器只看沿上的值。当最长组合延迟加上 setup 能塞进一个时钟周期，
          设计就时序收敛。塞不进去，触发器可能采到中间值，甚至进入亚稳态。这就是从“逻辑”通往“时钟频率”的桥。
        </p>
        <p>
          实验是一个两级寄存器。<code>D</code> 是输入，<code>EN</code> 让两级同时保持，<code>RST</code> 清零。每个上升沿计算
          <code>q1' = RST ? 0 : EN ? D : q1</code>、<code>q2' = RST ? 0 : EN ? q1 : q2</code>。
          在沿之间切换 <code>D</code>，看它每拍前进一级；关掉 <code>EN</code>，两级一起冻住。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 1.2', 'Figure 1.2')}
      caption={t(
        '两级寄存器的时序实验。D 只在上升沿被第一级采到，Q2 再晚一拍；EN 关掉时两级保持，RST 同步清零。输入在边沿之间怎么变都不会改变已锁住的状态。',
        'A two-stage register experiment. D is captured by stage 1 only on a rising edge; Q2 is one cycle later. EN holds both stages, RST clears them synchronously. Changes between edges never alter the captured state.'
      )}
    >
      <SeqShiftLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          The register also explains why a synchronous FIFO is possible: the pointers and flags are state, and state
          moves on an edge. It also explains why a combinational glitch is usually harmless inside a clocked block:
          the flop samples after the cloud has settled. The glitch only becomes dangerous when it reaches something
          that has no edge — an asynchronous reset, a clock input, or a signal sampled by another clock.
        </p>
      {:else}
        <p>
          寄存器也解释了同步 FIFO 为什么可能：指针和标志是状态，状态只在沿上移动。它也解释了组合毛刺在时钟块里通常无害：
          触发器在组合云稳定之后才采样。毛刺真正危险，是当它到达一个没有沿的东西时——异步复位、时钟输入，
          或者被另一个时钟采样的信号。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">1.3</span>{t('异步：没有共同的沿', 'Asynchronous: no shared edge')}</h3>
      {#if en}
        <p>
          An asynchronous input has no fixed phase relative to the destination clock. It can change before the edge,
          after the edge, or exactly while the flop is deciding. The first two cases are easy: the flop captures 0 or 1.
          The third case is metastability: the flop output may hover between the rails for a while, and different
          downstream gates may resolve it differently. No amount of good intentions removes the possibility; a
          synchroniser only reduces its probability.
        </p>
        <p>
          The lab draws both clocks explicitly: <b>Src clk</b> drives D and <b>Dest clk</b> samples it. Two sliders set
          Src’s period as a fraction of Dest’s period and the phase offset between them. Neither has a guaranteed value
          in a real crossing: a ratio of 0.75 can drift, and a phase that misses the edge today can hit it tomorrow.
          Try a ratio and phase where the edges miss, then sweep until one lands in the aperture.
        </p>
        <p>
          The standard single-bit answer is two flops in series. The first flop may go metastable; the second flop
          samples the first one a cycle later, giving the metastability time to resolve to a clean 0 or 1. The second
          stage does not remove the latency — it adds one cycle — and the resolved value can be the old or the new one.
          That is acceptable for a single control bit; it is not acceptable for a multi-bit bus, where different bits
          can resolve independently into a combination that never existed.
        </p>
        <p>
          The lab keeps both clocks visible. Sweep the phase or change the Src/Dest period ratio: when a Src edge
          lands inside a Dest edge’s aperture, Q1 shows “?”; Q2 stays 0 or 1 and is one cycle later. That “?” is the whole reason for the
          synchroniser, and the reason multi-bit crossings need Gray code or a handshake rather than N independent
          two-flop chains.
        </p>
      {:else}
        <p>
          异步输入与目的时钟没有固定相位关系。它可以在沿前变、沿后变，也可以正好在触发器做决定时变。
          前两种都好办：触发器采到 0 或 1。第三种是亚稳态：触发器输出可能在电源轨之间悬一会儿，
          不同的下游门还可能把它解析成不同的值。再好的意愿也消不掉这个可能性；同步器只能降低概率。
        </p>
        <p>
          实验把两个时钟都画出来：<b>Src clk</b> 驱动 D，<b>Dest clk</b> 采样。两个滑杆分别设 Src 周期相对 Dest 周期的比例，
          以及两者之间的相位偏移。真实跨域里这两个量都没有保证：0.75 的比例会漂，今天错过沿的相位明天可能正好撞上。
          先找一个两者错开的比例/相位，再扫描到某个沿落进采样窗口。
        </p>
        <p>
          单比特的标准答案是两级触发器串联。第一级可能进入亚稳态；第二级在下一拍再采一次，给亚稳态时间解析成干净的 0 或 1。
          第二级没有消除延迟——它增加一拍——而且解析结果可能是旧值或新值。对单个控制位，这可以接受；
          对多比特总线不行：不同位可能各自解析，组合出一个从未存在过的值。
        </p>
        <p>
          实验把两个时钟都留在视野里。扫描相位，或者改变 Src/Dest 的周期比：当 Src 的一个沿落进 Dest 沿的采样窗口时，
          Q1 显示“?”；Q2 仍然是 0/1，并且晚一拍。
          这个“?”就是同步器存在的理由，也是多比特跨域必须用格雷码或握手、而不能简单并排 N 条两级链的原因。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 1.3', 'Figure 1.3')}
      caption={t(
        '单比特异步采样实验。上方同时画出 Src clk 与 Dest clk；周期比覆盖 0.5–2.0，相位偏移单独可调。D 在 Src 上升沿翻转，落进 Dest 沿的采样窗口时，第一级 Q1 出现“?”；第二级 Q2 始终是干净的 0/1，但晚一拍。',
        'A single-bit asynchronous capture experiment. Both Src clk and Dest clk are drawn; the period ratio covers 0.5–2.0 and phase offset is separate. D toggles on Src rising edges. When a Src edge lands inside a Dest aperture, Q1 shows “?”; Q2 remains a clean 0/1, one cycle later.'
      )}
    >
      <AsyncSampleLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Keep the three meanings separate. Combinational logic is “asynchronous” in the sense that it has no clock,
          but its delays can be analysed and its glitches avoided by sampling after settling. Sequential logic has an
          edge and a setup/hold contract. Clock-domain crossing is asynchronous because there is no edge relationship
          at all; it needs synchronisers, handshakes, Gray pointers or dual-clock memory. The next two chapters use all
          three: the FIFO stores words in registers and memory, samples nothing across a clock, and then the
          asynchronous FIFO adds the crossing.
        </p>
      {:else}
        <p>
          把三种含义分开。组合逻辑“异步”是指没有时钟，但它的延迟可以分析，毛刺可以通过等稳定后再采来避开。
          时序逻辑有一个沿和 setup/hold 契约。跨时钟域之所以异步，是因为两个沿之间根本没有关系；
          它需要同步器、握手、格雷码指针或双时钟存储。接下来两章会把三者都用上：FIFO 用寄存器和存储保存字，
          在单时钟里不需要跨域；异步 FIFO 再把跨域这一层加上去。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 1.4', 'Figure 1.4')}
      caption={t(
        '三个概念的分工。组合逻辑回答“现在输出是什么”，时序逻辑回答“沿上记住什么”，异步跨域回答“两个没有共同沿的域怎样安全交换信息”。',
        'The division of labour. Combinational logic answers “what is the output now”, sequential logic “what is remembered at the edge”, and asynchronous crossing “how two domains with no shared edge exchange information safely”.'
      )}
    >
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{t('概念', 'Idea')}</th>
              <th>{t('由什么决定', 'Determined by')}</th>
              <th>{t('时序风险', 'Timing risk')}</th>
              <th>{t('本章实验', 'Lab here')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t('组合逻辑', 'combinational')}</td>
              <td>{t('当前输入 + 门延迟', 'current inputs + gate delay')}</td>
              <td>{t('毛刺 / 竞争', 'glitch / race')}</td>
              <td>{t('2:1 选择器的毛刺', 'glitch in a 2:1 mux')}</td>
            </tr>
            <tr>
              <td>{t('时序逻辑', 'sequential')}</td>
              <td>{t('上一个时钟沿锁住的状态', 'state captured at the last edge')}</td>
              <td>{t('setup/hold、时钟频率', 'setup/hold, clock frequency')}</td>
              <td>{t('两级寄存器的移动', 'two-stage register')}</td>
            </tr>
            <tr>
              <td>{t('异步跨域', 'asynchronous crossing')}</td>
              <td>{t('没有共同的沿，只能同步/握手', 'no shared edge; synchronise or handshake')}</td>
              <td>{t('亚稳态、多比特不一致', 'metastability, multi-bit incoherence')}</td>
              <td>{t('单比特两级同步', 'single-bit two-flop sync')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">1.4</span>{t('自测', 'Check yourself')}</h3>
      <Quiz
        questions={[
          {
            q: t('组合逻辑的输出由什么决定？', 'What determines a combinational output?'),
            options: [
              t('当前输入，加上门延迟', 'The current inputs, plus gate delay'),
              t('上一个时钟沿', 'The last clock edge'),
              t('它自己上一次的输出', 'Its own previous output')
            ],
            answer: 0,
            why: t('组合逻辑没有状态；它只是当前输入经过延迟后的函数。', 'Combinational logic has no state; it is a delayed function of the current inputs.')
          },
          {
            q: t('2:1 选择器在 A=B=1 时翻转 S 出现脉冲，根因是什么？', 'Why does a 2:1 mux pulse when S flips with A=B=1?'),
            options: [
              t('逻辑等式写错了', 'The logic equation is wrong'),
              t('选择信号与反相路径延迟不同，两条数据路径短暂都关断', 'The select and its inverted copy arrive at different times, briefly turning both data paths off'),
              t('时钟频率不够高', 'The clock is too slow')
            ],
            answer: 1,
            why: t('真值表是对的；毛刺来自不等长路径的物理延迟。', 'The truth table is correct; the pulse comes from physical delay differences.')
          },
          {
            q: t('时序逻辑与组合逻辑的关键区别是什么？', 'What is the key difference between sequential and combinational logic?'),
            options: [
              t('时序逻辑有状态，只在时钟沿更新', 'Sequential logic has state and updates it only on a clock edge'),
              t('时序逻辑没有延迟', 'Sequential logic has no delay'),
              t('时序逻辑不能有组合逻辑', 'Sequential logic cannot contain combinational logic')
            ],
            answer: 0,
            why: t('寄存器把状态锁在沿上；组合云可以放在它前面，但必须满足 setup/hold。', 'A register locks state at an edge; a combinational cloud may sit in front of it, but must meet setup/hold.')
          },
          {
            q: t('两级同步器的第二级做了什么？', 'What does the second stage of a two-flop synchroniser do?'),
            options: [
              t('消除延迟', 'Removes latency'),
              t('给第一级的亚稳态时间解析，再输出干净的 0/1', 'Gives the first stage time to resolve, then outputs a clean 0/1'),
              t('让多比特总线保持一致', 'Makes a multi-bit bus coherent')
            ],
            answer: 1,
            why: t('它降低亚稳态传播概率，代价是晚一拍；它不保证多比特之间一致。', 'It lowers the chance of metastability propagating at the cost of one cycle; it does not keep multiple bits consistent.')
          },
          {
            q: t('为什么多比特异步总线不能每条线各放一个两级同步器？', 'Why can a multi-bit asynchronous bus not use one two-flop chain per bit?'),
            options: [
              t('因为面积太大', 'Because it costs too much area'),
              t('因为各位独立解析，组合可能是一个从未存在过的值', 'Because bits resolve independently and the combination may never have existed'),
              t('因为两级同步器只能同步 0', 'Because a two-flop synchroniser only synchronises 0')
            ],
            answer: 1,
            why: t('单比特安全不等于整体安全；多比特需要格雷码、握手或双时钟存储。', 'Per-bit safety is not word-level safety; multi-bit crossings need Gray code, a handshake or dual-clock memory.')
          },
          {
            q: t('Src 与 Dest 标称同频、相位恰好对齐时，异步采样会变安全吗？', 'If Src and Dest have the same nominal frequency and happen to be phase-aligned, is the async capture safe?'),
            options: [
              t('会，同频就没有亚稳态', 'Yes — equal frequency removes metastability'),
              t('不会，每个 Dest 沿都可能正好撞在 D 的翻转上', 'No — every Dest edge can land exactly on D’s toggle'),
              t('只有 Src 更快时才不安全', 'Only when Src is faster')
            ],
            answer: 1,
            why: t('同频同相只是让每次采样都落在跳变窗口里；相位会漂，频率也有公差，异步不能靠“碰巧对齐”。', 'Same frequency and phase just make every capture land in the transition window; phase drifts and frequency has tolerance, so a crossing cannot rely on accidental alignment.')
          }
        ]}
      />
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => open('ch1')}>
          <span class="next-no display">02</span>
          <strong>{t('FIFO（同步）', 'FIFO (synchronous)')}</strong>
          <span>{t('把存储、指针和满空判定拼起来，所有端口共享同一个时钟沿。', 'Storage, pointers and full/empty, with every port sharing one clock edge.')}</span>
        </button>
        <button class="next-card" onclick={() => open('ch2')}>
          <span class="next-no display">03</span>
          <strong>{t('异步 FIFO', 'Asynchronous FIFO')}</strong>
          <span>{t('把指针送过两个不同的时钟域：格雷码、两级同步器与保守满空。', 'Send the pointers across two clock domains: Gray code, two-flop synchronisers and conservative flags.')}</span>
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

  @media (max-width: 560px) {
    .table-wrap .table {
      min-width: 0;
      font-size: 10px;
    }

    .table-wrap .table th,
    .table-wrap .table td {
      padding: 6px 5px;
    }
  }

  @media (max-width: 780px) {
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
