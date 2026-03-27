import { User } from "../models/User.js";

const sortAddresses = (addresses) => [...addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

const normalizeDefault = (addresses, targetId) =>
  addresses.map((address) => ({
    ...address,
    isDefault: String(address._id) === String(targetId),
  }));

export const getAddresses = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json(sortAddresses(user.addresses));
};

export const addAddress = async (req, res) => {
  try {
    const { label, line1, line2, city, state, pincode, landmark, isDefault } = req.body;
    if (!label || !line1 || !city || !state || !pincode) {
      return res.status(400).json({ message: "Label, line1, city, state and pincode are required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newAddress = {
      label: label.trim(),
      line1: line1.trim(),
      line2: line2?.trim() || "",
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      landmark: landmark?.trim() || "",
      isDefault: Boolean(isDefault),
    };

    user.addresses.push(newAddress);
    const createdAddress = user.addresses[user.addresses.length - 1];

    if (newAddress.isDefault || user.addresses.length === 1) {
      user.addresses = normalizeDefault(user.addresses, createdAddress._id);
    }

    await user.save();
    return res.status(201).json(sortAddresses(user.addresses));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to add address" });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    const fields = ["label", "line1", "line2", "city", "state", "pincode", "landmark"];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        address[field] = String(req.body[field]).trim();
      }
    });

    if (req.body.isDefault) {
      user.addresses = normalizeDefault(user.addresses, address._id);
    }

    await user.save();
    return res.json(sortAddresses(user.addresses));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update address" });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    const wasDefault = address.isDefault;
    address.deleteOne();

    if (wasDefault && user.addresses.length > 0) {
      user.addresses = normalizeDefault(user.addresses, user.addresses[0]._id);
    }

    await user.save();
    return res.json(sortAddresses(user.addresses));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to delete address" });
  }
};
