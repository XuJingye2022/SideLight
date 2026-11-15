import { useEffect, useState } from 'react'

import { DEFAULT_ANALYSIS_PROMPT } from '../lib/prompt.ts'
import { MAX_FONT_SIZE, MIN_FONT_SIZE, type Settings } from '../lib/settings.ts'

type Props = {
  open: boolean
  settings: Settings
  onSave: (settings: Settings) => void
  onClose: () => void
}

export function SettingsDialog({ open, settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Settings>(settings)

  // 对话框常驻，每次打开都把草稿同步成当前设置，避免保存时把刚改的值盖回去
  useEffect(() => {
    if (open) setDraft(settings)
  }, [open, settings])

  if (!open) return null

  const update = (patch: Partial<Settings>) => setDraft((current) => ({ ...current, ...patch }))

  return (
    <div className="overlay" role="presentation" onMouseDown={onClose}>
      <div className="dialog" role="dialog" aria-label="设置" onMouseDown={(event) => event.stopPropagation()}>
        <h2>设置</h2>
        <p className="dialog-note">密钥只存在这台机器的本地存储里，不会上传。</p>

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
