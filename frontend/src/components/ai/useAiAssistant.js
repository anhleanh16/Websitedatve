import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const CHAT_HISTORY_TTL_MS = 24 * 60 * 60 * 1000
const CHAT_HISTORY_PREFIX = 'sweetstar_ai_chat_v1'
const MAX_STORED_MESSAGES = 40

const createWelcomeMessage = () => ({
  id: 'welcome',
  role: 'assistant',
  text: 'Xin chào, mình có thể tư vấn phim, lịch chiếu hoặc hỗ trợ đặt vé cho bạn.',
})

const normalizeMovies = (movies) => {
  if (!Array.isArray(movies)) return []

  return movies
    .filter((movie) => Number.isInteger(Number(movie?.id)) && movie?.title)
    .slice(0, 4)
    .map((movie) => ({
      id: Number(movie.id),
      title: String(movie.title).slice(0, 180),
      poster: String(movie.poster || '').slice(0, 500),
      duration: Number(movie.duration || 0),
      ageLimit: String(movie.ageLimit || '').slice(0, 20),
      status: movie.status === 'coming_soon' ? 'coming_soon' : 'now_showing',
      categories: Array.isArray(movie.categories)
        ? movie.categories.map((category) => String(category).slice(0, 60)).slice(0, 4)
        : [],
      rating: Number.isFinite(Number(movie.rating)) ? Number(movie.rating) : null,
    }))
}

const normalizeStoredMessages = (messages) => {
  if (!Array.isArray(messages)) return [createWelcomeMessage()]

  const normalized = messages
    .filter((message) => ['user', 'assistant'].includes(message?.role) && typeof message?.text === 'string')
    .slice(-MAX_STORED_MESSAGES)
    .map((message, index) => ({
      id: String(message.id || `restored-${index}`),
      role: message.role,
      text: message.text.slice(0, 2000),
      movies: normalizeMovies(message.movies),
    }))

  return normalized.length ? normalized : [createWelcomeMessage()]
}

const readChatHistory = (storageKey) => {
  try {
    const rawHistory = localStorage.getItem(storageKey)
    if (!rawHistory) return [createWelcomeMessage()]

    const history = JSON.parse(rawHistory)
    if (!history?.expiresAt || Number(history.expiresAt) <= Date.now()) {
      localStorage.removeItem(storageKey)
      return [createWelcomeMessage()]
    }

    return normalizeStoredMessages(history.messages)
  } catch {
    localStorage.removeItem(storageKey)
    return [createWelcomeMessage()]
  }
}

const saveChatHistory = (storageKey, messages) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      expiresAt: Date.now() + CHAT_HISTORY_TTL_MS,
      messages: normalizeStoredMessages(messages),
    }))
  } catch {
    // Chat vẫn hoạt động nếu trình duyệt chặn hoặc hết dung lượng localStorage.
  }
}

const splitTextForSpeech = (value, maxLength = 170) => {
  const cleaned = String(value || '')
    .replace(/[*_#>`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return []

  const sentences = cleaned.match(/[^.!?…]+[.!?…]?/g) || [cleaned]
  const chunks = []
  let currentChunk = ''

  const appendWords = (text) => {
    text.split(' ').forEach((word) => {
      const nextChunk = currentChunk ? `${currentChunk} ${word}` : word
      if (nextChunk.length > maxLength && currentChunk) {
        chunks.push(currentChunk)
        currentChunk = word
      } else {
        currentChunk = nextChunk
      }
    })
  }

  sentences.forEach((sentence) => {
    const trimmedSentence = sentence.trim()
    const nextChunk = currentChunk ? `${currentChunk} ${trimmedSentence}` : trimmedSentence
    if (nextChunk.length <= maxLength) {
      currentChunk = nextChunk
    } else {
      if (currentChunk) chunks.push(currentChunk)
      currentChunk = ''
      appendWords(trimmedSentence)
    }
  })

  if (currentChunk) chunks.push(currentChunk)
  return chunks
}

export const formatAgeLimit = (ageLimit) => {
  const value = String(ageLimit || '').trim()
  if (!value) return ''
  return /^t/i.test(value) || value.toLowerCase() === 'p' ? value.toUpperCase() : `T${value}`
}

export default function useAiAssistant() {
  const profile = useSelector((state) => state.user.profile)
  const storageKey = `${CHAT_HISTORY_PREFIX}:${profile?.id ? `user-${profile.id}` : 'guest'}`
  const [historyOwner, setHistoryOwner] = useState(storageKey)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speakingMessageId, setSpeakingMessageId] = useState(null)
  const [voiceStatus, setVoiceStatus] = useState('')
  const [messages, setMessages] = useState(() => readChatHistory(storageKey))
  const speechRecognitionRef = useRef(null)
  const speechSessionRef = useRef(0)
  const shouldPersistHistoryRef = useRef(false)

  const updateMessages = (updater) => {
    shouldPersistHistoryRef.current = true
    setMessages(updater)
  }

  useEffect(() => {
    if (historyOwner === storageKey) return
    shouldPersistHistoryRef.current = false
    setMessages(readChatHistory(storageKey))
    setHistoryOwner(storageKey)
    setIsTyping(false)
    setVoiceStatus('')
  }, [historyOwner, storageKey])

  useEffect(() => {
    if (!shouldPersistHistoryRef.current || historyOwner !== storageKey) return
    saveChatHistory(storageKey, messages)
    shouldPersistHistoryRef.current = false
  }, [historyOwner, messages, storageKey])

  useEffect(() => () => {
    speechRecognitionRef.current?.abort?.()
    speechSessionRef.current += 1
    window.speechSynthesis?.cancel?.()
  }, [])

  const stopSpeaking = () => {
    speechSessionRef.current += 1
    window.speechSynthesis?.cancel?.()
    setSpeakingMessageId(null)
    setVoiceStatus('')
  }

  const speakReply = (text, messageId = 'voice-reply') => {
    const synthesis = window.speechSynthesis
    const SpeechUtterance = window.SpeechSynthesisUtterance
    if (!synthesis || !SpeechUtterance) {
      setVoiceStatus('Thiết bị này chưa hỗ trợ đọc văn bản thành giọng nói.')
      return
    }

    const chunks = splitTextForSpeech(text)
    if (!chunks.length) return

    speechSessionRef.current += 1
    const sessionId = speechSessionRef.current
    synthesis.cancel()
    synthesis.resume?.()
    setSpeakingMessageId(messageId)
    setVoiceStatus('AI đang đọc bằng tiếng Việt...')

    let started = false
    const beginSpeaking = () => {
      if (started || sessionId !== speechSessionRef.current) return
      started = true

      const voices = synthesis.getVoices?.() || []
      const vietnameseVoice = voices.find((voice) => voice.lang?.toLowerCase() === 'vi-vn')
        || voices.find((voice) => voice.lang?.toLowerCase().startsWith('vi'))
      let chunkIndex = 0

      const speakNextChunk = () => {
        if (sessionId !== speechSessionRef.current) return
        if (chunkIndex >= chunks.length) {
          setSpeakingMessageId(null)
          setVoiceStatus('')
          return
        }

        const utterance = new SpeechUtterance(chunks[chunkIndex])
        chunkIndex += 1
        utterance.lang = vietnameseVoice?.lang || 'vi-VN'
        utterance.voice = vietnameseVoice || null
        utterance.rate = 0.94
        utterance.pitch = 1
        utterance.onend = speakNextChunk
        utterance.onerror = (event) => {
          if (event.error === 'canceled' || event.error === 'interrupted') return
          setSpeakingMessageId(null)
          setVoiceStatus('Không thể phát giọng Việt. Hãy kiểm tra dịch vụ chuyển văn bản thành giọng nói trên điện thoại.')
        }
        synthesis.speak(utterance)
      }

      speakNextChunk()
    }

    if ((synthesis.getVoices?.() || []).length) {
      beginSpeaking()
    } else {
      synthesis.addEventListener?.('voiceschanged', beginSpeaking, { once: true })
      window.setTimeout(beginSpeaking, 400)
    }
  }

  const sendMessage = (rawMessage, readReply = false) => {
    const message = String(rawMessage || '').trim()
    if (!message || isTyping) return

    updateMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: message }])
    setInput('')
    setIsTyping(true)

    const history = [...messages, { role: 'user', text: message }]
    const token = localStorage.getItem('token')

    fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages: history }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.message || 'AI Assistant đang tạm thời không phản hồi.')
        return { text: String(data?.message || '').trim(), movies: normalizeMovies(data?.movies) }
      })
      .then((reply) => {
        const assistantMessageId = `assistant-${Date.now()}`
        updateMessages((current) => [...current, {
          id: assistantMessageId,
          role: 'assistant',
          text: reply.text,
          movies: reply.movies,
        }])
        if (readReply) speakReply(reply.text, assistantMessageId)
      })
      .catch((error) => {
        updateMessages((current) => [...current, {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: error.message || 'Không thể kết nối AI Assistant. Vui lòng thử lại sau.',
        }])
      })
      .finally(() => setIsTyping(false))
  }

  const stopVoiceInput = () => {
    speechRecognitionRef.current?.abort?.()
    setIsListening(false)
  }

  const toggleVoiceChat = () => {
    if (isListening) {
      speechRecognitionRef.current?.stop?.()
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceStatus('Trình duyệt chưa hỗ trợ nhận diện giọng nói. Hãy dùng Chrome hoặc Edge.')
      return
    }

    stopSpeaking()
    const recognition = new SpeechRecognition()
    recognition.lang = 'vi-VN'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      setIsListening(true)
      setVoiceStatus('Đang lắng nghe... Hãy nói câu hỏi của bạn.')
    }
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || [])
        .map((result) => result?.[0]?.transcript || '')
        .join(' ')
        .trim()
      if (transcript) {
        setVoiceStatus(`Đã nhận: “${transcript}”`)
        sendMessage(transcript, true)
      }
    }
    recognition.onerror = (event) => {
      const errorMessages = {
        'not-allowed': 'Bạn chưa cho phép dùng microphone.',
        'service-not-allowed': 'Trình duyệt đang chặn dịch vụ nhận diện giọng nói.',
        'no-speech': 'Chưa nghe thấy giọng nói. Hãy giữ điện thoại gần hơn và thử lại.',
        network: 'Nhận diện giọng nói cần kết nối mạng ổn định.',
        'audio-capture': 'Không tìm thấy microphone trên thiết bị.',
      }
      setVoiceStatus(errorMessages[event.error] || 'Không thể nhận diện tiếng Việt. Vui lòng thử lại.')
    }
    recognition.onnomatch = () => setVoiceStatus('Chưa nhận ra câu tiếng Việt. Hãy nói chậm và rõ hơn.')
    recognition.onend = () => setIsListening(false)
    speechRecognitionRef.current = recognition

    try {
      recognition.start()
    } catch {
      setIsListening(false)
      setVoiceStatus('Microphone đang bận. Vui lòng thử lại sau một chút.')
    }
  }

  return {
    input,
    setInput,
    messages,
    isTyping,
    isListening,
    speakingMessageId,
    voiceStatus,
    setVoiceStatus,
    sendMessage,
    speakReply,
    stopSpeaking,
    toggleVoiceChat,
    stopVoiceInput,
  }
}
