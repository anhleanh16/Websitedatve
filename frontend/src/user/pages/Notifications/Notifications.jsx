import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { markAsRead, markAllAsRead, deleteNotification, clearAll, setNotifications } from '../../../redux/slices/notificationSlice'
import { FaBell, FaTrash, FaCheckDouble, FaTicketAlt, FaGift, FaFilm, FaStar, FaCog, FaTimes } from 'react-icons/fa'
import { useEffect } from 'react'
import { userNotificationService } from '../../services/userApi'
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
  const profile       = useSelector(s => s.user.profile)
  const notifications = useSelector(s => s.notifications.items)
  const unreadCount   = notifications.filter(n => !n.read).length

  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const userId = profile?.id

  const normalizeNotifications = (items = []) =>
    items.map((n) => ({
      id: n.notification_id,
      type: n.type || 'system',
      title: n.title,
      desc: n.content,
      time: new Date(n.created_at).toLocaleString('vi-VN'),
      read: Boolean(n.is_read),
    }))

  const loadNotifications = async () => {
    if (!userId) {
      dispatch(setNotifications([]))
      return
    }

    setLoading(true)
    setError('')
    try {
      const data = await userNotificationService.getAll(userId)
      dispatch(setNotifications(normalizeNotifications(data?.notifications || [])))
    } catch (err) {
      console.error(err)
      setError(err.message || 'Không thể tải thông báo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [userId])

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
            <button className='notif-action-btn primary' onClick={async () => {
              if (!userId) return
              await userNotificationService.markAllAsRead(userId)
              dispatch(markAllAsRead())
            }}>
              <FaCheckDouble /> Đánh dấu tất cả đã đọc
            </button>
          )}
          {notifications.length > 0 && (
            <button className='notif-action-btn danger' onClick={async () => {
              if (!userId) return
              await userNotificationService.clearAll(userId)
              dispatch(clearAll())
            }}>
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
        {loading ? (
          <div className='notif-empty'>
            <FaBell className='notif-empty-icon' />
            <p>Đang tải thông báo...</p>
          </div>
        ) : error ? (
          <div className='notif-empty'>
            <FaBell className='notif-empty-icon' />
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className='notif-empty'>
            <FaBell className='notif-empty-icon' />
            <p>{userId ? 'Không có thông báo nào' : 'Vui lòng đăng nhập để xem thông báo'}</p>
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
                onClick={async () => {
                  if (!n.read && userId) {
                    await userNotificationService.markAsRead(userId, n.id)
                    dispatch(markAsRead(n.id))
                  }
                }}
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
                  onClick={async e => {
                    e.stopPropagation()
                    if (!userId) return
                    await userNotificationService.deleteOne(userId, n.id)
                    dispatch(deleteNotification(n.id))
                  }}
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
