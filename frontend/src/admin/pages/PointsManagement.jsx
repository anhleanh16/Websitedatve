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
          {/* ── CARD: QUY TẮC TÍCH ĐIỂM ── */}
          <section className="points-card points-policy-card" style={{ gridColumn: "1 / -1" }}>
            <h2>Quy tắc tích điểm</h2>

            <div className="points-rule-layout">
              {/* ── CỘT TRÁI: Form nhập ── */}
              <div className="points-rule-left">
                <h3 className="points-sub-title">
                  {editingRuleId ? '✏️ Cập nhật quy tắc' : '➕ Thêm quy tắc mới'}
                </h3>
                <form onSubmit={handleRuleSubmit} className="points-form">
                  <label>
                    Tên quy tắc
                    <input
                      placeholder="VD: Tích điểm theo đơn hàng"
                      value={ruleForm.ruleName}
                      onChange={(e) => setRuleForm({ ...ruleForm, ruleName: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Loại quy tắc
                    <select value={ruleForm.ruleScope} onChange={(e) => setRuleForm({ ...ruleForm, ruleScope: e.target.value })}>
                      <option value="order">Tổng đơn hàng</option>
                      <option value="seat">Loại ghế</option>
                      <option value="combo">Combo</option>
                    </select>
                  </label>
                  <label>
                    Mã định danh (key)
                    <input
                      placeholder="VD: regular, vip, couple..."
                      value={ruleForm.ruleKey}
                      onChange={(e) => setRuleForm({ ...ruleForm, ruleKey: e.target.value })}
                    />
                  </label>
                  <div className="points-form-row">
                    <label>
                      Chi tiêu tối thiểu (đ)
                      <input type="number" min="0" value={ruleForm.spendingAmount} onChange={(e) => setRuleForm({ ...ruleForm, spendingAmount: Number(e.target.value) })} />
                    </label>
                    <label>
                      Điểm nhận được
                      <input type="number" min="0" value={ruleForm.earnedPoints} onChange={(e) => setRuleForm({ ...ruleForm, earnedPoints: Number(e.target.value) })} />
                    </label>
                  </div>
                  <div className="points-form-row">
                    <label>
                      Điểm cố định / loại
                      <input type="number" min="0" value={ruleForm.pointsValue} onChange={(e) => setRuleForm({ ...ruleForm, pointsValue: Number(e.target.value) })} />
                    </label>
                    <label>
                      Hết hạn sau (tháng)
                      <input type="number" min="1" value={ruleForm.expiresInMonths} onChange={(e) => setRuleForm({ ...ruleForm, expiresInMonths: Number(e.target.value) })} />
                    </label>
                  </div>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={ruleForm.status} onChange={(e) => setRuleForm({ ...ruleForm, status: e.target.checked })} />
                    Kích hoạt quy tắc
                  </label>
                  <div className="points-form-btns">
                    <button type="submit" disabled={saving} className="points-btn-primary">
                      {saving ? '⏳ Đang lưu...' : editingRuleId ? '💾 Cập nhật' : '➕ Thêm quy tắc'}
                    </button>
                    {editingRuleId && (
                      <button type="button" className="points-btn-cancel" onClick={() => { setEditingRuleId(null); setRuleForm(defaultRuleForm); }}>
                        Huỷ
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* ── CỘT PHẢI: Thông tin + danh sách ── */}
              <div className="points-rule-right">
                {/* Tóm tắt chính sách */}
                {primaryRule && (
                  <div className="points-summary-box">
                    <div className="points-summary-title">📊 Chính sách hiện tại</div>
                    <div className="points-policy-item">
                      <span>Chi tiêu</span>
                      <strong>{formatCurrency(primaryRule.spendingAmount || primaryRule.spending_amount || 0)}</strong>
                    </div>
                    <div className="points-policy-item">
                      <span>Tích được</span>
                      <strong className="points-highlight">{Number(primaryRule.earnedPoints || primaryRule.earned_points || 0)} điểm</strong>
                    </div>
                    <div className="points-policy-item">
                      <span>Hết hạn sau</span>
                      <strong>{primaryRule.expiresInMonths || primaryRule.expires_in_months || 12} tháng</strong>
                    </div>
                  </div>
                )}

                {/* Danh sách quy tắc */}
                <div className="points-rule-list-header">
                  <span>Danh sách quy tắc</span>
                  <span className="points-rule-count">{rules.length} quy tắc</span>
                </div>
                <div className="points-list">
                  {rules.length === 0 && (
                    <p className="points-empty">Chưa có quy tắc nào. Thêm quy tắc đầu tiên.</p>
                  )}
                  {rules.map((rule) => {
                    const scope = rule.ruleScope || rule.rule_scope || 'order';
                    const desc = scope === 'seat'
                      ? `Ghế ${rule.ruleKey || rule.rule_key || '—'}: +${Number(rule.pointsValue || rule.points_value || 0)} điểm`
                      : scope === 'combo'
                        ? `Combo ${rule.ruleKey || rule.rule_key || '—'}: +${Number(rule.pointsValue || rule.points_value || 0)} điểm`
                        : `${Number(rule.spendingAmount || rule.spending_amount || 0).toLocaleString()}đ → +${Number(rule.earnedPoints || rule.earned_points || 0)} điểm`;
                    const scopeLabel = scope === 'seat' ? '🪑' : scope === 'combo' ? '🍿' : '🧾';
                    return (
                      <div key={rule.id} className="points-item">
                        <div className="points-item-body">
                          <div className="points-item-name">
                            <span className="points-item-scope">{scopeLabel}</span>
                            <strong>{rule.ruleName}</strong>
                            <span className={`points-item-status ${rule.status ? 'on' : 'off'}`}>
                              {rule.status ? 'Bật' : 'Tắt'}
                            </span>
                          </div>
                          <div className="points-item-desc">{desc}</div>
                        </div>
                        <div className="points-actions">
                          <button className="points-btn-edit" onClick={() => { setEditingRuleId(rule.id); setRuleForm({ ...rule }); }}>Sửa</button>
                          <button className="points-btn-del" onClick={() => deleteRule(rule.id)}>Xóa</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
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
            <h2>Phần thưởng đổi điểm</h2>
            <form onSubmit={handleRewardSubmit} className="points-form">
              <label>Tên phần thưởng<input value={rewardForm.rewardName} onChange={(e) => setRewardForm({ ...rewardForm, rewardName: e.target.value })} /></label>
              <label>Điểm cần<input type="number" value={rewardForm.requiredPoints} onChange={(e) => setRewardForm({ ...rewardForm, requiredPoints: Number(e.target.value) })} /></label>
              <label>Loại phần thưởng<select value={rewardForm.rewardType} onChange={(e) => setRewardForm({ ...rewardForm, rewardType: e.target.value })}><option value="voucher">Voucher</option><option value="coupon">Coupon</option><option value="gift">Quà tặng</option></select></label>
              <label title="Ví dụ: 20K, 20%, COMBOFREE hoặc TICKET2D">Giá trị<input placeholder="VD: 20K, 20%, COMBOFREE" value={rewardForm.rewardValue} onChange={(e) => setRewardForm({ ...rewardForm, rewardValue: e.target.value })} /></label>
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
