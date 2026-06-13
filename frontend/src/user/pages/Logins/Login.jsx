import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { setUser } from '../../../redux/slices/userSlice'
import { FaEye, FaEyeSlash, FaEnvelope, FaLock } from 'react-icons/fa'
import './login.css'

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

      if (!res.ok) {
        setMessage(data.message || 'Đăng nhập thất bại')
        return
      }

      // Lưu token và user vào localStorage
      localStorage.setItem('token', data.token)
      localStorage.setItem('user',  JSON.stringify(data.user))

      // Dispatch vào Redux
      dispatch(setUser({ token: data.token, user: data.user }))

      // Điều hướng về trang chủ sau khi đăng nhập
      navigate('/')
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
              Đăng nhập để tiếp tục đặt vé và nhận ưu đãi từ Lunexa Movix.
            </p>
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

            <div className='form-group'>
              <label>Mật khẩu</label>
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
