import { body, param, validationResult } from "express-validator";

/**
 * Common middleware to intercept and return validation error responses
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: errors.array()[0].msg,
            errors: errors.array(),
        });
    }
    next();
};

/**
 * Rules for Category creation
 */
export const createCategoryRules = [
    body("name")
        .notEmpty()
        .withMessage("Category name is required")
        .isString()
        .withMessage("Category name must be a string")
        .trim(),
    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string")
        .trim(),
    body("icon")
        .optional()
        .isString()
        .withMessage("Icon must be a string")
        .trim(),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
];

/**
 * Rules for Category updates
 */
export const updateCategoryRules = [
    param("categoryId")
        .isMongoId()
        .withMessage("Invalid Category ID format"),
    body("name")
        .optional()
        .isString()
        .withMessage("Category name must be a string")
        .trim(),
    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string")
        .trim(),
    body("icon")
        .optional()
        .isString()
        .withMessage("Icon must be a string")
        .trim(),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
];

/**
 * Rules for Category queries/deletes using ID
 */
export const getOrDeleteCategoryRules = [
    param("categoryId")
        .isMongoId()
        .withMessage("Invalid Category ID format"),
];
