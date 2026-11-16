const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { getBinaryMeta, findCloudflared } = require('../src/binary');
const { findNgrok } = require('../src/ngrok');

describe('binary locator test suite', () => {
  test('getBinaryMeta returns correct OS and binary name', () => {
    const meta = getBinaryMeta();
    assert.ok(meta.platform);
    assert.ok(meta.arch);
    assert.ok(meta.binaryName);
    if (meta.isWindows) {
      assert.strictEqual(meta.binaryName, 'cloudflared.exe');
      assert.ok(meta.downloadUrl.endsWith('.exe'));
    } else {
      assert.strictEqual(meta.binaryName, 'cloudflared');
    }
  });

  test('findCloudflared resolves local binary if present', () => {
    const binary = findCloudflared();
    assert.ok(binary, 'Expected to resolve existing cloudflared in workspace');
    assert.ok(fs.existsSync(binary), 'Resolved binary must exist on disk');
  });

  test('findNgrok resolves local binary if present', () => {
    const ngrokBin = findNgrok();
    assert.ok(ngrokBin, 'Expected to resolve existing ngrok in workspace');
    assert.ok(fs.existsSync(ngrokBin), 'Resolved ngrok binary must exist on disk');
  });
});
