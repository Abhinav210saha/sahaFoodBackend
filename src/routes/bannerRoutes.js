import express from "express";
import { createBanner, deleteBanner, getBanners, updateBanner } from "../controllers/bannerController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/", getBanners);
router.post("/", protect, adminOnly, upload.single("image"), createBanner);
router.put("/:id", protect, adminOnly, upload.single("image"), updateBanner);
router.delete("/:id", protect, adminOnly, deleteBanner);

export default router;
