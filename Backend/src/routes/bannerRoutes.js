import express from "express";
import { createBanner, deleteBanner, getBanners, updateBanner } from "../controllers/bannerController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getBanners);
router.post("/", protect, adminOnly, createBanner);
router.put("/:id", protect, adminOnly, updateBanner);
router.delete("/:id", protect, adminOnly, deleteBanner);

export default router;