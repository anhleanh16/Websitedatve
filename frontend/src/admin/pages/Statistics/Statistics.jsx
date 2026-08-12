import { useState, useEffect } from "react";
import { adminStatisticsService } from "../../services/adminApi";
import AdminPagination, { useAdminPagination } from "../../components/AdminPagination.jsx";
import "./statistics.css";

const EMPTY_ITEMS = [];

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

const PERIOD_OPTIONS = [
  { value: "total", label: "Tổng hợp", icon: "📊" },
  { value: "week",  label: "Tuần này", icon: "🗓️" },
  { value: "month", label: "Tháng này", icon: "📅" },
];

const CHART_COLOR_PALETTE = [
  "#7c61ff", "#5bcad4", "#f2917a", "#f3c74b",
  "#22c55e", "#ec4899", "#3b82f6", "#f97316",
  "#a78bfa", "#14b8a6", "#e11d48", "#0ea5e9",
];

function generateLinePoints(data, width, height, padding) {
  if (!data || data.length === 0) return "0,0";
  const maxValue = Math.max(...data, 1);
  return data
    .map((value, index) => {
      const v = Number(value) || 0;
      const x = padding + (index * (width - padding * 2)) / (data.length - 1 || 1);
      const y = height - padding - (v / maxValue) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

function generatePieSegments(data, radius = 80, cx = 110, cy = 110) {
  const validData = data.filter(item => (Number(item.tickets_sold) || 0) > 0);
  const total = validData.reduce(
    (sum, item) => sum + (Number(item.tickets_sold) || 0),
    0
  );
  if (total <= 0) return [];
  let currentAngle = 0;
  return validData.map((item) => {
    const tickets = Number(item.tickets_sold) || 0;
    if (tickets <= 0) return null;
    const sliceAngle = (tickets / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    const largeArcFlag = sliceAngle > 180 ? 1 : 0;
    const startX = cx + radius * Math.cos(((startAngle - 90) * Math.PI) / 180);
    const startY = cy + radius * Math.sin(((startAngle - 90) * Math.PI) / 180);
    const endX = cx + radius * Math.cos(((endAngle - 90) * Math.PI) / 180);
    const endY = cy + radius * Math.sin(((endAngle - 90) * Math.PI) / 180);
    if (isNaN(startX) || isNaN(startY) || isNaN(endX) || isNaN(endY)) return null;
    const path = `M ${cx} ${cy} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    currentAngle = endAngle;
    return {
      ...item,
      path,
      percent: Math.round((tickets / total) * 100),
    };
  }).filter(Boolean);
}

function formatCompactNumber(num) {
  const n = Number(num) || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, "") + "T";
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
  return String(Math.round(n));
}

function BarChart({ items, labelKey, valueKey, secondValueKey, formatValue, height = 300, horizontal = false, maxBars = 12 }) {
  if (!items || items.length === 0) {
    return <div className="no-data">Không có dữ liệu</div>;
  }
  const data = items.slice(0, maxBars);
  const width = horizontal ? 560 : 720;
  const padding = horizontal ? { top: 20, right: 20, bottom: 60, left: 140 } : { top: 36, right: 28, bottom: 56, left: 68 };

  const values = data.map(d => Number(d[valueKey]) || 0);
  const secondValues = secondValueKey ? data.map(d => Number(d[secondValueKey]) || 0) : [];
  const maxValue = Math.max(...values, ...secondValues, 1);

  if (horizontal) {
    const barHeight = Math.min(32, ((height - padding.top - padding.bottom) / data.length) - 8);
    return (
      <div className="bar-chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          {data.map((item, idx) => {
            const v = Number(item[valueKey]) || 0;
            const barWidth = ((width - padding.left - padding.right) * v) / maxValue;
            const y = padding.top + idx * (barHeight + 8);
            const color = CHART_COLOR_PALETTE[idx % CHART_COLOR_PALETTE.length];
            const labelRaw = String(item[labelKey] || "");
            const label = labelRaw.length > 18 ? labelRaw.slice(0, 17) + "…" : labelRaw;
            return (
              <g key={idx}>
                <text x={padding.left - 8} y={y + barHeight / 2 + 4} textAnchor="end" className="bar-axis-label bar-axis-label-h">
                  {label}
                </text>
                <rect x={padding.left} y={y} width={Math.max(2, barWidth)} height={barHeight} fill={color} rx={4} className="bar-rect" />
                <text x={padding.left + barWidth + 8} y={y + barHeight / 2 + 4} className="bar-value-label">
                  {formatValue ? formatValue(v) : formatNumber(v)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  const barWidth = Math.max(12, Math.min(36, ((width - padding.left - padding.right) / data.length) * 0.65));
  const groupStep = (width - padding.left - padding.right) / data.length;

  return (
    <div className="bar-chart-wrapper bar-chart-full">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {[0, 0.25, 0.5, 0.75, 1].map((tier, i) => {
          const y = padding.top + ((height - padding.top - padding.bottom) * (1 - tier));
          return (
            <g key={`grid-${i}`}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="bar-axis-label bar-axis-tiny">
                {formatCompactNumber(Math.round(maxValue * tier))}
              </text>
            </g>
          );
        })}
        {data.map((item, idx) => {
          const v = Number(item[valueKey]) || 0;
          const ratio = v / maxValue;
          const barH = ((height - padding.top - padding.bottom) * ratio);
          const groupStep = (width - padding.left - padding.right) / data.length;
          const barWidth = Math.max(16, Math.min(72, groupStep * 0.72));
          const x = padding.left + idx * groupStep + (groupStep - barWidth) / 2;
          const y = height - padding.bottom - barH;
          const color = CHART_COLOR_PALETTE[idx % CHART_COLOR_PALETTE.length];
          const labelRaw = String(item[labelKey] || "");
          const label = labelRaw.length > 9 ? labelRaw.slice(0, 8) + "…" : labelRaw;
          const showValueLabel = ratio < 0.92;
          return (
            <g key={idx}>
              <rect x={x} y={y} width={barWidth} height={Math.max(4, barH)} fill={color} rx={6} className="bar-rect" />
              {showValueLabel && (
                <text x={x + barWidth / 2} y={y - 7} textAnchor="middle" className="bar-value-label bar-value-label-v">
                  {formatValue ? formatValue(v) : formatNumber(v)}
                </text>
              )}
              <title>{`${labelRaw}: ${formatValue ? formatValue(v) : formatNumber(v)}`}</title>
              <text x={x + barWidth / 2} y={height - padding.bottom + 18} textAnchor="middle" className="bar-axis-label bar-axis-xlabel">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ViewToggle({ view, setView, chartLabel = "Biểu đồ", tableLabel = "Bảng" }) {
  return (
    <div className="view-toggle-group">
      <button className={`vt-btn ${view === "chart" ? "active" : ""}`} onClick={() => setView("chart")}>
        📊 {chartLabel}
      </button>
      <button className={`vt-btn ${view === "table" ? "active" : ""}`} onClick={() => setView("table")}>
        📋 {tableLabel}
      </button>
    </div>
  );
}

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChart, setActiveChart] = useState("day");
  const [period, setPeriod] = useState("total");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    cinemaId: "",
  });
  const topMovies = stats?.topMovies || EMPTY_ITEMS;
  const { page: topMoviesPage, setPage: setTopMoviesPage, totalPages: topMoviesTotalPages, pageItems: pagedTopMovies } = useAdminPagination(topMovies, 5);

  const [topMoviesView, setTopMoviesView] = useState("table");
  const [topCinemasView, setTopCinemasView] = useState("table");
  const [topCombosView, setTopCombosView] = useState("table");
  const [ticketTypeView, setTicketTypeView] = useState("chart");
  const [expenseTypeView, setExpenseTypeView] = useState("table");
  const [userGrowthView, setUserGrowthView] = useState("chart");
  const [cinemaStatsView, setCinemaStatsView] = useState("table");

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { ...filters };
      if (period && period !== "total") params.period = period;
      const data = await adminStatisticsService.getStatistics(params);
      setStats(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load statistics:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [period]);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleApplyFilters = () => {
    loadStatistics();
  };

  const getChartData = () => {
    let data;
    let labelKey;

    switch (activeChart) {
      case "week":
        data =
          stats?.revenueByWeek?.map((item) => ({
            ...item,
            label: `${item.year}-W${item.week}`,
          })) || [];
        labelKey = "label";
        break;
      case "month":
        data = stats?.revenueByMonth || [];
        labelKey = "month";
        break;
      case "day":
      default:
        data =
          stats?.revenueByDay?.map((item) => ({
            ...item,
            label: new Date(item.date).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
            }),
          })) || [];
        labelKey = "label";
        break;
    }

    return {
      labels: data.map((item) => item[labelKey]),
      revenueData: data.map((item) => Number(item.revenue) || 0),
    };
  };

  const getPieChartData = () => {
    const data = stats?.ticketSalesByType || [];
    const colors = CHART_COLOR_PALETTE;
    return data.map((item, index) => ({
      ...item,
      color: colors[index % colors.length],
    }));
  };

  const chartData = getChartData();
  const pieData = getPieChartData();
  const pieTotal = pieData.reduce(
    (sum, item) => sum + (Number(item.tickets_sold) || 0),
    0
  );

  const revenuePoints =
    chartData.revenueData.length > 0
      ? generateLinePoints(chartData.revenueData, 520, 220, 24)
      : "0,0";
  const pieSegments = generatePieSegments(pieData);

  const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const cleanUrl = url.startsWith("/") ? url.substring(1) : url;
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
    return `${apiUrl}/${cleanUrl}`;
  };

  const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || "Tổng hợp";

  if (loading) {
    return (
      <div className="admin-statistics loading">
        <div className="loading-spinner">Đang tải thống kê...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-statistics error">
        <div className="error-message">
          <h3>Lỗi</h3>
          <p>{error}</p>
          <button onClick={loadStatistics}>Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-statistics">
      <div className="statistics-header">
        <div>
          <p className="section-label">Bảng điều khiển</p>
          <h1>Thống kê doanh nghiệp <span className="current-period-tag">{periodLabel}</span></h1>
        </div>
        <div className="statistics-filters">
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            placeholder="Từ ngày"
          />
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            placeholder="Đến ngày"
          />
          <button onClick={handleApplyFilters} className="apply-btn">
            Áp dụng
          </button>
        </div>
      </div>

      <div className="period-selector-wrap">
        <span className="period-selector-label">Khoảng thời gian:</span>
        <div className="period-tabs">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`period-tab ${period === opt.value ? "active" : ""}`}
              onClick={() => setPeriod(opt.value)}
            >
              <span className="pt-icon">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overview-cards">
        <div className="overview-card">
          <div className="card-icon revenue">💰</div>
          <div className="card-content">
            <p className="card-label">Tổng doanh thu</p>
            <h3 className="card-value">{formatCurrency(stats?.overview?.total_revenue)}</h3>
          </div>
        </div>
        <div className="overview-card">
          <div className="card-icon tickets">🎟️</div>
          <div className="card-content">
            <p className="card-label">Vé đã bán</p>
            <h3 className="card-value">{formatNumber(stats?.overview?.total_tickets)}</h3>
          </div>
        </div>
        <div className="overview-card">
          <div className="card-icon bookings">📋</div>
          <div className="card-content">
            <p className="card-label">Đơn hàng</p>
            <h3 className="card-value">{formatNumber(stats?.overview?.total_bookings)}</h3>
          </div>
        </div>
        <div className="overview-card">
          <div className="card-icon users">👥</div>
          <div className="card-content">
            <p className="card-label">Người dùng</p>
            <h3 className="card-value">{formatNumber(stats?.overview?.total_users)}</h3>
          </div>
        </div>
        <div className="overview-card">
          <div className="card-icon expenses">💸</div>
          <div className="card-content">
            <p className="card-label">Chi phí</p>
            <h3 className="card-value">{formatCurrency(stats?.overview?.total_expenses)}</h3>
          </div>
        </div>
        <div className="overview-card">
          <div className="card-icon profit">📈</div>
          <div className="card-content">
            <p className="card-label">Lợi nhuận</p>
            <h3 className="card-value" style={{ color: stats?.overview?.total_profit >= 0 ? '#10b981' : '#ef4444' }}>
              {formatCurrency(stats?.overview?.total_profit)}
            </h3>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {stats?.overview?.total_revenue > 0
                ? `Tỷ suất: ${((stats.overview.total_profit / stats.overview.total_revenue) * 100).toFixed(1)}%`
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div className="statistics-grid">
        <section className="chart-card">
          <div className="chart-panel-header">
            <div>
              <h3>Doanh thu</h3>
              <p>Biểu đồ doanh thu theo thời gian ({periodLabel})</p>
            </div>
            <div className="chart-type-tabs">
              <button
                className={activeChart === "day" ? "active" : ""}
                onClick={() => setActiveChart("day")}
              >
                Theo ngày
              </button>
              <button
                className={activeChart === "week" ? "active" : ""}
                onClick={() => setActiveChart("week")}
              >
                Theo tuần
              </button>
              <button
                className={activeChart === "month" ? "active" : ""}
                onClick={() => setActiveChart("month")}
              >
                Theo tháng
              </button>
            </div>
          </div>
          <div className="chart-graph">
            {chartData.labels.length > 0 ? (
              <>
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
                  {chartData.revenueData.map((value, index) => {
                    const maxValue = Math.max(...chartData.revenueData, 1);
                    const v = Number(value) || 0;
                    const x = 24 + (index * 472) / (chartData.revenueData.length - 1 || 1);
                    const y = 220 - 24 - (v / maxValue) * 172;
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="6"
                        fill="#7c61ff"
                        stroke="#fff"
                        strokeWidth="2"
                      />
                    );
                  })}
                </svg>
                <div className="chart-labels">
                  {chartData.labels.map((label, i) => (
                    <span key={i}>{label}</span>
                  ))}
                </div>
              </>
            ) : (
              <div className="no-data">Không có dữ liệu doanh thu</div>
            )}
          </div>
        </section>

        <section className="chart-card">
          <div className="chart-panel-header">
            <div>
              <h3>Loại ghế đã bán</h3>
              <p>Phân bố vé theo loại ghế ({periodLabel})</p>
            </div>
            <ViewToggle view={ticketTypeView} setView={setTicketTypeView} />
          </div>
          <div className="pie-chart-container">
            {ticketTypeView === "chart" ? (
              pieSegments.length > 0 ? (
                <>
                  <svg viewBox="0 0 220 220" className="pie-chart-svg">
                    {pieSegments.map((segment, idx) => (
                      <path
                        key={segment.seat_type || idx}
                        d={segment.path}
                        fill={segment.color}
                        className="pie-slice"
                        style={{ animationDelay: `${idx * 0.08}s` }}
                      />
                    ))}
                    <circle cx="110" cy="110" r="50" fill="rgba(8,12,25,0.96)" />
                    <text x="110" y="104" textAnchor="middle" className="pie-center-subtitle">
                      Vé
                    </text>
                    <text x="110" y="126" textAnchor="middle" className="pie-center-text">
                      {formatNumber(pieTotal)}
                    </text>
                  </svg>
                  <div className="pie-legend">
                    {pieSegments.map((segment, idx) => (
                      <div key={segment.seat_type || idx} className="legend-item">
                        <span
                          className="legend-color"
                          style={{ background: segment.color }}
                        />
                        <div>
                          <strong>{segment.seat_type || "Khác"}</strong>
                          <p>{segment.percent}% ({formatNumber(segment.tickets_sold)})</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="no-data">Chưa có vé được bán</div>
              )
            ) : (
              <div className="table-container">
                {pieData.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Loại ghế</th>
                        <th>Vé bán</th>
                        <th>% Tổng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pieData.map((s, i) => {
                        const pct = pieTotal > 0 ? ((Number(s.tickets_sold || 0) / pieTotal) * 100).toFixed(1) : 0;
                        return (
                          <tr key={s.seat_type || i}>
                            <td>{i + 1}</td>
                            <td>
                              <span className="td-color-dot" style={{ background: s.color }} />
                              {s.seat_type || "Khác"}
                            </td>
                            <td>{formatNumber(s.tickets_sold)}</td>
                            <td>{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-data">Chưa có dữ liệu</div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="statistics-grid">
        <section className="data-table-card">
          <div className="chart-panel-header">
            <div>
              <h3>Top phim theo doanh thu</h3>
              <p>Phim có doanh thu cao nhất ({periodLabel})</p>
            </div>
            <ViewToggle view={topMoviesView} setView={setTopMoviesView} />
          </div>
          {topMoviesView === "chart" ? (
            <BarChart
              items={topMovies}
              labelKey="title"
              valueKey="revenue"
              secondValueKey="tickets_sold"
              formatValue={formatCurrency}
              height={310}
              maxBars={8}
            />
          ) : (
            <div className="table-container">
              {topMovies.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Phim</th>
                      <th>Vé bán</th>
                      <th>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTopMovies.map((movie, index) => (
                      <tr key={movie.movie_id}>
                        <td>{(topMoviesPage - 1) * 5 + index + 1}</td>
                        <td>
                          <div className="movie-info">
                            {movie.poster && (
                              <img
                                src={getImageUrl(movie.poster)}
                                alt={movie.title}
                                className="movie-posters"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            )}
                            <span>{movie.title}</span>
                          </div>
                        </td>
                        <td>{formatNumber(movie.tickets_sold)}</td>
                        <td className="revenue">{formatCurrency(movie.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-data">Không có dữ liệu</div>
              )}
            </div>
          )}
          {topMoviesView === "table" && (
            <AdminPagination page={topMoviesPage} totalPages={topMoviesTotalPages} totalItems={topMovies.length} pageSize={5} onPageChange={setTopMoviesPage} />
          )}
        </section>

        <section className="data-table-card">
          <div className="chart-panel-header">
            <div>
              <h3>Top rạp chiếu</h3>
              <p>Rạp có doanh thu cao nhất ({periodLabel})</p>
            </div>
            <ViewToggle view={topCinemasView} setView={setTopCinemasView} />
          </div>
          {topCinemasView === "chart" ? (
            <BarChart
              items={stats?.topCinemas || []}
              labelKey="cinema_name"
              valueKey="revenue"
              secondValueKey="tickets_sold"
              formatValue={formatCurrency}
              height={310}
              maxBars={8}
            />
          ) : (
            <div className="table-container">
              {stats?.topCinemas?.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Rạp</th>
                      <th>Thành phố</th>
                      <th>Vé bán</th>
                      <th>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topCinemas.map((cinema, index) => (
                      <tr key={cinema.cinema_id}>
                        <td>{index + 1}</td>
                        <td>{cinema.cinema_name}</td>
                        <td>{cinema.city}</td>
                        <td>{formatNumber(cinema.tickets_sold)}</td>
                        <td className="revenue">{formatCurrency(cinema.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-data">Không có dữ liệu</div>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="statistics-grid">
        <section className="data-table-card">
          <div className="chart-panel-header">
            <div>
              <h3>Top combo bán chạy</h3>
              <p>Combo được mua nhiều nhất ({periodLabel})</p>
            </div>
            <ViewToggle view={topCombosView} setView={setTopCombosView} />
          </div>
          {topCombosView === "chart" ? (
            <BarChart
              items={stats?.comboSales || []}
              labelKey="combo_name"
              valueKey="total_sold"
              secondValueKey="revenue"
              formatValue={formatNumber}
              height={310}
              maxBars={8}
            />
          ) : (
            <div className="table-container">
              {stats?.comboSales?.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Combo</th>
                      <th>Số lượng</th>
                      <th>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.comboSales.map((combo, index) => (
                      <tr key={combo.combo_id}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="combo-info">
                            {combo.image && (
                              <img
                                src={getImageUrl(combo.image)}
                                alt={combo.combo_name}
                                className="combo-image"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            )}
                            <span>{combo.combo_name}</span>
                          </div>
                        </td>
                        <td>{formatNumber(combo.total_sold)}</td>
                        <td className="revenue">{formatCurrency(combo.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-data">Không có dữ liệu</div>
              )}
            </div>
          )}
        </section>

        <section className="data-table-card">
          <div className="chart-panel-header">
            <div>
              <h3>Thống kê theo Rạp chiếu</h3>
              <p>Doanh thu, chi phí, lợi nhuận & người dùng theo từng rạp ({periodLabel})</p>
            </div>
            <ViewToggle view={cinemaStatsView} setView={setCinemaStatsView} chartLabel="Biểu đồ DT" />
          </div>
          {cinemaStatsView === "chart" ? (
            <BarChart
              items={stats?.cinemaStats || []}
              labelKey="cinema_name"
              valueKey="revenue"
              formatValue={formatCurrency}
              height={310}
              maxBars={8}
            />
          ) : (
            <div className="table-container cinema-stats-scroll">
              {stats?.cinemaStats?.length > 0 ? (
                <table className="cinema-stats-table">
                  <thead>
                    <tr>
                      <th>Rạp chiếu</th>
                      <th>Khu vực</th>
                      <th>Doanh thu</th>
                      <th>Chi phí</th>
                      <th>Lợi nhuận</th>
                      <th>Tỷ suất (%)</th>
                      <th>Vé bán</th>
                      <th>Người dùng</th>
                      <th>Đơn hàng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.cinemaStats.map((cinema) => {
                      const profitMargin = cinema.revenue > 0 ? ((cinema.profit / cinema.revenue) * 100).toFixed(1) : 0;
                      return (
                        <tr key={cinema.cinema_id}>
                          <td><strong>{cinema.cinema_name}</strong></td>
                          <td>{cinema.city}</td>
                          <td className="revenue">{formatCurrency(cinema.revenue)}</td>
                          <td className="expenses">{formatCurrency(cinema.total_expenses)}</td>
                          <td className="profit" style={{ color: cinema.profit >= 0 ? '#10b981' : '#ef4444' }}>
                            {formatCurrency(cinema.profit)}
                          </td>
                          <td style={{ color: profitMargin >= 0 ? '#10b981' : '#ef4444' }}>
                            {profitMargin}%
                          </td>
                          <td>{formatNumber(cinema.tickets_sold)}</td>
                          <td>{formatNumber(cinema.total_users)}</td>
                          <td>{formatNumber(cinema.bookings)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="no-data">Không có dữ liệu</div>
              )}
            </div>
          )}
        </section>

        <section className="data-table-card">
          <div className="chart-panel-header">
            <div>
              <h3>Chi phí theo loại</h3>
              <p>Phân bổ chi phí theo từng loại ({periodLabel})</p>
            </div>
            <ViewToggle view={expenseTypeView} setView={setExpenseTypeView} />
          </div>
          {expenseTypeView === "chart" ? (
            <BarChart
              items={stats?.expensesByType || []}
              labelKey="expense_type"
              valueKey="total_amount"
              formatValue={formatCurrency}
              height={320}
            />
          ) : (
            <div className="table-container">
              {stats?.expensesByType?.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Loại chi phí</th>
                      <th>Số lượng</th>
                      <th>Tổng chi phí</th>
                      <th>% Tổng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.expensesByType.map((expense) => {
                      const totalExpenses = stats?.overview?.total_expenses || 1;
                      const percentage = ((expense.total_amount / totalExpenses) * 100).toFixed(1);

                      const expenseLabels = {
                        'salary': '💼 Lương nhân viên',
                        'utilities': '⚡ Điện nước',
                        'maintenance': '🔧 Bảo trì',
                        'marketing': '📢 Marketing',
                        'other': '📋 Khác'
                      };

                      return (
                        <tr key={expense.expense_type}>
                          <td>{expenseLabels[expense.expense_type] || expense.expense_type}</td>
                          <td>{formatNumber(expense.count)}</td>
                          <td className="expenses">{formatCurrency(expense.total_amount)}</td>
                          <td>{percentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="no-data">Không có dữ liệu</div>
              )}
            </div>
          )}
        </section>

        <section className="data-table-card">
          <div className="chart-panel-header">
            <div>
              <h3>Tăng trưởng người dùng</h3>
              <p>Người dùng mới theo tháng ({periodLabel})</p>
            </div>
            <ViewToggle view={userGrowthView} setView={setUserGrowthView} />
          </div>
          {userGrowthView === "chart" ? (
            <BarChart
              items={stats?.userGrowth || []}
              labelKey="month"
              valueKey="new_users"
              formatValue={formatNumber}
              height={320}
            />
          ) : (
            <div className="table-container">
              {stats?.userGrowth?.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Tháng</th>
                      <th>Người dùng mới</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.userGrowth.map((item) => (
                      <tr key={item.month}>
                        <td>{item.month}</td>
                        <td>{formatNumber(item.new_users)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-data">Không có dữ liệu</div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
