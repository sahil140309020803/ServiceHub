import express from "express";
import {
    getWorkers,
    getWorkerById,
    getOwnProfile,
    createOrUpdateProfile,
    deleteProfile,
    getMyProfileStatus
} from "../controllers/workerController.js";
import { protect } from "../middlewares/authMiddleware.js";
import {
    createOrUpdateProfileRules,
    getOrDeleteProfileRules,
    validate
} from "../middlewares/workerValidator.js";

const router = express.Router();

// Public route to filter/get all workers
router.get("/", getWorkers);

// Protected route to check profile completion status
router.get("/my-profile", protect, getMyProfileStatus);

// Protected route for professional to fetch their own worker profile
router.get("/me", protect, getOwnProfile);

// Public route to get worker profile detail by worker profile ID
router.get("/:workerId", getOrDeleteProfileRules, validate, getWorkerById);

// Protected route to create or update own worker profile
router.post(
    "/",
    protect,
    createOrUpdateProfileRules,
    validate,
    createOrUpdateProfile
);

// Protected route to delete worker profile (owner or admin only)
router.delete(
    "/:workerId",
    protect,
    getOrDeleteProfileRules,
    validate,
    deleteProfile
);

export default router;
