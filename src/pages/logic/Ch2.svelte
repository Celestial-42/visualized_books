<script lang="ts">
  import ChapterHead from '../../components/ChapterHead.svelte';
  import Figure from '../../components/Figure.svelte';
  import Quiz from '../../components/Quiz.svelte';
  import GrayCrossLab from '../../components/logic/GrayCrossLab.svelte';
  import SlowSamplingLab from '../../components/logic/SlowSamplingLab.svelte';
  import AsyncFifoLab from '../../components/logic/AsyncFifoLab.svelte';
  import { bitChanges, graySequence } from '../../lib/logic/async';
  import { lang, t } from '../../lib/lang.svelte';
  import { navigate } from '../../lib/router.svelte';

  const en = $derived(lang.value === 'en');
  const open = (book: string, slug: string) => navigate(`/book/${book}/${slug}`);

  const grayRows = graySequence(4)
    .filter((row) => row.value <= 8 || row.value === 15)
    .map((row) => ({
      ...row,
      binaryChanges: row.value === 0 ? 0 : bitChanges(row.value, row.value - 1),
      hot: row.value === 7 || row.value === 8
    }));
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={2}
      title="异步 FIFO"
      en="Asynchronous FIFO"
      lede={t(
        '第 1 章的 FIFO 有一个隐含前提：读写共享同一个时钟沿。把这个前提拿掉之后，full/empty 不再能在同一拍算出来，指针也不能以二进制直接跨域。本章只处理新增出来的问题：格雷码、两级同步器、逐位到达时间、为什么异步 FIFO 的满空必然是保守的，以及慢时钟一次跨过多个源码为什么不违反一位变化。',
        'The FIFO in Chapter 1 quietly assumes one clock edge for both ports. Remove that assumption and full/empty can no longer be settled in the same cycle, and a binary pointer cannot cross the boundary directly. This chapter handles only the new problems: Gray code, two-flop synchronisers, per-bit arrival time, why asynchronous full/empty must be conservative, and why a slow clock that skips several source codes does not break the one-bit rule.'
      )}
    />

    <div class="prose">
      {#if en}
        <p>
          An asynchronous FIFO is still a queue, but its two ends no longer share time. The write side runs on
          <code>wclk</code>, the read side on <code>rclk</code>; the memory is dual-clock, and the payload is written
          and read inside its own domain. The only things that cross the boundary are the two pointers. That single
          sentence is the whole architecture: <b>data stays in RAM, pointers cross</b>.
        </p>
        <p>
          The temptation is to reuse the synchronous pointer and just add a second clock. That fails at the first
          pointer increment. A binary pointer changes several bits on the same edge; each bit has a different wire delay,
          so the receiving clock can capture a value that never existed. Gray code fixes exactly this: every increment
          changes one bit, so after the capture resolves, the pointer is either the old value or the new one. The rest of
          the chapter spends that property carefully.
        </p>
        <p>
          Three questions organise the page: how a pointer is encoded before it crosses (§2.2), what a capture edge sees
          while the bits are arriving (§2.3), and how the two domains use a stale copy of the other pointer to decide
          full and empty (§2.4). The data path and reset rules follow in §2.5.
        </p>
      {:else}
        <p>
          异步 FIFO 仍然是一个队列，只是两端不再共享时间。写端跑在 <code>wclk</code>，读端跑在 <code>rclk</code>，
          存储是双时钟的，数据在各自域里写入和读出。真正跨过边界的只有两个指针。这一句话就是全部架构：
          <b>数据留在 RAM 里，指针跨域</b>。
        </p>
        <p>
          最自然的错误是沿用同步 FIFO 的指针、再加一个时钟。第一次指针自增就会失败：二进制指针在同一个沿上翻好几位，
          而每一位的线延迟不同，接收时钟可能采到一个从未存在过的值。格雷码正好解决这件事：每次自增只变一位，
          采样解析之后指针只能是旧值或新值。本章剩下的内容，就是谨慎地使用这条性质。
        </p>
        <p>
          三个问题组织这一页：指针跨域前怎么编码（§2.2）、采样沿在各位陆续到达时看到什么（§2.3）、
          两个域怎样用对方那份过时的指针副本判满判空（§2.4）。数据路径与复位放在 §2.5。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 2.1', 'Figure 2.1')}
      caption={t(
        '异步 FIFO 的分工：双时钟 RAM 承载数据，格雷码指针经两级同步器跨域，full 与 empty 各自留在本地域。跨域的只有指针，数据总线不跨。',
        'The division of labour: dual-clock RAM carries the payload, Gray pointers cross through two-flop synchronisers, and full/empty stay local to their own domains. Only pointers cross; the data bus does not.'
      )}
    >
      <div class="block-art">
        <svg viewBox="0 0 720 300" fill="none" aria-hidden="true">
          <g class="domain">
            <rect x="22" y="52" width="186" height="186" rx="12" class="dom-box" />
            <text x="38" y="76" class="dom-title">write domain</text>
            <text x="38" y="96" class="dom-sub">wclk</text>
            <path d="M38 110H58V118H78V126H98V134H118" class="clk" />
            <text x="38" y="160" class="dom-line">wptr → wgray</text>
            <text x="38" y="178" class="dom-line">{t('full（本地）', 'full (local)')}</text>
            <text x="38" y="208" class="dom-note">{t('写数据进 RAM', 'payload into RAM')}</text>
          </g>

          <g class="ram">
            <rect x="278" y="98" width="164" height="94" rx="12" class="ram-box" />
            <text x="360" y="126" class="ram-title" text-anchor="middle">dual-clock RAM</text>
            <text x="360" y="146" class="ram-sub" text-anchor="middle">{t('写口 wclk · 读口 rclk', 'write wclk · read rclk')}</text>
            <text x="360" y="170" class="ram-sub" text-anchor="middle">{t('数据不跨域', 'data stays inside')}</text>
            <path d="M208 140H274" class="data" marker-end="url(#da)" />
            <path d="M446 140H508" class="data" marker-end="url(#da)" />
            <text x="240" y="132" class="flow-label" text-anchor="middle">data in</text>
            <text x="478" y="132" class="flow-label" text-anchor="middle">data out</text>
          </g>

          <g class="domain">
            <rect x="512" y="52" width="186" height="186" rx="12" class="dom-box" />
            <text x="528" y="76" class="dom-title">read domain</text>
            <text x="528" y="96" class="dom-sub">rclk</text>
            <path d="M528 110H548V118H568V126H588V134H608" class="clk" />
            <text x="528" y="160" class="dom-line">rptr → rgray</text>
            <text x="528" y="178" class="dom-line">{t('empty（本地）', 'empty (local)')}</text>
            <text x="528" y="208" class="dom-note">{t('读数据出 RAM', 'payload out of RAM')}</text>
          </g>

          <g class="cross">
            <path d="M208 72H512" class="gray-arrow" marker-end="url(#ga)" />
            <rect x="334" y="58" width="52" height="28" rx="6" class="sync" />
            <text x="360" y="76" class="sync-t" text-anchor="middle">2FF</text>
            <text x="360" y="48" class="cross-label" text-anchor="middle">wgray →</text>

            <path d="M512 230H208" class="gray-arrow ember" marker-end="url(#ea)" />
            <rect x="334" y="216" width="52" height="28" rx="6" class="sync" />
            <text x="360" y="234" class="sync-t" text-anchor="middle">2FF</text>
            <text x="360" y="262" class="cross-label" text-anchor="middle">← rgray</text>
          </g>

          <defs>
            <marker id="da" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#b98a63" />
            </marker>
            <marker id="ga" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#2f5d62" />
            </marker>
            <marker id="ea" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#b4543a" />
            </marker>
          </defs>
        </svg>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">2.1</span>{t('两个时钟，一个队列', 'Two clocks, one queue')}</h3>
      {#if en}
        <p>
          The dual-clock memory is the easy part: it has a write port in the write domain and a read port in the read
          domain, and neither port needs to know the other clock. A word written at <code>wclk</code> stays stable in
          the array until the read side is allowed to take it. The pointer protocol is what grants that permission.
        </p>
        <p>
          Both flags are local. The write side computes <code>full</code> from its own write pointer and a synchronized
          copy of the read pointer; the read side computes <code>empty</code> from its own read pointer and a
          synchronized copy of the write pointer. No combination of the two current pointers is available in either
          domain, because that would require a signal to cross instantaneously.
        </p>
        <p>
          That is also why the data bus is not the thing to synchronize. It is wide, it changes often, and its bits have
          different delays. The FIFO never asks the receiver to sample the data bus directly; it asks it to wait until
          the synchronized pointer says there is a word, then read the stable array. The lab in §2.3 uses a pointer bus
          to show what happens when this rule is broken.
        </p>
      {:else}
        <p>
          双时钟存储反而是简单的一半：写域一个写口，读域一个读口，两边都不需要知道对方的时钟。写进去的字在阵列里保持不变，
          直到读侧被允许取走。允许这件事的，是指针协议。
        </p>
        <p>
          两个标志都是本地的。写侧用自己的写指针和一份同步过来的读指针副本算 <code>full</code>；读侧用自己的读指针和一份
          同步过来的写指针副本算 <code>empty</code>。任何一个域都拿不到“对方此刻的指针”，因为那需要信号瞬时跨域。
        </p>
        <p>
          这也是为什么该跨域的不是数据总线。它很宽、经常变、每一位延迟不同。FIFO 从不要求接收方直接采样数据总线；
          它要求接收方等同步后的指针说“有字了”，再去读稳定的阵列。§2.3 的实验会用指针总线演示破坏这条规则的后果。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">2.2</span>{t('格雷码：一次只变一位', 'Gray code: one bit per step')}</h3>
      {#if en}
        <p>
          A binary pointer is a compact lie when it crosses a clock boundary: it looks like one number, but on the wire
          it is a group of bits that do not change at the same time. Gray code removes the lie at the source. For a
          binary value <code>b</code>, the Gray code is <code>g = b ^ (b &gt;&gt; 1)</code>; adjacent binary values differ
          in exactly one Gray bit, including the wrap from the last value to zero.
        </p>
        <p>
          Use the full pointer, including the extra wrap bit, as the Gray input. Do not Gray-code only the address and
          carry the wrap bit separately: that would make the wrap step change two bits, and the whole argument collapses.
          The pointer is bijective in Gray space, so the receiver can decode it back to binary after the synchronizer
          when it needs to compare values.
        </p>
        <p>
          The table makes the difference concrete at the step from 7 to 8. Binary changes four bits; Gray changes one.
          The same property holds at 15 → 0, which is exactly the wrap that the extra bit exists for. This is why the
          chapter uses Gray code only for pointers, not for the payload.
        </p>
      {:else}
        <p>
          二进制指针跨时钟时像一句压缩过的谎话：看起来是一个数，在线路上却是一组不在同一时刻翻转的位。格雷码从源头上消掉这句谎话。
          对二进制值 <code>b</code>，格雷码是 <code>g = b ^ (b &gt;&gt; 1)</code>；相邻值只差一个格雷位，包括从最大值回绕到零。
        </p>
        <p>
          参与编码的是完整指针，包含额外那一位回绕位。不要只对地址做格雷码、再把回绕位单独带着走：那样回绕一步会变两位，
          整个论证就塌了。指针在格雷空间里是双射，接收方在同步之后可以把它解码回二进制再比较。
        </p>
        <p>
          表里看 7 到 8 这一步最直观：二进制翻四位，格雷码只翻一位。15 → 0 也一样，这正是额外那一位存在的理由。
          所以本章只用格雷码编码指针，不编码数据。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 2.2', 'Figure 2.2')}
      caption={t(
        '4 位指针的二进制与格雷码。每一步格雷码只变 1 位；7→8 时二进制变 4 位。表中位变化数由引擎现算。',
        'Binary and Gray for a 4-bit pointer. Each Gray step changes one bit; 7→8 changes four binary bits. The change counts are computed.'
      )}
    >
      <div class="table-wrap">
        <table class="table gray-table">
          <thead>
            <tr>
              <th>{t('十进制', 'dec')}</th>
              <th>{t('二进制', 'binary')}</th>
              <th>{t('格雷码', 'gray')}</th>
              <th>{t('二进制变化位', 'binary changes')}</th>
              <th>{t('格雷变化位', 'gray changes')}</th>
            </tr>
          </thead>
          <tbody>
            {#each grayRows as row}
              <tr class:hot={row.hot}>
                <td class="num">{row.value}</td>
                <td class="mono">{row.binary}</td>
                <td class="mono accent">{row.grayBits}</td>
                <td class="num">{row.binaryChanges}</td>
                <td class="num">{row.changes}</td>
              </tr>
            {/each}
            <tr class="hot">
              <td class="num">15→0</td>
              <td class="mono">1111→0000</td>
              <td class="mono accent">1000→0000</td>
              <td class="num">4</td>
              <td class="num">1</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">2.3</span>{t('跨域采样：多比特到达时间不同', 'Crossing: bits do not arrive together')}</h3>
      {#if en}
        <p>
          The interesting moment is not the steady state; it is the edge. Launch a pointer change at time zero. Each bit
          has its own delay, so the bus passes through a sequence of intermediate combinations. A capture edge placed
          somewhere in that window samples whichever bits have arrived. For Gray, only one bit is in flight, so every
          captured code is either the old pointer or the new one. For binary, several bits are in flight and the capture
          can produce a number that never existed.
        </p>
        <p>
          A two-flop synchronizer does not remove the window; it resolves each captured bit to 0 or 1 and gives a clean
          value on the next clock. That is enough for one uncertain bit — the result is old or new. It is not enough for
          four uncertain bits, because each resolves independently and the combination can be arbitrary. The first flop
          may go metastable; the second gives the destination domain a clean value, at the cost of latency.
        </p>
        <p>
          The lab puts Gray and binary side by side; the bus in the experiment is the pointer, because the payload
          stays in RAM (§2.5). Move the capture phase past the transition and watch the Gray lane step from 7 to 8
          while the binary lane sweeps through intermediate values. The strip below the waveform counts
          illegal phases over a full sweep; the skew slider makes the window wider or narrower. At zero skew the binary
          bus is not obviously broken because all bits move together — which is exactly why the bug survives a
          zero-delay simulation.
        </p>
      {:else}
        <p>
          关键不是稳态，而是沿。假设指针在零时刻翻转。每一位有自己的延迟，于是总线会经过一串中间组合。
          采样沿落在这个窗口里的某个位置，就采到“已经到达的那些位”。格雷码只有一位在途中，所以每个采样码不是旧指针就是新指针；
          二进制有多位在途中，采样可能得到一个从未存在过的数。
        </p>
        <p>
          两级同步器不会消掉这个窗口；它把每个采到的位解析成 0 或 1，在下一拍给出干净值。对一位不确定来说，这够了——
          结果只能是旧值或新值。对四位不确定来说不够：每一位独立解析，组合可以是任意的。第一级可能进入亚稳态，
          第二级给目的域一个干净值，代价是延迟。
        </p>
        <p>
          实验把格雷码和二进制并排；实验里的总线是指针，数据本身留在 RAM（§2.5）。把采样相位推过跳变，
          格雷车道从 7 走到 8，二进制车道会扫过一串中间值。
          波形下方的扫描条统计整个相位范围内有多少个非法采样点；偏斜滑杆让窗口变宽或变窄。偏斜为零时，二进制看起来没坏，
          因为所有位一起动——这正是这个 bug 能在零延迟仿真里活下来的原因。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 2.3', 'Figure 2.3')}
      caption={t(
        '以 4 位指针作为多比特总线的样本：各位到达时间不同，采样沿落在不同位置会得到不同组合。格雷码只会在 7 与 8 之间跳，二进制会出现 4、6、12 等非法指针。红色扫描段是引擎按 101 个采样相位算出的非法区间。',
        'A 4-bit pointer stands in for the multi-bit bus: its bits arrive at different times, and a capture edge at different positions sees different combinations. Gray only steps between 7 and 8, while binary can produce illegal pointers such as 4, 6 or 12. Red sweep segments are the illegal phases computed over 101 capture positions.'
      )}
    >
      <GrayCrossLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          The “before” and “after” presets are the two legal answers. Before the changing bit arrives, the sampled Gray
          code is still the old pointer; after it arrives, it is the new one. In between, the code is still one of those
          two, but the changing bit may be inside the aperture and the synchronizer may resolve it either way. That is
          acceptable: a pointer that is old or new is a pointer the FIFO can use. A mixed binary value is not.
        </p>
        <p>
          The comparison also explains why Gray code is not a cure for metastability. The changing bit still has a
          nonzero chance of being sampled while it is transitioning; the two-flop synchronizer is still required. Gray
          code only guarantees that the <i>combination</i> on the bus is never illegal. Keep both mechanisms: Gray for
          the bus, synchronizers for the bit.
        </p>
      {:else}
        <p>
          “变化前”和“变化后”两个预设是仅有的两种合法答案。变化位到达之前，采到的格雷码还是旧指针；到达之后是新指针。
          在两者之间，码仍然只会是这两个之一，但变化位可能落在采样窗口里，同步器可能把它解析成任意一边。这可以接受：
          旧指针或新指针都是 FIFO 能用的指针。混合的二进制值不行。
        </p>
        <p>
          这个对比也解释了格雷码为什么不是亚稳态的解药。变化位仍然有非零概率在跳变时被采到，两级同步器仍然必需。
          格雷码只保证总线上的<i>组合</i>永远不会非法。两个机制都要留：格雷码管总线，同步器管那一位。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">2.3.1</span>{t('慢采样跨过多个码字，为什么仍然成立', 'Why a slow sample may skip many codes')}</h3>
      {#if en}
        <p>
          A common objection goes like this: if the slow clock sees two or three fast rising edges inside one of its
          periods, the Gray pointer changes several times between two slow samples. Does that not violate the
          one-bit-at-a-time rule?
        </p>
        <p>
          Asynchronous crossing means the data and the destination clock have no fixed phase. A capture can land before
          the change, after the change, or during it. The first two give the old or new value; the third is the only
          dangerous case, and that is exactly the case Gray code narrows to one uncertain bit.
        </p>
        <p>
          No, because the rule is about <b>consecutive values in the source domain</b>, not about two consecutive
          samples in the destination domain. The slow domain is a decimator: it may sample 0, then 4, then 8 and never
          see 1, 2 or 3. Those intermediate codes did exist at the source; they were simply not captured. At each
          destination edge, only the transition currently in flight matters: either the bus is stable at some real
          pointer, or one bit is changing and the synchronizer resolves it to the old or new pointer. The previous
          destination sample can be many codes away; that does not make the current sample illegal.
        </p>
        <p>
          A two-bit example makes the difference explicit. Let the source value go from <code>01</code> to
          <code>10</code>. With binary, a capture may return <code>01</code> or <code>10</code> (the expected values),
          but it can also return <code>00</code> or <code>11</code> when the two bits arrive at different times. Gray
          encodes those same two source values as <code>01 → 11</code>; only one bit changes, so the capture can only
          be <code>01</code> or <code>11</code>. The slow clock may have advanced several source steps before this
          capture, but the value it eventually uses is a pointer the source really had.
        </p>
        <div class="note">
          <b>{t('2 位例子：', '2-bit example: ')}</b>
          {t(
            '源值 01 → 10；二进制可能采到 01、10（预期）或 00、11（中间态）；格雷码 01 → 11，只能采到 01 或 11。',
            'source 01 → 10; binary can capture 01 or 10 (expected) but also 00 or 11 (mixed); Gray 01 → 11 can only capture 01 or 11.'
          )}
        </div>
        <p>
          One nuance separates this from a licence to ignore timing: the captured value can be an <em>older</em>
          pointer than the one currently on the bus, because the capture happened before the latest change or the
          synchronizer is still resolving. That is staleness, not illegality. §2.4 uses staleness conservatively. What
          must never happen is a value the source never had.
        </p>
      {:else}
        <p>
          一个常见的疑问是这样的：如果慢时钟在一个周期里看到两三个快时钟上升沿，那么两次慢采样之间格雷码已经变了好几次，
          这不就违反了“一次只变一位”吗？
        </p>
        <p>
          异步过渡的意思是数据和目的时钟没有确定相位关系，所以一次采样可能落在变化前、变化后，也可能落在变化过程中。
          前两种给出旧值或新值，第三种才是危险情形；格雷码做的，正是把第三种压缩成一位不确定。
        </p>
        <p>
          不违反，因为这条性质说的是<b>源端的相邻取值</b>，不是<b>目的端的相邻两次采样</b>。慢时钟域在做抽取：
          它可能采到 0，然后 4，然后 8，从来没看见 1、2、3。那些中间码在源端确实出现过，只是没有被采样。
          在每个目的沿上，真正重要的只有当时正在进行的那一次跳变：要么总线稳定在某个真实指针上，
          要么只有一位在变、同步器把它解析成旧值或新值。上一次慢采样离这一次有多远，不影响这一次采样的合法性。
        </p>
        <p>
          一个 2 位例子能把这个区别说清楚。源值从 <code>01</code> 变到 <code>10</code>。二进制可能采到
          <code>01</code>、<code>10</code>（预期），也可能因为两位到达时间不同而采到 <code>00</code>、<code>11</code>。
          格雷码把同样的两个源值编码成 <code>01 → 11</code>，只变一位，所以采样只能是 <code>01</code> 或 <code>11</code>。
          慢时钟可能已经跨过好几个源端码字，但它最终用到的，是源端真实出现过的指针。
        </p>
        <div class="note">
          <b>{t('2 位例子：', '2-bit example: ')}</b>
          {t(
            '源值 01 → 10；二进制可能采到 01、10（预期）或 00、11（中间态）；格雷码 01 → 11，只能采到 01 或 11。',
            'source 01 → 10; binary can capture 01 or 10 (expected) but also 00 or 11 (mixed); Gray 01 → 11 can only capture 01 or 11.'
          )}
        </div>
        <p>
          有一个细节把它和“可以不管时序”区分开：采到的值可能比总线上当前的值<em>旧</em>，因为采样发生在最新变化之前，
          或者同步器还在解析。这是过时，不是非法；§2.4 会保守地使用这份过时。绝不允许出现的，是源端从未有过的值。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 2.4', 'Figure 2.4')}
      caption={t(
        '慢时钟每 N 个快拍采样一次。条纹显示源指针在两次采样之间扫过的码字；注意两次采样可以是 0、4、8，彼此并不相邻。Gray 每次采样仍是合法码，Binary 可能在跳变窗口采到中间值；周期、相位与偏斜都可调。',
        'The slow clock samples once every N fast ticks. The strip shows the source pointer sweeping between samples; two samples can be 0, 4 and 8, nowhere near adjacent. Every Gray capture is still a legal code, while binary may hit a mid-transition value. Period, phase and skew are adjustable.'
      )}
    >
      <SlowSamplingLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Watch the “skipped” column and the two captured pointers together. They may be 0, 4, 8; the skipped codes are
          1–3, 5–7 and so on. The slow domain never sees those codes, but each captured value is one the source actually
          held. The one-bit property is doing its job at every source transition, not promising that the slow samples
          form a contiguous sequence. The default phase samples after the transition has settled, so even binary is
          legal there; press “on transition” to put the capture edge inside the window and binary will produce mixed
          values while Gray still returns only the old or new code.
        </p>
      {:else}
        <p>
          把“跳过”列和两个采样指针一起看：它们可能是 0、4、8，跳过的是 1–3、5–7 等等。慢域从没看见这些码，
          但每次采到的都是源端真实持有过的值。一位变化性质在每一次源端跳变上起作用，并不承诺慢采样之间是连续码字。
          默认采样在跳变稳定之后，所以二进制也合法；点“对齐跳变”把采样沿放进窗口，二进制会出现中间值，而格雷码仍只给出旧值或新值。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">2.4</span>{t('满与空：用一份过时的指针', 'Full and empty: a stale pointer is all you have')}</h3>
      {#if en}
        <p>
          The write side cannot know the current read pointer; it only has a copy that crossed two flops and therefore
          lags. It declares <code>full</code> when its own write pointer has caught up with the synchronized read pointer
          plus the depth: in binary terms, <code>wbin == (rbin_sync + D) mod 2D</code>. Because <code>rbin_sync</code>
          is stale, the flag can assert while the real FIFO still has empty slots. That is the conservative direction:
          it may stop a legal write, but it cannot allow an overflow.
        </p>
        <p>
          The read side is the mirror image. It declares <code>empty</code> when its read pointer equals the synchronized
          write pointer. The synchronized write pointer lags, so <code>empty</code> can remain high while data is already
          in the array. It may stall a legal read, but it cannot allow an underflow. Neither domain can be exact without
          instantaneous knowledge of the other side; the async FIFO trades throughput for safety.
        </p>
        <p>
          The flag arithmetic can use the decoded binary pointers, or an equivalent Gray comparison. Decoding is easier
          to audit: synchronize Gray, decode to binary, compare with the local pointer and the depth. The Gray crossing
          guarantees the decoded value is the old or new pointer; the comparison then uses ordinary binary arithmetic.
        </p>
      {:else}
        <p>
          写侧拿不到当前读指针，只有一份穿过两级触发器、必然落后的副本。它用自己的写指针追上“同步读指针加深度的位置”时判
          <code>full</code>：二进制写法是 <code>wbin == (rbin_sync + D) mod 2D</code>。因为 <code>rbin_sync</code>
          是过时的，FIFO 实际还有空位时 full 就可能拉高。这是保守方向：可能挡住一次合法写，但不会放过一次溢出。
        </p>
        <p>
          读侧是镜像。它用自己的读指针等于同步写指针时判 <code>empty</code>。同步写指针落后，所以阵列里已经有数据时 empty
          仍可能为高。它可能让一次合法读多等，但不会放过一次读空。没有哪一侧能在不瞬时知道对方的情况下做到精确；
          异步 FIFO 用吞吐换安全。
        </p>
        <p>
          标志运算可以把同步后的格雷码解码成二进制再比较，也可以写成等价的格雷比较。解码更好审查：
          同步格雷码、解码成二进制、再和本地指针与深度比较。格雷跨域保证解码值只能是旧指针或新指针；比较本身则是普通二进制算术。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 2.5', 'Figure 2.5')}
      caption={t(
        '双时钟 FIFO 波形。切换写快/读快/同速，单步看 full、empty、两级同步器和实际占用。被拒的写或读来自保守标志，不是数据坏了。',
        'Dual-clock FIFO waveform. Switch write-fast/read-fast/equal and step through full, empty, the two synchroniser stages and actual occupancy. Rejected writes or reads come from conservative flags, not corrupt data.'
      )}
    >
      <AsyncFifoLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Two numbers in the lab are worth reading together: the actual occupancy and the flag. When <code>full</code>
          is 1 while occupancy is below eight, the write pointer has caught a stale read pointer. When <code>empty</code>
          is 1 while occupancy is above zero, the read pointer has not yet seen the write pointer. The conservative
          counters at the bottom count these cycles. A design that reports “full” most of the time is not broken; it is
          paying synchronization latency for safety.
        </p>
        <p>
          The clock ratio changes which side pays. With a fast write clock, the write side fills until the
          conservative full and then stalls while the read side drains; with a fast read clock, empty dominates. The low-throughput regime
          is not a bug in the FIFO; it is the cost of crossing domains. If the application cannot afford it, the answer
          is usually a different clock plan, not an unsafe shortcut.
        </p>
      {:else}
        <p>
          实验里有两个数要一起读：实际占用和标志。当 <code>full</code> 为 1 而占用低于 8，说明写指针追上的是一份过时的读指针；
          当 <code>empty</code> 为 1 而占用大于 0，说明读指针还没看到写指针。底部的保守拍计数统计这些周期。
          一个大部分时间都在报 full 的设计不是坏了，它是在用同步延迟换安全。
        </p>
        <p>
          时钟比例决定哪一侧付账。写时钟快时，写侧很快追上保守的 full 而停下，读侧慢慢排空；读时钟快时，empty 占主导。
          低吞吐不是 FIFO 的 bug，而是跨时钟的代价。如果应用负担不起，通常应该改时钟方案，而不是走不安全的捷径。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 2.6', 'Figure 2.6')}
      caption={t(
        '两侧的判定都只用本地指针和一份同步副本。保守方向不同，安全性相同：宁可少写/少读，不可越界。',
        'Both sides use only a local pointer and a synchronized copy. The conservative directions differ; the safety property is the same: rather stall than cross the boundary.'
      )}
    >
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{t('判定', 'Decision')}</th>
              <th>{t('本地状态', 'Local state')}</th>
              <th>{t('远端副本', 'Remote copy')}</th>
              <th>{t('条件', 'Condition')}</th>
              <th>{t('保守方向', 'Conservative direction')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t('写侧 full', 'write-side full')}</td>
              <td class="mono">wbin / wgray</td>
              <td class="mono">rbin_sync / rgray_sync</td>
              <td class="mono">wbin == (rbin_sync + D) mod 2D</td>
              <td>{t('实际还有空位时也可能 full', 'may be full while slots remain')}</td>
            </tr>
            <tr>
              <td>{t('读侧 empty', 'read-side empty')}</td>
              <td class="mono">rbin / rgray</td>
              <td class="mono">wbin_sync / wgray_sync</td>
              <td class="mono">rbin == wbin_sync</td>
              <td>{t('实际已有数据时也可能 empty', 'may be empty while data remains')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      <h3><span class="h-no">2.5</span>{t('数据路径、复位与实现', 'Data path, reset and implementation')}</h3>
      {#if en}
        <p>
          The payload never crosses the boundary as a bus. It is written into the dual-clock array at
          <code>wclk</code> and read out at <code>rclk</code>, after the synchronized pointer has told the read side that
          the word exists. The write data is stable for a full write cycle before the write pointer is synchronized, so
          per-bit data skew is irrelevant. If you instead send the data bus straight across and trust the receiver to
          sample it, the binary lane in §2.3 is exactly the failure you get. This is the reason an async FIFO exists.
        </p>
        <p>
          Reset is per domain. Bring both pointers to zero, reset the two-flop synchronizers, and make sure both domains
          see their own reset release. The RAM is not reset; it is written before it is read. If the write side leaves
          reset before the read side, the read side may start from a synchronized pointer that is still zero; that is
          safe only if no write has crossed yet. Document and verify the reset order: a reset asserted in one domain
          only can corrupt the pointer relationship, so reset must be coordinated at the system level.
        </p>
        <p>
          Implementation rules are short. Register the Gray pointer in the source domain; cross it through two flops
          with no combinational logic between them; keep the two flops close and constrained; never cross a binary
          pointer or a multi-bit data bus without a protocol. Compute full/empty locally from the synchronized copy.
          Add a synchronizer for every bit of the Gray pointer, and do not “optimize” them into one wide flop.
        </p>
        <p>
          Verification should attack the crossing, not just the queue. Check that every pointer increment changes one
          Gray bit; that the synchronized value is old or new, never a third value; that full/empty are conservative
          rather than exact; that no write is accepted when the local full is set and no read when empty is set; that
          the data read was written earlier; and that reset in either order leaves a safe empty FIFO. The corner cases
          are the two clock edges coinciding, the ratio extremes, and a reset in the middle of traffic.
        </p>
      {:else}
        <p>
          数据从不以总线形式跨域。它在 <code>wclk</code> 写进双时钟阵列，在同步指针告诉读侧“这个字存在”之后，由
          <code>rclk</code> 读出。写数据在写指针被同步之前已经稳定了整整一个写周期，所以逐位数据偏斜无关紧要。
          如果你反过来把数据总线直接送过边界、让接收方去采，§2.3 的二进制车道就是你会得到的故障。这正是异步 FIFO 存在的理由。
        </p>
        <p>
          复位按域处理。两个指针归零，两级同步器复位，并确保两个域各自看到自己的复位释放。RAM 不复位；它在被读之前先被写。
          如果写侧先退出复位，读侧可能从仍为零的同步指针出发——只有在此前没有写跨过来时才是安全的。
          要记录并验证复位顺序：只在一个域复位会破坏指针关系；复位必须在系统层面协调。
        </p>
        <p>
          实现规则很短。格雷指针在源域寄存；跨域只经过两级触发器，中间没有组合逻辑；两级触发器靠近并加约束；
          永远不要直接跨二进制指针，也不要无协议跨多比特数据总线。full/empty 在本地用同步副本算。
          格雷指针每一位都要有同步器，不要把多位“优化”成一个宽触发器。
        </p>
        <p>
          验证要打跨域，而不只是队列。检查每次指针自增只变一个格雷位；同步后的值只能是旧值或新值，绝不是第三个值；
          full/empty 是保守而不是精确；本地 full 置位时不接受写，empty 置位时不接受读；读出的数据一定早于写入；
          任意复位顺序都留下一个安全的空 FIFO。角落是两个时钟沿重合、极端时钟比，以及流量中途复位。
        </p>
      {/if}
      <div class="note">
        <b>{t('三条实现底线：', 'Three implementation rules: ')}</b>
        {t(
          '指针先格雷再跨域；跨域只走两级同步器；full/empty 只用本地指针和同步副本。少任何一条，前面所有“旧值或新值”的论证都不再成立。',
          'Gray before crossing; only two-flop synchronisers cross; full/empty use only local pointers plus synchronized copies. Drop any one and the old-or-new argument stops holding.'
        )}
      </div>
    </div>

    <div class="prose">
      <h3><span class="h-no">2.6</span>{t('自测', 'Check yourself')}</h3>
      <Quiz
        questions={[
          {
            q: t('为什么异步 FIFO 只让格雷码指针跨域？', 'Why does an asynchronous FIFO cross Gray pointers rather than binary pointers?'),
            options: [
              t('格雷码更省面积', 'Gray code uses less area'),
              t('相邻值只变一位，采样结果只会是旧值或新值', 'Adjacent values change one bit, so a capture is only old or new'),
              t('格雷码能消除亚稳态', 'Gray code removes metastability')
            ],
            answer: 1,
            why: t('多比特二进制会同时翻转，逐位延迟不同，采样可能得到从未存在过的指针。', 'A multi-bit binary pointer flips several bits at once; with different delays the capture can produce a pointer that never existed.')
          },
          {
            q: t('两级同步器解决了多比特二进制的什么问题？', 'What does a two-flop synchroniser fix for a multi-bit binary bus?'),
            options: [
              t('把每个位解析成干净值，但各位置独立解析，组合仍可能非法', 'It resolves each bit to a clean value, but bits resolve independently and the combination can still be illegal'),
              t('保证整个总线同时更新', 'It makes the whole bus update together'),
              t('消除了指针延迟', 'It removes pointer latency')
            ],
            answer: 0,
            why: t('同步器处理的是每一位的亚稳态，不是多位之间的一致性。', 'It handles metastability per bit, not consistency across bits.')
          },
          {
            q: t('异步 FIFO 的 full 为什么可能在实际还有空位时拉高？', 'Why can full assert while the FIFO still has free slots?'),
            options: [
              t('写指针坏了', 'The write pointer is broken'),
              t('同步读指针落后，写侧用的是旧副本', 'The synchronized read pointer is stale'),
              t('存储太小', 'The memory is too small')
            ],
            answer: 1,
            why: t('写侧只能看到过时的读指针；它按保守方向判满，宁可少写。', 'The write side sees only a stale read pointer; it errs toward blocking writes.')
          },
          {
            q: t('把数据总线直接跨时钟、不用握手，最可能出什么？', 'What happens if a data bus crosses a clock directly without a handshake?'),
            options: [
              t('每一位独立到达，接收方可能采到混合字', 'Bits arrive independently, so the receiver may capture a mixed word'),
              t('数据自动变成格雷码', 'The data becomes Gray code automatically'),
              t('只会慢一拍，不会错', 'It is only one cycle slower, never wrong')
            ],
            answer: 0,
            why: t('多比特偏斜会让不同位来自不同时刻；异步 FIFO 用 RAM + 指针协议避免直接采数据。', 'Multi-bit skew makes different bits come from different moments; the async FIFO uses RAM plus a pointer protocol instead.')
          },
          {
            q: t('写快读慢时，哪一侧更常付保守的代价？', 'When the write clock is faster, which side pays the conservative cost more often?'),
            options: [
              t('写侧，full 会更早拉高', 'The write side: full asserts earlier'),
              t('读侧，empty 会更早拉高', 'The read side: empty asserts earlier'),
              t('两侧完全一样', 'Both sides equally')
            ],
            answer: 0,
            why: t('写侧填得快，先追上同步读指针；读侧排得慢，full 就会挡住写。', 'The write side fills faster and catches the synchronized read pointer; full then blocks it.')
          },
          {
            q: t('异步 FIFO 的指针复位应该怎么做？', 'How should the pointers be reset?'),
            options: [
              t('只复位写侧，读侧自然跟随', 'Reset only the write side; the read side follows'),
              t('两个域各自复位指针和同步器，RAM 不复位', 'Reset pointers and synchronisers in both domains; leave the RAM alone'),
              t('用一个异步复位同时清掉 RAM', 'Use one asynchronous reset to clear the RAM too')
            ],
            answer: 1,
            why: t('两个域都要回到已知的空状态；RAM 在写之前没有有效数据，不必复位。', 'Both domains must return to a known empty state; the RAM has no valid data before a write.')
          },
          {
            q: t('慢时钟一个周期里快时钟变了好几次，格雷码还成立吗？', 'Does Gray code still hold if the fast clock changes several times inside one slow period?'),
            options: [
              t('不成立：两次慢采样之间变了多位', 'No: several bits change between two slow samples'),
              t('成立：1 位变化约束的是源端相邻变化，慢域只是稀疏采样，不要求相邻采样值相邻', 'Yes: the one-bit rule is about consecutive source steps; the slow domain decimates and its samples need not be adjacent'),
              t('只有慢时钟比快时钟快时才成立', 'Only when the slow clock is faster than the fast clock')
            ],
            answer: 1,
            why: t('慢域可能采到 0、4、8；中间的 1、2、3 没被看到并不违反性质。每次采样仍必须是源端真实出现过的码字。', 'The slow domain may capture 0, 4, 8; missing 1, 2, 3 violates nothing. Each capture must still be a code the source actually held.')
          }
        ]}
      />
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <div class="next-card planned">
          <span class="next-no display">03</span>
          <strong>{t('跨时钟域（计划中）', 'Clock-domain crossing (planned)')}</strong>
          <span>{t('把这一章的两级同步器展开成通用规则：单比特、脉冲、握手、复位与 MTBF。', 'Expand the two-flop synchroniser into general rules: single-bit, pulse, handshake, reset and MTBF.')}</span>
          <span class="soon">{t('尚未上线', 'not live yet')}</span>
        </div>
        <button class="next-card" onclick={() => open('typical-logic', 'ch1')}>
          <span class="next-no display">01</span>
          <strong>{t('回看：同步 FIFO', 'Back: the synchronous FIFO')}</strong>
          <span>{t('同一个队列，两端共用时钟沿时，full/empty 可以精确到每一拍。', 'The same queue with a shared edge: full/empty can be exact every cycle.')}</span>
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

  .gray-table tbody tr.hot td {
    background: var(--accent-soft);
    color: var(--accent-deep);
    font-weight: 600;
  }

  .gray-table .accent {
    color: var(--accent-deep);
  }

  .block-art svg {
    display: block;
    width: 100%;
    height: auto;
    max-width: 760px;
    margin: 0 auto;
  }

  .dom-box {
    fill: var(--card-2);
    stroke: var(--line);
  }

  .dom-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 12px;
    font-style: italic;
    fill: var(--ink-2);
  }

  .dom-sub,
  .dom-line,
  .dom-note {
    font-family: 'Inter', sans-serif;
    font-size: 8px;
    fill: var(--muted);
  }

  .dom-line {
    fill: var(--ink-3);
  }

  .clk {
    stroke: var(--accent);
    stroke-width: 1;
    fill: none;
  }

  .ram-box {
    fill: var(--card);
    stroke: #cfded9;
  }

  .ram-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 12px;
    font-style: italic;
    fill: var(--ink-2);
  }

  .ram-sub,
  .flow-label,
  .cross-label {
    font-family: 'Inter', sans-serif;
    font-size: 8px;
    fill: var(--muted);
  }

  .data {
    stroke: var(--gold);
    stroke-width: 1.1;
    fill: none;
  }

  .gray-arrow {
    stroke: var(--accent);
    stroke-width: 1.1;
    fill: none;
  }

  .gray-arrow.ember {
    stroke: var(--ember);
  }

  .sync {
    fill: var(--paper-2);
    stroke: var(--line);
  }

  .sync-t {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    fill: var(--ink-3);
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

    .table-wrap .table th,
    .table-wrap .table td {
      padding: 6px 6px;
    }

    .table-wrap .table .mono {
      font-size: 9px;
      overflow-wrap: anywhere;
    }
  }

  @media (max-width: 780px) {
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
