import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { markAsRead, markAllAsRead, deleteNotification, clearAll } from '../../../redux/slices/notificationSlice'
import { FaBell, FaTrash, FaCheckDouble, FaTicketAlt, FaGift, FaFilm, FaStar, FaCog, FaTimes } from 'react-icons/fa'
import './Notification.css'

const TYPE_CONFIG = {
  ticket:  { icon: <FaTicketAlt />, color: '#7c3aed', bg: 'rgba(124,58,237,0.12)',  label: 'Vé' },
  promo:   { icon: <FaGift />,      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Khuyến mãi' },
  movie:   { icon: <FaFilm />,      color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)',  label: 'Phim' },
  points:  { icon: <FaStar />,      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Điểm' },
  system:  { icon: <FaCog />,       color: '#64748b', bg: 'rgba(100,116,139,0.12)', label: 'Hệ thống' },
}

const FILTERS = [
  { key: 'all',    label: 'Tất cả' },
  { key: 'unread', label: 'Chưa đọc' },
  { key: 'ticket', label: 'Vé' },
  { key: 'promo',  label: 'Khuyến mãi' },
  { key: 'movie',  label: 'Phim' },
  { key: 'points', label: 'Điểm' },
  { key: 'system', label: 'Hệ thống' },
]

export default function Notifications() {
  const dispatch      = useDispatch()
  const notifications = useSelector(s => s.notifications.items)
  const unreadCount   = notifications.filter(n => !n.read).length

  const [filter, setFilter] = useState('all')

  const filtered = notifications.filter(n => {
    if (filter === 'all')    return true
    if (filter === 'unread') return !n.read
    return n.type === filter
  })

  return (
    <div className='notif-page'>
      {/* Header */}
      <div className='notif-page-header'>
        <div className='notif-page-title'>
          <FaBell />
          <h1>Thông báo</h1>
          {unreadCount > 0 && <span className='notif-unread-badge'>{unreadCount} chưa đọc</span>}
        </div>
        <div className='notif-page-actions'>
          {unreadCount > 0 && (
            <button className='notif-action-btn primary' onClick={() => dispatch(markAllAsRead())}>
              <FaCheckDouble /> Đánh dấu tất cả đã đọc
            </button>
          )}
          {notifications.length > 0 && (
            <button className='notif-action-btn danger' onClick={() => dispatch(clearAll())}>
              <FaTrash /> Xoá tất cả
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className='notif-filters'>
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`notif-filter-btn${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === 'unread' && unreadCount > 0 && (
              <span className='nf-badge'>{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className='notif-list'>
        {filtered.length === 0 ? (
          <div className='notif-empty'>
            <FaBell className='notif-empty-icon' />
            <p>Không có thông báo nào</p>
            {filter !== 'all' && (
              <button className='notif-action-btn primary' onClick={() => setFilter('all')}>
                Xem tất cả
              </button>
            )}
          </div>
        ) : (
          filtered.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system
            return (
              <div
                key={n.id}
                className={`notif-card${n.read ? '' : ' unread'}`}
                onClick={() => dispatch(markAsRead(n.id))}
              >
                {/* Icon */}
                <div className='notif-card-icon' style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.icon}
                </div>

                {/* Body */}
                <div className='notif-card-body'>
                  <div className='notif-card-top'>
                    <span className='notif-card-title'>{n.title}</span>
                    <span className='notif-card-type-tag' style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className='notif-card-desc'>{n.desc}</p>
                  <span className='notif-card-time'>{n.time}</span>
                </div>

                {/* Unread dot */}
                {!n.read && <span className='notif-card-dot' />}

                {/* Delete */}
                <button
                  className='notif-card-del'
                  onClick={e => { e.stopPropagation(); dispatch(deleteNotification(n.id)) }}
                  aria-label='Xoá thông báo'
                >
                  <FaTimes />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
