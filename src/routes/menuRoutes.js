import express from "express";
import { createMenuItem, deleteMenuItem, getMenuItems, updateMenuItem } from "../controllers/menuController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/", getMenuItems);
router.post("/", protect, adminOnly, upload.single("image"), createMenuItem);
router.put("/:id", protect, adminOnly, upload.single("image"), updateMenuItem);
router.delete("/:id", protect, adminOnly, deleteMenuItem);

export default router;
