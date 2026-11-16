## 关联

- Issue：#

## 改了什么，为什么

## 影响面

- [ ] 编辑器内核 / Markdown 序列化（需要 `npm run roundtrip`）
- [ ] 保存 / 缓存 / 最近记录 / 草稿
- [ ] 导出（HTML / 纯文本）
- [ ] Windows 宿主 `host/`
- [ ] macOS 宿主 `host-mac/`
- [ ] 打包 / 发布（`packaging/`、`.github/workflows/`）
- [ ] 仅文档

## 门禁输出

```text
npx tsc --noEmit :
npm test        :
npm run build   :
roundtrip（改序列化时）:
```

## 截图（界面变化时）

## 数据安全

- 是否改动保存/写回逻辑？有没有字节级断言（BOM、CRLF、编码）？
- 是否改动缓存、最近记录或 trash 的行为？

## 其他

- [ ] 没有新增运行时依赖（如有，说明省下了什么）
- [ ] 提交内容以 MIT 授权
- [ ] 回滚方式已写（`git revert` / 恢复哪个文件）
