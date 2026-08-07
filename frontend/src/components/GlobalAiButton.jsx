import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FaMicrophone, FaPaperPlane, FaRobot, FaStop, FaTimes } from 'react-icons/fa'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export default function GlobalAiButton() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('')
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'assistant', text: 'Xin chào, mình có thể hỗ trợ gì cho bạn?' },
  ])
  const speechRecognitionRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => () => {
    speechRecognitionRef.current?.abort?.()
    window.speechSynthesis?.cancel?.()
  }, [])

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [isOpen, messages, isTyping])

  const speakReply = (text) => {
    if (!window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'vi-VN'
    utterance.rate = 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const sendMessage = (rawMessage, readReply = false) => {
    const message = String(rawMessage || '').trim()
    if (!message || isTyping) return

    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: message }])
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
        return data?.message
      })
      .then((reply) => {
        setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', text: reply }])
        if (readReply) {
          setVoiceStatus('AI đang đọc câu trả lời...')
          speakReply(reply)
        }
      })
      .catch((error) => {
        setMessages((current) => [...current, { id: `assistant-error-${Date.now()}`, role: 'assistant', text: error.message || 'Không thể kết nối AI Assistant. Vui lòng thử lại sau.' }])
      })
      .finally(() => setIsTyping(false))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage(input)
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

    const recognition = new SpeechRecognition()
    recognition.lang = 'vi-VN'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onstart = () => {
      setIsListening(true)
      setVoiceStatus('Đang lắng nghe... Hãy nói câu hỏi của bạn.')
    }
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim()
      if (transcript) {
        setVoiceStatus(`Đã nhận: “${transcript}”`)
        sendMessage(transcript, true)
      }
    }
    recognition.onerror = (event) => {
      const message = event.error === 'not-allowed'
        ? 'Bạn chưa cho phép dùng microphone.'
        : 'Không thể nhận diện giọng nói. Vui lòng thử lại.'
      setVoiceStatus(message)
    }
    recognition.onend = () => setIsListening(false)
    speechRecognitionRef.current = recognition
    recognition.start()
  }

  const closeChat = () => {
    speechRecognitionRef.current?.abort?.()
    window.speechSynthesis?.cancel?.()
    setIsListening(false)
    setIsOpen(false)
  }

  if (isAdminRoute) return null

  return (
    <>
      <button
        type='button'
        className={`global-ai-button${isOpen ? ' is-open' : ''}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-label='Mở AI Assistant'
        aria-expanded={isOpen}
        aria-controls='global-ai-chat'
      >
        <FaRobot />
        <span>AI Assistant</span>
      </button>

      {isOpen && (
        <section className='global-ai-chat' id='global-ai-chat' role='dialog' aria-label='AI Assistant'>
          <header className='global-ai-chat-header'>
            <span><FaRobot /> AI Assistant</span>
            <div className='global-ai-header-actions'>
              <button type='button' className={isListening ? 'is-listening' : ''} onClick={toggleVoiceChat} aria-label={isListening ? 'Dừng voice chat' : 'Bắt đầu voice chat'} title='Voice chat'>
                {isListening ? <FaStop /> : <FaMicrophone />}
              </button>
              <button type='button' onClick={closeChat} aria-label='Đóng AI Assistant'><FaTimes /></button>
            </div>
          </header>
          <div className='global-ai-chat-messages'>
            {messages.map((message) => (
              <p key={message.id} className={`global-ai-message ${message.role}`}>{message.text}</p>
            ))}
            {isTyping && <p className='global-ai-message assistant typing'>AI đang trả lời...</p>}
            {voiceStatus && <p className='global-ai-voice-status'>{voiceStatus}</p>}
            <div ref={messagesEndRef} />
          </div>
          <form className='global-ai-chat-form' onSubmit={handleSubmit}>
            <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={300} placeholder='Nhập câu hỏi của bạn...' />
            <button type='submit' aria-label='Gửi câu hỏi' disabled={!input.trim() || isTyping}><FaPaperPlane /></button>
          </form>
        </section>
      )}
    </>
  )
}
