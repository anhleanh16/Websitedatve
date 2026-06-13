import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaUser, FaPhone, FaCalendar } from 'react-icons/fa'
import './register.css'

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
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
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (formData.password !== formData.confirmPassword) {
      setMessage('Mật khẩu không khớp!')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName,
          email:     formData.email,
          password:  formData.password,
          phone:     formData.phone,
          birthday:  formData.birthDate || null,
          sex:       formData.gender === 'male' ? 'Nam'
                   : formData.gender === 'female' ? 'Nu'
                   : formData.gender === 'other' ? 'Khac' : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Đăng ký thất bại')
      
      navigate('/Logins/Login')
    } catch (err) {
      setMessage(err.message)
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
              <div className='error-message'>
                {message}
              </div>
            )}

            <button type='submit' disabled={loading} className='submit-btn'>
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </button>
          </form>

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
