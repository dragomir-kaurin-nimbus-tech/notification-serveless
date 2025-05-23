import { EventBridgeHandler } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({});

interface VideoUploadedEvent {
  assetId: string;
  presignedUrl: string;
}

export const handler: EventBridgeHandler<
  "video.uploaded",
  VideoUploadedEvent,
  void
> = async (event) => {
  try {
    const { assetId, presignedUrl } = event.detail;

    
    const url = new URL(presignedUrl);
    const bucket = url.hostname.split(".")[0];
    const key = url.pathname.substring(1);

   //getovanje sa 23
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    console.log(response);

    // Here you can add your video processing logic
    // For example:
    // - Convert video format
    // - Generate thumbnails
    // - Extract metadata
    // - etc.

    console.log(`Successfully processed video for asset: ${assetId}`);
  } catch (error) {
    console.error("Error processing video:", error);
    throw error;
  }
};
