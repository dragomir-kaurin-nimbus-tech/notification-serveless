import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function handler(event: any) {
  if (!event?.arguments?.userId) {
    console.error("UserId is required");
    return false;
  }

  const tableName = `${process.env.DEPLOYMENT_ENV}-UnreadNotificationsTable`;

  try {
    const params = {
      TableName: tableName,
      Key: {
        userId: event?.arguments?.userId,
      },
    };

    await docClient.send(new DeleteCommand(params));
    return true;
  } catch (err) {
    console.error(
      "Error deleting unread notifications:",
      (err as Error).message
    );
    return false;
  }
}
