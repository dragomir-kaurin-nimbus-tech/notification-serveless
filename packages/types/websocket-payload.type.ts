export type WebsocketPayloadType<T> = {
  version: string;
  id: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "detail-type": string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: string[];
  detail: T & {
    userId: string;
  };
};
