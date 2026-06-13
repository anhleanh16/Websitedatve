import { createSlice } from '@reduxjs/toolkit'

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'ticket',
    title: 'Vé xem phim đã xác nhận',
    desc: 'Vé Doraemon: Vũ Trụ Tí Hon ngày 10/06 lúc 14:00 đã được xác nhận.',
    time: '2 giờ trước',
    read: false,
  },
  {
    id: 2,
    type: 'promo',
    title: 'Ưu đãi thành viên Gold',
    desc: 'Bạn đủ điều kiện nhận voucher sinh nhật trị giá 100.000đ. Hạn sử dụng đến 30/06.',
    time: '5 giờ trước',
    read: false,
  },
  {
    id: 3,
    type: 'movie',
    title: 'Phim mới ra mắt',
    desc: 'Avengers: Secret Wars chính thức mở bán vé từ hôm nay. Đặt ngay trước khi hết chỗ!',
    time: '1 ngày trước',
    read: false,
  },
  {
    id: 4,
    type: 'points',
    title: 'Điểm tích lũy cập nhật',
    desc: 'Bạn vừa nhận +50 điểm từ giao dịch ngày 01/06. Tổng điểm hiện tại: 720 điểm.',
    time: '3 ngày trước',
    read: true,
  },
  {
    id: 5,
    type: 'system',
    title: 'Cập nhật ứng dụng',
    desc: 'Lunexa Movix vừa ra mắt tính năng mới: Đặt ghế theo sơ đồ rạp chi tiết hơn.',
    time: '5 ngày trước',
    read: true,
  },
  {
    id: 6,
    type: 'promo',
    title: 'Khuyến mãi thứ 3 hàng tuần',
    desc: 'Mua 2 vé tặng 1 mỗi thứ 3. Áp dụng cho tất cả phim 2D đang chiếu.',
    time: '6 ngày trước',
    read: true,
  },
]

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: MOCK_NOTIFICATIONS,
  },
  reducers: {
    markAsRead(state, action) {
      const item = state.items.find(n => n.id === action.payload)
      if (item) item.read = true
    },
    markAllAsRead(state) {
      state.items.forEach(n => { n.read = true })
    },
    deleteNotification(state, action) {
      state.items = state.items.filter(n => n.id !== action.payload)
    },
    clearAll(state) {
      state.items = []
    },
    addNotification(state, action) {
      state.items.unshift({ ...action.payload, id: Date.now(), read: false })
    },
  },
})

export const { markAsRead, markAllAsRead, deleteNotification, clearAll, addNotification } = notificationSlice.actions
export default notificationSlice.reducer
