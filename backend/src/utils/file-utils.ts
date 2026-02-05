import path from 'path';
import { ulid } from 'ulid';

/**
 * Sanitizes a filename by removing all non-ASCII characters and special symbols,
 * replacing it with a safe, unique identifier to prevent S3 signature validation errors.
 * 
 * This function completely removes the original filename and generates a new one
 * using timestamp and ULID to ensure uniqueness and avoid encoding issues.
 * 
 * @param originalName - The original filename (may contain Chinese characters, spaces, special symbols)
 * @returns A safe filename in format: prod_{timestamp}_{ulid}.{ext}
 * 
 * @example
 * sanitizeFileName('我的图片.png') => 'prod_1700000000_01ARZ3NDEKTSV4RRFFQ69G5FAV.png'
 * sanitizeFileName('test file@2024.jpg') => 'prod_1700000000_01ARZ3NDEKTSV4RRFFQ69G5FAV.jpg'
 */
export const sanitizeFileName = (originalName: string): string => {
  if (!originalName) {
    // Fallback: generate a unique name with default extension
    return `prod_${Date.now()}_${ulid()}.bin`;
  }

  // Extract file extension (preserve it for content type identification)
  const ext = path.extname(originalName) || '';
  
  // Generate timestamp and unique ID
  const timestamp = Date.now();
  const uniqueId = ulid();
  
  // Generate safe filename: prod_{timestamp}_{ulid}.{ext}
  // This format ensures:
  // - No special characters that could cause encoding issues
  // - No spaces or non-ASCII characters
  // - Predictable format for database indexing and CDN caching
  // - Uniqueness through timestamp + ULID combination
  return `prod_${timestamp}_${uniqueId}${ext}`;
};
