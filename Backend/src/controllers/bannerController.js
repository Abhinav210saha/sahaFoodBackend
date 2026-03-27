import { Banner } from "../models/Banner.js";

export const getBanners = async (_req, res) => {
  const banners = await Banner.find().sort({ createdAt: -1 });
  return res.json(banners);
};

export const createBanner = async (req, res) => {
  try {
    const banner = await Banner.create(req.body);
    return res.status(201).json(banner);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to create banner" });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    return res.json(banner);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to update banner" });
  }
};

export const deleteBanner = async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);

  if (!banner) {
    return res.status(404).json({ message: "Banner not found" });
  }

  return res.json({ message: "Banner deleted" });
};