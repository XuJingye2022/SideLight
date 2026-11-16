# 第 19 轮 · 0.30.2 收尾摘要（tester）

日期：2026-11-16。基线 v0.30.1；第 19 轮只做 0.30.2 收尾硬化（草稿清理、性能文案、Release 说明）。

## 0.30.2

- `draft` **61/61**：保存成功 `draft-save → save → draft-clear`；保存中继续输入不发 `draft-clear`、dirty 为 true；0.30.1 的 57/58 漏清已修。
- `host-save` 64/64、`newfile` 23/23、`stale` 4/4、`bigfile` 3/3；gate build/205/首屏过线。
- Release v0.30.2 三资产 + `SHA256SUMS-0.30.2.txt` 一致；mac fat 两片 + `README.txt`；body 含未验/已知限制。

## 0.30.3 收尾复验

- 0.30.2 遗留的 round-19/test、20 轮 STATE、HEAD/tag 文档差已由 `b43b5c8` 补齐；`git diff v0.30.3..HEAD -- src` 为空，领先提交只有 docs/test/STATE。
- 草稿测试等待从旧 800 ms 改为 **1300 ms**（300 ms 派生 + 800 ms 草稿防抖），`draft-acceptance` **61/61 PASS**；这是测试口径修正，不放宽产品断言。
- `4.47`/`1078` 已清零；0.30.3 Release body 有未验与已知限制；四资产/checksum/mac fat/README 通过。

## 判定

**PASS-WITH-UNVERIFIED**（0.30.2/0.30.3 草稿与发布通过；真实读屏、macOS 真机、签名、100 KB–1 MB 逐键等仍 UNVERIFIED）。
