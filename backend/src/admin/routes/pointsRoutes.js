import express from 'express';
import {
  getPointsDashboard,
  getPointsHistory,
  getPointsUserSummary,
  adjustUserPoints,
  getPointsSettings,
  createMembershipLevel,
  updateMembershipLevel,
  deleteMembershipLevel,
  createPointRule,
  updatePointRule,
  deletePointRule,
  createRewardRule,
  updateRewardRule,
  deleteRewardRule,
  redeemReward,
} from '../controllers/pointsController.js';
import { authMiddleware, adminOnly, selfOrAdminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/points/dashboard', authMiddleware, adminOnly, getPointsDashboard);
router.get('/points/history', authMiddleware, adminOnly, getPointsHistory);
router.get('/points/settings', authMiddleware, adminOnly, getPointsSettings);
router.get('/points/users/:userId', authMiddleware, adminOnly, getPointsUserSummary);
router.post('/points/users/:userId/adjust', authMiddleware, adminOnly, adjustUserPoints);
router.post('/points/levels', authMiddleware, adminOnly, createMembershipLevel);
router.put('/points/levels/:levelId', authMiddleware, adminOnly, updateMembershipLevel);
router.delete('/points/levels/:levelId', authMiddleware, adminOnly, deleteMembershipLevel);
router.post('/points/rules', authMiddleware, adminOnly, createPointRule);
router.put('/points/rules/:ruleId', authMiddleware, adminOnly, updatePointRule);
router.delete('/points/rules/:ruleId', authMiddleware, adminOnly, deletePointRule);
router.post('/points/rewards', authMiddleware, adminOnly, createRewardRule);
router.put('/points/rewards/:rewardId', authMiddleware, adminOnly, updateRewardRule);
router.delete('/points/rewards/:rewardId', authMiddleware, adminOnly, deleteRewardRule);
router.get('/points/user/:userId', authMiddleware, selfOrAdminOnly, getPointsUserSummary);
router.post('/points/user/:userId/redeem', authMiddleware, selfOrAdminOnly, redeemReward);

export default router;
