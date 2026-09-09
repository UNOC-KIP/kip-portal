import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env.js";
import { AppError } from "../errors.js";

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

/**
 * Static keys are configured. When false the SDK falls back to its default
 * credential chain (env vars, then the EC2 instance role) — which is a valid
 * production setup, so this is not on its own an error.
 */
export function hasStaticS3Credentials(): boolean {
  return !!(env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);
}

/**
 * Presigning is an offline signing operation: it makes no network call and so
 * never proves the bucket exists, the key is authorised, or CORS permits the
 * browser's PUT. The only failure it *can* raise locally is the absence of any
 * credentials at all, and the raw `CredentialsProviderError` reaches the
 * investor as an unexplained 500 while they are trying to attach a document.
 *
 * Translate it into something an operator can act on. The remaining failure
 * modes surface at the browser's PUT/GET against S3, not here.
 */
function asConfigError(e: unknown): never {
  const name = e instanceof Error ? e.name : "";
  if (name === "CredentialsProviderError" || name === "CredentialsError") {
    throw new AppError({
      statusCode: 503,
      code: "STORAGE_NOT_CONFIGURED",
      message:
        "Document storage is not configured on this server, so files cannot be uploaded or downloaded. An administrator needs to set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY (or attach an instance role with access to the documents bucket).",
    });
  }
  throw e;
}

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
  try {
    const url = await getSignedUrl(s3, cmd, {
      expiresIn: opts.expiresInSeconds ?? 300,
    });
    return { url, key: opts.key };
  } catch (e) {
    asConfigError(e);
  }
}

export async function presignDownload(opts: {
  key: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: opts.key,
  });
  try {
    return await getSignedUrl(s3, cmd, {
      expiresIn: opts.expiresInSeconds ?? 300,
    });
  } catch (e) {
    asConfigError(e);
  }
}

/**
 * Fetch an object's bytes (e.g. a finance-uploaded invoice) so it can be
 * attached to an email. Returns null on any failure — callers fall back to a
 * secure download link rather than failing the send.
 */
export async function getObjectBuffer(
  key: string,
): Promise<{ buffer: Buffer; contentType: string | undefined } | null> {
  try {
    const out = await s3.send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    );
    const body = out.Body as unknown as
      | { transformToByteArray?: () => Promise<Uint8Array> }
      | undefined;
    if (!body?.transformToByteArray) return null;
    const bytes = await body.transformToByteArray();
    return { buffer: Buffer.from(bytes), contentType: out.ContentType };
  } catch {
    return null;
  }
}
