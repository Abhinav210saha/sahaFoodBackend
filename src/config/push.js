import webpush from "web-push";

const hasPushConfig = () =>
  Boolean(
    process.env.WEB_PUSH_PUBLIC_KEY &&
      process.env.WEB_PUSH_PRIVATE_KEY &&
      process.env.WEB_PUSH_SUBJECT
  );

if (hasPushConfig()) {
  webpush.setVapidDetails(
    process.env.WEB_PUSH_SUBJECT,
    process.env.WEB_PUSH_PUBLIC_KEY,
    process.env.WEB_PUSH_PRIVATE_KEY
  );
}

export const getWebPushPublicKey = () => process.env.WEB_PUSH_PUBLIC_KEY || "";

export const sendPushNotification = async (subscription, payload) => {
  if (!hasPushConfig()) return { sent: false, reason: "missing-config" };

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: error?.statusCode || "send-failed" };
  }
};
