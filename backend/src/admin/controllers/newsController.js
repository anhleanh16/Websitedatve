import { NewsModel } from "../models/newsModel.js";

const normalizeUploadedThumbnail = (file) => {
  if (!file) return null;
  return `/uploads/news/${file.filename}`.replace(/\\/g, "/");
};

export const getAdminNews = async (req, res) => {
  try {
    const news = await NewsModel.findAll(req.query || {});
    res.json({ news });
  } catch (error) {
    console.error("Error in getAdminNews:", error);
    res.status(500).json({ message: "Không thể tải danh sách tin tức.", news: [] });
  }
};

export const getAdminNewsById = async (req, res) => {
  try {
    const item = await NewsModel.findById(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }
    res.json({ news: item });
  } catch (error) {
    console.error("Error in getAdminNewsById:", error);
    res.status(500).json({ message: "Không thể tải chi tiết bài viết." });
  }
};

export const createAdminNews = async (req, res) => {
  try {
    const payload = {
      ...(req.body || {}),
      thumbnail: normalizeUploadedThumbnail(req.file) || req.body?.thumbnail || "",
    };
    const newsId = await NewsModel.create(payload, req.userId);
    res.status(201).json({ message: "Tạo bài viết thành công.", newsId });
  } catch (error) {
    console.error("Error in createAdminNews:", error);
    res.status(500).json({ message: error.message || "Không thể tạo bài viết." });
  }
};

export const updateAdminNews = async (req, res) => {
  try {
    const payload = {
      ...(req.body || {}),
      thumbnail: normalizeUploadedThumbnail(req.file) || req.body?.thumbnail || "",
    };
    const success = await NewsModel.update(Number(req.params.id), payload);
    if (!success) {
      return res.status(404).json({ message: "Không tìm thấy bài viết để cập nhật." });
    }
    res.json({ message: "Cập nhật bài viết thành công." });
  } catch (error) {
    console.error("Error in updateAdminNews:", error);
    res.status(500).json({ message: error.message || "Không thể cập nhật bài viết." });
  }
};

export const deleteAdminNews = async (req, res) => {
  try {
    const success = await NewsModel.delete(Number(req.params.id));
    if (!success) {
      return res.status(404).json({ message: "Không tìm thấy bài viết để xóa." });
    }
    res.json({ message: "Đã xóa bài viết." });
  } catch (error) {
    console.error("Error in deleteAdminNews:", error);
    res.status(500).json({ message: "Không thể xóa bài viết." });
  }
};
