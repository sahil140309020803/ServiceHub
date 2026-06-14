import express from "express";
import {
    toggleFavorite,
    checkFavorite,
    getCustomerFavorites
} from "../controllers/favoriteController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Retrieve customer's favorites list (Protected)
router.get("/", protect, getCustomerFavorites);

// Check if specific worker is favorited (Protected)
router.get("/check/:workerId", protect, checkFavorite);

// Toggle worker profile favorite state (Protected)
router.post("/toggle", protect, toggleFavorite);

export default router;
