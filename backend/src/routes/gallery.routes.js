import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middlewares/authMiddleware.js";
import { uploadImageMiddleware } from "../middlewares/upload.middleware.js";
import { validateGalleryUploadRules, validateResult } from "../validations/gallery.validation.js";
import {
    uploadGalleryItem,
    getWorkerGallery,
    getGalleryDetails,
    deleteGalleryItem,
    incrementView,
    likeGalleryItem,
    unlikeGalleryItem
} from "../controllers/gallery.controller.js";

const router = express.Router();

// Optional authorization middleware to check if user token is passed
const optionalProtect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select("-password");
            if (user) {
                req.user = user;
            }
        }
    } catch (error) {
        // Ignore token errors, continue unauthenticated
    }
    next();
};

// 1. Upload work image
router.post(
    "/",
    protect,
    uploadImageMiddleware("image"),
    validateGalleryUploadRules,
    validateResult,
    uploadGalleryItem
);

// 2. Get all gallery items of a worker
router.get("/worker/:workerId", getWorkerGallery);

// 3. Get single gallery item details
router.get("/:galleryId", optionalProtect, getGalleryDetails);

// 4. Worker deletes gallery item
router.delete("/:galleryId", protect, deleteGalleryItem);

// 5. Increase views count
router.post("/:galleryId/view", incrementView);

// 6. Like gallery item
router.post("/:galleryId/like", protect, likeGalleryItem);

// 7. Unlike gallery item
router.delete("/:galleryId/like", protect, unlikeGalleryItem);

export default router;
