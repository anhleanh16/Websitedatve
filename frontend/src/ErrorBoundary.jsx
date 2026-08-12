import React from 'react'
import { sanitizeLocalStorage } from './utils/sanitizeStorage.js'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo })
    if (typeof window !== 'undefined' && window.console) {
      console.error('[ErrorBoundary] Bắt lỗi render:', error, errorInfo)
    }
    try {
      sanitizeLocalStorage()
    } catch {}
  }

  handleReset = () => {
    if (typeof window !== 'undefined') {
      try {
        sanitizeLocalStorage()
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        sessionStorage.clear()
      } catch {}
      window.location.href = window.location.origin + '/'
    }
  }

  handleHardReset = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {}
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            color: '#e2e8f0',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: 16,
              padding: '2.5rem 2rem',
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ color: '#fff', margin: '0 0 8px', fontSize: 22 }}>
              Có lỗi xảy ra khi tải trang
            </h2>
            <p style={{ color: '#94a3b8', margin: '0 0 16px', fontSize: 15, lineHeight: 1.6 }}>
              Dữ liệu trình duyệt có thể bị lỗi hoặc không tương thích. Vui lòng thử một trong các cách bên dưới:
            </p>

            <ul style={{
              textAlign: 'left',
              color: '#cbd5e1',
              fontSize: 13.5,
              lineHeight: 1.8,
              paddingLeft: '1.25rem',
              margin: '0 0 20px',
            }}>
              <li>Nhấn <b style={{ color: '#a78bfa' }}>Tải lại trang</b> để tự động dọn dẹp dữ liệu lỗi</li>
              <li>Nếu vẫn lỗi, nhấn <b style={{ color: '#fbbf24' }}>Xóa toàn bộ dữ liệu &amp; khởi động lại</b></li>
              <li>Hoặc mở trang ở chế độ <b style={{ color: '#60a5fa' }}>Ẩn danh (Incognito)</b></li>
            </ul>

            {this.state.error && (
              <details
                open
                style={{
                  marginTop: 0,
                  marginBottom: 20,
                  textAlign: 'left',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 12.5,
                  color: '#94a3b8',
                }}
              >
                <summary style={{ cursor: 'pointer', marginBottom: 6, color: '#cbd5e1', fontSize: 13 }}>
                  Chi tiết lỗi (gửi admin nếu vẫn không khắc phục được)
                </summary>
                <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {String(this.state.error?.message || this.state.error)}
                  {this.state.errorInfo?.componentStack && (
                    <div style={{ marginTop: 8, borderTop: '1px dashed rgba(148,163,184,0.3)', paddingTop: 8, color: '#64748b', fontSize: 11.5 }}>
                      Component stack:
                      <div>{this.state.errorInfo.componentStack}</div>
                    </div>
                  )}
                </div>
              </details>
            )}

            <button
              type="button"
              onClick={this.handleReset}
              style={{
                marginTop: 4,
                padding: '0.85rem 1.75rem',
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 12,
                border: 0,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #7c3aed, #4338ca)',
                color: '#fff',
                boxShadow: '0 8px 24px rgba(124, 58, 237, 0.45)',
              }}
            >
              Tải lại trang
            </button>
            <button
              type="button"
              onClick={this.handleHardReset}
              style={{
                marginTop: 10,
                marginLeft: 10,
                padding: '0.85rem 1.5rem',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 12,
                border: '1px solid rgba(251, 191, 36, 0.4)',
                cursor: 'pointer',
                background: 'rgba(251, 191, 36, 0.1)',
                color: '#fbbf24',
              }}
            >
              Xóa toàn bộ dữ liệu &amp; khởi động lại
            </button>
            <p style={{ color: '#64748b', fontSize: 12, marginTop: 20, marginBottom: 0 }}>
              Nếu lỗi vẫn xảy ra, vui lòng chụp màn hình chi tiết lỗi và gửi quản trị viên.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
