import express from "express";
import {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} from "../controllers/categoryController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";
import {
    createCategoryRules,
    updateCategoryRules,
    getOrDeleteCategoryRules,
    validate
} from "../middlewares/categoryValidator.js";

const router = express.Router();

// Public route to fetch all categories
router.get("/", getCategories);

// Public route to fetch a category by ID
router.get("/:categoryId", getOrDeleteCategoryRules, validate, getCategoryById);

// Admin-only route to create a category
router.post(
    "/",
    protect,
    authorize("admin"),
    createCategoryRules,
    validate,
    createCategory
);

// Admin-only route to update a category
router.put(
    "/:categoryId",
    protect,
    authorize("admin"),
    updateCategoryRules,
    validate,
    updateCategory
);

// Admin-only route to delete a category
router.delete(
    "/:categoryId",
    protect,
    authorize("admin"),
    getOrDeleteCategoryRules,
    validate,
    deleteCategory
);

export default router;
