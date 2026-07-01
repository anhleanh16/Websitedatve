import { useState, useEffect } from "react";
import { adminStatisticsService } from "../services/adminApi";
import "./statistics.css";

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

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChart, setActiveChart] = useState("day");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    cinemaId: "",
  });

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminStatisticsService.getStatistics(filters);
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
  }, []);

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
    const colors = ["#7c61ff", "#5bcad4", "#f2917a", "#f3c74b"];
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

  function generateLinePoints(data, width, height, padding) {
    if (!data || data.length === 0) {
      return "0,0";
    }
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
    // Filter out any items with 0 tickets sold
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

      // Make sure coordinates are valid numbers
      if (isNaN(startX) || isNaN(startY) || isNaN(endX) || isNaN(endY)) {
        return null;
      }

      const path = `M ${cx} ${cy} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
      currentAngle = endAngle;

      return {
        ...item,
        path,
        percent: Math.round((tickets / total) * 100),
      };
    }).filter(Boolean);
  }

  const revenuePoints =
    chartData.revenueData.length > 0
      ? generateLinePoints(chartData.revenueData, 520, 220, 24)
      : "0,0";
  const pieSegments = generatePieSegments(pieData);

  const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    // Loại bỏ dấu / ở đầu nếu có
    const cleanUrl = url.startsWith("/") ? url.substring(1) : url;
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
    return `${apiUrl}/${cleanUrl}`;
  };

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
          <h1>Thống kê doanh nghiệp</h1>
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
              <p>Biểu đồ doanh thu theo thời gian</p>
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
              <p>Phân bố vé theo loại ghế</p>
            </div>
          </div>
          <div className="pie-chart-container">
            {pieSegments.length > 0 ? (
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
            )}
          </div>
        </section>
      </div>

      <div className="statistics-grid">
        <section className="data-table-card">
          <div className="chart-panel-header">
            <div>
              <h3>Top phim theo doanh thu</h3>
              <p>Phim có doanh thu cao nhất</p>
            </div>
          </div>
          <div className="table-container">
            {stats?.topMovies?.length > 0 ? (
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
                  {stats.topMovies.map((movie, index) => (
                    <tr key={movie.movie_id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="movie-info">
                          {movie.poster && (
                            <img
                              src={getImageUrl(movie.poster)}
                              alt={movie.title}
                              className="movie-posters"
                              onError={(e) => {
                                e.target.style.display = "none"; // Ẩn ảnh nếu lỗi
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
        </section>

        <section className="data-table-card">
          <div className="chart-panel-header">
            <div>
              <h3>Top rạp chiếu</h3>
              <p>Rạp có doanh thu cao nhất</p>
            </div>
          </div>
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
        </section>
      </div>

      <div className="statistics-grid">
        <section className="data-table-card">
          <div className="chart-panel-header">
            <div>
              <h3>Top combo bán chạy</h3>
              <p>Combo được mua nhiều nhất</p>
            </div>
          </div>
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
                                e.target.style.display = "none"; // Ẩn ảnh nếu lỗi
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
        </section>

        <section className="data-table-card">
          <div className="chart-panel-header">
            <div>
              <h3>Thống kê theo Rạp chiếu</h3>
              <p>Doanh thu, chi phí, lợi nhuận và người dùng theo từng rạp</p>
            </div>
          </div>
          <div className="table-container">
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
        </section>

        <section className="data-table-card">
          <div className="chart-panel-header">
            <div>
              <h3>Chi phí theo loại</h3>
              <p>Phân bổ chi phí theo từng loại</p>
            </div>
          </div>
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
        </section>

        <section className="data-table-card">
          <div className="chart-panel-header">
            <div>
              <h3>Tăng trưởng người dùng</h3>
              <p>Người dùng mới theo tháng</p>
            </div>
          </div>
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
        </section>
      </div>
    </div>
  );
}
