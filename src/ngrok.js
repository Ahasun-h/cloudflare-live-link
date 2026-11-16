const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const { writeSavedUrl, normalizeDomain } = require('./utils');

/**
 * Searches for ngrok binary in common locations.
 * @param {object} [options]
 * @returns {string|null}
 */
function findNgrok(options = {}) {
  const isWindows = os.platform() === 'win32';
  const binaryName = isWindows ? 'ngrok.exe' : 'ngrok';

  // 1. Explicit path
  if (options.ngrokPath && fs.existsSync(options.ngrokPath)) {
    return path.resolve(options.ngrokPath);
  }

  // 2. Current working directory
  const cwdCandidate = path.resolve(process.cwd(), binaryName);
  if (fs.existsSync(cwdCandidate)) return cwdCandidate;

  // 3. Package root directory
  const pkgCandidate = path.resolve(__dirname, '..', binaryName);
  if (fs.existsSync(pkgCandidate)) return pkgCandidate;

  // 4. System PATH
  try {
    const checkCmd = isWindows ? 'where ngrok' : 'which ngrok';
    const output = execSync(checkCmd, { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
    if (output) {
      const firstLine = output.split(/\r?\n/)[0].trim();
      if (fs.existsSync(firstLine)) return firstLine;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Sets ngrok authtoken if provided.
 * @param {string} binaryPath
 * @param {string} token
 */
function configureNgrokAuthToken(binaryPath, token) {
  if (!token) return;
  try {
    execSync(`"${binaryPath}" config add-authtoken ${token.trim()}`, {
      stdio: 'ignore'
    });
  } catch (err) {
    console.warn(chalk.yellow(`Warning: Could not configure ngrok authtoken: ${err.message}`));
  }
}

/**
 * Starts an ngrok HTTP tunnel.
 * @param {object} config
 * @returns {Promise<{ process: object, url: string, stop: Function }>}
 */
async function startNgrokTunnel(config = {}) {
  const binaryPath = findNgrok(config);
  if (!binaryPath) {
    throw new Error(
      'ngrok binary was not found. Please install ngrok or place ngrok executable in your PATH or project folder.'
    );
  }

  const port = config.port || 5001;
  const token = config.ngrokToken || config.token;
  const domain = config.domain ? normalizeDomain(config.domain) : null;

  if (token) {
    configureNgrokAuthToken(binaryPath, token);
  }

  const args = ['http', String(port), '--log=stdout'];
  if (domain) {
    args.push(`--domain=${domain}`);
  }

  console.log(
    chalk.cyan(
      `🚀 Launching Ngrok tunnel for port ${chalk.bold(port)}${domain ? ` with domain: ${chalk.bold(domain)}` : ''}...`
    )
  );

  return new Promise((resolve, reject) => {
    let resolved = false;
    let child;

    try {
      child = spawn(binaryPath, args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (err) {
      return reject(new Error(`Failed to execute ngrok: ${err.message}`));
    }

    const isWindows = process.platform === 'win32';
    const stop = () => {
      if (!child || child.killed) return;
      try {
        if (isWindows && child.pid) {
          spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
        } else if (child.pid) {
          child.kill('SIGTERM');
        }
      } catch {
        // ignore
      }
    };

    const handleOutput = (chunk) => {
      const text = chunk.toString();
      if (config.verbose) {
        process.stdout.write(chalk.dim(text));
      }

      // Regex to extract url=https://...
      const match = text.match(/url=(https:\/\/[^\s]+)/i);
      if (match && !resolved) {
        resolved = true;
        const liveUrl = match[1].trim();

        if (config.urlFile) {
          writeSavedUrl(config.urlFile, liveUrl, {
            port,
            provider: 'ngrok',
            domain: domain || null
          });
        }

        resolve({
          process: child,
          url: liveUrl,
          stop
        });
      }

      // Check for errors
      if (/ERR_NGROK_/i.test(text) || /error authentication failed/i.test(text)) {
        if (!resolved) {
          resolved = true;
          stop();
          reject(new Error(`Ngrok Error: ${text.trim()}`));
        }
      }
    };

    child.stdout.on('data', handleOutput);
    child.stderr.on('data', handleOutput);

    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    child.on('exit', (code, signal) => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`ngrok exited prematurely with code ${code || signal}`));
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        stop();
        reject(new Error('Timeout (30s) waiting for Ngrok tunnel to establish connection.'));
      }
    }, 30000);
  });
}

module.exports = {
  findNgrok,
  startNgrokTunnel
};
