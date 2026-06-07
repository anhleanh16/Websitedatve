import React, { Fragment, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Booking.css';

const defaultLayout = [
  { row: 'A', sections: [['A1', 'A2', 'A3', 'A4'], ['A5', 'A6', 'A7', 'A8'], ['A9', 'A10', 'A11', 'A12']] },
  { row: 'B', sections: [['B1', 'B2', 'B3', 'B4'], ['B5', 'B6', 'B7', 'B8'], ['B9', 'B10', 'B11', 'B12']] },
  { row: 'C', sections: [['C1', 'C2', 'C3', 'C4'], ['C5', 'C6', 'C7', 'C8'], ['C9', 'C10', 'C11', 'C12']] },
  { row: 'D', sections: [['D1', 'D2', 'D3', 'D4'], ['D5', 'D6', 'D7', 'D8'], ['D9', 'D10', 'D11', 'D12']] },
  { row: 'E', sections: [['E1', 'E2', 'E3', 'E4'], ['E5', 'E6', 'E7', 'E8'], ['E9', 'E10', 'E11', 'E12']] },
  { row: 'F', sections: [
    { seats: ['F1', 'F2', 'F3', 'F4'], weight: 4 },
    { seats: ['F5', 'F6', 'F7', 'F8'], weight: 4 },
    { seats: ['F9', 'F10', 'F11', 'F12'], weight: 4 },
  ] },
  { row: 'G', isCouple: true, sections: [
    { seats: [{ id: 'G1_G2', label: '1-2' }, { id: 'G3_G4', label: '3-4' }], weight: 6 },
    { seats: [{ id: 'G5_G6', label: '5-6' }, { id: 'G7_G8', label: '7-8' }], weight: 6 },
    { seats: [{ id: 'G9_G10', label: '9-10' }, { id: 'G11_G12', label: '11-12' }], weight: 6 },
  ] },
  { row: 'H', isCouple: true, sections: [
    { seats: [{ id: 'H1_H2', label: '1-2' }, { id: 'H3_H4', label: '3-4' }], weight: 6 },
    { seats: [{ id: 'H5_H6', label: '5-6' }, { id: 'H7_H8', label: '7-8' }], weight: 6 },
    { seats: [{ id: 'H9_H10', label: '9-10' }, { id: 'H11_H12', label: '11-12' }], weight: 6 },
  ] },
];

const vipSeats = new Set(['E5', 'E6', 'E7', 'E8', 'F5', 'F6', 'F7', 'F8']);
const soldSeats = new Set(['A3', 'B6', 'C8', 'E5', 'E6', 'G1_G2']);

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
  const [comboCounts, setComboCounts] = useState({ couple: 0, friends: 0, family: 0 });
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

  const seatPrices = {
    regular: 80000,
    vip: 100000,
    couple: 120000,
  };

  const getSelectedSeatType = (seatId) => {
    if (seatId.includes('_')) return 'couple';
    if (vipSeats.has(seatId)) return 'vip';
    return 'regular';
  };

  const seatTotal = selectedSeats.reduce((sum, seatId) => {
    const type = getSelectedSeatType(seatId);
    return sum + seatPrices[type];
  }, 0);
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
                  {row.sections.map((section, sectionIndex) => {
                    const sectionSeats = Array.isArray(section) ? section : section.seats;
                    const sectionWeight = section.weight ?? sectionSeats.length;
                    return (
                      <Fragment key={`section-group-${row.row}-${sectionIndex}`}>
                        <div
                          className="seat-section"
                          style={{ flex: `${sectionWeight} 1 0` }}
                        >
                          {sectionSeats.map((seat) => {
                            const seatId = typeof seat === 'string' ? seat : seat.id;
                            const isSold = soldSeats.has(seatId);
                            const seatType = getSeatType(seatId, row.isCouple);
                            return (
                              <button
                                key={seatId}
                                type="button"
                                className={`booking-seat booking-seat-${seatType} ${isSold ? 'booking-seat-sold' : ''} ${selectedSeats.includes(seatId) ? 'selected' : ''}`}
                                onClick={() => !isSold && toggleSeat(seatId)}
                                disabled={isSold}
                                aria-label={`${seatId} ${isSold ? 'đã bán' : 'còn trống'}`}
                              />
                            );
                          })}
                        </div>
                        {sectionIndex < row.sections.length - 1 && (
                          <div className="seat-aisle" key={`aisle-${row.row}-${sectionIndex}`} />
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="legend">
            <div className="legend-item">
              <span className="legend-marker" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.1)' }} />
              Ghế thường
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
            <div className="legend-item">
              <span className="legend-marker" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)' }} />
              Ghế đã bán
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
