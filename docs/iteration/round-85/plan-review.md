# 第 85 轮计划审查（critic）— rev.1 复审：PASS

审 `docs/iteration/round-85/plan.md` rev.1（HEAD `a29a300`）。P0/P1 无 open 项，三条全 P2；按高风险只复核 A2（改 `npm run build` 链），A1/A3 抽查位置与基线。

## 上版 3 条核对
- **H1 已修**：A2 ① 写死镜像语义（先覆盖拷 dist、`index.html` 最后、全部成功后才删多余、失败停在并存并警告 exit 0、禁止先删后拷）；`--check` 以 dist 侧「路径+字节」为唯一判据、多余只打印；验收 ③ 加「多余 0」。与实测一致：两侧各 98 文件、路径重合 32、www 独有 66 = 2,768,873 B；dist 3,904,017 B / 入口 `assets/index-CNeHEEPe.js`（945,758 B），www 入口 `index-BxH_Xt2Z.js`。
- **H2 已修**：A2 加 `--dist`/`--www`（缺省不变）+ `.tmp` 四例自检（缺文件 / 多文件 / 字节差 / 镜像）。
- **H3 已修**：A1 ③ 明说 `replaceEvery` 不加 0 命中 `show`；验收 ④ 的 0 命中只测「替换为」输入框 Enter（`replaceCurrent`），不写「全部替换 0 命中」。

## 抽查通过
- A1 行号全中：`App.tsx:2138-2145`、`:2147-2231`、出口 `:2206-2208`/`:2229-2230`、`show` `:475`、`FindBar.tsx:80`/`:121-127`/`:138`、`App.tsx:5807`；`replaceNoticeText` 静态 0 命中；`findBarState.test.ts` 现 7 条 → 8 自洽；`show(replaceNoticeText` 0→4、3 文件成立。
- A3 基线：`CHANGELOG.md:5` 实为 `## Unreleased（第 29–74 轮，未发版）`（en dash U+2013）；该段（:5–460）`^\*\*第 N 轮` 53 条、min 30 / max 84；`mathStyle.test.ts:17` 的 `readFileSync('src/styles.css')` 模式可照；`npm test` 链 49 文件、无重名、无 `changelog.test.ts`；637+1+3=641 自洽；标题改 29–84 后 B=84=max、A=29≤min=30。
- A2 事实：`package.json:12` build 链、`host/build.ps1:27` 删 / `:71` 拷、`dist` 与 `host/bin` 均 gitignore、当前无 `Sidelight.exe` 占用（拷贝不会被锁）、CI 三处 `npm run build` 走「跳过」分支。
- 红线：0 新运行时依赖（`node:fs`/`node:path`）；不动 Tiptap/序列化（不跑 roundtrip 成立）；版本 0.32.1；不 push、不改 `release/`。

## 漏洞（P2 ×3，执行期口径，不改方案）
1. **A2 ①③ 的 dist 侧数字是 A1 改动前的快照。** A1 改 `App.tsx`（入口 chunk）与 `findBarState.ts`（当前只打进懒加载的 `FindBar-DGm0fZ5G.js`，www 里是旧 `FindBar-DJmLc0gr.js`）；A2 ② 的 `npm run verify` 重建后入口与 FindBar chunk 名、字节必变（若被判成共享 chunk，文件数还会 98→99）→ ③ 写死的 `3,904,017 B` / `index-CNeHEEPe.js` 不可达。修：③ 只断「`--check` exit 0、多余 0、www 与当次 dist 逐路径字节相同」，文件数/总字节/入口名抄 ② 那次构建；① 的 66/1/66 降为改前对照、重建后重测。
2. **A2 自检第 4 例「无参跑」与「四例都用 `.tmp`」矛盾。** 无参 = 真实 dist/www，镜像自检例空转。修：镜像例写 `--dist .tmp/r85-www-dist --www .tmp/r85-www-www`。
3. **A2 ⑤ 缺还原收尾。** www 改名要在 `finally` 还原，还原后补一条无参镜像 + `--check` exit 0 收口，否则 ⑤ 之后 www 可能缺失/过期，B-126 的交付状态没被证明。

## 结论：PASS
H1/H2/H3 已修，方案可执行；3 条 P2 只是验收口径与收尾措辞，执行时照改即可，不必再审。A2 最重（脚本 + 四例自检），建议先走通镜像与 `--check` 两例再补自检。
