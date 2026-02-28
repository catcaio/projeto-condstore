import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BusinessError, ErrorCode } from '../../infra/errors';

// Ensure the client is configurable for S3/R2
const getS3Client = () => {
    return new S3Client({
        region: process.env.S3_REGION || 'auto',
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
    });
};

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'knowledge-inbox';

// Whitelist of valid mimetypes for MVP
const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
]);

export interface UploadInitRequest {
    tenantId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    maxSizeBytes: number; // passed from FinOps limits
}

export const knowledgeStorage = {
    /**
     * Initializes an upload request, returning a signed URL and the canonical objectKey.
     */
    async createUploadUrl(req: UploadInitRequest): Promise<{ uploadUrl: string; objectKey: string }> {
        if (!ALLOWED_MIME_TYPES.has(req.mimeType)) {
            throw new BusinessError(
                ErrorCode.VALIDATION_ERROR,
                `MimeType not supported: ${req.mimeType}`
            );
        }

        if (req.sizeBytes > req.maxSizeBytes) {
            throw new BusinessError(
                ErrorCode.VALIDATION_ERROR,
                `File size exceeds the plan limit (${req.sizeBytes} > ${req.maxSizeBytes})`
            );
        }

        const datePre = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
        const randomId = crypto.randomUUID();
        // Sane sanitization
        const safeFilename = req.filename.replace(/[^a-zA-Z0-9.-]/g, '_');

        // Key is strictly boxed by tenantId
        const objectKey = `tenants/${req.tenantId}/${datePre}/${randomId}-${safeFilename}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: objectKey,
            ContentType: req.mimeType,
            ContentLength: req.sizeBytes,
            // S3/R2 standard headers could go here
        });

        const client = getS3Client();
        const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour

        return { uploadUrl, objectKey };
    },

    /**
     * Creates a short-lived download URL for secure server-side/internal consumption.
     */
    async createDownloadUrl({ tenantId, objectKey }: { tenantId: string; objectKey: string }): Promise<string> {
        // Guard to prevent fetching cross-tenant objects
        if (!objectKey.startsWith(`tenants/${tenantId}/`)) {
            throw new BusinessError("FORBIDDEN" as any, 'objectKey does not belong to this tenant');
        }

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: objectKey,
        });

        const client = getS3Client();
        // Shorter expiration for read URLs
        return await getSignedUrl(client, command, { expiresIn: 900 }); // 15 mins
    }
};
