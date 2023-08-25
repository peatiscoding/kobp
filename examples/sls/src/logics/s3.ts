import { S3Client, PutObjectCommand, ListObjectsCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { join } from 'node:path'

export type BucketType = 'EXPENSE_DOCS'

const MEDIA_BUCKETS: Record<BucketType, string> = {
  EXPENSE_DOCS: `${process.env.MEDIA_BUCKET_EXPENSE_DOCS}`,
}

/**
 * Automatically initialize S3Client based on process.env
 */
export const withEnvironment = (): S3Client => {
  const localS3Endpoint = `${process.env.LOCAL_S3_ENDPOINT}`
  if (localS3Endpoint) {
    const localS3AccessKey = `${process.env.LOCAL_S3_ACCESS_KEY}`
    const localS3SecretKey = `${process.env.LOCAL_S3_SECRET_KEY}`
    return new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: localS3AccessKey,
        secretAccessKey: localS3SecretKey,
      },
      endpoint: localS3Endpoint,
      forcePathStyle: true,
    })
  } else {
    return new S3Client({})
  }
}

/**
 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
 */
export class S3MediaClient {
  public readonly bucket: string

  constructor(public readonly s3client: S3Client, public readonly bucketType: BucketType) {
    this.bucket = MEDIA_BUCKETS[bucketType]
    if (!this.bucket) {
      throw new Error(`Invalid state! Unable to initialize S3MediaClient with invalid bucketType: ${bucketType}. Expected a valid string. Have you defined proper process.env?`)
    }
    console.log('BUCKET =>', this.bucket)
  }

  public async putObject(bucketFilePath: string, filename: string, content: Buffer | ReadableStream): Promise<string> {
    const contentKey = join(bucketFilePath, filename)
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: contentKey,
      Body: content,
    })

    await this.s3client.send(cmd)
    return `MZIC_FILE_PATH/${this.bucket}/${contentKey}`
  }

  public async listObject(bucketFilePath: string): Promise<{
    id: string
    fileName: string
    url: string
    createdAt?: Date
  }[]> {
    const cmd = new ListObjectsCommand({
      Bucket: this.bucket,
      Prefix: bucketFilePath,
    })
    const result  = await this.s3client.send(cmd)    
    return (result.Contents??[]).map((content)=>{
      const fileName = (content.Key?.split("/"))?.pop()
      return {
        id:content.Key ?? "",
        url:content.Key ?? "",
        fileName:fileName ?? "",
        createdAt:content.LastModified
      }
    }).sort((a,b)=>{
      return (a.createdAt?.getTime()??0) - (b.createdAt?.getTime()??0);
    }).reverse()
  }

  public async deleteObject(fileId: string): Promise<boolean> {
    const cmd = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fileId,
    })
    await this.s3client.send(cmd)    
    return true
  }
}

