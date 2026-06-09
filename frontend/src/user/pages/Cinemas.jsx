import React, { useState } from "react";
import "./Cinemas.css";
import { Link } from "react-router-dom";

const sampleCinemas = [
  {
    id: 1,
    name: "CGV Vincom Đà Nẵng",
    location: "Tầng 5, Vincom Center, 72 Điện Biên Phủ, Q. Hải Châu, Đà Nẵng",
    city: "Đà Nẵng",
    rating: 4.5,
    halls: 8,
    facilities: ["IMAX", "4DX", "Dolby Atmos", "Sweetbox"],
  },
  {
    id: 2,
    name: "Lotte Cinema Xuân Thủy",
    location: "Tầng 4, Lotte Mart, 109 Xuân Thủy, Q. Cẩm Lệ, Đà Nẵng",
    city: "Đà Nẵng",
    rating: 4.3,
    halls: 6,
    facilities: ["Lotte Premium", "Sweetbox"],
  },
  {
    id: 3,
    name: "Galaxy Cinema Nguyễn Văn Linh",
    location: "Tầng 3, Galaxy Nguyễn Văn Linh, 105 Nguyễn Văn Linh, Q. Thanh Khê, Đà Nẵng",
    city: "Đà Nẵng",
    rating: 4.4,
    halls: 7,
    facilities: ["Dolby Atmos", "4K Laser"],
  },
  {
    id: 4,
    name: "CGV Vincom Center Đồng Khởi",
    location: "Tầng 6, Vincom Center, 72-74 Đồng Khởi, Q.1, Hồ Chí Minh",
    city: "Hồ Chí Minh",
    rating: 4.7,
    halls: 10,
    facilities: ["IMAX", "4DX", "Dolby Atmos"],
  },
  {
    id: 5,
    name: "Lotte Cinema Cantavil",
    location: "Tầng 4, Lotte Cantavil, 95 Xa lộ Hà Nội, Q.2, Hồ Chí Minh",
    city: "Hồ Chí Minh",
    rating: 4.4,
    halls: 8,
    facilities: ["Sweetbox"],
  },
  {
    id: 6,
    name: "CineStar Hai Bà Trưng",
    location: "Tầng 2, CineStar, 135 Hai Bà Trưng, Q. Hoàn Kiếm, Hà Nội",
    city: "Hà Nội",
    rating: 4.2,
    halls: 6,
    facilities: ["Dolby Atmos"],
  },
  {
    id: 7,
    name: "CGV Vincom Trần Duy Hưng",
    location: "Tầng 5, Vincom Center, 191 Trần Duy Hưng, Q. Nam Từ Liêm, Hà Nội",
    city: "Hà Nội",
    rating: 4.6,
    halls: 12,
    facilities: ["IMAX", "4DX", "Sweetbox"],
  },
  {
    id: 8,
    name: "Galaxy Nguyễn Trãi",
    location: "Tầng 5, Galaxy Nguyễn Trãi, 53 Nguyễn Trãi, Q. Ngô Quyền, Hải Phòng",
    city: "Hải Phòng",
    rating: 4.1,
    halls: 5,
    facilities: [],
  },
];

const banners = [
  "/uploads/banners/banner1.jpg",
  "/uploads/banners/banner2.jpg",
  "/uploads/banners/banner3.jpg",
];

export default function Cinemas() {
  const [selectedCity, setSelectedCity] = useState("Tất cả thành phố");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCinemas = sampleCinemas.filter((cinema) => {
    const matchesCity = selectedCity === "Tất cả thành phố" || cinema.city === selectedCity;
    const matchesSearch = 
      cinema.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cinema.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCity && matchesSearch;
  });

  return (
    <div className="cinema-page">
      <div className="breadcrumb">
        <button className="back-btn" onClick={() => window.history.back()}>
          ← Quay lại
        </button>
        <div className="breadcrumb-items">
          <Link to="/">Trang chủ</Link>
          <span className="separator">›</span>
          <span className="current">Rạp chiếu phim</span>
        </div>
      </div>
      <div className="cinema-container">
        <main className="cinema-main">
          <section className="cinema-left">
            <div className="hero">
              <div
                className="hero-banner"
                style={{
                  backgroundImage: `url(${banners[0]})`,
                }}
              >
                <div className="banner-overlay" />
                <div className="banner-content">
                  <h2>Rạp chiếu phim</h2>
                  <p>Chọn rạp gần bạn để trải nghiệm dịch vụ tốt nhất</p>
                </div>
              </div>
            </div>

            <div className="filter-section">
              <div className="city-selector">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="city-select"
                >
                  <option>Tất cả thành phố</option>
                  <option>Đà Nẵng</option>
                  <option>Hồ Chí Minh</option>
                  <option>Hà Nội</option>
                  <option>Hải Phòng</option>
                </select>
              </div>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Tìm kiếm rạp phim..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="cinema-list">
              {filteredCinemas.map((cinema) => (
                <div key={cinema.id} className="cinema-card">
                  <div className="cinema-header">
                    <div>
                      <h3 className="cinema-name">{cinema.name}</h3>
                      <p className="cinema-location">{cinema.location}</p>
                    </div>
                    <div className="cinema-rating">
                      <span className="star">★</span>
                      <span>{cinema.rating}</span>
                    </div>
                  </div>
                  <div className="cinema-info">
                    <span className="info-item">🎬 {cinema.halls} phòng chiếu</span>
                  </div>
                  {cinema.facilities.length > 0 && (
                    <div className="cinema-facilities">
                      {cinema.facilities.map((f, idx) => (
                        <span key={idx} className="facility-tag">{f}</span>
                      ))}
                    </div>
                  )}
                  <div className="cinema-actions">
                    <button className="btn secondary">Xem chi tiết</button>
                    <button className="btn primary">Đặt vé</button>
                  </div>
                </div>
              ))}
            </div>

            {filteredCinemas.length === 0 && (
              <div className="no-result">
                <p>Không tìm thấy rạp nào phù hợp</p>
              </div>
            )}

            <div className="load-more">
              <button className="btn load-more-btn">Xem thêm</button>
            </div>
          </section>

          <aside className="cinema-right">
            <div className="quick-book">
              <h4>Đặt vé nhanh</h4>
              <button>Chọn phim</button>
              <button>Chọn rạp</button>
              <button>Chọn ngày</button>
              <button>Chọn suất chiếu</button>
            </div>

            <div className="suggest">Rạp hay xem</div>
            <div className="ad">Banner quảng cáo</div>
          </aside>
        </main>
      </div>
    </div>
  );
}
