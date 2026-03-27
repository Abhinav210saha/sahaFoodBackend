import { Order } from "../models/Order.js";
import { User } from "../models/User.js";

const mapAddressText = (address) =>
  [address.line1, address.line2, `${address.city}, ${address.state} - ${address.pincode}`, address.landmark]
    .filter(Boolean)
    .join(", ");

export const placeOrder = async (req, res) => {
  try {
    const { itemName, itemPrice, quantity = 1, deliveryTime, addressId } = req.body;
    if (!itemName || !itemPrice || !addressId) {
      return res.status(400).json({ message: "itemName, itemPrice and addressId are required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const selectedAddress = user.addresses.id(addressId);
    if (!selectedAddress) {
      return res.status(404).json({ message: "Selected address not found" });
    }

    const safeQuantity = Math.max(1, Number(quantity) || 1);
    const safeItemPrice = Number(itemPrice);
    const totalPrice = safeItemPrice * safeQuantity;

    const order = await Order.create({
      user: user._id,
      itemName,
      itemPrice: safeItemPrice,
      quantity: safeQuantity,
      totalPrice,
      deliveryTime: deliveryTime || "25 mins",
      address: {
        label: selectedAddress.label,
        line1: selectedAddress.line1,
        line2: selectedAddress.line2,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
        landmark: selectedAddress.landmark,
      },
    });

    const whatsappMessage = [
      "New order from Saha Food app:",
      `Order ID: ${order._id}`,
      `Customer: ${user.name}`,
      `Phone: ${user.phone || "Not provided"}`,
      `Email: ${user.email || "Not provided"}`,
      `Item: ${order.itemName}`,
      `Price: Rs.${order.itemPrice}`,
      `Quantity: ${order.quantity}`,
      `Total: Rs.${order.totalPrice}`,
      `Delivery time: ${order.deliveryTime}`,
      `Address (${selectedAddress.label}): ${mapAddressText(selectedAddress)}`,
    ].join("\n");

    return res.status(201).json({ order, whatsappMessage });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to place order" });
  }
};

export const placeBulkOrders = async (req, res) => {
  try {
    const { items, addressId } = req.body;
    if (!Array.isArray(items) || items.length === 0 || !addressId) {
      return res.status(400).json({ message: "items array and addressId are required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const selectedAddress = user.addresses.id(addressId);
    if (!selectedAddress) {
      return res.status(404).json({ message: "Selected address not found" });
    }

    const sanitizedItems = items
      .map((item) => ({
        itemName: String(item.itemName || "").trim(),
        itemPrice: Number(item.itemPrice),
        quantity: Math.max(1, Number(item.quantity) || 1),
        deliveryTime: String(item.deliveryTime || "25 mins"),
      }))
      .filter((item) => item.itemName && Number.isFinite(item.itemPrice) && item.itemPrice > 0);

    if (sanitizedItems.length === 0) {
      return res.status(400).json({ message: "No valid items in cart" });
    }

    const addressSnapshot = {
      label: selectedAddress.label,
      line1: selectedAddress.line1,
      line2: selectedAddress.line2,
      city: selectedAddress.city,
      state: selectedAddress.state,
      pincode: selectedAddress.pincode,
      landmark: selectedAddress.landmark,
    };

    const orders = await Order.insertMany(
      sanitizedItems.map((item) => ({
        user: user._id,
        itemName: item.itemName,
        itemPrice: item.itemPrice,
        quantity: item.quantity,
        totalPrice: item.itemPrice * item.quantity,
        deliveryTime: item.deliveryTime,
        address: addressSnapshot,
      }))
    );

    const grandTotal = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const lines = orders.map(
      (order, idx) =>
        `${idx + 1}. ${order.itemName} x ${order.quantity} = Rs.${order.totalPrice} (${order.deliveryTime})`
    );

    const whatsappMessage = [
      "New cart order from Saha Food app:",
      `Customer: ${user.name}`,
      `Phone: ${user.phone || "Not provided"}`,
      `Email: ${user.email || "Not provided"}`,
      "Items:",
      ...lines,
      `Grand Total: Rs.${grandTotal}`,
      `Address (${selectedAddress.label}): ${mapAddressText(selectedAddress)}`,
    ].join("\n");

    return res.status(201).json({ orders, whatsappMessage, grandTotal });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to place cart order" });
  }
};

export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  return res.json(orders);
};

export const deleteMyOrder = async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  await order.deleteOne();
  return res.json({ message: "Order deleted" });
};

export const getAllOrders = async (_req, res) => {
  const orders = await Order.find().populate("user", "name email phone").sort({ createdAt: -1 });
  return res.json(orders);
};
