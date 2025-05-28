import { StackContext, EventBus, Function } from "sst/constructs";

export function ProcessVideoStack({ stack }: StackContext) {
  const eventBus = new EventBus(stack, "VideoProcessingBus");

  const processVideo = new Function(stack, "ProcessVideo", {
    handler: "packages/functions/src/processVideo.handler",
    runtime: "nodejs18.x",
    timeout: 900,
    memorySize: 1024,
    environment: {
      EVENT_BUS_NAME: eventBus.eventBusName,
    },
    permissions: ["s3:GetObject"],
  });

  eventBus.subscribe(processVideo, {
    pattern: {
      eventType: ["video.uploaded"],
    },
  });

  stack.addOutputs({
    EventBusName: eventBus.eventBusName,
  });
}
