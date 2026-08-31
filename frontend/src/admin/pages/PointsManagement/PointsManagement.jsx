import { useEffect, useMemo, useState } from 'react';
import { pointsService } from '../../services/pointsService';
import './points-management.css';

const defaultLevelForm = {
  levelName: '',
  minPoints: 0,
  maxPoints: 999999,
  benefits: '',
  discountPercent: 0,
};

const defaultRuleForm = {
  ruleName: '',
  ruleScope: 'order',
  ruleKey: '',
  spendingAmount: 10000,
  earnedPoints: 1,
  pointsValue: 8,
  status: true,
  expiresInMonths: 12,
};

const defaultRewardForm = {
  rewardName: '',
  requiredPoints: 100,
  rewardType: 'voucher',
  rewardValue: '',
  status: true,
};

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const formatNumber = (value) => Number(value || 0).toLocaleString('vi-VN');

export default function PointsManagement() {
  const [dashboard, setDashboard] = useState({ summary: {}, users: [], history: [], pagination: {} });
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
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustDescription, setAdjustDescription] = useState('');

  const loadDashboard = async () => {
    try {
      const [dashboardData, settingsData] = await Promise.all([
        pointsService.getDashboard(),
        pointsService.getSettings(),
      ]);

      setDashboard({
        summary: dashboardData?.summary || {},
        users: Array.isArray(dashboardData?.users) ? dashboardData.users : [],
        history: Array.isArray(dashboardData?.history) ? dashboardData.history : [],
        pagination: dashboardData?.pagination || {},
      });
      setLevels(Array.isArray(settingsData?.levels) ? settingsData.levels : []);
      setRules(Array.isArray(settingsData?.rules) ? settingsData.rules : []);
      setRewards(Array.isArray(settingsData?.rewards) ? settingsData.rewards : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu điểm thưởng.');
    }
  };

  const loadHistory = async (page = historyPage) => {
    try {
      const data = await pointsService.getHistory({ search: historySearch, page, limit: 10 });
      setDashboard((previous) => ({
        ...previous,
        history: Array.isArray(data?.items) ? data.items : [],
        pagination: data?.pagination || {},
      }));
    } catch (err) {
      setError(err.message || 'Không thể tải lịch sử điểm thưởng.');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await loadDashboard();
      await loadHistory(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadHistory(1);
      setHistoryPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [historySearch]);

  const activeRules = useMemo(() => (Array.isArray(rules) ? rules.filter((rule) => rule.status !== false) : []), [rules]);
  const primaryRule = useMemo(() => {
    const ranked = activeRules
      .filter((rule) => Number(rule.spendingAmount || rule.spending_amount || 0) > 0 && Number(rule.earnedPoints || rule.earned_points || 0) > 0)
      .sort((a, b) => Number(a.spendingAmount || a.spending_amount || 0) - Number(b.spendingAmount || b.spending_amount || 0));
    return ranked[0] || null;
  }, [activeRules]);

  const filteredUsers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return dashboard.users;
    return dashboard.users.filter((user) => {
      const haystack = [user.fullName, user.email, user.id].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [customerSearch, dashboard.users]);

  const handleLevelSubmit = async (event) => {
    event.preventDefault();
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

  const handleRuleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      if (editingRuleId) {
        await pointsService.updateRule(editingRuleId, ruleForm);
      } else {
        await pointsService.createRule(ruleForm);
      }
      setRuleForm(defaultRuleForm);
      setEditingRuleId(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể lưu quy tắc tích điểm.');
    } finally {
      setSaving(false);
    }
  };

  const handleRewardSubmit = async (event) => {
    event.preventDefault();
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
    if (!window.confirm('Bạn có chắc chắn xóa hạng này?')) return;
    await pointsService.deleteLevel(id);
    await loadData();
  };

  const deleteRule = async (id) => {
    if (!window.confirm('Bạn có chắc chắn xóa quy tắc này?')) return;
    await pointsService.deleteRule(id);
    await loadData();
  };

  const deleteReward = async (id) => {
    if (!window.confirm('Bạn có chắc chắn xóa phần thưởng này?')) return;
    await pointsService.deleteReward(id);
    await loadData();
  };

  const handleAdjustPoints = async () => {
    const userId = Number(adjustUserId);
    const delta = Number(adjustDelta);
    if (!userId || !Number.isFinite(delta)) {
      setError('Vui lòng chọn khách hàng và nhập số điểm hợp lệ.');
      return;
    }

    try {
      setSaving(true);
      await pointsService.adjustUserPoints(userId, {
        delta,
        description: adjustDescription || 'Điều chỉnh điểm bằng tay từ quản trị viên',
      });
      setAdjustUserId('');
      setAdjustDelta('');
      setAdjustDescription('');
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể điều chỉnh điểm khách hàng.');
    } finally {
      setSaving(false);
    }
  };

  const summary = dashboard.summary || {};

  return (
    <div className="points-management-page">
      <div className="points-management-header">
        <div>
          <h1>Quản lý điểm thưởng</h1>
          <p>Điểm tích lũy, điểm khả dụng, điểm đã đổi và hạng thành viên được quản lý rõ ràng theo chu kỳ.</p>
        </div>
      </div>

      {error && <div className="points-alert points-alert-error">{error}</div>}

      {loading ? (
        <div className="points-loading">Đang tải dữ liệu điểm thưởng...</div>
      ) : (
        <>
          <div className="points-summary-grid">
            <div className="points-metric-card">
              <span className="points-metric-label">Tổng thành viên</span>
              <strong>{formatNumber(summary.totalMembers || dashboard.users.length || 0)}</strong>
            </div>
            <div className="points-metric-card accent-purple">
              <span className="points-metric-label">Tổng điểm cộng</span>
              <strong>{formatNumber(summary.totalEarnedPoints || 0)}</strong>
            </div>
            <div className="points-metric-card accent-gold">
              <span className="points-metric-label">Tổng phần thưởng đã đổi</span>
              <strong>{formatNumber(summary.totalRewardsRedeemed || 0)}</strong>
            </div>
            <div className="points-metric-card accent-red">
              <span className="points-metric-label">Tổng điểm đã dùng</span>
              <strong>{formatNumber(summary.totalPointsUsed || 0)}</strong>
            </div>
            <div className="points-metric-card accent-green">
              <span className="points-metric-label">Điểm khả dụng tổng</span>
              <strong>{formatNumber(summary.totalAvailablePoints || 0)}</strong>
            </div>
          </div>

          <div className="points-legend-box">
            <div><strong>Điểm tích lũy:</strong> tổng điểm khách hàng đã kiếm được từ giao dịch, không bị giảm khi đổi thưởng.</div>
            <div><strong>Điểm khả dụng:</strong> điểm hiện có để sử dụng và đổi quà.</div>
            <div><strong>Điểm đã đổi:</strong> điểm đã tiêu hết khi đổi phần thưởng.</div>
            <div><strong>Điểm còn lại:</strong> điểm khả dụng hiện tại = tích lũy - đã đổi.</div>
            <div><strong>Hạng:</strong> xác định dựa trên tổng điểm tích lũy; điểm dùng để đổi thưởng không làm giảm hạng.</div>
            <div><strong>Giữ hạng:</strong> hạng thành viên được duy trì trong 12 tháng kể từ ngày khách đạt hạng. Hết 12 tháng, hệ thống xét lại hạng dựa trên điểm xét hạng / tổng chi tiêu trong chu kỳ đó.</div>
          </div>

          <div className="points-card points-policy-card">
            <h2>Quy tắc tích điểm</h2>
            <div className="points-rule-layout">
              <div className="points-rule-left">
                <h3 className="points-sub-title">{editingRuleId ? 'Cập nhật quy tắc' : 'Thêm quy tắc mới'}</h3>
                <form onSubmit={handleRuleSubmit} className="points-form">
                  <label>
                    Tên quy tắc
                    <input value={ruleForm.ruleName} onChange={(e) => setRuleForm({ ...ruleForm, ruleName: e.target.value })} required />
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
                    Mã quy tắc / key
                    <input value={ruleForm.ruleKey} onChange={(e) => setRuleForm({ ...ruleForm, ruleKey: e.target.value })} placeholder="regular, vip, couple..." />
                  </label>
                  <div className="points-form-row">
                    <label>
                      Chi tiêu tối thiểu (đ)
                      <input type="number" value={ruleForm.spendingAmount} onChange={(e) => setRuleForm({ ...ruleForm, spendingAmount: Number(e.target.value) })} />
                    </label>
                    <label>
                      Điểm nhận được
                      <input type="number" value={ruleForm.earnedPoints} onChange={(e) => setRuleForm({ ...ruleForm, earnedPoints: Number(e.target.value) })} />
                    </label>
                  </div>
                  <div className="points-form-row">
                    <label>
                      Điểm cố định
                      <input type="number" value={ruleForm.pointsValue} onChange={(e) => setRuleForm({ ...ruleForm, pointsValue: Number(e.target.value) })} />
                    </label>
                    <label>
                      Hết hạn (tháng)
                      <input type="number" value={ruleForm.expiresInMonths} onChange={(e) => setRuleForm({ ...ruleForm, expiresInMonths: Number(e.target.value) })} />
                    </label>
                  </div>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={ruleForm.status} onChange={(e) => setRuleForm({ ...ruleForm, status: e.target.checked })} />
                    Kích hoạt quy tắc
                  </label>
                  <div className="points-form-btns">
                    <button type="submit" className="points-btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : editingRuleId ? 'Cập nhật quy tắc' : 'Thêm quy tắc'}</button>
                    {editingRuleId && (
                      <button type="button" className="points-btn-cancel" onClick={() => { setEditingRuleId(null); setRuleForm(defaultRuleForm); }}>
                        Huỷ
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="points-rule-right">
                {primaryRule && (
                  <div className="points-summary-box">
                    <div className="points-summary-title">Chính sách tích điểm đang áp dụng</div>
                    <div className="points-policy-item"><span>Chi tiêu tối thiểu</span><strong>{formatMoney(primaryRule.spendingAmount || primaryRule.spending_amount || 0)}</strong></div>
                    <div className="points-policy-item"><span>Điểm nhận được</span><strong className="points-highlight">{numberFormat(primaryRule.earnedPoints || primaryRule.earned_points || 0)} điểm</strong></div>
                    <div className="points-policy-item"><span>Thời hạn</span><strong>{primaryRule.expiresInMonths || primaryRule.expires_in_months || 12} tháng</strong></div>
                  </div>
                )}

                <div className="points-rule-list-header">
                  <span>Danh sách quy tắc</span>
                  <span className="points-rule-count">{rules.length} mục</span>
                </div>
                <div className="points-list">
                  {rules.length === 0 ? <p className="points-empty">Chưa có quy tắc nào.</p> : rules.map((rule) => (
                    <div key={rule.id || rule.rule_id} className="points-item">
                      <div className="points-item-body">
                        <div className="points-item-name">
                          <span className="points-item-scope">{rule.ruleScope === 'seat' ? '🪑' : rule.ruleScope === 'combo' ? '🍿' : '🧾'}</span>
                          <strong>{rule.ruleName}</strong>
                          <span className={`points-item-status ${rule.status ? 'on' : 'off'}`}>{rule.status ? 'Bật' : 'Tắt'}</span>
                        </div>
                        <div className="points-item-desc">
                          {rule.ruleScope === 'seat'
                            ? `Ghế ${rule.ruleKey || '—'}: +${rule.pointsValue || 0} điểm`
                            : rule.ruleScope === 'combo'
                              ? `Combo ${rule.ruleKey || '—'}: +${rule.pointsValue || 0} điểm`
                              : `${formatMoney(rule.spendingAmount || 0)} → +${rule.earnedPoints || 0} điểm`}
                        </div>
                      </div>
                      <div className="points-actions">
                        <button className="points-btn-edit" onClick={() => { setEditingRuleId(rule.id || rule.rule_id); setRuleForm({ ...rule, ruleName: rule.ruleName, ruleScope: rule.ruleScope || 'order', ruleKey: rule.ruleKey || '', spendingAmount: Number(rule.spendingAmount || rule.spending_amount || 0), earnedPoints: Number(rule.earnedPoints || rule.earned_points || 0), pointsValue: Number(rule.pointsValue || rule.points_value || 0), status: rule.status, expiresInMonths: Number(rule.expiresInMonths || rule.expires_in_months || 12) }); }}>Sửa</button>
                        <button className="points-btn-del" onClick={() => deleteRule(rule.id || rule.rule_id)}>Xóa</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="points-grid-two">
            <div className="points-card">
              <h2>Hạng thành viên</h2>
              <div className="points-form">
                <label>Tên hạng
                  <input value={levelForm.levelName} onChange={(e) => setLevelForm({ ...levelForm, levelName: e.target.value })} />
                </label>
                <label>Điểm tối thiểu
                  <input type="number" value={levelForm.minPoints} onChange={(e) => setLevelForm({ ...levelForm, minPoints: Number(e.target.value) })} />
                </label>
                <label>Điểm tối đa
                  <input type="number" value={levelForm.maxPoints} onChange={(e) => setLevelForm({ ...levelForm, maxPoints: Number(e.target.value) })} />
                </label>
                <label>Ưu đãi / quyền lợi
                  <textarea value={levelForm.benefits} onChange={(e) => setLevelForm({ ...levelForm, benefits: e.target.value })} />
                </label>
                <label>Giảm giá (%)
                  <input type="number" value={levelForm.discountPercent} onChange={(e) => setLevelForm({ ...levelForm, discountPercent: Number(e.target.value) })} />
                </label>
                <button type="button" className="points-btn-primary" disabled={saving} onClick={handleLevelSubmit}>{saving ? 'Đang lưu...' : editingLevelId ? 'Cập nhật hạng' : 'Thêm hạng'}</button>
                {editingLevelId && (
                  <button type="button" className="points-btn-cancel" onClick={() => { setEditingLevelId(null); setLevelForm(defaultLevelForm); }}>
                    Huỷ chỉnh sửa
                  </button>
                )}
              </div>

              <div className="points-list">
                {levels.map((level) => (
                  <div key={level.id || level.level_id} className="points-item">
                    <div>
                      <strong>{level.levelName}</strong>
                      <div>{formatNumber(level.minPoints || level.min_points || 0)} - {formatNumber(level.maxPoints || level.max_points || 0)} điểm • Giảm {level.discountPercent || level.discount_percent || 0}%</div>
                    </div>
                    <div className="points-actions">
                      <button className="points-btn-edit" onClick={() => { setEditingLevelId(level.id || level.level_id); setLevelForm({ levelName: level.levelName || level.level_name, minPoints: Number(level.minPoints || level.min_points || 0), maxPoints: Number(level.maxPoints || level.max_points || 0), benefits: level.benefits || '', discountPercent: Number(level.discountPercent || level.discount_percent || 0) }); }}>Sửa</button>
                      <button className="points-btn-del" onClick={() => deleteLevel(level.id || level.level_id)}>Xóa</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="points-card">
              <h2>Phần thưởng đổi điểm</h2>
              <div className="points-form">
                <label>Tên phần thưởng
                  <input value={rewardForm.rewardName} onChange={(e) => setRewardForm({ ...rewardForm, rewardName: e.target.value })} />
                </label>
                <label>Điểm cần
                  <input type="number" value={rewardForm.requiredPoints} onChange={(e) => setRewardForm({ ...rewardForm, requiredPoints: Number(e.target.value) })} />
                </label>
                <label>Loại phần thưởng
                  <select value={rewardForm.rewardType} onChange={(e) => setRewardForm({ ...rewardForm, rewardType: e.target.value })}>
                    <option value="voucher">Voucher</option>
                    <option value="coupon">Coupon</option>
                    <option value="gift">Quà tặng</option>
                  </select>
                </label>
                <label>Giá trị phần thưởng
                  <input value={rewardForm.rewardValue} placeholder="VD: 20K, 20%, COMBOFREE" onChange={(e) => setRewardForm({ ...rewardForm, rewardValue: e.target.value })} />
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={rewardForm.status} onChange={(e) => setRewardForm({ ...rewardForm, status: e.target.checked })} />
                  Kích hoạt phần thưởng
                </label>
                <button type="button" className="points-btn-primary" disabled={saving} onClick={handleRewardSubmit}>{saving ? 'Đang lưu...' : editingRewardId ? 'Cập nhật phần thưởng' : 'Thêm phần thưởng'}</button>
                {editingRewardId && (
                  <button type="button" className="points-btn-cancel" onClick={() => { setEditingRewardId(null); setRewardForm(defaultRewardForm); }}>
                    Huỷ
                  </button>
                )}
              </div>

              <div className="points-list">
                {rewards.map((reward) => (
                  <div key={reward.id || reward.reward_id} className="points-item">
                    <div>
                      <strong>{reward.rewardName || reward.reward_name}</strong>
                      <div>{formatNumber(reward.requiredPoints || reward.required_points || 0)} điểm • {reward.rewardType || reward.reward_type} • {reward.rewardValue || reward.reward_value}</div>
                    </div>
                    <div className="points-actions">
                      <button className="points-btn-edit" onClick={() => { setEditingRewardId(reward.id || reward.reward_id); setRewardForm({ rewardName: reward.rewardName || reward.reward_name, requiredPoints: Number(reward.requiredPoints || reward.required_points || 0), rewardType: reward.rewardType || reward.reward_type || 'voucher', rewardValue: reward.rewardValue || reward.reward_value || '', status: reward.status !== false }); }}>Sửa</button>
                      <button className="points-btn-del" onClick={() => deleteReward(reward.id || reward.reward_id)}>Xóa</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="points-card points-history-card">
            <div className="points-history-header">
              <h2>Lịch sử điểm thưởng</h2>
              <div className="points-history-tools">
                <input
                  className="points-history-search"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Tìm kiếm khách hàng..."
                />
              </div>
            </div>

            <div className="points-table-wrap">
              <table className="points-history-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Loại giao dịch</th>
                    <th>Điểm</th>
                    <th>Nội dung</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard.history || []).length === 0 ? (
                    <tr><td colSpan="5" className="points-empty-row">Không có lịch sử điểm nào.</td></tr>
                  ) : (dashboard.history || []).map((item) => (
                    <tr key={item.id || item.history_id}>
                      <td>
                        <div className="points-customer-cell">
                          <strong>{item.customerName || 'Khách hàng'}</strong>
                          <span>{item.email || '—'}</span>
                        </div>
                      </td>
                      <td><span className={`points-transaction-tag ${item.points >= 0 ? 'plus' : 'minus'}`}>{item.type || 'Điều chỉnh'}</span></td>
                      <td className={Number(item.points || 0) >= 0 ? 'positive' : 'negative'}>{Number(item.points || 0) >= 0 ? '+' : ''}{formatNumber(item.points || 0)}</td>
                      <td>{item.description || '—'}</td>
                      <td>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="points-pagination">
              <button type="button" disabled={Number(dashboard.pagination?.page || 1) <= 1} onClick={() => { const next = Number(dashboard.pagination?.page || 1) - 1; setHistoryPage(next); loadHistory(next); }}>Trước</button>
              <span>Trang {dashboard.pagination?.page || 1}/{dashboard.pagination?.totalPages || 1}</span>
              <button type="button" disabled={Number(dashboard.pagination?.page || 1) >= Number(dashboard.pagination?.totalPages || 1)} onClick={() => { const next = Number(dashboard.pagination?.page || 1) + 1; setHistoryPage(next); loadHistory(next); }}>Sau</button>
            </div>
          </div>

          <div className="points-card points-adjust-card">
            <h2>Điều chỉnh điểm khách hàng</h2>
            <div className="points-adjust-grid">
              <label>
                Tìm khách hàng
                <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Nhập tên, email hoặc ID" />
              </label>
              <label>
                Khách hàng
                <select value={adjustUserId} onChange={(e) => setAdjustUserId(e.target.value)}>
                  <option value="">-- Chọn khách hàng --</option>
                  {filteredUsers.map((user) => (
                    <option key={user.id} value={user.id}>{user.fullName} ({user.email})</option>
                  ))}
                </select>
              </label>
              <label>
                Số điểm
                <input type="number" value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} placeholder="Ví dụ: 100 hoặc -50" />
              </label>
              <label className="points-adjust-span">
                Nội dung điều chỉnh
                <textarea value={adjustDescription} onChange={(e) => setAdjustDescription(e.target.value)} placeholder="VD: Khách thiếu điểm khi đặt vé, bổ sung 100 điểm" />
              </label>
            </div>
            <button type="button" className="points-btn-primary" onClick={handleAdjustPoints} disabled={saving}>Lưu điều chỉnh</button>
          </div>
        </>
      )}
    </div>
  );
}

function numberFormat(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}
