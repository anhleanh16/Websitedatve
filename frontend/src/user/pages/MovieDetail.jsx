import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MovieDetail.css';

export default function MovieDetail() {
  const vietnameseWeekdays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  const today = new Date();
  const todayIndex = today.getDay();
  const todayLabel = todayIndex === 0 ? 'Chủ nhật' : vietnameseWeekdays[todayIndex - 1];
  const scheduleDays = vietnameseWeekdays;
  const [activeDay, setActiveDay] = useState(todayLabel);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAllCinemas, setShowAllCinemas] = useState(false);
  const scheduleRef = useRef(null);
  const cinemaListRef = useRef(null);
  const videoRef = useRef(null);
  const trailerContainerRef = useRef(null);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);

  // Reset về đầu trang khi mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Collapse khi scroll xuống qua banner, expand lại khi scroll lên đầu
  useEffect(() => {
    const getBannerHeight = () => Math.min(window.innerWidth * 9 / 16, 620);
    const onScroll = () => {
      const scrolled = window.scrollY;
      const bannerH = getBannerHeight();
      if (scrolled >= bannerH) {
        setBannerCollapsed(true);
      } else if (scrolled < bannerH * 0.2) {
        setBannerCollapsed(false);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const galleryImages = [
    'https://cdn.popsww.com/blog/sites/2/2023/05/doraemon-nobita-va-cuoc-chien-vu-tru-ti-hon-2021.jpg',
    'https://cdn.popsww.com/blog/sites/2/2023/05/USGofPw3-image-2.png',
    'https://cdn.eva.vn/upload/2-2022/images/2022-06-06/doraemon-005-1654512377-9-width650height515.jpg',
    'https://newsmd2fr.keeng.vn/tiin/archive/imageslead/2022/05/27/83xubpzq2jbhhjtktbq2ucf4arul1qyd.jpg',
    'https://static1.dienanh.net/upload/202204/4b2c2669-be26-4a13-b42f-f0a96fa172ed.jpg',
    'https://static1.dienanh.net/upload/202204/c53cb69d-45e3-4b09-ab65-15a011c20239.jpg',
    'https://cdn.eva.vn/upload/2-2022/images/2022-06-06/doraemon-003-1654512377-236-width650height366.jpg',
  ];
  const handleBookClick = () => {
    scheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleStartAudio = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      setIsMuted(false);
      video.play().catch(() => {});
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
      });
    }
  }, []);

  useEffect(() => {
    const el = cinemaListRef.current;
    if (!el) return;

    if (showAllCinemas) {
      const full = el.scrollHeight;
      el.style.maxHeight = full + 'px';
      el.classList.remove('collapsed');
      el.classList.add('expanded');
      const clear = () => {
        el.style.maxHeight = 'none';
        el.removeEventListener('transitionend', clear);
      };
      el.addEventListener('transitionend', clear);
    } else {
      const curr = el.scrollHeight;
      el.style.maxHeight = curr + 'px';
      void el.offsetHeight;
      el.style.maxHeight = '220px';
      el.classList.remove('expanded');
      el.classList.add('collapsed');
    }
  }, [showAllCinemas]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (idx) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);
  const nextLightbox = (e) => {
    e?.stopPropagation();
    setLightboxIndex((i) => (i + 1) % galleryImages.length);
  };
  const prevLightbox = (e) => {
    e?.stopPropagation();
    setLightboxIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);
  };

  useEffect(() => {
    if (!lightboxOpen) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    const onKey = (ev) => {
      if (ev.key === 'Escape') closeLightbox();
      if (ev.key === 'ArrowRight') setLightboxIndex((i) => (i + 1) % galleryImages.length);
      if (ev.key === 'ArrowLeft') setLightboxIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightboxOpen, galleryImages.length]);
  const scheduleLabel = (day) => (day === todayLabel ? 'Hôm nay' : day);
  const description = `Nobita vô tình vấp phải một vật thể khi đang dọn rác cho phim trường bộ phim do các bạn của cậu gây dựng trong vườn nhà Suneo. Cậu tò mò và mang nó đến khoe với mọi người thì bị đuổi đi. Khi đang buồn bã và ngắm dòng sông, vật thể lạ bỗng bay lên rồi rơi xuống khiến Nobita bất ngờ và may mắn đã giữ được nó. Nobita đem nó về nhà. Doraemon sau khi xong việc ở phim trường trở về nhà và cùng Nobita xem những chi tiết của vật thể lạ. Sau đó, từ vật thể bỗng phát ra một tiếng nói và một người tí hon bước ra, tự giới thiệu là Papi từ hành tinh Pirika. Vật thể lạ kia hoá ra là phi thuyền của Papi. Doraemon và Nobita sau khi nghe qua lời giới thiệu đã quyết định giúp Papi sửa chữa phi thuyền của mình. Một buổi sáng, Nobita kể cho Shizuka về chuyện của Papi, cô sau đó đã mang một ngôi nhà búp bê tặng Papi để ở. Shizuka sau đó bày tỏ mong muốn được vào ngôi nhà búp bê nên Doraemon mang Đèn pin thu nhỏ để cả 3 người có thể thu nhỏ vừa chơi với Papi. Do mải chơi, Doraemon quên mất việc ở phim trường đến mức Jaian và Suneo phải đến tận nhà tìm. Lúc này, Jaian và Suneo gặp được Papi.`;
  const maxDescriptionLength = 280;
  const shouldShowMore = description.length > maxDescriptionLength;
  const displayedDescription = showFullDescription ? description : `${description.slice(0, maxDescriptionLength)}...`;

  const cinemas = [
    {
      id: 'danang',
      name: 'Lunexa Movix Đà Nẵng',
      schedule: {
        'Thứ 2': ['09:00 - 2D', '12:30 - 2D', '15:00 - 3D', '18:30 - IMAX'],
        'Thứ 3': ['10:00 - 2D', '13:30 - 3D', '16:45 - 2D', '20:00 - IMAX'],
        'Thứ 4': ['09:30 - 2D', '14:00 - 3D', '17:15 - 2D', '21:00 - IMAX'],
        'Thứ 5': ['10:15 - 2D', '13:00 - 3D', '16:30 - 2D', '19:45 - IMAX'],
        'Thứ 6': ['09:45 - 2D', '12:15 - 3D', '15:30 - 2D', '20:15 - IMAX'],
        'Thứ 7': ['11:00 - 2D', '14:45 - 3D', '18:00 - IMAX', '21:15 - 2D'],
        'Chủ nhật': ['10:30 - 2D', '13:30 - 3D', '17:00 - IMAX', '20:30 - 2D'],
      },
    },
    {
      id: 'hcm',
      name: 'Lunexa Movix TP.HCM',
      schedule: {
        'Thứ 2': ['09:15 - 2D', '12:00 - 2D', '15:45 - 3D', '19:00 - IMAX'],
        'Thứ 3': ['10:30 - 2D', '14:15 - 3D', '17:30 - 2D', '20:45 - IMAX'],
        'Thứ 4': ['09:00 - 2D', '13:45 - 3D', '16:00 - 2D', '21:00 - IMAX'],
        'Thứ 5': ['10:00 - 2D', '13:30 - 3D', '17:00 - 2D', '20:15 - IMAX'],
        'Thứ 6': ['11:00 - 2D', '14:30 - 3D', '18:15 - IMAX', '21:30 - 2D'],
        'Thứ 7': ['09:00 - 2D', '12:30 - 3D', '16:00 - 2D', '19:30 - IMAX'],
        'Chủ nhật': ['10:15 - 2D', '14:00 - 3D', '17:45 - IMAX', '21:00 - 2D'],
      },
    },
    {
      id: 'hanoi',
      name: 'Lunexa Movix Hà Nội',
      schedule: {
        'Thứ 2': ['09:45 - 2D', '13:00 - 2D', '16:15 - 3D', '19:30 - IMAX'],
        'Thứ 3': ['10:15 - 2D', '14:30 - 3D', '18:00 - 2D', '21:15 - IMAX'],
        'Thứ 4': ['09:30 - 2D', '12:45 - 3D', '15:30 - 2D', '20:00 - IMAX'],
        'Thứ 5': ['10:30 - 2D', '13:15 - 3D', '17:00 - 2D', '20:30 - IMAX'],
        'Thứ 6': ['11:00 - 2D', '14:45 - 3D', '18:30 - IMAX', '21:45 - 2D'],
        'Thứ 7': ['09:15 - 2D', '12:00 - 3D', '15:30 - 2D', '19:15 - IMAX'],
        'Chủ nhật': ['10:45 - 2D', '14:30 - 3D', '17:15 - IMAX', '21:00 - 2D'],
      },
    },
    {
      id: 'haiphong',
      name: 'Lunexa Movix Hải Phòng',
      schedule: {
        'Thứ 2': ['09:30 - 2D', '13:00 - 3D', '16:30 - 2D', '20:00 - IMAX'],
        'Thứ 3': ['10:00 - 2D', '14:30 - 3D', '17:45 - 2D', '21:15 - IMAX'],
        'Thứ 4': ['09:00 - 2D', '13:15 - 3D', '16:00 - 2D', '20:30 - IMAX'],
        'Thứ 5': ['10:30 - 2D', '14:00 - 3D', '17:15 - 2D', '21:00 - IMAX'],
        'Thứ 6': ['09:45 - 2D', '13:30 - 3D', '16:45 - 2D', '20:15 - IMAX'],
        'Thứ 7': ['10:00 - 2D', '14:30 - 3D', '18:00 - 2D', '21:30 - IMAX'],
        'Chủ nhật': ['09:30 - 2D', '12:45 - 3D', '16:00 - 2D', '19:15 - IMAX'],
      },
    },
    {
      id: 'hue',
      name: 'Lunexa Movix Huế',
      schedule: {
        'Thứ 2': ['09:00 - 2D', '12:15 - 3D', '15:30 - 2D', '19:00 - IMAX'],
        'Thứ 3': ['10:30 - 2D', '14:00 - 3D', '17:15 - 2D', '20:30 - IMAX'],
        'Thứ 4': ['09:45 - 2D', '13:00 - 3D', '16:30 - 2D', '20:00 - IMAX'],
        'Thứ 5': ['10:00 - 2D', '13:30 - 3D', '17:00 - 2D', '21:00 - IMAX'],
        'Thứ 6': ['09:15 - 2D', '12:45 - 3D', '16:00 - 2D', '19:30 - IMAX'],
        'Thứ 7': ['10:00 - 2D', '13:15 - 3D', '16:45 - 2D', '20:15 - IMAX'],
        'Chủ nhật': ['09:30 - 2D', '13:00 - 3D', '16:30 - 2D', '20:00 - IMAX'],
      },
    },
    {
      id: 'quangngai',
      name: 'Lunexa Movix Quảng Ngãi',
      schedule: {
        'Thứ 2': ['09:15 - 2D', '12:30 - 3D', '16:00 - 2D', '19:15 - IMAX'],
        'Thứ 3': ['10:00 - 2D', '13:45 - 3D', '17:00 - 2D', '20:30 - IMAX'],
        'Thứ 4': ['09:30 - 2D', '14:00 - 3D', '17:30 - 2D', '21:00 - IMAX'],
        'Thứ 5': ['10:15 - 2D', '13:30 - 3D', '17:00 - 2D', '20:45 - IMAX'],
        'Thứ 6': ['09:45 - 2D', '13:00 - 3D', '16:30 - 2D', '19:45 - IMAX'],
        'Thứ 7': ['10:00 - 2D', '14:30 - 3D', '18:00 - 2D', '21:15 - IMAX'],
        'Chủ nhật': ['09:30 - 2D', '13:00 - 3D', '16:30 - 2D', '20:00 - IMAX'],
      },
    },
  ];
  const [activeCinema, setActiveCinema] = useState(cinemas[0].id);
  const [selectedTime, setSelectedTime] = useState(null);
  const currentCinema = cinemas.find((cinema) => cinema.id === activeCinema);
  const showTimes = currentCinema?.schedule[activeDay] ?? [];
  const navigate = useNavigate();

  // Reset selected time when cinema or day changes
  const handleCinemaChange = (id) => {
    setActiveCinema(id);
    setSelectedTime(null);
  };

  const handleDayChange = (day) => {
    setActiveDay(day);
    setSelectedTime(null);
  };

  const handleScheduleClick = (time) => {
    setSelectedTime((prev) => (prev === time ? null : time));
  };

  const handleBookNow = () => {
    navigate('/booking', {
      state: {
        cinema: currentCinema?.name ?? 'Lunexa Movix',
        day: activeDay,
        time: selectedTime,
      },
    });
  };

  const trailerSrc = 'http://localhost:4000/api/trailer';
  const ratingBreakdown = [
    { stars: 5, percent: 82, count: '8.2K' },
    { stars: 4, percent: 28, count: '2.8K' },
    { stars: 3, percent: 11, count: '1.1K' },
  ];
  // gallery display logic: show up to 6 tiles
  // if there are more than 6 images, show first 5 and a 6th tile with +N
  const VISIBLE_LIMIT = 6;
  const totalImages = galleryImages.length;
  const showOverlay = totalImages > VISIBLE_LIMIT;
  const normalCount = showOverlay ? VISIBLE_LIMIT - 1 : Math.min(totalImages, VISIBLE_LIMIT);
  

  return (
    <div className="movie-detail-page">

      {/* ── Banner cố định phía sau, nội dung scroll lên trên ── */}
      <div
        className={`trailer-hero-banner${bannerCollapsed ? ' trailer-hero-banner--hidden' : ''}`}
        onClick={handleStartAudio}
      >
        <video
          ref={videoRef}
          className="trailer-hero-video"
          autoPlay
          muted={isMuted}
          loop
          playsInline
          poster="https://upload.wikimedia.org/wikipedia/vi/0/0e/Little_Star_Wars_2021.jpg"
          src={trailerSrc}
        >
          Trình duyệt của bạn không hỗ trợ video.
        </video>
        <div className="trailer-hero-overlay">
          <div className="trailer-hero-badge"><span>▶</span> Trailer</div>
          {isMuted && <div className="trailer-hero-sound">🔊 Bấm để bật tiếng</div>}
          <div className="trailer-hero-scroll-hint">Cuộn xuống để xem chi tiết ↓</div>
        </div>
      </div>

      {/* ── Nội dung trang, có padding-top = chiều cao banner để scroll overlap ── */}
      <div className="movie-detail-content">

        {/* Gradient fade che banner khi nội dung scroll lên */}
        <div className="trailer-fade-cover" />

        <div className="movie-detail-header">
        <div className="breadcrumb-bar">
          <nav className="breadcrumb">
            <button className="breadcrumb-link" type="button" onClick={() => navigate('/')}>Trang chủ</button>
            <span className="breadcrumb-sep">›</span>
            <button className="breadcrumb-link" type="button" onClick={() => navigate('/movies')}>Phim</button>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Doraemon: Nobita và cuộc chiến vũ trụ tí hon</span>
          </nav>
        </div>
      </div>

      <div className="movie-detail-hero">
        <div className="movie-detail-summary">
          <div className="movie-poster-card">
            <img
              src="https://upload.wikimedia.org/wikipedia/vi/0/0e/Little_Star_Wars_2021.jpg"
              alt="Doraemon Poster"
            />
          </div>

          <div className="movie-detail-info">
            <div className="movie-status"><span className="icon">🎬</span>Đang chiếu</div>
            <h1 className="movie-title">Doraemon: Nobita và cuộc chiến vũ trụ tí hon</h1>

            <div className="movie-rating-row">
              <span className="movie-score"><span className="icon">★</span>4.8/5.0</span>
              <span>1.2K đánh giá</span>
              <span className="movie-favorite">❤ 99% yêu thích</span>
            </div>

            <div className="movie-chips-row">
              <span><span className="icon">⏱</span>101 phút</span>
              <span><span className="icon">🎞</span>Hoạt hình, phiêu lưu</span>
              <span><span className="icon">🌏</span>Nhật Bản</span>
              <span><span className="icon">🔞</span>9+</span>
            </div>

            <div className="movie-meta-grid">
              <div>
                <p>Đạo diễn</p>
                <strong>Tetsuo Yajima</strong>
              </div>
              <div>
                <p>Diễn viên</p>
                <strong>Wasabi Mizuta, Megumi Ohara, Yumi Kakazu, Subaru Kimura, Tomokazu Seki...</strong>
              </div>
              <div>
                <p>Ngày khởi chiếu</p>
                <strong>22/05/2026</strong>
              </div>
              <div>
                <p>Định dạng</p>
                <strong>2D 3D IMAX</strong>
              </div>
              <div>
                <p>Ngôn ngữ</p>
                <strong>Tiếng Nhật - Phụ đề Tiếng Việt / Lồng tiếng Việt</strong>
              </div>
            </div>

            <div className="movie-action-row">
              <button className={`btn-heart ${isFavorite ? 'active' : ''}`} type="button" onClick={() => setIsFavorite((prev) => !prev)}>
                ♥ {isFavorite ? 'Đã thích' : 'Yêu thích'}
              </button>
              <button className="btn-book" type="button" onClick={handleBookClick}><span className="icon">🎟️</span>Đặt vé ngay</button>
            </div>
          </div>
        </div>

        <div className="movie-detail-trailer">
          <div className="trailer-label"><span className="icon">▶</span>Trailer</div>
          <div
            ref={trailerContainerRef}
            className={`trailer-video-container${bannerCollapsed ? ' trailer-fadein' : ''}`}
            onClick={handleStartAudio}
          >
            {bannerCollapsed ? (
              <>
                <video
                  ref={videoRef}
                  className="trailer-video"
                  autoPlay
                  muted={isMuted}
                  loop
                  playsInline
                  poster="https://upload.wikimedia.org/wikipedia/vi/0/0e/Little_Star_Wars_2021.jpg"
                  src={trailerSrc}
                >
                  Trình duyệt của bạn không hỗ trợ video.
                </video>
                {isMuted && (
                  <div className="video-unmute-overlay">Bấm để bật tiếng</div>
                )}
              </>
            ) : (
              <div className="trailer-waiting-poster">
                <img
                  src="https://upload.wikimedia.org/wikipedia/vi/0/0e/Little_Star_Wars_2021.jpg"
                  alt="Trailer"
                />
                <div className="trailer-waiting-hint">↑ Cuộn lên xem trailer</div>
              </div>
            )}
          </div>
          <div className="trailer-category-card">
            <h3><span className="icon">📌</span>Danh mục</h3>
            <div className="category-pill-row">
              <span>Anime</span>
              <span>Gia đình</span>
              <span>Phiêu lưu</span>
            </div>
          </div>
        </div>
      </div>

      <div className="movie-detail-description-full">
        <h2>Nội dung phim</h2>
        <p className="movie-description">
          {displayedDescription}
        </p>
        {shouldShowMore && (
          <button
            type="button"
            className="show-more-btn"
            onClick={() => setShowFullDescription((prev) => !prev)}
          >
            {showFullDescription ? 'Thu gọn' : 'Xem thêm'}
          </button>
        )}
      </div>

      <div className="movie-detail-scoreboard">
        <div className="score-card score-card-large">
          <h3><span className="icon">💬</span>Đánh giá, bình luận từ cộng đồng</h3>
          <div className="review-score-row">
            <div>
              <div className="score-value">4.9</div>
              <div className="score-subtitle">12.4K đánh giá</div>
            </div>
            <div className="rating-legend">99% yêu thích</div>
          </div>
          <div className="rating-breakdown">
            {ratingBreakdown.map((item) => (
              <div className="rating-row" key={item.stars}>
                <div className="rating-row-left">
                  <span className="rating-stars">{item.stars}★</span>
                  <div className="rating-bar">
                    <div className="rating-bar-fill" style={{ '--final-width': `${item.percent}%` }} />
                  </div>
                </div>
                <span className="rating-count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="score-card">
          <h3><span className="icon">✨</span>Ảnh nổi bật</h3>
          <div className="score-gallery">
            {galleryImages.slice(0, normalCount).map((src, idx) => (
              <div className="gallery-item" key={idx} onClick={() => openLightbox(idx)}>
                <img src={src} alt={`Ảnh nổi bật ${idx + 1}`} />
              </div>
            ))}
            {showOverlay && (
              <div
                className="gallery-item gallery-overlay"
                key={normalCount}
                onClick={() => openLightbox(normalCount)}
              >
                <img src={galleryImages[normalCount]} alt={`Ảnh nổi bật ${normalCount + 1}`} />
                <div className="overlay-count">+{totalImages - normalCount}</div>
              </div>
            )}
          </div>
        </div>

      </div>

      {lightboxOpen && (
        <div className="lightbox" onClick={closeLightbox}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="lightbox-close" onClick={closeLightbox}>×</button>
            <button
              type="button"
              className="lightbox-nav prev"
              onClick={prevLightbox}
            >
              ‹
            </button>
            <div className="lightbox-media">
              <img
                className="lightbox-img"
                src={galleryImages[lightboxIndex]}
                alt={`Ảnh ${lightboxIndex + 1}`}
              />
            </div>
            <button
              type="button"
              className="lightbox-nav next"
              onClick={nextLightbox}
            >
              ›
            </button>
          </div>
        </div>
      )}

      <div className="movie-detail-schedule" ref={scheduleRef}>
        <div className="schedule-sidebar">
          <div className="cinema-title"><span className="icon">📅</span>Lịch chiếu</div>
          <ul className={`cinema-list ${showAllCinemas ? 'expanded' : 'collapsed'}`}>
            {(showAllCinemas ? cinemas : cinemas.slice(0, 4)).map((cinema) => (
              <li
                key={cinema.id}
                type="button"
                className={activeCinema === cinema.id ? 'active' : ''}
                onClick={() => handleCinemaChange(cinema.id)}
              >
                {cinema.name}
              </li>
            ))}
          </ul>
          <button
            className="btn-view-all"
            type="button"
            onClick={() => setShowAllCinemas((p) => !p)}
          >
            {showAllCinemas
              ? 'Thu gọn'
              : `Xem tất cả (${Math.min(4, cinemas.length)}/${cinemas.length})`}
          </button>
        </div>

        <div className="schedule-main">
          <div className="schedule-days-row">
            {scheduleDays.map((day) => (
              <button
                key={day}
                type="button"
                className={activeDay === day ? 'active' : ''}
                onClick={() => handleDayChange(day)}
              >
                {scheduleLabel(day)}
              </button>
            ))}
          </div>
          <div className="schedule-result">
            <div className="schedule-result-header">
              <div>
                <p>Rạp</p>
                <strong>{currentCinema?.name}</strong>
              </div>
              <div>
                <p>Ngày</p>
                <strong>{activeDay}</strong>
              </div>
            </div>
            <div className="schedule-times">
              {showTimes.length > 0 ? (
                showTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    className={`time-slot${selectedTime === time ? ' selected' : ''}`}
                    onClick={() => handleScheduleClick(time)}
                  >
                    {time}
                  </button>
                ))
              ) : (
                <div className="schedule-empty">Chưa có lịch cho ngày này.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedTime && (
        <div className="schedule-book-bar">
          <div className="schedule-book-bar-info">
            <span className="schedule-book-bar-label">Suất đã chọn</span>
            <span className="schedule-book-bar-detail">
              {currentCinema?.name} &nbsp;·&nbsp; {activeDay} &nbsp;·&nbsp; <strong>{selectedTime}</strong>
            </span>
          </div>
          <button
            type="button"
            className="btn-book-now"
            onClick={handleBookNow}
          >
            🎟️ Đặt vé ngay
          </button>
        </div>
      )}

      </div>{/* end movie-detail-content */}

      {/* Trailer trong layout — fade in sau khi banner collapse */}
    </div>
  );
}
