import { useState, useEffect } from "react";
import { adminDashboardService, adminStatisticsService } from "../../services/adminApi";
import "../../admin.css";

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(num);
}

function formatNumber(num) {
  const n = Number(num) || 0;
  return new Intl.NumberFormat("vi-VN").format(n);
}

function formatCompactCurrency(amount) {
  const value = Number(amount) || 0;
  const format = (number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(number);
  if (value >= 1_000_000_000) return `${format(value / 1_000_000_000)} tỷ`;
  if (value >= 1_000_000) return `${format(value / 1_000_000)} tr`;
  if (value >= 1_000) return `${format(value / 1_000)} nghìn`;
  return `${format(value)} ₫`;
}

function formatShortDate(dateKey) {
  const [, month = "", day = ""] = String(dateKey || "").split("-");
  return day && month ? `${day}/${month}` : "";
}

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentWeekStats(items = []) {
  const valuesByDate = new Map(
    items.map((item) => [
      String(item?.date || "").slice(0, 10),
      {
        revenue: Number(item?.revenue) || 0,
        bookings: Number(item?.bookings) || 0,
      },
    ]),
  );

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

  return WEEKDAY_LABELS.map((label, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const dateKey = toDateKey(date);
    const value = valuesByDate.get(dateKey) || { revenue: 0, bookings: 0 };

    return { date: dateKey, label, ...value };
  });
}

function generateLinePoints(data, width, height, padding) {
  if (!data || data.length === 0) {
    return "0,0";
  }
  const max = Math.max(...data, 1);
  return data
    .map((v, i) => {
      const x = padding + (i * (width - padding * 2)) / (data.length - 1 || 1);
      const y = height - padding - (v / max) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

function generatePieSegments(data, radius, cx = 110, cy = 110) {
  const validData = data.filter(item => (Number(item.tickets_sold) || 0) > 0);
  const total = validData.reduce((s, d) => s + (Number(d.tickets_sold) || 0), 0);
  if (total <= 0) return [];
  let angle = 0;
  const colors = ["#7c61ff", "#5bcad4", "#f2917a", "#f3c74b"];
  return validData.map((item, index) => {
    const slice = ((Number(item.tickets_sold) / total) * 360);
    const start = angle;
    const end = angle + slice;
    const large = slice > 180 ? 1 : 0;
    const toRad = (deg) => ((deg - 90) * Math.PI) / 180;
    const sx = cx + radius * Math.cos(toRad(start));
    const sy = cy + radius * Math.sin(toRad(start));
    const ex = cx + radius * Math.cos(toRad(end));
    const ey = cy + radius * Math.sin(toRad(end));
    angle = end;
    return {
      name: item.seat_type,
      value: Number(item.tickets_sold),
      color: colors[index % colors.length],
      path: `M ${cx} ${cy} L ${sx} ${sy} A ${radius} ${radius} 0 ${large} 1 ${ex} ${ey} Z`,
      percent: Math.round((Number(item.tickets_sold) / total) * 100),
    };
  });
}

export default function AdminDashboard() {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statisticsData, setStatisticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setWarning("");

      const [dashboardResult, statisticsResult] = await Promise.allSettled([
        adminDashboardService.getDashboardStats(),
        adminStatisticsService.getStatistics(),
      ]);

      let nextDashboard = null;
      let nextStatistics = null;
      let warningMessage = "";

      if (dashboardResult.status === "fulfilled") {
        nextDashboard = dashboardResult.value;
      } else {
        warningMessage = "Không thể tải dữ liệu tổng quan chính.";
      }

      if (statisticsResult.status === "fulfilled") {
        nextStatistics = statisticsResult.value;
      } else {
        warningMessage = warningMessage
          ? `${warningMessage} Biểu đồ thống kê đang tạm thời không khả dụng.`
          : "Biểu đồ thống kê đang tạm thời không khả dụng.";
      }

      if (!nextDashboard && !nextStatistics) {
        throw new Error("Không thể tải dữ liệu trang tổng quan.");
      }

      setDashboardStats(nextDashboard);
      setStatisticsData(nextStatistics);
      setWarning(warningMessage);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-statistics loading">
          <div className="loading-spinner">Đang tải trang tổng quan...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="admin-statistics error">
          <div className="error-message">
            <h3>Lỗi</h3>
            <p>{error}</p>
            <button onClick={loadData}>Thử lại</button>
          </div>
        </div>
      </div>
    );
  }

  const currentWeekStats = getCurrentWeekStats(statisticsData?.revenueByDay);
  const chartLabels = currentWeekStats.map((item) => item.label);
  const revenueData = currentWeekStats.map((item) => item.revenue);
  const visitsData = currentWeekStats.map((item) => item.bookings);
  const ticketData = statisticsData?.ticketSalesByType || [];
  const monthlyTopTickets = statisticsData?.ticketSalesByType?.map((item, i, arr) => {
    const max = Math.max(...arr.map((x) => Number(x.tickets_sold)), 1);
    return {
      label: item.seat_type,
      sold: Number(item.tickets_sold),
      max,
    };
  }) || [];
  const totalTicketsSold = ticketData.reduce((sum, item) => sum + Number(item.tickets_sold), 0);
  const weeklyRevenue = revenueData.reduce((sum, value) => sum + value, 0);
  const weeklyBookings = visitsData.reduce((sum, value) => sum + value, 0);
  const maxWeeklyRevenue = Math.max(...revenueData, 1);
  const revenueAxisValues = [1, 0.75, 0.5, 0.25, 0].map((ratio) => maxWeeklyRevenue * ratio);
  const maxBookingValue = Math.max(...visitsData, 0);
  const bookingAxisMax = maxBookingValue <= 2
    ? 2
    : maxBookingValue <= 4
      ? 4
      : maxBookingValue <= 6
        ? 6
        : Math.ceil(maxBookingValue / 4) * 4;
  const bookingAxisValues = [bookingAxisMax, bookingAxisMax / 2, 0];
  const todayKey = toDateKey(new Date());

  const revenuePoints = generateLinePoints(revenueData, 520, 220, 24);
  const pieSegments = generatePieSegments(ticketData, 92);

  const recentActivity = [
    { time: "08:32", text: "Người dùng đặt vé phim", type: "booking" },
    { time: "08:15", text: "Người dùng đăng ký tài khoản mới", type: "user" },
    { time: "07:58", text: "Đơn hàng đã thanh toán thành công", type: "payment" },
  ];

  const ACTIVITY_ICON = { booking: "🎟", user: "👤", payment: "💳", movie: "🎬", refund: "↩" };

  return (
    <div className="admin-dashboard">
      {warning && (
        <div className="admin-statistics" style={{ marginBottom: 16 }}>
          <div className="error-message">
            <h3>Cảnh báo</h3>
            <p>{warning}</p>
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="stats-grid">
        {[
          { title: "Người dùng", sub: "Tài khoản hoạt động", value: formatNumber(dashboardStats?.total_customers || 0), icon: "👤", color: "#7c61ff" },
          { title: "Phim", sub: "Đang được liệt kê", value: formatNumber(dashboardStats?.total_movies || 0), icon: "🎬", color: "#5bcad4" },
          { title: "Đặt vé", sub: "Đơn trong 30 ngày", value: formatNumber(dashboardStats?.total_bookings || 0), icon: "🎟", color: "#4ade80" },
          { title: "Doanh thu", sub: "30 ngày gần nhất", value: formatCurrency(dashboardStats?.total_revenue || 0), icon: "💰", color: "#fbbf24" },
        ].map((s) => (
          <div className="stat-card" key={s.title}>
            <div className="stat-card-top">
              <div>
                <h3>{s.title}</h3>
                <p>{s.sub}</p>
              </div>
              <span className="stat-icon">{s.icon}</span>
            </div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Biểu đồ tuần ── */}
      <div className="db-section-label">Thống kê tuần này</div>
      <div className="dashboard-overview">
        {/* Line chart – doanh thu */}
        <section className="overview-panel chart-card">
          <div className="chart-panel-header">
            <div>
              <h3>Doanh thu</h3>
              <p>Báo cáo doanh thu theo ngày trong tuần.</p>
            </div>
            <div className="chart-week-total">
              <span>Tổng tuần</span>
              <strong>{formatCurrency(weeklyRevenue)}</strong>
            </div>
          </div>
          <div className="revenue-chart-layout">
            <div className="revenue-chart-axis" aria-hidden="true">
              {revenueAxisValues.map((value, index) => <span key={index}>{formatCompactCurrency(value)}</span>)}
            </div>
            <div className="revenue-chart-main">
              <div className="revenue-chart-plot">
                <svg viewBox="0 0 520 220" preserveAspectRatio="none" aria-label="Biểu đồ doanh thu tuần này">
                  <defs>
                    <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(124,97,255,0.95)" />
                      <stop offset="100%" stopColor="rgba(124,97,255,0.35)" />
                    </linearGradient>
                  </defs>
                  {[24, 67, 110, 153, 196].map((y) => (
                    <line key={y} className="revenue-grid-line" x1="24" x2="496" y1={y} y2={y} />
                  ))}
                  <polyline className="chart-line-path" fill="none" stroke="url(#lineGradient)" strokeWidth="4" points={revenuePoints} />
                  {revenueData.map((value, index) => {
                    const x = 24 + (index * 472) / (revenueData.length - 1 || 1);
                    const y = 220 - 24 - (value / maxWeeklyRevenue) * 172;
                    return (
                      <circle key={chartLabels[index]} cx={x} cy={y} r="6" fill="#7c61ff" stroke="#fff" strokeWidth="2">
                        <title>{`${chartLabels[index]}: ${formatCurrency(value)}`}</title>
                      </circle>
                    );
                  })}
                </svg>
              </div>
              <div className="chart-labels">
                {chartLabels.map((label) => <span key={label}>{label}</span>)}
              </div>
            </div>
          </div>
        </section>

        {/* Bar chart – số đơn hàng */}
        <section className="activity-panel chart-card">
          <div className="chart-panel-header">
            <div>
              <h3>Số đơn hàng</h3>
              <p>Số đơn đã thanh toán theo từng ngày trong tuần.</p>
            </div>
            <div className="chart-week-total">
              <span>Tổng tuần</span>
              <strong>{formatNumber(weeklyBookings)} đơn</strong>
            </div>
          </div>
          <div className="booking-chart-layout">
            <div className="booking-chart-axis" aria-hidden="true">
              {bookingAxisValues.map((value) => <span key={value}>{value}</span>)}
            </div>
            <div className="booking-chart-main">
              <div
                className="booking-chart-plot"
                role="img"
                aria-label={`Số đơn hàng trong tuần: ${currentWeekStats.map((item) => `${item.label} ${item.bookings} đơn`).join(", ")}`}
              >
                {bookingAxisValues.map((value, index) => (
                  <div
                    key={value}
                    className="booking-chart-grid-line"
                    style={{ top: `${(index / (bookingAxisValues.length - 1 || 1)) * 100}%` }}
                  />
                ))}
                <div className="chart-bar-grid">
                  {visitsData.map((value, index) => (
                    <div
                      key={currentWeekStats[index].date}
                      className="chart-bar-item"
                      title={`${chartLabels[index]} ${formatShortDate(currentWeekStats[index].date)}: ${value} đơn`}
                    >
                      <span className="chart-bar-value">{value}</span>
                      <div
                        className={`chart-bar-fill${value === 0 ? " empty" : ""}`}
                        style={{ height: `${(value / bookingAxisMax) * 176}px` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="booking-chart-labels">
                {currentWeekStats.map((item) => (
                  <span key={item.date} className={item.date === todayKey ? "current" : ""}>
                    <strong>{item.label}</strong>
                    <small>{formatShortDate(item.date)}</small>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Bán vé tháng ── */}
      <div className="db-section-label">Bán vé tháng này</div>
      <section className="ticket-sales-card">
        <div className="ticket-sales-header">
          <div>
            <p className="section-label">Bán vé</p>
            <h3>Hiệu suất bán vé tháng</h3>
          </div>
          <div className="ticket-sales-summary">
            <div><span>Tổng vé bán</span><strong>{formatNumber(totalTicketsSold)}</strong></div>
            <div><span>Doanh thu</span><strong>{formatCurrency(dashboardStats?.total_revenue || 0)}</strong></div>
            <div><span>Tăng trưởng</span><strong>+0%</strong></div>
          </div>
        </div>

        <div className="ticket-sales-body">
          {/* Pie chart */}
          <div className="pie-chart-panel">
            <div className="chart-panel-title">
              <h4>Loại vé bán chạy</h4>
              <p>Phân bổ trong tháng qua.</p>
            </div>
            <div className="pie-chart-wrap">
              <svg viewBox="0 0 220 220" className="pie-chart-svg">
                {pieSegments.map((seg, idx) => (
                  <path key={seg.name} d={seg.path} fill={seg.color} className="pie-slice" style={{ animationDelay: `${idx * 0.08}s` }} />
                ))}
                <circle cx="110" cy="110" r="50" fill="rgba(8,12,25,0.96)" />
                <text x="110" y="104" textAnchor="middle" className="pie-center-subtitle">Vé</text>
                <text x="110" y="126" textAnchor="middle" className="pie-center-text">bán</text>
              </svg>
            </div>
            <div className="pie-chart-legend">
              {pieSegments.map((seg) => (
                <div key={seg.name} className="pie-legend-item">
                  <span className="pie-legend-color" style={{ background: seg.color }} />
                  <div><strong>{seg.name}</strong><p>{seg.percent}% tổng vé</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Top vé */}
          <section className="top-sales-panel">
            <div className="chart-panel-title">
              <h4>Top vé tháng</h4>
              <p>Các loại vé dẫn đầu doanh số.</p>
            </div>
            <ul className="top-sales-list">
              {monthlyTopTickets.map((item, i) => (
                <li key={item.label} className="top-sales-item">
                  <div className="top-sales-left">
                    <span className="top-sales-rank">#{i + 1}</span>
                    <div><strong>{item.label}</strong><p>{item.sold} vé bán</p></div>
                  </div>
                  <div className="top-sales-bar-wrap">
                    <div className="top-sales-bar" style={{ width: `${(item.sold / item.max) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      {/* ── Hoạt động gần đây ── */}
      <div className="db-section-label">Hoạt động gần đây</div>
      <section className="db-activity-card">
        <ul className="db-activity-list">
          {dashboardStats?.recent_bookings?.map((booking) => (
            <li key={booking.booking_id} className="db-activity-item">
              <span className="db-activity-icon">🎟</span>
              <span className="db-activity-text">
                {booking.full_name} đã đặt vé {booking.title || ""}
              </span>
              <span className="db-activity-time">
                {new Date(booking.created_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          )) || recentActivity.map((a, i) => (
            <li key={i} className="db-activity-item">
              <span className="db-activity-icon">{ACTIVITY_ICON[a.type]}</span>
              <span className="db-activity-text">{a.text}</span>
              <span className="db-activity-time">{a.time}</span>
            </li>
          ))}
        </ul>
      </section>

    </div>
  );
}
