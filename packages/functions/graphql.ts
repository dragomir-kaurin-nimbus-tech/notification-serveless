import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
// import { Table } from "sst/node/table";
import type { AppSyncResolverHandler } from "aws-lambda";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

type AppSyncEvent = {
  info: {
    fieldName: string;
  };
  arguments: {
    userId?: string;
    offset?: number;
    limit?: number;
  };
};

export const handler: AppSyncResolverHandler<any, any> = async (
  event: AppSyncEvent
) => {
  const { fieldName } = event.info;
  const args = event.arguments;

  try {
    switch (fieldName) {
      case "getNotificationsByUserId":
        return await getNotificationsByUserId(
          args.userId!,
          args.offset || 0,
          args.limit || 10
        );

      case "getUnreadNotifications":
        return await getUnreadNotifications(args.userId!);

      case "readNotifications":
        return await readNotifications(args.userId!);

      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

async function getNotificationsByUserId(
  userId: string,
  offset: number,
  limit: number
) {
  const params = {
    TableName: `${process.env.DEPLOYMENT_ENV}-NotificationsTable`,
    IndexName: "byUserId",
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
    ScanIndexForward: false,
    Limit: offset + limit,
  };

  const result = await docClient.send(new QueryCommand(params));

  const items = result.Items || [];
  const paginatedItems = items.slice(offset, offset + limit);

  const count = paginatedItems.length;
  const page = Math.floor(offset / limit) + 1;
  // const totalItems = await getTotalNotificationsCount(userId);
  const totalPages = 1;

  const transformedItems = paginatedItems.map((item) => ({
    id: item.pk.split("#")[1],
    title: item.title,
    notification: item.notification,
    type: item.type,
    createdAt: item.createdAt,
    userId: item.userId,
    read: item.read || false,
    meta: item.meta,
  }));

  return {
    items: transformedItems,
    count,
    page,
    totalPages,
  };
}

async function getUnreadNotifications(userId: string) {
  const params = {
    TableName: `${process.env.DEPLOYMENT_ENV}-UnreadNotificationsTable`,
    IndexName: "byUserId",
    KeyConditionExpression: "userId = :userId",
    FilterExpression: "#read = :unread",
    ExpressionAttributeNames: {
      "#read": "read",
    },
    ExpressionAttributeValues: {
      ":unread": "false",
    },
    Limit: 1,
  };

  const result = await docClient.send(new QueryCommand(params));
  const hasUnread = (result.Items || []).length > 0;

  return {
    hasUnread,
  };
}

async function readNotifications(userId: string) {
  const params = {
    TableName: `${process.env.DEPLOYMENT_ENV}-UnreadNotificationsTable`,
    IndexName: "byUserId",
    KeyConditionExpression: "userId = :userId",
    FilterExpression: "#read = :read",
    ExpressionAttributeNames: {
      "#read": "read",
    },
    ExpressionAttributeValues: {
      ":userId": userId,
      ":read": false,
    },
  };
  const result = await docClient.send(new QueryCommand(params));
  const unreadItems = result.Items || [];

  const updatePromises = unreadItems.map((item) => {
    return docClient.send(
      new UpdateCommand({
        TableName: `${process.env.DEPLOYMENT_ENV}-UnreadNotificationsTable`,
        Key: {
          pk: item.pk,
          sk: item.sk,
        },
        UpdateExpression: "SET #read = :read",
        ExpressionAttributeNames: {
          "#read": "read",
        },
        ExpressionAttributeValues: {
          ":read": true,
        },
      })
    );
  });

  await Promise.all(updatePromises);

  return true;
}
