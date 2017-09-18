# got-download

## How to use

```js
import gotDownload from 'got-download';

try {
  await gotDownload('example.com/file.txt', {
    filename: path.join(__dirname, '/file.txt'),
    // any got option
  });
} catch(e) {
  // Here any file was saved. All operation are atomic.
}
```

## Checksum

```js
import gotDownload from 'got-download';

try {
  await gotDownload('example.com/file.txt', {
    filename: path.join(__dirname, '/file.txt'),
    checksum: 'wrongchecksum',
    algorithm: 'sha512'
    // any got option
  });
} catch(e) {
  // Either checksum or download fails. The operation still atomic
}
```

## Download progress

```js
import gotDownload from 'got-download';

await gotDownload('example.com/file.txt', {
  filename: path.join(__dirname, '/file.txt'),
  downloadProgress: progress => console.log(progress) // { downloaded: 512, total: 1024 }
  // any got option
});
```

### Using CommonJS

```js
const gotDownload = require('got-download').default;
```

## Publish

Just merge to the master and create a git tag `vPACKAGE_VERSION`
