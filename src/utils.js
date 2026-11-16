const net = require('net');
const fs = require('fs');
const path = require('path');

/**
 * Checks if a TCP port is currently open and accepting connections.
 * @param {number} port
 * @param {string} host
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
function checkPort(port, host = '127.0.0.1', timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const cleanup = () => {
      if (!settled) {
        settled = true;
        socket.destroy();
      }
    };

    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      cleanup();
      resolve(true);
    });

    socket.once('timeout', () => {
      cleanup();
      resolve(false);
    });

    socket.once('error', () => {
      cleanup();
      resolve(false);
    });

    try {
      socket.connect(port, host);
    } catch {
      cleanup();
      resolve(false);
    }
  });
}

/**
 * Waits until a target port becomes active or timeout expires.
 * @param {number} port
 * @param {string} host
 * @param {number} maxTries
 * @param {number} intervalMs
 * @returns {Promise<boolean>}
 */
async function waitForPort(port, host = '127.0.0.1', maxTries = 30, intervalMs = 1000) {
  for (let i = 0; i < maxTries; i++) {
    const isUp = await checkPort(port, host);
    if (isUp) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

/**
 * Extracts TryCloudflare quick tunnel URL from text output.
 * @param {string} text
 * @returns {string|null}
 */
function extractQuickTunnelUrl(text) {
  if (!text) return null;
  const match = text.match(/https:\/\/[a-zA-Z0-9\-]+\.trycloudflare\.com/i);
  return match ? match[0] : null;
}

/**
 * Saves live URL to file (and optional JSON metadata) for downstream integrations.
 * @param {string} filePath
 * @param {string} url
 * @param {object} [metadata]
 */
function writeSavedUrl(filePath, url, metadata = {}) {
  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, url.trim(), 'utf8');

    // Also write json version alongside if desired
    const jsonPath = fullPath.replace(/\.txt$/i, '') + '.json';
    const payload = {
      url: url.trim(),
      updatedAt: new Date().toISOString(),
      ...metadata
    };
    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error(`Warning: Could not save URL to ${filePath}:`, err.message);
  }
}

/**
 * Mask sensitive tokens for logging.
 * @param {string} token
 * @returns {string}
 */
function maskToken(token) {
  if (!token) return '';
  if (token.length <= 10) return '********';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

/**
 * Normalizes a domain name (strips protocol and trailing slashes).
 * @param {string} rawDomain
 * @returns {string}
 */
function normalizeDomain(rawDomain) {
  if (!rawDomain) return '';
  return rawDomain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

module.exports = {
  checkPort,
  waitForPort,
  extractQuickTunnelUrl,
  writeSavedUrl,
  maskToken,
  normalizeDomain
};
