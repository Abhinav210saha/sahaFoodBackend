import { MenuItem } from "../models/MenuItem.js";

export const getMenuItems = async (_req, res) => {
  const items = await MenuItem.find().sort({ createdAt: -1 });
  return res.json(items);
};

export const createMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.create(req.body);
    return res.status(201).json(item);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to create menu item" });
  }
};

export const updateMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

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