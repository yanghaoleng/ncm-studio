const defaultDeepseekChatUrl = 'https://api.deepseek.com/chat/completions'

function deepseekChatUrl() {
  const configuredUrl = process.env.DEEPSEEK_CHAT_URL || process.env.DEEPSEEK_BASE_URL
  if (!configuredUrl) return defaultDeepseekChatUrl

  const normalizedUrl = configuredUrl.replace(/\/+$/, '')
  if (normalizedUrl.endsWith('/chat/completions')) return normalizedUrl
  return `${normalizedUrl}/chat/completions`
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object') return request.body
  if (typeof request.body === 'string') return JSON.parse(request.body || '{}')

  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const rawBody = Buffer.concat(chunks).toString('utf8')
  return rawBody ? JSON.parse(rawBody) : {}
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: '只支持 POST 请求' })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY
  if (!apiKey) {
    return response.status(500).json({ error: '未配置服务端 DEEPSEEK_API_KEY，无法调用 DeepSeek 增强解析' })
  }

  try {
    const { playlistText = '', firstPassItems = [] } = await readJsonBody(request)
    const sourceText = String(playlistText).trim()

    if (!sourceText) {
      return response.status(400).json({ error: '歌单内容不能为空' })
    }

    const deepseekResponse = await fetch(deepseekChatUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content:
              '你是一个歌单文本解析器。只输出 JSON 对象，不要 Markdown。保持原始顺序。可以基于常见公开音乐知识补全歌手和专辑；不确定时对应字段置空。',
          },
          {
            role: 'user',
            content: [
              '请把原始歌单重新解析为 {"tracks":[{"title":"歌名","artist":"歌手","album":"专辑","source":"原始行"}]}。',
              '需要识别常见分隔符、序号、书名号、括号备注、中文破折号、全角符号。',
              '如果知道歌曲常见发行专辑或单曲名，请填写 album；如果有多个版本，选择最常见或最贴近原始行版本的专辑名。',
              '',
              '原始歌单：',
              sourceText,
              '',
              '第一次解析结果：',
              JSON.stringify(
                firstPassItems.map(({ title, artist, album, source }) => ({ title, artist, album, source })),
              ),
            ].join('\n'),
          },
        ],
        response_format: { type: 'json_object' },
        stream: false,
        temperature: 0.1,
      }),
    })

    if (!deepseekResponse.ok) {
      const detail = await deepseekResponse.text()
      return response
        .status(deepseekResponse.status)
        .json({ error: `DeepSeek 增强解析失败：${deepseekResponse.status} ${detail.slice(0, 120)}` })
    }

    const data = await deepseekResponse.json()
    return response.status(200).json({ content: data?.choices?.[0]?.message?.content || '' })
  } catch (error) {
    return response.status(500).json({ error: error.message || 'DeepSeek 增强解析失败' })
  }
}
