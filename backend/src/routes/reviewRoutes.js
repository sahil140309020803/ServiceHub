import express from "express";
import {
    addReview,
    getWorkerReviews,
    deleteReview
} from "../controllers/reviewController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Retrieve reviews for a worker (Public)
router.get("/worker/:workerId", getWorkerReviews);

// Add a review (Protected)
router.post("/", protect, addReview);

// Delete a review (Protected)
router.delete("/:reviewId", protect, deleteReview);

export default router;
