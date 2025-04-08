import {
  type StackContext,
  Table,
  AppSyncApi,
  EventBus,
  Function,
} from "sst/constructs";

export function API({ stack }: StackContext) {
  const NotificationsTable = new Table(stack, "NotificationsTable", {
    fields: {
      pk: "string",
      sk: "string",
      userId: "string",
      title: "string",
      notification: "string",
      type: "string",
      createdAt: "string",
      read: "string",
    },
    primaryIndex: { partitionKey: "pk", sortKey: "sk" },
    globalIndexes: {
      byUserId: { partitionKey: "userId", sortKey: "createdAt" },
    },
  });

  const unreadNotificationsTable = new Table(
    stack,
    "UnreadNotificationsTable",
    {
      fields: {
        userId: "string",
      },
      primaryIndex: { partitionKey: "userId" },
    }
  );

  const eventBus = new EventBus(stack, "NotificationBus");

  const getUnreadNotificationsFunction = new Function(
    stack,
    "GetUnreadNotificationsHandler",
    {
      handler: "packages/functions/getUnreadNotifications.handler",
      bind: [unreadNotificationsTable],
      environment: {
        UNREAD_NOTIFICATION_TABLE_NAME: `${process.env.DEPLOYMENT_ENV}-UnreadNotificationsTable`,
        DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV || "",
      },
    }
  );

  const getNotificationsByUserId = new Function(
    stack,
    "GetNotificationsByUserIdHandler",
    {
      handler: "packages/functions/getNotificationByUserId.handler",
      bind: [NotificationsTable],
      environment: {
        NOTIFICATION_TABLE_NAME: `${process.env.DEPLOYMENT_ENV}-NotificationsTable`,
        DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV || "",
      },
      permissions: [unreadNotificationsTable],
    }
  );

  const readNotifications = new Function(stack, "ReadNotificationsHandler", {
    handler: "packages/functions/readNotification.handler",
    bind: [unreadNotificationsTable],
    environment: {
      UNREAD_NOTIFICATION_TABLE_NAME: `${process.env.DEPLOYMENT_ENV}-UnreadNotificationsTable`,
      DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV || "",
    },
  });

  eventBus.addRules(stack, {
    SendBatchNotificationRule: {
      pattern: {
        source: ["NOTIFICATIONS"],
        detailType: ["SEND_BATCH_NOTIFICATIONS"],
      },
      targets: {
        sendBatchNotificationLambda: new Function(
          stack,
          "SendBatchNotificationHandler",
          {
            handler: "packages/functions/sendBatchNotification.handler",
            bind: [NotificationsTable, unreadNotificationsTable],
            timeout: 60,
            environment: {
              TABLE_NAME: NotificationsTable.tableName,
              UNREAD_TABLE_NAME: unreadNotificationsTable.tableName,
              SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || "",
              SENDER_EMAIL: process.env.SENDER_EMAIL || "",
              EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN || "",
              DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV || "",
            },
          }
        ),
      },
    },
  });

  const api = new AppSyncApi(stack, "NotificationsApi", {
    schema: "graphql/schema.graphql",
    dataSources: {
      resolver: "packages/functions/graphql.handler",
    },
  });

  api.addResolvers(stack, {
    "Query getUnreadNotifications": getUnreadNotificationsFunction,
    "Query getNotificationsByUserId": getNotificationsByUserId,
    "Mutation readNotifications": readNotifications,
  });

  stack.addOutputs({
    ApiId: api.apiId,
    ApiUrl: api.url,
    NotificationsTableName: NotificationsTable.tableName,
    UnreadNotificationsTableName: unreadNotificationsTable.tableName,
    EventBusName: eventBus.eventBusName,
  });

  return {
    api,
    NotificationsTable,
    unreadNotificationsTable,
    eventBus,
  };
}
