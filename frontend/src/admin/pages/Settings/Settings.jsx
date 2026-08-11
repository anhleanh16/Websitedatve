import { useEffect, useState } from "react";
import { saveBannerImage } from "../../../utils/bannerImageStore";

const initialBanners = [
  {
    id: 1,
    title: "Giảm giá mùa hè",
    subtitle: "Mua vé online giảm 20%",
    image: "",
    active: true,
  },
  {
    id: 2,
    title: "Phim mới hot",
    subtitle: "Phát hành vào cuối tuần này",
    image: "",
    active: false,
  },
];

export default function Settings() {
  const [banners, setBanners] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("adminHomeBanners"));
      return Array.isArray(saved) ? saved : initialBanners;
    } catch { return initialBanners; }
  });
  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("adminSystemSettings")) || {
        siteTitle: "Sweetstar Movie", language: "vi", maintenance: false,
        paymentGateway: "zalopay", transactionLimit: "5000000", twoFactor: false, minPassword: "6",
      };
    } catch {
      return { siteTitle: "Sweetstar Movie", language: "vi", maintenance: false, paymentGateway: "zalopay", transactionLimit: "5000000", twoFactor: false, minPassword: "6" };
    }
  });
  const [activePanel, setActivePanel] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    id: null,
    title: "",
    subtitle: "",
    image: "",
    imageKey: "",
    active: true,
  });

  useEffect(() => {
    try {
      // Data URLs can exceed browser storage quotas. Keep their preview only in memory.
      const persistentBanners = banners.map((banner) => ({
        ...banner,
        image: String(banner.image || "").startsWith("data:") ? "" : banner.image,
      }));
      localStorage.setItem("adminHomeBanners", JSON.stringify(persistentBanners));
    } catch {
      setNotice("Không thể lưu ảnh banner trên trình duyệt. Vui lòng dùng ảnh nhỏ hơn.");
    }
  }, [banners]);
  useEffect(() => {
    try {
      localStorage.setItem("adminSystemSettings", JSON.stringify(settings));
    } catch {
      setNotice("Không thể lưu cài đặt trên trình duyệt.");
    }
  }, [settings]);

  const notify = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  };

  const startEdit = (banner) => {
    setForm({
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      image: banner.image || "",
      imageKey: banner.imageKey || "",
      active: banner.active,
    });
  };

  const resetForm = () => {
    setForm({
      id: null,
      title: "",
      subtitle: "",
      image: "",
      imageKey: "",
      active: true,
    });
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, image: reader.result || "" }));
    };
    reader.readAsDataURL(file);
  };

  const saveBanner = async () => {
    if (!form.title.trim() || !form.subtitle.trim()) {
      notify("Vui lòng nhập tiêu đề và mô tả banner.");
      return;
    }

    const id = form.id || Date.now();
    let imageKey = form.imageKey || "";
    if (String(form.image || "").startsWith("data:")) {
      imageKey = `banner-${id}`;
      try {
        await saveBannerImage(imageKey, form.image);
      } catch {
        notify("Không thể lưu ảnh banner.");
        return;
      }
    }
    const bannerData = { ...form, id, imageKey };

    if (form.id) {
      setBanners((current) =>
        current.map((banner) =>
          banner.id === form.id ? { ...banner, ...bannerData } : banner,
        ),
      );
    } else {
      setBanners((current) => [
        ...current,
        {
          ...bannerData,
        },
      ]);
    }

    resetForm();
    notify("Đã lưu banner trang chủ.");
  };

  const deleteBanner = (id) => {
    setBanners((current) => current.filter((banner) => banner.id !== id));
    if (form.id === id) resetForm();
    notify("Đã xóa banner.");
  };

  const saveSettings = () => {
    localStorage.setItem("adminSystemSettings", JSON.stringify(settings));
    notify("Đã lưu cài đặt.");
    setActivePanel("");
  };

  return (
    <div className="admin-settings">
      <section className="banner-management">
        <div className="banner-management-header">
          <div>
            <p className="section-label">Banner</p>
            <h2>Quản lý banner trang chủ</h2>
          </div>
          <button
            className="btn quick-action"
            type="button"
            onClick={resetForm}
          >
            Thêm banner mới
          </button>
        </div>

        <div className="banner-management-grid">
          <div className="banner-list-card">
            <h3>Danh sách banner</h3>
            <div className="banner-list">
              {banners.map((banner) => (
                <div key={banner.id} className="banner-card">
                  <div className="banner-preview">
                    <div className="banner-preview-image">
                      {banner.image ? (
                        <img src={banner.image} alt={banner.title} />
                      ) : (
                        "Hình ảnh"
                      )}
                    </div>
                    <div>
                      <strong>{banner.title}</strong>
                      <p>{banner.subtitle}</p>
                    </div>
                  </div>
                  <div className="banner-actions">
                    <button type="button" onClick={() => startEdit(banner)}>
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteBanner(banner.id)}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="banner-form-card">
            <h3>{form.id ? "Sửa banner" : "Thêm banner mới"}</h3>
            <div className="field-group">
              <label>Tiêu đề banner</label>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="Nhập tiêu đề banner"
              />
            </div>
            <div className="field-group">
              <label>Mô tả ngắn</label>
              <input
                value={form.subtitle}
                onChange={(event) =>
                  setForm({ ...form, subtitle: event.target.value })
                }
                placeholder="Nhập mô tả ngắn"
              />
            </div>
            <div className="field-group">
              <label>Upload hình banner</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
            {form.image && (
              <div className="field-group">
                <label>Preview hình</label>
                <div className="image-preview">
                  <img src={form.image} alt="Banner preview" />
                </div>
              </div>
            )}
            <div className="field-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    setForm({ ...form, active: event.target.checked })
                  }
                />
                Kích hoạt banner
              </label>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn primary"
                onClick={saveBanner}
              >
                {form.id ? "Lưu banner" : "Thêm banner"}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={resetForm}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="setting-grid">
        <div className="setting-card">
          <h3>Cài đặt chung</h3>
          <p>Cập nhật tiêu đề trang, ngôn ngữ và chế độ hiển thị.</p>
          <button type="button" onClick={() => setActivePanel("general")}>Mở cài đặt chung</button>
        </div>
        <div className="setting-card">
          <h3>Cài đặt thanh toán</h3>
          <p>Quản lý cổng thanh toán và giới hạn giao dịch.</p>
          <button type="button" onClick={() => setActivePanel("payment")}>Cấu hình thanh toán</button>
        </div>
        <div className="setting-card">
          <h3>Bảo mật</h3>
          <p>Kích hoạt xác thực hai yếu tố và chính sách mật khẩu.</p>
          <button type="button" onClick={() => setActivePanel("security")}>Kiểm tra bảo mật</button>
        </div>
      </div>

      {activePanel && (
        <section className="setting-card" style={{ marginTop: 20 }}>
          {activePanel === "general" && <>
            <h3>Cài đặt chung</h3>
            <div className="field-group"><label>Tên hệ thống</label><input value={settings.siteTitle} onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })} /></div>
            <div className="field-group"><label>Ngôn ngữ</label><select value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value })}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></div>
            <label className="checkbox-group"><input type="checkbox" checked={settings.maintenance} onChange={(e) => setSettings({ ...settings, maintenance: e.target.checked })} /> Bật chế độ bảo trì</label>
          </>}
          {activePanel === "payment" && <>
            <h3>Cài đặt thanh toán</h3>
            <div className="field-group"><label>Cổng thanh toán mặc định</label><select value={settings.paymentGateway} onChange={(e) => setSettings({ ...settings, paymentGateway: e.target.value })}><option value="zalopay">ZaloPay</option><option value="vnpay">VNPay</option><option value="momo">MoMo</option><option value="cashier">Thanh toán tại quầy</option></select></div>
            <div className="field-group"><label>Giới hạn giao dịch (VNĐ)</label><input type="number" min="0" value={settings.transactionLimit} onChange={(e) => setSettings({ ...settings, transactionLimit: e.target.value })} /></div>
          </>}
          {activePanel === "security" && <>
            <h3>Bảo mật</h3>
            <div className="field-group"><label>Độ dài mật khẩu tối thiểu</label><input type="number" min="6" value={settings.minPassword} onChange={(e) => setSettings({ ...settings, minPassword: e.target.value })} /></div>
            <label className="checkbox-group"><input type="checkbox" checked={settings.twoFactor} onChange={(e) => setSettings({ ...settings, twoFactor: e.target.checked })} /> Yêu cầu xác thực hai yếu tố cho quản trị viên</label>
          </>}
          {activePanel === "notification" && <>
            <h3>Gửi thông báo</h3><p>Chuyển sang trang Thông báo để soạn và gửi thông báo đến người dùng.</p>
            <button type="button" className="btn primary" onClick={() => { window.location.assign("/admin/notifications"); }}>Mở trang Thông báo</button>
          </>}
          {activePanel !== "notification" && <div className="form-actions"><button type="button" className="btn primary" onClick={saveSettings}>Lưu cài đặt</button><button type="button" className="btn secondary" onClick={() => setActivePanel("")}>Hủy</button></div>}
        </section>
      )}
      {notice && <div className="sf-toast">{notice}<button type="button" onClick={() => setNotice("")}>×</button></div>}
    </div>
  );
}
