const { test, describe } = require('node:test');
const assert = require('node:assert');
const net = require('net');
const {
  checkPort,
  waitForPort,
  extractQuickTunnelUrl,
  maskToken,
  normalizeDomain
} = require('../src/utils');

describe('utils test suite', () => {
  test('extractQuickTunnelUrl extracts valid trycloudflare URLs', () => {
    const sampleLog = `
      2026-11-16T12:00:00Z INF +--------------------------------------------------------------------------------------------+
      2026-11-16T12:00:00Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
      2026-11-16T12:00:00Z INF |  https://my-cool-project-subdomain.trycloudflare.com                                       |
      2026-11-16T12:00:00Z INF +--------------------------------------------------------------------------------------------+
    `;
    const url = extractQuickTunnelUrl(sampleLog);
    assert.strictEqual(url, 'https://my-cool-project-subdomain.trycloudflare.com');
  });

  test('extractQuickTunnelUrl returns null if no match', () => {
    assert.strictEqual(extractQuickTunnelUrl('Random error message'), null);
  });

  test('normalizeDomain strips protocol and trailing slashes', () => {
    assert.strictEqual(normalizeDomain('https://app.example.com/'), 'app.example.com');
    assert.strictEqual(normalizeDomain('http://sub.example.com:8080/'), 'sub.example.com:8080');
    assert.strictEqual(normalizeDomain('  my-domain.io  '), 'my-domain.io');
  });

  test('maskToken obscures sensitive parts of tunnel token', () => {
    assert.strictEqual(maskToken('eyJhIjoiY2xvdWRmbGFyZSJ9'), 'eyJh...ZSJ9');
    assert.strictEqual(maskToken('short'), '********');
    assert.strictEqual(maskToken(''), '');
  });

  test('checkPort accurately detects an active TCP server', async () => {
    const server = net.createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const isOpen = await checkPort(port, '127.0.0.1');
    assert.strictEqual(isOpen, true);

    await new Promise((resolve) => server.close(resolve));
    const isClosed = await checkPort(port, '127.0.0.1', 200);
    assert.strictEqual(isClosed, false);
  });
});
