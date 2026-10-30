# Visualized Books · 可视化书库

把技术书逐章拆成可以亲手拨动的模型：拓扑能数、路由能走、死锁能复现。页面里的每个判定和数字都由仓库内的引擎现算，而不是画上去的；图文均为原创改写，中英双语。

在线地址：<https://celestial-42.github.io/visualized_books/>

## 书库

| # | 书 | 原书 | 已上线 | 备注 |
| --- | --- | --- | --- | --- |
| 01 | 共享内存图谱 / Shared Memory Atlas | Sorin, Nagarajan, Hill, Wood · *A Primer on Memory Consistency and Cache Coherence*, 2nd ed. 2020 | 11 章 | 从一致性模型到 Snoop/MESI 目录协议 |
| 02 | 片上网络 / On-Chip Networks | Enright Jerger, Krishna, Peh · *On-Chip Networks*, 2nd ed. 2017 | 8 章 | 拓扑、路由、死锁、流控、路由器、性能、协议、案例 |
| 03 | 并行互连网络 / Interconnection Networks | Duato, Yalamanchili, Ni · *Interconnection Networks: An Engineering Approach*（中文版 2004） | 第 3、4 章 | 死锁/活锁/饿死 + 路由算法；其余章节在书目页标注为计划中 |

## 本地运行

```bash
npm install
npm run dev       # http://localhost:5173
npm run check     # svelte-check：类型 + 无障碍 + 未用样式
npm run build     # 产物在 dist/
npm run preview   # 预览构建产物
```

路由是哈希式：

- `#/` — 书库首页
- `#/book/<bookId>` — 某本书的目录页
- `#/book/<bookId>/<chSlug>` — 具体章节，例如 `#/book/interconnection-networks/ch4`

## 目录结构

```
src/
  App.svelte            路由 → 页面装配，PAGES 表登记每本书的章节页面
  app.css               设计系统：纸张配色、排版、表格、注记、按钮
  lib/
    books.ts            书目注册表（元数据 + 路由解析）
    router.svelte.ts    哈希路由
    lang.svelte.ts      中/英切换
    progress.svelte.ts  按书隔离的阅读进度
    content.ts          第 1 本书的章节元数据
    noc/                第 2 本书：章节元数据 + 拓扑/路由/流控/路由器/性能/协议引擎
    icn/                第 3 本书：章节元数据 + 转向分析、仲裁与活锁实验
  pages/
    LibraryHome.svelte  书库首页
    Ch*.svelte          第 1 本书各章
    ocn/  icn/          第 2、3 本书的目录页与章节页
  components/
    Figure.svelte       图号 + 题注容器
    Quiz.svelte         章末自测
    noc/  icn/          各类交互实验（拓扑、路由、转弯、流控、仲裁……）
```

## 写作与实现约定

- **数字必须现算。** 图里的跳数、对剖带宽、环检测结论、延迟曲线等一律调用 `src/lib` 下的纯函数得到，不接受手填结论；改参数后数字应当随之变化。
- **一章一页，按原书小节组织。** 章节标题沿用原书编号（如 `3.2.1`、`4.5.3`），便于对照原书阅读。
- **双语。** 所有正文、图注、按钮文案走 `t(zh, en)`，术语在两种语言间保持一致。
- **术语中文约定。** memory consistency = 内存连贯性；cache coherence = 缓存一致性；cache miss 保留英文 *Miss*。
- **图必须可操作。** 能做成实验的结论就做成实验，不能的才退化为静态 SVG 或表格；静态图的数字同样注明由引擎生成。
- **单章收尾。** 每章以“接下来”卡片接到下一章或另一本书的对照章节，末尾附自测题。

## 新增一本书

1. `src/lib/books.ts`：在 `BookId` 中加入新 id，并在 `BOOKS` 里补一条元数据（`no`、`title`、`titleEn`、`spine`、`authors`、`edition`、`pages`、`parts`、`chapters`）。
2. `src/lib/<book>/content.ts`：定义 `PARTS` 与 `CHAPTERS`（`n`、`slug`、`title`、`status`、`pages`、`blurb`），`status: 'ready'` 的章节才会出现在目录与进度里。
3. `src/lib/<book>/*.ts`：放这一本书的计算引擎，写成纯函数，便于在页面、测验和脚本里复用。
4. `src/pages/<book>/Home.svelte` 与 `ChX.svelte`：目录页与章节页；在 `src/App.svelte` 的 `PAGES` 表中登记 `"<bookId>/<slug>"`。
5. `src/pages/LibraryHome.svelte`：卡片插图是按书 id 分支的内联 SVG，可以按需增加一支。
6. 自检：`npm run check && npm run build`，并在 1440 与 390 两种宽度下确认没有横向溢出、交互能复现正文声称的差异。

## 部署

推送到 `main` 后由 `.github/workflows/deploy.yml` 自动构建并发布到 GitHub Pages：

- `vite.config.js` 使用 `base: './'`，因此构建产物可以从项目子路径（`/visualized_books/`）直接加载。
- CI 使用 `npm ci`，`package-lock.json` 必须指向公共 registry（`https://registry.npmjs.org`）；若本地锁文件来自内网镜像，需要重新生成后再提交。
- Pages 需要在仓库 Settings → Pages 中把来源设为 “GitHub Actions”。

## 来源与声明

内容基于上述公开出版书籍的章节结构与理论整理，正文、图与交互均为本项目原创实现；不收录原书扫描页或大段原文。第三本书为扫描版中文译作，仅取章节结构用于编排，正文按一手文献（Dally & Seitz 的通道相关图、Duato 的充分条件、Glass & Ni 的转弯模型等）与同领域公开资料重写。

各书的著作权归原作者与出版方所有。
