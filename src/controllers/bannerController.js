import { Banner } from "../models/Banner.js";
import { cloudinary } from "../config/cloudinary.js";

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

const uploadImageToCloudinary = (fileBuffer) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "saha-food/banners",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });

export const getBanners = async (_req, res) => {
  const banners = await Banner.find().sort({ createdAt: -1 });
  return res.json(banners);
};

export const createBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Banner image is required" });
    }

    const uploaded = await uploadImageToCloudinary(req.file.buffer);
    const payload = {
      title: req.body.title,
      subtitle: req.body.subtitle,
      image: uploaded.secure_url,
      ctaText: req.body.ctaText || "Order Now",
      ctaLink: req.body.ctaLink || "#menu",
      targetCategory: req.body.targetCategory || "",
      targetItem: req.body.targetItem || "",
      heroBadgeText: req.body.heroBadgeText || "Trending Tonight",
      heroTitleText: req.body.heroTitleText || "",
      heroMetaText: req.body.heroMetaText || "",
      isActive: req.body.isActive !== undefined ? toBoolean(req.body.isActive) : true,
    };

    const banner = await Banner.create(payload);
    return res.status(201).json(banner);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to create banner" });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const currentBanner = await Banner.findById(req.params.id);
    if (!currentBanner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    let imageUrl = currentBanner.image;
    if (req.file) {
      const uploaded = await uploadImageToCloudinary(req.file.buffer);
      imageUrl = uploaded.secure_url;
    }

    const payload = {
      ...req.body,
      image: imageUrl,
    };

    if (payload.isActive !== undefined) payload.isActive = toBoolean(payload.isActive);

    const banner = await Banner.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });

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
