import express from "express";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import { deleteMyOrder, getAllOrders, getMyOrders, placeBulkOrders, placeOrder } from "../controllers/orderController.js";

const router = express.Router();

router.post("/", protect, placeOrder);
router.post("/bulk", protect, placeBulkOrders);
router.get("/my", protect, getMyOrders);
router.delete("/my/:orderId", protect, deleteMyOrder);
router.get("/", protect, adminOnly, getAllOrders);

export default router;
