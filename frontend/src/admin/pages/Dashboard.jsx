// ─── Data ─────────────────────────────────────────────────────────────────────
const revenueData = [450, 620, 720, 850, 980, 1140, 1260];
const visitsData  = [980, 1120, 1350, 1430, 1600, 1780, 1920];
const chartLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const ticketData = [
  { name: "VIP",     value: 420, color: "#7c61ff" },
  { name: "Thường",  value: 610, color: "#5bcad4" },
  { name: "Cặp đôi", value: 280, color: "#f2917a" },
  { name: "Family",  value: 190, color: "#f3c74b" },
];

const monthlyTopTickets = [
  { label: "Thường",  sold: 610, max: 610 },
  { label: "VIP",     sold: 420, max: 610 },
  { label: "Cặp đôi", sold: 280, max: 610 },
];

const recentActivity = [
  { time: "08:32", text: "Người dùng Nguyễn Văn An đặt vé phim Đêm Thiên Cầu",     type: "booking" },
  { time: "08:15", text: "Tran Thi Binh đăng ký tài khoản mới",                    type: "user"    },
  { time: "07:58", text: "Đơn hàng ORD-0091 đã thanh toán thành công",             type: "payment" },
  { time: "07:44", text: "Admin thêm phim mới: Ánh Sao Cuối Trời",                 type: "movie"   },
  { time: "07:30", text: "Phim Vương Quốc Bóng Tối chuyển trạng thái kết thúc",   type: "movie"   },
  { time: "07:12", text: "Le Minh Chi yêu cầu hoàn vé B0095",                     type: "refund"  },
];

const ACTIVITY_ICON = { booking: "🎟", user: "👤", payment: "💳", movie: "🎬", refund: "↩" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateLinePoints(data, width, height, padding) {
  const max = Math.max(...data);
  return data
    .map((v, i) => {
      const x = padding + (i * (width - padding * 2)) / (data.length - 1);
      const y = height - padding - (v / max) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

function generatePieSegments(data, radius, cx = 110, cy = 110) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let angle = 0;
  return data.map((item) => {
    const slice = (item.value / total) * 360;
    const start = angle;
    const end   = angle + slice;
    const large = slice > 180 ? 1 : 0;
    const toRad = (deg) => ((deg - 90) * Math.PI) / 180;
    const sx = cx + radius * Math.cos(toRad(start));
    const sy = cy + radius * Math.sin(toRad(start));
    const ex = cx + radius * Math.cos(toRad(end));
    const ey = cy + radius * Math.sin(toRad(end));
    angle = end;
    return { ...item, path: `M ${cx} ${cy} L ${sx} ${sy} A ${radius} ${radius} 0 ${large} 1 ${ex} ${ey} Z`, percent: Math.round((item.value / total) * 100) };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const revenuePoints = generateLinePoints(revenueData, 520, 220, 24);
  const visitsPoints  = generateLinePoints(visitsData,  520, 220, 24);
  const pieSegments   = generatePieSegments(ticketData, 92);

  return (
    <div className="admin-dashboard">

      {/* ── Stat cards ── */}
      <div className="stats-grid">
        {[
          { title: "Người dùng",  sub: "Tài khoản hoạt động", value: "1.482", icon: "👤", color: "#7c61ff" },
          { title: "Phim",        sub: "Đang được liệt kê",   value: "86",    icon: "🎬", color: "#5bcad4" },
          { title: "Đặt vé",      sub: "Xác nhận hôm nay",    value: "219",   icon: "🎟", color: "#4ade80" },
          { title: "Doanh thu",   sub: "Dự đoán tháng",       value: "24.8M", icon: "💰", color: "#fbbf24" },
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
            <span className="chart-badge">Tăng 14%</span>
          </div>
          <div className="chart-graph">
            <svg viewBox="0 0 520 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%"   stopColor="rgba(124,97,255,0.85)" />
                  <stop offset="100%" stopColor="rgba(124,97,255,0.12)" />
                </linearGradient>
              </defs>
              <polyline className="chart-line-path" fill="none" stroke="url(#lineGradient)" strokeWidth="4" points={revenuePoints} />
              {revenueData.map((v, i) => {
                const x   = 24 + (i * 472) / (revenueData.length - 1);
                const max = Math.max(...revenueData);
                const y   = 220 - 24 - (v / max) * 172;
                return <circle key={i} cx={x} cy={y} r="6" fill="#7c61ff" stroke="#fff" strokeWidth="2" />;
              })}
              {chartLabels.map((lb, i) => (
                <text key={lb} x={24 + (i * 472) / (chartLabels.length - 1)} y="214" textAnchor="middle" className="chart-axis-label">{lb}</text>
              ))}
            </svg>
          </div>
        </section>

        {/* Bar chart – lượt truy cập */}
        <section className="activity-panel chart-card">
          <div className="chart-panel-header">
            <div>
              <h3>Lượt truy cập</h3>
              <p>Biểu đồ lượt truy cập và tương tác.</p>
            </div>
            <span className="chart-badge chart-badge-light">Ổn định</span>
          </div>
          <div className="chart-bar-grid">
            {visitsData.map((v, i) => {
              const max = Math.max(...visitsData);
              return (
                <div key={i} className="chart-bar-item">
                  <div className="chart-bar-fill" style={{ height: `${(v / max) * 160}px`, animationDelay: `${i * 70}ms` }} />
                  <span>{chartLabels[i]}</span>
                </div>
              );
            })}
          </div>
          <div className="chart-bar-values"><span>980</span><span>1920</span></div>
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
            <div><span>Tổng vé bán</span><strong>1.500</strong></div>
            <div><span>Doanh thu</span><strong>1.26 tỷ</strong></div>
            <div><span>Tăng trưởng</span><strong>+18%</strong></div>
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
          {recentActivity.map((a, i) => (
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
