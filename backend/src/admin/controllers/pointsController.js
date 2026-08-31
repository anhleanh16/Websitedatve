import { PointsModel } from '../models/pointsModel.js';

export const getPointsDashboard = async (req, res) => {
  try {
    const [users, summary, history] = await Promise.all([
      PointsModel.getAdminUsersSummary(),
      PointsModel.getDashboardOverview(),
      PointsModel.listPointsHistory({ page: 1, limit: 10 }),
    ]);

    res.json({
      users,
      summary,
      history: history.items,
      pagination: history.pagination,
    });
  } catch (error) {
    console.error('Error in getPointsDashboard:', error);
    res.status(500).json({ message: 'Không thể tải dữ liệu điểm.' });
  }
};

export const getPointsHistory = async (req, res) => {
  try {
    const search = String(req.query.search || '');
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);

    const history = await PointsModel.listPointsHistory({ search, page, limit });
    res.json(history);
  } catch (error) {
    console.error('Error in getPointsHistory:', error);
    res.status(500).json({ message: 'Không thể tải lịch sử điểm thưởng.' });
  }
};

export const getPointsUserSummary = async (req, res) => {
  try {
    const userId = Number(req.params.userId || req.userId);
    const summary = await PointsModel.getUserPointSummary(userId);
    if (!summary) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }
    res.json(summary);
  } catch (error) {
    console.error('Error in getPointsUserSummary:', error);
    res.status(500).json({ message: 'Không thể tải thông tin điểm.' });
  }
};

export const adjustUserPoints = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const { delta, description } = req.body || {};
    const result = await PointsModel.adjustUserPoints(userId, delta, description);
    res.json({ message: 'Cập nhật điểm thành công.', ...result });
  } catch (error) {
    console.error('Error in adjustUserPoints:', error);
    res.status(400).json({ message: error.message || 'Không thể cập nhật điểm.' });
  }
};

export const getPointsSettings = async (req, res) => {
  try {
    const [levels, rules, rewards] = await Promise.all([
      PointsModel.listMembershipLevels(),
      PointsModel.listPointRules(),
      PointsModel.listRewardRules(),
    ]);
    res.json({ levels, rules, rewards });
  } catch (error) {
    console.error('Error in getPointsSettings:', error);
    res.status(500).json({ message: 'Không thể tải cấu hình điểm.' });
  }
};

export const createMembershipLevel = async (req, res) => {
  try {
    const data = await PointsModel.createMembershipLevel(req.body || {});
    res.status(201).json({ message: 'Tạo hạng thành viên thành công.', ...data });
  } catch (error) {
    console.error('Error in createMembershipLevel:', error);
    res.status(400).json({ message: error.message || 'Không thể tạo hạng thành viên.' });
  }
};

export const updateMembershipLevel = async (req, res) => {
  try {
    const success = await PointsModel.updateMembershipLevel(req.params.levelId, req.body || {});
    if (!success) {
      return res.status(404).json({ message: 'Không tìm thấy hạng thành viên.' });
    }
    res.json({ message: 'Cập nhật hạng thành viên thành công.' });
  } catch (error) {
    console.error('Error in updateMembershipLevel:', error);
    res.status(400).json({ message: error.message || 'Không thể cập nhật hạng thành viên.' });
  }
};

export const deleteMembershipLevel = async (req, res) => {
  try {
    const success = await PointsModel.deleteMembershipLevel(req.params.levelId);
    if (!success) {
      return res.status(404).json({ message: 'Không tìm thấy hạng thành viên.' });
    }
    res.json({ message: 'Đã xóa hạng thành viên.' });
  } catch (error) {
    console.error('Error in deleteMembershipLevel:', error);
    res.status(400).json({ message: error.message || 'Không thể xóa hạng thành viên.' });
  }
};

export const createPointRule = async (req, res) => {
  try {
    const data = await PointsModel.createPointRule(req.body || {});
    res.status(201).json({ message: 'Tạo quy tắc tích điểm thành công.', ...data });
  } catch (error) {
    console.error('Error in createPointRule:', error);
    res.status(400).json({ message: error.message || 'Không thể tạo quy tắc tích điểm.' });
  }
};

export const updatePointRule = async (req, res) => {
  try {
    const success = await PointsModel.updatePointRule(req.params.ruleId, req.body || {});
    if (!success) {
      return res.status(404).json({ message: 'Không tìm thấy quy tắc tích điểm.' });
    }
    res.json({ message: 'Cập nhật quy tắc tích điểm thành công.' });
  } catch (error) {
    console.error('Error in updatePointRule:', error);
    res.status(400).json({ message: error.message || 'Không thể cập nhật quy tắc tích điểm.' });
  }
};

export const deletePointRule = async (req, res) => {
  try {
    const success = await PointsModel.deletePointRule(req.params.ruleId);
    if (!success) {
      return res.status(404).json({ message: 'Không tìm thấy quy tắc tích điểm.' });
    }
    res.json({ message: 'Đã xóa quy tắc tích điểm.' });
  } catch (error) {
    console.error('Error in deletePointRule:', error);
    res.status(400).json({ message: error.message || 'Không thể xóa quy tắc tích điểm.' });
  }
};

export const createRewardRule = async (req, res) => {
  try {
    const data = await PointsModel.createRewardRule(req.body || {});
    res.status(201).json({ message: 'Tạo phần thưởng thành công.', ...data });
  } catch (error) {
    console.error('Error in createRewardRule:', error);
    res.status(400).json({ message: error.message || 'Không thể tạo phần thưởng.' });
  }
};

export const updateRewardRule = async (req, res) => {
  try {
    const success = await PointsModel.updateRewardRule(req.params.rewardId, req.body || {});
    if (!success) {
      return res.status(404).json({ message: 'Không tìm thấy phần thưởng.' });
    }
    res.json({ message: 'Cập nhật phần thưởng thành công.' });
  } catch (error) {
    console.error('Error in updateRewardRule:', error);
    res.status(400).json({ message: error.message || 'Không thể cập nhật phần thưởng.' });
  }
};

export const deleteRewardRule = async (req, res) => {
  try {
    const success = await PointsModel.deleteRewardRule(req.params.rewardId);
    if (!success) {
      return res.status(404).json({ message: 'Không tìm thấy phần thưởng.' });
    }
    res.json({ message: 'Đã xóa phần thưởng.' });
  } catch (error) {
    console.error('Error in deleteRewardRule:', error);
    res.status(400).json({ message: error.message || 'Không thể xóa phần thưởng.' });
  }
};

export const redeemReward = async (req, res) => {
  try {
    const userId = Number(req.params.userId || req.userId);
    const rewardId = Number(req.body?.rewardId || req.params.rewardId);
    const result = await PointsModel.redeemReward(userId, rewardId);
    res.json({ message: 'Đổi quà thành công.', ...result });
  } catch (error) {
    console.error('Error in redeemReward:', error);
    res.status(400).json({ message: error.message || 'Không thể đổi quà.' });
  }
};
