import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaLock, FaShieldAlt } from 'react-icons/fa'
import { setUser } from '../../../redux/slices/userSlice'
import { userProfileService } from '../../services/userApi'
import { getValidStoredToken } from '../../../utils/auth'
import './initialPassword.css'

export default function InitialPassword() {
  const profile = useSelector((state) => state.user.profile)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const requiresPasswordChange = profile?.must_change_password === true

  useEffect(() => {
    if (!profile?.id) navigate('/Logins/Login', { replace: true })
    else if (!requiresPasswordChange) navigate('/', { replace: true })
  }, [navigate, profile?.id, requiresPasswordChange])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (password.length < 6) return setError('Mật khẩu mới phải có ít nhất 6 ký tự.')
    if (password !== confirmPassword) return setError('Mật khẩu xác nhận không khớp.')

    try {
      setLoading(true)
      await userProfileService.setInitialPassword(profile.id, { newPassword: password })
      const nextUser = { ...profile, must_change_password: false }
      const token = getValidStoredToken()
      dispatch(setUser({ token, user: nextUser }))
      localStorage.setItem('user', JSON.stringify(nextUser))
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Không thể tạo mật khẩu mới. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  if (!profile?.id || !requiresPasswordChange) return null

  return (
    <section className='initial-password-page'>
      <div className='initial-password-card'>
        <div className='initial-password-icon'><FaShieldAlt /></div>
        <h1>Tạo mật khẩu mới</h1>
        <p>Đây là lần đăng nhập đầu tiên bằng tài khoản do quản trị viên tạo. Hãy tạo mật khẩu riêng để tiếp tục sử dụng tài khoản.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor='initial-new-password'>Mật khẩu mới</label>
          <div className='initial-password-input'><FaLock /><input id='initial-new-password' type='password' value={password} onChange={(event) => setPassword(event.target.value)} autoComplete='new-password' placeholder='Ít nhất 6 ký tự' autoFocus required /></div>
          <label htmlFor='initial-confirm-password'>Xác nhận mật khẩu mới</label>
          <div className='initial-password-input'><FaLock /><input id='initial-confirm-password' type='password' value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete='new-password' placeholder='Nhập lại mật khẩu mới' required /></div>
          {error && <div className='initial-password-error' role='alert'>{error}</div>}
          <button type='submit' disabled={loading}>{loading ? 'Đang lưu...' : 'Tạo mật khẩu mới'}</button>
        </form>
      </div>
    </section>
  )
}
