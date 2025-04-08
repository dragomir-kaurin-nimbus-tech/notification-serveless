import { type App } from "sst/constructs";
import { API } from "./MyStack";
import { WebsocketStack } from "./WebSocketStack";

export default function main(app: App) {
  app.setDefaultFunctionProps({
    runtime: "nodejs20.x",
    architecture: "arm_64",
    nodejs: {
      format: "esm",
    },
  });

  app.stack(API);
  app.stack(WebsocketStack);
}
