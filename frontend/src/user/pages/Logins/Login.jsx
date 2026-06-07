import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { setUser } from '../../../redux/slices/userSlice'
import { FaEye, FaEyeSlash, FaEnvelope, FaLock } from 'react-icons/fa'
import './login.css'

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [message,  setMessage]  = useState('')
  const [loading,  setLoading]  = useState(false)

  const dispatch  = useDispatch()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Đăng nhập thất bại')

      localStorage.setItem('token', data.token)
      const payload = parseJwt(data.token)
      dispatch(setUser({
        role:   payload?.role   || null,
        userId: payload?.userId || null,
        email,
        name:   payload?.name   || email,
      }))
      navigate(payload?.role === 'admin' ? '/admin' : '/')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    // Redirect đến OAuth endpoint của backend
    window.location.href = '/api/auth/google'
  }

  return (
    <div className='login-page'>
      {/* Left panel */}
      <div className='login-left'>
        <div className='login-left-content'>
          <img src='/logo.png' alt='Lunexa' className='login-logo' />
          <h2>Chào mừng trở lại!</h2>
          <p>Đăng nhập để đặt vé, tích điểm và nhận ưu đãi độc quyền từ Lunexa Movix.</p>
          <div className='login-features'>
            <div className='login-feature-item'>🎟️ Đặt vé nhanh chóng</div>
            <div className='login-feature-item'>⭐ Tích điểm thành viên</div>
            <div className='login-feature-item'>🎁 Ưu đãi độc quyền</div>
          </div>
        </div>
        <div className='login-left-blobs'>
          <div className='l-blob blob-a' />
          <div className='l-blob blob-b' />
        </div>
      </div>

      {/* Right panel */}
      <div className='login-right'>
        <div className='login-card'>
          <div className='login-card-header'>
            <h1>Đăng nhập</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className='login-form'>
            <div className='form-field'>
              <label htmlFor='login-email'>Email</label>
              <div className='input-wrap'>
                <FaEnvelope className='input-icon' />
                <input
                  id='login-email'
                  type='email'
                  placeholder='example@email.com'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete='email'
                />
              </div>
            </div>

            <div className='form-field'>
              <div className='field-label-row'>
                <label htmlFor='login-password'>Mật khẩu</label>
              </div>
              <div className='input-wrap'>
                <FaLock className='input-icon' />
                <input
                  id='login-password'
                  type={showPwd ? 'text' : 'password'}
                  placeholder='Nhập mật khẩu'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete='current-password'
                />
                <button
                  type='button'
                  className='pwd-toggle'
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPwd ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <Link to='/forgot-password' className='forgot-link'>Quên mật khẩu?</Link>
            </div>

            {message && (
              <div className='login-error'>
                <span>⚠️</span> {message}
              </div>
            )}

            <button type='submit' disabled={loading} className='submit-btn'>
              {loading
                ? <><span className='btn-spinner' /> Đang đăng nhập...</>
                : 'Đăng nhập'}
            </button>
          </form>

          {/* Divider */}
          <div className='login-divider'>
            <span />
            <span className='divider-text'>hoặc</span>
            <span />
          </div>

          {/* Google button */}
          <button type='button' className='google-btn' onClick={handleGoogleLogin}>
            <svg className='google-icon' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
              <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' fill='#4285F4'/>
              <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' fill='#34A853'/>
              <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z' fill='#FBBC05'/>
              <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' fill='#EA4335'/>
            </svg>
            Đăng nhập bằng Google
          </button>

          <p className='login-register-hint'>
            Chưa có tài khoản? <Link to='/Registers/Register'>Đăng ký ngay</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
