import assert from 'node:assert/strict'
import test from 'node:test'

import {
  bindKey,
  bindingFromEvent,
  DEFAULT_KEYBINDINGS,
  KEYBINDING_COMMANDS,
  matchBinding,
  matchKeybinding,
  normalizeBinding,
  resolveKeybindings,
  RESERVED_KEYBINDINGS,
  type Keybindings,
} from './keybindings.ts'

/**
 * 第 89 轮 B-107：自定义快捷键的纯逻辑。
 * 真机（录制交互、旧键不再写盘、保存落盘）由 e2e 脚本负责，这里只断判定本身。
 */

test('8 条可改命令，id 与默认键位齐全', () => {
  assert.equal(KEYBINDING_COMMANDS.length, 8)
  assert.deepEqual(
    KEYBINDING_COMMANDS.map((command) => command.id),
    ['save', 'find', 'globalSearch', 'quickOpen', 'toggleSource', 'togglePreview', 'newDocument', 'exportMenu'],
  )
  for (const command of KEYBINDING_COMMANDS) {
    assert.ok(command.label.length > 0, `label 不能为空: ${command.id}`)
    assert.equal(DEFAULT_KEYBINDINGS[command.id], command.keys)
  }
})

test('默认键位两两不同（冲突从默认表就不会出现）', () => {
  const keys = Object.values(DEFAULT_KEYBINDINGS)
  assert.equal(new Set(keys).size, keys.length)
})

test('每个默认键位都能归一往返', () => {
  for (const [id, keys] of Object.entries(DEFAULT_KEYBINDINGS)) {
    assert.equal(normalizeBinding(keys), keys, id)
  }
})

test('RESERVED 每条的 label 都非空', () => {
  assert.ok(RESERVED_KEYBINDINGS.length >= 20)
  for (const entry of RESERVED_KEYBINDINGS) {
    assert.ok(entry.label.length > 0, `label 不能为空: ${entry.keys}`)
  }
})

test('RESERVED 的键位都能归一往返，且没有重复', () => {
  const keys = RESERVED_KEYBINDINGS.map((entry) => entry.keys)
  assert.equal(new Set(keys).size, keys.length, '保留键不能重复')
  for (const entry of RESERVED_KEYBINDINGS) {
    assert.equal(normalizeBinding(entry.keys), entry.keys, entry.keys)
  }
})

test('RESERVED 不与 8 条默认键位相撞', () => {
  const defaults = new Set(Object.values(DEFAULT_KEYBINDINGS))
  for (const entry of RESERVED_KEYBINDINGS) {
    assert.equal(defaults.has(entry.keys), false, `保留键撞默认: ${entry.keys}`)
  }
})

test('normalize 拒空串与非字符串', () => {
  assert.equal(normalizeBinding(''), null)
  assert.equal(normalizeBinding('   '), null)
  assert.equal(normalizeBinding(42), null)
  assert.equal(normalizeBinding(null), null)
})

test('normalize 拒裸键与 Shift+键（必须带 Ctrl 或 Alt）', () => {
  assert.equal(normalizeBinding('s'), null)
  assert.equal(normalizeBinding('Shift+K'), null)
})

test('normalize 拒缺键、多键与非法键名', () => {
  assert.equal(normalizeBinding('Ctrl+Shift'), null, '没有主键')
  assert.equal(normalizeBinding('Ctrl+AB'), null, '键名必须是单字符')
  assert.equal(normalizeBinding('Ctrl+Enter'), null, 'Enter 不在可改键字符集')
  assert.equal(normalizeBinding('Ctrl+='), null, '= 留给整页缩放')
})

test('normalize 小写归一，修饰键顺序固定为 Ctrl+Alt+Shift', () => {
  assert.equal(normalizeBinding('ctrl+alt+w'), 'Ctrl+Alt+W')
  assert.equal(normalizeBinding('alt+shift+ctrl+f'), 'Ctrl+Alt+Shift+F')
  assert.equal(normalizeBinding(' Control + P '), 'Ctrl+P')
  assert.equal(normalizeBinding('meta+/'), 'Ctrl+/')
})

test('bindingFromEvent 四形：Ctrl / ⌘ / 双修饰 / 三修饰', () => {
  assert.equal(bindingFromEvent({ key: 's', ctrlKey: true }), 'Ctrl+S')
  assert.equal(bindingFromEvent({ key: 's', metaKey: true }), 'Ctrl+S', '⌘ 当 Ctrl')
  assert.equal(bindingFromEvent({ key: 'P', ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+P')
  assert.equal(bindingFromEvent({ key: 'w', ctrlKey: true, altKey: true }), 'Ctrl+Alt+W')
})

test('bindingFromEvent 拒不可改键：裸字母、F11、Enter', () => {
  assert.equal(bindingFromEvent({ key: 's' }), null)
  assert.equal(bindingFromEvent({ key: 'F11' }), null)
  assert.equal(bindingFromEvent({ key: 'Enter', ctrlKey: true }), null)
})

test('严格匹配：修饰键全等，多按一个就不算', () => {
  assert.equal(matchBinding({ key: 's', ctrlKey: true }, 'Ctrl+S'), true)
  assert.equal(matchBinding({ key: 'S', ctrlKey: true }, 'Ctrl+S'), true, '字母不分大小写')
  assert.equal(matchBinding({ key: 's', ctrlKey: true, shiftKey: true }, 'Ctrl+S'), false, '多按 Shift 不算')
  assert.equal(matchBinding({ key: 's', ctrlKey: true, altKey: true }, 'Ctrl+S'), false)
  assert.equal(matchBinding({ key: 's' }, 'Ctrl+S'), false)
  assert.equal(matchBinding({ key: 's', metaKey: true }, 'Ctrl+S'), true, '⌘ 当 Ctrl')
})

test('matchKeybinding 按当前键位表命中的是命令 id', () => {
  assert.equal(matchKeybinding({ key: 'p', ctrlKey: true }, DEFAULT_KEYBINDINGS), 'quickOpen')
  assert.equal(matchKeybinding({ key: '/', ctrlKey: true }, DEFAULT_KEYBINDINGS), 'toggleSource')
  assert.equal(matchKeybinding({ key: 'x', ctrlKey: true }, DEFAULT_KEYBINDINGS), null)
})

test('bindKey 拒 Ctrl+K，label 是「加链接」', () => {
  const result = bindKey(DEFAULT_KEYBINDINGS, 'save', 'Ctrl+K')
  assert.equal(result.ok, false)
  assert.equal(result.ok ? '' : result.label, '加链接')
  assert.match(result.ok ? '' : result.reason, /重复/)
})

test('bindKey 拒 Ctrl+H，label 是「查找」', () => {
  const result = bindKey(DEFAULT_KEYBINDINGS, 'save', 'Ctrl+H')
  assert.equal(result.ok, false)
  assert.equal(result.ok ? '' : result.label, '查找')
})

test('bindKey 拒 Ctrl+P，label 是「快速打开文件」（另一条命令的当前键）', () => {
  const result = bindKey(DEFAULT_KEYBINDINGS, 'save', 'Ctrl+P')
  assert.equal(result.ok, false)
  assert.equal(result.ok ? '' : result.label, '快速打开文件')
  assert.equal(DEFAULT_KEYBINDINGS.quickOpen, 'Ctrl+P', '被拒时不能顺手改掉对方')
})

test('bindKey 拒浏览器保留键 Ctrl+N 与裸 s', () => {
  const reserved = bindKey(DEFAULT_KEYBINDINGS, 'save', 'Ctrl+N')
  assert.equal(reserved.ok, false)
  assert.equal(reserved.ok ? '' : reserved.label, '新建窗口（浏览器保留）')
  const bare = bindKey(DEFAULT_KEYBINDINGS, 'save', 's')
  assert.equal(bare.ok, false)
  assert.equal(bare.ok ? '' : bare.label, '')
})

test('bindKey 放行 Ctrl+Alt+W，并归一成规范串', () => {
  const result = bindKey(DEFAULT_KEYBINDINGS, 'save', 'ctrl+alt+w')
  assert.equal(result.ok, true)
  assert.equal(result.ok ? result.keys : '', 'Ctrl+Alt+W')
})

test('bindKey 允许绑回自己的当前键（不是冲突）', () => {
  const result = bindKey(DEFAULT_KEYBINDINGS, 'save', 'Ctrl+S')
  assert.equal(result.ok, true)
})

test('resolve({}) 等于默认表', () => {
  assert.deepEqual(resolveKeybindings({}), DEFAULT_KEYBINDINGS)
  assert.deepEqual(resolveKeybindings(undefined), DEFAULT_KEYBINDINGS)
  assert.deepEqual(resolveKeybindings('not-an-object'), DEFAULT_KEYBINDINGS)
})

test('resolve({save:"Ctrl+H"}) → save 回默认 Ctrl+S', () => {
  const resolved = resolveKeybindings({ save: 'Ctrl+H' })
  assert.equal(resolved.save, 'Ctrl+S')
})

test('resolve({save:"Ctrl+P"}) → save 回默认，quickOpen 保住 Ctrl+P', () => {
  const resolved = resolveKeybindings({ save: 'Ctrl+P' })
  assert.equal(resolved.save, 'Ctrl+S')
  assert.equal(resolved.quickOpen, 'Ctrl+P')
})

test('resolve 未知 id 被忽略，非法值回默认', () => {
  const stored = { save: 'Ctrl+Alt+W', nope: 'Ctrl+Alt+Q', find: 42, quickOpen: '', exportMenu: 'Ctrl+Alt+N' }
  const resolved = resolveKeybindings(stored)
  assert.equal(resolved.save, 'Ctrl+Alt+W')
  assert.equal(resolved.find, 'Ctrl+F')
  assert.equal(resolved.quickOpen, 'Ctrl+P')
  assert.equal(resolved.exportMenu, 'Ctrl+Alt+E', '与 newDocument 默认撞车 → 回默认')
  assert.deepEqual(Object.keys(resolved).sort(), Object.keys(DEFAULT_KEYBINDINGS).sort())
})

test('resolve 两个命令存同一键：按命令序第一个生效，第二个回默认', () => {
  const resolved = resolveKeybindings({ save: 'Ctrl+Alt+W', find: 'Ctrl+Alt+W' })
  assert.equal(resolved.save, 'Ctrl+Alt+W')
  assert.equal(resolved.find, 'Ctrl+F')
})

test('resolve 结果永远落在可改键字符集里（每个都能往返）', () => {
  const resolved: Keybindings = resolveKeybindings({ save: 'Ctrl+Alt+W', quickOpen: 'Ctrl+Shift+K' })
  for (const [id, keys] of Object.entries(resolved)) assert.equal(normalizeBinding(keys), keys, id)
})
