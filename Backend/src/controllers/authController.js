import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User } from "../models/User.js";
import { generateToken } from "../middleware/generateToken.js";

const buildIdentifierQuery = (identifier) => {
  const cleanIdentifier = identifier.trim().toLowerCase();
  return cleanIdentifier.includes("@")
    ? { email: cleanIdentifier }
    : { phone: cleanIdentifier };
};

const mapUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar,
  addresses: user.addresses || [],
});

const isEnvAdminLogin = (identifier, password) => {
  const cleanIdentifier = identifier.trim().toLowerCase();
  const cleanPhone = identifier.trim();
  const envEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const envPhone = (process.env.ADMIN_PHONE || "").trim();
  const envPassword = String(process.env.ADMIN_PASSWORD || "");

  const identifierMatches = cleanIdentifier === envEmail || cleanPhone === envPhone;
  return identifierMatches && password === envPassword;
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !password || (!email && !phone)) {
      return res.status(400).json({ message: "Name, password and email or phone are required" });
    }

    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhone = phone?.trim();

    const existingUser = await User.findOne({
      $or: [normalizedEmail ? { email: normalizedEmail } : null, normalizedPhone ? { phone: normalizedPhone } : null].filter(Boolean),
    });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email or phone" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
    });

    return res.status(201).json({
      token: generateToken(user._id),
      user: mapUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Registration failed" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Identifier and password are required" });
    }

    let user = await User.findOne(buildIdentifierQuery(identifier));
    let isMatch = false;

    if (user) {
      isMatch = await bcrypt.compare(password, user.password);
    }

    // Fallback: allow env-admin credentials and auto-sync DB admin record.
    if (!isMatch && isEnvAdminLogin(identifier, password)) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
      const adminPhone = (process.env.ADMIN_PHONE || "").trim();

      user = await User.findOneAndUpdate(
        { $or: [{ email: adminEmail }, { phone: adminPhone }] },
        {
          $set: {
            name: "Saha Admin",
            email: adminEmail,
            phone: adminPhone,
            password: hashedPassword,
            role: "admin",
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      isMatch = true;
    }

    if (!user || !isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.json({
      token: generateToken(user._id),
      user: mapUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Login failed" });
  }
};

export const getProfile = async (req, res) => {
  return res.json(req.user);
};

export const updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name?.trim()) {
      user.name = name.trim();
    }

    if (avatar?.trim()) {
      user.avatar = avatar.trim();
    }

    await user.save();
    return res.json(mapUserResponse(user));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Profile update failed" });
  }
};

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");
const otpProvider = (process.env.OTP_PROVIDER || "local").toLowerCase();

const toDigits = (value) => String(value || "").replace(/\D/g, "");

const toE164IndianDefault = (value) => {
  const raw = String(value || "").trim();
  if (raw.startsWith("+")) return raw;
  const digits = toDigits(raw);
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length > 10 && !digits.startsWith("0")) return `+${digits}`;
  return `+${digits}`;
};

const toMsg91Mobile = (value) => {
  const digits = toDigits(value);
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

const twilioBasicAuth = () =>
  `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`;

const sendOtpViaTwilio = async (phone) => {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !serviceSid) {
    throw new Error("Twilio credentials are missing");
  }

  const body = new URLSearchParams({
    To: toE164IndianDefault(phone),
    Channel: "sms",
  });

  const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`, {
    method: "POST",
    headers: {
      Authorization: twilioBasicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to send OTP via Twilio");
  }
};

const verifyOtpViaTwilio = async (phone, otp) => {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !serviceSid) {
    throw new Error("Twilio credentials are missing");
  }

  const body = new URLSearchParams({
    To: toE164IndianDefault(phone),
    Code: otp,
  });

  const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`, {
    method: "POST",
    headers: {
      Authorization: twilioBasicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to verify OTP via Twilio");
  }

  return data.status === "approved";
};

const sendOtpViaMsg91 = async (phone, otp) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  if (!authKey || !templateId) {
    throw new Error("MSG91 credentials are missing");
  }

  const mobile = toMsg91Mobile(phone);
  const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(
    templateId
  )}&mobile=${encodeURIComponent(mobile)}&authkey=${encodeURIComponent(authKey)}&otp=${encodeURIComponent(otp)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.type === "error") {
    throw new Error(data.message || "Failed to send OTP via MSG91");
  }
};

const verifyOtpViaMsg91 = async (phone, otp) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) {
    throw new Error("MSG91 credentials are missing");
  }

  const mobile = toMsg91Mobile(phone);
  const url = `https://control.msg91.com/api/v5/otp/verify?otp=${encodeURIComponent(
    otp
  )}&mobile=${encodeURIComponent(mobile)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { authkey: authKey },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to verify OTP via MSG91");
  }

  const text = String(data.message || "").toLowerCase();
  return text.includes("verified");
};

export const requestPasswordResetOtp = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier?.trim()) {
      return res.status(400).json({ message: "Identifier is required" });
    }

    const user = await User.findOne(buildIdentifierQuery(identifier));
    if (!user) {
      return res.json({ message: "If account exists, OTP has been sent." });
    }

    if (!user.phone && otpProvider !== "local") {
      return res.status(400).json({ message: "No phone number linked with this account" });
    }

    if (otpProvider === "twilio") {
      await sendOtpViaTwilio(user.phone);
      user.resetOtpHash = "";
      user.resetOtpExpiresAt = null;
      await user.save();
      return res.json({ message: "OTP sent via Twilio SMS." });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    if (otpProvider === "msg91") {
      await sendOtpViaMsg91(user.phone, otp);
      user.resetOtpHash = hashOtp(otp);
      user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      return res.json({
        message: "OTP sent via MSG91 SMS.",
        ...(process.env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
      });
    }

    user.resetOtpHash = hashOtp(otp);
    user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    console.log(`Password reset OTP for ${identifier}: ${otp}`);

    return res.json({
      message: "OTP generated (local mode).",
      ...(process.env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to send OTP" });
  }
};

export const resetPasswordWithOtp = async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;
    if (!identifier?.trim() || !otp?.trim() || !newPassword?.trim()) {
      return res.status(400).json({ message: "Identifier, OTP and newPassword are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne(buildIdentifierQuery(identifier));
    if (!user) {
      return res.status(400).json({ message: "Invalid OTP or identifier" });
    }

    if (otpProvider === "twilio") {
      const approved = await verifyOtpViaTwilio(user.phone, otp);
      if (!approved) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }
    } else {
      let isValidOtp = false;
      if (otpProvider === "msg91") {
        isValidOtp = await verifyOtpViaMsg91(user.phone, otp);
      } else {
        const isExpired = !user.resetOtpExpiresAt || user.resetOtpExpiresAt.getTime() < Date.now();
        const matches = user.resetOtpHash && user.resetOtpHash === hashOtp(otp);
        isValidOtp = !isExpired && Boolean(matches);
      }
      if (!isValidOtp) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtpHash = "";
    user.resetOtpExpiresAt = null;
    await user.save();

    return res.json({ message: "Password reset successful. Please login." });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to reset password" });
  }
};
