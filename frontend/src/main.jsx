import { sanitizeLocalStorage } from './utils/sanitizeStorage.js'
try { sanitizeLocalStorage() } catch (_) {}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import store from './redux/store.js'
import ErrorBoundary from './ErrorBoundary.jsx'

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <Provider store={store}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </Provider>
      </ErrorBoundary>
    </StrictMode>
  )
} catch (e) {
  if (typeof window !== 'undefined') {
    try {
      sanitizeLocalStorage()
      localStorage.clear()
      sessionStorage.clear()
    } catch {}
    document.body.innerHTML = '<div style="display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0f172a;color:#e2e8f0;font-family:system-ui;padding:1.5rem"><div style="max-width:480px;text-align:center"><div style="font-size:56px">⚠️</div><h2 style="color:#fff">Có lỗi nghiêm trọng</h2><p style="color:#94a3b8;margin-bottom:1.5rem">Dữ liệu trình duyệt bị lỗi. Đã thực hiện dọn dẹp tự động.</p><button onclick="location.reload()" style="padding:0.85rem 1.75rem;font-size:15px;font-weight:700;border-radius:12px;border:0;cursor:pointer;background:linear-gradient(135deg,#7c3aed,#4338ca);color:#fff">Tải lại trang</button></div></div>'
  }
  throw e
}
