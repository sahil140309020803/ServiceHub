import WorkGallery from "../models/WorkGallery.js";
import GalleryLike from "../models/GalleryLike.js";
import WorkerProfile from "../models/WorkerProfile.js";
import cloudinary from "../config/cloudinary.js";

// Limit configuration
export const MAX_GALLERY_LIMIT = 20;

// Cloudinary upload helper using streams (avoids saving local files)
const uploadToCloudinary = (fileBuffer, folder = "gallery") => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve(result);
            }
        );
        uploadStream.end(fileBuffer);
    });
};

// Cloudinary delete helper (extracts public_id from URL)
const deleteFromCloudinary = async (imageUrl) => {
    try {
        if (!imageUrl) return;
        // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v12345/gallery/image_name.png
        const parts = imageUrl.split("/");
        const filename = parts.pop(); // image_name.png
        const folder = parts.pop(); // gallery
        const publicId = `${folder}/${filename.split(".")[0]}`;
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        console.error("Cloudinary deletion failed:", err.message);
    }
};

/**
 * Upload work image
 * POST /api/gallery
 */
export const uploadGalleryItem = async (req, res) => {
    try {
        // 1. Verify user role
        if (req.user.role !== "worker" && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only registered service professionals can upload gallery items"
            });
        }

        // 2. Fetch worker profile
        const profile = await WorkerProfile.findOne({ userId: req.user._id });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Worker profile not completed"
            });
        }

        // 3. Enforce maximum gallery images limit
        const existingCount = await WorkGallery.countDocuments({ workerId: profile._id });
        if (existingCount >= MAX_GALLERY_LIMIT) {
            return res.status(400).json({
                success: false,
                message: `Maximum gallery limit of ${MAX_GALLERY_LIMIT} images reached.`
            });
        }

        // 4. Validate image file presence
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Image file is required"
            });
        }

        const { title, description } = req.body;

        // 5. Upload image stream to Cloudinary
        const uploadResult = await uploadToCloudinary(req.file.buffer);
        const imageUrl = uploadResult.secure_url;

        // 6. Create gallery document
        const galleryItem = await WorkGallery.create({
            workerId: profile._id,
            imageUrl,
            title,
            description,
            viewsCount: 0,
            likesCount: 0
        });

        return res.status(201).json({
            success: true,
            message: "Gallery item uploaded successfully",
            data: galleryItem
        });
    } catch (error) {
        console.error("Gallery upload error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to upload gallery item"
        });
    }
};

/**
 * Get all gallery items of a worker
 * GET /api/gallery/worker/:workerId
 */
export const getWorkerGallery = async (req, res) => {
    try {
        const { workerId } = req.params;
        const galleryItems = await WorkGallery.find({ workerId }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: galleryItems
        });
    } catch (error) {
        console.error("Error fetching worker gallery:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch gallery items"
        });
    }
};

/**
 * Get single gallery item details
 * GET /api/gallery/:galleryId
 */
export const getGalleryDetails = async (req, res) => {
    try {
        const { galleryId } = req.params;
        const galleryItem = await WorkGallery.findById(galleryId);

        if (!galleryItem) {
            return res.status(404).json({
                success: false,
                message: "Gallery item not found"
            });
        }

        // Optional check if current user liked it
        let hasLiked = false;
        if (req.user) {
            const like = await GalleryLike.findOne({ galleryId, userId: req.user._id });
            if (like) hasLiked = true;
        }

        return res.status(200).json({
            success: true,
            data: galleryItem,
            hasLiked
        });
    } catch (error) {
        console.error("Error fetching gallery details:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch gallery item details"
        });
    }
};

/**
 * Worker deletes gallery item
 * DELETE /api/gallery/:galleryId
 */
export const deleteGalleryItem = async (req, res) => {
    try {
        const { galleryId } = req.params;

        // 1. Fetch worker profile
        const profile = await WorkerProfile.findOne({ userId: req.user._id });
        if (!profile) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete gallery items"
            });
        }

        // 2. Fetch gallery item
        const galleryItem = await WorkGallery.findById(galleryId);
        if (!galleryItem) {
            return res.status(404).json({
                success: false,
                message: "Gallery item not found"
            });
        }

        // 3. Verify ownership
        if (String(galleryItem.workerId) !== String(profile._id)) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own gallery items"
            });
        }

        // 4. Delete image from Cloudinary
        await deleteFromCloudinary(galleryItem.imageUrl);

        // 5. Delete from Mongo
        await WorkGallery.findByIdAndDelete(galleryId);

        // 6. Delete all likes
        await GalleryLike.deleteMany({ galleryId });

        return res.status(200).json({
            success: true,
            message: "Gallery item deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting gallery item:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete gallery item"
        });
    }
};

/**
 * Increase views count by 1
 * POST /api/gallery/:galleryId/view
 */
export const incrementView = async (req, res) => {
    try {
        const { galleryId } = req.params;
        const galleryItem = await WorkGallery.findById(galleryId);

        if (!galleryItem) {
            return res.status(404).json({
                success: false,
                message: "Gallery item not found"
            });
        }

        galleryItem.viewsCount = (galleryItem.viewsCount || 0) + 1;
        await galleryItem.save();

        return res.status(200).json({
            success: true,
            data: galleryItem
        });
    } catch (error) {
        console.error("Error incrementing views:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update views count"
        });
    }
};

/**
 * Like gallery item
 * POST /api/gallery/:galleryId/like
 */
export const likeGalleryItem = async (req, res) => {
    try {
        const { galleryId } = req.params;
        const userId = req.user._id;

        const galleryItem = await WorkGallery.findById(galleryId);
        if (!galleryItem) {
            return res.status(404).json({
                success: false,
                message: "Gallery item not found"
            });
        }

        // Prevent duplicate likes by checking if like already exists
        const existingLike = await GalleryLike.findOne({ galleryId, userId });
        if (existingLike) {
            return res.status(400).json({
                success: false,
                message: "You have already liked this project photo"
            });
        }

        // Create like entry
        await GalleryLike.create({ galleryId, userId });

        // Increment likes count on the project photo
        galleryItem.likesCount = (galleryItem.likesCount || 0) + 1;
        await galleryItem.save();

        return res.status(200).json({
            success: true,
            message: "Project photo liked successfully",
            likesCount: galleryItem.likesCount
        });
    } catch (error) {
        console.error("Error liking gallery item:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to like gallery item"
        });
    }
};

/**
 * Unlike gallery item
 * DELETE /api/gallery/:galleryId/like
 */
export const unlikeGalleryItem = async (req, res) => {
    try {
        const { galleryId } = req.params;
        const userId = req.user._id;

        const galleryItem = await WorkGallery.findById(galleryId);
        if (!galleryItem) {
            return res.status(404).json({
                success: false,
                message: "Gallery item not found"
            });
        }

        // Check if like exists
        const like = await GalleryLike.findOne({ galleryId, userId });
        if (!like) {
            return res.status(400).json({
                success: false,
                message: "You have not liked this project photo yet"
            });
        }

        // Delete like entry
        await GalleryLike.findByIdAndDelete(like._id);

        // Decrement likes count
        galleryItem.likesCount = Math.max(0, (galleryItem.likesCount || 0) - 1);
        await galleryItem.save();

        return res.status(200).json({
            success: true,
            message: "Project photo unliked successfully",
            likesCount: galleryItem.likesCount
        });
    } catch (error) {
        console.error("Error unliking gallery item:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to unlike gallery item"
        });
    }
};
