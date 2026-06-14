import mongoose from "mongoose";
import Review from "../models/Review.js";
import WorkerProfile from "../models/WorkerProfile.js";

/**
 * Recalculate worker profile's averageRating and totalReviews metrics
 * @param {string} workerId 
 */
const updateWorkerRatingMetrics = async (workerId) => {
    try {
        const reviews = await Review.find({ workerId, isApproved: true });
        const totalReviews = reviews.length;
        
        let averageRating = 0;
        if (totalReviews > 0) {
            const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
            averageRating = parseFloat((sum / totalReviews).toFixed(2));
        }

        await WorkerProfile.findByIdAndUpdate(workerId, {
            averageRating,
            totalReviews
        });
    } catch (error) {
        console.error("Failed to update worker rating metrics:", error);
    }
};

/**
 * Add a review for a service professional
 * @route POST /api/reviews
 */
export const addReview = async (req, res) => {
    try {
        const { workerId, rating, reviewText } = req.body;
        const customerId = req.user._id;

        // 1. Basic validation
        if (!workerId || !rating) {
            return res.status(400).json({
                success: false,
                message: "Worker profile ID and rating are required"
            });
        }

        const ratingNum = parseInt(rating, 10);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be a number between 1 and 5"
            });
        }

        // 2. Fetch target worker profile
        const worker = await WorkerProfile.findById(workerId);
        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker profile not found"
            });
        }

        // 3. Prevent professionals from reviewing their own profiles
        if (worker.userId.toString() === customerId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You are not allowed to write a review on your own professional profile"
            });
        }

        // 4. Ensure customer only leaves one review per worker
        const existingReview = await Review.findOne({ customerId, workerId });
        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: "You have already submitted a review for this professional"
            });
        }

        // 5. Create new review
        const review = await Review.create({
            workerId,
            customerId,
            rating: ratingNum,
            reviewText: reviewText || "",
            isApproved: true
        });

        // 6. Recalculate metrics on the worker profile
        await updateWorkerRatingMetrics(workerId);

        // Populate customer details for immediate response rendering
        const populatedReview = await Review.findById(review._id).populate(
            "customerId",
            "fullName email profileImage"
        );

        return res.status(201).json({
            success: true,
            message: "Review submitted successfully",
            data: populatedReview
        });
    } catch (error) {
        console.error("Add Review Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to submit review"
        });
    }
};

/**
 * Retrieve all reviews for a worker profile
 * @route GET /api/reviews/worker/:workerId
 */
export const getWorkerReviews = async (req, res) => {
    try {
        const { workerId } = req.params;

        const reviews = await Review.find({ workerId, isApproved: true })
            .populate("customerId", "fullName email profileImage")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Worker reviews retrieved successfully",
            data: reviews
        });
    } catch (error) {
        console.error("Get Worker Reviews Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve reviews"
        });
    }
};

/**
 * Delete a review (author or admin only)
 * @route DELETE /api/reviews/:reviewId
 */
export const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found"
            });
        }

        // Enforce ownership or admin privileges
        if (req.user.role !== "admin" && review.customerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this review"
            });
        }

        const workerId = review.workerId;
        await Review.findByIdAndDelete(reviewId);

        // Recalculate metrics on the worker profile
        await updateWorkerRatingMetrics(workerId);

        return res.status(200).json({
            success: true,
            message: "Review deleted successfully"
        });
    } catch (error) {
        console.error("Delete Review Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete review"
        });
    }
};
