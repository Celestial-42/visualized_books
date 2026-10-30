<script lang="ts">
  import ChapterHead from '../components/ChapterHead.svelte';
  import Figure from '../components/Figure.svelte';
  import ScopeLab from '../components/ScopeLab.svelte';
  import { navigate } from '../lib/router.svelte';
  import { lang, t } from '../lib/lang.svelte';

  const en = $derived(lang.value === 'en');
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={10}
      title="异构系统"
      en="Consistency and Coherence for Heterogeneous Systems"
      lede={en
        ? 'A GPU is not a small CPU. It has thousands of threads, an L1 per SM, no hardware coherence between those L1s, and a memory model that expects the programmer to name a scope. This chapter follows coherence out of the CPU and into that world.'
        : 'GPU 不是“小一号的 CPU”。它有成千上万个线程、每个 SM 一个 L1、这些 L1 之间没有硬件 coherence，还有一个要求程序员写出 scope 的内存模型。这一章把 coherence 带出 CPU，进入那个世界。'}
    />

    <div class="prose">
      {#if en}
        <h3><span class="h-no">10.1</span>A hierarchy with names: CTA, GPU, system</h3>
        <p>
          A GPU is organized as SMs (streaming multiprocessors), each running many threads. Threads are
          grouped into warps for execution and into <b>CTAs</b> (cooperative thread arrays, also called
          thread blocks or workgroups) for sharing. An SM has its own L1; all SMs share an L2; the CPU and
          GPU may share an LLC and memory.
        </p>
        <p>
          Early GPUs did not keep those L1s coherent. They relied on the programmer: threads in the same CTA
          share an L1, so a fence inside a CTA is enough; threads in different CTAs do not, so early models
          simply disallowed inter-CTA synchronization. The workaround was to bypass L1 with special loads and
          stores aimed at the L2 — correct, but slow and easy to get wrong.
        </p>
        <p>
          Modern GPGPU models expose the hierarchy as <b>scopes</b>. A CTA scope covers threads on one SM and
          implies its L1. A GPU scope covers all threads of the device and implies the L2. A system scope
          covers CPUs, GPUs, and other accelerators, and implies the LLC or shared memory. Scope is not a
          hint; it is part of the contract.
        </p>
      {:else}
        <h3><span class="h-no">10.1</span>有名字的层次：CTA、GPU、system</h3>
        <p>
          GPU 由若干 SM（streaming multiprocessor）组成，每个 SM 跑很多线程。线程按 warp 执行，
          按 <b>CTA</b>（cooperative thread array，也叫 thread block / workgroup）共享数据。
          每个 SM 有自己的 L1；所有 SM 共享 L2；CPU 与 GPU 可能共享 LLC 与内存。
        </p>
        <p>
          早期 GPU 不保证这些 L1 之间 coherent，而是把责任交给程序员：同一 CTA 的线程共享 L1，
          CTA 内的 fence 就够了；不同 CTA 之间没有这个保证，于是早期模型干脆不允许跨 CTA 同步。
          变通办法是用绕过 L1、直接打到 L2 的特殊 load / store——正确，但慢且容易写错。
        </p>
        <p>
          现代 GPGPU 模型把层次暴露成 <b>scope</b>。CTA scope 覆盖同一个 SM 上的线程，隐含 L1；
          GPU scope 覆盖整个 device，隐含 L2；system scope 覆盖 CPU、GPU 与其他加速器，隐含 LLC 或共享内存。
          scope 不是提示，而是契约的一部分。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 10.1', 'Figure 10.1')}
      caption={t(
        '层次与 scope 一一对应：CTA 对应 SM 的 L1，GPU 对应 L2，system 对应 LLC / 共享内存。',
        'Hierarchy and scope line up: CTA maps to an SM\u2019s L1, GPU to the L2, system to the LLC / shared memory.'
      )}
    >
      <div class="hier">
        <div class="hier-block">
          <div class="cpu">
            <span class="blk-k">CPU</span>
            <div class="cores"><span>core</span><span>core</span><span>core</span><span>core</span></div>
            <span class="blk-sub">L1 × N</span>
          </div>
          <div class="gpu">
            <span class="blk-k">GPU</span>
            <div class="sms">
              <div class="sm">
                <span>SM</span><span class="l1">L1</span>
                <em>{t('CTA scope', 'CTA scope')}</em>
              </div>
              <div class="sm">
                <span>SM</span><span class="l1">L1</span>
                <em>CTA</em>
              </div>
            </div>
            <div class="l2">GPU L2 <em>{t('GPU scope', 'GPU scope')}</em></div>
          </div>
          <div class="llc">LLC + memory <em>{t('System scope', 'System scope')}</em></div>
        </div>
      </div>
      <p class="fig-foot">
        {t(
          'scope 内的 fence 只需让该层共享结构看到顺序；scope 外的 agent 不受约束。',
          'A fence within a scope only has to order through that level\u2019s shared structure; agents outside the scope are not constrained.'
        )}
      </p>
    </Figure>

    <div class="prose">
      {#if en}
        <div class="note">
          <b>No coherence does not mean no consistency.</b> Early GPUs enforced a scoped relaxed model without
          coherent L1s. The two ideas are orthogonal here too: the model says what order is required; coherence
          is only one way to implement it.
        </div>
      {:else}
        <div class="note">
          <b>没有 coherence 不等于没有 consistency。</b>早期 GPU 在没有 coherent L1 的情况下仍实现了
          scoped relaxed 模型。两者依旧正交：模型规定需要什么顺序，coherence 只是实现它的一种方式。
        </div>
      {/if}
    </div>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">10.2</span>Temporal coherence: borrow, then expire</h3>
        <p>
          If a GPU does not invalidate L1 copies eagerly, it can instead give each cached block a <b>lease</b>.
          A reader brings a block into its L1 for a finite time; when the lease expires, the block is
          self-invalidated. A writer that reaches the shared L2 waits until the block's lease has expired
          before writing. At the moment of the write, no reader can still hold a valid copy — SWMR holds.
        </p>
        <p>
          The consistency-agnostic version makes the <b>writer</b> wait. The consistency-directed version lets
          the write complete, returns the greatest write-completion time (GWCT), and makes a <b>fence</b> wait
          instead. Only synchronization pays; ordinary stores keep flowing. Both versions need a global notion
          of time, write-through/no-write-allocate L1s, and an inclusive L2.
        </p>
      {:else}
        <h3><span class="h-no">10.2</span>Temporal coherence：借一段时间，然后失效</h3>
        <p>
          如果 GPU 不主动作废 L1 副本，它可以给每条缓存的 block 一个 <b>lease</b>。读者把块带进 L1 一段时间；
          lease 到期后块自己失效。写者到达共享 L2 时，要等该块的 lease 过期才能写。写发生的那一刻，
          不可能还有读者持有有效副本——SWMR 成立。
        </p>
        <p>
          consistency-agnostic 版本让 <b>写者</b> 等。consistency-directed 版本允许写完成，返回最大的写完成时间
          （GWCT），改让 <b>fence</b> 等。只有同步付出代价，普通 store 继续流动。两个版本都需要全局时间、
          write-through / no-write-allocate 的 L1，以及 inclusive 的 L2。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 10.2', 'Figure 10.2')}
      caption={t(
        'lease 让写者等到没有读者：data 的 lease 到 30，写者就等到 31；flag 到期后，读者重新去 L2 取到新值。',
        'Leases make the writer wait for readers to drain: data\u2019s lease runs to 30, so the writer waits until 31; after flag expires, the reader refetches it from L2.'
      )}
    >
      <div class="time">
        <div class="t-row">
          <span class="t-k">{t('SM1 · 写者', 'SM1 · writer')}</span>
          <div class="t-track">
            <span class="tb write" style="grid-column: 1 / 3">St data <i>{t('等 lease = 30', 'waits for lease = 30')}</i></span>
            <span class="tb write" style="grid-column: 4 / 5">St flag</span>
          </div>
        </div>
        <div class="t-row">
          <span class="t-k">{t('SM2 · 读者', 'SM2 · reader')}</span>
          <div class="t-track">
            <span class="tb lease" style="grid-column: 1 / 3">{t('L1 持有 flag（lease 35）→ 到期', 'L1 holds flag (lease 35) → expires')}</span>
            <span class="tb read" style="grid-column: 4 / 5">{t('重新取 flag = 1', 'refetch flag = 1')}</span>
            <span class="tb read" style="grid-column: 5 / 6">{t('再取 data = 1', 'then data = 1')}</span>
          </div>
        </div>
        <div class="t-row">
          <span class="t-k">L2</span>
          <div class="t-track">
            <span class="tb l2" style="grid-column: 2 / 4">{t('写 data 要等 lease 过期', 'data write waits for lease')}</span>
            <span class="tb l2" style="grid-column: 4 / 6">{t('写 flag 时已无读者', 'flag write finds no readers')}</span>
          </div>
        </div>
        <div class="t-axis"><span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span></div>
      </div>
      <p class="fig-foot">
        {t(
          'consistency-directed 版本把“等”从 L2 移到 fence：写立即完成，fence 拖到 GWCT 之后再放行。',
          'The consistency-directed version moves the wait from the L2 to the fence: writes finish immediately, and the fence stalls until GWCT.'
        )}
      </p>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">10.3</span>Release consistency-directed coherence</h3>
        <p>
          Temporal coherence still performs a coherence action on a timer. <b>Release consistency-directed
          coherence</b> goes further: coherence actions are triggered by the synchronization operations
          themselves. A release publishes earlier writes to the scope; an acquire makes the reader's copies
          coherent before subsequent loads. Between synchronization points, nothing is invalidated eagerly.
        </p>
        <p>
          This is the same idea as release consistency from Chapter 5, but used to drive the coherence protocol
          rather than only the memory ordering. It fits heterogeneous systems because the expensive work is
          paid only where the programmer asked for order, and the scope says exactly which agents must
          participate.
        </p>
      {:else}
        <h3><span class="h-no">10.3</span>Release consistency-directed coherence</h3>
        <p>
          temporal coherence 至少还按时间做 coherence 动作。release consistency-directed coherence 更进一步：
          coherence 动作由同步操作本身触发。release 把之前的写发布到 scope；acquire 在后续 load 之前
          让读者的副本变 coherent。两个同步点之间，什么也不主动作废。
        </p>
        <p>
          这与第 5 章的 release consistency 是同一个想法，只是它不仅决定内存顺序，还驱动 coherence 协议。
          它适合异构系统：昂贵的工作只在程序员要求顺序的地方付出，而 scope 精确说明哪些 agent 必须参与。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 10.3', 'Figure 10.3')}
      caption={t(
        '三种做法：eager 每次写都作废；lease 到期自失效；RC-directed 只在 release / acquire 时动。',
        'Three approaches: eager invalidates on every write; leases self-invalidate on expiry; RC-directed acts only at release / acquire.'
      )}
    >
      <div class="cmp">
        <div class="cmp-card">
          <div class="cmp-head"><span class="mono">eager</span><span class="cmp-tag">{t('snooping / directory', 'snooping / directory')}</span></div>
          <p>{t('写时立刻作废或转发，读者下次重新取。', 'Invalidate or forward immediately on a write; readers refetch later.')}</p>
          <span class="cmp-line">{t('代价：每条写都可能产生消息', 'cost: every write may generate messages')}</span>
        </div>
        <div class="cmp-card">
          <div class="cmp-head"><span class="mono">temporal</span><span class="cmp-tag">{t('lease', 'lease')}</span></div>
          <p>{t('读者持有一段租约，到期自失效；写者等租约结束。', 'Readers hold a lease and self-invalidate at expiry; writers wait for it to end.')}</p>
          <span class="cmp-line">{t('代价：全局时间、可能空等', 'cost: global time, possible waiting')}</span>
        </div>
        <div class="cmp-card accent">
          <div class="cmp-head"><span class="mono">RC-directed</span><span class="cmp-tag">{t('release / acquire', 'release / acquire')}</span></div>
          <p>{t('release 发布写，acquire 刷新副本；只在同步点动。', 'Release publishes writes; acquire refreshes copies; action only at synchronization.')}</p>
          <span class="cmp-line">{t('代价：需要 scope 语义与正确的标注', 'cost: scope semantics and correct annotations')}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">10.4</span>Try it: does the fence cover you?</h3>
        <p>
          The lab is a message-passing litmus test. T1 writes <code>data = 1</code>, then <code>flag = 1</code>;
          T2 spins on the flag and then reads data. Choose where the threads live, the scope of the fence, and
          whether there is a fence at all. The only question is whether T2 must see the new data.
        </p>
      {:else}
        <h3><span class="h-no">10.4</span>试一试：fence 管得到你吗？</h3>
        <p>
          实验是一个 message-passing litmus test。T1 写 <code>data = 1</code>，再写 <code>flag = 1</code>；
          T2 自旋等 flag，然后读 data。选择线程的位置、fence 的 scope、以及是否加 fence。
          问题只有一个：T2 是否必然看到新 data。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 10.4', 'Figure 10.4')}
      caption={t(
        'scope 实验：顺序只在 fence 覆盖的 agent 之间成立；coherence 与 consistency 在这里汇合。',
        'Scope lab: order holds only among the agents a fence covers; coherence and consistency meet here.'
      )}
    >
      <ScopeLab />
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">10.5</span>From one chip to a system</h3>
        <p>
          Mobile SoCs usually share physical memory between CPU and GPU: an integrated GPU's L2 and the CPU's
          last-level cache may even be the same structure, which makes system-scope coherence practical.
          Discrete GPUs sit behind PCIe or CXL, with separate memory; coherence becomes a software or
          interconnect problem, often solved by page migration, I/O page tables, or a coherent interconnect.
        </p>
        <p>
          In every case the questions are the same: what is the consistency model, what does a scope cover,
          and which hardware makes that scope true? A GPU that supports system-scope fences must have a path
          by which those fences reach the CPU's caches, not just the GPU's L2.
        </p>
      {:else}
        <h3><span class="h-no">10.5</span>从一颗芯片到一个系统</h3>
        <p>
          移动 SoC 通常让 CPU 与 GPU 共享物理内存：集成 GPU 的 L2 与 CPU 的 last-level cache 甚至可能是同一个结构，
          这让 system-scope coherence 变得可行。独立 GPU 位于 PCIe 或 CXL 之后，有独立内存；coherence 变成
          软件或互连问题，常靠 page migration、I/O page table 或 coherent interconnect 解决。
        </p>
        <p>
          不论哪种形态，问题都一样：consistency 模型是什么，scope 覆盖谁，哪部分硬件让这个 scope 成立？
          一个支持 system-scope fence 的 GPU，必须有一条路径让 fence 到达 CPU 的 cache，而不只是 GPU 的 L2。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 10.5', 'Figure 10.5')}
      caption={t(
        'scope 的覆盖范围与它隐含的共享结构；scope 越大，硬件需要触及的 cache 层级越高。',
        'What each scope covers and the shared structure it implies; a larger scope reaches higher in the cache hierarchy.'
      )}
    >
      <div class="tbl-wrap">
        <table class="table scope">
          <thead>
            <tr>
              <th>scope</th>
              <th>{t('覆盖的线程', 'threads covered')}</th>
              <th>{t('隐含的共享结构', 'implied structure')}</th>
              <th>{t('典型同步', 'typical sync')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="mono">CTA</td>
              <td>{t('同一个 workgroup / SM', 'one workgroup / SM')}</td>
              <td>L1 + {t('本地 scratchpad', 'local scratchpad')}</td>
              <td>{t('CTA 内 barrier', 'intra-CTA barrier')}</td>
            </tr>
            <tr>
              <td class="mono">GPU</td>
              <td>{t('同一个 device 的所有 CTA', 'all CTAs of one device')}</td>
              <td>GPU L2</td>
              <td>{t('kernel 内跨 CTA', 'cross-CTA within a kernel')}</td>
            </tr>
            <tr>
              <td class="mono">System</td>
              <td>{t('CPU、GPU 与其他加速器', 'CPU, GPU, and other accelerators')}</td>
              <td>LLC / {t('共享内存', 'shared memory')}</td>
              <td>{t('跨设备消息传递', 'cross-device message passing')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Figure>

    <Figure
      no={t('图 10.6', 'Figure 10.6')}
      caption={t(
        '三种异构形态：共享芯片、独立设备、以及通过 coherent 互连组成的系统。coherence 的实现位置不同，scope 语义相同。',
        'Three shapes of heterogeneity: one chip, a discrete device, and a coherent interconnect. Coherence lives in different places; scope semantics stay the same.'
      )}
    >
      <div class="systems">
        <div class="sys-card">
          <div class="sys-head"><span class="mono">SoC / APU</span><span class="sys-tag">{t('共享内存', 'shared memory')}</span></div>
          <p>{t('CPU 与 GPU 共享 LLC / 内存；system-scope coherence 可以由硬件直接实现。', 'CPU and GPU share the LLC / memory; system-scope coherence can be implemented directly in hardware.')}</p>
          <span class="sys-foot">{t('移动 SoC、AMD APU。', 'Mobile SoCs, AMD APUs.')}</span>
        </div>
        <div class="sys-card">
          <div class="sys-head"><span class="mono">{t('独立 GPU', 'discrete GPU')}</span><span class="sys-tag">PCIe</span></div>
          <p>{t('独立显存；共享内存靠 page migration / 统一虚拟地址 / I/O page table。', 'Separate VRAM; sharing relies on page migration, unified virtual addressing, or I/O page tables.')}</p>
          <span class="sys-foot">{t('coherence 往往是软件辅助的。', 'Coherence is often software-assisted.')}</span>
        </div>
        <div class="sys-card">
          <div class="sys-head"><span class="mono">CXL / CCIX</span><span class="sys-tag">{t('互连', 'interconnect')}</span></div>
          <p>{t('coherent 互连把加速器纳入系统 scope；代价是协议、延迟与一致性维护。', 'A coherent interconnect brings accelerators into system scope; the cost is protocol, latency, and maintenance.')}</p>
          <span class="sys-foot">{t('scope 变成互连契约的一部分。', 'Scope becomes part of the interconnect contract.')}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      <div class="pull">
        {t(
          '异构系统的 coherence 问题不是“要不要共享”，而是“在哪个 scope 上、由谁付钱让共享成立”。',
          'The coherence question in heterogeneous systems is not whether to share, but at which scope, and who pays to make sharing true.'
        )}
      </div>
      <p>
        {t(
          '下一章换个视角：这些协议与模型如何被精确描述、如何被测试，以及为什么一个“看起来对”的协议仍然需要形式化验证。',
          'The next chapter changes perspective: how these protocols and models are specified precisely, how they are tested, and why a protocol that \u201clooks right\u201d still needs formal validation.'
        )}
      </p>
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => navigate('/ch11')}>
          <span class="next-no display">11</span>
          <strong>{t('规格与验证', 'Specifying & Validating')}</strong>
          <span>{t('operational 与 axiomatic 两种规格、litmus、执行空间探索与形式化验证。', 'Operational and axiomatic specifications, litmus tests, execution-space exploration, and formal validation.')}</span>
        </button>
        <button class="next-card" onclick={() => navigate('/ch5')}>
          <span class="next-no display">05</span>
          <strong>{t('回到 relaxed 模型', 'Back to relaxed models')}</strong>
          <span>{t('scope 与 release / acquire 的语义，在第 5 章已经打好地基。', 'The semantics of scope and release / acquire were prepared in Chapter 5.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .hier {
    padding: 6px;
  }

  .hier-block {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .cpu,
  .gpu,
  .llc {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 8px 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 8px;
  }

  .blk-k {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    color: var(--accent-deep);
  }

  .cores {
    display: flex;
    gap: 5px;
  }

  .cores span {
    flex: 1;
    padding: 3px;
    font-size: 8.5px;
    text-align: center;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  .blk-sub {
    font-size: 8px;
    color: var(--muted);
  }

  .sms {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .sm {
    display: flex;
    align-items: baseline;
    gap: 5px;
    padding: 5px 7px;
    font-size: 8.5px;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 5px;
  }

  .sm .l1 {
    color: var(--gold);
  }

  .sm em {
    margin-left: auto;
    font-style: normal;
    font-size: 7.5px;
    color: var(--accent-deep);
  }

  .l2 {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 5px 8px;
    font-size: 8.5px;
    color: var(--ink-3);
    background: var(--paper-2);
    border: 1px dashed #cfded9;
    border-radius: 5px;
  }

  .l2 em,
  .llc em {
    font-style: normal;
    font-size: 7.5px;
    color: var(--accent-deep);
  }

  .llc {
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    font-size: 8.5px;
    color: var(--ink-3);
    background: var(--paper-2);
    border-style: dashed;
  }

  .time {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .t-row {
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr);
    gap: 8px;
    align-items: center;
  }

  .t-k {
    font-size: 8.5px;
    color: var(--muted);
  }

  .t-track {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 4px;
    padding: 4px;
    background: var(--paper-2);
    border: 1px solid var(--line-2);
    border-radius: 6px;
  }

  .tb {
    padding: 4px 6px;
    font-size: 8.5px;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  .tb i {
    display: block;
    font-style: normal;
    font-size: 7.5px;
    color: var(--muted);
  }

  .tb.write {
    border-color: #e3cbbf;
    background: #fbf3ee;
  }

  .tb.lease {
    border-color: #ecdfc6;
    background: #f7efdf;
  }

  .tb.read {
    border-color: #cfded9;
    background: var(--accent-soft);
  }

  .tb.l2 {
    border-style: dashed;
  }

  .t-axis {
    display: flex;
    justify-content: space-between;
    padding-left: 100px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.5px;
    color: var(--muted);
  }

  .cmp {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }

  .cmp-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 11px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .cmp-card.accent {
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .cmp-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px;
    font-size: 9.5px;
    color: var(--accent-deep);
  }

  .cmp-tag {
    font-size: 8px;
    color: var(--gold);
  }

  .cmp-card p {
    margin: 0;
    font-size: 9px;
    line-height: 1.55;
    color: var(--ink-3);
  }

  .cmp-line {
    margin-top: auto;
    padding-top: 5px;
    font-size: 8.5px;
    color: var(--muted);
    border-top: 1px solid var(--line-2);
  }

  .tbl-wrap {
    overflow-x: auto;
  }

  .scope {
    min-width: 520px;
  }

  .scope th {
    font-size: 8.5px;
  }

  .scope td {
    font-size: 9.5px;
  }

  .systems {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }

  .sys-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 11px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .sys-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px;
    font-size: 9.5px;
    color: var(--accent-deep);
  }

  .sys-tag {
    font-size: 8px;
    color: var(--gold);
  }

  .sys-card p {
    margin: 0;
    font-size: 9px;
    line-height: 1.55;
    color: var(--ink-3);
  }

  .sys-foot {
    padding-top: 5px;
    font-size: 8.5px;
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
    .cmp,
    .systems {
      grid-template-columns: minmax(0, 1fr);
    }

    .t-row {
      grid-template-columns: minmax(0, 1fr);
    }

    .t-axis {
      padding-left: 0;
    }
  }

  @media (max-width: 560px) {
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .sms {
      grid-template-columns: minmax(0, 1fr);
    }

    .scope {
      min-width: 0;
    }

    .scope th,
    .scope td {
      font-size: 8.5px;
      padding: 6px 5px;
    }
  }
</style>
