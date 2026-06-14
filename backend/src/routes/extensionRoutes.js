import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
    logContactClick,
    getContactStats
} from "../controllers/contactController.js";
import {
    saveSearchQuery,
    getSearchHistory,
    clearSearchHistory
} from "../controllers/searchHistoryController.js";
import {
    saveLocation,
    getLocations,
    deleteLocation
} from "../controllers/locationController.js";
import {
    submitReport,
    getReports
} from "../controllers/reportController.js";

const router = express.Router();

// Lead tracking routes
router.post("/contacts", protect, logContactClick);
router.get("/contacts/stats", protect, getContactStats);

// Search history routes
router.post("/search-history", protect, saveSearchQuery);
router.get("/search-history", protect, getSearchHistory);
router.delete("/search-history", protect, clearSearchHistory);

// Saved locations routes
router.post("/locations", protect, saveLocation);
router.get("/locations", protect, getLocations);
router.delete("/locations/:locationId", protect, deleteLocation);

// Flag/report profile routes
router.post("/reports", protect, submitReport);
router.get("/reports", protect, getReports);

export default router;
