import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Booking.css';

const defaultLayout = [
  { row: 'A', sections: [['A1', 'A2', 'A3', 'A4']] },
  { row: 'B', sections: [['B1', 'B2', 'B3'], ['B4', 'B5', 'B6', 'B7'], ['B8', 'B9', 'B10']] },
  { row: 'C', sections: [['C1', 'C2', 'C3'], ['C4', 'C5', 'C6', 'C7'], ['C8', 'C9', 'C10']] },
  { row: 'D', sections: [['D1', 'D2', 'D3'], ['D4', 'D5', 'D6', 'D7'], ['D8', 'D9', 'D10']] },
  { row: 'E', sections: [['E1', 'E2', 'E3'], ['E4', 'E5', 'E6', 'E7'], ['E8', 'E9', 'E10']] },
  { row: 'F', sections: [['F1', 'F2', 'F3'], ['F4', 'F5', 'F6', 'F7'], ['F8', 'F9', 'F10']] },
  { row: 'G', isCouple: true, sections: [['G1', 'G2', 'G3'], ['G4', 'G5', 'G6', 'G7'], ['G8', 'G9', 'G10']] },
  { row: 'H', isCouple: true, sections: [['H1', 'H2', 'H3'], ['H4', 'H5', 'H6', 'H7'], ['H8', 'H9', 'H10']] },
];

const vipSeats = new Set(['E4', 'E5', 'E6', 'E7', 'F4', 'F5', 'F6', 'F7']);

const getSeatType = (seat, isRowCouple) => {
  if (isRowCouple) return 'couple';
  if (vipSeats.has(seat)) return 'vip';
  return 'regular';
};

const comboItems = [
  { key: 'couple', label: 'Combo Couple', description: '1 bắp + 2 nước', price: 150000, icon: '💑' },
  { key: 'friends', label: 'Combo Friends', description: '2 bắp + 2 nước', price: 180000, icon: '👯' },
  { key: 'family', label: 'Combo Family', description: '3 bắp + 4 nước', price: 260000, icon: '👪' },
];

const snackItems = [
  { key: 'corn', label: 'Bắp', price: 50000, icon: '🍿' },
  { key: 'drink', label: 'Nước', price: 30000, icon: '🥤' },
];

export default function Booking() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cinema = 'Lunexa Movix Đà Nẵng', day = 'Hôm nay', time = '10:00 - 2D' } = location.state ?? {};
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [comboCounts, setComboCounts] = useState({ couple: 1, friends: 0, family: 0 });
  const [snackCounts, setSnackCounts] = useState({ corn: 0, drink: 0 });
  const [openDropdown, setOpenDropdown] = useState('snacks'); // ensure snacks open by default

  const toggleSeat = (seat) => {
    setSelectedSeats((prev) =>
      prev.includes(seat) ? prev.filter((item) => item !== seat) : [...prev, seat]
    );
  };

  const updateCombo = (key, delta) => {
    setComboCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  const updateSnack = (key, delta) => {
    setSnackCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  const toggleDropdown = (key) => {
    // Prevent closing both dropdowns: clicking an open header does nothing.
    setOpenDropdown((prev) => (prev === key ? prev : key));
  };

  const seatPrice = 80000;
  const seatTotal = selectedSeats.length * seatPrice;
  const comboTotal = comboItems.reduce(
    (sum, item) => sum + item.price * comboCounts[item.key],
    0
  );
  const snackTotal = snackItems.reduce(
    (sum, item) => sum + item.price * (snackCounts[item.key] || 0),
    0
  );
  const total = seatTotal + comboTotal;
  const totalWithSnacks = seatTotal + comboTotal + snackTotal;

  return (
    <div className="booking-page">
      <div className="booking-breadcrumb-bar">
        <nav className="booking-breadcrumb">
          <button className="booking-breadcrumb-item booking-back" type="button" onClick={() => navigate(-1)}>Quay lại</button>
          <button className="booking-breadcrumb-link" type="button" onClick={() => navigate('/')}>Trang chủ</button>
          <span className="booking-breadcrumb-sep">›</span>
          <button className="booking-breadcrumb-link" type="button" onClick={() => navigate('/movies')}>Phim</button>
          <span className="booking-breadcrumb-sep">›</span>
          <span className="booking-breadcrumb-current">Đặt vé</span>
        </nav>
      </div>

      <div className="booking-header">
        <div>
          <p className="booking-subtitle">Chọn ghế và combo</p>
          <h1>Đặt vé - {cinema}</h1>
          <p className="booking-meta">{day} • {time}</p>
        </div>
        <button type="button" className="btn-book" onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
      </div>

      <div className="booking-layout">
        <section className="booking-seat-panel">
          <div className="screen-label">MÀN HÌNH</div>
          <div className="seat-map">
            {defaultLayout.map((row) => (
              <div className="seat-row" key={row.row}>
                <span className="seat-row-label">{row.row}</span>
                <div className="seat-row-sections">
                  {row.sections.map((section, sectionIndex) => (
                    <div className="seat-section" key={sectionIndex}>
                      {section.map((seat) => {
                        const seatType = getSeatType(seat, row.isCouple);
                        return (
                          <button
                            key={seat}
                            type="button"
                            className={`booking-seat booking-seat-${seatType} ${selectedSeats.includes(seat) ? 'selected' : ''}`}
                            onClick={() => toggleSeat(seat)}
                          >
                            {seat.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="legend">
            <div className="legend-item">
              <span className="legend-marker" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.1)' }} />
              Ghế trống
            </div>
            <div className="legend-item">
              <span className="legend-marker" style={{ background: 'linear-gradient(135deg, #9e71ff, #7d4ff6)' }} />
              Ghế đang chọn
            </div>
            <div className="legend-item">
              <span className="legend-marker" style={{ background: 'linear-gradient(135deg, #ff8a8a, #ff4a4a)' }} />
              Ghế đôi
            </div>
            <div className="legend-item">
              <span className="legend-marker" style={{ background: 'linear-gradient(135deg, #ffc260, #ff7d2c)' }} />
              Ghế VIP
            </div>
          </div>
        </section>

        <aside className="booking-sidebar">
          <div className="section-title">
            <div>
              <div className="sidebar-title">Chọn combo</div>
              <div className="sidebar-subtitle">Thêm combo để tiết kiệm hơn</div>
            </div>
          </div>
          <div className={`dropdown ${openDropdown === 'snacks' ? 'open' : ''}`}>
            <div className="dropdown-header" onClick={() => toggleDropdown('snacks')}>
              <div>
                <div className="sidebar-title">Chọn bắp & nước</div>
                <div className="sidebar-subtitle">Chọn bắp hoặc nước riêng lẻ</div>
              </div>
              <div className="dropdown-caret">{openDropdown === 'snacks' ? '▲' : '▼'}</div>
            </div>
            {openDropdown === 'snacks' && (
              <div className="dropdown-body">
                {snackItems.map((item) => (
                  <div className="combo-card" key={item.key}>
                    <div className="combo-info">
                      <span className="item-icon" aria-hidden>{item.icon}</span>
                      <div>
                        <h4>{item.label}</h4>
                        <p>{item.price.toLocaleString('vi-VN')}đ</p>
                      </div>
                    </div>
                    <div className="combo-control">
                      <button type="button" className="combo-button" onClick={() => updateSnack(item.key, -1)}>-</button>
                      <span className="combo-count">{snackCounts[item.key]}</span>
                      <button type="button" className="combo-button" onClick={() => updateSnack(item.key, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`dropdown ${openDropdown === 'combo' ? 'open' : ''}`}>
            <div className="dropdown-header" onClick={() => toggleDropdown('combo')}>
              <div>
                <div className="sidebar-title">Chọn combo</div>
                <div className="sidebar-subtitle">Thêm combo để tiết kiệm hơn</div>
              </div>
              <div className="dropdown-caret">{openDropdown === 'combo' ? '▲' : '▼'}</div>
            </div>
            {openDropdown === 'combo' && (
              <div className="dropdown-body">
                {comboItems.map((item) => (
                  <div className="combo-card" key={item.key}>
                    <div className="combo-info">
                      <span className="item-icon" aria-hidden>{item.icon}</span>
                      <div>
                        <h4>{item.label}</h4>
                        <p>{item.description}</p>
                      </div>
                    </div>
                    <div className="combo-control">
                      <button type="button" className="combo-button" onClick={() => updateCombo(item.key, -1)}>-</button>
                      <span className="combo-count">{comboCounts[item.key]}</span>
                      <button type="button" className="combo-button" onClick={() => updateCombo(item.key, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="summary-card">
            <div className="summary-row">
              <span>Tạm tính ({selectedSeats.length} ghế)</span>
              <strong>{seatTotal.toLocaleString('vi-VN')}đ</strong>
            </div>
            <div className="summary-row">
              <span>Bắp & Nước</span>
              <strong>{snackTotal.toLocaleString('vi-VN')}đ</strong>
            </div>
            <div className="summary-row">
              <span>Combo</span>
              <strong>{comboTotal.toLocaleString('vi-VN')}đ</strong>
            </div>
            <div className="summary-total">
              <span>Tổng tiền</span>
              <strong>{totalWithSnacks.toLocaleString('vi-VN')}đ</strong>
            </div>
            <button
              type="button"
              className="checkout-button"
              disabled={selectedSeats.length === 0}
              onClick={() => navigate('/payment', { state: { cinema, day, time, selectedSeats, comboCounts, total } })}
            >
              Tiếp tục thanh toán →
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
