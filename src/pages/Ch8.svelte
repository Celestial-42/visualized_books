<script lang="ts">
  import ChapterHead from '../components/ChapterHead.svelte';
  import Figure from '../components/Figure.svelte';
  import DirLab from '../components/DirLab.svelte';
  import { navigate } from '../lib/router.svelte';
  import { lang, t } from '../lib/lang.svelte';

  const en = $derived(lang.value === 'en');
</script>

<div class="page">
  <div class="reader">
    <ChapterHead
      n={8}
      title="目录协议"
      en="Directory Coherence Protocols"
      lede={en
        ? 'Broadcast works until it does not. A directory replaces \u201ctell everyone\u201d with \u201cask the home, which knows who has a copy\u201d: fewer messages, an extra hop, and a new set of problems — deadlock, directory encoding, and what to do when the directory itself is too big.'
        : '广播在规模变大时失效。directory 把“告诉所有人”换成“问 home，它知道谁有副本”：消息更少、多一跳，也带来一组新问题——死锁、目录编码，以及目录本身太大时怎么办。'}
    />

    <div class="prose">
      {#if en}
        <h3><span class="h-no">8.1</span>A layer of indirection</h3>
        <p>
          A directory keeps, for every block, a global summary: its coherence state, the owner if the block
          is modified, and the set of sharers if it is shared. A cache never broadcasts; it unicasts a request
          to the <b>home</b> (the directory controller for that address). The home either answers directly or
          forwards the request to the current owner.
        </p>
        <p>
          That indirection changes the shape of a transaction. When the home is the owner (U or S), it is a
          two-step transaction: request, response. When a cache owns the block (M), it is three steps: request,
          forwarded request, response. When a write must invalidate K sharers, it is also three steps, but the
          response is split into K acknowledgements.
        </p>
        <p>
          Ordering moves too. Snooping ordered requests on the broadcast network; a directory orders them at the
          home. There is no global order, so a requestor cannot infer that everyone has seen its request. It needs
          explicit acknowledgements from exactly the caches that held a copy. That is the price of not
          broadcasting.
        </p>
      {:else}
        <h3><span class="h-no">8.1</span>一层间接</h3>
        <p>
          directory 为每条 block 保存一份全局摘要：coherence 状态、处于 M 时的 owner、以及处于共享状态时的
          sharer 集合。cache 不再广播，而是把请求单播给该地址的 <b>home</b>（对应的 directory controller）。
          home 要么直接回答，要么把请求转发给当前 owner。
        </p>
        <p>
          这层间接改变了 transaction 的形状。home 就是 owner 时（U 或 S），是两步：request、response。
          块在某个 cache 里是 M 时，是三步：request、forwarded request、response。
          写操作要作废 K 个 sharer 时也是三步，只是 response 被拆成 K 个 acknowledgement。
        </p>
        <p>
          排序的位置也变了。snooping 在广播网络上排序 request；directory 在 home 排序。
          没有全局顺序之后，requestor 不能推断“所有人都看到了我的请求”，它必须收到那些确实持有副本的 cache
          发来的显式 acknowledgement。这就是不广播的代价。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 8.1', 'Figure 8.1')}
      caption={t(
        '三种典型 transaction。两步最快；三步多一跳；失效要等所有 Inv-Ack 到齐。',
        'Three typical transactions. Two steps is fastest; three adds a hop; invalidation waits for every Inv-Ack.'
      )}
    >
      <div class="flows">
        <div class="flow">
          <span class="flow-k">{t('读到 U / S 块', 'read a U / S block')}</span>
          <div class="flow-row">
            <span class="chip"><b class="mono">C1</b>GetS</span>
            <span class="arr">→</span>
            <span class="chip dir"><b class="mono">Dir</b>{t('回 Data', 'sends Data')}</span>
            <span class="arr">→</span>
            <span class="chip"><b class="mono">C1</b>S</span>
          </div>
          <span class="flow-note">{t('2 步：request + response', '2 steps: request + response')}</span>
        </div>

        <div class="flow">
          <span class="flow-k">{t('读到 M 块', 'read an M block')}</span>
          <div class="flow-row">
            <span class="chip"><b class="mono">C1</b>GetS</span>
            <span class="arr">→</span>
            <span class="chip dir"><b class="mono">Dir</b>Fwd-GetS → C2</span>
            <span class="arr">→</span>
            <span class="chip"><b class="mono">C2</b>{t('回 Data', 'sends Data')}</span>
          </div>
          <span class="flow-note">{t('3 步：home 转发给 owner', '3 steps: the home forwards to the owner')}</span>
        </div>

        <div class="flow">
          <span class="flow-k">{t('写 S 块', 'write an S block')}</span>
          <div class="flow-row">
            <span class="chip"><b class="mono">C1</b>GetM</span>
            <span class="arr">→</span>
            <span class="chip dir"><b class="mono">Dir</b>Data[ack=K] + Inv × K</span>
            <span class="arr">→</span>
            <span class="chip"><b class="mono">C2…</b>Inv-Ack</span>
          </div>
          <span class="flow-note">{t('3 步，且要等 K 个 Inv-Ack 到齐', '3 steps, and all K Inv-Acks must arrive')}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">8.2</span>Baseline: MSI at the home</h3>
        <p>
          The simplest directory entry has three fields: a <b>state</b> (U, S, or M), an <b>owner</b> (only
          meaningful in M), and a <b>sharer vector</b> (one bit per cache, only meaningful in S). The directory
          describes the caches, not itself: a directory state of M means “some cache has the block in M”.
        </p>
        <p>
          Cache-side states are still I, S, and M. The new transaction is <b>PutS</b>: in the baseline, a cache
          may not silently drop a shared copy, because the directory would keep sending invalidations to a cache
          that no longer has the block. Directory protocols therefore pay an explicit eviction message that
          snooping could avoid.
        </p>
      {:else}
        <h3><span class="h-no">8.2</span>基线：home 上的 MSI</h3>
        <p>
          最简单的目录项有三个字段：<b>state</b>（U、S 或 M）、<b>owner</b>（只在 M 时有意义）、
          <b>sharer 位图</b>（每个 cache 一位，只在 S 时有意义）。目录描述的是 cache，而不是它自己：
          目录状态为 M 的意思是“某个 cache 以 M 持有该块”。
        </p>
        <p>
          cache 侧仍只有 I、S、M。新的 transaction 是 <b>PutS</b>：基线里 cache 不能静默丢掉共享副本，
          否则目录会继续给一个已经没有该块的 cache 发失效。directory 协议因此要为驱逐付出显式消息，
          这是 snooping 可以省掉的。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 8.2', 'Figure 8.2')}
      caption={t(
        '目录项：状态 2 位 + owner log₂N 位 + sharer 位图 N 位。示例是 N=4、C1 与 C3 共享。',
        'A directory entry: 2 state bits + log₂N owner bits + an N-bit sharer vector. The example has N=4 with C1 and C3 sharing.'
      )}
    >
      <div class="entry">
        <div class="entry-fields">
          <div class="ef state">
            <span class="ef-k">{t('状态', 'state')}</span>
            <span class="ef-v mono">S</span>
            <span class="ef-b">{t('2 bit', '2 bits')}</span>
          </div>
          <div class="ef owner">
            <span class="ef-k">{t('owner', 'owner')}</span>
            <span class="ef-v mono">—</span>
            <span class="ef-b">log₂N</span>
          </div>
          <div class="ef sharers">
            <span class="ef-k">{t('sharer 位图', 'sharer vector')}</span>
            <span class="ef-v mono bits"><i class="on">1</i><i>0</i><i class="on">1</i><i>0</i></span>
            <span class="ef-b">N</span>
          </div>
        </div>
        <div class="entry-meta">
          <span><b class="mono">C1</b> {t('有副本', 'has a copy')}</span>
          <span><b class="mono">C2</b> {t('没有', 'none')}</span>
          <span><b class="mono">C3</b> {t('有副本', 'has a copy')}</span>
          <span><b class="mono">C4</b> {t('没有', 'none')}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <p>
          Table 8.1 lists the stable-state transactions. The GetM row is the interesting one: when the directory
          is S, it sends data plus an <b>AckCount</b> to the requestor and an invalidate to every sharer. The
          requestor may write only after it has both the data and all the acks.
        </p>
      {:else}
        <p>
          表 8.1 列出稳定状态下的 transaction。最有意思的是 GetM 那一行：目录为 S 时，它把数据和
          <b>AckCount</b> 一起发给 requestor，同时给每个 sharer 发 Inv。requestor 必须同时拿到数据和全部 ack，
          才能开始写。
        </p>
      {/if}
    </div>

    <Figure
      no={t('表 8.1', 'Table 8.1')}
      caption={t(
        'MSI directory 的稳定状态 transaction；K 是 sharer 数。',
        'Stable-state MSI directory transactions; K is the number of sharers.'
      )}
    >
      <div class="tbl-wrap">
        <table class="table spec">
          <thead>
            <tr>
              <th>{t('转移', 'transition')}</th>
              <th>{t('目录状态', 'directory state')}</th>
              <th>{t('消息序列', 'messages')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="mono state-n">I → S</td>
              <td class="mono">U / S</td>
              <td><span class="act">GetS → Dir</span><span class="nxt">Data ← Dir</span></td>
            </tr>
            <tr>
              <td class="mono state-n">I → S</td>
              <td class="mono">M</td>
              <td><span class="act">GetS → Dir</span><span class="nxt">Fwd-GetS → owner · Data ← owner</span></td>
            </tr>
            <tr>
              <td class="mono state-n">I / S → M</td>
              <td class="mono">U</td>
              <td><span class="act">GetM → Dir</span><span class="nxt">Data[ack=0] ← Dir</span></td>
            </tr>
            <tr>
              <td class="mono state-n">I / S → M</td>
              <td class="mono">S</td>
              <td><span class="act">GetM → Dir</span><span class="nxt">Data[ack=K] + Inv × K · Inv-Ack × K</span></td>
            </tr>
            <tr>
              <td class="mono state-n">I / S → M</td>
              <td class="mono">M</td>
              <td><span class="act">GetM → Dir</span><span class="nxt">Fwd-GetM → owner · Data ← owner</span></td>
            </tr>
            <tr>
              <td class="mono state-n">M → I</td>
              <td class="mono">M</td>
              <td><span class="act">PutM + data → Dir</span><span class="nxt">Put-Ack ← Dir</span></td>
            </tr>
            <tr>
              <td class="mono state-n">S → I</td>
              <td class="mono">S</td>
              <td><span class="act">PutS → Dir</span><span class="nxt">Put-Ack ← Dir</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">8.3</span>Try it: the directory sees everything</h3>
        <p>
          The lab issues each request to the directory and lets you watch the three message classes: requests,
          forwarded requests / invalidations, and responses. The sharer vector is not decoration — it is
          exactly the set of caches the directory will invalidate.
        </p>
      {:else}
        <h3><span class="h-no">8.3</span>试一试：目录什么都知道</h3>
        <p>
          实验把每个请求先送到目录，并让你看到三类消息：request、forwarded request / invalidation、response。
          sharer 位图不是装饰——它正是目录要发失效的那组 cache。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 8.3', 'Figure 8.3')}
      caption={t(
        '目录实验：状态、位图、内存与消息日志都由确定性协议推演。',
        'Directory lab: states, vector, memory, and the message log all come from one deterministic protocol.'
      )}
    >
      <DirLab />
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">8.4</span>Adding E and O</h3>
        <p>
          The directory can grant <b>E</b> when a read finds no sharers: the block is clean and only one cache
          has it, so a later store upgrades silently. This is the same optimization as MESI, now decided by the
          home instead of inferred from a bus.
        </p>
        <p>
          <b>O</b> is more interesting. When an M owner supplies data to a reader, it need not write memory. It
          can keep a dirty, shared copy while the directory records both “owner” and “sharers”. The owner still
          answers reads; memory stays stale; an eviction must carry the data back with PutO. MOESI is the state
          set; MOSI drops E; MSI drops both.
        </p>
      {:else}
        <h3><span class="h-no">8.4</span>加 E 与 O</h3>
        <p>
          读请求发现没有 sharer 时，目录可以授予 <b>E</b>：块是干净的，而且只有一个 cache 持有，
          之后的 store 就能静默升级。这与 MESI 的优化相同，只是由 home 判定，而不是从总线推断。
        </p>
        <p>
          <b>O</b> 更有意思。M 的 owner 向读者供数时不必写回内存，它可以保留一份脏的共享副本，
          目录同时记录“owner”和“sharers”。owner 仍负责回答读；内存保持旧值；驱逐时必须用 PutO 把数据带回去。
          MOESI 是完整状态集；MOSI 去掉 E；MSI 两个都去掉。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 8.4', 'Figure 8.4')}
      caption={t(
        '目录状态与“谁回答”：U/S/E 由 home 回答，M/O 由 owner 回答；只有 M/O 会让内存变旧。',
        'Directory states and who answers: the home answers for U/S/E, the owner for M/O; only M/O leave memory stale.'
      )}
    >
      <div class="tbl-wrap">
        <table class="table roles">
          <thead>
            <tr>
              <th>{t('目录状态', 'dir state')}</th>
              <th>{t('cache 侧', 'caches')}</th>
              <th>{t('谁回答读', 'who answers')}</th>
              <th>{t('内存最新?', 'memory current?')}</th>
              <th>{t('驱逐', 'eviction')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="mono state-n">U</td>
              <td>{t('都没有', 'none')}</td>
              <td>{t('home', 'home')}</td>
              <td>{t('是', 'yes')}</td>
              <td class="muted">—</td>
            </tr>
            <tr>
              <td class="mono state-n s">S</td>
              <td>{t('≥1 个 S', '≥1 S')}</td>
              <td>{t('home', 'home')}</td>
              <td>{t('是', 'yes')}</td>
              <td>PutS</td>
            </tr>
            <tr>
              <td class="mono state-n e">E</td>
              <td>{t('一个 E', 'one E')}</td>
              <td>{t('home', 'home')}</td>
              <td>{t('是', 'yes')}</td>
              <td>{t('静默', 'silent')}</td>
            </tr>
            <tr>
              <td class="mono state-n m">M</td>
              <td>{t('一个 M', 'one M')}</td>
              <td>{t('owner', 'owner')}</td>
              <td>{t('否', 'no')}</td>
              <td>PutM + data</td>
            </tr>
            <tr>
              <td class="mono state-n o">O</td>
              <td>{t('一个 O + 若干 S', 'one O + S')}</td>
              <td>{t('owner', 'owner')}</td>
              <td>{t('否', 'no')}</td>
              <td>PutO + data</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="fig-foot">
        {t(
          'E 让第一次 store 免掉 GetM；O 让 M 降级为共享时免掉写回。两者都省消息，但都要求目录多记一点状态。',
          'E removes the first GetM; O removes the writeback when M degrades to shared. Both save messages and both cost directory state.'
        )}
      </p>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">8.5</span>Deadlock is a message-class problem</h3>
        <p>
          A received message can cause a new message to be sent. If requests, forwarded requests, and responses
          share one set of queues, a cycle can form: every controller is holding a full input queue and waiting
          to send into someone else’s full queue. Being FIFO makes it worse — the response cannot pass the
          request ahead of it.
        </p>
        <p>
          The standard fix is to separate message classes: a <b>request network</b>, a <b>forwarded request
          network</b>, and a <b>response network</b> (physical or virtual). A response is never blocked by a
          request, so the cycle cannot close. The forwarded-request network needs point-to-point ordering;
          the others need no ordering.
        </p>
      {:else}
        <h3><span class="h-no">8.5</span>死锁是“消息类”的问题</h3>
        <p>
          收到消息可能触发发送新消息。如果 request、forwarded request 与 response 共用一组队列，
          就可能形成环：每个 controller 都占着满的输入队列，同时在等别人的满队列腾位置。
          FIFO 让情况更糟——response 无法越过它前面的 request。
        </p>
        <p>
          标准解法是按消息类拆网：<b>request network</b>、<b>forwarded request network</b>、
          <b>response network</b>（物理或虚拟均可）。response 永远不会被 request 挡住，环就闭不上。
          forwarded request 网络需要 point-to-point ordering；其余网络不需要顺序。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 8.5', 'Figure 8.5')}
      caption={t(
        '同一组 FIFO 队列里，两个 response 都被别人的 request 堵住；按消息类拆网后，response 总能被消费。',
        'With one set of FIFO queues, two responses are each blocked by the other side\u2019s requests; separate networks let every response drain.'
      )}
    >
      <div class="dl">
        <div class="dl-card bad">
          <div class="dl-head"><span>{t('共用一组队列', 'one shared queue')}</span><span class="tag">{t('可能死锁', 'deadlock')}</span></div>
          <div class="dl-body">
            <div class="node">
              <b class="mono">C1</b>
              <span class="q full">{t('队列满：全是 request', 'queue full: requests')}</span>
              <span class="send">{t('想发 response', 'wants to send response')}</span>
            </div>
            <div class="cycle">
              <span class="cyc-arrow">⇄</span>
              <span class="cyc-note">{t('互相等待', 'waiting on each other')}</span>
            </div>
            <div class="node">
              <b class="mono">C2</b>
              <span class="q full">{t('队列满：全是 request', 'queue full: requests')}</span>
              <span class="send">{t('想发 response', 'wants to send response')}</span>
            </div>
          </div>
        </div>

        <div class="dl-card good">
          <div class="dl-head"><span>{t('按消息类拆网', 'separate networks')}</span><span class="tag ok">{t('无环', 'no cycle')}</span></div>
          <div class="dl-lanes">
            <div class="dl-lane req"><span>request</span><i>{t('可能满', 'may be full')}</i></div>
            <div class="dl-lane fwd"><span>forwarded request</span><i>{t('可能满', 'may be full')}</i></div>
            <div class="dl-lane resp"><span>response</span><i>{t('独立前进', 'always drains')}</i></div>
          </div>
          <p class="dl-note">
            {t(
              'response 不依赖 request 队列腾空，因此总能被目的端消费。',
              'A response never depends on a request queue draining, so its destination can always consume it.'
            )}
          </p>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">8.6</span>Representing the directory</h3>
        <p>
          A full sharer vector costs N bits per block. For a chip with 64 caches and 64-byte blocks, that is one
          bit per byte of data just for sharers. The two common compromises are <b>coarse vectors</b> (one bit
          per group of caches, with false positives) and <b>limited pointers</b> (a few cache ids plus a policy
          for the overflow case).
        </p>
        <p>
          Limited pointers exploit the fact that most blocks have zero or one sharer. When a block reaches the
          pointer limit, the directory either switches to broadcast (Dir<i>B</i>), asks one sharer to drop its
          copy (Dir<i>NB</i>), or traps to software (Dir<i>SW</i>). Each trades storage for messages.
        </p>
      {:else}
        <h3><span class="h-no">8.6</span>怎么表示目录</h3>
        <p>
          完整的 sharer 位图每条 block 要 N 位。64 个 cache、64 字节的块，光 sharer 就占每字节数据一位。
          两种常见折中是 <b>coarse vector</b>（每组 cache 一位，会有 false positive）与
          <b>limited pointer</b>（只存几个 cache id，再加溢出策略）。
        </p>
        <p>
          limited pointer 利用一个事实：大多数 block 只有零个或一个 sharer。达到指针上限时，
          目录要么改为广播（Dir<i>B</i>），要么请一个 sharer 主动放弃副本（Dir<i>NB</i>），
          要么陷入软件（Dir<i>SW</i>）。三者都是在存储与消息之间做交换。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 8.6', 'Figure 8.6')}
      caption={t(
        '三种表示：全位图精确但贵；coarse 便宜但会多发作废；limited pointer 只适合 sharer 很少的常见情况。',
        'Three encodings: a full vector is exact but large; a coarse vector is cheap but over-invalidates; limited pointers fit the common case of few sharers.'
      )}
    >
      <div class="enc">
        <div class="enc-card">
          <div class="enc-head"><span class="mono">full vector</span><span class="enc-cost">N bits</span></div>
          <div class="bit-row mono">
            <i class="on">1</i><i>0</i><i class="on">1</i><i>0</i><i class="on">1</i><i>0</i><i>0</i><i>0</i>
          </div>
          <p>{t('精确知道每个 sharer，失效消息不多发。', 'Knows every sharer exactly; no extra invalidations.')}</p>
          <span class="enc-trade">{t('64 核就要 64 位 / 块。', 'A 64-core system needs 64 bits per block.')}</span>
        </div>

        <div class="enc-card">
          <div class="enc-head"><span class="mono">coarse vector</span><span class="enc-cost">N / g bits</span></div>
          <div class="bit-row mono">
            <i class="on">1</i><i>0</i><i class="on">1</i><i>0</i>
          </div>
          <p>{t('每 g 个 cache 共用一位；命中的组整组作废。', 'One bit per group of g caches; a hit invalidates the whole group.')}</p>
          <span class="enc-trade">{t('存储小；false positive 带来多余 Inv。', 'Small; false positives cause extra Invs.')}</span>
        </div>

        <div class="enc-card">
          <div class="enc-head"><span class="mono">limited pointers</span><span class="enc-cost">i · log₂N</span></div>
          <div class="ptr-row mono">
            <span class="ptr">C1</span><span class="ptr">C4</span><span class="ptr">C7</span><span class="ptr ovf">{t('溢出', 'ovf')}</span>
          </div>
          <p>{t('常见情况只有 0–1 个 sharer；溢出时广播或请人让位。', 'Most blocks have 0–1 sharers; on overflow, broadcast or ask one to leave.')}</p>
          <span class="enc-trade">{t('最省；溢出路径更复杂。', 'Cheapest; the overflow path is complex.')}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">8.7</span>Where the directory lives</h3>
        <p>
          Logically there is one entry per block. Physically, putting the directory in DRAM with the data costs
          an off-chip access for every request and wastes storage on the vast majority of blocks that are not
          cached. Modern chips therefore keep a <b>directory cache</b> on chip.
        </p>
        <p>
          An <b>inclusive</b> directory cache summarizes what the caches below it hold. Inclusion has a
          consequence: when a lower-level cache evicts a block, it must tell the directory (an explicit PutS),
          and if the directory set is full, the directory may need to <b>recall</b> a block from the caches
          before admitting a new one. A <b>null directory cache</b> is the other extreme: no state at all, so
          every request is forwarded to all caches — Dir0B. It still needs a directory controller as the LLC
          controller and ordering point.
        </p>
      {:else}
        <h3><span class="h-no">8.7</span>目录放在哪里</h3>
        <p>
          逻辑上每条 block 一个目录项。物理上，把目录和数据一起放 DRAM，会让每个请求都多一次片外访问，
          而且绝大多数块根本没被缓存，存储全浪费了。现代芯片因此在片上放 <b>directory cache</b>。
        </p>
        <p>
          <b>inclusive</b> directory cache 摘要下层 cache 的内容。inclusion 有代价：下层驱逐块时必须通知目录
          （显式 PutS）；目录组满时，还要先从 cache 里 <b>recall</b> 一条块，才能接收新块。
          <b>null directory cache</b> 是另一个极端：完全不存状态，所有请求都转发给全部 cache——Dir0B。
          它仍需要 directory controller：作为 LLC controller 与排序点。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 8.7', 'Figure 8.7')}
      caption={t(
        '目录的三种落点：片外完整目录、片上 inclusive 摘要、以及“不存状态”的 null 目录。',
        'Three homes for the directory: a complete off-chip table, an on-chip inclusive summary, and a null directory that stores nothing.'
      )}
    >
      <div class="org">
        <div class="org-card">
          <div class="org-head"><span class="mono">{t('DRAM-backed', 'DRAM-backed')}</span><span class="org-tag">{t('完整', 'complete')}</span></div>
          <p>{t('每条 block 的目录项和数据一起放在内存里；SGI Origin 用额外 DRAM 存共享者列表。', 'Every entry sits with its data in memory; SGI Origin used extra DRAM for sharer lists.')}</p>
          <span class="org-trade">{t('简单、完整；每次访问多一次片外延迟。', 'Simple and complete; every access pays an off-chip delay.')}</span>
        </div>
        <div class="org-card">
          <div class="org-head"><span class="mono">{t('inclusive dir cache', 'inclusive dir cache')}</span><span class="org-tag">{t('片上', 'on-chip')}</span></div>
          <p>{t('只缓存一部分目录项；摘要下层 cache 的内容，要求下层驱逐时显式 PutS，必要时 Recall。', 'Caches a subset of entries, summarizes lower caches, requires explicit PutS, and may Recall.')}</p>
          <span class="org-trade">{t('命中快；组满时要 Recall，容量要够大。', 'Fast hits; Recalls when sets fill, so size matters.')}</span>
        </div>
        <div class="org-card">
          <div class="org-head"><span class="mono">{t('null dir cache', 'null dir cache')}</span><span class="org-tag">Dir0B</span></div>
          <p>{t('不存任何状态，请求一律转发 / 广播给所有 cache。HyperTransport 采用这一路线。', 'Stores no state; every request is forwarded to all caches. HyperTransport took this route.')}</p>
          <span class="org-trade">{t('零存储；消息多，但仍需 home 排序。', 'Zero storage; more messages, but the home still orders.')}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      {#if en}
        <h3><span class="h-no">8.8</span>Scaling further, and real systems</h3>
        <p>
          Two more pressures appear at scale. First, one home per address becomes a bottleneck, so directories are
          <b>distributed</b> across LLC banks, each home owning an address range. Second, waiting for one
          transaction before starting the next wastes the network, so protocols become <b>non-stalling</b> and
          track several outstanding transactions with transient states.
        </p>
        <p>
          If the network does not guarantee point-to-point ordering, messages can arrive out of order; the
          directory may have to <b>NACK</b> a request and ask the requestor to retry. Retries can starve a
          requestor (livelock), which is why most designs keep ordering where the protocol needs it. Silent
          eviction of S blocks saves a PutS, but an inclusive directory cannot allow it without losing track of
          sharers.
        </p>
      {:else}
        <h3><span class="h-no">8.8</span>继续扩展，以及真实系统</h3>
        <p>
          规模变大后还有两个压力。第一，每个地址一个 home 会成为瓶颈，于是目录被 <b>distributed</b> 到多个
          LLC bank，每个 home 负责一段地址。第二，等一个 transaction 完成再发下一个会浪费网络，
          于是协议变成 <b>non-stalling</b>，用 transient state 同时跟踪多个 outstanding transaction。
        </p>
        <p>
          如果网络不保证 point-to-point ordering，消息可能乱序到达，目录也许要 <b>NACK</b> 请求、让 requestor
          重试。重试可能让某个 requestor 永远抢不到（livelock），所以多数设计在协议需要的地方保留顺序。
          S 块的静默驱逐能省掉 PutS，但 inclusive 目录不能允许它，否则就丢了 sharer 的踪迹。
        </p>
      {/if}
    </div>

    <Figure
      no={t('图 8.8', 'Figure 8.8')}
      caption={t(
        '真实系统沿着“目录放哪、谁来排序、消息怎么走”三个问题分化；没有一种答案适合所有规模。',
        'Real systems diverge on three questions — where the directory lives, who orders, and how messages travel; no single answer fits every scale.'
      )}
    >
      <div class="case-grid">
        <div class="case-card">
          <div class="case-head"><span class="mono">SGI Origin 2000</span><span class="case-tag">{t('分布式目录', 'distributed dir')}</span></div>
          <p>{t('目录随内存分布；两级层次结构；home 由地址决定，消息在互连网络中单播。', 'Directory distributed with memory; a two-level hierarchy; the home is chosen by address and messages are unicast.')}</p>
          <span class="case-foot">{t('经典的可扩展共享内存。', 'The classic scalable shared-memory design.')}</span>
        </div>
        <div class="case-card">
          <div class="case-head"><span class="mono">Coherent HyperTransport</span><span class="case-tag">Dir0B</span></div>
          <p>{t('没有目录状态，请求到 home 后广播给所有 cache；正确但消息多。', 'No directory state: requests reach the home and are broadcast to all caches. Correct, but message-heavy.')}</p>
          <span class="case-foot">{t('用带宽换存储。', 'Trades bandwidth for storage.')}</span>
        </div>
        <div class="case-card">
          <div class="case-head"><span class="mono">Intel QPI</span><span class="case-tag">{t('home agent', 'home agent')}</span></div>
          <p>{t('home agent 持有目录；缓存行状态与目录配合；点对点链路保证每个方向有序。', 'A home agent holds the directory; cache states cooperate with it; point-to-point links order each direction.')}</p>
          <span class="case-foot">{t('把目录与片上互连一起设计。', 'Co-designs directory and on-chip interconnect.')}</span>
        </div>
        <div class="case-card">
          <div class="case-head"><span class="mono">{t('共同点', 'common thread')}</span><span class="case-tag">{t('home 排序', 'home orders')}</span></div>
          <p>{t('无论目录怎么实现，请求都在 home 排序；不同实现只改变“要发多少消息”和“目录记多少状态”。', 'However the directory is built, requests are ordered at the home; implementations differ in messages sent and state kept.')}</p>
          <span class="case-foot">{t('全序不再是必需的，per-block 顺序仍是。', 'A total order is no longer required; per-block order still is.')}</span>
        </div>
      </div>
    </Figure>

    <div class="prose">
      <div class="pull">
        {t(
          '目录用“问一个人”替换“告诉所有人”：省下带宽，付出一次间接，并把全序问题变成 per-block 的 ack 问题。',
          'A directory replaces \u201ctell everyone\u201d with \u201cask one place\u201d: it saves bandwidth, adds a hop, and turns a total-order problem into per-block acknowledgements.'
        )}
      </div>
      <p>
        {t(
          '下一章处理目录与 snooping 都没有回答的问题：指令 cache、TLB、虚拟缓存、DMA、多级 cache，以及死锁之外的无进展。',
          'The next chapter takes on what neither snooping nor directories answered: instruction caches, TLBs, virtual caches, DMA, multi-level hierarchies, and failures of progress beyond deadlock.'
        )}
      </p>
    </div>

    <div class="next">
      <span class="next-label">{t('接下来', 'Next')}</span>
      <div class="next-grid">
        <button class="next-card" onclick={() => navigate('/ch9')}>
          <span class="next-no display">09</span>
          <strong>{t('缓存一致性进阶', 'Advanced Coherence')}</strong>
          <span>{t('I-cache、TLB、虚拟缓存、DMA、多级 coherence，以及死锁 / 活锁 / 饥饿与 token coherence。', 'I-cache, TLB, virtual caches, DMA, multi-level coherence, plus deadlock, livelock, starvation, and token coherence.')}</span>
        </button>
        <button class="next-card" onclick={() => navigate('/ch7')}>
          <span class="next-no display">07</span>
          <strong>{t('回到监听协议', 'Back to snooping')}</strong>
          <span>{t('目录省掉了广播；对照第 7 章，看两种协议各自把复杂性放在哪里。', 'Directories remove broadcast; compare with Chapter 7 to see where each family puts its complexity.')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .flows {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .flow {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 9px 11px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 9px;
  }

  .flow-k {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .flow-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .chip {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    padding: 3px 7px;
    font-size: 9.5px;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 5px;
  }

  .chip b {
    font-size: 9px;
    font-weight: 500;
    color: var(--gold);
  }

  .chip.dir {
    border-color: #d9cfba;
    background: var(--paper-2);
  }

  .chip.dir b {
    color: var(--accent-deep);
  }

  .arr {
    color: var(--gold);
    font-size: 11px;
  }

  .flow-note {
    font-size: 9px;
    color: var(--muted);
  }

  .entry {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .entry-fields {
    display: grid;
    grid-template-columns: 0.7fr 0.8fr 2fr;
    gap: 7px;
  }

  .ef {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 8px 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 8px;
  }

  .ef.state {
    border-color: #e9ddc6;
  }

  .ef.sharers {
    border-color: #cfded9;
  }

  .ef-k {
    font-size: 8.5px;
    color: var(--muted);
  }

  .ef-v {
    font-size: 15px;
    color: var(--accent-deep);
  }

  .ef-b {
    font-size: 8px;
    color: var(--gold);
  }

  .ef-v.bits {
    display: inline-flex;
    gap: 3px;
    font-style: normal;
  }

  .ef-v.bits i {
    font-style: normal;
    color: var(--muted);
  }

  .ef-v.bits i.on {
    color: #8a6a2f;
  }

  .entry-meta {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    font-size: 9px;
    color: var(--muted);
  }

  .entry-meta b {
    color: var(--accent-deep);
  }

  .tbl-wrap {
    overflow-x: auto;
  }

  .spec {
    min-width: 560px;
  }

  .spec th,
  .roles th {
    font-size: 8.5px;
  }

  .state-n {
    width: 86px;
    font-size: 11px;
    color: var(--accent-deep);
  }

  .state-n.s {
    color: var(--st-s);
  }

  .state-n.e {
    color: var(--st-e);
  }

  .state-n.m {
    color: var(--st-m);
  }

  .state-n.o {
    color: var(--st-o);
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
  }

  .roles {
    min-width: 560px;
  }

  .roles td {
    font-size: 9.5px;
  }

  .dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .dl-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 11px 12px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .dl-card.bad {
    background: #fbf3ee;
    border-color: #e3cbbf;
  }

  .dl-card.good {
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .dl-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    font-size: 10px;
    color: var(--ink-2);
  }

  .tag {
    font-size: 8.5px;
    color: #a3523b;
  }

  .tag.ok {
    color: var(--accent-deep);
  }

  .dl-body {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .node {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
    padding: 7px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 7px;
  }

  .node b {
    font-size: 9px;
    color: var(--accent-deep);
  }

  .q.full {
    font-size: 8.5px;
    color: #a3523b;
  }

  .send {
    font-size: 8.5px;
    color: var(--muted);
  }

  .cycle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    flex: none;
  }

  .cyc-arrow {
    font-size: 16px;
    color: #a3523b;
  }

  .cyc-note {
    font-size: 7.5px;
    color: #a3523b;
    text-align: center;
  }

  .dl-lanes {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .dl-lane {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 8px;
    font-size: 9px;
    color: var(--ink-2);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 5px;
  }

  .dl-lane i {
    font-style: normal;
    font-size: 8.5px;
    color: var(--muted);
  }

  .dl-lane.req {
    border-left: 3px solid var(--st-s);
  }

  .dl-lane.fwd {
    border-left: 3px solid var(--gold);
  }

  .dl-lane.resp {
    border-left: 3px solid var(--st-e);
  }

  .dl-note {
    margin: 0;
    font-size: 8.5px;
    line-height: 1.5;
    color: var(--muted);
  }

  .enc {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }

  .enc-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 11px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .enc-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px;
    font-size: 9.5px;
    color: var(--accent-deep);
  }

  .enc-cost {
    font-size: 8.5px;
    color: var(--gold);
  }

  .bit-row {
    display: flex;
    gap: 3px;
  }

  .bit-row i {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    font-style: normal;
    font-size: 8.5px;
    color: var(--muted);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 3px;
  }

  .bit-row i.on {
    color: #8a6a2f;
    background: #f7efdf;
    border-color: #ecdfc6;
  }

  .ptr-row {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  .ptr {
    padding: 1px 5px;
    font-size: 8.5px;
    color: var(--accent-deep);
    background: var(--card);
    border: 1px solid #cfded9;
    border-radius: 4px;
  }

  .ptr.ovf {
    color: var(--gold);
    border-color: #ecdfc6;
    border-style: dashed;
  }

  .enc-card p {
    margin: 0;
    font-size: 9px;
    line-height: 1.55;
    color: var(--ink-3);
  }

  .enc-trade {
    padding-top: 5px;
    font-size: 8.5px;
    line-height: 1.5;
    color: var(--muted);
    border-top: 1px solid var(--line-2);
  }

  .org {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }

  .org-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 11px 12px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .org-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px;
    font-size: 9.5px;
    color: var(--accent-deep);
  }

  .org-tag {
    font-size: 8.5px;
    color: var(--gold);
  }

  .org-card p {
    margin: 0;
    font-size: 9px;
    line-height: 1.55;
    color: var(--ink-3);
  }

  .org-trade {
    padding-top: 5px;
    font-size: 8.5px;
    line-height: 1.5;
    color: var(--muted);
    border-top: 1px solid var(--line-2);
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
    padding: 11px 12px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .case-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    font-size: 9.5px;
    color: var(--accent-deep);
  }

  .case-tag {
    font-size: 8.5px;
    color: var(--gold);
  }

  .case-card p {
    margin: 0;
    font-size: 9px;
    line-height: 1.55;
    color: var(--ink-3);
  }

  .case-foot {
    padding-top: 5px;
    font-size: 8.5px;
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
    .dl,
    .case-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .enc,
    .org {
      grid-template-columns: minmax(0, 1fr);
    }

    .entry-fields {
      grid-template-columns: 1fr 1fr;
    }

    .entry-fields .sharers {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 560px) {
    .spec,
    .roles {
      min-width: 0;
    }

    .spec th,
    .roles th {
      font-size: 8px;
      white-space: normal;
    }

    .spec td,
    .roles td {
      padding: 6px 5px;
      font-size: 9px;
    }

    .state-n {
      width: 52px;
      font-size: 9.5px;
    }

    .entry-meta {
      grid-template-columns: 1fr 1fr;
    }

    .next-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
