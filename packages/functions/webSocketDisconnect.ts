import { APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent) => {
  console.log("DISCONNECT USER ID", event.queryStringParameters?.userId);
  console.log("DISCONNECT CONNECTION ID", event.requestContext?.connectionId);

  if (!event.requestContext?.connectionId) {
    console.error("Missing connectionId in event");
    return { statusCode: 400, body: "Missing connectionId" };
  }

  try {
    await ddb.send(
      new DeleteCommand({
        //need this
        TableName: `${process.env.WEBSOCKET_TABLE_NAME}`,
        Key: {
          connectionId: event.requestContext.connectionId,
        },
      })
    );

    return {
      statusCode: 200,
    };
  } catch (err) {
    console.error("Error deleting connection:", err);
    return {
      statusCode: 500,
      body: "Error deleting connection",
    };
  }
};
