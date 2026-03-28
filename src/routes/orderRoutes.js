import express from "express";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import {
  deleteMyOrder,
  getAllOrders,
  getMyOrders,
  getSalesDashboard,
  placeBulkOrders,
  placeOrder,
  updateOrderStatus,
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/", protect, placeOrder);
router.post("/bulk", protect, placeBulkOrders);
router.get("/my", protect, getMyOrders);
router.delete("/my/:orderId", protect, deleteMyOrder);
router.get("/", protect, adminOnly, getAllOrders);
router.get("/admin/dashboard", protect, adminOnly, getSalesDashboard);
router.put("/:orderId/status", protect, adminOnly, updateOrderStatus);

export default router;
