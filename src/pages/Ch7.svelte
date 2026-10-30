<script lang="ts">
  import ChapterHead from '../components/ChapterHead.svelte';
  import Figure from '../components/Figure.svelte';
  import SnoopLab from '../components/SnoopLab.svelte';
  import { navigate } from '../lib/router.svelte';
  import { lang, t } from '../lib/lang.svelte';

  const en = $derived(lang.value === 'en');
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={7}
      title="监听协议"
      en="Snooping Coherence Protocols"
      lede={en
        ? 'One idea carries the whole family: every controller observes coherence requests in the same order, so each can update its own state machine without asking anyone. This chapter builds MSI, then adds E and O, then replaces the atomic bus with a split-transaction one.'
        : '整族协议只靠一个想法：所有 controller 以同一个顺序观察 coherence request，于是每个 controller 都能独自更新状态机，不必再问别人。这一章从 MSI 起步，加上 E 与 O，再把原子总线换成 split-transaction bus。'}
    />

    <div class="prose">
      {#if en}
        <h3><span class="h-no">7.1</span>One bus, one order</h3>
        <p>
          Snooping is broadcast plus a total order. A coherence request is sent to every controller, including the
          requestor. The network must serialize the requests; the point where that happens is the
          <b>serialization point</b>. On a bus it is the arbitration logic; on a logical bus it is the root of a tree.
        </p>
        <p>
          A request is <i>ordered</i> at the serialization point, but controllers only learn their position when the
          request reaches them. Because everyone eventually sees the same sequence, no acknowledgement is needed:
          the order itself is the acknowledgement. This is the sharp difference from the directory protocols of the
          next chapter.
        </p>
        <p>
          Responses are a different story. They carry data, are much longer than requests, and need neither broadcast
          nor ordering. A transaction is logically ordered when its request is ordered, no matter when its data
          arrives. That freedom is what later lets designers put responses on a crossbar while requests stay on a
          logical bus.
        </p>
      {:else}
        <h3><span class="h-no">7.1</span>一条总线，一个顺序</h3>
        <p>
          snooping 的本质是“广播 + 全序”。一个 coherence request 会送到所有 controller（包括发起者自己）。
          网络必须把这些 request 排成一个序；完成排序的位置叫作 <b>serialization point</b>。
          在总线上它是仲裁逻辑；在 logical bus 上它是树的根。
        </p>
        <p>
          request 在 serialization point 被 <i>排序</i>，但 controller 要等消息到达才知道自己排在哪。
          因为所有人最终看到同一个序列，所以不需要 ack：顺序本身就是 ack。
          这正是它与下一章 directory 协议最锋利的差别。
        </p>
        <p>
          response 是另一回事。它携带数据、比 request 长得多，不需要广播，也不需要排序。
          一个 transaction 在逻辑上于 request 被排序时就算发生了，数据什么时候到不影响它的位置。
          正因如此，后来才可以把 response 放到 crossbar 上，而 request 仍留在 logical bus 上。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 7.1', 'Figure 7.1')}
      caption={t(
        '同一个 request 顺序让每个 controller 独立得到正确结论；顺序不一致时，SWMR 会被打破，甚至没有人是 owner。',
        'A shared request order lets each controller reach the correct conclusion alone; without it, SWMR breaks and sometimes no one is the owner.'
      )}
    >
      <div class="order-grid">
        <div class="order-card ok">
          <div class="order-head">
            <span class="mono">C1 GetM(A)</span>
            <span class="arrow">→</span>
            <span class="mono">C2 GetM(A)</span>
            <span class="badge-ok">{t('同一个顺序', 'same order')}</span>
          </div>
          <div class="order-steps">
            <div class="step"><b class="mono">C1</b><span>{t('拿到 M，成为 owner', 'gets M, becomes owner')}</span></div>
            <div class="step"><b class="mono">C2</b><span>{t('看到 C1 的 GetM，再发自己的', 'sees C1\u2019s GetM before its own')}</span></div>
            <div class="step"><b class="mono">C1</b><span>{t('供数据并降为 I', 'supplies data and drops to I')}</span></div>
            <div class="step"><b class="mono">C2</b><span>{t('最终只有它是 M', 'ends as the only M')}</span></div>
          </div>
          <div class="order-foot">{t('每个时刻：一个 owner，SWMR 成立。', 'At every moment: one owner, SWMR holds.')}</div>
        </div>

        <div class="order-card bad">
          <div class="order-head">
            <span class="mono">{t('C1 先看到自己的', 'C1 sees its own first')}</span>
            <span class="arrow">≠</span>
            <span class="mono">{t('C2 先看到自己的', 'C2 sees its own first')}</span>
            <span class="badge-bad">{t('顺序不一致', 'different orders')}</span>
          </div>
          <div class="order-steps">
            <div class="step"><b class="mono">C1</b><span>{t('看到自己的 GetM：进入 M', 'sees its own GetM: enters M')}</span></div>
            <div class="step"><b class="mono">C2</b><span>{t('也看到自己的 GetM：进入 M', 'also sees its own GetM: enters M')}</span></div>
            <div class="step"><b class="mono">LLC</b><span>{t('认为没人拥有，拒绝回答', 'believes no one owns it and answers no one')}</span></div>
            <div class="step"><b class="mono">{t('结果', 'result')}</b><span>{t('两个 M，且下一请求无人应答', 'two M copies, and the next request may hang')}</span></div>
          </div>
          <div class="order-foot">{t('SWMR 被打破；再往后可能死锁。', 'SWMR is broken; later requests may deadlock.')}</div>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <div class="note">
          <b>Per-block order is enough for coherence, a total order is easier for consistency.</b> Coherence only
          compares requests to the same block. A bus orders every request, which subsumes all per-block orders and
          makes SC and TSO implementations simpler.
        </div>
      {:else}
        <div class="note">
          <b>coherence 只需要 per-block order，consistency 更喜欢全序。</b>coherence 只比较同一 block 的请求；
          总线对所有请求排序，天然涵盖所有 per-block order，也让 SC 与 TSO 的实现更简单。
        </div>
      {/if}
    </div>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">7.2</span>Baseline: MSI on an atomic bus</h3>
        <p>
          The baseline has three stable states: <b>M</b> (modified, exclusive, dirty), <b>S</b> (shared, clean), and
          <b>I</b> (invalid). The LLC/memory is the owner unless a cache holds the block in M. This is the same
          ownership rule as Chapter 6, now with a bus that carries the requests.
        </p>
        <p>
          The simplest system model assumes <b>atomic requests</b> (a request is ordered in the cycle it is issued) and
          <b>atomic transactions</b> (the next request to the same block cannot appear until the response has
          completed). Those two assumptions shrink the number of transient states to almost nothing: a miss simply
          stalls the block until data arrives.
        </p>
      {:else}
        <h3><span class="h-no">7.2</span>基线：原子总线上的 MSI</h3>
        <p>
          基线只有三个稳定状态：<b>M</b>（已修改、独占、脏）、<b>S</b>（共享、干净）、<b>I</b>（无效）。
          除非某个 cache 以 M 持有该块，否则 LLC/memory 就是 owner。这与第 6 章的 ownership 规则相同，
          只是现在请求由总线承载。
        </p>
        <p>
          最简单的系统模型假设 <b>atomic requests</b>（request 在发出的同一拍被排序）与
          <b>atomic transactions</b>（同一 block 的下一个 request 必须等当前 transaction 的 response 完成）。
          这两个假设把 transient state 压到几乎没有：miss 只需把该块停住，等数据回来。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 7.2', 'Figure 7.2')}
      caption={t(
        'MSI 的稳定状态。命中不改变状态；Other-GetM 与 PutM 都能把 M 送回 I。',
        'MSI stable states. Hits do not change state; both Other-GetM and PutM send M back to I.'
      )}
    >
      <div class="fsm-wrap">
        <svg class="fsm" viewBox="0 0 640 260" role="img" aria-label="MSI state diagram">
          <defs>
            <marker id="msi-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#b9ac95" />
            </marker>
            <marker id="msi-arr-start" viewBox="0 0 8 8" refX="1" refY="4" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M8,0 L0,4 L8,8 Z" fill="#b9ac95" />
            </marker>
          </defs>

          <path d="M118,160 L292,73" fill="none" stroke="#b9ac95" marker-end="url(#msi-arr)" />
          <text class="lbl" x="52" y="112" text-anchor="start">Own-GetM / Upg</text>

          <path d="M305,70 L125,158" fill="none" stroke="#b9ac95" marker-end="url(#msi-arr)" />
          <text class="lbl" x="330" y="132" text-anchor="start">Other-GetS</text>

          <path d="M522,160 L348,73" fill="none" stroke="#b9ac95" marker-end="url(#msi-arr)" />
          <text class="lbl" x="500" y="112" text-anchor="start">Own-GetM</text>

          <path d="M340,70 L518,158" fill="none" stroke="#b9ac95" marker-end="url(#msi-arr)" />
          <text class="lbl" x="298" y="132" text-anchor="end">Other-GetM</text>

          <path d="M123,180 L517,180" fill="none" stroke="#b9ac95" marker-start="url(#msi-arr-start)" marker-end="url(#msi-arr)" />
          <text class="lbl" x="320" y="203" text-anchor="middle">Other-GetM / Own-GetS</text>

          <circle cx="320" cy="55" r="28" fill="#fffdf8" stroke="#b4543a" stroke-width="1.4" />
          <text class="st m" x="320" y="62" text-anchor="middle">M</text>

          <circle cx="95" cy="180" r="28" fill="#fffdf8" stroke="#3c6e8f" stroke-width="1.4" />
          <text class="st s" x="95" y="187" text-anchor="middle">S</text>

          <circle cx="545" cy="180" r="28" fill="#fffdf8" stroke="#9a948a" stroke-width="1.4" />
          <text class="st i" x="545" y="187" text-anchor="middle">I</text>
        </svg>
      </div>
      <p class="fig-foot">
        {t(
          '箭头方向即转移方向。驱逐也沿 S→I / M→I：干净块静默，M 块发 PutM。',
          'Arrows point along each transition. Evictions also go S→I / M→I: silent for a clean block, PutM for an M block.'
        )}
      </p>
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Table 7.1 is the stable-state view. Two details are easy to miss. First, a silent replacement is legal only
          for a clean block (S); an M block must issue PutM. Second, Other-GetS from M both supplies data and updates
          memory, after which the block is S — this keeps the memory copy valid for the next reader.
        </p>
      {:else}
        <p>
          表 7.1 是稳定状态视角。两个细节容易漏。第一，只有干净块（S）才能静默驱逐；M 块必须发 PutM。
          第二，M 看到 Other-GetS 时既要供数据、又要更新内存，然后降为 S——这样下一个读者拿到的内存副本才是新的。
        </p>
      {/if}
    </div>

    <Figure
      no={t('表 7.1', 'Table 7.1')}
      caption={t(
        'MSI 的稳定状态表；括号里是进入的 transient state。',
        'MSI stable-state table; the transient state entered is shown in parentheses.'
      )}
    >
      <div class="tbl-wrap">
        <table class="table spec">
          <thead>
            <tr>
              <th>{t('状态', 'State')}</th>
              <th>load</th>
              <th>store</th>
              <th>{t('驱逐', 'replacement')}</th>
              <th>Other-GetS</th>
              <th>Other-GetM</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="mono state-n">I</td>
              <td><span class="act">BusRd</span><span class="nxt">IS</span></td>
              <td><span class="act">BusRdX</span><span class="nxt">IM</span></td>
              <td class="muted">—</td>
              <td class="muted">—</td>
              <td class="muted">—</td>
            </tr>
            <tr>
              <td class="mono state-n">S</td>
              <td><span class="act">hit</span></td>
              <td><span class="act">BusUpgr</span><span class="nxt">SM</span></td>
              <td><span class="act">{t('静默', 'silent')}</span><span class="nxt">I</span></td>
              <td class="muted">—</td>
              <td><span class="nxt">I</span></td>
            </tr>
            <tr>
              <td class="mono state-n">M</td>
              <td><span class="act">hit</span></td>
              <td><span class="act">hit</span></td>
              <td><span class="act">PutM</span><span class="nxt">I</span></td>
              <td><span class="act">{t('供数 + 写回', 'supply + write back')}</span><span class="nxt">S</span></td>
              <td><span class="act">{t('供数 + 写回', 'supply + write back')}</span><span class="nxt">I</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">7.3</span>Adding E: a clean exclusive copy</h3>
        <p>
          MSI pays a bus upgrade for the very first store to a block that a core has only read. But if the read
          missed everywhere and no other cache holds a copy, granting S is pessimistic: nobody else has the block.
          State <b>E</b> records exactly that — clean and exclusive.
        </p>
        <p>
          E changes two transitions. A BusRd that finds no sharers may return the block in E; a store on E becomes M
          silently. When another core reads an E block, the owner simply demotes to S: no data transfer is needed,
          because memory is already up to date.
        </p>
      {:else}
        <h3><span class="h-no">7.3</span>加 E：干净独占</h3>
        <p>
          MSI 对一个“只读过”的块第一次写时，要花一次总线 upgrade。但如果这次读在所有 cache 都 miss、别处也没有副本，
          授予 S 就过于悲观了：根本没人共享。状态 <b>E</b> 正是记录这一点——干净且独占。
        </p>
        <p>
          E 改变两条转移：BusRd 发现没有 sharer 时可以把块以 E 返回；E 上的 store 静默变成 M。
          当别的核读一个 E 块时，owner 直接降为 S——不需要搬数据，因为内存本来就是新的。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 7.3', 'Figure 7.3')}
      caption={t(
        '同一段“先读后写”：MSI 需要两次总线事务，MESI 只需要一次；省下的是第一次 store 的 upgrade。',
        'The same read-then-write: MSI needs two bus transactions, MESI needs one. The saving is the first store\u2019s upgrade.'
      )}
    >
      <div class="lanes">
        <div class="lane">
          <div class="lane-k">
            <span class="mono">MSI</span>
            <span class="lane-count">{t('2 次总线事务', '2 bus transactions')}</span>
          </div>
          <div class="lane-row">
            <span class="lstep"><b class="mono">Load</b><span>BusRd → S</span><em>1</em></span>
            <span class="lane-arrow">→</span>
            <span class="lstep"><b class="mono">Store</b><span>BusUpgr → M</span><em>2</em></span>
          </div>
          <p class="lane-note">{t('写之前必须先把共享副本收掉。', 'The shared copy must be taken away before writing.')}</p>
        </div>

        <div class="lane accent">
          <div class="lane-k">
            <span class="mono">MESI</span>
            <span class="lane-count">{t('1 次总线事务', '1 bus transaction')}</span>
          </div>
          <div class="lane-row">
            <span class="lstep"><b class="mono">Load</b><span>BusRd → E</span><em>1</em></span>
            <span class="lane-arrow">→</span>
            <span class="lstep silent"><b class="mono">Store</b><span>E → M {t('静默', 'silent')}</span><em>0</em></span>
          </div>
          <p class="lane-note">{t('没有 sharer，读就可以拿到独占许可。', 'No sharers, so the read can return an exclusive permission.')}</p>
        </div>
      </div>
      <p class="fig-foot">
        {t(
          '代价：E 需要判断“没有 sharer”，通常由 directory 或总线上的响应汇总提供。',
          'The cost: E requires knowing there are no sharers, typically from a directory or from collecting bus responses.'
        )}
      </p>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">7.4</span>Adding O: a dirty shared copy</h3>
        <p>
          With MESI, when an M cache supplies data to a reader it also writes memory, then both copies become S. The
          writeback is unnecessary if the M cache will keep the block: it could hand the data to the reader and stay
          the <b>owner</b> in a new state <b>O</b> — dirty, shared, and still responsible for answering reads.
        </p>
        <p>
          O is the mirror image of E. E says “clean and nobody else has it”; O says “dirty and someone else may have
          it, but I am still the one who answers”. There is at most one O per block, and memory is stale while it
          exists. MOSI is MSI+O; MOESI is MSI+E+O.
        </p>
      {:else}
        <h3><span class="h-no">7.4</span>加 O：脏共享</h3>
        <p>
          在 MESI 中，M 的 cache 向读者供数时还要写回内存，然后双方都变 S。如果这个 M cache 反正会继续持有该块，
          写回就是多余的：它可以把数据直接交给读者，自己留在新状态 <b>O</b>——脏、共享，但仍负责回答读请求。
        </p>
        <p>
          O 是 E 的镜像。E 说“干净，而且别人没有”；O 说“脏，别人可能也有，但回答的人仍是我”。
          每条 block 最多一个 O；只要它存在，内存就是旧的。MOSI 是 MSI+O；MOESI 是 MSI+E+O。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 7.4', 'Figure 7.4')}
      caption={t(
        '读请求由谁回答：M 与 O 都由 cache 供数，E 与 S 由内存供数。O 的存在让“脏”和“共享”可以同时成立。',
        'Who answers a read: a cache answers for M and O; memory answers for E and S. O lets \u201cdirty\u201d and \u201cshared\u201d be true at once.'
      )}
    >
      <div class="tbl-wrap">
        <table class="table owner">
          <thead>
            <tr>
              <th>{t('状态', 'State')}</th>
              <th>{t('谁回答读', 'who answers a read')}</th>
              <th>{t('内存是最新?', 'memory current?')}</th>
              <th>{t('能否与别人共享', 'may share')}</th>
              <th>{t('一句话', 'in one line')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="mono state-n m">M</td>
              <td>{t('持有者 cache', 'the owning cache')}</td>
              <td>{t('否', 'no')}</td>
              <td>{t('否', 'no')}</td>
              <td>{t('独占的脏副本', 'the only, dirty copy')}</td>
            </tr>
            <tr>
              <td class="mono state-n o">O</td>
              <td>{t('持有者 cache', 'the owning cache')}</td>
              <td>{t('否', 'no')}</td>
              <td>{t('是（S）', 'yes (S)')}</td>
              <td>{t('脏，但仍由我回答', 'dirty, but I still answer')}</td>
            </tr>
            <tr>
              <td class="mono state-n e">E</td>
              <td>{t('内存', 'memory')}</td>
              <td>{t('是', 'yes')}</td>
              <td>{t('是（S）', 'yes (S)')}</td>
              <td>{t('干净的独占副本', 'the only, clean copy')}</td>
            </tr>
            <tr>
              <td class="mono state-n s">S</td>
              <td>{t('内存', 'memory')}</td>
              <td>{t('是', 'yes')}</td>
              <td>{t('是', 'yes')}</td>
              <td>{t('干净的共享副本', 'a clean shared copy')}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="fig-foot">
        {t(
          'O 的存在要求系统能追踪 owner；广播总线天然知道谁有副本，directory 则需要显式记录。',
          'O requires tracking the owner; a broadcast bus knows who has a copy, whereas a directory must record it explicitly.'
        )}
      </p>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">7.5</span>Try it: one block, two caches, four states</h3>
        <p>
          The lab below runs MSI/MESI mechanically. Every action resolves the whole bus transaction at once, and the
          log lists the messages it really sent. Watch three numbers: bus transactions, data transfers, and silent
          operations. E and O are exactly the states that move work from the first counter to the third.
        </p>
      {:else}
        <h3><span class="h-no">7.5</span>试一试：一条 block、两个 cache、四个状态</h3>
        <p>
          下面的实验机械地执行 MSI/MESI。每个动作会一次走完整个总线事务，日志列出它真正发出的消息。
          盯住三个数字：总线事务、数据搬运、静默操作。E 与 O 的作用，正是把工作从第一个计数搬到第三个。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 7.5', 'Figure 7.5')}
      caption={t(
        '用按钮推进协议：状态、数据、内存与总线日志都来自同一组确定性转移。',
        'Drive the protocol with buttons: states, data, memory, and the bus log all come from one deterministic transition set.'
      )}
    >
      <SnoopLab />
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">7.6</span>Non-atomic bus: split transactions</h3>
        <p>
          Real buses do not wait for data before accepting the next request. A <b>split-transaction bus</b> separates
          the request from its response: the request wins arbitration, is broadcast, and releases the bus; data returns
          later, tagged with a transaction id. Now several transactions for different blocks — and even the same block —
          can be in flight.
        </p>
        <p>
          The price is transient states. A cache that missed sits in IS or IM; a cache that is supplying data may sit
          in S→I or M→I while the response drains. A simple protocol <b>stalls</b> new requests to a block until its
          previous transaction completes; an optimized one allows them and resolves the races with per-block state.
        </p>
        <p>
          Responses may return in order or out of order. Out-of-order responses improve latency but force the requestor
          to match data to transactions, usually with a transaction id and a miss-status holding register (MSHR).
        </p>
      {:else}
        <h3><span class="h-no">7.6</span>非原子总线：split transaction</h3>
        <p>
          真实总线不会等数据回来才接收下一个 request。<b>split-transaction bus</b> 把 request 与 response 拆开：
          request 赢得仲裁、被广播、随即释放总线；数据稍后到达，带着 transaction id。于是多个不同 block
          （甚至同一 block）的 transaction 可以同时在飞。
        </p>
        <p>
          代价是 transient state。miss 的 cache 停在 IS 或 IM；正在供数的 cache 可能在 S→I 或 M→I 上等数据排空。
          简单协议会 <b>stall</b> 该 block 的新请求，直到上一个 transaction 完成；优化过的协议允许新请求进来，
          再靠 per-block 状态解开竞争。
        </p>
        <p>
          response 可以按序，也可以乱序。乱序能降低延迟，但要求 requestor 把数据和 transaction 对上，
          通常靠 transaction id 与 miss-status holding register（MSHR）。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 7.6', 'Figure 7.6')}
      caption={t(
        'request 总线保持全序；数据总线可以乱序返回。T1 / T2 是 transaction id，负责把数据对回请求。',
        'The request bus keeps the total order; the data bus may return out of order. T1 / T2 are transaction ids that match data back to requests.'
      )}
    >
      <div class="timing">
        <div class="t-lane">
          <span class="t-k">{t('request bus', 'request bus')}</span>
          <div class="t-track">
            <span class="tbox req"><b class="mono">T1</b>C1 BusRd</span>
            <span class="tbox req"><b class="mono">T2</b>C2 BusRdX</span>
            <span class="tbox idle">{t('空闲', 'idle')}</span>
          </div>
        </div>
        <div class="t-lane">
          <span class="t-k">{t('data bus', 'data bus')}</span>
          <div class="t-track">
            <span class="tbox idle">{t('等待', 'wait')}</span>
            <span class="tbox data"><b class="mono">T2</b>{t('先回 B 的数据', 'B\u2019s data first')}</span>
            <span class="tbox data"><b class="mono">T1</b>{t('再回 A 的数据', 'then A\u2019s data')}</span>
          </div>
        </div>
        <div class="t-lane note-lane">
          <span class="t-k">{t('为什么可以', 'why it works')}</span>
          <p>
            {t(
              'transaction 在 request 被排序时就已确定；数据晚到只影响延迟，不影响 coherence 的顺序。',
              'A transaction is fixed when its request is ordered; late data changes latency, not the coherence order.'
            )}
          </p>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <div class="note">
          <b>Stalling is a correctness tool, not a performance goal.</b> Forbidding a new request to a block while an
          old transaction is unresolved hides most races. The optimized protocol removes the stall, then must handle
          the same races with transient states such as IMDSI.
        </div>
      {:else}
        <div class="note">
          <b>stall 是正确性工具，不是性能目标。</b>在旧 transaction 未完成时禁止同一 block 的新请求，
          能把大多数竞争藏起来。优化协议去掉 stall，就必须用 IMDSI 这类 transient state 正面处理同一批竞争。
        </div>
      {/if}
    </div>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">7.7</span>Scaling the bus, and where snooping stops</h3>
        <p>
          A physical bus is a poor fit for 64 cores: wires, capacitance, and arbitration all get worse. The Sun
          Starfire E10000 kept the snooping idea but replaced the wire with a <b>logical bus</b>: requests unicast up
          a tree, are serialized at the root, then broadcast down. It used four address-interleaved logical buses and a
          crossbar for data.
        </p>
        <p>
          IBM Power5 is a two-core chip with a shared L2. Its coherence looks like MESI on a split-transaction bus, but
          the network is three unidirectional rings (requests, snoop responses, data), and the state set has flavors
          for outstanding requests. Both systems show the same lesson: the total order is a protocol requirement; a
          physical bus is only one way to provide it.
        </p>
      {:else}
        <h3><span class="h-no">7.7</span>把总线做大，以及 snooping 的边界</h3>
        <p>
          物理总线不适合 64 核：线长、电容与仲裁都会变差。Sun Starfire E10000 保留了 snooping 的想法，
          但把线换成了 <b>logical bus</b>：request 沿树单播到根，在根处排序，再向下广播。
          它用四条按地址交错的 logical bus，数据则走 crossbar。
        </p>
        <p>
          IBM Power5 是双核共享 L2 的芯片。它的 coherence 看起来像 split-transaction bus 上的 MESI，
          但网络是三条单向 ring（request、snoop response、data），状态集中还有为 outstanding request 准备的变体。
          两个系统说明同一件事：全序是协议要求，物理总线只是实现它的一种方式。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 7.7', 'Figure 7.7')}
      caption={t(
        '真实系统的共同手法：保留“全序 + 广播”的语义，换掉承载它的物理网络。',
        'The common trick in real systems: keep the semantics of \u201ctotal order + broadcast\u201d and replace the physical network that carries it.'
      )}
    >
      <div class="case-grid">
        <div class="case-card">
          <div class="case-head"><span class="mono">Starfire E10000</span><span class="case-tag">{t('64 核', '64 cores')}</span></div>
          <p>{t('logical bus 是一棵树：单播到根、在根排序、再广播；四条地址交错的总线；数据走 crossbar。', 'The logical bus is a tree: unicast to the root, serialize, broadcast down; four address-interleaved buses; data on a crossbar.')}</p>
          <span class="case-foot">{t('把“广播”从电气约束里解放出来。', 'Frees broadcast from electrical constraints.')}</span>
        </div>
        <div class="case-card">
          <div class="case-head"><span class="mono">IBM Power5</span><span class="case-tag">{t('2 核 / 节点', '2 cores / node')}</span></div>
          <p>{t('MESI 的变体；request、snoop response、data 各走一条单向 ring；request 绕环一周后才被吸收。', 'A MESI variant; requests, snoop responses, and data each use a unidirectional ring; a request is absorbed after a full lap.')}</p>
          <span class="case-foot">{t('ring 不天然提供全序，需要额外的排序机制。', 'Rings do not provide a total order for free; extra ordering is required.')}</span>
        </div>
        <div class="case-card wide">
          <div class="case-head"><span class="mono">{t('snooping 的适用边界', 'where snooping stops')}</span><span class="case-tag">{t('小规模', 'small scale')}</span></div>
          <p>
            {t(
              '广播的带宽随核数线性增长，snoop 的逻辑也随核数增长。超过几十个核后，directory 用“只问相关的人”换掉广播，这就是下一章。',
              'Broadcast bandwidth and snoop logic grow with the core count. Beyond a few dozen cores, a directory replaces broadcast with \u201cask only those involved\u201d — the next chapter.'
            )}
          </p>
          <span class="case-foot">{t('全序仍然重要，只是不再由一条总线提供。', 'The total order still matters; a single bus no longer has to provide it.')}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      <div class="pull">
        {t(
          'snooping 的“全序”不是总线给的，是协议要求的；总线只是最便宜的实现。',
          'Snooping\u2019s total order is required by the protocol, not granted by the bus; the bus is only the cheapest implementation.'
        )}
      </div>
      <p>
        {t(
          '下一章把广播换成目录：home 记录谁有副本，只给相关的人发消息。',
          'The next chapter replaces broadcast with a directory: the home records who has a copy and messages only those controllers.'
        )}
      </p>
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => navigate('/ch8')}>
          <span class="next-no display">08</span>
          <strong>{t('目录协议', 'Directory Protocols')}</strong>
          <span>{t('用 sharer / owner 位图替代广播，顺带解决死锁、目录编码与可扩展性。', 'Replace broadcast with sharer / owner bitmaps, and deal with deadlock, directory encoding, and scalability.')}</span>
        </button>
        <button class="next-card" onclick={() => navigate('/ch6')}>
          <span class="next-no display">06</span>
          <strong>{t('回到协议框架', 'Back to protocol framing')}</strong>
          <span>{t('controller、表格、状态与 transaction：本章的每张表都沿用那套语言。', 'Controllers, tables, states, and transactions: every table here reuses that language.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .order-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .order-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 13px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 11px;
  }

  .order-card.ok {
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .order-card.bad {
    background: #fbf3ee;
    border-color: #e3cbbf;
  }

  .order-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px;
    font-size: 9.5px;
    color: var(--ink-3);
  }

  .order-head .arrow {
    color: var(--gold);
  }

  .badge-ok,
  .badge-bad {
    margin-left: auto;
    padding: 0 6px;
    font-size: 8.5px;
    border-radius: 4px;
  }

  .badge-ok {
    color: var(--accent-deep);
    background: rgba(255, 253, 248, 0.8);
  }

  .badge-bad {
    color: #a3523b;
    background: rgba(255, 253, 248, 0.8);
  }

  .order-steps {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .step {
    display: flex;
    align-items: baseline;
    gap: 7px;
    font-size: 9.5px;
    line-height: 1.5;
    color: var(--ink-3);
  }

  .step b {
    flex: none;
    min-width: 34px;
    font-size: 9px;
    font-weight: 500;
    color: var(--accent-deep);
  }

  .order-foot {
    padding-top: 6px;
    font-size: 9px;
    color: var(--muted);
    border-top: 1px solid var(--line-2);
  }

  .fsm-wrap {
    display: flex;
    justify-content: center;
  }

  .fsm {
    width: 100%;
    max-width: 560px;
  }

  .fsm .st {
    font-family: 'JetBrains Mono', monospace;
    font-size: 19px;
    font-weight: 500;
  }

  .fsm .st.m {
    fill: var(--st-m);
  }

  .fsm .st.s {
    fill: var(--st-s);
  }

  .fsm .st.i {
    fill: var(--st-i);
  }

  .fsm .lbl {
    font-family: 'Inter', sans-serif;
    font-size: 9.5px;
    fill: var(--ink-3);
    paint-order: stroke;
    stroke: var(--card-2);
    stroke-width: 4px;
    stroke-linejoin: round;
  }

  .tbl-wrap {
    overflow-x: auto;
  }

  .spec {
    min-width: 560px;
  }

  .spec th {
    font-size: 8.5px;
  }

  .state-n {
    width: 86px;
    font-size: 12px;
    color: var(--accent-deep);
  }

  .state-n.m {
    color: var(--st-m);
  }

  .state-n.o {
    color: var(--st-o);
  }

  .state-n.e {
    color: var(--st-e);
  }

  .state-n.s {
    color: var(--st-s);
  }

  .act {
    display: block;
    font-size: 9.5px;
    color: var(--ink-2);
  }

  .nxt {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    color: var(--gold);
  }

  .muted {
    color: var(--muted);
    font-size: 9.5px;
  }

  .owner {
    min-width: 560px;
  }

  .owner th {
    font-size: 8.5px;
  }

  .owner td {
    font-size: 10px;
  }

  .lanes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .lane {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 13px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 11px;
  }

  .lane.accent {
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .lane-k {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    font-size: 10px;
    color: var(--accent-deep);
  }

  .lane-count {
    font-size: 9px;
    color: var(--muted);
  }

  .lane-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: stretch;
    gap: 6px;
  }

  .lstep {
    display: flex;
    align-items: baseline;
    gap: 5px;
    width: 100%;
    padding: 5px 7px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 6px;
  }

  .lstep b {
    flex: none;
    font-size: 9px;
    font-weight: 600;
    color: var(--ink-2);
  }

  .lstep span {
    min-width: 0;
    font-size: 9px;
    line-height: 1.45;
    color: var(--ink-3);
  }

  .lstep em {
    flex: none;
    margin-left: auto;
    font-style: normal;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    color: var(--gold);
  }

  .lstep.silent {
    border-style: dashed;
    border-color: #cfded9;
    background: rgba(255, 253, 248, 0.75);
  }

  .lane-arrow {
    color: var(--gold);
    font-size: 11px;
  }

  .lane-note {
    margin: 0;
    font-size: 9px;
    line-height: 1.55;
    color: var(--muted);
  }

  .timing {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .t-lane {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
  }

  .t-k {
    font-size: 9px;
    color: var(--muted);
  }

  .t-track {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 5px;
    padding: 5px 6px;
    background: var(--paper-2);
    border: 1px solid var(--line-2);
    border-radius: 8px;
  }

  .tbox {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 6px;
    font-size: 9px;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 5px;
  }

  .tbox b {
    font-size: 8.5px;
    font-weight: 500;
    color: var(--gold);
  }

  .tbox.req {
    border-color: #cfded9;
    background: var(--accent-soft);
  }

  .tbox.data {
    border-color: #ecdfc6;
    background: #f7efdf;
  }

  .tbox.idle {
    color: var(--muted);
    border-style: dashed;
  }

  .note-lane {
    align-items: start;
    margin-top: 2px;
  }

  .note-lane p {
    margin: 0;
    font-size: 9.5px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .case-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }

  .case-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 13px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 11px;
  }

  .case-card.wide {
    grid-column: 1 / -1;
    background: var(--paper-2);
  }

  .case-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    font-size: 10px;
    color: var(--accent-deep);
  }

  .case-tag {
    font-size: 8.5px;
    color: var(--gold);
  }

  .case-card p {
    margin: 0;
    font-size: 9.5px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .case-foot {
    padding-top: 5px;
    font-size: 9px;
    line-height: 1.5;
    color: var(--muted);
    border-top: 1px solid var(--line-2);
  }

  .fig-foot {
    margin: 8px 0 0;
    font-size: 9.5px;
    line-height: 1.6;
    color: var(--muted);
  }

  .next {
    margin-top: 40px;
  }

  .next-label {
    display: block;
    margin-bottom: 10px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .next-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .next-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
    text-align: left;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
    transition: border-color 0.2s var(--ease), background 0.2s var(--ease);
  }

  .next-card:hover {
    border-color: #d5c8ae;
    background: var(--card);
  }

  .next-no {
    font-size: 15px;
    color: var(--gold);
  }

  .next-card strong {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink-2);
  }

  .next-card > span:not(.next-no) {
    font-size: 10.5px;
    line-height: 1.55;
    color: var(--muted);
  }

  @media (max-width: 820px) {
    .order-grid,
    .lanes,
    .case-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .case-card.wide {
      grid-column: auto;
    }
  }

  @media (max-width: 560px) {
    .spec,
    .owner {
      min-width: 0;
    }

    .spec th,
    .owner th {
      font-size: 8px;
      white-space: normal;
    }

    .spec td,
    .owner td {
      font-size: 9.5px;
      padding: 6px 5px;
    }

    .state-n {
      width: 34px;
    }

    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .t-lane {
      grid-template-columns: minmax(0, 1fr);
    }

    .t-track {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
