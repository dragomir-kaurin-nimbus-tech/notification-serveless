import { APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent) => {
  console.log("FROM CONNECT", event.queryStringParameters?.userId);
  console.log("FROM CONNECT", event.requestContext.connectionId);

  try {
    await ddb.send(
      new PutCommand({
        //need this
        TableName: `${process.env.WEBSOCKET_TABLE_NAME}`,
        Item: {
          userId: event.queryStringParameters?.userId,
          connectionId: event.requestContext.connectionId,
          lastActivity: new Date().toISOString(),
        },
      })
    );

    return {
      statusCode: 200,
    };
  } catch (err) {
    console.error("Error saving connection:", err);
    return {
      statusCode: 500,
    };
  }
};
