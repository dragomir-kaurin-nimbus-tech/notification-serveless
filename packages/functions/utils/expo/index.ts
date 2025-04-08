import { Expo, ExpoPushMessage } from "expo-server-sdk";

let expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
});

interface SendNotificationPayload {
  deviceTokens: { deviceId: string }[];
  title: string;
  body: string;
}

export const sendExpoNotification = async (
  notification: SendNotificationPayload
) => {
  const messages = notification.deviceTokens
    .map((deviceToken): ExpoPushMessage | null => {
      if (!Expo.isExpoPushToken(deviceToken.deviceId)) {
        console.error(`Invalid Expo push token: ${deviceToken.deviceId}`);
        return null;
      }
      return {
        to: deviceToken.deviceId,
        sound: { critical: true, volume: 0.8 },
        title: notification.title,
        body: notification.body,
      };
    })
    .filter((message): message is ExpoPushMessage => message !== null);

  try {
    const chunks = expo.chunkPushNotifications(messages);
    await Promise.all(
      chunks.map((chunk) => expo.sendPushNotificationsAsync(chunk))
    );
  } catch (error) {
    console.error("Error sending push notifications:", error);
  }
};
