# S3 File Provider Module (with Filename Sanitization)

This module provides S3 file storage integration for Medusa with **automatic filename sanitization** to prevent signature validation errors when uploading files with Chinese characters or special symbols.

## Problem Solved

When files with Chinese characters (or other non-ASCII characters) are uploaded to S3-compatible storage, the signature validation can fail with `SignatureDoesNotMatch` errors. This happens because:

1. **Encoding inconsistency**: Frontend sends UTF-8 encoded filenames, but S3 SDK generates signatures using RFC 3986 canonical encoding
2. **Browser differences**: Different browsers/OS handle non-ASCII characters in FormData differently
3. **Signature mismatch**: The canonical request hash doesn't match between client and server

## Solution

This module **completely removes the original filename** and generates a safe, unique identifier using:
- Timestamp (for uniqueness and ordering)
- ULID (for additional uniqueness and collision prevention)
- Original file extension (preserved for content type identification)

**Format**: `prod_{timestamp}_{ulid}.{ext}`

Example: `我的图片.png` → `prod_1700000000_01ARZ3NDEKTSV4RRFFQ69G5FAV.png`

## Configuration

The module requires the following environment variables:

```env
S3_FILE_URL=https://your-cdn-domain.com  # Optional, for CDN URLs
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_REGION=us-east-1  # or your region
S3_BUCKET=your-bucket-name
S3_ENDPOINT=https://your-s3-endpoint.com  # For S3-compatible services like R2
```

## Features

- ✅ **Automatic filename sanitization** - Prevents encoding issues completely
- ✅ **S3-compatible** - Works with AWS S3, Cloudflare R2, DigitalOcean Spaces, etc.
- ✅ **Presigned URLs** - Support for secure, time-limited file access
- ✅ **Original filename preservation** - Stored in metadata for reference
- ✅ **Public read access** - Configurable ACL support
- ✅ **Stream support** - Efficient handling of large files

## Usage

The module is automatically configured in `medusa-config.js` when S3 environment variables are present. It replaces the default `@medusajs/file-s3` provider with this custom implementation.

## Implementation Details

### Filename Sanitization

The `sanitizeFileName` function in `src/utils/file-utils.ts`:
- Extracts and preserves the file extension
- Generates a unique identifier using timestamp + ULID
- Returns a safe filename with only ASCII characters, numbers, underscores, and dots

### File Upload Flow

1. Frontend sends file with original filename (may contain Chinese characters)
2. Backend receives file via Medusa's file upload endpoint
3. **Filename is sanitized** before S3 upload
4. File is uploaded to S3 with sanitized key
5. Original filename is stored in S3 metadata
6. Response includes sanitized URL

### Benefits

- **Root cause fix**: Completely avoids encoding issues
- **Collision prevention**: Timestamp + ULID ensures uniqueness
- **Predictable format**: Easier database indexing and CDN caching
- **No breaking changes**: Original filename still accessible via metadata

## Migration from @medusajs/file-s3

If you're migrating from the default `@medusajs/file-s3` provider:

1. Install dependencies: `pnpm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
2. The configuration in `medusa-config.js` has already been updated
3. Restart your Medusa server
4. Clear cached configuration: Delete `.medusa/server` directory if needed

## Testing

To verify the fix works:

1. Upload a file with Chinese characters: `我的图片.png`
2. Upload a file with special symbols: `test file@2024#1.jpg`
3. Upload a file with spaces: `my product image.png`
4. Verify all uploads succeed and return `200 OK`
5. Check that returned URLs use sanitized filenames
6. Verify original filenames are preserved in S3 metadata

## Troubleshooting

**Files still failing to upload:**
- Ensure AWS SDK dependencies are installed: `pnpm install`
- Check that environment variables are correctly set
- Verify S3 credentials have proper permissions
- Clear Medusa cache: Delete `.medusa/server` directory

**Presigned URLs not working:**
- Check that `getPresignedUploadUrl` also uses sanitized filenames
- Verify S3 bucket policy allows presigned URL operations

## Related Files

- `src/utils/file-utils.ts` - Filename sanitization utility
- `src/modules/minio-file/service.ts` - MinIO provider (also uses sanitization)
- `medusa-config.js` - Module configuration
