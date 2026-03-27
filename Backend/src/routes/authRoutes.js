import express from "express";
import {
  getProfile,
  loginUser,
  registerUser,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  updateProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password/request-otp", requestPasswordResetOtp);
router.post("/forgot-password/reset", resetPasswordWithOtp);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

export default router;
