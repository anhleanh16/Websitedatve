import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEnvelope } from 'react-icons/fa'
import './forgot-reset.css'

const formatCountdown = (totalSeconds) => {
  const safe = Math.max(0, Number(totalSeconds || 0))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const parseResponseSafe = async (res) => {
  const raw = await res.text()
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return { message: raw }
  }
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(null)

  useEffect(() => {
    if (countdown === null || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null
        const next = prev - 1
        return next > 0 ? next : 0
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await parseResponseSafe(res)
      if (!res.ok) {
        setMessage(data?.message || 'Không thể gửi email đặt lại mật khẩu.')
        setCountdown(null)
        return
      }

      setMessage(data?.message || 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu.')
      const ttlMinutes = Number(data?.tokenTtlMinutes || 5)
      setCountdown(Math.max(0, ttlMinutes * 60))
    } catch {
      setMessage('Không thể kết nối máy chủ, vui lòng thử lại.')
      setCountdown(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='auth-page'>
      <div className='orb orb-1'></div>
      <div className='orb orb-2'></div>
      <div className='orb orb-3'></div>
      <div className='orb orb-4'></div>
      <div className='orb orb-5'></div>
      <div className='particles'>
        {[...Array(30)].map((_, i) => {
          const x = Math.random() * 100
          const y = Math.random() * 100
          const duration = 3 + Math.random() * 5
          const delay = Math.random() * 4
          const size = 2 + Math.random() * 4
          const tx = (Math.random() - 0.5) * 400
          const ty = (Math.random() - 0.5) * 400
          return (
            <div
              key={i}
              className='particle'
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${size}px`,
                height: `${size}px`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                '--tx': `${tx}px`,
                '--ty': `${ty}px`,
              }}
            ></div>
          )
        })}
      </div>

      <div className='auth-container'>
        <div className='auth-card'>
          <div className='auth-header'>
            <h1>Quên mật khẩu</h1>
            <p className='auth-subtext'>Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.</p>
          </div>

          <form onSubmit={handleSubmit} className='auth-form'>
            <div className='form-group'>
              <label>Email</label>
              <div className='input-wrapper'>
                <FaEnvelope className='input-icon' />
                <input
                  type='email'
                  placeholder='example@email.com'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete='email'
                />
              </div>
            </div>

            {message && <div className='error-message'>{message}</div>}

            {countdown !== null && (
              <div className='countdown-message'>
                Thời gian hiệu lực token đặt lại mật khẩu còn: <strong>{formatCountdown(countdown)}</strong>
              </div>
            )}

            <button type='submit' disabled={loading} className='submit-btn'>
              {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại mật khẩu'}
            </button>
          </form>

          <div className='auth-footer'>
            <p>
              Nhớ mật khẩu rồi? <Link to='/Logins/Login'>Quay lại đăng nhập</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
