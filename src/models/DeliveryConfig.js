import mongoose from "mongoose";

const deliveryConfigSchema = new mongoose.Schema(
  {
    // Single settings document guard
    singletonKey: {
      type: String,
      default: "default",
      unique: true,
    },
    serviceableCities: {
      type: [String],
      default: [],
    },
    serviceablePincodes: {
      type: [String],
      default: [],
    },
    serviceableZones: {
      type: [
        new mongoose.Schema(
          {
            state: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            area: { type: String, trim: true, default: "" },
            pincodes: { type: [String], default: [] },
            isActive: { type: Boolean, default: true },
          },
          { _id: true }
        ),
      ],
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
