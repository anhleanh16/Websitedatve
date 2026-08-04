import { EmployeeModel } from "../models/employeeModel.js";

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
    const data = req.body;
    if (!data.code && !data.position) {
      return res.status(400).json({ message: "Vui lòng nhập mã nhân viên và chức vụ." });
    }
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
    const ok = await EmployeeModel.update(id, req.body);
    if (!ok) return res.status(404).json({ message: "Không tìm thấy nhân viên." });
    const employee = await EmployeeModel.findById(id);
    res.json({ message: "Cập nhật nhân viên thành công.", employee });
  } catch (err) {
    console.error("Error in updateEmployee:", err);
    res.status(500).json({ message: err.message || "Lỗi khi cập nhật nhân viên." });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const ok = await EmployeeModel.delete(id);
    if (!ok) return res.status(404).json({ message: "Không tìm thấy nhân viên." });
    res.json({ message: "Đã xóa nhân viên." });
  } catch (err) {
    console.error("Error in deleteEmployee:", err);
    res.status(500).json({ message: "Lỗi khi xóa nhân viên." });
  }
};
