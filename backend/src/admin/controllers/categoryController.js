import { CategoryModel } from "../models/categoryModel.js";

export const getAllCategories = async (req, res) => {
  try {
    const categories = await CategoryModel.findAll();
    res.json({ categories });
  } catch (err) {
    console.error("Error in getAllCategories:", err);
    res.status(500).json({ message: "Error getting categories" });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await CategoryModel.findById(id);
    if (category) {
      res.json(category);
    } else {
      res.status(404).json({ message: "Category not found" });
    }
  } catch (err) {
    console.error("Error in getCategoryById:", err);
    res.status(500).json({ message: "Error getting category" });
  }
};

export const createCategory = async (req, res) => {
  try {
    const categoryId = await CategoryModel.create(req.body);
    res
      .status(201)
      .json({ message: "Category created successfully", categoryId });
  } catch (err) {
    console.error("Error in createCategory:", err);
    res.status(500).json({ message: "Failed to create category" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await CategoryModel.update(id, req.body);
    if (success) {
      res.json({ message: "Category updated successfully" });
    } else {
      res
        .status(404)
        .json({ message: "Category not found or no changes made" });
    }
  } catch (err) {
    console.error("Error in updateCategory:", err);
    res.status(500).json({ message: "Failed to update category" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await CategoryModel.delete(id);
    if (success) {
      res.json({ message: "Category deleted successfully" });
    } else {
      res.status(404).json({ message: "Category not found" });
    }
  } catch (err) {
    // Bắt lỗi nếu có ràng buộc khóa ngoại (ví dụ: không thể xóa vì có phim đang dùng)
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res
        .status(400)
        .json({
          message:
            "Cannot delete category. It is currently in use by one or more movies.",
        });
    }
    console.error("Error in deleteCategory:", err);
    res.status(500).json({ message: "Failed to delete category" });
  }
};
