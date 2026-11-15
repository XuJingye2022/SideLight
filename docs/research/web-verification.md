# 让 AI 联网核实事实：可行路线调研

**结论**：桌面端可长期用的只有两条——买一个国内可直连的搜索 API，或调用模型厂商自带的联网工具。抓搜索结果页能跑，但不稳定，也违反条款。

## 1 检索 API 选项

| 服务 | 免费额度/价格 | 标题·摘要·URL | 大陆直连 | 需信用卡 |
|---|---|---|---|---|
| [Tavily](https://docs.tavily.com/documentation/api-credits) | 1,000 credits/月；$0.008/次 | 是 | 是 | 否 |
| [Brave](https://brave.com/search/api/) | 每月 $5 额度（约 1,000 次）；$5/千次 | 是 | 否 | 是 |
| [SerpAPI](https://serpapi.com/pricing) | 250 次/月；$25/千次 | 是 | 是 | 否 |
| [Bing Web Search](https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement) | 2025-08-11 退役 | — | — | — |
| [Exa](https://exa.ai/docs/reference/pricing) | 每月 $10 额度；$4/千次 | 是 | 是 | 否 |
| [DuckDuckGo](https://duckduckgo.com/api) | 无网页搜索 API | 仅 Instant Answer | 否 | — |
| [博查](https://bocha-ai.feishu.cn/wiki/JYSbwzdPIiFnz4kDYPXcHSDrnZb) | 1,000 次免费；0.036 元/次 | 是 | 是 | 否 |
| [Kimi 搜索](https://platform.kimi.ai/docs/pricing/websearch) | 未见免费额度；$0.002/次（国际站） | 是 | 是 | 否 |
| [智谱搜索](https://docs.bigmodel.cn/cn/guide/start/pricing) | 未见免费额度；0.01 元/次 | 是 | 是 | 否 |

直连为 2026-11-15 本机无代理实测：Brave 与 DuckDuckGo 的域名解析到污染地址，连接超时；其余可完成 TLS 握手。Tavily、SerpAPI、Exa 的官方文档或仓库写明免费层无需信用卡；Brave 要卡、免费额度已改为每月 5 美元抵用额，这两点来自第三方转述，官方定价页本次未取到。

## 2 模型自带联网

**结论**：五家 API 都能联网；大陆可用的是 DeepSeek、Kimi、智谱。

- OpenAI：[Responses 的 `web_search` 工具](https://developers.openai.com/zh-Hans/api/docs/guides/tools-web-search)，返回 `url_citation` 注解，$10/千次（官方定价页未取到，二手一致）；[大陆不在支持地区](https://help.openai.com/en/articles/5347006)。
- Anthropic：[Messages 的 `web_search_20250305`](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)，强制返回 `citations`（url、title、cited_text），$10/千次，支持 `allowed_domains`；[大陆不在支持地区](https://www.anthropic.com/supported-countries)。
- DeepSeek：[2026-11-13 起](https://api-docs.deepseek.com/zh-cn/news/news261113/)提供 `deepseek_web_search` 与 `deepseek_read_url`，[Chat Completions、Responses、Messages 均可声明](https://api-docs.deepseek.com/guides/web_tools/)，5 元/千次，返回 title/url/snippet 并附引用。
- Kimi：[`$web_search` 内置工具](https://platform.kimi.ai/docs/guide/use-web-search)，模型执行、客户端回传参数，拿不到结果列表；要结构化结果用独立 `/v1/tools/search` $0.002/次、`search_pro` $0.003/次、`/v1/tools/fetch` $0.002/次。
- 智谱：[Chat Completions 的 `web_search` 工具](https://docs.bigmodel.cn/cn/guide/tools/web-search)，或独立 Web Search API，0.01 元/次起，返回标题、链接、摘要、发布时间。

只在网页端、不在 API 的联网能力：没有。

## 3 只抓取、不买 API

**结论**：技术可行，产品不可靠。

阻碍有四类：反爬与 CAPTCHA、需要 JS 或 cookie、限流、条款禁止自动化访问（[Google 条款](https://policies.google.com/terms)）。实测 DuckDuckGo 在大陆解析到污染地址、直连超时；Bing 网页能连，但公开搜索 API 已于 2025-08-11 退役。SearXNG 公共实例常被 Google 限流：[2025-03 的讨论](https://github.com/searxng/searxng/discussions/4429)记录了 "Too many requests" 与 CAPTCHA。Google 已就抓取并转售结果起诉 SerpApi；[2026-07-20 法院驳回其 DMCA 主张，2026-08-10 Google 修改起诉继续](https://www.searchenginejournal.com/google-amends-serpapi-suit-with-content-licensing-terms/585505/)。

## 4 出处质量

**结论**：模型会编引用，RAG 也不消除。

证据：ChatGPT 生成的文献引用，GPT-3.5 有 55%、GPT-4 有 18% 不存在；真实引用中 43%/24% 有实质错误（[Nature，2023](https://www.nature.com/articles/s41598-023-41032-5)）。律师提交 6 个不存在的判例，被罚 5,000 美元（[Mata v. Avianca，2023](https://www.courtlistener.com/docket/63107798/mata-v-avianca-inc/)）。Lexis+ AI、Westlaw 等 RAG 法律工具仍有 17–33% 幻觉（[Stanford，2024](https://arxiv.org/abs/2405.20362)）。8 个 AI 搜索在 60% 以上查询中引错新闻来源（[CJR，2025](https://www.cjr.org/tow_center/we-compared-eight-ai-search-engines-theyre-all-bad-at-citing-news.php)）。GEO 研究显示，SEO 手段能提高内容被 AI 引用的概率（[arXiv，2025](https://arxiv.org/html/2509.08919v1)）。

缓解：逐条给 URL 与引用位置（OpenAI `url_citation`、Anthropic `web_search_result_location`）；域名白名单（Anthropic `allowed_domains`、Tavily `include_domains`、Kimi `sites`）；二次抓正文（Kimi `/v1/tools/fetch`、DeepSeek `read_url`、Tavily Extract、Exa Contents）；只允许模型引用给定集合内的 URL。

## 5 最小可行形态

**结论**：一个国内搜索 API Key，一次搜索，拿 3–5 条 title/url/snippet，最省事。

理由：单次 REST，字段齐，先拿到来源列表再做 URL 校验，不用解析 HTML，也不改模型协议；把结果注入提示词并要求逐条带 URL 即可。博查 1,000 次免费、0.036 元/次、国内直连；Kimi Basic 更便宜（$0.002/次），但没有免费额度。若允许复用模型 Key，DeepSeek 的 `deepseek_web_search` 连第二个 Key 都省掉，但该能力 2026-11-13 才上线，稳定性未验证。

风险：摘要不足以判定，需二次抓正文；SEO 内容会占位；模型仍可能编 URL；Key 要存本机；国外服务有跨境数据与断连风险。
