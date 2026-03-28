import { MenuItem } from "../models/MenuItem.js";
import { cloudinary } from "../config/cloudinary.js";

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

const uploadImageToCloudinary = (fileBuffer) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "saha-food/menu",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });

export const getMenuItems = async (_req, res) => {
  const items = await MenuItem.find().sort({ createdAt: -1 });
  return res.json(items);
};

export const createMenuItem = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Menu image is required" });
    }

    const uploaded = await uploadImageToCloudinary(req.file.buffer);
    const payload = {
      name: req.body.name,
      description: req.body.description,
      price: Number(req.body.price),
      category: req.body.category,
      image: uploaded.secure_url,
      rating: req.body.rating ? Number(req.body.rating) : 4.5,
      deliveryTime: req.body.deliveryTime || "25-30 mins",
      isAvailable: req.body.isAvailable !== undefined ? toBoolean(req.body.isAvailable) : true,
      isFeatured: req.body.isFeatured !== undefined ? toBoolean(req.body.isFeatured) : false,
    };

    const item = await MenuItem.create(payload);
    return res.status(201).json(item);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to create menu item" });
  }
};

export const updateMenuItem = async (req, res) => {
  try {
    const currentItem = await MenuItem.findById(req.params.id);
    if (!currentItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    let imageUrl = currentItem.image;
    if (req.file) {
      const uploaded = await uploadImageToCloudinary(req.file.buffer);
      imageUrl = uploaded.secure_url;
    }

    const payload = {
      ...req.body,
      image: imageUrl,
    };

    if (payload.price !== undefined) payload.price = Number(payload.price);
    if (payload.rating !== undefined) payload.rating = Number(payload.rating);
    if (payload.isAvailable !== undefined) payload.isAvailable = toBoolean(payload.isAvailable);
    if (payload.isFeatured !== undefined) payload.isFeatured = toBoolean(payload.isFeatured);

    const item = await MenuItem.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });

    if (!item) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    return res.json(item);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to update menu item" });
  }
};

export const deleteMenuItem = async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);

  if (!item) {
    return res.status(404).json({ message: "Menu item not found" });
  }

  return res.json({ message: "Menu item deleted" });
};
