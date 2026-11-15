# AI 接入只做自带密钥，协议锁 OpenAI 兼容

Sidelight 不代管模型请求。用户在设置里填 base_url、api_key 与模型名，请求从应用直连提供方。协议只实现 OpenAI 兼容的 `/chat/completions`，一套客户端覆盖 DeepSeek、Kimi、智谱、OpenAI 与本地 Ollama。

另一条路是内置托管：我们出 key，按量收费。它要额外做账号、计量、计费与防滥用，还把用户正文的路由权收进我们手里。MVP 不做。

provider 收敛成一个接口：取配置、发请求、解析流。以后加托管通道时只换实现，界面与卡片不动。

这条决定最可能被产品否掉：普通写作者不会去申请 API key。真发布时大概率要托管通道；届时它不是重写，是在 provider 接口上加一条分支。
