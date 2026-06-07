import { Link } from 'react-router-dom'
import { FaFacebook, FaYoutube, FaInstagram, FaTiktok, FaPhone, FaEnvelope, FaClock } from 'react-icons/fa'
import { BsChatDotsFill } from 'react-icons/bs'
import './footer.css'

const SOCIAL = [
  { icon: <FaFacebook />,    label: 'Facebook',  href: 'https://facebook.com',  color: '#1877f2' },
  { icon: <FaTiktok />,      label: 'TikTok',    href: 'https://tiktok.com',    color: '#f0f0f0' },
  { icon: <FaInstagram />,   label: 'Instagram', href: 'https://instagram.com', color: '#e1306c' },
  { icon: <BsChatDotsFill />,label: 'Zalo',      href: 'https://zalo.me',       color: '#0068ff' },
  { icon: <FaYoutube />,     label: 'YouTube',   href: 'https://youtube.com',   color: '#ff0000' },
]

export default function Footer() {
  return (
    <footer className='footer'>
      {/* ── Lunexa ── */}
      <div className='footer-col col-brand'>
        <Link to='/' className='footer-logo'>
          <img src='/logo.png' alt='Lunexa' />
        </Link>
        <p className='footer-brand-desc'>
          Trải nghiệm điện ảnh đỉnh cao — đặt vé nhanh, chọn ghế dễ dàng, nhận ưu đãi hấp dẫn.
        </p>
        <div className='footer-links-list'>
          <Link to='/'>Giới thiệu</Link>
          <Link to='/'>Hướng dẫn sử dụng</Link>
          <Link to='/'>Tiện ích online</Link>
          <Link to='/'>Thẻ quà tặng</Link>
          <Link to='/'>Tuyển dụng</Link>
        </div>
      </div>

      {/* ── Chính sách ── */}
      <div className='footer-col'>
        <h3>Chính sách</h3>
        <div className='footer-links-list'>
          <Link to='/'>Điều khoản sử dụng</Link>
          <Link to='/'>Điều khoản chung</Link>
          <Link to='/'>Điều khoản giao dịch</Link>
          <Link to='/'>Chính sách bảo mật</Link>
          <Link to='/'>Chính sách thanh toán</Link>
          <Link to='/'>Quy định tại rạp</Link>
        </div>
      </div>

      {/* ── Kết nối ── */}
      <div className='footer-col'>
        <h3>Kết nối với chúng tôi</h3>
        <div className='social-list'>
          {SOCIAL.map(s => (
            <a
              key={s.label}
              href={s.href}
              target='_blank'
              rel='noopener noreferrer'
              className='social-item'
            >
              <span className='social-icon' style={{ '--sc': s.color }}>{s.icon}</span>
              <span>{s.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* ── Chăm sóc KH ── */}
      <div className='footer-col'>
        <h3>Chăm sóc khách hàng</h3>
        <div className='footer-contact-list'>
          <div className='footer-contact-item'>
            <FaPhone className='contact-icon' />
            <div>
              <span className='contact-label'>Hotline</span>
              <a href='tel:0703858396' className='contact-value'>0703 858 396</a>
            </div>
          </div>
          <div className='footer-contact-item'>
            <FaClock className='contact-icon' />
            <div>
              <span className='contact-label'>Giờ làm việc</span>
              <span className='contact-value'>8:00 – 22:00 (tất cả các ngày)</span>
            </div>
          </div>
          <div className='footer-contact-item'>
            <FaEnvelope className='contact-icon' />
            <div>
              <span className='contact-label'>Email hỗ trợ</span>
              <a href='mailto:lunexamovix@gmail.com' className='contact-value'>lunexamovix@gmail.com</a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className='footer-bottom'>
        <span>© 2026 Lunexa Movix. All Rights Reserved.</span>
        <div className='footer-bottom-links'>
          <Link to='/'>Bảo mật</Link>
          <Link to='/'>Điều khoản</Link>
          <Link to='/'>Cookie</Link>
        </div>
      </div>
    </footer>
  )
}
