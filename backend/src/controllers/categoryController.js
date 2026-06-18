import slugify from "slugify";
import Category from "../models/Category.js";
import SearchHistory from "../models/SearchHistory.js";

/**
 * Retrieve all categories
 * @route GET /api/categories
 */
export const getCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        const searchHistories = await SearchHistory.find();

        const categoriesWithPopularity = categories.map(category => {
            const searchCount = searchHistories.filter(sh => {
                if (sh.categoryId && sh.categoryId.toString() === category._id.toString()) {
                    return true;
                }
                if (sh.searchText && sh.searchText.toLowerCase().includes(category.name.toLowerCase())) {
                    return true;
                }
                return false;
            }).length;

            return {
                ...category.toObject(),
                searchCount
            };
        });

        // Sort: active first, then popularity (searchCount) desc, then name asc
        categoriesWithPopularity.sort((a, b) => {
            if (a.isActive !== b.isActive) {
                return a.isActive ? -1 : 1;
            }
            if (b.searchCount !== a.searchCount) {
                return b.searchCount - a.searchCount;
            }
            return a.name.localeCompare(b.name);
        });

        return res.status(200).json({
            success: true,
            message: "Categories retrieved successfully",
            data: categoriesWithPopularity,
        });
    } catch (error) {
        console.error("Get Categories Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve categories",
        });
    }
};

/**
 * Retrieve a single category by ID
 * @route GET /api/categories/:categoryId
 */
export const getCategoryById = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Category retrieved successfully",
            data: category,
        });
    } catch (error) {
        console.error("Get Category By ID Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve category",
        });
    }
};

/**
 * Create a new category
 * @route POST /api/categories
 * @access Private (Admin only)
 */
export const createCategory = async (req, res) => {
    try {
        const { name, description, icon, isActive } = req.body;

        // Check if category name already exists (case-insensitive)
        const nameRegex = new RegExp(`^${name.trim()}$`, "i");
        const existingCategory = await Category.findOne({ name: nameRegex });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: `Category with name '${name}' already exists`,
            });
        }

        // Generate lowercase slug
        const slug = slugify(name, { lower: true, strict: true });

        const category = await Category.create({
            name: name.trim(),
            slug,
            description: description?.trim() || "",
            icon: icon?.trim() || "",
            isActive: isActive !== undefined ? isActive : true,
        });

        return res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: category,
        });
    } catch (error) {
        console.error("Create Category Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create category",
        });
    }
};

/**
 * Update an existing category
 * @route PUT /api/categories/:categoryId
 * @access Private (Admin only)
 */
export const updateCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { name, description, icon, isActive } = req.body;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        // If the name is changing, check for duplicates and regenerate slug
        if (name && name.trim().toLowerCase() !== category.name.toLowerCase()) {
            const nameRegex = new RegExp(`^${name.trim()}$`, "i");
            const existingCategory = await Category.findOne({ name: nameRegex });
            
            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: `Category with name '${name}' already exists`,
                });
            }
            category.name = name.trim();
            category.slug = slugify(name, { lower: true, strict: true });
        }

        if (description !== undefined) category.description = description.trim();
        if (icon !== undefined) category.icon = icon.trim();
        if (isActive !== undefined) category.isActive = isActive;

        await category.save();

        return res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: category,
        });
    } catch (error) {
        console.error("Update Category Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update category",
        });
    }
};

/**
 * Delete a category
 * @route DELETE /api/categories/:categoryId
 * @access Private (Admin only)
 */
export const deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        
        const category = await Category.findByIdAndDelete(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Category deleted successfully",
            data: category,
        });
    } catch (error) {
        console.error("Delete Category Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete category",
        });
    }
};
