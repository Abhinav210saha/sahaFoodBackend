import { DeliveryConfig } from "../models/DeliveryConfig.js";

const normalizeCity = (value) => String(value || "").trim();

const parseCities = (value) => {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map(normalizeCity).filter(Boolean)));
  }

  return Array.from(
    new Set(
      String(value || "")
        .split(/[\n,]/)
        .map(normalizeCity)
        .filter(Boolean)
    )
  );
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

  return res.json({
    serviceableCities: config.serviceableCities,
    enforceServiceability: config.enforceServiceability,
    comingSoonMessage: config.comingSoonMessage,
  });
};

export const getDeliveryConfigAdmin = async (_req, res) => {
  const config = await getOrCreateConfig();
  return res.json(config);
};

export const upsertDeliveryConfig = async (req, res) => {
  const config = await getOrCreateConfig();

  if (req.body.serviceableCities !== undefined) {
    config.serviceableCities = parseCities(req.body.serviceableCities);
  }

  if (req.body.enforceServiceability !== undefined) {
    config.enforceServiceability =
      typeof req.body.enforceServiceability === "boolean"
        ? req.body.enforceServiceability
        : String(req.body.enforceServiceability).toLowerCase() === "true";
  }

  if (req.body.comingSoonMessage !== undefined) {
    config.comingSoonMessage = String(req.body.comingSoonMessage || "").trim() || "We are reaching your area very soon.";
  }

  config.updatedBy = req.user?._id || null;
  await config.save();

  return res.json(config);
};
