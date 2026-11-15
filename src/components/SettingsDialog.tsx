import { useEffect, useRef, useState } from 'react'

import { DEFAULT_ANALYSIS_PROMPT } from '../lib/prompt.ts'
import { MAX_FONT_SIZE, MIN_FONT_SIZE, type Settings } from '../lib/settings.ts'
import { useDialogFocus } from './useDialogFocus.ts'

type Props = {
  open: boolean
  settings: Settings
  onSave: (settings: Settings) => void
  onClose: () => void
  onShowShortcuts: () => void
}

export function SettingsDialog({ open, settings, onSave, onClose, onShowShortcuts }: Props) {
  const [draft, setDraft] = useState<Settings>(settings)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  useDialogFocus(open, dialogRef)

  // 对话框常驻，每次打开都把草稿同步成当前设置，避免保存时把刚改的值盖回去
  useEffect(() => {
    if (open) setDraft(settings)
  }, [open, settings])

  if (!open) return null

  const update = (patch: Partial<Settings>) => setDraft((current) => ({ ...current, ...patch }))

  return (
    <div className="overlay" role="presentation" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="设置"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="settings-title">设置</h2>
        <p className="dialog-note">密钥只存在这台机器的本地存储里，不会上传。</p>

        <div className="field theme-field" role="radiogroup" aria-label="主题">
          <span>主题</span>
          <div className="theme-options">
            {(
              [
                ['light', '浅色'],
                ['dark', '深色'],
                ['system', '跟随系统'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={draft.theme === mode}
                className={draft.theme === mode ? 'is-on' : ''}
                onClick={() => {
                  update({ theme: mode })
                  // 先预览，取消时由 App 还原到已保存的主题
                  document.documentElement.setAttribute('data-theme', mode)
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="field-hint">点一下就预览；保存后记住，取消会还原。</p>
        </div>

        <label className="field field-check">
          <input
            type="checkbox"
            checked={draft.autoSave}
            onChange={(event) => update({ autoSave: event.target.checked })}
          />
          <span>自动保存（停笔 2 秒）</span>
        </label>
        <p className="field-hint">只写回已打开的文件；宿主文档另存草稿。有格式损失时只提示，不写。</p>

        <label className="field">
          <span>接口地址</span>
          <input
            value={draft.baseUrl}
            onChange={(event) => update({ baseUrl: event.target.value })}
            placeholder="https://api.deepseek.com/v1"
            spellCheck={false}
          />
        </label>

        <label className="field">
          <span>API Key</span>
          <input
            type="password"
            value={draft.apiKey}
            onChange={(event) => update({ apiKey: event.target.value })}
            placeholder="sk-..."
            spellCheck={false}
          />
          {draft.apiKey.trim().length === 0 && <span className="field-hint">未配置：分析会用本地模拟批注</span>}
        </label>

        <label className="field">
          <span>模型</span>
          <input
            value={draft.model}
            onChange={(event) => update({ model: event.target.value })}
            placeholder="deepseek-chat"
            spellCheck={false}
          />
        </label>

        <label className="field">
          <span>正文字号（{MIN_FONT_SIZE}–{MAX_FONT_SIZE}）</span>
          <input
            type="number"
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            value={draft.fontSize}
            onChange={(event) => update({ fontSize: Number(event.target.value) })}
          />
        </label>

        <label className="field">
          <span>联网核对（可选）</span>
          <select
            value={draft.searchProvider}
            onChange={(event) => update({ searchProvider: event.target.value as Settings['searchProvider'] })}
          >
            <option value="off">不启用</option>
            <option value="tavily">Tavily</option>
            <option value="bocha">博查</option>
          </select>
        </label>

        {draft.searchProvider !== 'off' && (
          <label className="field">
            <span>搜索 API Key</span>
            <input
              type="password"
              value={draft.searchApiKey}
              onChange={(event) => update({ searchApiKey: event.target.value })}
              placeholder="tvly-… 或博查 key"
              spellCheck={false}
            />
          </label>
        )}

        <label className="field">
          <span>批注提示词</span>
          <textarea
            className="dialog-textarea"
            value={draft.analysisPrompt}
            spellCheck={false}
            onChange={(event) => update({ analysisPrompt: event.target.value })}
          />
        </label>
        <div className="dialog-inline">
          <button
            type="button"
            onClick={() => update({ analysisPrompt: DEFAULT_ANALYSIS_PROMPT })}
          >
            恢复默认提示词
          </button>
        </div>

        <p className="dialog-note">协议按 OpenAI 兼容走，DeepSeek、Kimi、智谱、OpenAI、Ollama 都能填。</p>

        <div className="dialog-actions">
          <button type="button" onClick={onShowShortcuts}>
            快捷键
          </button>
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button type="button" className="primary" onClick={() => onSave(draft)}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
