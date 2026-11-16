import assert from 'node:assert/strict'
import test from 'node:test'

import { DEFAULT_ANALYSIS_PROMPT } from './prompt.ts'
import { promptFingerprint, LEGACY_PROMPT_FINGERPRINT } from './settings.ts'

const makeStorage = () => {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => map.set(key, value),
    removeItem: (key: string) => map.delete(key),
    clear: () => map.clear(),
  }
}

test('提示词指纹稳定且旧默认可识别', () => {
  assert.equal(promptFingerprint(DEFAULT_ANALYSIS_PROMPT), promptFingerprint(DEFAULT_ANALYSIS_PROMPT))
  assert.match(LEGACY_PROMPT_FINGERPRINT, /^\d+:[0-9a-f]+$/)
  assert.notEqual(promptFingerprint(DEFAULT_ANALYSIS_PROMPT), LEGACY_PROMPT_FINGERPRINT)
})

test('旧默认提示词升级；自定义保留；空值回落', async () => {
  const storage = makeStorage()
  ;(globalThis as { localStorage?: unknown }).localStorage = storage
  const { loadSettings } = await import('./settings.ts')

  storage.setItem('sidelight.settings.v1', JSON.stringify({ analysisPrompt: '旧默认' }))
  const custom = loadSettings()
  assert.equal(custom.analysisPrompt, '旧默认')
  assert.equal(custom.promptVersion, 0)

  storage.setItem('sidelight.settings.v1', JSON.stringify({ analysisPrompt: '' }))
  assert.equal(loadSettings().analysisPrompt, DEFAULT_ANALYSIS_PROMPT)

  const legacy = 'x'.repeat(5967)
  storage.setItem('sidelight.settings.v1', JSON.stringify({ analysisPrompt: legacy }))
  // 指纹不同的伪旧默认不会被误升级
  assert.equal(loadSettings().analysisPrompt, legacy)
})

test('旧存档没有智能标点键时读出来是开，明确写 false 才关', async () => {
  const storage = makeStorage()
  ;(globalThis as { localStorage?: unknown }).localStorage = storage
  const { loadSettings } = await import('./settings.ts')

  storage.setItem('sidelight.settings.v1', JSON.stringify({ autoSave: false }))
  const old = loadSettings()
  assert.equal(old.smartPunctuation, true)
  assert.equal(old.autoSave, false)

  storage.setItem('sidelight.settings.v1', JSON.stringify({ smartPunctuation: false }))
  assert.equal(loadSettings().smartPunctuation, false)
})
