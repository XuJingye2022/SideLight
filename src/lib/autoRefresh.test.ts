import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MIN_GAP_MS,
  OBSERVER_DEBOUNCE_MS,
  POLL_INTERVAL_MS,
  observerCtor,
  shouldAutoRefresh,
  treeSignature,
} from './autoRefresh.ts'
import type { WorkspaceNode } from './workspace.ts'

const dir = (path: string, children: WorkspaceNode[]): WorkspaceNode => ({
  kind: 'dir',
  name: path.split('/').pop() ?? path,
  path,
  handle: null,
  children,
})

const file = (path: string): WorkspaceNode => ({
  kind: 'file',
  name: path.split('/').pop() ?? path,
  path,
  handle: null,
})

const sample = () =>
  dir('', [
    dir('sub', [file('sub/a.md'), file('sub/b.md')]),
    file('main.md'),
  ])

test('常量：轮询 2.5 s、节流 800 ms、observer 合并 300 ms', () => {
  assert.equal(POLL_INTERVAL_MS, 2500)
  assert.equal(MIN_GAP_MS, 800)
  assert.equal(OBSERVER_DEBOUNCE_MS, 300)
})

test('treeSignature：同结构同指纹，增/删/改名都变', () => {
  const first = treeSignature(sample())
  assert.equal(treeSignature(sample()), first)
  assert.match(first, /sub\/a\.md/)

  const added = sample() as Extract<WorkspaceNode, { kind: 'dir' }>
  added.children.unshift(file('new.md'))
  assert.notEqual(treeSignature(added), first)

  const removed = sample() as Extract<WorkspaceNode, { kind: 'dir' }>
  const sub = removed.children[0] as Extract<WorkspaceNode, { kind: 'dir' }>
  sub.children = sub.children.filter((child) => child.path !== 'sub/b.md')
  assert.notEqual(treeSignature(removed), first)

  const renamed = sample() as Extract<WorkspaceNode, { kind: 'dir' }>
  renamed.children[1] = file('main2.md')
  assert.notEqual(treeSignature(renamed), first)
})

test('treeSignature：空树与 null 都是空串，文件与目录前缀不撞', () => {
  assert.equal(treeSignature(null), '')
  assert.equal(treeSignature(dir('', [])), 'd:')
  const asFile = treeSignature(file('sub'))
  const asDir = treeSignature(dir('sub', []))
  assert.notEqual(asFile, asDir)
})

test('shouldAutoRefresh：没有根、页面隐藏、刷新在飞都拦下', () => {
  const base = { hasRoot: true, visible: true, refreshing: false, lastAt: 0, now: 10_000 }
  assert.equal(shouldAutoRefresh(base), true)
  assert.equal(shouldAutoRefresh({ ...base, hasRoot: false }), false)
  assert.equal(shouldAutoRefresh({ ...base, visible: false }), false)
  assert.equal(shouldAutoRefresh({ ...base, refreshing: true }), false)
})

test('shouldAutoRefresh：MIN_GAP_MS 内连发只放行第一次', () => {
  const base = { hasRoot: true, visible: true, refreshing: false, lastAt: 0, now: 10_000 }
  assert.equal(shouldAutoRefresh({ ...base, lastAt: 0 }), true, '从没刷过：放行')
  assert.equal(shouldAutoRefresh({ ...base, lastAt: 9_500 }), false, '距上次 500 ms：拦下')
  assert.equal(shouldAutoRefresh({ ...base, lastAt: 9_200 }), true, '正好 800 ms：放行')
  assert.equal(shouldAutoRefresh({ ...base, lastAt: 9_201 }), false)
})

test('observerCtor：有构造器就用，没有/不是函数回 null（退回轮询）', () => {
  class FakeObserver {
    observe() {}
    disconnect() {}
  }
  assert.equal(observerCtor({}), null)
  assert.equal(observerCtor(null), null)
  assert.equal(observerCtor({ FileSystemObserver: 'nope' }), null)
  assert.equal(observerCtor({ FileSystemObserver: FakeObserver }), FakeObserver)
})
