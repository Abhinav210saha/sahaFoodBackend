import { DeliveryConfig } from "../models/DeliveryConfig.js";

const normalizePincode = (value) => String(value || "").replace(/\D/g, "");
const normalizeText = (value) => String(value || "").trim();

const parsePincodes = (value) => {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map(normalizePincode).filter(Boolean)));
  }

  return Array.from(
    new Set(
      String(value || "")
        .split(/[\n,]/)
        .map(normalizePincode)
        .filter(Boolean)
    )
  );
};

const parseZones = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((zone) => ({
      state: normalizeText(zone?.state),
      city: normalizeText(zone?.city),
      area: normalizeText(zone?.area),
      pincodes: parsePincodes(zone?.pincodes || []),
      isActive: zone?.isActive !== false,
    }))
    .filter((zone) => zone.state || zone.city || zone.area || zone.pincodes.length > 0);
};

const getOrCreateConfig = async () => {
  let config = await DeliveryConfig.findOne();
  if (!config) {
    config = await DeliveryConfig.create({});
  }
  return config;
};

export const getDeliveryConfigPublic = async (_req, res) => {
  const config = await getOrCreateConfig();
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  return res.json({
    serviceableCities: [],
    serviceablePincodes: [],
    serviceableZones: config.serviceableZones,
    enforceServiceability: true,
    comingSoonMessage: config.comingSoonMessage,
  });
};

export const getDeliveryConfigAdmin = async (_req, res) => {
  const config = await getOrCreateConfig();
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  return res.json(config);
};

export const upsertDeliveryConfig = async (req, res) => {
  const config = await getOrCreateConfig();

  if (req.body.serviceableZones !== undefined) {
    config.serviceableZones = parseZones(req.body.serviceableZones);
  }

  if (req.body.comingSoonMessage !== undefined) {
    config.comingSoonMessage = String(req.body.comingSoonMessage || "").trim() || "We are reaching your area very soon.";
  }

  config.updatedBy = req.user?._id || null;
  await config.save();

  return res.json(config);
};
