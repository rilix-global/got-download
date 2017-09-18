import gotDownload from '../src';
import { startServer, stopServer } from './file-server';
import path from 'path';
import fs from 'fs';
import promisify from 'es6-promisify';
import mkdirpModule from 'mkdirp';
import rmrfModule from 'rimraf';
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const mkdirp = promisify(mkdirpModule);
const rmrf = promisify(rmrfModule);
const downloadsPath = path.join(process.cwd(), '/.downloads/');
const tempPath = path.join(process.cwd(), '/.temp/');

describe('got-download', () => {
  beforeEach(startServer);

  afterEach(async () => { await rmrf(downloadsPath); });

  afterEach(async () => { await rmrf(tempPath); });

  beforeEach(async () => { await mkdirp(downloadsPath); });

  beforeEach(async () => { await mkdirp(tempPath); });

  afterEach(stopServer);

  afterAll(async () => {
    await rmrf(downloadsPath);
    await rmrf(tempPath);
  });

  it('downloads file', async () => {
    expect.assertions(1);

    await gotDownload('0.0.0.0:7845/text-file.txt', {
      filename: path.join(downloadsPath, '/text-file.txt')
    });

    const fileContent = await readFile(path.join(downloadsPath, '/text-file.txt'), { encoding: 'utf8' });

    expect(fileContent).toEqual('some very cool test here\n');
  });

  it('doesn\'t save file on error', async () => {
    expect.assertions(1);
    
    try {
      await gotDownload('0.0.0.0:7845/error-download', {
        filename: path.join(downloadsPath, '/file'),
        retries: 0
      });
    } catch(e) {
      const files = await readdir(downloadsPath);
      expect(files.length).toBe(0);
    }
  });

  it('has promise api', async () => {
    expect.assertions(1);
    
    const promise = gotDownload('0.0.0.0:7845/text-file.txt', {
      filename: path.join(downloadsPath, '/text-file.txt')
    });

    expect(typeof promise.then).toEqual('function');
    await promise;
  });

  it('has stream api', (done) => {
    expect.assertions(2);
    
    const stream = gotDownload.stream('0.0.0.0:7845/text-file.txt', {
      filename: path.join(downloadsPath, '/text-file.txt')
    });

    expect(typeof stream.pipe).toEqual('function');
    expect(typeof stream.on).toEqual('function');
    stream.on('end', done);
  });

  it('saves download progress on temp dir', (done) => {
    expect.assertions(1);

    const stream = gotDownload.stream('0.0.0.0:7845/text-file.txt', {
      filename: path.join(downloadsPath, '/text-file.txt'),
      tempPath
    });

    stream.on('data', async () => {
      const files = await readdir(tempPath);
      expect(files.length).toBe(1);
    });

    stream.on('end', () => {
      done();
    });
  });

  it('appends timestamp to temp file', (done) => {
    expect.assertions(1);

    const originalDate = Date;
    global.Date = () => new originalDate(1505509193801);
    global.Date.now = originalDate.now;

    const stream = gotDownload.stream('0.0.0.0:7845/text-file.txt', {
      filename: path.join(downloadsPath, '/text-file.txt'),
      tempPath
    });

    stream.on('data', async () => {
      const [file] = await readdir(tempPath);
      expect(file).toBe('text-file.txt1505509193801');
    });

    stream.on('end', () => {
      global.Date = originalDate;
      done();
    });
  });

  it('moves from temp path to filename when finish', async () => {
    expect.assertions(2);

    await gotDownload('0.0.0.0:7845/text-file.txt', {
      filename: path.join(downloadsPath, '/text-file.txt'),
      tempPath
    });

    const fileContent = await readFile(path.join(downloadsPath, '/text-file.txt'), { encoding: 'utf8' });
    const tempFiles = await readdir(tempPath);
    expect(tempFiles.length).toBe(0);
    expect(fileContent).toEqual('some very cool test here\n');
  });

  it('has progress callback', (done) => {
    expect.hasAssertions();

    const stream = gotDownload.stream('0.0.0.0:7845/one-mb', {
      filename: path.join(downloadsPath, '/one-mb'),
      downloadProgress: (progress) => {
        expect(progress).toEqual({
          downloaded: expect.any(Number),
          total: expect.any(Number)
        });
      }
    });

    stream.on('end', () => {
      done();
    });
  });

  describe('checksum', () => {
    it('fails on wrong checksum', async () => {
      expect.assertions(1);

      try {
        await gotDownload('0.0.0.0:7845/text-file.txt', {
          filename: path.join(downloadsPath, '/text-file.txt'),
          checksum: 'wrongchecksum',
          algorithm: 'sha512'
        });
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('succeeds on right checksum', async () => {
      expect.assertions(1);
      
      await gotDownload('0.0.0.0:7845/one-mb', {
        filename: path.join(downloadsPath, '/one-mb'),
        checksum: 'qGLDYERgb5mi0RoiB72x5Djm7SNbqcHgQdB2BCkipfGWNno44Xt4nOBiOCenY9M7ZBAqpuUgumyF0pA3plkPQw==',
        algorithm: 'sha512'
      });
  
      const file = await readFile(path.join(downloadsPath, '/one-mb'), { encoding: 'utf8' });
      
      expect(file).toBeDefined();
    });
  });
});
