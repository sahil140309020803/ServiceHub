import express from 'express'
import cors from "cors";
import dotenv from "dotenv";
import connectDB from './src/config/db.js';
import authRoutes from './src/routes/authRoutes.js';
import categoryRoutes from './src/routes/categoryRoutes.js';
import workerRoutes from './src/routes/workerRoutes.js';
import reviewRoutes from './src/routes/reviewRoutes.js';
import favoriteRoutes from './src/routes/favoriteRoutes.js';
import extensionRoutes from './src/routes/extensionRoutes.js';
import galleryRoutes from './src/routes/gallery.routes.js';

// Configuring environment variables
dotenv.config();

const app = express();

// MongoDB Connection
connectDB();

// Middlewares
app.use(cors());                // Allows frontend to connect with backend
app.use(express.json());        // Allows to parse JSON data from frontend
app.use(express.urlencoded({ extended: true })); // Allows to parse URL-encoded data from frontend


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/extensions', extensionRoutes);
app.use('/api/gallery', galleryRoutes);


// Health Check Route
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "ServiceHub API is running 🚀",
    });
});

import { fileURLToPath } from 'url';

// Run server only when executed directly or when Vercel is not hosting
if (process.argv[1] === fileURLToPath(import.meta.url) || (!process.env.VERCEL && process.env.NODE_ENV !== 'production')) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;
