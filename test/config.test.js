const { test, describe } = require('node:test');
const assert = require('node:assert');
const { resolveConfig } = require('../src/config');

describe('config test suite', () => {
  test('defaults to quick tunnel mode when no domain or token given', () => {
    const config = resolveConfig({});
    assert.strictEqual(config.port, 5001);
    assert.strictEqual(config.quick, true);
    assert.strictEqual(config.host, 'localhost');
  });

  test('enables custom domain mode when token and domain provided', () => {
    const config = resolveConfig({
      port: '3000',
      domain: 'https://demo.myapp.com/',
      token: 'eyJhIjoiMTIzNDU2In0='
    });

    assert.strictEqual(config.port, 3000);
    assert.strictEqual(config.domain, 'demo.myapp.com');
    assert.strictEqual(config.token, 'eyJhIjoiMTIzNDU2In0=');
    assert.strictEqual(config.quick, false);
  });

  test('respects explicit --quick flag even if domain is present', () => {
    const config = resolveConfig({
      quick: true,
      domain: 'demo.myapp.com'
    });
    assert.strictEqual(config.quick, true);
  });

  test('coerces string port numbers to integer', () => {
    const config = resolveConfig({ port: '8080' });
    assert.strictEqual(config.port, 8080);
  });
});
