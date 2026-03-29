import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addAddress,
  deleteAddress,
  getAddresses,
  getPushPublicKey,
  subscribePush,
  unsubscribePush,
  updateAddress,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/addresses", protect, getAddresses);
router.post("/addresses", protect, addAddress);
router.put("/addresses/:addressId", protect, updateAddress);
router.delete("/addresses/:addressId", protect, deleteAddress);
router.get("/notifications/public-key", protect, getPushPublicKey);
router.post("/notifications/subscribe", protect, subscribePush);
router.post("/notifications/unsubscribe", protect, unsubscribePush);

export default router;
