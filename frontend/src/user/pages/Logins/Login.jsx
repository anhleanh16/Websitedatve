import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { setUser } from '../../../redux/slices/userSlice'
import { FaEye, FaEyeSlash, FaEnvelope, FaLock } from 'react-icons/fa'
import './login.css'

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

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [message,  setMessage]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [verifyCountdown, setVerifyCountdown] = useState(null)

  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const location  = useLocation()
  const returnTo = location.state?.from || '/'
  const returnState = location.state?.paymentState ?? null

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const verified = params.get('verified')
    const reason = params.get('reason')
    const sent = params.get('verify_email_sent')
    const reset = params.get('reset')
    const ttl = Number(params.get('ttl') || 300)

    if (sent === '1') {
      setMessage('Đăng ký thành công. Vui lòng mở email và bấm liên kết xác minh trước khi đăng nhập.')
      setVerifyCountdown(Math.max(0, ttl))
      return
    }

    if (verified === '1') {
      setMessage('Xác minh email thành công. Bạn có thể đăng nhập ngay bây giờ.')
      setVerifyCountdown(null)
      return
    }

    if (verified === '0') {
      setVerifyCountdown(null)
      if (reason === 'invalid_or_expired') {
        setMessage('Liên kết xác minh không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại email xác minh.')
      } else if (reason === 'missing_token') {
        setMessage('Thiếu mã xác minh trong liên kết.')
      } else {
        setMessage('Không thể xác minh email vào lúc này. Vui lòng thử lại.')
      }
      return
    }

    if (reset === '1') {
      setMessage('Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.')
      setVerifyCountdown(null)
      return
    }

    setVerifyCountdown(null)
  }, [location.search])

  useEffect(() => {
    if (verifyCountdown === null || verifyCountdown <= 0) return

    const timer = setInterval(() => {
      setVerifyCountdown((prev) => {
        if (prev === null) return null
        const next = prev - 1
        return next > 0 ? next : 0
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [verifyCountdown])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const res  = await fetch('/api/auth/user-login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await parseResponseSafe(res)

      if (!res.ok) {
        setMessage(data?.message || 'Đăng nhập thất bại')
        return
      }

      if (!data?.token || !data?.user) {
        setMessage('Phản hồi đăng nhập không hợp lệ. Vui lòng thử lại.')
        return
      }

      // Frontend guard mirrors the server-side user-login role gate.
      if (['admin', 'staff', 'manager', 'technician'].includes(String(data.user?.role || '').toLowerCase())) {
        setMessage('Tài khoản nhân viên chỉ được đăng nhập tại trang quản trị.')
        return
      }

      const normalizedUser = {
        ...data.user,
        role: String(data.user?.role || '').toLowerCase(),
      }

      // Lưu token và user vào localStorage
      localStorage.setItem('token', data.token)
      localStorage.setItem('user',  JSON.stringify(normalizedUser))

      // Dispatch vào Redux
      dispatch(setUser({ token: data.token, user: normalizedUser }))

      if (normalizedUser.must_change_password === true) {
        navigate('/create-password', { replace: true })
        return
      }

      // Điều hướng theo ngữ cảnh trước đó nếu có
      navigate(returnTo, { replace: true, state: returnState })
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
          const x = Math.random() * 100;
          const y = Math.random() * 100;
          const duration = 3 + Math.random() * 5;
          const delay = Math.random() * 4;
          const size = 2 + Math.random() * 4;
          const tx = (Math.random() - 0.5) * 400;
          const ty = (Math.random() - 0.5) * 400;
          return (
            <div key={i} className='particle' style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${size}px`,
              height: `${size}px`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
            }}></div>
          )
        })}
      </div>
      <div className='auth-container'>
        <div className='auth-card'>
          <div className='auth-header'>
            <h1>Đăng nhập</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginTop: '8px' }}>
              Đăng nhập để tiếp tục đặt vé và nhận ưu đãi từ Sweetstar Movie.
            </p>
          </div>

          <form onSubmit={handleSubmit} className='auth-form'>
            <div className='form-group'>
              <label>Tên người dùng, email hoặc số điện thoại</label>
              <div className='input-wrapper'>
                <FaEnvelope className='input-icon' />
                <input
                  type='text'
                  placeholder='Tên người dùng, email hoặc số điện thoại'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete='username'
                />
              </div>
            </div>

            <div className='form-group'>
              <div className='label-row'>
                <label>Mật khẩu</label>
                <Link to='/forgot-password' className='forgot-link'>Quên mật khẩu?</Link>
              </div>
              <div className='input-wrapper'>
                <FaLock className='input-icon' />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder='Nhập mật khẩu'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete='current-password'
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

            {message && (
              <div className='error-message'>
                {message}
              </div>
            )}

            {verifyCountdown !== null && (
              <div className='countdown-message'>
                Thời gian hiệu lực token xác minh còn: <strong>{formatCountdown(verifyCountdown)}</strong>
              </div>
            )}

            <button type='submit' disabled={loading} className='submit-btn'>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className='auth-footer'>
            <p>Chưa có tài khoản? <Link to='/Registers/Register'>Đăng ký ngay</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
