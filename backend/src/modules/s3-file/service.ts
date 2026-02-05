import { AbstractFileProviderService, MedusaError } from '@medusajs/framework/utils';
import { Logger } from '@medusajs/framework/types';
import {
  ProviderUploadFileDTO,
  ProviderDeleteFileDTO,
  ProviderFileResultDTO,
  ProviderGetFileDTO,
  ProviderGetPresignedUploadUrlDTO
} from '@medusajs/framework/types';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { sanitizeFileName } from '../../utils/file-utils';

type InjectedDependencies = {
  logger: Logger
}

export interface S3FileProviderOptions {
  file_url?: string
  access_key_id: string
  secret_access_key: string
  region: string
  bucket: string
  endpoint?: string
  s3ForcePathStyle?: boolean
  signatureVersion?: string
}

/**
 * Custom S3 File Provider Service with filename sanitization.
 * 
 * This service extends the standard S3 file provider to handle Chinese characters
 * and special symbols in filenames by sanitizing them before upload, preventing
 * SignatureDoesNotMatch errors in S3 signature validation.
 */
class S3FileProviderService extends AbstractFileProviderService {
  static identifier = 's3-file'
  protected readonly config_: S3FileProviderOptions
  protected readonly logger_: Logger
  protected client: S3Client
  protected readonly bucket: string
  protected readonly fileUrl?: string

  constructor({ logger }: InjectedDependencies, options: S3FileProviderOptions) {
    super()
    this.logger_ = logger
    this.config_ = options
    this.bucket = options.bucket
    this.fileUrl = options.file_url

    // Initialize S3 client with configuration
    const clientConfig: any = {
      region: options.region,
      credentials: {
        accessKeyId: options.access_key_id,
        secretAccessKey: options.secret_access_key,
      },
    }

    // Add endpoint for S3-compatible services (like Cloudflare R2)
    if (options.endpoint) {
      clientConfig.endpoint = options.endpoint
    }

    // Force path style for S3-compatible services
    if (options.s3ForcePathStyle !== false) {
      clientConfig.forcePathStyle = true
    }

    this.client = new S3Client(clientConfig)
    this.logger_.info(`S3 file service initialized with bucket: ${this.bucket}, region: ${options.region}`)
  }

  static validateOptions(options: Record<string, any>) {
    const requiredFields = [
      'access_key_id',
      'secret_access_key',
      'region',
      'bucket'
    ]

    requiredFields.forEach((field) => {
      if (!options[field]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `${field} is required in the provider's options`
        )
      }
    })
  }

  async upload(
    file: ProviderUploadFileDTO
  ): Promise<ProviderFileResultDTO> {
    if (!file) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file provided'
      )
    }

    if (!file.filename) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No filename provided'
      )
    }

    try {
      // Sanitize filename to prevent encoding issues with Chinese characters and special symbols
      // This completely removes the original filename and generates a safe, unique identifier
      // This prevents SignatureDoesNotMatch errors in S3 signature validation
      const fileKey = sanitizeFileName(file.filename)

      // Handle different content types properly
      let content: Buffer
      if (Buffer.isBuffer(file.content)) {
        content = file.content
      } else if (typeof file.content === 'string') {
        // If it's a base64 string, decode it
        if (file.content.match(/^[A-Za-z0-9+/]+=*$/)) {
          content = Buffer.from(file.content, 'base64')
        } else {
          content = Buffer.from(file.content, 'binary')
        }
      } else {
        // Handle ArrayBuffer, Uint8Array, or any other buffer-like type
        content = Buffer.from(file.content as any)
      }

      // Upload file to S3
      // Note: ACL is optional as some S3-compatible services (like R2) may not support it
      // Public access should be configured via bucket policy instead
      const putCommandParams: any = {
        Bucket: this.bucket,
        Key: fileKey,
        Body: content,
        ContentType: file.mimeType,
        Metadata: {
          'original-filename': encodeURIComponent(file.filename)
        }
      }

      // Only add ACL if not using path-style (some S3-compatible services don't support ACL)
      if (!this.config_.s3ForcePathStyle) {
        putCommandParams.ACL = 'public-read'
      }

      const putCommand = new PutObjectCommand(putCommandParams)
      await this.client.send(putCommand)

      // Generate URL
      // If file_url is provided (e.g., for CDN), use it; otherwise construct from endpoint
      let url: string
      if (this.fileUrl) {
        // Remove trailing slash if present
        const baseUrl = this.fileUrl.replace(/\/$/, '')
        url = `${baseUrl}/${fileKey}`
      } else if (this.config_.endpoint) {
        // For S3-compatible services with custom endpoint
        let endpoint = this.config_.endpoint.replace(/\/$/, '')
        // Extract protocol if present, or default to https
        let protocol = 'https://'
        if (endpoint.startsWith('http://')) {
          protocol = 'http://'
          endpoint = endpoint.replace('http://', '')
        } else if (endpoint.startsWith('https://')) {
          protocol = 'https://'
          endpoint = endpoint.replace('https://', '')
        }
        
        if (this.config_.s3ForcePathStyle) {
          // Path-style: https://endpoint/bucket/key
          url = `${protocol}${endpoint}/${this.bucket}/${fileKey}`
        } else {
          // Virtual-hosted-style: https://bucket.endpoint/key
          url = `${protocol}${this.bucket}.${endpoint}/${fileKey}`
        }
      } else {
        // Standard AWS S3 virtual-hosted-style URL
        url = `https://${this.bucket}.s3.${this.config_.region}.amazonaws.com/${fileKey}`
      }

      this.logger_.info(`Successfully uploaded file ${fileKey} to S3 bucket ${this.bucket}`)

      return {
        url,
        key: fileKey
      }
    } catch (error: any) {
      this.logger_.error(`Failed to upload file: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to upload file: ${error.message}`
      )
    }
  }

  async delete(
    fileData: ProviderDeleteFileDTO | ProviderDeleteFileDTO[]
  ): Promise<void> {
    const files = Array.isArray(fileData) ? fileData : [fileData];

    for (const file of files) {
      if (!file?.fileKey) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'No file key provided'
        );
      }

      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: file.fileKey
        })
        await this.client.send(deleteCommand);
        this.logger_.info(`Successfully deleted file ${file.fileKey} from S3 bucket ${this.bucket}`);
      } catch (error: any) {
        this.logger_.warn(`Failed to delete file ${file.fileKey}: ${error.message}`);
      }
    }
  }

  async getPresignedDownloadUrl(
    fileData: ProviderGetFileDTO
  ): Promise<string> {
    if (!fileData?.fileKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file key provided'
      )
    }

    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileData.fileKey
      })

      // Generate presigned URL that expires in 24 hours
      const url = await getSignedUrl(this.client, getCommand, {
        expiresIn: 24 * 60 * 60
      })

      this.logger_.info(`Generated presigned URL for file ${fileData.fileKey}`)
      return url
    } catch (error: any) {
      this.logger_.error(`Failed to generate presigned URL: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to generate presigned URL: ${error.message}`
      )
    }
  }

  async getPresignedUploadUrl(
    fileData: ProviderGetPresignedUploadUrlDTO
  ): Promise<ProviderFileResultDTO> {
    if (!fileData?.filename) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No filename provided'
      )
    }

    try {
      // Sanitize filename to prevent encoding issues with Chinese characters and special symbols
      // This ensures presigned URLs work correctly with S3 signature validation
      const fileKey = sanitizeFileName(fileData.filename)

      const putCommand = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey
      })

      // Generate presigned PUT URL that expires in 15 minutes
      const url = await getSignedUrl(this.client, putCommand, {
        expiresIn: 15 * 60
      })

      return {
        url,
        key: fileKey
      }
    } catch (error: any) {
      this.logger_.error(`Failed to generate presigned upload URL: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to generate presigned upload URL: ${error.message}`
      )
    }
  }

  async getAsBuffer(fileData: ProviderGetFileDTO): Promise<Buffer> {
    if (!fileData?.fileKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file key provided'
      )
    }

    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileData.fileKey
      })

      const response = await this.client.send(getCommand)
      
      if (!response.Body) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `File ${fileData.fileKey} not found or empty`
        )
      }

      // Convert stream to buffer
      const stream = response.Body as Readable
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []

        stream.on('data', (chunk: Buffer) => chunks.push(chunk))
        stream.on('end', () => resolve(Buffer.concat(chunks)))
        stream.on('error', reject)
      })

      this.logger_.info(`Retrieved buffer for file ${fileData.fileKey}`)
      return buffer
    } catch (error: any) {
      this.logger_.error(`Failed to get buffer: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to get buffer: ${error.message}`
      )
    }
  }

  async getDownloadStream(fileData: ProviderGetFileDTO): Promise<Readable> {
    if (!fileData?.fileKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file key provided'
      )
    }

    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileData.fileKey
      })

      const response = await this.client.send(getCommand)
      
      if (!response.Body) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `File ${fileData.fileKey} not found or empty`
        )
      }

      const stream = response.Body as Readable
      this.logger_.info(`Retrieved download stream for file ${fileData.fileKey}`)
      return stream
    } catch (error: any) {
      this.logger_.error(`Failed to get download stream: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to get download stream: ${error.message}`
      )
    }
  }
}

export default S3FileProviderService
