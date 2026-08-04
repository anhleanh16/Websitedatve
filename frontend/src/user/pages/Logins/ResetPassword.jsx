import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FaEye, FaEyeSlash, FaLock } from 'react-icons/fa'
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

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()

  const expTimestamp = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return Number(params.get('exp') || 0)
  }, [location.search])

  const [countdown, setCountdown] = useState(() => {
    if (!expTimestamp) return null
    return Math.max(0, Math.floor((expTimestamp - Date.now()) / 1000))
  })

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return String(params.get('token') || '').trim()
  }, [location.search])

  useEffect(() => {
    if (!expTimestamp) {
      setCountdown(null)
      return
    }

    setCountdown(Math.max(0, Math.floor((expTimestamp - Date.now()) / 1000)))

    const timer = setInterval(() => {
      setCountdown(Math.max(0, Math.floor((expTimestamp - Date.now()) / 1000)))
    }, 1000)

    return () => clearInterval(timer)
  }, [expTimestamp])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    if (countdown !== null && countdown <= 0) {
      setMessage('Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu gửi lại liên kết mới.')
      return
    }

    if (!token) {
      setMessage('Thiếu token đặt lại mật khẩu. Vui lòng mở lại liên kết từ email.')
      return
    }

    if (password.length < 6) {
      setMessage('Mật khẩu mới phải ít nhất 6 ký tự.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Mật khẩu xác nhận không khớp.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await parseResponseSafe(res)
      if (!res.ok) {
        setMessage(data?.message || 'Không thể đặt lại mật khẩu.')
        return
      }

      setMessage(data?.message || 'Đặt lại mật khẩu thành công.')
      setTimeout(() => navigate('/Logins/Login?reset=1'), 1200)
    } catch {
      setMessage('Không thể kết nối máy chủ, vui lòng thử lại.')
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
            <h1>Đặt lại mật khẩu</h1>
            <p className='auth-subtext'>Nhập mật khẩu mới để hoàn tất khôi phục tài khoản.</p>
          </div>

          <form onSubmit={handleSubmit} className='auth-form'>
            <div className='form-group'>
              <label>Mật khẩu mới</label>
              <div className='input-wrapper'>
                <FaLock className='input-icon' />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder='Nhập mật khẩu mới'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete='new-password'
                />
                <button
                  type='button'
                  className='toggle-pwd'
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPwd ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className='form-group'>
              <label>Xác nhận mật khẩu</label>
              <div className='input-wrapper'>
                <FaLock className='input-icon' />
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  placeholder='Nhập lại mật khẩu mới'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete='new-password'
                />
                <button
                  type='button'
                  className='toggle-pwd'
                  onClick={() => setShowConfirmPwd((v) => !v)}
                  aria-label={showConfirmPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirmPwd ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {message && <div className='error-message'>{message}</div>}

            {countdown !== null && (
              <div className='countdown-message'>
                Token sẽ hết hạn sau: <strong>{formatCountdown(countdown)}</strong>
              </div>
            )}

            <button type='submit' disabled={loading || (countdown !== null && countdown <= 0)} className='submit-btn'>
              {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </form>

          <div className='auth-footer'>
            <p>
              <Link to='/Logins/Login'>Quay lại đăng nhập</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
