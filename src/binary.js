const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/**
 * Determines system binary names and default locations.
 */
function getBinaryMeta() {
  const platform = os.platform();
  const arch = os.arch();
  const isWindows = platform === 'win32';
  const binaryName = isWindows ? 'cloudflared.exe' : 'cloudflared';

  let downloadUrl = '';

  if (isWindows) {
    downloadUrl = arch === 'arm64'
      ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
      : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
  } else if (platform === 'darwin') {
    downloadUrl = arch === 'arm64'
      ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz'
      : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz';
  } else if (platform === 'linux') {
    if (arch === 'arm64') {
      downloadUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64';
    } else if (arch === 'arm') {
      downloadUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm';
    } else {
      downloadUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';
    }
  }

  return {
    platform,
    arch,
    isWindows,
    binaryName,
    downloadUrl
  };
}

/**
 * Checks if a command exists in system PATH.
 * @param {string} cmd
 * @returns {string|null} Full path if found, null otherwise
 */
function findInPath(cmd) {
  try {
    const isWindows = os.platform() === 'win32';
    const checkCmd = isWindows ? `where ${cmd}` : `which ${cmd}`;
    const output = execSync(checkCmd, { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
    if (output) {
      const firstLine = output.split(/\r?\n/)[0].trim();
      if (fs.existsSync(firstLine)) return firstLine;
    }
  } catch {
    // Not found in PATH
  }
  return null;
}

/**
 * Returns default cache directory for cloudflared binary.
 */
function getDefaultCacheDir() {
  return path.join(os.homedir(), '.cloudflare-live-link', 'bin');
}

/**
 * Resolves path to cloudflared binary.
 * Searches:
 * 1. Explicit path in options
 * 2. Current working directory or package root
 * 3. System PATH
 * 4. User cache directory (~/.cloudflare-live-link/bin)
 *
 * @param {object} [options]
 * @returns {string|null}
 */
function findCloudflared(options = {}) {
  const { isWindows, binaryName } = getBinaryMeta();

  // 1. Explicit path
  if (options.binaryPath && fs.existsSync(options.binaryPath)) {
    return path.resolve(options.binaryPath);
  }

  // 2. Local workspace directory
  const cwdCandidate = path.resolve(process.cwd(), binaryName);
  if (fs.existsSync(cwdCandidate)) {
    return cwdCandidate;
  }

  // 3. Package directory (for bundled/workspace scenarios)
  const pkgCandidate = path.resolve(__dirname, '..', binaryName);
  if (fs.existsSync(pkgCandidate)) {
    return pkgCandidate;
  }

  // 4. System PATH
  const pathCandidate = findInPath(isWindows ? 'cloudflared.exe' : 'cloudflared');
  if (pathCandidate) {
    return pathCandidate;
  }

  // 5. User cache directory
  const cacheCandidate = path.join(getDefaultCacheDir(), binaryName);
  if (fs.existsSync(cacheCandidate)) {
    return cacheCandidate;
  }

  return null;
}

/**
 * Downloads official cloudflared binary from Cloudflare GitHub releases.
 * @param {object} [options]
 * @param {function} [onProgress]
 * @returns {Promise<string>} Path to downloaded binary
 */
async function downloadCloudflared(options = {}, onProgress = null) {
  const { isWindows, binaryName, downloadUrl } = getBinaryMeta();
  if (!downloadUrl) {
    throw new Error(`Unsupported platform: ${os.platform()} (${os.arch()})`);
  }

  const targetDir = options.targetDir || getDefaultCacheDir();
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetPath = path.join(targetDir, binaryName);
  if (onProgress) onProgress(`Downloading official cloudflared from ${downloadUrl}...`);

  const response = await fetch(downloadUrl, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Failed to download cloudflared: HTTP ${response.status} ${response.statusText}`);
  }

  if (downloadUrl.endsWith('.tgz') || downloadUrl.endsWith('.tar.gz')) {
    // macOS archive
    const arrayBuffer = await response.arrayBuffer();
    const tempTar = path.join(targetDir, 'cloudflared-temp.tgz');
    fs.writeFileSync(tempTar, Buffer.from(arrayBuffer));
    try {
      execSync(`tar -xzf "${tempTar}" -C "${targetDir}"`, { stdio: 'ignore' });
      fs.unlinkSync(tempTar);
    } catch (tarErr) {
      throw new Error(`Failed to extract tarball: ${tarErr.message}`);
    }
  } else {
    // Direct executable binary (Windows / Linux)
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
  }

  // Set executable permissions on POSIX
  if (!isWindows) {
    try {
      fs.chmodSync(targetPath, 0o755);
    } catch {
      // Ignore on systems where chmod is not applicable
    }
  }

  if (onProgress) onProgress(`cloudflared binary ready at: ${targetPath}`);
  return targetPath;
}

/**
 * Ensures cloudflared binary is available, downloading if necessary.
 * @param {object} [options]
 * @param {function} [onProgress]
 * @returns {Promise<string>}
 */
async function ensureCloudflared(options = {}, onProgress = null) {
  const existing = findCloudflared(options);
  if (existing) {
    return existing;
  }

  return await downloadCloudflared(options, onProgress);
}

module.exports = {
  getBinaryMeta,
  findInPath,
  findCloudflared,
  downloadCloudflared,
  ensureCloudflared,
  getDefaultCacheDir
};
