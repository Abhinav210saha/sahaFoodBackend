import mongoose from "mongoose";

const deliveryConfigSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: "default",
      unique: true,
    },
    serviceableCities: {
      type: [String],
      default: [],
    },
    enforceServiceability: {
      type: Boolean,
      default: true,
    },
    comingSoonMessage: {
      type: String,
      default: "We are reaching your area very soon.",
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export const DeliveryConfig = mongoose.models.DeliveryConfig || mongoose.model("DeliveryConfig", deliveryConfigSchema);
