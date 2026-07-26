import { useEffect, useMemo, useState } from 'react';
import { pointsService } from '../services/pointsService';
import './points-management.css';

const defaultLevelForm = { levelName: '', minPoints: 0, maxPoints: 999999, benefits: '', discountPercent: 0 };
const defaultRuleForm = { ruleName: '', ruleScope: 'order', ruleKey: '', spendingAmount: 10000, earnedPoints: 1, pointsValue: 8, status: true, expiresInMonths: 12 };
const defaultRewardForm = { rewardName: '', requiredPoints: 100, rewardType: 'voucher', rewardValue: '', status: true };

export default function PointsManagement() {
  const [users, setUsers] = useState([]);
  const [levels, setLevels] = useState([]);
  const [rules, setRules] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustMessage, setAdjustMessage] = useState('');
  const [levelForm, setLevelForm] = useState(defaultLevelForm);
  const [ruleForm, setRuleForm] = useState(defaultRuleForm);
  const [rewardForm, setRewardForm] = useState(defaultRewardForm);
  const [editingLevelId, setEditingLevelId] = useState(null);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editingRewardId, setEditingRewardId] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('[loadData] Fetching settings...');
      const data = await pointsService.getSettings();
      console.log('[loadData] Settings received:', data);
      const dashboard = await pointsService.getDashboard();
      setLevels(Array.isArray(data.levels) ? data.levels : []);
      setRules(Array.isArray(data.rules) ? data.rules : []);
      setRewards(Array.isArray(data.rewards) ? data.rewards : []);
      setUsers(Array.isArray(dashboard.users) ? dashboard.users : []);
      console.log('[loadData] Rules updated:', Array.isArray(data.rules) ? data.rules : []);
      setError('');
    } catch (err) {
      console.error('[loadData] Error:', err);
      setError(err.message || 'Không thể tải dữ liệu điểm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const selectedUser = useMemo(() => users.find((u) => String(u.id) === String(selectedUserId)) || null, [selectedUserId, users]);

  const activeRules = useMemo(() => {
    return (Array.isArray(rules) ? rules : []).filter((rule) => rule.status !== false);
  }, [rules]);

  const primaryRule = useMemo(() => {
    const ranked = activeRules
      .filter((rule) => Number(rule.spendingAmount || rule.spending_amount || 0) > 0 && Number(rule.earnedPoints || rule.earned_points || 0) > 0)
      .sort((a, b) => Number(a.spendingAmount || a.spending_amount || 0) - Number(b.spendingAmount || b.spending_amount || 0));
    return ranked[0] || null;
  }, [activeRules]);

  const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

  const calculatePoints = (amount) => {
    if (!primaryRule) return 0;
    const threshold = Number(primaryRule.spendingAmount || primaryRule.spending_amount || 0);
    const earned = Number(primaryRule.earnedPoints || primaryRule.earned_points || 0);
    return threshold > 0 ? Math.floor(Number(amount || 0) / threshold) * earned : 0;
  };

  // Tạo ví dụ động từ các seat rules
  const seatExamples = useMemo(() => {
    const seatRules = activeRules.filter(r => r.ruleScope === 'seat' && r.status !== false);
    return seatRules.slice(0, 3).map(rule => ({
      label: `Ghế ${rule.ruleKey || 'chưa xác định'}`,
      points: Number(rule.pointsValue || 0)
    }));
  }, [activeRules]);

  // Tạo ví dụ động từ các combo rules
  const comboExamples = useMemo(() => {
    const comboRules = activeRules.filter(r => r.ruleScope === 'combo' && r.status !== false);
    return comboRules.slice(0, 2).map(rule => ({
      label: `Combo ${rule.ruleKey || 'chưa xác định'}`,
      points: Number(rule.pointsValue || 0)
    }));
  }, [activeRules]);

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setAdjustMessage('Vui lòng chọn người dùng.');
      return;
    }
    try {
      setSaving(true);
      const payload = { delta: Number(adjustDelta || 0), description: adjustReason || 'Điều chỉnh điểm' };
      await pointsService.adjustUserPoints(selectedUserId, payload);
      setAdjustMessage('Cập nhật điểm thành công.');
      setAdjustDelta('');
      setAdjustReason('');
      await loadData();
    } catch (err) {
      setAdjustMessage(err.message || 'Không thể cập nhật điểm.');
    } finally {
      setSaving(false);
    }
  };

  const handleLevelSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingLevelId) {
        await pointsService.updateLevel(editingLevelId, levelForm);
      } else {
        await pointsService.createLevel(levelForm);
      }
      setLevelForm(defaultLevelForm);
      setEditingLevelId(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể lưu hạng thành viên.');
    } finally {
      setSaving(false);
    }
  };

  const handleRuleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingRuleId) {
        console.log('[handleRuleSubmit] Updating rule:', editingRuleId, 'with data:', ruleForm);
        const response = await pointsService.updateRule(editingRuleId, ruleForm);
        console.log('[handleRuleSubmit] Update response:', response);
        alert('✅ Cập nhật quy tắc thành công!');
      } else {
        console.log('[handleRuleSubmit] Creating rule with data:', ruleForm);
        const response = await pointsService.createRule(ruleForm);
        console.log('[handleRuleSubmit] Create response:', response);
        alert('✅ Tạo quy tắc thành công!');
      }
      setRuleForm(defaultRuleForm);
      setEditingRuleId(null);
      console.log('[handleRuleSubmit] Calling loadData...');
      await loadData();
      console.log('[handleRuleSubmit] loadData completed');
    } catch (err) {
      console.error('[handleRuleSubmit] Error:', err);
      alert('❌ Lỗi: ' + (err.message || 'Không thể lưu quy tắc tích điểm.'));
      setError(err.message || 'Không thể lưu quy tắc tích điểm.');
    } finally {
      setSaving(false);
    }
  };

  const handleRewardSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingRewardId) {
        await pointsService.updateReward(editingRewardId, rewardForm);
      } else {
        await pointsService.createReward(rewardForm);
      }
      setRewardForm(defaultRewardForm);
      setEditingRewardId(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể lưu phần thưởng.');
    } finally {
      setSaving(false);
    }
  };

  const deleteLevel = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa hạng này?')) return;
    await pointsService.deleteLevel(id);
    await loadData();
  };

  const deleteRule = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa quy tắc này?')) return;
    await pointsService.deleteRule(id);
    await loadData();
  };

  const deleteReward = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa phần thưởng này?')) return;
    await pointsService.deleteReward(id);
    await loadData();
  };

  return (
    <div className="points-management-page">
      <div className="points-management-header">
        <div>
          <h1>Quản lý điểm thưởng</h1>
          <p>Thiết lập hạng thành viên, quy tắc tích điểm và phần thưởng đổi điểm.</p>
        </div>
      </div>

      {error && <div className="points-alert points-alert-error">{error}</div>}
      {loading ? <div className="points-loading">Đang tải...</div> : (
        <div className="points-grid">
          <section className="points-card points-policy-card">
            <h2>Quy tắc tích điểm</h2>
            {primaryRule ? (
              <>
                <p className="points-policy-summary">
                  Mỗi <strong>{formatCurrency(primaryRule.spendingAmount || primaryRule.spending_amount || 0)}</strong> chi tiêu sẽ tích được <strong>{Number(primaryRule.earnedPoints || primaryRule.earned_points || 0)} điểm</strong>.
                </p>
                <div className="points-policy-list">
                  <div className="points-policy-item">
                    <span>1 điểm tương đương</span>
                    <strong>{formatCurrency(primaryRule.spendingAmount || primaryRule.spending_amount || 0)}</strong>
                  </div>
                  <div className="points-policy-item">
                    <span>Điểm được tính trên</span>
                    <strong>tổng giá trị đơn hàng</strong>
                  </div>
                  <div className="points-policy-item">
                    <span>Vé + combo đều được tính</span>
                    <strong>có thể tích điểm</strong>
                  </div>
                </div>
                <div className="points-example-box">
                  <h3>Ví dụ nhanh</h3>
                  {seatExamples.map((item) => (
                    <div key={item.label} className="points-example-row">
                      <span>{item.label}</span>
                      <strong>{item.points} điểm</strong>
                    </div>
                  ))}
                  {comboExamples.map((item) => (
                    <div key={item.label} className="points-example-row">
                      <span>{item.label}</span>
                      <strong>{item.points} điểm</strong>
                    </div>
                  ))}
                  {seatExamples.length === 0 && comboExamples.length === 0 && (
                    <p style={{ color: '#999' }}>Chưa có quy tắc ghế hoặc combo nào được kích hoạt.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="points-policy-summary">Chưa có quy tắc tích điểm nào được kích hoạt.</p>
            )}
          </section>
          <section className="points-card">
            <h2>Điều chỉnh điểm người dùng</h2>
            <form onSubmit={handleAdjust} className="points-form">
              <label>
                Người dùng
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                  <option value="">-- Chọn người dùng --</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.fullName} ({user.email})</option>
                  ))}
                </select>
              </label>
              <label>
                Số điểm
                <input type="number" value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} />
              </label>
              <label>
                Lý do
                <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
              </label>
              {selectedUser && <p className="points-help">Điểm hiện tại: {selectedUser.points}</p>}
              {adjustMessage && <p className="points-help">{adjustMessage}</p>}
              <button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
            </form>
          </section>

          <section className="points-card">
            <h2>Hạng thành viên</h2>
            <form onSubmit={handleLevelSubmit} className="points-form">
              <label>Tên hạng<input value={levelForm.levelName} onChange={(e) => setLevelForm({ ...levelForm, levelName: e.target.value })} /></label>
              <label>Điểm tối thiểu<input type="number" value={levelForm.minPoints} onChange={(e) => setLevelForm({ ...levelForm, minPoints: Number(e.target.value) })} /></label>
              <label>Điểm tối đa<input type="number" value={levelForm.maxPoints} onChange={(e) => setLevelForm({ ...levelForm, maxPoints: Number(e.target.value) })} /></label>
              <label>Ưu đãi<textarea value={levelForm.benefits} onChange={(e) => setLevelForm({ ...levelForm, benefits: e.target.value })} /></label>
              <label>Giảm giá %<input type="number" value={levelForm.discountPercent} onChange={(e) => setLevelForm({ ...levelForm, discountPercent: Number(e.target.value) })} /></label>
              <button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : editingLevelId ? 'Cập nhật hạng' : 'Thêm hạng'}</button>
            </form>
            <div className="points-list">
              {levels.map((level) => (
                <div key={level.id} className="points-item">
                  <div>
                    <strong>{level.levelName}</strong>
                    <div>{level.minPoints} - {level.maxPoints} điểm • Giảm {level.discountPercent}%</div>
                  </div>
                  <div className="points-actions">
                    <button onClick={() => { setEditingLevelId(level.id); setLevelForm(level); }}>Sửa</button>
                    <button onClick={() => deleteLevel(level.id)}>Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="points-card">
            <h2>Quy tắc tích điểm</h2>
            <form onSubmit={handleRuleSubmit} className="points-form">
              <label>Tên quy tắc<input value={ruleForm.ruleName} onChange={(e) => setRuleForm({ ...ruleForm, ruleName: e.target.value })} /></label>
              <label>Loại quy tắc<select value={ruleForm.ruleScope} onChange={(e) => setRuleForm({ ...ruleForm, ruleScope: e.target.value })}><option value="order">Tổng đơn hàng</option><option value="seat">Ghế</option><option value="combo">Combo</option></select></label>
              <label>Mã quy tắc (ví dụ: regular, vip, couple, combo1)<input value={ruleForm.ruleKey} onChange={(e) => setRuleForm({ ...ruleForm, ruleKey: e.target.value })} /></label>
              <label>Chi tiêu tối thiểu<input type="number" value={ruleForm.spendingAmount} onChange={(e) => setRuleForm({ ...ruleForm, spendingAmount: Number(e.target.value) })} /></label>
              <label>Điểm nhận được<input type="number" value={ruleForm.earnedPoints} onChange={(e) => setRuleForm({ ...ruleForm, earnedPoints: Number(e.target.value) })} /></label>
              <label>Điểm cố định cho loại này<input type="number" value={ruleForm.pointsValue} onChange={(e) => setRuleForm({ ...ruleForm, pointsValue: Number(e.target.value) })} /></label>
              <label>Hết hạn sau (tháng)<input type="number" value={ruleForm.expiresInMonths} onChange={(e) => setRuleForm({ ...ruleForm, expiresInMonths: Number(e.target.value) })} /></label>
              <label className="checkbox-row"><input type="checkbox" checked={ruleForm.status} onChange={(e) => setRuleForm({ ...ruleForm, status: e.target.checked })} /> Kích hoạt</label>
              <button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : editingRuleId ? 'Cập nhật quy tắc' : 'Thêm quy tắc'}</button>
            </form>
            <div className="points-list">
              {rules.map((rule) => (
                <div key={rule.id} className="points-item">
                  <div>
                    <strong>{rule.ruleName}</strong>
                    <div>
                      {rule.ruleScope === 'seat' ? `Ghế ${rule.ruleKey || 'đặc biệt'}: ${rule.pointsValue} điểm` : rule.ruleScope === 'combo' ? `Combo ${rule.ruleKey || 'đặc biệt'}: ${rule.pointsValue} điểm` : `Cho mỗi ${rule.spendingAmount.toLocaleString()}₫ nhận ${rule.earnedPoints} điểm`}
                    </div>
                  </div>
                  <div className="points-actions">
                    <button onClick={() => { setEditingRuleId(rule.id); setRuleForm(rule); }}>Sửa</button>
                    <button onClick={() => deleteRule(rule.id)}>Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="points-card">
            <h2>Phần thưởng đổi điểm</h2>
            <form onSubmit={handleRewardSubmit} className="points-form">
              <label>Tên phần thưởng<input value={rewardForm.rewardName} onChange={(e) => setRewardForm({ ...rewardForm, rewardName: e.target.value })} /></label>
              <label>Điểm cần<input type="number" value={rewardForm.requiredPoints} onChange={(e) => setRewardForm({ ...rewardForm, requiredPoints: Number(e.target.value) })} /></label>
              <label>Loại phần thưởng<select value={rewardForm.rewardType} onChange={(e) => setRewardForm({ ...rewardForm, rewardType: e.target.value })}><option value="voucher">Voucher</option><option value="coupon">Coupon</option><option value="gift">Quà tặng</option></select></label>
              <label>Giá trị<input value={rewardForm.rewardValue} onChange={(e) => setRewardForm({ ...rewardForm, rewardValue: e.target.value })} /></label>
              <label className="checkbox-row"><input type="checkbox" checked={rewardForm.status} onChange={(e) => setRewardForm({ ...rewardForm, status: e.target.checked })} /> Kích hoạt</label>
              <button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : editingRewardId ? 'Cập nhật quà' : 'Thêm quà'}</button>
            </form>
            <div className="points-list">
              {rewards.map((reward) => (
                <div key={reward.id} className="points-item">
                  <div>
                    <strong>{reward.rewardName}</strong>
                    <div>{reward.requiredPoints} điểm • {reward.rewardType} • {reward.rewardValue}</div>
                  </div>
                  <div className="points-actions">
                    <button onClick={() => { setEditingRewardId(reward.id); setRewardForm(reward); }}>Sửa</button>
                    <button onClick={() => deleteReward(reward.id)}>Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
