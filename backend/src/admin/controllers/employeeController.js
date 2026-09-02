import { EmployeeModel } from "../models/employeeModel.js";
import { BIRTH_DATE_ERROR, isValidBirthDate } from "../../utils/birthDate.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;
const EMPLOYEE_CODE_PATTERN = /^[A-Za-z0-9_-]{2,30}$/;
const ALLOWED_TYPES = new Set(["full_time", "part_time"]);
const ALLOWED_STATUSES = new Set(["active", "leave", "inactive"]);
const ALLOWED_SHIFTS = new Set(["morning", "afternoon", "night"]);
const normalizePhone = (value) => String(value || "").replace(/[\s.()-]/g, "");

const validateEmployee = (data, { creating = false } = {}) => {
  const name = String(data.name || data.full_name || "").trim();
  const code = String(data.code || data.employee_code || "").trim();
  const email = String(data.email || "").trim().toLowerCase();
  const phone = normalizePhone(data.phone);
  const salary = Number(data.salary);
  const shifts = Array.isArray(data.shifts) ? data.shifts : String(data.shifts || "").split(",").filter(Boolean);
  if (creating && (!Number.isInteger(Number(data.userId)) || Number(data.userId) <= 0)) return "Vui lòng chọn tài khoản người dùng hợp lệ.";
  if (!name || name.length < 2 || name.length > 100) return "Họ tên phải từ 2 đến 100 ký tự.";
  if (!creating && (!code || !EMPLOYEE_CODE_PATTERN.test(code))) return "Mã nhân viên chỉ gồm 2–30 chữ, số, gạch ngang hoặc gạch dưới.";
  if (!email || !EMAIL_PATTERN.test(email)) return "Email không hợp lệ.";
  if (!phone || !PHONE_PATTERN.test(phone)) return "Số điện thoại Việt Nam không hợp lệ.";
  if (!Number.isInteger(Number(data.cinemaId)) || Number(data.cinemaId) <= 0) return "Rạp phụ trách không hợp lệ.";
  if (!String(data.department || "").trim()) return "Vui lòng chọn bộ phận.";
  if (!Number.isFinite(salary) || salary <= 0 || salary > 1_000_000_000) return "Mức lương phải lớn hơn 0 và không vượt quá 1 tỷ đồng.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.hireDate || ""))) return "Ngày vào làm không hợp lệ.";
  if (String(data.hireDate) > new Date().toISOString().slice(0, 10)) return "Ngày vào làm không được ở tương lai.";
  if (data.dob && !isValidBirthDate(data.dob)) return BIRTH_DATE_ERROR;
  if (data.citizenId && !/^\d{12}$/.test(String(data.citizenId))) return "CCCD phải gồm đúng 12 chữ số.";
  if (String(data.address || "").trim().length > 255) return "Địa chỉ không được vượt quá 255 ký tự.";
  if (!ALLOWED_TYPES.has(String(data.type || ""))) return "Hình thức làm việc không hợp lệ.";
  if (!ALLOWED_STATUSES.has(String(data.status || ""))) return "Trạng thái nhân viên không hợp lệ.";
  if (!shifts.length || shifts.some(shift => !ALLOWED_SHIFTS.has(shift))) return "Ca làm việc không hợp lệ.";
  data.name = name;
  data.email = email;
  data.phone = phone;
  data.code = code;
  data.shifts = shifts;
  return "";
};

export const getEmployees = async (req, res) => {
  try {
    const { status, cinemaId, department, search } = req.query;
    const employees = await EmployeeModel.findAll({ status, cinemaId, department, search });
    const stats = await EmployeeModel.getStats();
    res.json({ employees, stats });
  } catch (err) {
    console.error("Error in getEmployees:", err);
    res.status(500).json({ message: "Lỗi khi lấy danh sách nhân viên.", employees: [], stats: {} });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const employee = await EmployeeModel.findById(id);
    if (!employee) return res.status(404).json({ message: "Không tìm thấy nhân viên." });
    res.json({ employee });
  } catch (err) {
    console.error("Error in getEmployeeById:", err);
    res.status(500).json({ message: "Lỗi khi lấy chi tiết nhân viên." });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const data = {
      ...req.body,
      ...(req.files?.avatar?.[0] ? { avatarUrl: `/uploads/staff/${req.files.avatar[0].filename}` } : {}),
      ...(req.files?.idCardFront?.[0] ? { idCardFrontUrl: `/uploads/staff/${req.files.idCardFront[0].filename}` } : {}),
      ...(req.files?.idCardBack?.[0] ? { idCardBackUrl: `/uploads/staff/${req.files.idCardBack[0].filename}` } : {}),
    };
    if (data.dob && !isValidBirthDate(data.dob)) {
      return res.status(400).json({ message: BIRTH_DATE_ERROR });
    }
    const validationError = validateEmployee(data, { creating: true });
    if (validationError) return res.status(400).json({ message: validationError });
    const id = await EmployeeModel.create(data);
    const employee = await EmployeeModel.findById(id);
    res.status(201).json({ message: "Tạo nhân viên thành công.", employee });
  } catch (err) {
    console.error("Error in createEmployee:", err);
    res.status(500).json({ message: err.message || "Lỗi khi tạo nhân viên." });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = {
      ...req.body,
      ...(req.files?.avatar?.[0] ? { avatarUrl: `/uploads/staff/${req.files.avatar[0].filename}` } : {}),
      ...(req.files?.idCardFront?.[0] ? { idCardFrontUrl: `/uploads/staff/${req.files.idCardFront[0].filename}` } : {}),
      ...(req.files?.idCardBack?.[0] ? { idCardBackUrl: `/uploads/staff/${req.files.idCardBack[0].filename}` } : {}),
    };
    if (data.dob && !isValidBirthDate(data.dob)) {
      return res.status(400).json({ message: BIRTH_DATE_ERROR });
    }
    const validationError = validateEmployee(data);
    if (validationError) return res.status(400).json({ message: validationError });
    const ok = await EmployeeModel.update(id, data);
    if (!ok) return res.status(404).json({ message: "Không tìm thấy nhân viên." });
    const employee = await EmployeeModel.findById(id);
    res.json({ message: "Cập nhật nhân viên thành công.", employee });
  } catch (err) {
    console.error("Error in updateEmployee:", err);
    res.status(err.statusCode || 500).json({ message: err.message || "Lỗi khi cập nhật nhân viên." });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Mã nhân viên không hợp lệ." });
    const ok = await EmployeeModel.delete(id);
    if (!ok) return res.status(404).json({ message: "Không tìm thấy nhân viên." });
    res.json({ message: "Đã xóa nhân viên." });
  } catch (err) {
    console.error("Error in deleteEmployee:", err);
    res.status(500).json({ message: "Lỗi khi xóa nhân viên." });
  }
};
