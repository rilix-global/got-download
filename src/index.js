import got from 'got';
import fs from 'fs';
import promisify from 'es6-promisify';
import path from 'path';
import crypto from 'crypto';

const unlink = promisify(fs.unlink);
const rename = promisify(fs.rename);

export default gotDownload;

gotDownload.stream = stream;

async function gotDownload (url, options) {
  return new Promise((resolve, reject) => {
    const downloadStream = stream(url, options);

    downloadStream.on('end', () => {
      resolve();
    });
  
    downloadStream.on('error', (error) => {
      reject(error);
    });  
  });
}

function stream(url, { filename, tempPath, downloadProgress, checksum, algorithm, ...options }) {
  const stream = got.stream(url, options);

  handleChecksum(stream, checksum, algorithm);
  
  handleFileWrite(stream, filename, tempPath);

  handleProgress(stream, downloadProgress);
  
  return stream;
}

function handleChecksum(stream, checksum, algorithm) {
  if(checksum) {
    const hash = crypto.createHash(algorithm);

    stream.on('data', function (data) {
      hash.update(data, 'utf8');
    });

    stream.on('readable', function () {
      if (stream.read() === null) {
        const calculatedChecksum = hash.digest('base64');
        if (checksum !== calculatedChecksum) {
          stream.removeAllListeners('end');
          stream.destroy( new Error(`Invalid Checksum. Expected ${checksum} received ${calculatedChecksum}`));
        }
      }
    });
  }
}

function handleFileWrite(stream, filename, tempPath) {
  let name = filename;
  
  if (tempPath) {
    name = path.join(tempPath, path.basename(filename) + new Date().getTime());
  }

  stream.pipe(fs.createWriteStream(name));

  stream.on('error', async () => {
    await unlink(filename);
  });

  if (tempPath) {
    stream.on('end', async () => {
      await rename(name, filename);
    });
  }
}

function handleProgress(stream, downloadProgress) {
  let total = null;
  let downloaded = 0;

  stream.on('response', res => {
    const length = res.headers['content-length'];

    total = length ? parseInt(length, 10) : null;
  });

  stream.on('data', (chunk) => {
    downloaded = downloaded + chunk.length;
    if (downloadProgress) {
      downloadProgress({
        total: total,
        downloaded
      });
    }
  });
}

