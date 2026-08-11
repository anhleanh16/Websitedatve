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

const findVietnameseVoice = (voices) => {
  const availableVoices = Array.isArray(voices) ? voices : []
  return availableVoices.find((voice) => voice.lang?.toLowerCase().replace('_', '-') === 'vi-vn')
    || availableVoices.find((voice) => voice.lang?.toLowerCase().startsWith('vi'))
    || availableVoices.find((voice) => /tiếng việt|tieng viet|vietnamese/i.test(voice.name || ''))
    || null
}

const waitForSpeechVoices = (synthesis, timeoutMs = 1400) => new Promise((resolve) => {
  const currentVoices = synthesis.getVoices?.() || []
  if (currentVoices.length) {
    resolve(currentVoices)
    return
  }

  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    synthesis.removeEventListener?.('voiceschanged', finish)
    resolve(synthesis.getVoices?.() || [])
  }

  synthesis.addEventListener?.('voiceschanged', finish)
  window.setTimeout(finish, timeoutMs)
})

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
  const speechRequestRef = useRef(null)
  const audioContextRef = useRef(null)
  const audioSourceRef = useRef(null)
  const shouldPersistHistoryRef = useRef(false)

  const prepareAudioContext = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return null

    if (!audioContextRef.current) audioContextRef.current = new AudioContext()
    audioContextRef.current.resume?.().catch(() => {})
    return audioContextRef.current
  }

  const stopGeneratedAudio = () => {
    speechRequestRef.current?.abort?.()
    speechRequestRef.current = null
    try {
      audioSourceRef.current?.stop?.()
    } catch {
      // Nguồn âm thanh có thể đã tự kết thúc.
    }
    audioSourceRef.current = null
  }

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
    stopGeneratedAudio()
    window.speechSynthesis?.cancel?.()
    audioContextRef.current?.close?.().catch(() => {})
    audioContextRef.current = null
  }, [])

  const stopSpeaking = () => {
    speechSessionRef.current += 1
    stopGeneratedAudio()
    window.speechSynthesis?.cancel?.()
    setSpeakingMessageId(null)
    setVoiceStatus('')
  }

  const speakWithDeviceVoice = async (text, sessionId) => {
    const synthesis = window.speechSynthesis
    const SpeechUtterance = window.SpeechSynthesisUtterance
    if (!synthesis || !SpeechUtterance) {
      setVoiceStatus('Thiết bị này chưa hỗ trợ đọc văn bản thành giọng nói.')
      return false
    }

    const chunks = splitTextForSpeech(text)
    if (!chunks.length) return false

    const voices = await waitForSpeechVoices(synthesis)
    if (sessionId !== speechSessionRef.current) return false

    const vietnameseVoice = findVietnameseVoice(voices)
    if (!vietnameseVoice) {
      setSpeakingMessageId(null)
      setVoiceStatus('Điện thoại chưa có giọng đọc tiếng Việt. Hãy dùng nút Nghe lại để thử giọng AI hoặc cài giọng Tiếng Việt trong phần chuyển văn bản thành giọng nói của máy.')
      return false
    }

    synthesis.cancel()
    synthesis.resume?.()
    setVoiceStatus('AI đang đọc bằng giọng tiếng Việt trên thiết bị...')
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
      utterance.lang = vietnameseVoice.lang || 'vi-VN'
      utterance.voice = vietnameseVoice
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
    return true
  }

  const speakReply = async (text, messageId = 'voice-reply') => {
    const speechText = String(text || '').trim()
    if (!speechText) return

    speechSessionRef.current += 1
    const sessionId = speechSessionRef.current
    stopGeneratedAudio()
    window.speechSynthesis?.cancel?.()
    setSpeakingMessageId(messageId)

    const isMobile = window.matchMedia?.('(max-width: 768px)').matches
    if (!isMobile) {
      await speakWithDeviceVoice(speechText, sessionId)
      return
    }

    const audioContext = prepareAudioContext()
    const requestController = new AbortController()
    speechRequestRef.current = requestController
    setVoiceStatus('AI đang chuẩn bị giọng đọc tiếng Việt tự nhiên...')

    try {
      const response = await fetch(`${API_BASE}/ai/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: requestController.signal,
        body: JSON.stringify({ text: speechText }),
      })
      if (!response.ok) throw new Error('Gemini TTS unavailable')

      const audioData = await response.arrayBuffer()
      if (!audioData.byteLength || sessionId !== speechSessionRef.current) return
      if (!audioContext) throw new Error('Web Audio unavailable')

      const audioBuffer = await audioContext.decodeAudioData(audioData.slice(0))
      if (sessionId !== speechSessionRef.current) return
      await audioContext.resume?.()

      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      source.onended = () => {
        if (sessionId !== speechSessionRef.current) return
        audioSourceRef.current = null
        setSpeakingMessageId(null)
        setVoiceStatus('')
      }
      audioSourceRef.current = source
      speechRequestRef.current = null
      setVoiceStatus('AI đang đọc bằng giọng tiếng Việt...')
      source.start(0)
    } catch (error) {
      speechRequestRef.current = null
      if (error?.name === 'AbortError' || sessionId !== speechSessionRef.current) return
      await speakWithDeviceVoice(speechText, sessionId)
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
    prepareAudioContext()
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
