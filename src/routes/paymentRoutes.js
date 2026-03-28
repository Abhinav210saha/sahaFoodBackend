import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createRazorpayOrder, verifyRazorpayPayment } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create-order", protect, createRazorpayOrder);
router.post("/verify", protect, verifyRazorpayPayment);

export default router;
