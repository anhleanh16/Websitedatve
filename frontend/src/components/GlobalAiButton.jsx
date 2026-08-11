import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaMicrophone,
  FaPaperPlane,
  FaRobot,
  FaStop,
  FaTimes,
  FaVolumeUp,
} from 'react-icons/fa'
import AiMovieCards from './ai/AiMovieCards'
import useAiAssistant from './ai/useAiAssistant'

export default function GlobalAiButton() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isMobileChatRoute = location.pathname === '/ai-chat'

  if (isAdminRoute || isMobileChatRoute) return null
  return <GlobalAiWidget autoOpen={new URLSearchParams(location.search).get('chatbox') === '1'} />
}

function GlobalAiWidget({ autoOpen = false }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const {
    input,
    setInput,
    messages,
    isTyping,
    isListening,
    speakingMessageId,
    voiceStatus,
    sendMessage,
    speakReply,
    stopSpeaking,
    toggleVoiceChat,
    stopVoiceInput,
  } = useAiAssistant()

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [isOpen, messages, isTyping])

  useEffect(() => {
    if (autoOpen && !window.matchMedia('(max-width: 768px)').matches) setIsOpen(true)
  }, [autoOpen])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const closeDesktopPopupOnMobile = (event) => {
      if (event.matches) setIsOpen(false)
    }
    mediaQuery.addEventListener?.('change', closeDesktopPopupOnMobile)
    return () => mediaQuery.removeEventListener?.('change', closeDesktopPopupOnMobile)
  }, [])

  const openAssistant = () => {
    if (window.matchMedia('(max-width: 768px)').matches) {
      setIsOpen(false)
      navigate('/ai-chat')
      return
    }
    setIsOpen((current) => !current)
  }

  const closeChat = () => {
    stopVoiceInput()
    stopSpeaking()
    setIsOpen(false)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage(input)
  }

  return (
    <>
      <button
        type='button'
        className={`global-ai-button${isOpen ? ' is-open' : ''}`}
        onClick={openAssistant}
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
              <div key={message.id} className={`global-ai-message-group ${message.role}`}>
                <p className={`global-ai-message ${message.role}`}>{message.text}</p>
                {message.role === 'assistant' && message.text && (
                  <button
                    type='button'
                    className={`global-ai-read-message${speakingMessageId === message.id ? ' is-speaking' : ''}`}
                    onClick={() => (speakingMessageId === message.id ? stopSpeaking() : speakReply(message.text, message.id))}
                    aria-label={speakingMessageId === message.id ? 'Dừng đọc câu trả lời' : 'Đọc câu trả lời bằng tiếng Việt'}
                  >
                    {speakingMessageId === message.id ? <FaStop /> : <FaVolumeUp />}
                    {speakingMessageId === message.id ? 'Dừng' : 'Nghe'}
                  </button>
                )}
                {message.role === 'assistant' && <AiMovieCards movies={message.movies} onNavigate={closeChat} />}
              </div>
            ))}
            {isTyping && <p className='global-ai-message assistant typing'>AI đang trả lời...</p>}
            {voiceStatus && <p className='global-ai-voice-status'>{voiceStatus}</p>}
            <div ref={messagesEndRef} />
          </div>

          <form className='global-ai-chat-form' onSubmit={handleSubmit}>
            <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={300} placeholder='Hỏi phim hay, lịch chiếu...' />
            <button type='submit' aria-label='Gửi câu hỏi' disabled={!input.trim() || isTyping}><FaPaperPlane /></button>
          </form>
        </section>
      )}
    </>
  )
}
