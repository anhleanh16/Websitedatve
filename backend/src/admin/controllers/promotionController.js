import { NotificationModel } from "../models/notificationModel.js";
import { PromotionModel } from "../models/promotionModel.js";

const couponNotificationContent = (payload) =>
  `${payload.title || payload.code}: ${payload.desc || payload.description || "Khuyen mai moi da duoc kich hoat."}`;

const voucherNotificationContent = (payload) =>
  `${payload.title || payload.code}: ${payload.desc || payload.description || "Ban vua nhan duoc mot voucher moi."}`;

export const getAdminPromotions = async (req, res) => {
  try {
    const [coupons, vouchers] = await Promise.all([
      PromotionModel.findCoupons(),
      PromotionModel.findVouchers(),
    ]);
    res.json({ coupons, vouchers });
  } catch (error) {
    console.error("Error in getAdminPromotions:", error);
    res.status(500).json({ message: "Không thể tải dữ liệu khuyến mãi." });
  }
};

export const getPromotionRecipients = async (req, res) => {
  try {
    const users = await PromotionModel.getRecipientUsers();
    res.json({ users });
  } catch (error) {
    console.error("Error in getPromotionRecipients:", error);
    res.status(500).json({ message: "Không thể tải danh sách người dùng." });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const payload = { ...(req.body || {}), createdBy: req.userId || null };
    const promotionId = await PromotionModel.createCoupon(payload);

    if ((payload.status || "active") === "active") {
      await NotificationModel.createAndSend({
        title: payload.title || `Khuyến mãi ${payload.code || ""}`.trim(),
        content: couponNotificationContent(payload),
        type: "promo",
        audienceScope: "all",
        recipientIds: [],
        createdBy: req.userId || null,
      });
    }

    res.status(201).json({ message: "Tạo mã khuyến mãi thành công.", promotionId });
  } catch (error) {
    console.error("Error in createCoupon:", error);
    res.status(500).json({ message: "Không thể tạo mã khuyến mãi." });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const success = await PromotionModel.updateCoupon(req.params.id, req.body || {});
    if (!success) {
      return res.status(404).json({ message: "Không tìm thấy mã khuyến mãi." });
    }
    res.json({ message: "Cập nhật mã khuyến mãi thành công." });
  } catch (error) {
    console.error("Error in updateCoupon:", error);
    res.status(500).json({ message: "Không thể cập nhật mã khuyến mãi." });
  }
};

export const createVoucher = async (req, res) => {
  try {
    const payload = { ...(req.body || {}), createdBy: req.userId || null };
    const promotionId = await PromotionModel.createVoucher(payload);

    if (payload.userId) {
      await NotificationModel.createAndSend({
        title: payload.title || `Voucher ${payload.code || ""}`.trim(),
        content: voucherNotificationContent(payload),
        type: "promo",
        audienceScope: "selected",
        recipientIds: [payload.userId],
        createdBy: req.userId || null,
      });
    }

    res.status(201).json({ message: "Cấp voucher thành công.", promotionId });
  } catch (error) {
    console.error("Error in createVoucher:", error);
    res.status(500).json({ message: "Không thể cấp voucher." });
  }
};

export const updateVoucher = async (req, res) => {
  try {
    const success = await PromotionModel.updateVoucher(req.params.id, req.body || {});
    if (!success) {
      return res.status(404).json({ message: "Không tìm thấy voucher." });
    }
    res.json({ message: "Cập nhật voucher thành công." });
  } catch (error) {
    console.error("Error in updateVoucher:", error);
    res.status(500).json({ message: "Không thể cập nhật voucher." });
  }
};

export const deletePromotion = async (req, res) => {
  try {
    const success = await PromotionModel.deletePromotion(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Không tìm thấy khuyến mãi." });
    }
    res.json({ message: "Đã xóa khuyến mãi." });
  } catch (error) {
    console.error("Error in deletePromotion:", error);
    res.status(500).json({ message: "Không thể xóa khuyến mãi." });
  }
};
