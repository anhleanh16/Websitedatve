const revenueData = [450, 620, 720, 850, 980, 1140, 1260];
const visitsData = [980, 1120, 1350, 1430, 1600, 1780, 1920];
const chartLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const ticketData = [
  { name: "VIP", value: 420, color: "#7c61ff" },
  { name: "Thường", value: 610, color: "#5bcad4" },
  { name: "Cặp đôi", value: 280, color: "#f2917a" },
  { name: "Family", value: 190, color: "#f3c74b" },
];
const monthlyTopTickets = [
  { label: "VIP", sold: 420 },
  { label: "Thường", sold: 610 },
  { label: "Cặp đôi", sold: 280 },
];

function generateLinePoints(data, width, height, padding) {
  const maxValue = Math.max(...data);
  return data
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / (data.length - 1);
      const y = height - padding - (value / maxValue) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

function generatePieSegments(data, radius, cx = 110, cy = 110) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  return data.map((item) => {
    const sliceAngle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    const largeArcFlag = sliceAngle > 180 ? 1 : 0;

    const startX = cx + radius * Math.cos(((startAngle - 90) * Math.PI) / 180);
    const startY = cy + radius * Math.sin(((startAngle - 90) * Math.PI) / 180);
    const endX = cx + radius * Math.cos(((endAngle - 90) * Math.PI) / 180);
    const endY = cy + radius * Math.sin(((endAngle - 90) * Math.PI) / 180);

    const path = `M ${cx} ${cy} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    currentAngle = endAngle;

    return {
      ...item,
      path,
      percent: Math.round((item.value / total) * 100),
    };
  });
}

function Statistics() {
  const revenuePoints = generateLinePoints(revenueData, 520, 220, 24);
  const visitsPoints = generateLinePoints(visitsData, 520, 220, 24);
  const pieSegments = generatePieSegments(ticketData, 92);

  return (
    <div className="admin-statistics">
      <div className="statistics-headline">
        <div>
          <p className="section-label">Bảng điều khiển</p>
          <h2>Thống kê doanh thu & lượt truy cập</h2>
        </div>
        <div className="statistics-summary">
          <div className="summary-pill">
            <span>Doanh thu tuần</span>
            <strong>1260 triệu</strong>
          </div>
          <div className="summary-pill">
            <span>Khách truy cập</span>
            <strong>1920 người</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-overview statistics-grid">
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
                  <stop offset="0%" stopColor="rgba(124,97,255,0.85)" />
                  <stop offset="100%" stopColor="rgba(124,97,255,0.12)" />
                </linearGradient>
              </defs>
              <polyline
                className="chart-line-path"
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="4"
                points={revenuePoints}
              />
              {revenueData.map((value, index) => {
                const x = 24 + (index * 472) / (revenueData.length - 1);
                const maxValue = Math.max(...revenueData);
                const y = 220 - 24 - (value / maxValue) * 172;
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="6"
                    fill="#7c61ff"
                    stroke="#fff"
                    strokeWidth="2"
                    title={`Doanh thu: ${value} triệu`}
                  />
                );
              })}
              {chartLabels.map((label, index) => {
                const x = 24 + (index * 472) / (chartLabels.length - 1);
                return (
                  <text
                    key={label}
                    x={x}
                    y="214"
                    textAnchor="middle"
                    className="chart-axis-label"
                  >
                    {label}
                  </text>
                );
              })}
            </svg>
          </div>
        </section>

        <section className="activity-panel chart-card">
          <div className="chart-panel-header">
            <div>
              <h3>Lượt truy cập</h3>
              <p>Biểu đồ lượt truy cập và tương tác của người dùng.</p>
            </div>
            <span className="chart-badge chart-badge-light">Ổn định</span>
          </div>
          <div className="chart-bar-grid">
            {visitsData.map((value, index) => {
              const maxValue = Math.max(...visitsData);
              const height = (value / maxValue) * 160;
              return (
                <div
                  key={index}
                  className="chart-bar-item"
                  title={`Lượt truy cập: ${value}`}
                >
                  <div
                    className="chart-bar-fill"
                    style={{
                      height: `${height}px`,
                      animationDelay: `${index * 70}ms`,
                    }}
                  />
                  <span>{chartLabels[index]}</span>
                </div>
              );
            })}
          </div>
          <div className="chart-bar-values">
            <span>980</span>
            <span>1920</span>
          </div>
        </section>
      </div>

      <div className="sales-grid">
        <section className="ticket-sales-card">
          <div className="ticket-sales-header">
            <div>
              <p className="section-label">Bán vé</p>
              <h3>Hiệu suất bán vé tháng</h3>
            </div>
            <div className="ticket-sales-summary">
              <div>
                <span>Tổng vé bán</span>
                <strong>1.500</strong>
              </div>
              <div>
                <span>Doanh thu</span>
                <strong>1.26 tỷ</strong>
              </div>
              <div>
                <span>Tăng trưởng</span>
                <strong>+18%</strong>
              </div>
            </div>
          </div>

          <div className="ticket-sales-body">
            <div className="pie-chart-panel">
              <div className="chart-panel-title">
                <h4>Loại vé bán chạy</h4>
                <p>Nhiều nhất trong tháng qua.</p>
              </div>
              <div className="pie-chart-wrap">
                <svg viewBox="0 0 220 220" className="pie-chart-svg">
                  {pieSegments.map((segment, idx) => (
                    <path
                      key={segment.name}
                      d={segment.path}
                      fill={segment.color}
                      className="pie-slice"
                      style={{ animationDelay: `${idx * 0.08}s` }}
                    />
                  ))}
                  <circle
                    cx="110"
                    cy="110"
                    r="50"
                    fill="rgba(8, 12, 25, 0.96)"
                  />
                  <text
                    x="110"
                    y="104"
                    textAnchor="middle"
                    className="pie-center-subtitle"
                  >
                    Vé
                  </text>
                  <text
                    x="110"
                    y="126"
                    textAnchor="middle"
                    className="pie-center-text"
                  >
                    bán
                  </text>
                </svg>
              </div>
              <div className="pie-chart-legend">
                {pieSegments.map((segment) => (
                  <div key={segment.name} className="pie-legend-item">
                    <span
                      className="pie-legend-color"
                      style={{ background: segment.color }}
                    />
                    <div>
                      <strong>{segment.name}</strong>
                      <p>{segment.percent}% tổng vé</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <section className="top-sales-panel">
              <div className="chart-panel-title">
                <h4>Top vé tháng</h4>
                <p>Các loại vé đang dẫn đầu doanh số.</p>
              </div>
              <ul className="top-sales-list">
                {monthlyTopTickets.map((item, index) => (
                  <li key={item.label} className="top-sales-item">
                    <div className="top-sales-left">
                      <span className="top-sales-rank">#{index + 1}</span>
                      <div>
                        <strong>{item.label}</strong>
                        <p>{item.sold} vé bán</p>
                      </div>
                    </div>
                    <div className="top-sales-bar-wrap">
                      <div
                        className="top-sales-bar"
                        style={{ width: `${(item.sold / 610) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </section>
      </div>

      <div className="report-grid">
        <div className="report-card">
          <h3>Phòng chiếu</h3>
          <p>3 phòng đang hoạt động, 2 phòng đang bảo trì.</p>
        </div>
      </div>
    </div>
  );
}

export default Statistics;
