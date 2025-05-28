import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import * as sendgrid from "@sendgrid/mail";
import { sendExpoNotification } from "utils/expo";
import { EventType } from "./../types/dynamoParam.type";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

if (process.env.SENDGRID_API_KEY) {
  sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
}

type UserNotificationType = {
  userId: string;
  email?: string;
  sendEmail?: boolean;
  sendNotification?: boolean;
  deviceTokens?: string[];
  meta?: Record<string, string>;
  user?: any;
};

type BatchNotificationType = {
  notification: string;
  userNotificationsSetup: UserNotificationType[];
  createdAt: string;
  type: string;
  title: string;
};

const sendMessageNotificationMapper = (
  type: string,
  user: any,
  imageUrl: string
) => {
  return {
    title: "Send message",
    text: `${user} send you message`,
    userImageUrl: imageUrl,
  };
};

const likePostNotificationMapper = (
  type: string,
  user: any,
  imageUrl: string
) => {
  return {
    title: "Like your post",
    text: `${user} like your post`,
    userImageUrl: imageUrl,
  };
};

const likeCommentNotificationMapper = (
  type: string,
  user: any,
  imageUrl: string
) => {
  return {
    title: "Like your comment",
    text: `${user} like your comment`,
    userImageUrl: imageUrl,
  };
};

const sharePostNotificationMapper = (
  type: string,
  user: any,
  imageUrl: string
) => {
  return {
    title: "Share your post",
    text: `${user} share your post`,
    userImageUrl: imageUrl,
  };
};

const commentPostNotificationMapper = (
  type: string,
  user: any,
  imageUrl: string
) => {
  return {
    title: "Comment post",
    text: `${user} comment your post`,
    userImageUrl: imageUrl,
  };
};

const emailMapper = (type: string) => {
  return {
    subject: "New Notification",
    templateId: "d-template-id",
  };
};

export async function handler(event: any) {
  const detail: BatchNotificationType = event.detail;
  const { notification, title, createdAt, type, userNotificationsSetup } =
    detail;

  await Promise.all(
    userNotificationsSetup?.map(async (userSetup: UserNotificationType) => {
      let notificationTitle = title ?? "";
      let notificationText = notification ?? "";

      if ([EventType.LIKE_POST as string].includes(type)) {
        const translations = likePostNotificationMapper(
          type,
          userSetup?.meta?.firstName,
          userSetup?.meta?.userImageUrl || ""
        );
        notificationTitle = translations.title;
        notificationText = translations.text;
      }

      if ([EventType.LIKE_COMMENT as string].includes(type)) {
        const translations = likeCommentNotificationMapper(
          type,
          userSetup?.meta?.firstName,
          userSetup?.meta?.userImageUrl || ""
        );
        notificationTitle = translations.title;
        notificationText = translations.text;
      }

      if ([EventType.SHARE_POST as string].includes(type)) {
        const translations = sharePostNotificationMapper(
          type,
          userSetup?.meta?.firstName,
          userSetup?.meta?.userImageUrl || ""
        );
        notificationTitle = translations.title;
        notificationText = translations.text;
      }

      if ([EventType.COMMENT_POST as string].includes(type)) {
        const translations = commentPostNotificationMapper(
          type,
          userSetup?.meta?.firstName,
          userSetup?.meta?.userImageUrl || ""
        );
        notificationTitle = translations.title;
        notificationText = translations.text;
      }

      if ([EventType.SEND_MESSAGE as string].includes(type)) {
        const translations = sendMessageNotificationMapper(
          type,
          userSetup?.meta?.firstName,
          userSetup?.meta?.userImageUrl || ""
        );
        notificationTitle = translations.title;
        notificationText = translations.text;
      }

      if (![EventType.SEND_MESSAGE as string].includes(type)) {
        await docClient.send(
          new PutCommand({
            TableName: `${process.env.DEPLOYMENT_ENV}-younger-serverless-NotificationsTable`,
            Item: {
              pk: `USER#${userSetup.userId}`,
              sk: `NOTIFICATION#${new Date().toISOString()}`,
              userId: userSetup.userId,
              notification: notificationText,
              title: notificationTitle,
              createdAt: createdAt,
              updatedAt: new Date().toISOString(),
              type: type,
              meta: {
                ...userSetup?.meta,
                userImageUrl: userSetup?.meta?.userImageUrl || "",
              },
            },
          })
        );

        await docClient.send(
          new PutCommand({
            TableName: `${process.env.DEPLOYMENT_ENV}-UnreadNotificationsTable`,
            Item: {
              userId: userSetup.userId,
            },
          })
        );
      }

      //TODO: uncomment this when insert sendgrid
      // if (
      //   userSetup.sendEmail &&
      //   userSetup.email &&
      //   [EventType.LIKE_POST as string].includes(type)
      // ) {
      //   const emailContent = emailMapper(type);

      //   try {
      //     await sendgrid.send({
      //       to: userSetup.email,
      //       from: process.env.SENDER_EMAIL || "",
      //       subject: emailContent.subject,
      //       templateId: emailContent.templateId,
      //       dynamicTemplateData: {
      //         username: userSetup.meta?.["username"],
      //         bid: userSetup.meta?.["bid"],
      //         round: userSetup.meta?.["round"],
      //         reward: userSetup.meta?.["reward"],
      //         referral: userSetup.meta?.["referral"],
      //         currency: userSetup.meta?.["currency"],
      //         code: userSetup.meta?.["code"],
      //         winner: userSetup.meta?.["winner"],
      //         winningBid: userSetup.meta?.["winningBid"],
      //       },
      //     });
      //   } catch (error) {}
      // }

      if (userSetup.sendNotification && userSetup.deviceTokens?.length) {
        try {
          const formattedDeviceTokens = userSetup.deviceTokens.map((token) =>
            typeof token === "string" ? { deviceId: token } : token
          );

          await sendExpoNotification({
            deviceTokens: formattedDeviceTokens,
            title: notificationTitle,
            body: notificationText,
          });
        } catch (error) {}
      }
    })
  );

  return { success: true };
}
