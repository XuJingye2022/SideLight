import type { SearchSource } from './annotations.ts'

export type SearchProvider = 'off' | 'tavily' | 'bocha' | 'deepseek'

export type SearchConfig = {
  provider: SearchProvider
  apiKey: string
}

export type SearchRequest = {
  url: string
  headers: Record<string, string>
  body: string
}

/** 各家搜索接口的请求体，纯函数，便于测试 */
export function buildSearchRequest(provider: SearchProvider, query: string, apiKey: string): SearchRequest | null {
  const key = apiKey.trim()
  if (provider === 'off' || key.length === 0 || query.trim().length === 0) return null

  if (provider === 'tavily') {
    return {
      url: 'https://api.tavily.com/search',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, max_results: 5, search_depth: 'basic' }),
    }
  }

  if (provider === 'deepseek') {
    return {
      url: 'https://api.deepseek.com/v1/tools/search',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, count: 5, need_content: false }),
    }
  }

  return {
    url: 'https://api.bochaai.com/v1/web-search',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, count: 5, summary: false }),
  }
}

/** 把各家返回统一成 {title,url,snippet}；解析不了就给空数组，不抛 */
export function parseSearchResponse(provider: SearchProvider, payload: unknown): SearchSource[] {
  const record = payload as Record<string, unknown> | null
  if (!record) return []

  if (provider === 'tavily') {
    const results = Array.isArray(record.results) ? record.results : []
    return results.flatMap((item) => {
      const entry = item as Record<string, unknown>
      const url = typeof entry.url === 'string' ? entry.url : ''
      if (!url) return []
      return [
        {
          title: typeof entry.title === 'string' ? entry.title : url,
          url,
          snippet: typeof entry.content === 'string' ? entry.content.slice(0, 300) : '',
        },
      ]
    })
  }

  if (provider === 'deepseek') {
    const results = Array.isArray(record.results) ? record.results : []
    return results.flatMap((item) => {
      const entry = item as Record<string, unknown>
      const url = typeof entry.url === 'string' ? entry.url : ''
      if (!url) return []
      const summary = typeof entry.summary === 'string' ? entry.summary : ''
      const snippet = typeof entry.snippet === 'string' ? entry.snippet : ''
      return [
        {
          title: typeof entry.title === 'string' && entry.title ? entry.title : url,
          url,
          snippet: (summary || snippet).slice(0, 300),
        },
      ]
    })
  }

  const data = record.data as Record<string, unknown> | undefined
  const webPages = data?.webPages as Record<string, unknown> | undefined
  const values = Array.isArray(webPages?.value) ? (webPages?.value as unknown[]) : []
  return values.flatMap((item) => {
    const entry = item as Record<string, unknown>
    const url = typeof entry.url === 'string' ? entry.url : ''
    if (!url) return []
    return [
      {
        title: typeof entry.name === 'string' ? entry.name : url,
        url,
        snippet: typeof entry.snippet === 'string' ? entry.snippet.slice(0, 300) : '',
      },
    ]
  })
}

/** 4xx 不重试；这里只把常见的状态码翻成可读文案 */
export function searchErrorMessage(status: number, detail = ''): string {
  if (status === 401) return '搜索 Key 无效（401），检查设置里的搜索 API Key'
  if (status === 402) return '搜索账户余额不足（402），充值后再试'
  if (status === 429) return '搜索太频繁（429），稍后再试'
  if (status >= 500) return `搜索服务暂时不可用（${status}），稍后再试`
  return `搜索接口返回 ${status}${detail ? `：${detail.slice(0, 160)}` : ''}`
}

/** 真发请求。失败抛中文错误，方便直接显示在提示里 */
export async function searchWeb(config: SearchConfig, query: string, signal?: AbortSignal): Promise<SearchSource[]> {
  const request = buildSearchRequest(config.provider, query, config.apiKey)
  if (!request) return []

  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: request.body,
    signal,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(searchErrorMessage(response.status, detail))
  }

  return parseSearchResponse(config.provider, await response.json())
}
