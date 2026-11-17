import assert from 'node:assert/strict'
import test from 'node:test'

import { TABLE_SCOPE_NAMES, inTableAncestry } from './tableScope.ts'

test('单元格 → 行 → 表格 → 文档：命中', () => {
  assert.equal(inTableAncestry(['tableCell', 'tableRow', 'table', 'doc']), true)
})

test('普通段落 / 列表：不命中', () => {
  assert.equal(inTableAncestry(['paragraph', 'listItem', 'doc']), false)
})

test('只给 tableCell（表体单元格）也命中', () => {
  assert.equal(inTableAncestry(['tableCell']), true)
})

test('只给 tableHeader（表头单元格）也命中', () => {
  assert.equal(inTableAncestry(['tableHeader']), true)
})

test('空数组不命中', () => {
  assert.equal(inTableAncestry([]), false)
})

test('只有文档根不命中：祖先链不含该深度', () => {
  assert.equal(inTableAncestry(['doc']), false)
})

test('名字是整名匹配：tableWrapper 之类前缀不算', () => {
  assert.equal(inTableAncestry(['tableCellWrapper', 'doc']), false)
  assert.equal(inTableAncestry(['taskItem', 'taskList', 'doc']), false)
})

test('TABLE_SCOPE_NAMES 覆盖四种表格节点', () => {
  assert.deepEqual([...TABLE_SCOPE_NAMES], ['table', 'tableRow', 'tableCell', 'tableHeader'])
})
