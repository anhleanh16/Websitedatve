import { ComboModel } from "../models/comboModel.js";

const getStatusCode = (error) => Number(error?.statusCode || 500);

const normalizeUploadedComboImage = (file) => {
  if (!file) return null;
  return `/uploads/combos/${file.filename}`.replace(/\\/g, "/");
};

const getUploadedComboImage = (req) => {
  if (req.file) return req.file;
  if (!req.files) return null;

  const files = Array.isArray(req.files)
    ? req.files
    : Object.values(req.files).flat();
  return files.find((file) => ["imageFile", "comboImage", "image"].includes(file.fieldname)) || null;
};

const normalizeComboImageValue = (uploadedFile, bodyImage, fallbackImage = "") => {
  const uploadedPath = normalizeUploadedComboImage(uploadedFile);
  if (uploadedPath) return uploadedPath;

  const bodyValue = typeof bodyImage === "string" ? bodyImage.trim() : "";
  if (bodyValue) return bodyValue;

  return fallbackImage || "";
};

export const getAdminCombos = async (req, res) => {
  try {
    const combos = await ComboModel.findAll({
      search: req.query.search,
      status: req.query.status,
      category: req.query.category,
    });
    res.json({ combos });
  } catch (error) {
    console.error("Error in getAdminCombos:", error);
    res
      .status(getStatusCode(error))
      .json({ message: error.message || "Không thể tải danh sách combo", combos: [] });
  }
};

export const getAdminComboById = async (req, res) => {
  try {
    const combo = await ComboModel.findById(req.params.id);
    if (!combo) {
      return res.status(404).json({ message: "Không tìm thấy combo" });
    }
    res.json({ combo });
  } catch (error) {
    console.error(`Error in getAdminComboById ${req.params.id}:`, error);
    res
      .status(getStatusCode(error))
      .json({ message: error.message || "Không thể tải chi tiết combo" });
  }
};

export const createAdminCombo = async (req, res) => {
  try {
    const payload = {
      ...(req.body || {}),
      image: normalizeComboImageValue(getUploadedComboImage(req), req.body?.image),
    };
    const combo = await ComboModel.create(payload);
    res.status(201).json({ message: "Tạo combo thành công", combo });
  } catch (error) {
    console.error("Error in createAdminCombo:", error);
    res
      .status(getStatusCode(error))
      .json({ message: error.message || "Không thể tạo combo" });
  }
};

export const updateAdminCombo = async (req, res) => {
  try {
    const currentCombo = await ComboModel.findById(req.params.id);
    const payload = {
      ...(req.body || {}),
      image: normalizeComboImageValue(getUploadedComboImage(req), req.body?.image, currentCombo?.image || ""),
    };
    const combo = await ComboModel.update(req.params.id, payload);
    if (!combo) {
      return res.status(404).json({ message: "Không tìm thấy combo để cập nhật" });
    }
    res.json({ message: "Cập nhật combo thành công", combo });
  } catch (error) {
    console.error(`Error in updateAdminCombo ${req.params.id}:`, error);
    res
      .status(getStatusCode(error))
      .json({ message: error.message || "Không thể cập nhật combo" });
  }
};

export const deleteAdminCombo = async (req, res) => {
  try {
    const result = await ComboModel.delete(req.params.id);
    if (!result.deleted && !result.deactivated) {
      return res.status(404).json({ message: "Không tìm thấy combo để xóa" });
    }

    res.json({
      message: result.deactivated
        ? "Combo đã từng được sử dụng nên được chuyển sang ngừng bán"
        : "Xóa combo thành công",
      ...result,
    });
  } catch (error) {
    console.error(`Error in deleteAdminCombo ${req.params.id}:`, error);
    res
      .status(getStatusCode(error))
      .json({ message: error.message || "Không thể xóa combo" });
  }
};
