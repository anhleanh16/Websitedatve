import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import './MovieDetail.css';

export default function MovieDetail() {
  const selectedRegion = useSelector((state) => state.region.selectedRegion);
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
  const videoRef = useRef(null); // For hero banner trailer
  const pageSmallTrailerRef = useRef(null); // For small trailer in page
  const modalSmallTrailerRef = useRef(null); // For small trailer in modal
  const trailerContainerRef = useRef(null);
  const bookBarRef = useRef(null);
  const [bannerOpacity, setBannerOpacity] = useState(1);
  const [smallTrailerPlaying, setSmallTrailerPlaying] = useState(false);
  const [smallTrailerMuted, setSmallTrailerMuted] = useState(true);
  const [isSmallTrailerFullscreen, setIsSmallTrailerFullscreen] = useState(false);

  // Reset về đầu trang khi mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fade banner khi scroll
  useEffect(() => {
    const getBannerHeight = () => Math.min(window.innerWidth * 0.5, 520);
    const onScroll = () => {
      const scrolled = window.scrollY;
      const bannerH = getBannerHeight();
      // Trailer càng lướt lên càng mờ
      const opacity = Math.max(0, 1 - (scrolled / (bannerH * 0.7)));
      setBannerOpacity(opacity);
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

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
      video.play().catch(() => {});
    }
  };

  // Small trailer handlers
  const handleSmallTrailerClick = () => {
    // Update both videos
    const pageVideo = pageSmallTrailerRef.current;
    const modalVideo = modalSmallTrailerRef.current;
    if (smallTrailerPlaying) {
      if (pageVideo) pageVideo.pause();
      if (modalVideo) modalVideo.pause();
      setSmallTrailerPlaying(false);
    } else {
      if (pageVideo) pageVideo.play();
      if (modalVideo) modalVideo.play();
      setSmallTrailerPlaying(true);
    }
  };

  const handleSmallTrailerToggleMute = (e) => {
    e.stopPropagation();
    const newMuted = !smallTrailerMuted;
    // Update both videos
    const pageVideo = pageSmallTrailerRef.current;
    const modalVideo = modalSmallTrailerRef.current;
    if (pageVideo) pageVideo.muted = newMuted;
    if (modalVideo) modalVideo.muted = newMuted;
    setSmallTrailerMuted(newMuted);
  };

  const handleSmallTrailerToggleFullscreen = (e) => {
    e.stopPropagation();
    setIsSmallTrailerFullscreen(!isSmallTrailerFullscreen);
  };

  // Sync video currentTime when modal opens/closes and manage playback
  useEffect(() => {
    if (isSmallTrailerFullscreen) {
      // When modal opens: pause page video, play modal video
      const syncToModal = () => {
        const pageVideo = pageSmallTrailerRef.current;
        const modalVideo = modalSmallTrailerRef.current;
        if (pageVideo && modalVideo) {
          modalVideo.currentTime = pageVideo.currentTime;
          // Pause page video
          pageVideo.pause();
          // Play modal video if it was playing before
          if (smallTrailerPlaying) {
            modalVideo.play().catch(() => {});
          }
        }
      };
      // Wait a bit for modal video to render
      setTimeout(syncToModal, 50);
    } else {
      // When modal closes: pause modal video, play page video
      const pageVideo = pageSmallTrailerRef.current;
      const modalVideo = modalSmallTrailerRef.current;
      if (pageVideo && modalVideo) {
        pageVideo.currentTime = modalVideo.currentTime;
        // Pause modal video
        modalVideo.pause();
        // Play page video if it was playing before
        if (smallTrailerPlaying) {
          pageVideo.play().catch(() => {});
        }
      }
    }
  }, [isSmallTrailerFullscreen, smallTrailerPlaying]);

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
        'Thứ 3': ['10:00 - 2D', '13:45 - 3D', '17:00 - 2D', '20:45 - IMAX'],
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

  // Kiểm tra thời gian Việt Nam hiện tại
  const isTimePast = (timeStr, dayLabel) => {
    // Chỉ kiểm tra nếu là hôm nay
    if (dayLabel !== todayLabel) return false;
    
    // Lấy giờ phút từ timeStr (vd: '09:00 - 2D)
    const [hourStr] = timeStr.split(' - ');
    const [hour, minute] = hourStr.split(':').map(Number);
    
    // Lấy giờ Việt Nam hiện tại
    const now = new Date();
    // Chuyển sang múi giờ Việt Nam (UTC+7)
    const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const currentHour = vietnamTime.getHours();
    const currentMinute = vietnamTime.getMinutes();
    
    // So sánh
    if (hour < currentHour) return true;
    if (hour === currentHour && minute <= currentMinute) return true;
    
    return false;
  };

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
    // Không cho chọn nếu thời gian đã qua
    if (isTimePast(time, activeDay)) return;
    setSelectedTime((prev) => (prev === time ? null : time));
  };

  const handleBookNow = () => {
    navigate('/booking', {
      state: {
        cinema: currentCinema?.name ?? 'Lunexa Movix',
        day: scheduleLabel(activeDay),
        time: selectedTime,
      },
    });
  };

  // Scroll xuống booking bar khi chọn giờ - ĐẶT SAU KHI KHAI BÁO selectedTime
  useEffect(() => {
    if (selectedTime && bookBarRef.current) {
      bookBarRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedTime]);

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
        className="trailer-hero-banner"
        style={{ opacity: bannerOpacity }}
      >
        <video
          ref={videoRef}
          className="trailer-hero-video"
          autoPlay
          muted
          loop
          playsInline
          poster="https://upload.wikimedia.org/wikipedia/vi/0/0e/Little_Star_Wars_2021.jpg"
          src={trailerSrc}
        >
          Trình duyệt của bạn không hỗ trợ video.
        </video>
        <div className="trailer-hero-overlay">
          <div className="trailer-hero-badge"><span>▶</span> Trailer</div>
          <div className="trailer-hero-scroll-hint">Cuộn xuống để xem chi tiết ↓</div>
        </div>
      </div>

      {/* Nội dung trang, có padding-top = chiều cao banner để scroll overlap ── */}
      <div className="movie-detail-content">

        {/* Gradient fade che banner khi nội dung scroll lên */}
        <div className="trailer-fade-cover" />

        <div className="movie-detail-content-inner">
          <div className="movie-detail-header">
            <button className="mobile-back-btn" type="button" onClick={() => navigate('/')}>
              ←
            </button>
            <div className="breadcrumb-bar">
              <nav className="breadcrumb">
                <button className="breadcrumb-link" type="button" onClick={() => navigate('/')}>Trang chủ</button>
                <span className="breadcrumb-sep">›</span>
                <button className="breadcrumb-link" type="button" onClick={() => navigate('/films')}>Phim</button>
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
                  <span><span className="icon">🌍</span>Nhật Bản</span>
                  <span><span className="icon">🔞</span>9+</span>
                </div>

                <div className="movie-meta-grid">
                  <div className="movie-meta-column">
                    <div className="movie-meta-row">
                      <p>Khởi chiếu</p>
                      <strong>22/05/2026</strong>
                    </div>
                    <div className="movie-meta-row">
                      <p>Định dạng</p>
                      <strong>2D 3D IMAX</strong>
                    </div>
                  </div>
                  <div className="movie-meta-column">
                    <div className="movie-meta-row">
                      <p>Đạo diễn</p>
                      <strong>Tetsuo Yajima</strong>
                    </div>
                    <div className="movie-meta-row">
                      <p>Diễn viên</p>
                      <strong>Wasabi Mizuta, Megumi Ohara...</strong>
                    </div>
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
                className="trailer-video-container"
                onClick={handleSmallTrailerClick}
              >
                <video
                  ref={pageSmallTrailerRef}
                  className="trailer-video"
                  muted={smallTrailerMuted}
                  loop
                  playsInline
                  poster="data:image/jpeg;base64,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"
                  src={trailerSrc}
                >
                  Trình duyệt của bạn không hỗ trợ video.
                </video>
                {/* Play/Pause overlay button */}
                {!smallTrailerPlaying && (
                  <div className="trailer-play-button">
                    ▶
                  </div>
                )}
                {/* Mute/Unmute button */}
                <button
                  type="button"
                  className="trailer-mute-btn small-trailer-mute-btn"
                  onClick={handleSmallTrailerToggleMute}
                  aria-label={smallTrailerMuted ? 'Bật tiếng' : 'Tắt tiếng'}
                >
                  {smallTrailerMuted ? '🔇' : '🔊'}
                </button>
                {/* Fullscreen button */}
                <button
                  type="button"
                  className="trailer-fullscreen-btn"
                  onClick={handleSmallTrailerToggleFullscreen}
                  aria-label={isSmallTrailerFullscreen ? 'Thoát toàn màn hình' : 'Phóng to toàn màn hình'}
                >
                  {isSmallTrailerFullscreen ? '↩️' : '⛶'}
                </button>
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

          {isSmallTrailerFullscreen && (
            <div className="trailer-modal-overlay" onClick={() => setIsSmallTrailerFullscreen(false)}>
              <div className="trailer-modal-content" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="trailer-modal-close"
                  onClick={() => setIsSmallTrailerFullscreen(false)}
                >
                  ×
                </button>
                <div className="trailer-modal-video-container">
                  <video
                    ref={modalSmallTrailerRef}
                    className="trailer-modal-video"
                    muted={smallTrailerMuted}
                    loop
                    playsInline
                    autoPlay={smallTrailerPlaying}
                    poster="https://upload.wikimedia.org/wikipedia/vi/0/0e/Little_Star_Wars_2021.jpg"
                    src={trailerSrc}
                    onLoadedMetadata={() => {
                      // Sync when modal video is ready
                      const pageVideo = pageSmallTrailerRef.current;
                      const modalVideo = modalSmallTrailerRef.current;
                      if (pageVideo && modalVideo) {
                        modalVideo.currentTime = pageVideo.currentTime;
                      }
                    }}
                  >
                    Trình duyệt của bạn không hỗ trợ video.
                  </video>
                  {/* Play/Pause overlay button */}
                  {!smallTrailerPlaying && (
                    <div className="trailer-modal-play-button" onClick={handleSmallTrailerClick}>
                      ▶
                    </div>
                  )}
                  {/* Mute/Unmute button */}
                  <button
                    type="button"
                    className="trailer-modal-mute-btn"
                    onClick={handleSmallTrailerToggleMute}
                    aria-label={smallTrailerMuted ? 'Bật tiếng' : 'Tắt tiếng'}
                  >
                    {smallTrailerMuted ? '🔇' : '🔊'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="movie-detail-schedule" ref={scheduleRef}>
            <div className="schedule-sidebar">
              <div className="cinema-title"><span className="icon">📅</span>Lịch chiếu</div>
              <ul className={`cinema-list ${showAllCinemas ? 'expanded' : 'collapsed'}`} ref={cinemaListRef}>
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
                    showTimes.map((time) => {
                      const past = isTimePast(time, activeDay);
                      return (
                        <button
                          key={time}
                          type="button"
                          className={`time-slot${selectedTime === time ? ' selected' : ''}${past ? ' past' : ''}`}
                          onClick={() => handleScheduleClick(time)}
                          disabled={past}
                        >
                          {time}
                        </button>
                      );
                    })
                  ) : (
                    <div className="schedule-empty">Chưa có lịch cho ngày này.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {selectedTime && (
            <div ref={bookBarRef} className="schedule-book-bar">
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
        </div>
      </div>{/* end movie-detail-content */}

    </div>
  );
}
