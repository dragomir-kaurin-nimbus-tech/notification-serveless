import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const ddbClient = new DynamoDBClient({});

export async function handler(event: any) {
  try {
    const userId = event?.arguments?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing userId" }),
      };
    }

    console.log(userId, 2222222);

    const params = {
      TableName: `${process.env.DEPLOYMENT_ENV}-UnreadNotificationsTable`,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": { S: userId },
      },
      ScanIndexForward: false,
    };

    const result = await ddbClient.send(new QueryCommand(params));

    console.log(result, 3333333);
    const count = result.Count ?? 0;

    return { statusCode: 200, hasUnread: count > 0 };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
}
