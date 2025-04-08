import {
  type StackContext,
  Table,
  Function,
  Api,
  EventBus,
  WebSocketApi,
} from "sst/constructs";

import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import { EventType } from "../packages/types/dynamoParam.type";

export function WebsocketStack({ stack }: StackContext) {
  const WebSocketTable = new Table(stack, `WebSocketConnection`, {
    fields: {
      connectionId: "string",
      userId: "string",
      lastActivity: "string",
    },
    primaryIndex: { partitionKey: "connectionId" },
    globalIndexes: {
      UserIdIndex: { partitionKey: "userId" },
      LastActivityIndex: { partitionKey: "lastActivity" },
    },
  });

  const connectionLambda = new Function(stack, `connection-lambda`, {
    handler: "packages/functions/webSocketConnect.handler",
    runtime: "nodejs18.x",
    memorySize: 1024,
    timeout: 50,
    permissions: [WebSocketTable],
    initialPolicy: [
      new iam.PolicyStatement({
        actions: ["dynamodb:PutItem"],
        effect: iam.Effect.ALLOW,
        resources: [WebSocketTable.tableArn],
      }),
    ],
    bind: [WebSocketTable],
    environment: {
      WEBSOCKET_TABLE_NAME: `${process.env.DEPLOYMENT_ENV}-WebSocketConnection`,
      DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV || "",
    },
  });

  connectionLambda.attachPermissions([WebSocketTable]);

  const disconnectLambda = new Function(stack, `disconnect-lambda`, {
    handler: "packages/functions/webSocketDisconnect.handler",
    runtime: "nodejs18.x",
    memorySize: 1024,
    timeout: 50,
    permissions: [WebSocketTable],
    initialPolicy: [
      new iam.PolicyStatement({
        actions: ["dynamodb:PutItem"],
        effect: iam.Effect.ALLOW,
        resources: [WebSocketTable.tableArn],
      }),
    ],
    bind: [WebSocketTable],
    environment: {
      WEBSOCKET_TABLE_NAME: `${process.env.DEPLOYMENT_ENV}-WebSocketConnection`,
      DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV || "",
    },
  });

  disconnectLambda.attachPermissions([WebSocketTable]);

  const websocketLambda = new Function(stack, `websocket-lambda`, {
    handler: "packages/functions/webSocketHandler.handler",
    runtime: "nodejs18.x",
    memorySize: 1024,
    timeout: 50,
    permissions: [WebSocketTable],
    bind: [WebSocketTable],

    environment: {
      WEBSOCKET_TABLE_NAME: `${process.env.DEPLOYMENT_ENV}-WebSocketConnection`,
      DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV || "",
      ENDPOINT_URL: process.env.ENDPOINT_URL || "",
    },
    initialPolicy: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:ManageConnections"],
        resources: ["*"],
      }),
    ],
  });

  websocketLambda.attachPermissions([WebSocketTable]);

  const webSocketApi = new WebSocketApi(stack, `websocket-api`, {
    routes: {
      $connect: connectionLambda,
      $disconnect: disconnectLambda,
      $default: websocketLambda,
    },
  });

  console.log(`This is WebSocketApi stage url ${webSocketApi}`);

  const eventHandlerLambda = new Function(stack, `event-handler`, {
    handler: "packages/functions/webSocketEventHandler.handler",
    runtime: "nodejs18.x",
    memorySize: 1024,
    timeout: 50,
    environment: {
      WEBSOCKET_TABLE_NAME: `${process.env.DEPLOYMENT_ENV}-WebSocketConnection`,
      ENDPOINT_URL: process.env.ENDPOINT_URL || "",
      DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV || "",
    },
    permissions: [WebSocketTable],
    bind: [WebSocketTable],
    initialPolicy: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:ManageConnections"],
        resources: ["*"],
      }),
    ],
  });

  eventHandlerLambda.attachPermissions([WebSocketTable]);

  const eventBus = new EventBus(stack, "Websocket");

  const eventRule = new events.Rule(stack, `like`, {
    eventBus: eventBus.cdk.eventBus,
    ruleName: `like-event`,
    eventPattern: {
      source: ["WEBSOCKET"],
      detailType: [EventType.LIKE_POST],
    },
    targets: [new targets.LambdaFunction(eventHandlerLambda)],
  });

  const eventRuleLikeComment = new events.Rule(stack, `like-comment`, {
    eventBus: eventBus.cdk.eventBus,
    ruleName: `like-comment-event`,
    eventPattern: {
      source: ["WEBSOCKET"],
      detailType: [EventType.LIKE_COMMENT],
    },
    targets: [new targets.LambdaFunction(eventHandlerLambda)],
  });

  const eventRuleCommentPost = new events.Rule(stack, `comment-post`, {
    eventBus: eventBus.cdk.eventBus,
    ruleName: `comment-post-event`,
    eventPattern: {
      source: ["WEBSOCKET"],
      detailType: [EventType.COMMENT_POST],
    },
    targets: [new targets.LambdaFunction(eventHandlerLambda)],
  });

  const eventRuleSharePost = new events.Rule(stack, `share-post`, {
    eventBus: eventBus.cdk.eventBus,
    ruleName: `share-post-event`,
    eventPattern: {
      source: ["WEBSOCKET"],
      detailType: [EventType.SHARE_POST],
    },
    targets: [new targets.LambdaFunction(eventHandlerLambda)],
  });

  stack.addOutputs({
    WebSocketApiUrl: webSocketApi.url,
    EventBusName: eventBus.eventBusName,
    EventRuleName: eventRule.ruleName,
    EventRuleCommentName: eventRuleLikeComment.ruleName,
    eventRuleCommentPost: eventRuleCommentPost.ruleName,
    eventRuleSharePost: eventRuleSharePost.ruleName,
  });
}
