import express from "express";
import { register, login, getMe, updateMe, uploadAvatar } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { uploadImageMiddleware } from "../middlewares/upload.middleware.js";

const router = express.Router();

// Register a new user
router.post("/register", register);

// Login a user
router.post("/login", login);

// Get current user profile
router.get("/me", protect, getMe);

// Update user profile
router.put("/update", protect, updateMe);

// Upload profile avatar
router.post("/upload-avatar", protect, uploadImageMiddleware("avatar"), uploadAvatar);

export default router;
