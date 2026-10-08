import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutBucketPolicyCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { IFileStorageService, StoredFile, StoredObject, UploadFile, validateUpload } from './file-storage.service';

@Injectable()
export class MinioFileStorageService implements IFileStorageService, OnModuleInit {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET', 'culinary-blog');
    this.publicUrl = config.getOrThrow<string>('S3_PUBLIC_URL').replace(/\/$/, '');
    this.client = new S3Client({
      endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
      region: config.get<string>('S3_REGION', 'us-east-1'),
      forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE', 'true') === 'true',
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_KEY'),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch {
      // BucketAlreadyOwnedByYou is expected when the service restarts.
    }

    await this.client.send(new PutBucketPolicyCommand({
      Bucket: this.bucket,
      Policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: `arn:aws:s3:::${this.bucket}/*`,
        }],
      }),
    }));
  }

  async uploadAsync(
    file: UploadFile,
    folder: string,
  ): Promise<StoredFile> {
    validateUpload(file);
    const extension = file.mimetype === 'image/jpeg' ? 'jpg' : file.mimetype.split('/')[1];
    const key = `${folder}/${randomUUID()}.${extension}`;

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentLength: file.size,
    }));

    return { url: `${this.publicUrl}/${this.bucket}/${key}`, key, contentType: file.mimetype, size: file.size };
  }

  async deleteAsync(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async readAsync(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!response.Body) throw new Error(`Object ${key} has no body.`);
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async putAsync(key: string, object: StoredObject): Promise<StoredFile> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: object.buffer,
      ContentType: object.contentType,
      ContentLength: object.buffer.length,
    }));

    return {
      url: `${this.publicUrl}/${this.bucket}/${key}`,
      key,
      contentType: object.contentType,
      size: object.buffer.length,
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }
}
