import mongoose from "mongoose";
import dotenv from "dotenv";
import Category from "../models/Category.js";
import slugify from "slugify";

dotenv.config();

const categories = [
    { name: "Electrician", icon: "flash", description: "Electrical repairs, fan/light installations, wiring and switches" },
    { name: "Plumber", icon: "water", description: "Leaking pipe repairs, tap installations, drainage and blockage clearances" },
    { name: "Carpenter", icon: "hammer", description: "Furniture repairs, wood cutting, fittings and general assembly" },
    { name: "Painter", icon: "color-palette", description: "Wall painting, interior/exterior paints, wood polishing and waterproofing" },
    { name: "AC Repair", icon: "thermometer", description: "Air conditioner servicing, gas charging, filter wash and installation" },
    { name: "RO Repair", icon: "water-outline", description: "Water filter servicing, membrane replacement and purifier installations" },
    { name: "TV Repair", icon: "tv", description: "Smart TV repairs, LED/LCD screen replacement and motherboard fixing" },
    { name: "Cleaning", icon: "sparkles", description: "Deep house cleaning, sofa/carpet cleaning and sanitation services" },
    { name: "CCTV Installation", icon: "videocam", description: "Security camera installations, setup, and DVR troubleshooting" },
    { name: "Refrigerator Repair", icon: "snow", description: "Double door fridge servicing, thermostat and gas charging fixes" },
    { name: "Washing Machine Repair", icon: "aperture", description: "Fully/Semi automatic washer fixes, spinner drum and motor repairs" }
];

const seedDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI environment variable is missing!");
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB for seeding");

        // Clear existing categories
        await Category.deleteMany({});
        console.log("🗑️ Wiped existing categories");

        // Map and add slugs
        const seededCategories = categories.map((cat) => ({
            ...cat,
            slug: slugify(cat.name, { lower: true, strict: true }),
            isActive: true
        }));

        await Category.insertMany(seededCategories);
        console.log(`🎉 Successfully seeded ${seededCategories.length} categories!`);

        await mongoose.connection.close();
        console.log("🔌 Closed database connection");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        process.exit(1);
    }
};

seedDB();
