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
const newsUploadDir = path.join(__dirname, "../uploads/news");
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
if (!fs.existsSync(newsUploadDir)) {
  fs.mkdirSync(newsUploadDir, { recursive: true });
}
if (!fs.existsSync(staffUploadDir)) {
  fs.mkdirSync(staffUploadDir, { recursive: true });
}

// Cấu hình storage chung, phân biệt dựa trên fieldname
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "posters") {
      cb(null, moviesUploadDir);
    } else if (file.fieldname === "trailer") {
      cb(null, trailersUploadDir);
    } else if (file.fieldname === "image") {
      // For cinema images
      cb(null, cinemasUploadDir);
    } else if (file.fieldname === "thumbnailFile") {
      cb(null, newsUploadDir);
    } else if (file.fieldname === "avatar") {
      // For staff avatars
      cb(null, staffUploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    if (file.fieldname === "posters") {
      cb(null, "poster-" + uniqueSuffix + path.extname(file.originalname));
    } else if (file.fieldname === "trailer") {
      cb(null, "trailer-" + uniqueSuffix + path.extname(file.originalname));
    } else if (file.fieldname === "image") {
      cb(null, "cinema-" + uniqueSuffix + path.extname(file.originalname));
    } else if (file.fieldname === "thumbnailFile") {
      cb(null, "news-" + uniqueSuffix + path.extname(file.originalname));
    } else if (file.fieldname === "avatar") {
      cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
    }
  },
});

// Filter file chung, phân biệt dựa trên fieldname
const fileFilter = (req, file, cb) => {
  if (
    file.fieldname === "posters" ||
    file.fieldname === "image" ||
    file.fieldname === "thumbnailFile" ||
    file.fieldname === "avatar"
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
  } else if (file.fieldname === "trailer") {
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
      // Ignore all multer errors and just continue, because we might not even be uploading files (just a YouTube link)
      console.log("Ignoring multer error, continuing with request...");
      // Make sure req.files is an empty array if there's an error
      if (!req.files) req.files = [];
      return next();
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
