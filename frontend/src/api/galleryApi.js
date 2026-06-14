import api from "../services/api";

/**
 * Upload work image
 * @param {FormData} formData (contains image, title, description)
 */
export const uploadGalleryItem = async (formData) => {
    return await api.post("/api/gallery", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
};

/**
 * Get all gallery items of a worker
 * @param {string} workerId
 */
export const getWorkerGallery = async (workerId) => {
    return await api.get(`/api/gallery/worker/${workerId}`);
};

/**
 * Get details of a single gallery item
 * @param {string} galleryId
 */
export const getGalleryDetails = async (galleryId) => {
    return await api.get(`/api/gallery/${galleryId}`);
};

/**
 * Delete gallery item
 * @param {string} galleryId
 */
export const deleteGalleryItem = async (galleryId) => {
    return await api.delete(`/api/gallery/${galleryId}`);
};

/**
 * Increase views count by 1
 * @param {string} galleryId
 */
export const incrementView = async (galleryId) => {
    return await api.post(`/api/gallery/${galleryId}/view`);
};

/**
 * Like gallery item
 * @param {string} galleryId
 */
export const likeGalleryItem = async (galleryId) => {
    return await api.post(`/api/gallery/${galleryId}/like`);
};

/**
 * Unlike gallery item
 * @param {string} galleryId
 */
export const unlikeGalleryItem = async (galleryId) => {
    return await api.delete(`/api/gallery/${galleryId}/like`);
};
