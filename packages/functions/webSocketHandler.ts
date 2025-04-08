import { APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

const dynamoClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent) => {
  if (event.body === "ping") {
    const connectionId = event.requestContext.connectionId!;
    const endpoint = `https://${process.env.ENDPOINT_URL?.slice(6)}`;

    const apiGateway = new ApiGatewayManagementApiClient({
      endpoint,
    });

    try {
      await Promise.all([
        apiGateway.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from("pong"),
          })
        ),
        ddb.send(
          new UpdateCommand({
            TableName: `${process.env.WEBSOCKET_TABLE_NAME}`,
            Key: { connectionId },
            UpdateExpression: "SET lastActivity = :timestamp",
            ExpressionAttributeValues: {
              ":timestamp": new Date().toISOString(),
            },
          })
        ),
      ]);
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
      };
    }
  }

  return { statusCode: 200 };
};
