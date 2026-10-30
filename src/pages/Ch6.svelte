<script lang="ts">
  import ChapterHead from '../components/ChapterHead.svelte';
  import Figure from '../components/Figure.svelte';
  import ViLab from '../components/ViLab.svelte';
  import { navigate } from '../lib/router.svelte';
  import { lang, t } from '../lib/lang.svelte';

  const en = $derived(lang.value === 'en');

  const moesi = [
    { s: 'M', valid: true, excl: true, owned: true, dirty: true },
    { s: 'O', valid: true, excl: false, owned: true, dirty: true },
    { s: 'E', valid: true, excl: true, owned: true, dirty: false },
    { s: 'S', valid: true, excl: false, owned: false, dirty: false },
    { s: 'I', valid: false, excl: false, owned: false, dirty: false }
  ];

  const transactions = [
    { id: 'GetS', zh: '取得 Shared（只读）权限', en: 'obtain the block in Shared (read-only) state' },
    { id: 'GetM', zh: '取得 Modified（读写）权限', en: 'obtain the block in Modified (read-write) state' },
    { id: 'Upg', zh: '把只读权限升级为读写，不搬运数据', en: 'upgrade read-only permission to read-write; no data transfer' },
    { id: 'PutS', zh: '驱逐 Shared 块（可以静默）', en: 'evict a Shared block (may be silent)' },
    { id: 'PutE', zh: '驱逐 Exclusive 块（可以静默）', en: 'evict an Exclusive block (may be silent)' },
    { id: 'PutO', zh: '驱逐 Owned 块', en: 'evict an Owned block' },
    { id: 'PutM', zh: '驱逐 Modified 块，数据写回', en: 'evict a Modified block, writing data back' }
  ];

  const coreReqs = [
    { req: 'load', zh: '命中直接返回；miss 发 GetS', en: 'hit returns data; miss initiates GetS' },
    { req: 'store', zh: '命中 E / M 才直接写；否则发 GetM 或 Upg', en: 'hit in E / M writes directly; otherwise GetM or Upg' },
    { req: 'atomic RMW', zh: '命中 E / M 就地原子执行；否则发 GetM 或 Upg', en: 'hit in E / M executes atomically; otherwise GetM or Upg' },
    { req: 'replacement', zh: '按被驱逐块的状态发对应的 Put', en: 'issue the Put that matches the evicted state' }
  ];
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={6}
      title="缓存一致性协议框架"
      en="Coherence Protocols"
      lede={en
        ? 'A coherence protocol is not a single algorithm but a family of controllers, each a finite state machine for every block. This chapter supplies the shared language — controllers, tables, states, transactions — that the next two chapters use to build snooping and directory protocols.'
        : 'coherence protocol 不是一段算法，而是一组 controller：每个存储结构、每条 block，都是一个有限状态机。这一章给出后面两种协议共用的语言——controller、表格、状态与 transaction。'}
    />

    <div class="prose">
      {#if en}
        <h3><span class="h-no">6.1</span>The big picture</h3>
        <p>
          The goal of a coherence protocol is narrow: for every block, keep the two invariants from Chapter 2 true at
          every moment — single-writer/multiple-reader (SWMR) and data value.
        </p>
        <p>
          The mechanism is to attach a finite state machine, called a <b>coherence controller</b>, to every storage
          structure: each cache and the LLC/memory. The controllers form a distributed system. They exchange messages so
          that, for each block, the invariants never break. How they interact is the protocol.
        </p>
        <p>
          A cache controller has two faces. On the <b>core side</b> it accepts loads and stores and returns loaded
          values; a miss makes it initiate a <b>coherence transaction</b>. On the <b>network side</b> it receives
          requests and responses from other controllers. A transaction is a request plus the other messages exchanged
          to satisfy it, such as a data response.
        </p>
        <p>
          A memory controller is similar but usually has only a network side: it does not issue requests on behalf of
          loads and stores, it answers them. I/O agents can act like cache controllers, memory controllers, or both.
          Each controller logically keeps one identical finite state machine per block, and an event changes only the
          block it names.
        </p>
      {:else}
        <h3><span class="h-no">6.1</span>大图景</h3>
        <p>
          coherence protocol 的目标很窄：对每条 block，在任何时刻都维持第 2 章的两条不变量——SWMR 与 data value。
        </p>
        <p>
          做法是给每个存储结构（每个 cache 与 LLC/memory）配一个有限状态机，叫作 <b>coherence controller</b>。
          这些 controller 组成一个分布式系统：它们互发消息，保证每条 block 的不变量在所有时刻都成立。
          controller 之间怎么交互，就是协议本身。
        </p>
        <p>
          cache controller 有两个面。<b>core side</b> 接核，收 load / store、回数据；miss 时由它发起一个
          <b>coherence transaction</b>。<b>network side</b> 接互连网络，收其他 controller 的请求与响应。
          transaction 是“一个 request 加上为满足它而交换的其他消息”，例如一条 DataResp。
        </p>
        <p>
          memory controller 类似，但通常只有 network side：它不为 load / store 发起请求，只负责应答。
          I/O 设备则可能表现得像 cache controller、memory controller，或两者兼有。
          每个 controller 对每条 block 逻辑上都有一条独立而相同的有限状态机；一个事件只改它命名的那条 block。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 6.1', 'Figure 6.1')}
      caption={t(
        'cache controller 有 core side 与 network side；memory controller 通常只有 network side。两者内部都是“每条 block 一个 FSM”。',
        'A cache controller has a core side and a network side; a memory controller usually has only the network side. Inside, both are one FSM per block.'
      )}
    >
      <div class="anatomy">
        <div class="an-card">
          <span class="an-head">{t('cache controller', 'cache controller')}</span>
          <div class="an-flow">
            <div class="an-side">
              <span class="an-k">core side</span>
              <span>loads &amp; stores</span>
              <span>loaded values</span>
            </div>
            <span class="an-arrow">↔</span>
            <div class="an-fsm">
              <span class="an-k">FSM</span>
              <span>{t('每条 block', 'per block')}</span>
            </div>
            <span class="an-arrow">↔</span>
            <div class="an-side">
              <span class="an-k">network side</span>
              <span>coherence requests</span>
              <span>responses</span>
            </div>
          </div>
        </div>
        <div class="an-card mem">
          <span class="an-head">{t('memory controller', 'memory controller')}</span>
          <div class="an-flow">
            <div class="an-side dim">
              <span class="an-k">{t('没有 core side', 'no core side')}</span>
              <span>{t('不替核发请求', 'does not issue core requests')}</span>
            </div>
            <span class="an-arrow">·</span>
            <div class="an-fsm">
              <span class="an-k">FSM</span>
              <span>{t('每条 block', 'per block')}</span>
            </div>
            <span class="an-arrow">↔</span>
            <div class="an-side">
              <span class="an-k">network side</span>
              <span>requests &amp; responses</span>
            </div>
          </div>
        </div>
      </div>
      <div class="eq mono">
        <span>{t('事件 E', 'event E')}</span>
        <span class="eq-plus">×</span>
        <span>{t('block 状态', 'block state')}</span>
        <span class="eq-arrow">→</span>
        <span>{t('动作', 'actions')}</span>
        <span class="eq-arrow">→</span>
        <span>{t('下一状态', 'next state')}</span>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <div class="note">
          <b>Protocol vs. implementation:</b> the table says which states and messages are observable. A pipeline,
          buffers, and speculative checks are free to change the implementation, but they may not invent a transition
          the specification does not contain.
        </div>
      {:else}
        <div class="note">
          <b>协议 ≠ 实现：</b>表里规定的是可观察的状态与消息。流水线、缓冲、并发检查都可以变，
          但不能引入表外的转移。
        </div>
      {/if}
    </div>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">6.2</span>Specifying a protocol with tables</h3>
        <p>
          The natural shape of a controller is a table. Rows are block states, columns are events, and each cell is a
          <b>transition</b>: the actions taken and the next state of the block. The notation is
          <code>action / next state</code>; the next state is omitted when it does not change, and shaded cells are
          impossible.
        </p>
        <p>
          Table 6.1 is deliberately incomplete, but it shows the method. Look at the RO row and the store column: the
          controller issues a request for read-write permission and moves the block to RW. Fill in the tables for every
          cache controller and every memory controller, and the protocol is fully specified.
        </p>
        <p>
          The differences between protocols are differences between tables: different states, transactions, events, and
          cells. That is why snooping and directory protocols can be compared at all despite looking so different.
        </p>
      {:else}
        <h3><span class="h-no">6.2</span>用表格写协议</h3>
        <p>
          controller 最自然的形状是一张表。行是 block 状态，列是事件，每个格子是一个 <b>transition</b>：
          要执行的动作，以及 block 的下一状态。写法是 <code>action / next state</code>；
          下一状态不变时可以省略，阴影格表示不可能发生。
        </p>
        <p>
          Table 6.1 是故意不完整的，但方法已经清楚了。看 RO 行与 store 列：controller 发出“申请读写权限”的请求，
          并把 block 移到 RW。把每个 cache controller 与 memory controller 的表都填满，协议就定义完了。
        </p>
        <p>
          协议之间的差别，就是表与表之间的差别：状态集合、transaction、事件、格子。正因如此，
          snooping 与 directory 这两种看起来完全不同的协议，才能放在同一套语言里比较。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 6.2', 'Figure 6.2')}
      caption={t(
        'Table 6.1：一个不完整的 cache controller。高亮格是“RO + store → issue GetM / RW”，也是表格化规格最典型的一步。',
        'Table 6.1: an incomplete cache controller. The highlighted cell reads “RO + store → issue GetM / RW”, the canonical shape of a tabular transition.'
      )}
    >
      <div class="tbl-wrap">
        <table class="table spec">
          <thead>
            <tr>
              <th>{t('状态', 'State')}</th>
              <th>{t('核 load', 'Load from core')}</th>
              <th>{t('核 store', 'Store from core')}</th>
              <th>{t('收到 GetM', 'Incoming GetM')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="mono state-n">{t('N · 不可读写', 'N · not readable')}</td>
              <td><span class="act">issue GetS</span><span class="nxt">RO</span></td>
              <td><span class="act">issue GetM</span><span class="nxt">RW</span></td>
              <td class="muted">—</td>
            </tr>
            <tr>
              <td class="mono state-n">RO</td>
              <td><span class="act">give data</span><span class="nxt">RO</span></td>
              <td class="hl"><span class="act">issue GetM</span><span class="nxt">RW</span></td>
              <td><span class="act">{t('无动作', 'no action')}</span><span class="nxt">N</span></td>
            </tr>
            <tr>
              <td class="mono state-n">RW</td>
              <td><span class="act">give data</span><span class="nxt">RW</span></td>
              <td><span class="act">write data</span><span class="nxt">RW</span></td>
              <td><span class="act">send block</span><span class="nxt">N</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="fig-foot">
        {t(
          'N / RO / RW 只是这张示例表的状态，不是最终协议。格子里的 action 与 next state 才是协议内容。',
          'N / RO / RW are just the states of this example, not a finished protocol. The action and next state in each cell are the protocol.'
        )}
      </p>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">6.3</span>A simple protocol: VI</h3>
        <p>
          VI strips the system to its bones: a shared bus, writeback caches, and two stable states. Caches and the
          LLC/memory are both I or V; a cache also has one transient state, IVD, while it waits for data.
        </p>
        <p>
          Three messages do all the work: <b>Get</b> asks for a block, <b>DataResp</b> carries the block's data, and
          <b>Put</b> writes a whole block back to memory. A load or store miss sends Get. The Get transaction is atomic:
          from the moment the Get appears until its DataResp arrives, no other transaction may use the bus.
        </p>
        <p>
          A hit is served locally. A miss parks the block in IVD; when DataResp arrives the cache copies the data,
          performs the pending load or store, and enters V. A cache in V answers another core's Get by sending DataResp
          and dropping to I.
        </p>
      {:else}
        <h3><span class="h-no">6.3</span>一个简单协议：VI</h3>
        <p>
          VI 把系统缩到骨架：一条共享总线、writeback cache、两个稳定状态。cache 与 LLC/memory 都只有 I 或 V；
          cache 还多一个 transient 状态 IVD，表示正在等数据。
        </p>
        <p>
          全部工作由三种消息完成：<b>Get</b> 请求一条 block，<b>DataResp</b> 送回数据，<b>Put</b> 把整块写回内存。
          load / store miss 都发 Get。Get 事务是原子的：从 Get 出现在总线上，到对应的 DataResp 到达，
          总线不允许其他 transaction 使用。
        </p>
        <p>
          hit 就地完成。miss 让 block 停在 IVD；DataResp 到达后，cache 拷贝数据、完成挂起的 load / store，再进入 V。
          处于 V 的 cache 遇到另一个核的 Get，必须回一条 DataResp，并降到 I。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 6.3', 'Figure 6.3')}
      caption={t(
        'VI 的稳定状态。V 只能有一个主人；一次 Get 加一条 DataResp 把 V 搬过去，Put 或 Other-Get 把它收回 I。',
        'The stable states of VI. Only one cache may hold V; a Get plus a DataResp carries it across, and Put or Other-Get returns it to I.'
      )}
    >
      <div class="fsm">
        <svg viewBox="0 0 460 168" role="img" aria-label={t('VI 稳定状态：I 与 V 之间的两条转移', 'VI stable states: two transitions between I and V')}>
          <defs>
            <marker id="vi-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--gold)" />
            </marker>
          </defs>
          <circle cx="108" cy="84" r="33" class="fsm-node" />
          <text x="108" y="90" text-anchor="middle" class="fsm-label">I</text>
          <circle cx="352" cy="84" r="33" class="fsm-node v" />
          <text x="352" y="90" text-anchor="middle" class="fsm-label">V</text>

          <path d="M 141 70 C 192 24, 268 24, 319 70" class="fsm-edge" marker-end="url(#vi-arrow)" />
          <text x="230" y="31" text-anchor="middle" class="fsm-cap">Own-Get + DataResp</text>

          <path d="M 319 99 C 268 146, 192 146, 141 99" class="fsm-edge" marker-end="url(#vi-arrow)" />
          <text x="230" y="160" text-anchor="middle" class="fsm-cap">Own-Put / Other-Get</text>
        </svg>
      </div>
      <div class="state-legend">
        <span><b class="mk i mono">I</b>{t('无效：cache 没有可用副本', 'invalid: the cache has no usable copy')}</span>
        <span><b class="mk ivd mono">IVD</b>{t('I → V，正在等 DataResp', 'I → V, waiting for DataResp')}</span>
        <span><b class="mk v mono">V</b>{t('有效：全系统唯一的可读写副本', 'valid: the system\u2019s only read-write copy')}</span>
      </div>
    </Figure>

    <Figure
      no={t('图 6.4', 'Figure 6.4')}
      caption={t(
        '亲手执行 VI。每个按钮就是表 6.2 / 6.3 的一行：load / store / evict 是 core 事件，Get / DataResp / Put 是总线事件。',
        'Run VI yourself. Every button is one row of Table 6.2 / 6.3: load / store / evict are core events; Get / DataResp / Put are bus events.'
      )}
    >
      <ViLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Three things are worth watching. First, VI has no Shared state: when a second core reads the block, the owner
          must hand the data over and fall to I, so the block ping-pongs between caches. Second, V is the only
          writable state, and a store hit changes only the local copy; other cores see it only after an Other-Get
          (cache-to-cache transfer) or a Put (writeback). Third, memory may stay stale the whole time — correctness
          rests on the owner's copy, which is the data-value invariant doing its job.
        </p>
        <p>
          In other words, VI compresses the MOES states into one V. It is correct, but every read by another core
          invalidates the owner, and every block move is a full transfer. It is a specification exercise, not a design
          anyone would ship.
        </p>
      {:else}
        <p>
          有三件事值得盯住。第一，VI 没有 Shared 状态：第二个核来读时，owner 必须把数据交出去并降为 I，
          所以 block 会在两个 cache 之间乒乓。第二，V 是唯一可写状态；store 命中只改本地副本，
          其他核要等到 Other-Get（cache-to-cache 搬运）或 Put（写回）才看得到。第三，内存可能一直是旧值——
          正确性靠 owner 手里的副本，这正是 data-value 不变量在协议里的样子。
        </p>
        <p>
          换句话说，VI 把 MOES 四个状态压成了一个 V。它是对的，但别的核每读一次就要让 owner 失效，
          每搬一次都是整块传输。它是一个规格练习，不是会拿去流片的设计。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 6.5', 'Figure 6.5')}
      caption={t(
        'Table 6.2 / 6.3 的紧凑版：cache controller 的三个状态与四类事件，memory controller 的两个状态与两种请求。',
        'A compact Table 6.2 / 6.3: three cache states and four events, two memory states and two requests.'
      )}
    >
      <div class="spec-grid">
        <div class="spec-block">
          <span class="spec-k">{t('cache controller', 'cache controller')}</span>
          <div class="tbl-wrap">
            <table class="table spec vi">
              <thead>
                <tr>
                  <th>{t('状态', 'State')}</th>
                  <th>Load / Store</th>
                  <th>Evict Block</th>
                  <th>DataResp (own)</th>
                  <th>Other-Get</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="mono state-n">I</td>
                  <td><span class="act">issue Get</span><span class="nxt">IVD</span></td>
                  <td class="muted">—</td>
                  <td class="muted">—</td>
                  <td class="muted">—</td>
                </tr>
                <tr>
                  <td class="mono state-n">IVD</td>
                  <td><span class="act">stall</span><span class="nxt">IVD</span></td>
                  <td><span class="act">stall</span><span class="nxt">IVD</span></td>
                  <td><span class="act">copy data, perform</span><span class="nxt">V</span></td>
                  <td class="muted">—</td>
                </tr>
                <tr>
                  <td class="mono state-n">V</td>
                  <td><span class="act">perform</span><span class="nxt">V</span></td>
                  <td><span class="act">issue Put</span><span class="nxt">I</span></td>
                  <td class="muted">—</td>
                  <td><span class="act">send DataResp</span><span class="nxt">I</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="spec-block">
          <span class="spec-k">{t('memory controller', 'memory controller')}</span>
          <div class="tbl-wrap">
            <table class="table spec vi">
              <thead>
                <tr>
                  <th>{t('状态', 'State')}</th>
                  <th>Get</th>
                  <th>Put</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="mono state-n">I</td>
                  <td><span class="act">send DataResp</span><span class="nxt">V</span></td>
                  <td class="muted">—</td>
                </tr>
                <tr>
                  <td class="mono state-n">V</td>
                  <td class="muted">{t('由 cache 回答', 'a cache answers')}</td>
                  <td><span class="act">update memory</span><span class="nxt">I</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">6.4</span>The protocol design space</h3>
        <h4>6.4.1 States</h4>
        <p>
          A designer chooses what a cache line's state must encode. Four properties matter: <b>validity</b>,
          <b>dirtiness</b>, <b>exclusivity</b>, and <b>ownership</b>. The first two exist even on a single core; the last
          two only appear when several actors share memory.
        </p>
        <p>
          MOESI is the classic five-state family. MSI is the foundation; O and E are optimizations. M is valid,
          exclusive, owned, and potentially dirty. S is valid but shared, clean, and not owned. I is invalid. O is owned
          and dirty but not exclusive; E is exclusive and owned but clean.
        </p>
      {:else}
        <h3><span class="h-no">6.4</span>协议的设计空间</h3>
        <h4>6.4.1 状态</h4>
        <p>
          设计者要先决定：一条 cache line 的状态要编码哪些信息。四个属性最关键：<b>validity</b>、<b>dirtiness</b>、
          <b>exclusivity</b> 与 <b>ownership</b>。前两个在单核里也存在；后两个只在多个 actor 共享内存时才有意义。
        </p>
        <p>
          MOESI 是最经典的五状态家族。MSI 是地基，O 与 E 是优化。M 有效、独占、owned，且可能 dirty；
          S 有效但共享、干净、不 owned；I 无效。O 是 owned 且 dirty，但不独占；E 独占且 owned，但干净。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 6.6', 'Figure 6.6')}
      caption={t(
        '把 MOESI 摊成矩阵：每个状态占哪些属性。VI 的 V 相当于把 M / O / E / S 压成了一列“valid”。',
        'MOESI as a matrix: which properties each state carries. VI\u2019s V collapses M / O / E / S into a single valid state.'
      )}
    >
      <div class="tbl-wrap">
        <table class="table moesi">
          <thead>
            <tr>
              <th>{t('状态', 'State')}</th>
              <th>{t('有效', 'valid')}</th>
              <th>{t('独占', 'exclusive')}</th>
              <th>{t('所有者', 'owned')}</th>
              <th>{t('脏', 'dirty')}</th>
              <th>{t('一句话', 'in one line')}</th>
            </tr>
          </thead>
          <tbody>
            {#each moesi as r}
              <tr class:row-i={r.s === 'I'}>
                <td class="mono state-n">{r.s}</td>
                <td class="dot-cell">{r.valid ? '●' : '—'}</td>
                <td class="dot-cell">{r.excl ? '●' : '—'}</td>
                <td class="dot-cell">{r.owned ? '●' : '—'}</td>
                <td class="dot-cell">{r.dirty ? '●' : '—'}</td>
                <td class="moesi-d">
                  {#if r.s === 'M'}{t('唯一的读写副本，内存可能过期', 'the only read-write copy; memory may be stale')}
                  {:else if r.s === 'O'}{t('负责应答，但别人也可以只读共享', 'answers requests, but others may share read-only')}
                  {:else if r.s === 'E'}{t('独占且干净，写下去不用再取数据', 'exclusive and clean: a write needs no data')}
                  {:else if r.s === 'S'}{t('只读共享，没有应答责任', 'read-only shared; no response duty')}
                  {:else}{t('没有可用副本', 'no usable copy')}{/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="fig-foot">
        {t(
          'E 在本书里算 ownership 状态；也有协议不这么处理。F 则是“干净版 O”，不在 MOESI 五个状态里。',
          'E is treated as an ownership state in this primer, though some protocols disagree. F is a “clean O” and lies outside the five MOESI states.'
        )}
      </p>
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Stable states describe a block at rest. Between two stable states there are <b>transient states</b>, written
          XYZ: moving from X to Y, waiting for event Z. IVD is exactly this — I, on the way to V, waiting for a
          DataResp. Real protocols have dozens of them, and implementations keep them in the miss status handling
          registers (MSHRs) that already track outstanding misses.
        </p>
        <p>
          The LLC/memory also has states, and there are two naming conventions. <b>Cache-centric</b> names aggregate the
          cache states: if every cache is I, the LLC is I; if any cache is V, the LLC is V. <b>Memory-centric</b> names
          describe what the memory controller may do: when no cache owns the block, memory is the owner, so its state is
          O, not I. The choice changes no behavior, but it confuses many readers.
        </p>
      {:else}
        <p>
          稳定状态描述“静止”的 block。两个稳定状态之间是 <b>transient state</b>，记作 XYZ：从 X 去 Y，等 Z 事件。
          IVD 就是如此——在 I，要去 V，等一条 DataResp。真实协议里 transient state 可能有几十个，
          实现通常把它们塞进已经在跟踪 outstanding miss 的 MSHR。
        </p>
        <p>
          LLC/memory 也有状态，而且有两套命名。<b>cache-centric</b>（更常见）是 cache 状态的聚合：
          所有 cache 都是 I，LLC 就是 I；有 cache 是 V，LLC 就是 V。<b>memory-centric</b> 描述的是内存控制器自己的权限：
          没有 cache 拥有这条 block 时，内存就是 owner，状态写 O 而不是 I。命名不影响行为，但读论文时很容易混淆。
        </p>
      {/if}
      <div class="naming">
        <div class="naming-card">
          <span class="naming-k">cache-centric</span>
          <div class="naming-row mono"><span>{t('所有 cache = I', 'all caches I')}</span><b>LLC = I</b></div>
          <div class="naming-row mono"><span>{t('某个 cache = V', 'some cache V')}</span><b>LLC = V</b></div>
        </div>
        <div class="naming-card">
          <span class="naming-k">memory-centric</span>
          <div class="naming-row mono"><span>{t('所有 cache = I', 'all caches I')}</span><b>LLC = O</b></div>
          <div class="naming-row mono"><span>{t('某个 cache = M / O', 'some cache M / O')}</span><b>LLC = I</b></div>
        </div>
      </div>
      <p>
        {t(
          '一个 inclusive LLC 会让这件事更简单：block 在 LLC 里，内存就沿用 LLC 的状态；不在 LLC 里，就隐含为 I，因为“不在 LLC”已经说明它不在任何 cache 里。',
          'An inclusive LLC makes this simpler: if a block is in the LLC, memory reuses the LLC state; if it is absent from the LLC, it is implicitly I, because absence from an inclusive LLC means it is in no cache.'
        )}
      </p>
    </div>

    <div class="prose">
      <h4>{t('6.4.2 Transaction 家族', '6.4.2 Transactions')}</h4>
      {#if en}
        <p>
          Most protocols share a small vocabulary of transactions, because their controllers want the same things.
          GetS and GetM acquire read-only and read-write permission; Upg upgrades a read-only copy without moving data;
          the Put family gives permission back and, if the block is dirty, writes it back.
        </p>
        <p>
          A core request maps onto these transactions in a mechanical way: a load hit returns data, a load miss starts
          GetS; a store writes directly only if the block is already E or M, otherwise it needs GetM or Upg; a
          replacement sends the Put that matches the state being evicted.
        </p>
      {:else}
        <p>
          大多数协议共享一小套 transaction，因为 controller 想要的东西是相似的。GetS 与 GetM 分别取得只读与读写权限；
          Upg 只升级权限、不搬数据；Put 家族交还权限，脏块还要写回。
        </p>
        <p>
          core 的请求机械地映射到这些 transaction：load 命中就返回，miss 发 GetS；store 只有在已经处于 E / M 时才直接写，
          否则要 GetM 或 Upg；replacement 则按被驱逐块的状态发对应的 Put。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 6.7', 'Figure 6.7')}
      caption={t(
        'Table 6.4 / 6.5：常见 transaction 的目标，以及 core 请求如何触发它们。Upg 与 GetM 的差别只在“要不要数据”。',
        'Table 6.4 / 6.5: what the common transactions want, and how core requests trigger them. Upg differs from GetM only in whether data moves.'
      )}
    >
      <div class="tx-grid">
        {#each transactions as tx}
          <div class="tx-card">
            <span class="tx-id mono">{tx.id}</span>
            <span class="tx-d">{t(tx.zh, tx.en)}</span>
          </div>
        {/each}
      </div>
      <div class="core-map">
        <span class="core-map-k">{t('core 请求 → transaction', 'core request → transaction')}</span>
        {#each coreReqs as r}
          <div class="core-map-row">
            <span class="mono req">{r.req}</span>
            <span>{t(r.zh, r.en)}</span>
          </div>
        {/each}
      </div>
    </Figure>

    <div class="prose">
      <h4>{t('6.4.3 设计选择', '6.4.3 Major design options')}</h4>
      {#if en}
        <p>
          Every protocol eventually answers two questions. The first is <b>snooping or directory</b>. A snooping
          controller broadcasts its request to everyone and relies on the network to deliver requests in one consistent
          order; a directory controller unicasts to the block's home, where a directory records the owner or sharers.
          Broadcasting is logically simple but does not scale; a directory scales but often pays an extra hop.
        </p>
        <p>
          The second question is orthogonal: on a write, <b>invalidate</b> the other copies or <b>update</b> them.
          Updating lowers the latency of a later read but consumes far more bandwidth, and it makes write atomicity and
          many consistency models much harder. That is why almost every real system invalidates.
        </p>
      {:else}
        <p>
          所有协议最后都要回答两个问题。第一个是 <b>snooping 还是 directory</b>。snooping controller 把请求广播给所有人，
          依赖互连网络以一致的顺序投递请求；directory controller 把请求单播给 block 的 home，由目录记录 owner 或 sharer。
          广播逻辑简单但不 scale；目录可扩展，代价常常是多一跳。
        </p>
        <p>
          第二个问题与第一个正交：写的时候是让其他副本 <b>invalidate</b>，还是把新值 <b>update</b> 给它们。
          update 降低后续读的延迟，但带宽开销大得多，还会让 write atomicity 与许多 consistency 模型难以实现。
          这也是为什么现实系统几乎都选择 invalidate。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 6.8', 'Figure 6.8')}
      caption={t(
        '两个正交的选择。snooping / directory 决定请求怎么到达 owner；invalidate / update 决定写如何影响其他副本。两者可以混合。',
        'Two orthogonal choices. Snooping / directory decides how a request reaches the owner; invalidate / update decides what a write does to other copies. Hybrids exist.'
      )}
    >
      <div class="opt-grid">
        <div class="opt-card">
          <div class="opt-head"><span class="opt-id mono">Snooping</span><span class="opt-tag">{t('广播', 'broadcast')}</span></div>
          <p>{t('请求发给所有 controller，网络保证一致的请求顺序；owner 直接回数据。', 'Requests go to every controller; the network orders them consistently, and the owner answers directly.')}</p>
          <span class="opt-trade">{t('逻辑简单，延迟低；不 scale。', 'Simple and low-latency; does not scale.')}</span>
        </div>
        <div class="opt-card">
          <div class="opt-head"><span class="opt-id mono">Directory</span><span class="opt-tag">{t('单播', 'unicast')}</span></div>
          <p>{t('请求发给 home，目录查 owner / sharer；home 直接回或转发给 owner。', 'Requests go to the home, whose directory names the owner or sharers; home answers or forwards.')}</p>
          <span class="opt-trade">{t('可扩展；home 不是 owner 时多一跳。', 'Scales; costs an extra hop when home is not the owner.')}</span>
        </div>
        <div class="opt-card">
          <div class="opt-head"><span class="opt-id mono">Invalidate</span><span class="opt-tag">{t('写时作废', 'invalidate on write')}</span></div>
          <p>{t('写者先收走其他副本，再本地写；读者下次重新取块。', 'The writer takes the other copies away, then writes locally; readers fetch again later.')}</p>
          <span class="opt-trade">{t('消息小，带宽友好；几乎所有系统都用。', 'Small messages and modest bandwidth; nearly universal.')}</span>
        </div>
        <div class="opt-card">
          <div class="opt-head"><span class="opt-id mono">Update</span><span class="opt-tag">{t('写时推送', 'push on write')}</span></div>
          <p>{t('写者把新值推给所有副本，读者不必重新取块。', 'The writer pushes the new value to every copy, so readers need not refetch.')}</p>
          <span class="opt-trade">{t('读延迟低；带宽大，write atomicity 更难。', 'Lower read latency; more bandwidth, harder write atomicity.')}</span>
        </div>
      </div>
      <p class="fig-foot">
        {t(
          '混合设计也存在：有的协议在 snooping 与 directory 之间切换，有的按访问模式在 invalidate 与 update 之间切换。',
          'Hybrids exist too: some protocols switch between snooping and directory, others between invalidate and update depending on the access pattern.'
        )}
      </p>
    </Figure>

    <div class="prose">
      <div class="pull">
        {t(
          '协议不是一段代码，而是一张对所有状态与事件都闭合的表：实现可以更快，但不能有表外的转移。',
          'A protocol is not a piece of code but a table closed over every state and event: an implementation may be faster, but it may not take a transition the table does not contain.'
        )}
      </div>
      <p>
        {t(
          '下一章把这套语言用在 snooping 上：从 MSI 起步，再加 E 与 O，最后换上 split-transaction bus。',
          'The next chapter applies this language to snooping: start from MSI, add E and O, and finally move to a split-transaction bus.'
        )}
      </p>
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => navigate('/ch7')}>
          <span class="next-no display">07</span>
          <strong>{t('监听协议', 'Snooping Protocols')}</strong>
          <span>{t('从 MSI 一路加到 MESI/MOSI，用一条总线让所有 cache 都听见请求。', 'From MSI to MESI/MOSI, with a bus that lets every cache hear every request.')}</span>
        </button>
        <button class="next-card" onclick={() => navigate('/ch2')}>
          <span class="next-no display">02</span>
          <strong>{t('回到一致性基础', 'Back to coherence basics')}</strong>
          <span>{t('SWMR 与 data-value 两条不变量，是本章所有表格的验收标准。', 'The SWMR and data-value invariants are the acceptance test for every table in this chapter.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .anatomy {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .an-card {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 12px 13px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .an-card.mem {
    background: var(--paper-2);
  }

  .an-head {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.04em;
    color: var(--accent-deep);
  }

  .an-flow {
    display: flex;
    align-items: stretch;
    gap: 6px;
  }

  .an-side,
  .an-fsm {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    flex: 1;
    min-width: 0;
    padding: 7px 8px;
    font-size: 9px;
    line-height: 1.45;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 7px;
  }

  .an-side.dim {
    opacity: 0.55;
    border-style: dashed;
  }

  .an-fsm {
    flex: 0 0 74px;
    text-align: center;
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #d5e2dd;
  }

  .an-k {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    color: var(--gold);
  }

  .an-arrow {
    align-self: center;
    flex: none;
    font-size: 12px;
    color: var(--gold);
  }

  .eq {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 12px;
    padding: 8px 10px;
    font-size: 10px;
    color: var(--ink-2);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 8px;
  }

  .eq-plus,
  .eq-arrow {
    color: var(--gold);
  }

  .tbl-wrap {
    overflow-x: auto;
  }

  .spec {
    min-width: 520px;
  }

  .spec th {
    white-space: nowrap;
  }

  .state-n {
    font-size: 10px;
    color: var(--ink-2);
    white-space: nowrap;
  }

  .act {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    line-height: 1.5;
    color: var(--ink-2);
  }

  .nxt {
    display: inline-block;
    margin-top: 2px;
    padding: 0 5px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-radius: 4px;
  }

  .spec td.hl {
    background: var(--accent-soft);
    box-shadow: inset 0 0 0 1px #cfded9;
    border-radius: 6px;
  }

  .spec td.hl .nxt {
    background: rgba(255, 253, 248, 0.9);
  }

  .spec td.muted {
    color: var(--muted);
    font-size: 10px;
  }

  .fig-foot {
    margin: 11px 0 0;
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--muted);
  }

  .fsm {
    padding: 2px 0;
  }

  .fsm svg {
    display: block;
    width: 100%;
    max-width: 560px;
    height: auto;
    margin: 0 auto;
  }

  .fsm-node {
    fill: var(--paper-2);
    stroke: var(--line);
    stroke-width: 1.2;
  }

  .fsm-node.v {
    fill: var(--accent-soft);
    stroke: #cfded9;
  }

  .fsm-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 17px;
    fill: var(--ink-2);
  }

  .fsm-edge {
    fill: none;
    stroke: var(--gold);
    stroke-width: 1.1;
  }

  .fsm-cap {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    fill: var(--ink-3);
  }

  .state-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    margin-top: 6px;
    font-size: 9.5px;
    color: var(--muted);
  }

  .state-legend span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .mk {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    padding: 0 4px;
    font-size: 8.5px;
    line-height: 1.6;
    border-radius: 4px;
    border: 1px solid transparent;
  }

  .mk.i {
    color: #6c665c;
    background: #f1ece1;
    border-color: #e5ddcb;
  }

  .mk.ivd {
    color: var(--gold);
    background: #f6eedf;
    border-color: #ecdfc6;
  }

  .mk.v {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .spec-grid {
    display: grid;
    grid-template-columns: 1.35fr 1fr;
    gap: 12px;
    align-items: start;
  }

  .spec-block {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .spec-k {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    letter-spacing: 0.04em;
    color: var(--muted);
  }

  .spec.vi {
    min-width: 430px;
  }

  .moesi {
    min-width: 560px;
  }

  .dot-cell {
    font-size: 12px;
    color: var(--accent-deep);
    text-align: center;
  }

  .row-i .dot-cell {
    color: var(--muted);
  }

  .moesi-d {
    font-size: 10.5px;
    color: var(--ink-3);
  }

  .naming {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 16px 0;
  }

  .naming-card {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 11px 12px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .naming-k {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: var(--gold);
  }

  .naming-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 3px 0;
    font-size: 9.5px;
    color: var(--ink-3);
    border-bottom: 1px solid var(--line-2);
  }

  .naming-row:last-child {
    border-bottom: 0;
  }

  .naming-row b {
    font-weight: 500;
    color: var(--accent-deep);
  }

  .tx-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
  }

  .tx-card:last-child {
    grid-column: 1 / -1;
  }

  .tx-card {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 8px 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 8px;
  }

  .tx-id {
    flex: none;
    min-width: 42px;
    font-size: 9.5px;
    color: var(--accent-deep);
  }

  .tx-d {
    font-size: 9.5px;
    line-height: 1.5;
    color: var(--ink-3);
  }

  .core-map {
    margin-top: 13px;
    padding-top: 11px;
    border-top: 1px solid var(--line-2);
  }

  .core-map-k {
    display: block;
    margin-bottom: 6px;
    font-size: 8.5px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .core-map-row {
    display: flex;
    align-items: baseline;
    gap: 9px;
    padding: 4px 0;
    font-size: 10px;
    line-height: 1.5;
    color: var(--ink-3);
  }

  .core-map-row .req {
    flex: none;
    min-width: 78px;
    font-size: 9px;
    color: var(--gold);
  }

  .opt-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }

  .opt-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 13px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 11px;
  }

  .opt-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .opt-id {
    font-size: 10.5px;
    color: var(--accent-deep);
  }

  .opt-tag {
    font-size: 8.5px;
    color: var(--gold);
  }

  .opt-card p {
    margin: 0;
    font-size: 10px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .opt-trade {
    padding-top: 6px;
    font-size: 9.5px;
    line-height: 1.5;
    color: var(--muted);
    border-top: 1px solid var(--line-2);
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

  button.next-card:hover {
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

  .next-card > span:not(.next-no):not(.soon) {
    font-size: 10.5px;
    line-height: 1.55;
    color: var(--muted);
  }

  @media (max-width: 820px) {
    .anatomy,
    .spec-grid,
    .naming,
    .opt-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 560px) {
    .spec,
    .spec.vi,
    .moesi {
      min-width: 0;
    }

    .spec th,
    .spec td,
    .moesi th,
    .moesi td {
      padding: 6px 5px;
    }

    .spec th,
    .moesi th {
      font-size: 8.5px;
      letter-spacing: 0.04em;
      white-space: normal;
    }

    .spec td,
    .moesi td {
      font-size: 10px;
    }

    .moesi-d {
      font-size: 9px;
    }

    .an-flow {
      flex-wrap: wrap;
    }

    .an-fsm {
      flex-basis: 100%;
    }

    .tx-grid,
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
