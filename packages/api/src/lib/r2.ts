import { createHash, createHmac } from 'node:crypto';

interface PresignedUrlOptions {
  url: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  expiresIn: number;
  fileType: string;
}

function hmacSha256(key: Buffer, message: string): Buffer {
  return createHmac('sha256', key).update(message).digest();
}

function getSignatureKey(key: string, dateStamp: string, region: string): Buffer {
  const kDate = hmacSha256(Buffer.from(`AWS4${key}`), dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, 's3');
  const kSigning = hmacSha256(kService, 'aws4_request');
  return kSigning;
}

export async function generatePresignedPutUrl(options: PresignedUrlOptions): Promise<string> {
  const { url, accessKeyId, secretAccessKey, region, expiresIn, fileType } = options;
  const parsedUrl = new URL(url);
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = timestamp.slice(0, 8);

  const credential = `${accessKeyId}/${dateStamp}/${region}/s3/aws4_request`;

  const headers = {
    host: parsedUrl.host,
    'content-type': fileType,
  };

  const signedHeaders = Object.keys(headers).join(';');

  // Canonical request
  const canonicalRequest = [
    'PUT',
    parsedUrl.pathname,
    parsedUrl.search,
    ...Object.entries(headers).map(([k, v]) => `${k.toLowerCase()}:${v}`),
    '',
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const canonicalHash = createHash('sha256').update(canonicalRequest).digest('hex');

  // String to sign
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', timestamp, scope, canonicalHash].join('\n');

  // Signing key
  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region);
  const signature = hmacSha256(signingKey, stringToSign).toString('hex');

  // Build query params
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': timestamp,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': signedHeaders,
    'X-Amz-Signature': signature,
  });

  return `${url}?${queryParams.toString()}`;
}
