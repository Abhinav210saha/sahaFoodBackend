import mongoose from "mongoose";

const addressSnapshotSchema = new mongoose.Schema(
  {
    label: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      default: null,
    },
    itemPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryTime: {
      type: String,
      default: "25 mins",
    },
    deliverySlotType: {
      type: String,
      enum: ["asap", "scheduled"],
      default: "asap",
    },
    scheduledFor: {
      type: Date,
      default: null,
    },
    address: {
      type: addressSnapshotSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ["placed", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"],
      default: "placed",
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "online"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentId: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
