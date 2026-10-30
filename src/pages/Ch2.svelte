<script lang="ts">
  import ChapterHead from '../components/ChapterHead.svelte';
  import Figure from '../components/Figure.svelte';
  import Quiz from '../components/Quiz.svelte';
  import BaselineModel from '../components/BaselineModel.svelte';
  import EpochLab from '../components/EpochLab.svelte';
  import GranularityLab from '../components/GranularityLab.svelte';
  import ScopeLab from '../components/ScopeLab.svelte';
  import { navigate } from '../lib/router.svelte';
  import { lang, t } from '../lib/lang.svelte';

  const en = $derived(lang.value === 'en');

  const quiz = $derived(
    en
      ? [
          {
            q: 'Two cores want to modify two unrelated variables on the same cache line. What happens?',
            options: [
              'Nothing — coherence works at variable granularity',
              'Every write must take ownership of the whole line: false sharing',
              'The compiler merges the two writes',
              'The cache splits into two lines'
            ],
            answer: 1,
            why: 'The granularity of coherence is the line, just like the cache. Two variables on one line are treated as the same address, so a writer must take the other copy away.'
          },
          {
            q: 'In one epoch, C1 and C2 both write A=7. What does each invariant say?',
            options: ['Both hold', 'SWMR fails, data-value holds', 'SWMR holds, data-value fails', 'Both fail'],
            answer: 1,
            why: 'Every copy holds 7, so data-value cannot see it; but two writers in one epoch violate SWMR. This is why both invariants are needed.'
          },
          {
            q: 'Two cores only read the same data and never write. Do we still need coherence?',
            options: [
              'Yes, otherwise they read stale values',
              'No — with no writes, copies never differ',
              'Yes, otherwise the cache cannot hit',
              'Read-only sharing still needs SWMR'
            ],
            answer: 1,
            why: 'Without a writer there is no “new” versus “old” value. Read-only sharing contributes nothing to correctness (I/O and DMA are another story).'
          }
        ]
      : [
          {
            q: '两个核想在同一条 cache line 上改两个互不相关的变量。会发生什么？',
            options: ['没有影响，coherence 按变量粒度工作', '每次写都要取得整条 line 的所有权，产生 false sharing', '编译器会自动合并两次写', '缓存会分裂成两条 line'],
            answer: 1,
            why: 'coherence 的粒度和 cache 一样是 line。两个变量落在同一条 line 上，就被当成同一个地址处理，写者必须把对方的副本收走。'
          },
          {
            q: '某一个 epoch 里，C1 和 C2 同时写 A=7。两条不变量分别是什么结论？',
            options: ['两条都成立', 'SWMR 不成立，data-value 成立', 'SWMR 成立，data-value 不成立', '两条都不成立'],
            answer: 1,
            why: '副本的值全是 7，所以 data-value 看不出来；但同一段里出现两个写者，违反了 SWMR。这正说明两条不变量缺一不可。'
          },
          {
            q: '两个核只读同一份数据，从不写。还需要 coherence 协议吗？',
            options: ['需要，否则读到旧值', '不需要——没有写，副本永远相同', '需要，否则缓存无法命中', '只读也需要 SWMR'],
            answer: 1,
            why: '没有写者，就没有“新值”和“旧值”的区别。只读共享时 coherence 对正确性没有贡献（当然，I/O 与 DMA 是另一回事）。'
          }
        ]
  );
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={2}
      title="缓存一致性基础"
      en="Coherence Basics"
      lede={en
        ? 'Cache coherence cares about one thing: whether multiple copies of a single address can behave as if there were only one. It is independent of consistency, yet shared memory cannot work without it.'
        : 'cache coherence 只关心一件事：一个地址的多个副本，能不能表现得像只有一份。它与 consistency 无关，却决定了共享内存能不能工作。'}
    />

    <div class="prose">
      {#if en}
        <h3><span class="h-no">2.1</span>The baseline system</h3>
        <p>
          Start with the smallest system: some cores, a private L1 per core, one interconnect, and memory. Cores issue
          only loads and stores; caches move whole lines, request a line on a miss, and update the local copy on a
          write hit.
        </p>
        <p>
          There is no coherence protocol in this model — every cache is on its own. The model below follows exactly
          these rules, and you can break it by hand.
        </p>
      {:else}
        <h3><span class="h-no">2.1</span>基线系统</h3>
        <p>
          先画最小的系统：若干核，每个核一块私有 L1，一条互连，一份内存。核只发 load / store；cache 以 line 为单位搬运数据，
          未命中时向互连请求整条 line，写命中时先改本地副本。
        </p>
        <p>
          这个模型里还没有 coherence 协议——cache 各自为政。下面这个模型完全按这套规则工作，你可以亲手把它弄坏。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 2.1', 'Figure 2.1')}
      caption={t(
        '点按钮手动读写，或者直接重放书中第 2.2 节的时序。留意每个副本的状态（I / S / M）、值与内存里的值。',
        'Read and write with the buttons, or replay the §2.2 timeline. Watch each copy’s state (I / S / M), its value, and the value in memory.'
      )}
    >
      <BaselineModel />
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">2.2</span>The step that breaks it</h3>
        <p>
          C2 reads A first, gets 0, and stays in S; C1 reads A too, also S; then C1 writes A=1, updates only its own
          copy, and becomes M. Now C2 reads A again — a hit — and returns 0. Nothing reports an error, yet the two cores
          no longer agree on the order of accesses to A.
        </p>
        <p>
          C2’s read happens after C1’s write, yet returns a value from before the write. The serial semantics of one
          address are broken; this is what coherence must fix.
        </p>

        <div class="pull">
          Coherence does not order A before B; it only guarantees that, for one address, all cores see the same
          sequence of writes.
        </div>

        <div class="note">
          <b>The cost lives in the protocol, not the cache:</b> a writer either invalidates other copies or pushes the
          new value to them. The first is simpler; the second saves a miss. Chapter 7 walks down this fork.
        </div>
      {:else}
        <h3><span class="h-no">2.2</span>坏掉的那一步</h3>
        <p>
          C2 先读 A，拿到 0 并留在 S；C1 也读 A，同样 S；接着 C1 写 A=1，只改了自己的副本，变成 M。
          此时 C2 再读 A——命中，返回 0。整个过程中没有人报错，但两个核对 A 的访问已经没有共同的顺序可言。
        </p>
        <p>
          C2 的读发生在 C1 的写之后，却读到了写之前的值。单地址的串行语义被破坏了，这就是 coherence 要修的东西。
        </p>

        <div class="pull">
          coherence 不规定 A 与 B 谁先谁后；它只保证：对同一个地址，所有核看到的是同一个写序列。
        </div>

        <div class="note">
          <b>代价在协议，不在 cache：</b>写者要么让别人的副本失效（invalidate），要么把新值推给它们（update）。
          前者简单、后者省一次缺失，第 7 章会把这条岔路走完。
        </div>
      {/if}
    </div>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">2.3</span>The coherence interface</h3>
        <p>
          Almost every coherence protocol is the same set of messages filled in differently: cores issue loads and
          stores; a cache completes a hit locally; on a miss, or when write permission is needed, the controller sends
          a request over the interconnect and another controller or memory returns data. The protocol only specifies
          what may be sent and returned, in which state, upon which message.
        </p>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Direction</th><th>Message</th><th>Meaning</th></tr>
            </thead>
            <tbody>
              <tr><td>{t('核 → 控制器', 'core → controller')}</td><td class="num"><span class="msg-dir">{t('核 → 控制器', 'core → controller')}</span>load / store</td><td>{t('程序发起访存，命中就本地完成', 'the program issues an access; a hit completes locally')}</td></tr>
              <tr><td>{t('控制器 → 其他控制器', 'controller → others')}</td><td class="num"><span class="msg-dir">{t('控制器 → 其他控制器', 'controller → others')}</span>ReadReq(line)</td><td>{t('请求一份只读副本', 'request a read-only copy')}</td></tr>
              <tr><td>{t('控制器 → 其他控制器', 'controller → others')}</td><td class="num"><span class="msg-dir">{t('控制器 → 其他控制器', 'controller → others')}</span>WriteReq(line)</td><td>{t('请求独占，准备写', 'request exclusivity to write')}</td></tr>
              <tr><td>{t('其他控制器 / 内存 → 控制器', 'others / memory → controller')}</td><td class="num"><span class="msg-dir">{t('其他控制器 / 内存 → 控制器', 'others / memory → controller')}</span>DataResp(value)</td><td>{t('数据返回，可能来自 cache 也可能来自内存', 'data returns, from a cache or from memory')}</td></tr>
              <tr><td>{t('控制器 → 其他控制器', 'controller → others')}</td><td class="num"><span class="msg-dir">{t('控制器 → 其他控制器', 'controller → others')}</span>Invalidation</td><td>{t('请把这条 line 作废', 'invalidate this line')}</td></tr>
              <tr><td>{t('其他控制器 → 控制器', 'others → controller')}</td><td class="num"><span class="msg-dir">{t('其他控制器 → 控制器', 'others → controller')}</span>InvAck</td><td>{t('已作废，不会再返回旧值', 'done; the old value will not be returned')}</td></tr>
            </tbody>
          </table>
        </div>

        <p>
          Names change with the protocol: snooping broadcasts requests on a bus, a directory sends them point to point.
          But request, data, invalidation, and acknowledgment keep recurring; Chapter 6 turns them into state machines
          and protocol tables.
        </p>
      {:else}
        <h3><span class="h-no">2.3</span>缓存一致性接口</h3>
        <p>
          几乎所有 coherence 协议都是同一组消息的两套填法：核发 load / store，cache 命中就直接完成；未命中或需要写权限时，
          控制器向互连发请求，别的控制器或内存回数据。协议要规定的，只是“在什么状态下、收到什么消息、能发什么回什么”。
        </p>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>方向</th><th>消息</th><th>含义</th></tr>
            </thead>
            <tbody>
              <tr><td>核 → 控制器</td><td class="num"><span class="msg-dir">核 → 控制器</span>load / store</td><td>程序发起访存，命中就本地完成</td></tr>
              <tr><td>控制器 → 其他控制器</td><td class="num"><span class="msg-dir">控制器 → 其他控制器</span>ReadReq(line)</td><td>请求一份只读副本</td></tr>
              <tr><td>控制器 → 其他控制器</td><td class="num"><span class="msg-dir">控制器 → 其他控制器</span>WriteReq(line)</td><td>请求独占，准备写</td></tr>
              <tr><td>其他控制器 / 内存 → 控制器</td><td class="num"><span class="msg-dir">其他控制器 / 内存 → 控制器</span>DataResp(value)</td><td>数据返回，可能来自 cache 也可能来自内存</td></tr>
              <tr><td>控制器 → 其他控制器</td><td class="num"><span class="msg-dir">控制器 → 其他控制器</span>Invalidation</td><td>请把这条 line 作废</td></tr>
              <tr><td>其他控制器 → 控制器</td><td class="num"><span class="msg-dir">其他控制器 → 控制器</span>InvAck</td><td>已作废，不会再返回旧值</td></tr>
            </tbody>
          </table>
        </div>

        <p>
          名字随协议不同：监听协议把请求广播到总线，目录协议点对点送达。但请求、数据、失效、确认这四类角色反复出现，
          第 6 章会把它们写成状态机与协议表。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 2.2', 'Figure 2.2')}
      caption={t(
        '消息的粒度是 cache line，不是变量。切换 line 大小，看 A 与 B 什么时候被绑在一起。',
        'The unit of coherence is the cache line, not the variable. Change the line size and watch when A and B get tied together.'
      )}
    >
      <GranularityLab />
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">2.4</span>Two invariants</h3>
        <p>
          Cut time into epochs: within each one, accesses to an address “look” atomic. Coherence means there exists
          such a partition for which both of the following hold.
        </p>
        <ul>
          <li>
            <strong>SWMR</strong> (single-writer, multiple-reader): in an epoch either there is exactly one writer and
            no other access, or any number of readers and no writer; never a writer plus anyone else.
          </li>
          <li>
            <strong>data-value</strong>: all copies in an epoch hold the same value, and that value is the one left by
            the most recent write.
          </li>
        </ul>
      {:else}
        <h3><span class="h-no">2.4</span>两个不变量</h3>
        <p>
          把时间切成一段段 epoch：每一段里，对某个地址的访问“看起来”是原子发生的。coherence 的定义就是——
          存在这样一种划分，使得下面两条同时成立。
        </p>
        <ul>
          <li>
            <strong>SWMR</strong>（single-writer, multiple-reader）：一段里要么只有一个写者且没有其他访问，
            要么任意多个读者且没有写者；绝不出现“写者加别人”。
          </li>
          <li>
            <strong>data-value</strong>：一段里所有副本的值都相同，且等于最近一次写留下的值。
          </li>
        </ul>
      {/if}
    </div>

    <Figure
      no={t('图 2.3', 'Figure 2.3')}
      caption={t(
        '三种时序，引擎逐段检查两条不变量，违反的 epoch 会被标出来。切到“两个写者”看看 data-value 的盲区。',
        'Three timelines; the engine checks both invariants epoch by epoch and flags violations. Switch to “Two writers” to see data-value’s blind spot.'
      )}
    >
      <EpochLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Neither is optional. With data-value alone, two cores writing the same value can slip through; with SWMR
          alone, copies can still sit on a stale value. Together they are what “looks like a single memory” really
          means.
        </p>

        <div class="note">
          <b>Scope note:</b> this definition deliberately says nothing about cross-address order. Whether A is seen
          before B belongs to consistency, which starts in Chapter 3.
        </div>
      {:else}
        <p>
          两条缺一不可。只有 data-value，两个核写同一个值也能蒙混过关；只有 SWMR，副本仍可能停在旧值上。
          合起来才是“像只有一份内存”的严格含义。
        </p>

        <div class="note">
          <b>注意边界：</b>这个定义刻意不涉及跨地址顺序。A 和 B 谁先被看见，属于 consistency，第 3 章才开始处理。
        </div>
      {/if}
    </div>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">2.5</span>Maintaining the invariants</h3>
        <p>
          Implementations face only a handful of forks; later chapters fill them in:
        </p>
        <ul>
          <li><strong>Invalidate or update</strong>: the writer invalidates other copies, or pushes the new value to them. Invalidate is simpler; update saves readers a miss.</li>
          <li><strong>Write-through or write-back</strong>: does a write reach the next level immediately? Write-back must handle who takes over a dirty line on eviction.</li>
          <li><strong>Who answers a miss</strong>: the memory controller, the cache holding the newest value, or a directory. Snooping and directory protocols part ways here.</li>
        </ul>
      {:else}
        <h3><span class="h-no">2.5</span>怎么维持这两个不变量</h3>
        <p>
          实现上只有几个岔路口，后面的章节都在填这些岔路：
        </p>
        <ul>
          <li><strong>失效还是更新</strong>：写者让别人的副本作废，还是把新值推过去。失效实现简单，更新让读者少一次缺失。</li>
          <li><strong>写直达还是回写</strong>：写是否立刻到下一级。回写要处理脏 line 被换出时谁来接盘。</li>
          <li><strong>谁响应缺失</strong>：内存控制器、持有最新值的 cache，还是目录。监听协议与目录协议在这里分道。</li>
        </ul>
      {/if}
    </div>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">2.6</span>When coherence is needed</h3>
        <p>
          Coherence is neither free nor always necessary. It has work to do only when three conditions hold at once —
          turn them off one by one and see when it applies.
        </p>
      {:else}
        <h3><span class="h-no">2.6</span>什么时候才需要 coherence</h3>
        <p>
          coherence 不是免费的，也不是永远必要的。三个条件同时成立时，它才有事可做——把开关逐个关掉，看它什么时候失效。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 2.4', 'Figure 2.4')}
      caption={t(
        'coherence 的适用条件。任何一条不成立，副本都不可能分叉。',
        'The conditions under which coherence applies. If any one fails, copies cannot diverge.'
      )}
    >
      <ScopeLab />
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          But “the data is not shared” is often an illusion: the compiler puts two variables in one line and sharing
          happens; DMA and I/O devices also bypass caches and write memory directly. Chapters 9 and 10 pick these cases
          back up.
        </p>
      {:else}
        <p>
          但“数据不共享”经常是错觉：编译器把两个变量放进同一条 line，共享就发生了；DMA 与 I/O 设备也会绕过 cache 直接改内存。
          第 9、10 章会把这些情况重新捡回来。
        </p>
      {/if}
    </div>

    <div class="prose">
      <h3><span class="h-no">2.7</span>{t('自测', 'Quiz')}</h3>
    </div>

    <Figure
      no={t('图 2.5', 'Figure 2.5')}
      caption={t(
        '三题都答对，说明粒度、不变量与适用条件已经连成一条线。',
        'Three correct answers tie granularity, invariants, and applicability into one line of reasoning.'
      )}
    >
      <Quiz questions={quiz} />
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">2.8</span>Summary</h3>
        <p>
          Coherence is a local property: one address, a set of copies, two invariants. It can be implemented with a tiny
          protocol or cost a great deal; but it cannot answer “the order between several addresses” — that needs
          another problem domain, the next chapter.
        </p>
      {:else}
        <h3><span class="h-no">2.8</span>小结</h3>
        <p>
          coherence 是一个局部性质：一个地址、一组副本、两条不变量。它可以用很小的协议实现，也可以很贵；
          但它回答不了“多个地址之间的顺序”——那需要另一个问题域，也就是下一章。
        </p>
      {/if}
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => navigate('/ch3')}>
          <span class="next-no display">03</span>
          <strong>{t('顺序连贯性', 'Sequential Consistency')}</strong>
          <span>{t('给所有操作一个全序，再亲手排一次交错。', 'Give all operations a total order, then weave an interleaving by hand.')}</span>
        </button>
        <button class="next-card" onclick={() => navigate('/ch1')}>
          <span class="next-no display">01</span>
          <strong>{t('回到两个问题', 'Back to the two questions')}</strong>
          <span>{t('coherence 与 consistency 的边界图，可以随时回看。', 'The map of the coherence/consistency boundary, always available.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .table-wrap {
    margin: 18px 0 20px;
    padding: 4px 14px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 12px;
    overflow-x: auto;
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

  .msg-dir {
    display: none;
  }

  @media (max-width: 560px) {
    .table th:first-child,
    .table td:first-child {
      display: none;
    }

    .msg-dir {
      display: block;
      margin-bottom: 3px;
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      letter-spacing: 0;
      color: var(--muted);
    }
  }

  @media (max-width: 780px) {
    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
