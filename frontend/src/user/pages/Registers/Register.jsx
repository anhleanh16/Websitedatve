import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaUser, FaPhone, FaCalendar } from 'react-icons/fa'
import './register.css'
import { BIRTH_DATE_ERROR, getBirthDateBounds, isValidBirthDate } from '../../../utils/birthDate'

const parseResponseSafe = async (res) => {
  const raw = await res.text()
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return { message: raw }
  }
}

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    userName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: '',
    birthDate: ''
  })
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [loading, setLoading] = useState(false)
  const [registrationOtp, setRegistrationOtp] = useState(null)
  const [otpCode, setOtpCode] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [nowTs, setNowTs] = useState(Date.now())
  const [resendAvailableAt, setResendAvailableAt] = useState(0)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  useEffect(() => {
    if (!registrationOtp?.expiresAt && !resendAvailableAt) return undefined
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [registrationOtp?.expiresAt, resendAvailableAt])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setMessageType('')

    if (formData.password !== formData.confirmPassword) {
      setMessage('Mật khẩu không khớp!')
      setMessageType('error')
      setLoading(false)
      return
    }

    if (formData.birthDate && !isValidBirthDate(formData.birthDate)) {
      setMessage(BIRTH_DATE_ERROR)
      setMessageType('error')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName,
          user_name: formData.userName,
          email:     formData.email,
          password:  formData.password,
          phone:     formData.phone,
          birthday:  formData.birthDate || null,
          sex:       formData.gender === 'male' ? 'Nam'
                   : formData.gender === 'female' ? 'Nu'
                   : formData.gender === 'other' ? 'Khac' : null,
        }),
      })
      const data = await parseResponseSafe(res)
      if (!res.ok) throw new Error(data?.message || 'Đăng ký thất bại')

      setMessage(data?.message || 'Đăng ký thành công. Mã OTP đã được gửi đến email của bạn.')
      setMessageType('success')
      const ttlMinutes = Number(data?.tokenTtlMinutes || 5)
      setRegistrationOtp({ userId: data?.userId, expiresAt: Date.now() + Math.max(0, ttlMinutes * 60) * 1000 })
    } catch (err) {
      setMessage(err.message)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmOtp = async () => {
    if (!registrationOtp?.userId) return
    if (!/^\d{6}$/.test(otpCode)) {
      setMessage('Vui lòng nhập mã OTP gồm 6 chữ số.')
      setMessageType('error')
      return
    }

    setOtpLoading(true)
    setMessage('')
    setMessageType('')
    try {
      const res = await fetch('/api/auth/register/confirm-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: registrationOtp.userId, otpCode }),
      })
      const data = await parseResponseSafe(res)
      if (!res.ok) throw new Error(data?.message || 'Xác minh OTP thất bại.')

      setMessage(data?.message || 'Xác minh OTP thành công. Bạn có thể đăng nhập.')
      setMessageType('success')
      setTimeout(() => navigate('/Logins/Login?verified=1'), 1200)
    } catch (err) {
      setMessage(err.message)
      setMessageType('error')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!registrationOtp?.userId) return
    setOtpLoading(true)
    setMessage('')
    setMessageType('')
    try {
      const res = await fetch('/api/auth/register/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: registrationOtp.userId }),
      })
      const data = await parseResponseSafe(res)
      if (!res.ok) throw new Error(data?.message || 'Không thể gửi lại OTP.')
      const ttlMinutes = Number(data?.tokenTtlMinutes || 5)
      setRegistrationOtp((prev) => ({ ...prev, expiresAt: Date.now() + ttlMinutes * 60 * 1000 }))
      setOtpCode('')
      setResendAvailableAt(Date.now() + 30 * 1000)
      setMessage(data?.message || 'Mã OTP mới đã được gửi đến email của bạn.')
      setMessageType('success')
    } catch (err) {
      setMessage(err.message)
      setMessageType('error')
    } finally {
      setOtpLoading(false)
    }
  }

  const otpRemaining = registrationOtp?.expiresAt
    ? Math.max(0, Math.ceil((registrationOtp.expiresAt - nowTs) / 1000))
    : 0
  const resendRemaining = Math.max(0, Math.ceil((resendAvailableAt - nowTs) / 1000))

  if (registrationOtp) {
    return (
      <div className='auth-page'>
        <div className='orb orb-1'></div>
        <div className='orb orb-2'></div>
        <div className='orb orb-3'></div>
        <div className='auth-container register-container' style={{ zIndex: 1 }}>
          <div className='auth-card register-otp-card'>
            <div className='auth-header register-otp-header'>
              <h1>Xác minh đăng ký</h1>
              <p>Mã OTP 6 số đã được gửi đến email của bạn.</p>
            </div>

            {message && (
              <div className={`register-message ${messageType || 'error'}`}>
                {message}
              </div>
            )}

            <div className='register-otp-form'>
              <label htmlFor='registration-otp'>Nhập mã xác minh</label>
              <input
                id='registration-otp'
                type='text'
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder='Nhập OTP 6 số'
                inputMode='numeric'
                autoComplete='one-time-code'
                autoFocus
                disabled={otpRemaining === 0 || otpLoading}
              />
              <p className={`register-otp-expiry ${otpRemaining === 0 ? 'expired' : ''}`}>
                {otpRemaining > 0
                  ? `Mã còn hiệu lực ${String(Math.floor(otpRemaining / 60)).padStart(2, '0')}:${String(otpRemaining % 60).padStart(2, '0')}.`
                  : 'Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.'}
              </p>
              <button type='button' className='submit-btn' onClick={handleConfirmOtp} disabled={otpLoading || otpRemaining === 0}>
                {otpLoading ? 'Đang xác minh...' : 'Xác minh OTP'}
              </button>
              <p className='register-resend-note'>
                <span>* Chưa nhận được mã? </span>
                {resendRemaining > 0 ? (
                  <strong>Gửi lại sau {resendRemaining}s</strong>
                ) : (
                  <button type='button' className='register-resend-link' onClick={handleResendOtp} disabled={otpLoading}>
                    {otpLoading ? 'Đang gửi...' : 'Gửi lại'}
                  </button>
                )}
              </p>
            </div>

            <div className='auth-footer'>
              <p>Đã có tài khoản? <Link to='/Logins/Login'>Đăng nhập ngay</Link></p>
            </div>
          </div>
        </div>
      </div>
    )
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
          );
        })}
      </div>
      <div className='auth-container register-container' style={{ zIndex: 1 }}>
        <div className='auth-card'>
          <div className='auth-header'>
            <h1>Đăng ký tài khoản</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginTop: '8px' }}>
              Tạo ngay để bắt đầu trải nghiệm tuyệt vời nhé!</p>
          </div>

          <form onSubmit={handleSubmit} className='auth-form'>
            <div className='form-group'>
              <label>Họ và tên</label>
              <div className='input-wrapper'>
                <FaUser className='input-icon' />
                <input
                  type='text'
                  name='fullName'
                  placeholder='Nhập họ và tên'
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className='form-group'>
              <label>Tên người dùng</label>
              <div className='input-wrapper'>
                <FaUser className='input-icon' />
                <input
                  type='text'
                  name='userName'
                  placeholder='Ví dụ: nguyenvana'
                  value={formData.userName}
                  onChange={handleChange}
                  minLength='3'
                  maxLength='30'
                  pattern='[A-Za-z0-9._-]+'
                  autoComplete='username'
                  required
                />
              </div>
            </div>

            <div className='form-group'>
              <label>Email</label>
              <div className='input-wrapper'>
                <FaEnvelope className='input-icon' />
                <input
                  type='email'
                  name='email'
                  placeholder='Nhập email'
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className='form-group'>
              <label>Số điện thoại</label>
              <div className='input-wrapper'>
                <FaPhone className='input-icon' />
                <input
                  type='tel'
                  name='phone'
                  placeholder='Nhập số điện thoại'
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className='form-group'>
              <label>Mật khẩu</label>
              <div className='input-wrapper'>
                <FaLock className='input-icon' />
                <input
                  type={showPwd ? 'text' : 'password'}
                  name='password'
                  placeholder='Nhập mật khẩu'
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type='button'
                  className='toggle-pwd'
                  onClick={() => setShowPwd(!showPwd)}
                >
                  {showPwd ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className='form-group'>
              <label>Nhập lại mật khẩu</label>
              <div className='input-wrapper'>
                <FaLock className='input-icon' />
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  name='confirmPassword'
                  placeholder='Nhập lại mật khẩu'
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type='button'
                  className='toggle-pwd'
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                >
                  {showConfirmPwd ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className='form-row'>
              <div className='form-group'>
                <label>Giới tính</label>
                <select
                  name='gender'
                  value={formData.gender}
                  onChange={handleChange}
                  className='select-input'
                >
                  <option value=''>Chọn giới tính</option>
                  <option value='male'>Nam</option>
                  <option value='female'>Nữ</option>
                  <option value='other'>Khác</option>
                </select>
              </div>
              <div className='form-group'>
                <label>Ngày sinh</label>
                <div className='input-wrapper'>
                  <FaCalendar className='input-icon' />
                  <input
                    type='date'
                    name='birthDate'
                    value={formData.birthDate}
                    min={getBirthDateBounds().min}
                    max={getBirthDateBounds().max}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className='terms-checkbox'>
              <input type='checkbox' id='terms' required />
              <label htmlFor='terms'>Tôi đồng ý với <a href="#" style={{ color: '#a78bfa' }}>Điều khoản dịch vụ</a> và <a href="#" style={{ color: '#a78bfa' }}>Chính sách bảo mật</a></label>
            </div>

            {message && (
              <div className={`register-message ${messageType || 'error'}`}>
                {message}
              </div>
            )}

            <button type='submit' disabled={loading || Boolean(registrationOtp)} className='submit-btn'>
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </button>
          </form>

          {registrationOtp && (
            <div className='register-otp-panel'>
              <h3>Xác minh đăng ký bằng OTP</h3>
              <p>Nhập mã OTP 6 số đã gửi tới email của bạn. {otpRemaining > 0 ? `Mã còn hiệu lực ${String(Math.floor(otpRemaining / 60)).padStart(2, '0')}:${String(otpRemaining % 60).padStart(2, '0')}.` : 'Mã OTP đã hết hạn.'}</p>
              <div className='register-otp-actions'>
                <input
                  type='text'
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder='Nhập OTP 6 số'
                  inputMode='numeric'
                  autoComplete='one-time-code'
                  disabled={otpRemaining === 0 || otpLoading}
                />
                {otpRemaining > 0 ? (
                  <button type='button' className='submit-btn' onClick={handleConfirmOtp} disabled={otpLoading}>
                    {otpLoading ? 'Đang xác minh...' : 'Xác minh OTP'}
                  </button>
                ) : (
                  <button type='button' className='submit-btn' onClick={handleResendOtp} disabled={otpLoading}>
                    {otpLoading ? 'Đang gửi...' : 'Gửi lại OTP'}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className='auth-divider'>
            <span>hoặc</span>
          </div>

          <div className='auth-footer'>
            <p>Đã có tài khoản? <Link to='/Logins/Login'>Đăng nhập ngay</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
