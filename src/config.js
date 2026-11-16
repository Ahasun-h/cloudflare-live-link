const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { normalizeDomain } = require('./utils');

// Attempt to load .env from current directory or parent directory
try {
  dotenv.config();
} catch {
  // dotenv optional
}

const CONFIG_FILENAMES = [
  '.cflocalrc',
  '.cflocalrc.json',
  'cloudflare-tunnel.config.json',
  'local-deploy.config.json'
];

/**
 * Searches for a configuration file in the working directory.
 * @param {string} [explicitPath]
 * @returns {object|null}
 */
function loadConfigFile(explicitPath) {
  if (explicitPath) {
    const fullPath = path.resolve(process.cwd(), explicitPath);
    if (fs.existsSync(fullPath)) {
      try {
        const raw = fs.readFileSync(fullPath, 'utf8');
        return JSON.parse(raw);
      } catch (err) {
        throw new Error(`Failed to parse config file at ${explicitPath}: ${err.message}`);
      }
    } else {
      throw new Error(`Config file not found: ${explicitPath}`);
    }
  }

  for (const filename of CONFIG_FILENAMES) {
    const candidate = path.resolve(process.cwd(), filename);
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, 'utf8');
        return JSON.parse(raw);
      } catch (err) {
        console.warn(`Warning: Could not parse ${filename}:`, err.message);
      }
    }
  }

  // Also check package.json for cloudflareLiveLink / cloudflareTunnel section
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.cloudflareLiveLink) return pkg.cloudflareLiveLink;
      if (pkg.cloudflareTunnel) return pkg.cloudflareTunnel;
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Loads and merges configuration with priority:
 * 1. CLI options
 * 2. Environment variables
 * 3. Config file (.cflocalrc.json)
 * 4. Default fallbacks
 *
 * @param {object} [cliOptions]
 * @returns {object} Normalized configuration object
 */
function resolveConfig(cliOptions = {}) {
  const fileConfig = loadConfigFile(cliOptions.config) || {};

  const envConfig = {
    provider: process.env.TUNNEL_PROVIDER,
    token: process.env.CLOUDFLARE_TUNNEL_TOKEN || process.env.CF_TUNNEL_TOKEN || process.env.TUNNEL_TOKEN,
    domain: process.env.CLOUDFLARE_DOMAIN || process.env.CF_DOMAIN || process.env.CUSTOM_DOMAIN || process.env.NGROK_DOMAIN,
    ngrokToken: process.env.NGROK_AUTHTOKEN || process.env.NGROK_TOKEN,
    port: process.env.PORT || process.env.LOCAL_PORT,
    host: process.env.LOCAL_HOST,
    command: process.env.PROJECT_START_CMD || process.env.START_COMMAND,
    cwd: process.env.PROJECT_CWD,
    urlFile: process.env.LIVE_URL_FILE,
    binaryPath: process.env.CLOUDFLARE_BINARY_PATH || process.env.CLOUDFLARED_PATH
  };

  const defaults = {
    provider: 'cloudflare',
    port: 5001,
    host: 'localhost',
    urlFile: 'LIVE_URL.txt',
    qr: true,
    quick: false,
    logLevel: 'info',
    cwd: process.cwd()
  };

  // Merge in order: defaults <- fileConfig <- envConfig <- cliOptions
  const rawMerged = {
    ...defaults,
    ...cleanUndefined(fileConfig),
    ...cleanUndefined(envConfig),
    ...cleanUndefined(cliOptions)
  };

  // Cast port to number
  const port = parseInt(rawMerged.port, 10) || 5001;

  // Clean and normalize domain
  const domain = normalizeDomain(rawMerged.domain);

  // If user specified token or domain, custom domain mode is preferred over quick mode
  // If user explicitly passed --quick, quick mode takes precedence
  let isQuick = Boolean(rawMerged.quick);
  if (!isQuick && !rawMerged.token && !domain) {
    // If no token or domain provided, default to quick tunnel
    isQuick = true;
  }

  return {
    ...rawMerged,
    port,
    domain,
    token: rawMerged.token ? String(rawMerged.token).trim() : '',
    quick: isQuick,
    qr: rawMerged.qr !== false,
    cwd: path.resolve(rawMerged.cwd || process.cwd())
  };
}

/**
 * Removes undefined or empty string values from an object.
 */
function cleanUndefined(obj) {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') {
      result[k] = v;
    }
  }
  return result;
}

module.exports = {
  loadConfigFile,
  resolveConfig,
  CONFIG_FILENAMES
};
