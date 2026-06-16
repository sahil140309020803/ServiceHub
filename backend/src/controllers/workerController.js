import mongoose from "mongoose";
import WorkerProfile from "../models/WorkerProfile.js";
import User from "../models/User.js";

// Helper for distance calculations (Haversine formula)
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

/**
 * Retrieve all worker profiles with query filters, search queries, and pagination
 * @route GET /api/workers
 */
export const getWorkers = async (req, res) => {
    try {
        const { search, category, city, rating, experience, page = 1, limit = 10, lat, lng, sortBy } = req.query;
        const filter = {};

        // 1. Basic Filters
        if (category) {
            filter.serviceCategories = category;
        }

        if (city) {
            filter["serviceAreas.city"] = new RegExp(`^${city.trim()}$`, "i");
        }

        if (rating) {
            filter.averageRating = { $gte: parseFloat(rating) };
        }

        if (experience) {
            filter.experienceYears = { $gte: parseInt(experience, 10) };
        }

        // 2. Search query matching worker name, profession, category names, or skills
        if (search) {
            const searchRegex = new RegExp(search.trim(), "i");

            // Look up matching categories
            const Category = mongoose.model("Category");
            const matchingCategories = await Category.find({ name: searchRegex });
            const matchingCategoryIds = matchingCategories.map((c) => c._id);

            // Look up matching users (for worker name matches)
            const User = mongoose.model("User");
            const matchingUsers = await User.find({ fullName: searchRegex });
            const matchingUserIds = matchingUsers.map((u) => u._id);

            // Construct search filter conditions
            filter.$or = [
                { userId: { $in: matchingUserIds } },
                { profession: searchRegex },
                { skills: searchRegex },
                { serviceCategories: { $in: matchingCategoryIds } }
            ];
        }

        // 3. Pagination calculation
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const skipNum = (pageNum - 1) * limitNum;

        let workers = [];
        let totalWorkers = 0;

        if (lat && lng) {
            const customerLat = parseFloat(lat);
            const customerLng = parseFloat(lng);

            // Fetch all matching workers to calculate distances and sort before slicing
            const allWorkers = await WorkerProfile.find(filter)
                .populate("userId", "fullName email phoneNumber profileImage")
                .populate("serviceCategories", "name slug icon");

            // Attach distance property to each worker object
            const workersWithDistance = allWorkers.map((w) => {
                const wObj = w.toObject();
                if (wObj.latitude !== undefined && wObj.longitude !== undefined && wObj.latitude !== 0 && wObj.longitude !== 0) {
                    wObj.distance = getDistance(customerLat, customerLng, wObj.latitude, wObj.longitude);
                } else {
                    wObj.distance = 999999; // Far away or missing coordinates
                }
                return wObj;
            });

            // Sort
            if (sortBy === "rating") {
                workersWithDistance.sort((a, b) => {
                    if (b.averageRating !== a.averageRating) {
                        return b.averageRating - a.averageRating;
                    }
                    return a.distance - b.distance;
                });
            } else {
                workersWithDistance.sort((a, b) => {
                    if (a.distance !== b.distance) {
                        return a.distance - b.distance;
                    }
                    return b.averageRating - a.averageRating;
                });
            }

            totalWorkers = workersWithDistance.length;
            workers = workersWithDistance.slice(skipNum, skipNum + limitNum);
        } else {
            // Standard Database-level pagination and sorting
            totalWorkers = await WorkerProfile.countDocuments(filter);
            
            const results = await WorkerProfile.find(filter)
                .populate("userId", "fullName email phoneNumber profileImage")
                .populate("serviceCategories", "name slug icon")
                .sort({ averageRating: -1, createdAt: -1 })
                .skip(skipNum)
                .limit(limitNum);
                
            workers = results.map(r => r.toObject());
        }

        const totalPages = Math.ceil(totalWorkers / limitNum);

        return res.status(200).json({
            success: true,
            message: "Workers retrieved successfully",
            data: workers,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalWorkers,
                totalPages,
            },
        });
    } catch (error) {
        console.error("Get Workers Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve workers",
        });
    }
};

/**
 * Retrieve a single worker profile by ID, populating details and incrementing views
 * @route GET /api/workers/:workerId
 */
export const getWorkerById = async (req, res) => {
    try {
        const { workerId } = req.params;

        const profile = await WorkerProfile.findById(workerId)
            .populate("userId", "fullName email phoneNumber profileImage")
            .populate("serviceCategories", "name slug icon");

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Worker profile not found",
            });
        }

        // Increment profile views
        profile.profileViews = (profile.profileViews || 0) + 1;
        await profile.save();

        return res.status(200).json({
            success: true,
            message: "Worker profile retrieved successfully",
            data: profile,
        });
    } catch (error) {
        console.error("Get Worker By ID Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve worker profile",
        });
    }
};

/**
 * Retrieve own worker profile details for logged in professional
 * @route GET /api/workers/me
 */
export const getOwnProfile = async (req, res) => {
    try {
        const profile = await WorkerProfile.findOne({ userId: req.user._id })
            .populate("userId", "fullName email phoneNumber profileImage")
            .populate("serviceCategories", "name slug icon");

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Worker profile does not exist yet",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Worker profile retrieved successfully",
            data: profile,
        });
    } catch (error) {
        console.error("Get Own Profile Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve your profile",
        });
    }
};

/**
 * Create or update logged in user's worker profile
 * @route POST /api/workers
 */
export const createOrUpdateProfile = async (req, res) => {
    try {
        // Enforce that only users with the worker or admin role can have a professional profile
        if (req.user.role !== "worker" && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only registered service professionals are allowed to build worker profiles",
            });
        }

        const {
            profession,
            experienceYears,
            about,
            skills,
            serviceCategories,
            serviceAreas,
            latitude,
            longitude,
            whatsappNumber,
            availabilityStatus,
            profileImage,
        } = req.body;

        let address = req.body.address;

        // Perform reverse geocoding via Nominatim if lat/long is provided but no text address
        if (latitude && longitude && !address) {
            try {
                const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
                const response = await fetch(geoUrl, {
                    headers: {
                        "User-Agent": "ServiceHub-Backend/1.0",
                    },
                });
                const geoData = await response.json();
                if (geoData && geoData.display_name) {
                    address = geoData.display_name;
                }
            } catch (err) {
                console.error("Nominatim Reverse Geocoding failed:", err.message);
            }
        }

        if (profileImage !== undefined) {
            await User.findByIdAndUpdate(req.user._id, { profileImage });
        }

        let profile = await WorkerProfile.findOne({ userId: req.user._id });

        if (profile) {
            // Update profile
            profile.profession = profession;
            profile.experienceYears = experienceYears !== undefined ? experienceYears : profile.experienceYears;
            profile.about = about !== undefined ? about : profile.about;
            profile.skills = skills !== undefined ? skills : profile.skills;
            profile.serviceCategories = serviceCategories !== undefined ? serviceCategories : profile.serviceCategories;
            profile.serviceAreas = serviceAreas !== undefined ? serviceAreas : profile.serviceAreas;
            profile.address = address !== undefined ? address : profile.address;
            profile.latitude = latitude !== undefined ? latitude : profile.latitude;
            profile.longitude = longitude !== undefined ? longitude : profile.longitude;
            profile.whatsappNumber = whatsappNumber !== undefined ? whatsappNumber : profile.whatsappNumber;
            profile.availabilityStatus = availabilityStatus !== undefined ? availabilityStatus : profile.availabilityStatus;

            await profile.save();

            // Populate fresh values
            const updatedProfile = await WorkerProfile.findById(profile._id)
                .populate("userId", "fullName email phoneNumber profileImage")
                .populate("serviceCategories", "name slug icon");

            return res.status(200).json({
                success: true,
                message: "Worker profile updated successfully",
                data: updatedProfile,
            });
        } else {
            // Create profile
            const newProfile = await WorkerProfile.create({
                userId: req.user._id,
                profession,
                experienceYears: experienceYears || 0,
                about: about || "",
                skills: skills || [],
                serviceCategories: serviceCategories || [],
                serviceAreas: serviceAreas || [],
                address: address || "",
                latitude: latitude || 0,
                longitude: longitude || 0,
                whatsappNumber: whatsappNumber || "",
                availabilityStatus: availabilityStatus || "available",
            });

            // Populate fresh values
            const createdProfile = await WorkerProfile.findById(newProfile._id)
                .populate("userId", "fullName email phoneNumber profileImage")
                .populate("serviceCategories", "name slug icon");

            return res.status(201).json({
                success: true,
                message: "Worker profile created successfully",
                data: createdProfile,
            });
        }
    } catch (error) {
        console.error("Create or Update Worker Profile Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to manage worker profile",
        });
    }
};

/**
 * Delete a worker profile
 * @route DELETE /api/workers/:workerId
 */
export const deleteProfile = async (req, res) => {
    try {
        const { workerId } = req.params;

        const profile = await WorkerProfile.findById(workerId);
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Worker profile not found",
            });
        }

        // Restrict deletion to profile owner or system admin
        if (req.user.role !== "admin" && profile.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete this profile",
            });
        }

        await WorkerProfile.findByIdAndDelete(workerId);

        return res.status(200).json({
            success: true,
            message: "Worker profile deleted successfully",
        });
    } catch (error) {
        console.error("Delete Worker Profile Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete worker profile",
        });
    }
};

/**
 * Check if the current logged-in worker has completed their profile
 * @route GET /api/workers/my-profile
 */
export const getMyProfileStatus = async (req, res) => {
    try {
        const profile = await WorkerProfile.findOne({ userId: req.user._id })
            .populate("userId", "fullName email phoneNumber profileImage")
            .populate("serviceCategories", "name slug icon");

        if (!profile) {
            return res.status(200).json({
                profileCompleted: false
            });
        }

        return res.status(200).json({
            profileCompleted: true,
            profile
        });
    } catch (error) {
        console.error("Get My Profile Status Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve worker profile status",
        });
    }
};

