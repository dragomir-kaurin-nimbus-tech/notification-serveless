import { SSTConfig } from "sst";
import { API } from "./stacks/MyStack";
import { WebsocketStack } from "./stacks/WebSocketStack";

export default {
  config(_input) {
    return {
      name: "younger-serverless",
      region: "eu-central-1",
    };
  },
  stacks(app) {
    app.stack(API);
    app.stack(WebsocketStack);
  },
} satisfies SSTConfig;
