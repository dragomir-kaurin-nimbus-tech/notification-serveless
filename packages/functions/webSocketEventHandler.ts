import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { WebsocketPayloadType } from "../types/websocket-payload.type";

const dynamoClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async <T>(event: WebsocketPayloadType<T>) => {
  const userId = event.detail.userId;

  try {
    const result = await ddb.send(
      new QueryCommand({
        TableName: `${process.env.WEBSOCKET_TABLE_NAME}`,
        IndexName: "UserIdIndex",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      console.log(`No active connections found for userId: ${userId}`);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No active connections" }),
      };
    }

    const connectionIds = result.Items.map((item) => item.connectionId);

    await sendMessageToConnections(
      connectionIds,
      JSON.stringify({
        event: event["detail-type"],
        data: { payload: event.detail },
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ connectionIds }),
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};

async function sendMessageToConnections(
  connectionIds: string[],
  message: string
) {
  const apiGatewayClient = new ApiGatewayManagementApiClient({
    endpoint: `https://${process.env.ENDPOINT_URL?.slice(6)}`,
  });

  await Promise.all(
    connectionIds.map(async (connectionId) => {
      try {
        await apiGatewayClient.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from(message),
          })
        );
      } catch (error) {
        console.error(
          `Error sending message to connection ${connectionId}:`,
          error
        );
      }
    })
  );
}
