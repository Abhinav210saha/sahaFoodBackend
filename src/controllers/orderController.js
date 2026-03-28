import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { MenuItem } from "../models/MenuItem.js";
import mongoose from "mongoose";

const ORDER_STATUS_SEQUENCE = ["placed", "preparing", "out_for_delivery", "delivered"];
const VALID_ADMIN_STATUSES = [...ORDER_STATUS_SEQUENCE, "cancelled"];

const mapAddressText = (address) =>
  [address.line1, address.line2, `${address.city}, ${address.state} - ${address.pincode}`, address.landmark]
    .filter(Boolean)
    .join(", ");

const parseDeliverySlot = (body) => {
  const deliverySlotType = body.deliverySlotType === "scheduled" ? "scheduled" : "asap";
  const scheduledFor =
    deliverySlotType === "scheduled" && body.scheduledFor ? new Date(body.scheduledFor) : null;

  if (deliverySlotType === "scheduled" && (!scheduledFor || Number.isNaN(scheduledFor.getTime()))) {
    throw new Error("Please provide a valid scheduled delivery time");
  }

  return {
    deliverySlotType,
    scheduledFor,
  };
};

const parseMenuItemReference = (menuItemId) => {
  if (!menuItemId || !mongoose.Types.ObjectId.isValid(menuItemId)) return null;
  return String(menuItemId);
};

const reserveMenuItemStock = async (menuItemId, quantity, checkOnly = false) => {
  if (!menuItemId) return null;

  const menuItem = await MenuItem.findById(menuItemId);
  if (!menuItem) return null;

  if (!menuItem.trackInventory) return menuItem;

  if (menuItem.stockQty < quantity) {
    throw new Error(`Only ${menuItem.stockQty} item(s) left in stock for ${menuItem.name}`);
  }

  if (checkOnly) return menuItem;

  menuItem.stockQty = Math.max(0, menuItem.stockQty - quantity);
  if (menuItem.stockQty === 0) {
    menuItem.isAvailable = false;
  }
  await menuItem.save();

  return menuItem;
};

export const placeOrder = async (req, res) => {
  try {
    const { itemName, itemPrice, quantity = 1, deliveryTime, addressId, menuItemId } = req.body;
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
    const parsedMenuItemId = parseMenuItemReference(menuItemId);
    const slot = parseDeliverySlot(req.body);
    const paymentMethod = req.body.paymentMethod === "online" ? "online" : "cod";
    const paymentStatus = paymentMethod === "online" ? String(req.body.paymentStatus || "") : "pending";
    const paymentId = String(req.body.paymentId || "");

    if (paymentMethod === "online" && paymentStatus !== "paid") {
      return res.status(400).json({ message: "Successful online payment is required" });
    }

    await reserveMenuItemStock(parsedMenuItemId, safeQuantity);

    const order = await Order.create({
      user: user._id,
      itemName,
      menuItem: parsedMenuItemId,
      itemPrice: safeItemPrice,
      quantity: safeQuantity,
      totalPrice,
      deliveryTime: deliveryTime || "25 mins",
      deliverySlotType: slot.deliverySlotType,
      scheduledFor: slot.scheduledFor,
      paymentMethod,
      paymentStatus: paymentMethod === "online" ? "paid" : "pending",
      paymentId,
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
      `Slot: ${order.deliverySlotType === "scheduled" ? `Scheduled (${new Date(order.scheduledFor).toLocaleString()})` : "ASAP"}`,
      `Payment: ${order.paymentMethod === "online" ? `Online (${order.paymentStatus})` : "Cash on Delivery"}`,
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

    const paymentMethod = req.body.paymentMethod === "online" ? "online" : "cod";
    const paymentStatus = paymentMethod === "online" ? String(req.body.paymentStatus || "") : "pending";
    const paymentId = String(req.body.paymentId || "");

    if (paymentMethod === "online" && paymentStatus !== "paid") {
      return res.status(400).json({ message: "Successful online payment is required" });
    }

    const sanitizedItems = items
      .map((item) => ({
        itemName: String(item.itemName || "").trim(),
        itemPrice: Number(item.itemPrice),
        quantity: Math.max(1, Number(item.quantity) || 1),
        deliveryTime: String(item.deliveryTime || "25 mins"),
        menuItemId: parseMenuItemReference(item.menuItemId),
        ...parseDeliverySlot(item),
      }))
      .filter((item) => item.itemName && Number.isFinite(item.itemPrice) && item.itemPrice > 0);

    if (sanitizedItems.length === 0) {
      return res.status(400).json({ message: "No valid items in cart" });
    }

    for (const item of sanitizedItems) {
      await reserveMenuItemStock(item.menuItemId, item.quantity, true);
    }
    for (const item of sanitizedItems) {
      await reserveMenuItemStock(item.menuItemId, item.quantity, false);
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
        menuItem: item.menuItemId,
        itemPrice: item.itemPrice,
        quantity: item.quantity,
        totalPrice: item.itemPrice * item.quantity,
        deliveryTime: item.deliveryTime,
        deliverySlotType: item.deliverySlotType,
        scheduledFor: item.scheduledFor,
        paymentMethod,
        paymentStatus: paymentMethod === "online" ? "paid" : "pending",
        paymentId,
        address: addressSnapshot,
      }))
    );

    const grandTotal = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const lines = orders.map(
      (order, idx) =>
        `${idx + 1}. ${order.itemName} x ${order.quantity} = Rs.${order.totalPrice} (${order.deliveryTime}, ${order.deliverySlotType === "scheduled" ? `Scheduled ${new Date(order.scheduledFor).toLocaleString()}` : "ASAP"})`
    );

    const whatsappMessage = [
      "New cart order from Saha Food app:",
      `Customer: ${user.name}`,
      `Phone: ${user.phone || "Not provided"}`,
      `Email: ${user.email || "Not provided"}`,
      "Items:",
      ...lines,
      `Grand Total: Rs.${grandTotal}`,
      `Payment: ${paymentMethod === "online" ? "Online (paid)" : "Cash on Delivery"}`,
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

export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  if (!VALID_ADMIN_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid order status" });
  }

  const order = await Order.findById(req.params.orderId);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  order.status = status;
  await order.save();

  return res.json(order);
};

export const getSalesDashboard = async (_req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [todayOrders, todayRevenueAgg, topItemsAgg] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: startOfDay } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),
    Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$itemName",
          quantitySold: { $sum: "$quantity" },
          revenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 5 },
    ]),
  ]);

  return res.json({
    todayOrders,
    todayRevenue: todayRevenueAgg[0]?.total || 0,
    topItems: topItemsAgg.map((item) => ({
      itemName: item._id,
      quantitySold: item.quantitySold,
      revenue: item.revenue,
    })),
    statusFlow: ORDER_STATUS_SEQUENCE,
  });
};
