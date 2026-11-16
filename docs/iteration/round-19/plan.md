# 第 19 轮 · 计划（收尾硬化）

基线 v0.30.1（HEAD `b1518be`）。目标：修掉第 17 轮验收暴露的草稿清理回归，把不可复现的性能数字改口径，发 0.30.2，并为 20 轮收尾做检查。**已发布**为 `ab7aaea`（v0.30.2），实际资产见 `docs/iteration/round-20/test.md`。

## 任务表（实际执行）

| 任务 | 内容 | 结果 |
| :--- | :--- | :--- |
| T1 草稿清理回归（B1） | 保存成功且无新输入时重新发 `draft-clear`；保存中继续输入则不发。改在 `src/App.tsx` 的 `finishSaved`（无条件 `void clearHostDraft()`），并扩 `scripts/draft-acceptance.mjs` | 已修。0.30.2 后 `draft-acceptance` **61/61**，保存序列 `draft-save → save → draft-clear`；保存中继续输入不发 clear、dirty 仍 true（`docs/iteration/round-20/test.md` §2） |
| T2 性能陈述更正 | 删除把 0.30.1 单次冷启动当作可复现值的说法；统一为「仅 10 KB 冒烟，未达稳定；100 KB/1 MB 未测，不作为验收数字」 | 部分完成。0.30.2 的 CHANGELOG 与 Release body 已改成该口径，但仍保留 `4.47` 作为冒烟区间上界；tester 在「性能数字无 4.47/1078」的字面要求上判 **未清**（`round-20/test.md` §4） |
| T3 发布 0.30.2 | 版本、CHANGELOG、Windows setup/portable、macOS Universal、`SHA256SUMS`；不升 1.0（macOS 真机/签名公证/Intel/隐私确认未完成） | 已发布。setup **818,476 B**、便携 zip **902,772 B**、macOS Universal **890,504 B**、`SHA256SUMS-0.30.2.txt` 308 B；三文件 SHA256 与校验和一致；mac zip 含 `README.txt`、fat 两片（`round-20/test.md` §5） |
| T4 20 轮收尾准备 | 仓库/Release/文档/STATE 对齐；无密钥与临时产物入库；写三份 findings | 部分完成。`round-19/findings-{bug,reader,ship}.md` 已写；仓库无证书/密钥、`out/`/`release/`/`dist/`/`.tmp/`/`host/bin/` 未入库；但 `round-19/plan.md`（本文件）与 `round-19/test.md` 当时缺失，STATE 仍只到第 16 行 |

## 验收标准

1. `draft-acceptance` 覆盖两条路径：保存成功后发 `draft-clear`；保存中继续输入不发，且 `dirty` 保持 true。
2. 当前版本文档与 Release body 不把未测数字当验收值；「未测/延后」必须可见。
3. `v0.30.2` 三资产字节与 `SHA256SUMS-0.30.2.txt` 一一对应；Windows 安装/启动/卸载通过，HKCU/快捷方式标 UNVERIFIED。
4. 工作区干净（除当轮 findings），无密钥、证书、临时产物入库。
5. 读者视角：SECURITY 渠道、文件上限文案（5.5 MiB）、Release 说明可信。

## 结果与遗留

- **发布**：`v0.30.2` 已发布（tag 提交 `ab7aaea`）；产品功能面通过（`draft` 61/61、`host-save` 64/64、`newfile` 23/23、`stale` 4/4、`bigfile` 3/3）。
- **验收结论**：`docs/iteration/round-20/test.md` 判 **FAIL（治理/文档证据不完整）**：① `round-19/plan.md`/`test.md` 与 `round-20/plan.md` 缺失；② STATE 只到第 16 行；③ 文档/Release 仍写 `4.47`；④ 验收时工作区有未提交的 `src/App.tsx`；⑤ 0.30.2 的 `acceptance` prod、tree/theme/keyboard 复跑被 CDP 超时挡住，标 UNVERIFIED。
- **读者发现（`round-19/findings-reader.md`）**：V1 SECURITY 的私有漏洞报告渠道当时 `enabled=false`，按文档做不通；V2 README 文件上限仍写 6 MB，与代码的 5.5 MiB 不一致；V3 Release 页丢掉「未测/延后」，且把 `4.47` 当可复现值；V4 数字/位置/术语残留。
- **缺陷发现（`round-19/findings-bug.md`）**：B1 保存成功不清宿主草稿（P0，已修）；B2 1 MB 逐键 30 s、10 KB 数字不可复现（P1）；B3「保存并切换」时 `draft-clear` 可能清到新文档（P1，未复现）；B4 验收脚本缺口与副作用（P2）。
- **发布视角（`round-19/findings-ship.md`）**：S1 0.30.2 发布清单与 `release.yml` 风险；S2 仓库健康；S3 20 轮收尾检查表；S4 之后不再有必须修的 P0，1.0 Go/No-go 为 **No-go**（7 条门槛未满足）；S5 三个优化项（截图默认不写 `shots/`、`release.yml` 一次改三处、发布说明过滤元信息）。
- **遗留交接给第 20 轮**：0.30.2 之后仍有未提交的 300 ms 派生优化；性能数字口径未完全统一；STATE 与 plan/test 证据缺口；`README:74` 的 6 MB → 5.5 MiB 未改。

## 引用

`docs/iteration/round-19/brief.md`、`findings-bug.md`、`findings-reader.md`、`findings-ship.md`；`docs/CHANGELOG.md` 的 0.30.2 节；`docs/iteration/round-20/test.md`；`scripts/draft-acceptance.mjs`；`src/App.tsx`。
