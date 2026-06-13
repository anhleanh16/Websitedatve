import { useState } from "react";

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
  const [banners, setBanners] = useState(initialBanners);
  const [form, setForm] = useState({
    id: null,
    title: "",
    subtitle: "",
    image: "",
    active: true,
  });

  const startEdit = (banner) => {
    setForm({
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      image: banner.image || "",
      active: banner.active,
    });
  };

  const resetForm = () => {
    setForm({
      id: null,
      title: "",
      subtitle: "",
      image: "",
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

  const saveBanner = () => {
    if (!form.title.trim() || !form.subtitle.trim()) {
      return;
    }

    if (form.id) {
      setBanners((current) =>
        current.map((banner) =>
          banner.id === form.id ? { ...banner, ...form } : banner,
        ),
      );
    } else {
      setBanners((current) => [
        ...current,
        {
          ...form,
          id: Date.now(),
        },
      ]);
    }

    resetForm();
  };

  const deleteBanner = (id) => {
    setBanners((current) => current.filter((banner) => banner.id !== id));
    if (form.id === id) resetForm();
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
          <button>Mở cài đặt chung</button>
        </div>
        <div className="setting-card">
          <h3>Cài đặt thanh toán</h3>
          <p>Quản lý cổng thanh toán và giới hạn giao dịch.</p>
          <button>Cấu hình thanh toán</button>
        </div>
        <div className="setting-card">
          <h3>Bảo mật</h3>
          <p>Kích hoạt xác thực hai yếu tố và chính sách mật khẩu.</p>
          <button>Kiểm tra bảo mật</button>
        </div>
        <div className="setting-card">
          <h3>Hành động nhanh</h3>
          <div className="quick-actions">
            <button className="quick-action">Xóa cache</button>
            <button className="quick-action">Gửi thông báo</button>
            <button className="quick-action">Đồng bộ DB</button>
          </div>
        </div>
      </div>
    </div>
  );
}
