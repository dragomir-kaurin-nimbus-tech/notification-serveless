import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

interface HandlerArgs {
  arguments: {
    userId: string;
    offset: number;
    limit: number;
  };
}

export async function handler(args: HandlerArgs) {
  const { userId, offset, limit } = args.arguments;
  if (!userId) {
    console.error("UserId is not defined");
    return { statusCode: 400, message: "UserId is required" };
  }

  const tableName = `${process.env.DEPLOYMENT_ENV}-NotificationsTable`;

  const baseParams = {
    TableName: tableName,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
    },
    ScanIndexForward: false,
  };

  try {
    let result = await docClient.send(new QueryCommand(baseParams));
    const count = result.Count ?? 0;

    if (offset > count) {
      return {
        statusCode: 400,
        message: "Offset is greater than the number of items",
      };
    }

    if (!result.Items || result.Items.length === 0) {
      console.error("No items found for the given userId");
      return { statusCode: 404, message: "No items found" };
    }

    const exclusiveStartKey =
      offset > 0 && result.Items[offset - 1]
        ? {
            userId: result.Items[offset - 1].userId,
            createdAt: result.Items[offset - 1].createdAt,
          }
        : undefined;

    const paginatedParams = {
      ...baseParams,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    };

    result = await docClient.send(new QueryCommand(paginatedParams));

    const itemsWithId = result.Items?.map((item) => ({
      id: item.sk,
      title: item.title,
      notification: item.notification,
      type: item.type,
      createdAt: item.createdAt,
      userId: item.userId,
      read: item.read,
      meta: item.meta,
    }));

    return {
      statusCode: 200,
      items: itemsWithId,
      count,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(count / limit),
    };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return {
      statusCode: 500,
      message: `Error fetching notifications: ${(error as Error).message}`,
    };
  }
}
