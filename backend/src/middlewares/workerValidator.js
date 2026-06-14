import { body, param, validationResult } from "express-validator";

/**
 * Common validation middleware to intercept errors and return responses
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
 * Rules for creating or updating a worker profile
 */
export const createOrUpdateProfileRules = [
    body("profession")
        .notEmpty()
        .withMessage("Profession is required")
        .isString()
        .withMessage("Profession must be a string")
        .trim(),
    body("experienceYears")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Experience must be a positive integer"),
    body("about")
        .optional()
        .isString()
        .withMessage("About section must be a string")
        .trim(),
    body("skills")
        .optional()
        .isArray()
        .withMessage("Skills must be an array of strings"),
    body("skills.*")
        .optional()
        .isString()
        .withMessage("Each skill must be a string")
        .trim(),
    body("serviceCategories")
        .optional()
        .isArray()
        .withMessage("Service categories must be an array of IDs"),
    body("serviceCategories.*")
        .optional()
        .isMongoId()
        .withMessage("Each category ID must be a valid Mongo ID"),
    body("serviceAreas")
        .optional()
        .isArray()
        .withMessage("Service areas must be an array"),
    body("serviceAreas.*.area")
        .optional()
        .isString()
        .withMessage("Area must be a string")
        .trim(),
    body("serviceAreas.*.city")
        .optional()
        .isString()
        .withMessage("City must be a string")
        .trim(),
    body("serviceAreas.*.state")
        .optional()
        .isString()
        .withMessage("State must be a string")
        .trim(),
    body("address")
        .optional()
        .isString()
        .withMessage("Address must be a string")
        .trim(),
    body("latitude")
        .optional()
        .isNumeric()
        .withMessage("Latitude must be a number"),
    body("longitude")
        .optional()
        .isNumeric()
        .withMessage("Longitude must be a number"),
    body("whatsappNumber")
        .optional()
        .isString()
        .withMessage("WhatsApp number must be a string")
        .trim(),
    body("availabilityStatus")
        .optional()
        .isIn(["available", "busy", "offline"])
        .withMessage("Invalid availability status"),
];

/**
 * Rules for fetching/deleting specific worker profile IDs
 */
export const getOrDeleteProfileRules = [
    param("workerId")
        .isMongoId()
        .withMessage("Invalid Worker ID format"),
];
