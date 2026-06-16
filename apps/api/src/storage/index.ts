import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env.js";

const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT || undefined,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials:
    env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export async function presignUpload(opts: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{ url: string; key: string }> {
  const cmd = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: opts.key,
    ContentType: opts.contentType,
  });
  const url = await getSignedUrl(s3, cmd, {
    expiresIn: opts.expiresInSeconds ?? 300,
  });
  return { url, key: opts.key };
}

export async function presignDownload(opts: {
  key: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: opts.key,
  });
  return getSignedUrl(s3, cmd, {
    expiresIn: opts.expiresInSeconds ?? 300,
  });
}
