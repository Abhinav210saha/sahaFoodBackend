import express from "express";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import {
  getDeliveryConfigAdmin,
  getDeliveryConfigPublic,
  upsertDeliveryConfig,
} from "../controllers/deliveryController.js";

const router = express.Router();

router.get("/public", getDeliveryConfigPublic);
router.get("/admin", protect, adminOnly, getDeliveryConfigAdmin);
router.put("/admin", protect, adminOnly, upsertDeliveryConfig);

export default router;
