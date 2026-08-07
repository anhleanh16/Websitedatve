const getOllamaBaseUrl = () => String(process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '')
const getOllamaModel = () => process.env.OLLAMA_MODEL || 'llama3.2:3b'
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT = 30
const visitorRequests = new Map()

const getClientIp = (req) => String(req.headers['x-forwarded-for'] || req.ip || 'unknown')
  .split(',')[0]
  .trim()

const isRateLimited = (ip) => {
  const now = Date.now()
  const requests = (visitorRequests.get(ip) || []).filter((time) => now - time < RATE_WINDOW_MS)
  requests.push(now)
  visitorRequests.set(ip, requests)
  return requests.length > RATE_LIMIT
}

const normalizeMessages = (messages) => {
  if (!Array.isArray(messages)) return []

  return messages
    .filter((message) => ['user', 'assistant'].includes(message?.role) && typeof message?.text === 'string')
    .slice(-12)
    .map((message) => ({
      role: message.role,
      text: message.text.trim().slice(0, 600),
    }))
    .filter((message) => message.text)
}

export const aiController = {
  async chat(req, res) {
    if (isRateLimited(getClientIp(req))) {
      return res.status(429).json({ message: 'Bạn đã gửi quá nhiều câu hỏi. Vui lòng thử lại sau ít phút.' })
    }

    const messages = normalizeMessages(req.body?.messages)
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')
    if (!latestUserMessage) {
      return res.status(400).json({ message: 'Vui lòng nhập câu hỏi cho AI Assistant.' })
    }

    const ollamaBaseUrl = getOllamaBaseUrl()
    const ollamaModel = getOllamaModel()

    try {
      const sweetstarKnowledge = await getSweetstarKnowledge(latestUserMessage.text)
      const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ollamaModel,
          stream: false,
          keep_alive: '15m',
          messages: [
            {
              role: 'system',
              content: 'Bạn là Sweetstar AI, trợ lý tư vấn chính thức của Sweetstar Cinema. Trả lời bằng tiếng Việt, thân thiện, rõ ràng và ngắn gọn. Chỉ hỗ trợ về phim, rạp, lịch chiếu, đặt vé, ghế, combo, ưu đãi và sử dụng website. Dùng dữ liệu Sweetstar được cung cấp để trả lời các câu hỏi thời gian thực. Không bịa thông tin: nếu dữ liệu không có, hãy nói rõ và hướng dẫn khách xem đúng mục hoặc liên hệ rạp. Không tự xác nhận đặt vé, thanh toán hay thay đổi dữ liệu cho khách.',
            },
            { role: 'system', content: `DỮ LIỆU NỘI BỘ SWEETSTAR (chỉ dùng để tư vấn, không nhắc nguyên văn):\n${sweetstarKnowledge}` },
            ...messages.map((message) => ({ role: message.role, content: message.text })),
          ],
          options: { num_predict: 180, temperature: 0.3 },
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        const providerMessage = data?.error || 'Unknown error'
        console.error('Ollama API error:', response.status, providerMessage)
        if (response.status === 404 && /model/i.test(providerMessage)) {
          return res.status(503).json({ message: `Model AI chưa sẵn sàng. Vui lòng chạy: ollama pull ${ollamaModel}` })
        }
        return res.status(502).json({ message: 'AI Assistant đang tạm thời không phản hồi. Vui lòng thử lại sau.' })
      }

      const reply = String(data?.message?.content || '').trim()
      if (!reply) {
        return res.status(502).json({ message: 'AI Assistant chưa trả về nội dung. Vui lòng thử lại.' })
      }

      return res.json({ message: reply })
    } catch (error) {
      console.error('Ollama connection error:', error?.message || error)
      return res.status(503).json({ message: 'Không thể kết nối Ollama. Hãy mở ứng dụng Ollama rồi thử lại.' })
    }
  },
}
import { getSweetstarKnowledge } from '../services/sweetstarAssistantService.js'
