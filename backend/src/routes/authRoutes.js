import express from "express";
import { register, login, getMe, updateMe } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Register a new user
router.post("/register", register);

// Login a user
router.post("/login", login);

// Get current user profile
router.get("/me", protect, getMe);

// Update user profile
router.put("/update", protect, updateMe);

export default router;
