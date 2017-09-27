import got from 'got';
import fs from 'fs';
import promisify from 'es6-promisify';
import path from 'path';
import crypto from 'crypto';

const unlink = promisify(fs.unlink);
const rename = promisify(fs.rename);

export default gotDownload;

gotDownload.stream = stream;

async function gotDownload(url, options) {
  return new Promise((resolve, reject) => {
    let response = null;

    const downloadStream = stream(url, options);

    downloadStream.on('response', (res) => response = res);

    downloadStream.on('end', () => resolve(response));

    downloadStream.on('error', reject);

    downloadStream.on('request', (req) => {
      req.on('aborted', reject);
      req.on('abort', reject);
      req.on('error', reject);
    });

    downloadStream.on('abort', reject);
    downloadStream.on('aborted', reject);
  });
}

function stream(url, { filename, tempPath, downloadProgress, checksum, algorithm, ...options }) {
  const stream = got.stream(url, options);

  handleChecksum(stream, checksum, algorithm);

  handleProgress(stream, downloadProgress);

  handleFileWrite(stream, filename, tempPath);

  return stream;
}

function handleChecksum(stream, checksum, algorithm) {
  if (checksum) {
    const hash = crypto.createHash(algorithm);

    stream.on('data', data => hash.update(data, 'utf8'));

    stream.on('readable', () => {
      if (stream.read() === null) {
        const calculatedChecksum = hash.digest('base64');

        if (checksum !== calculatedChecksum) {
          stream.removeAllListeners('end');
          stream.emit('error', new Error(`Invalid Checksum. Expected ${checksum} received ${calculatedChecksum}`));
        }
      }
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

  stream.on('data', chunk => {
    downloaded = downloaded + chunk.length;
    if (downloadProgress) {
      downloadProgress({ total: total, downloaded });
    }
  });
}

function handleFileWrite(stream, filename, tempPath) {
  const tempFilename = tempPath ? path.join(tempPath, path.basename(filename) + new Date().getTime()) : null;

  if (tempFilename) {
    stream.on('end', async () => await rename(tempFilename, filename));
  }

  const fileStream = fs.createWriteStream(tempFilename || filename);

  fileStream.on('error', function noop() {
  });

  stream.pipe(fileStream);

  stream.on('error', async () => {
    try {
      await unlink(filename);
    } catch (e) {
      //called
    }
  });
}
