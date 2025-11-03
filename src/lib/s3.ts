import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string,
  bucket?: string
): Promise<UploadResult> {
  const bucketName = bucket || process.env.AWS_S3_BUCKET_NAME!;

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
    },
  });

  await upload.done();

  const url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return {
    url,
    key,
    bucket: bucketName,
  };
}

/**
 * Get a signed URL for private S3 objects
 */
export async function getSignedS3Url(
  key: string,
  expiresIn: number = 3600,
  bucket?: string
): Promise<string> {
  const bucketName = bucket || process.env.AWS_S3_BUCKET_NAME!;

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate S3 key for book files
 */
export function generateBookKey(userId: string, bookId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `books/${userId}/${bookId}/${timestamp}-${sanitizedFileName}`;
}

/**
 * Generate S3 key for page images
 */
export function generatePageImageKey(bookId: string, pageNumber: number): string {
  return `books/pages/${bookId}/page-${pageNumber}.png`;
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string, bucket?: string): Promise<void> {
  try {
    const bucketName = bucket || process.env.AWS_S3_BUCKET_NAME!;
    
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    await s3Client.send(command);
    console.log(`✅ Deleted from S3: ${key}`);
  } catch (error) {
    console.error(`❌ Error deleting from S3: ${key}`, error);
    throw error;
  }
}
