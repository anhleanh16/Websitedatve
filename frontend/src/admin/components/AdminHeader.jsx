import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { clearUser } from "../../redux/slices/userSlice";
import { adminEmployeeService } from "../services/adminApi";

const ATTENDANCE_REQUESTS_KEY = "admin_attendance_requests";
const ATTENDANCE_RECORDS_KEY = "admin_attendance_records";
const todayKey = () => new Date().toISOString().slice(0, 10);
const readRequests = () => {
  try {
    const requests = JSON.parse(localStorage.getItem(ATTENDANCE_REQUESTS_KEY) || "[]");
    return requests.filter((request) => request.date === todayKey());
  } catch {
    return [];
  }
};

export default function AdminHeader({ onMenuToggle }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const storedProfile = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();
  const profile = { ...storedProfile, ...(useSelector((state) => state.user.profile) || {}) };
  const role = String(profile.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isManager = role === "manager" || (role === "employee" && /quản lý|quan ly|manager/i.test(String(profile.employee_position || profile.position || "")));
  const isEmployee = role === "employee" && !isManager;
  const canRequestAttendance = isEmployee || isManager;
  const canReviewAttendance = isAdmin || isManager;
  const [requests, setRequests] = useState(readRequests);
  const [showRequests, setShowRequests] = useState(false);
  const [employeeInfo, setEmployeeInfo] = useState(null);

  useEffect(() => {
    if (!isEmployee && !isManager) return undefined;
    adminEmployeeService.getAll().then((response) => {
      const current = (response?.employees || []).find((employee) => Number(employee.userId) === Number(profile.id));
      setEmployeeInfo(current || null);
    }).catch(() => {});
    return undefined;
  }, [isEmployee, isManager, profile.id]);

  useEffect(() => {
    const refresh = () => {
      const current = readRequests();
      localStorage.setItem(ATTENDANCE_REQUESTS_KEY, JSON.stringify(current));
      setRequests(current);
    };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const visibleRequests = useMemo(() => {
    if (!isManager) return requests;
    return employeeInfo?.cinemaId
      ? requests.filter((request) => Number(request.cinemaId) === Number(employeeInfo.cinemaId)
        && Number(request.employeeId) !== Number(profile.id)
        && request.requesterRole !== "manager")
      : [];
  }, [employeeInfo, isManager, profile.id, requests]);
  const hasSentToday = requests.some((request) => Number(request.employeeId) === Number(profile.id));

  const sendAttendanceRequest = () => {
    if (hasSentToday) return;
    const next = [...requests, { id: `${profile.id}-${todayKey()}`, date: todayKey(), employeeId: profile.id, employeeName: profile.name || profile.full_name || "Nhân viên", cinemaId: employeeInfo?.cinemaId || null, requesterRole: isManager ? "manager" : "employee", status: "pending" }];
    localStorage.setItem(ATTENDANCE_REQUESTS_KEY, JSON.stringify(next));
    setRequests(next);
  };

  const updateRequest = (id, status) => {
    const next = requests.map((request) => request.id === id ? { ...request, status } : request);
    localStorage.setItem(ATTENDANCE_REQUESTS_KEY, JSON.stringify(next));
    if (status === "confirmed") {
      let records = [];
      try { records = JSON.parse(localStorage.getItem(ATTENDANCE_RECORDS_KEY) || "[]"); } catch { records = []; }
      const recordId = `${id}-attendance`;
      if (!records.some((record) => record.id === recordId)) {
        records.push({
          id: recordId,
          employeeId: requests.find((request) => request.id === id)?.employeeId,
          date: todayKey(),
          shiftId: "morning",
          status: "present",
        });
        localStorage.setItem(ATTENDANCE_RECORDS_KEY, JSON.stringify(records));
      }
    }
    setRequests(next);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch(clearUser());
    navigate('/login');
  };

  return (
    <header className="admin-header">
      <div className="header-left">
        {/* Nút hamburger cho mobile */}
        <button className="header-menu-btn" onClick={onMenuToggle} title="Menu">
          ☰
        </button>
        <h1>Bảng điều khiển quản trị</h1>
      </div>
      <div className="header-right">
        {canRequestAttendance && (
          <button className={`attendance-request-btn${hasSentToday ? " sent" : ""}`} onClick={sendAttendanceRequest} disabled={hasSentToday}>
            {hasSentToday ? "Đã gửi yêu cầu chấm công" : "Chấm công"}
          </button>
        )}
        {canReviewAttendance && (
          <div className="attendance-request-wrap">
            <button className="attendance-request-btn" onClick={() => setShowRequests((value) => !value)}>
              Yêu cầu chấm công{visibleRequests.filter((request) => request.status === "pending").length > 0 && <span className="attendance-request-count">{visibleRequests.filter((request) => request.status === "pending").length}</span>}
            </button>
            {showRequests && <div className="attendance-request-popover">
              {visibleRequests.filter((request) => request.status === "pending").length === 0 ? <span>Không có yêu cầu chấm công</span> : visibleRequests.filter((request) => request.status === "pending").map((request) => (
                <div className="attendance-request-item" key={request.id}>
                  <strong>{request.employeeName} yêu cầu chấm công</strong>
                  <div><button onClick={() => updateRequest(request.id, "confirmed")}>Xác nhận</button><button onClick={() => updateRequest(request.id, "cancelled")}>Hủy</button></div>
                </div>
              ))}
            </div>}
          </div>
        )}
        <button className="btn-logout" onClick={handleLogout}>Đăng xuất</button>
      </div>
    </header>
  );
}
