import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đảm bảo các thư mục upload tồn tại
const moviesUploadDir = path.join(__dirname, "../uploads/movies");
const trailersUploadDir = path.join(__dirname, "../uploads/trailers");
const cinemasUploadDir = path.join(__dirname, "../uploads/cinemas");
const combosUploadDir = path.join(__dirname, "../uploads/combos");
const newsUploadDir = path.join(__dirname, "../uploads/news");
const newsInlineUploadDir = path.join(__dirname, "../uploads/news/inline");
const staffUploadDir = path.join(__dirname, "../uploads/staff");

if (!fs.existsSync(moviesUploadDir)) {
  fs.mkdirSync(moviesUploadDir, { recursive: true });
}
if (!fs.existsSync(trailersUploadDir)) {
  fs.mkdirSync(trailersUploadDir, { recursive: true });
}
if (!fs.existsSync(cinemasUploadDir)) {
  fs.mkdirSync(cinemasUploadDir, { recursive: true });
}
if (!fs.existsSync(combosUploadDir)) {
  fs.mkdirSync(combosUploadDir, { recursive: true });
}
if (!fs.existsSync(newsUploadDir)) {
  fs.mkdirSync(newsUploadDir, { recursive: true });
}
if (!fs.existsSync(newsInlineUploadDir)) {
  fs.mkdirSync(newsInlineUploadDir, { recursive: true });
}
if (!fs.existsSync(staffUploadDir)) {
  fs.mkdirSync(staffUploadDir, { recursive: true });
}

// Cấu hình storage chung, phân biệt dựa trên fieldname
const isCkeditorInlineUploadRoute = (req) => {
  const url = String(req?.originalUrl || "");
  return /\/admin\/upload\/ckeditor-image$/.test(url) || /\/news\/upload-image$/.test(url);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const field = file.fieldname;

    if (isCkeditorInlineUploadRoute(req)) {
      return cb(null, newsInlineUploadDir);
    }

    if (field === "posters") {
      cb(null, moviesUploadDir);
    } else if (field === "trailer") {
      cb(null, trailersUploadDir);
    } else if (field === "image") {
      // For cinema images
      cb(null, cinemasUploadDir);
    } else if (field === "comboImage" || field === "imageFile") {
      cb(null, combosUploadDir);
    } else if (field === "thumbnailFile") {
      cb(null, newsUploadDir);
    } else if (["upload", "file"].includes(field)) {
      // CKEditor inline images (inserted inside news body)
      cb(null, newsInlineUploadDir);
    } else if (["avatar", "idCardFront", "idCardBack"].includes(field)) {
      // For staff avatars
      cb(null, staffUploadDir);
    } else {
      cb(null, newsInlineUploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const field = file.fieldname;

    if (isCkeditorInlineUploadRoute(req)) {
      return cb(null, "news-inline-" + uniqueSuffix + path.extname(file.originalname));
    }

    if (field === "posters") {
      cb(null, "poster-" + uniqueSuffix + path.extname(file.originalname));
    } else if (field === "trailer") {
      cb(null, "trailer-" + uniqueSuffix + path.extname(file.originalname));
    } else if (field === "image") {
      cb(null, "cinema-" + uniqueSuffix + path.extname(file.originalname));
    } else if (field === "comboImage" || field === "imageFile") {
      cb(null, "combo-" + uniqueSuffix + path.extname(file.originalname));
    } else if (field === "thumbnailFile") {
      cb(null, "news-" + uniqueSuffix + path.extname(file.originalname));
    } else if (["upload", "file"].includes(field)) {
      cb(null, "news-inline-" + uniqueSuffix + path.extname(file.originalname));
    } else if (field === "avatar") {
      cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
    } else if (field === "idCardFront") {
      cb(null, "cccd-front-" + uniqueSuffix + path.extname(file.originalname));
    } else if (field === "idCardBack") {
      cb(null, "cccd-back-" + uniqueSuffix + path.extname(file.originalname));
    } else {
      cb(null, "news-inline-" + uniqueSuffix + path.extname(file.originalname));
    }
  },
});

// Filter file chung, phân biệt dựa trên fieldname
const fileFilter = (req, file, cb) => {
  const field = file.fieldname;

  if (isCkeditorInlineUploadRoute(req)) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    return cb(new Error("Chỉ cho phép file ảnh (jpeg, jpg, png, gif, webp)!"));
  }

  if (
    field === "posters" ||
    field === "image" ||
    field === "comboImage" ||
    field === "imageFile" ||
    field === "thumbnailFile" ||
    field === "upload" ||
    field === "file" ||
    ["avatar", "idCardFront", "idCardBack"].includes(field)
  ) {
    // Gộp filter cho ảnh
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Chỉ cho phép file ảnh (jpeg, jpg, png, gif, webp)!"));
    }
  } else if (field === "trailer") {
    const allowedTypes = /mp4|webm|ogg/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Chỉ cho phép file video (mp4, webm, ogg)!"));
    }
  } else {
    cb(new Error("Loại file không được hỗ trợ!"));
  }
};

// Multer instance cho cả poster và trailer
export const uploadMovieFiles = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB mỗi file
}).fields([
  { name: "posters", maxCount: 12 },
  { name: "trailer", maxCount: 1 },
]);

// Tạo một wrapper để xử lý lỗi unexpected field một cách nhẹ nhàng
export const uploadMovieFilesMiddleware = (req, res, next) => {
  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 },
  }).any(); // Accept any files, we'll filter them manually
  
  upload(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({
        message: err.code === "LIMIT_FILE_SIZE"
          ? "Tệp tải lên vượt quá dung lượng cho phép."
          : err.message || "Tệp tải lên không hợp lệ.",
      });
    }
    next();
  });
};

// Multer instance for cinema image
export const uploadCinemaImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for cinema images
});

export const uploadComboImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadNewsImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadStaffAvatar = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for staff avatars
});

// Multer instance for CKEditor inline news-body images (field name = "upload", standard CKEditor format)
export const uploadCkeditorNewsImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per inline image
});

export const uploadCkeditorNewsImageAny = (req, res, next) => {
  uploadCkeditorNewsImage.any()(req, res, (err) => {
    if (err) {
      return next(err);
    }
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length && !req.file) {
      req.file = files[0];
    }
    next();
  });
};
