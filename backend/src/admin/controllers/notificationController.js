import { NotificationModel } from "../models/notificationModel.js";

export const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await NotificationModel.findAllForAdmin();
    res.json({ notifications });
  } catch (error) {
    console.error("Error in getAdminNotifications:", error);
    res.status(500).json({ message: "Không thể tải danh sách thông báo." });
  }
};

export const getAdminNotificationDetail = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    const [notification, recipients] = await Promise.all([
      NotificationModel.findByIdForAdmin(notificationId),
      NotificationModel.findRecipientsByNotificationId(notificationId),
    ]);

    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo." });
    }

    res.json({ notification, recipients });
  } catch (error) {
    console.error("Error in getAdminNotificationDetail:", error);
    res.status(500).json({ message: "Không thể tải chi tiết thông báo." });
  }
};

export const getNotificationRecipients = async (req, res) => {
  try {
    const users = await NotificationModel.getRecipientUsers();
    res.json({ users });
  } catch (error) {
    console.error("Error in getNotificationRecipients:", error);
    res.status(500).json({ message: "Không thể tải danh sách người nhận." });
  }
};

export const createAdminNotification = async (req, res) => {
  try {
    const {
      title,
      content,
      type = "system",
      audienceScope = "all",
      recipientIds = [],
    } = req.body || {};

    if (!String(title || "").trim()) {
      return res.status(400).json({ message: "Tiêu đề thông báo là bắt buộc." });
    }

    if (!String(content || "").trim()) {
      return res.status(400).json({ message: "Nội dung thông báo là bắt buộc." });
    }

    if (
      audienceScope === "selected" &&
      (!Array.isArray(recipientIds) || recipientIds.length === 0)
    ) {
      return res.status(400).json({
        message: "Vui lòng chọn ít nhất một người dùng để gửi thông báo.",
      });
    }

    const result = await NotificationModel.createAndSend({
      title: String(title).trim(),
      content: String(content).trim(),
      type,
      audienceScope,
      recipientIds,
      createdBy: req.userId || null,
    });

    res.status(201).json({
      message: "Gửi thông báo thành công.",
      ...result,
    });
  } catch (error) {
    console.error("Error in createAdminNotification:", error);
    res.status(500).json({ message: "Không thể gửi thông báo." });
  }
};

export const updateAdminNotification = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    const { title, content, type = "system" } = req.body || {};

    if (!String(title || "").trim()) {
      return res.status(400).json({ message: "Tiêu đề thông báo là bắt buộc." });
    }

    if (!String(content || "").trim()) {
      return res.status(400).json({ message: "Nội dung thông báo là bắt buộc." });
    }

    const success = await NotificationModel.updateForAdmin(notificationId, {
      title: String(title).trim(),
      content: String(content).trim(),
      type,
    });

    if (!success) {
      return res.status(404).json({ message: "Không tìm thấy thông báo." });
    }

    res.json({ message: "Cập nhật thông báo thành công." });
  } catch (error) {
    console.error("Error in updateAdminNotification:", error);
    res.status(500).json({ message: "Không thể cập nhật thông báo." });
  }
};

export const deleteAdminNotification = async (req, res) => {
  try {
    const success = await NotificationModel.deleteForAdmin(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Không tìm thấy thông báo." });
    }
    res.json({ message: "Đã xóa thông báo." });
  } catch (error) {
    console.error("Error in deleteAdminNotification:", error);
    res.status(500).json({ message: "Không thể xóa thông báo." });
  }
};
