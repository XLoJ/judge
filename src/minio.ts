import { Client } from 'minio';
import { getLogger } from './logger';

const logger = getLogger();

const BucketName = 'problems';

let client: Client | undefined = undefined;

export function initMinio(instance: Client) {
  client = instance;
}

export function downloadFile(minioPath: string) {
  if (client === undefined) {
    const msg = 'Miss Min IO connect config';
    logger.error(msg);
    throw new Error(msg);
  }
  return new Promise<string>((res, rej) => {
    client!.getObject(BucketName, minioPath, (err, stream) => {
      if (err) {
        rej(err);
        return;
      }
      const content: string[] = [];
      stream.on('data', function (chunk) {
        content.push(chunk);
      });
      stream.on('end', function () {
        res(content.join(''));
      });
      stream.on('error', function (err) {
        logger.error(err);
      });
    });
  });
}

export function uploadFile() {}
