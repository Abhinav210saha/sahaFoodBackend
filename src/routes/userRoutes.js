import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { addAddress, deleteAddress, getAddresses, updateAddress } from "../controllers/userController.js";

const router = express.Router();

router.get("/addresses", protect, getAddresses);
router.post("/addresses", protect, addAddress);
router.put("/addresses/:addressId", protect, updateAddress);
router.delete("/addresses/:addressId", protect, deleteAddress);

export default router;
