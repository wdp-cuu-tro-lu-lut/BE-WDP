import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { extname } from 'path';
import { randomBytes } from 'crypto';

@Injectable()
export class FilesService implements OnModuleInit {
  private readonly client: MinioClient;
  private readonly bucket: string;
  private readonly defaultFolder: string;
  private readonly endpoint: string;
  private readonly port: number;
  private readonly useSSL: boolean;
  private readonly publicEndpoint?: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT');
    const port = this.configService.get<string>('MINIO_PORT');
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY');

    if (!endpoint || !port || !accessKey || !secretKey) {
      throw new Error(
        'Missing MinIO configuration. Required: MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY',
      );
    }

    this.endpoint = endpoint;
    this.port = Number(port);
    this.useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'b2b');
    this.defaultFolder = this.configService.get<string>('MINIO_FOLDER', 'wdp');
    this.publicEndpoint = this.configService.get<string>('MINIO_PUBLIC_ENDPOINT') || undefined;

    this.client = new MinioClient({
      endPoint: this.endpoint,
      port: this.port,
      useSSL: this.useSSL,
      accessKey,
      secretKey,
    });
  }

  async onModuleInit() {
    const bucketExists = await this.client.bucketExists(this.bucket);
    if (!bucketExists) {
      await this.client.makeBucket(this.bucket, 'us-east-1');
    }

    // Keep objects publicly readable so returned URL can be opened directly.
    const publicReadPolicy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        },
      ],
    });

    await this.client.setBucketPolicy(this.bucket, publicReadPolicy);
  }

  async uploadImage(file: Express.Multer.File, folder = this.defaultFolder) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!this.isAllowedImageMime(file.mimetype)) {
      throw new BadRequestException('Invalid image type');
    }

    const objectKey = `${this.normalizeFolder(folder)}/${this.generateFileName(file.originalname)}`;

    await this.client.putObject(
      this.bucket,
      objectKey,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype },
    );

    return {
      url: this.buildPublicUrl(objectKey),
      objectKey,
      filename: objectKey.split('/').pop() ?? objectKey,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  private normalizeFolder(folder: string) {
    const cleaned = folder.trim().replace(/^\/+|\/+$/g, '');
    return cleaned || this.defaultFolder;
  }

  private isAllowedImageMime(mimeType: string) {
    return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType);
  }

  private generateFileName(originalName: string) {
    const extension = extname(originalName).toLowerCase();
    return `${randomBytes(16).toString('hex')}${extension}`;
  }

  private buildPublicUrl(objectKey: string) {
    const protocol = this.useSSL ? 'https' : 'http';

    if (this.publicEndpoint) {
      const cleaned = this.publicEndpoint.replace(/\/+$/, '');
      if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
        return `${cleaned}/${this.bucket}/${objectKey}`;
      }
      return `${protocol}://${cleaned}/${this.bucket}/${objectKey}`;
    }

    return `${protocol}://${this.endpoint}:${this.port}/${this.bucket}/${objectKey}`;
  }
}
