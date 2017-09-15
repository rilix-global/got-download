import got from 'got';
import fs from 'fs';
import promisify from 'es6-promisify';
import path from 'path';
const unlink = promisify(fs.unlink);

function stream(url, { filename, tempPath, ...options }) {
  const stream = got.stream(url, options);

  let name = filename;

  if (tempPath) {
    name = path.join(tempPath, path.basename(filename) + new Date().getTime());
  }
  
  stream.pipe(fs.createWriteStream(name));
  
  stream.on('error', async () => {
    await unlink(filename);
  });
  return stream;
}

const gotDownload = async (url, options) => {
  return new Promise((resolve, reject) => {
    const downloadStream = stream(url, options);

    downloadStream.on('end', (data) => {
      resolve(data);
    });
  
    downloadStream.on('error', (error) => {
      reject(error);
    });  
  });
};

gotDownload.stream = stream;

export default gotDownload;
