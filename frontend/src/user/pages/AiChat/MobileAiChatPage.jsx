import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaArrowLeft,
  FaCommentAlt,
  FaMicrophone,
  FaPaperPlane,
  FaRobot,
  FaStop,
  FaVolumeUp,
} from 'react-icons/fa'
import AiMovieCards from '../../../components/ai/AiMovieCards'
import useAiAssistant from '../../../components/ai/useAiAssistant'
import './MobileAiChatPage.css'

export default function MobileAiChatPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('chat')
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

  const lastUserMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'user'),
    [messages],
  )
  const lastAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant' && message.id !== 'welcome'),
    [messages],
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    if (!mediaQuery.matches) navigate('/', { replace: true })
    const handleResize = (event) => {
      if (!event.matches) navigate('/', { replace: true })
    }
    mediaQuery.addEventListener?.('change', handleResize)
    return () => mediaQuery.removeEventListener?.('change', handleResize)
  }, [navigate])

  useEffect(() => {
    if (mode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [isTyping, messages, mode])

  const goBack = () => {
    stopVoiceInput()
    stopSpeaking()
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage(input)
  }

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (input.trim() && !isTyping) sendMessage(input)
    }
  }

  const openVoiceMode = () => {
    setMode('voice')
    toggleVoiceChat()
  }

  const closeVoiceMode = () => {
    stopVoiceInput()
    stopSpeaking()
    setMode('chat')
  }

  if (mode === 'voice') {
    const isSpeaking = Boolean(speakingMessageId)
    const voiceHeadline = isListening
      ? 'Mình đang nghe...'
      : isTyping
        ? 'Mình đang suy nghĩ...'
        : isSpeaking
          ? 'Sweetstar AI đang trả lời'
          : 'Chạm để nói'

    return (
      <section className='mobile-ai-page mobile-ai-voice-mode'>
        <header className='mobile-ai-voice-header'>
          <button type='button' onClick={closeVoiceMode} aria-label='Quay lại chat chữ'><FaArrowLeft /></button>
          <div>
            <strong>Trò chuyện bằng giọng nói</strong>
            <small>Tiếng Việt</small>
          </div>
          <span aria-hidden='true' />
        </header>

        <main className='mobile-ai-voice-content'>
          <div className={`mobile-ai-voice-orb${isListening ? ' is-listening' : ''}${isSpeaking ? ' is-speaking' : ''}${isTyping ? ' is-thinking' : ''}`}>
            <span /><span /><span />
            <FaRobot />
          </div>
          <h1>{voiceHeadline}</h1>
          <p className='mobile-ai-voice-status'>{voiceStatus || 'Hỏi về phim, lịch chiếu hoặc đặt vé'}</p>

          {lastUserMessage && (
            <div className='mobile-ai-voice-transcript'>
              <small>Bạn vừa nói</small>
              <p>{lastUserMessage.text}</p>
            </div>
          )}
          {!isTyping && lastAssistantMessage && (
            <div className='mobile-ai-voice-answer'>
              <small>Sweetstar AI</small>
              <p>{lastAssistantMessage.text}</p>
            </div>
          )}
        </main>

        <footer className='mobile-ai-voice-controls'>
          <button type='button' className='mobile-ai-voice-side-button' onClick={closeVoiceMode}>
            <FaCommentAlt />
            <span>Chat chữ</span>
          </button>
          <button
            type='button'
            className={`mobile-ai-voice-main-button${isListening ? ' is-listening' : ''}`}
            onClick={toggleVoiceChat}
            disabled={isTyping}
            aria-label={isListening ? 'Dừng nghe' : 'Bắt đầu nói'}
          >
            {isListening ? <FaStop /> : <FaMicrophone />}
          </button>
          <button
            type='button'
            className='mobile-ai-voice-side-button'
            onClick={isSpeaking ? stopSpeaking : () => lastAssistantMessage && speakReply(lastAssistantMessage.text, lastAssistantMessage.id)}
            disabled={!lastAssistantMessage}
          >
            {isSpeaking ? <FaStop /> : <FaVolumeUp />}
            <span>{isSpeaking ? 'Dừng đọc' : 'Nghe lại'}</span>
          </button>
        </footer>
      </section>
    )
  }

  return (
    <section className='mobile-ai-page mobile-ai-chat-mode'>
      <header className='mobile-ai-chat-header'>
        <button type='button' onClick={goBack} aria-label='Quay lại'><FaArrowLeft /></button>
        <div className='mobile-ai-chat-title'>
          <span><FaRobot /></span>
          <div>
            <strong>Sweetstar AI</strong>
            <small>Lịch sử được lưu trong 24 giờ</small>
          </div>
        </div>
        <button type='button' onClick={openVoiceMode} aria-label='Mở trò chuyện bằng giọng nói'><FaMicrophone /></button>
      </header>

      <main className='mobile-ai-chat-messages'>
        {messages.map((message) => (
          <article key={message.id} className={`mobile-ai-message-row ${message.role}`}>
            {message.role === 'assistant' && <span className='mobile-ai-message-avatar'><FaRobot /></span>}
            <div className='mobile-ai-message-content'>
              <p>{message.text}</p>
              {message.role === 'assistant' && message.text && (
                <button
                  type='button'
                  className={`mobile-ai-read-button${speakingMessageId === message.id ? ' is-speaking' : ''}`}
                  onClick={() => (speakingMessageId === message.id ? stopSpeaking() : speakReply(message.text, message.id))}
                >
                  {speakingMessageId === message.id ? <FaStop /> : <FaVolumeUp />}
                  {speakingMessageId === message.id ? 'Dừng' : 'Nghe'}
                </button>
              )}
              {message.role === 'assistant' && <AiMovieCards movies={message.movies} />}
            </div>
          </article>
        ))}

        {isTyping && (
          <article className='mobile-ai-message-row assistant'>
            <span className='mobile-ai-message-avatar'><FaRobot /></span>
            <div className='mobile-ai-typing' aria-label='AI đang trả lời'><i /><i /><i /></div>
          </article>
        )}
        {voiceStatus && <p className='mobile-ai-inline-status'>{voiceStatus}</p>}
        <div ref={messagesEndRef} />
      </main>

      <form className='mobile-ai-composer' onSubmit={handleSubmit}>
        <div className='mobile-ai-composer-box'>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            rows='1'
            maxLength={300}
            placeholder='Nhắn tin cho Sweetstar AI'
            aria-label='Tin nhắn cho Sweetstar AI'
          />
          {input.trim() ? (
            <button type='submit' className='mobile-ai-send-button' disabled={isTyping} aria-label='Gửi tin nhắn'><FaPaperPlane /></button>
          ) : (
            <button type='button' className='mobile-ai-mic-button' onClick={openVoiceMode} aria-label='Trò chuyện bằng giọng nói'><FaMicrophone /></button>
          )}
        </div>
        <small>Sweetstar AI có thể trả lời chưa chính xác. Hãy kiểm tra thông tin đặt vé quan trọng.</small>
      </form>
    </section>
  )
}
