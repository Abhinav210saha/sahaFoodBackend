import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    ctaText: {
      type: String,
      default: "Order Now",
    },
    ctaLink: {
      type: String,
      default: "#menu",
    },
    targetCategory: {
      type: String,
      default: "",
      trim: true,
    },
    targetItem: {
      type: String,
      default: "",
      trim: true,
    },
    heroBadgeText: {
      type: String,
      default: "Trending Tonight",
      trim: true,
    },
    heroTitleText: {
      type: String,
      default: "",
      trim: true,
    },
    heroMetaText: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Banner = mongoose.model("Banner", bannerSchema);
