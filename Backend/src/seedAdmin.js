import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/db.js";
import { User } from "./models/User.js";
import { MenuItem } from "./models/MenuItem.js";
import { Banner } from "./models/Banner.js";

dotenv.config();

const defaultMenu = [
  {
    name: "Butter Chicken Bowl",
    description: "Creamy tomato gravy, charred chicken, saffron rice and fresh herbs.",
    price: 249,
    category: "Best Sellers",
    image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=80",
    rating: 4.8,
    deliveryTime: "25 mins",
    isFeatured: true
  },
  {
    name: "Paneer Tikka Wrap",
    description: "Tandoori paneer, mint mayo, onions and crunchy lettuce rolled fresh.",
    price: 179,
    category: "Wraps",
    image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=80",
    rating: 4.6,
    deliveryTime: "20 mins",
    isFeatured: true
  },
  {
    name: "Loaded Chicken Burger",
    description: "Double chicken patty, smoked cheese, peri sauce and crispy onions.",
    price: 219,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
    deliveryTime: "30 mins"
  }
];

const defaultBanners = [
  {
    title: "Late-night cravings solved",
    subtitle: "Hot cloud-kitchen meals delivered fast across your city.",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
    ctaText: "Explore Menu",
    ctaLink: "#menu",
    targetCategory: "Best Sellers",
    targetItem: "Butter Chicken Bowl",
    heroBadgeText: "Trending Tonight",
    heroTitleText: "Butter Chicken Bowl",
    heroMetaText: "25 mins delivery",
    isActive: true
  },
  {
    title: "Fresh combos under Rs.299",
    subtitle: "Chef-curated bowls, burgers and wraps for every craving.",
    image: "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80",
    ctaText: "Order Tonight",
    ctaLink: "#menu",
    targetCategory: "Wraps",
    targetItem: "Paneer Tikka Wrap",
    heroBadgeText: "Top Pick",
    heroTitleText: "Paneer Tikka Wrap",
    heroMetaText: "20 mins delivery",
    isActive: true
  }
];

const seed = async () => {
  try {
    await connectDB();

    const normalizedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const normalizedPhone = process.env.ADMIN_PHONE?.trim();
    const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    const existingAdmin = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });

    if (existingAdmin) {
      existingAdmin.name = "Saha Admin";
      existingAdmin.email = normalizedEmail;
      existingAdmin.phone = normalizedPhone;
      existingAdmin.password = password;
      existingAdmin.role = "admin";
      await existingAdmin.save();
      console.log("Admin user updated");
    } else {
      await User.create({
        name: "Saha Admin",
        email: normalizedEmail,
        phone: normalizedPhone,
        password,
        role: "admin",
      });
      console.log("Admin user created");
    }

    if ((await MenuItem.countDocuments()) === 0) {
      await MenuItem.insertMany(defaultMenu);
      console.log("Menu seeded");
    }

    if ((await Banner.countDocuments()) === 0) {
      await Banner.insertMany(defaultBanners);
      console.log("Banners seeded");
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seed();
