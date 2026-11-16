const { spawn } = require('child_process');
const EventEmitter = require('events');
const chalk = require('chalk');
const { extractQuickTunnelUrl, writeSavedUrl, maskToken } = require('./utils');
const { ensureCloudflared } = require('./binary');
const { startNgrokTunnel } = require('./ngrok');

class CloudflareTunnel extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      port: 5001,
      host: 'localhost',
      urlFile: 'LIVE_URL.txt',
      ...config
    };
    this.child = null;
    this.url = null;
    this.isAlive = false;
    this._exitPromise = null;
  }

  /**
   * Builds the command line arguments for cloudflared based on config.
   */
  _buildArgs() {
    const { port = 5001, host = 'localhost', token, quick, domain } = this.config;
    const args = [];

    if (!quick && token) {
      // Named tunnel using Cloudflare Zero Trust Tunnel Token
      args.push('tunnel', 'run', '--token', token, '--no-autoupdate');
    } else {
      // Instant Quick Tunnel
      const localTarget = `http://${host}:${port}`;
      args.push('tunnel', '--url', localTarget, '--no-autoupdate');

      if (domain && !quick) {
        // Experimental / hostname alias flag if provided
        args.push('--hostname', domain);
      }
    }

    return args;
  }

  /**
   * Starts the cloudflared tunnel process.
   * @returns {Promise<string>} Resolves with the public live shareable URL
   */
  async start() {
    const binaryPath = await ensureCloudflared(this.config, (msg) => {
      console.log(chalk.dim(`[Binary] ${msg}`));
    });

    const args = this._buildArgs();
    const isTokenMode = !this.config.quick && Boolean(this.config.token);

    if (isTokenMode) {
      console.log(
        chalk.cyan(
          `🚀 Launching Cloudflare Tunnel with Token: ${chalk.bold(maskToken(this.config.token))}...`
        )
      );
    } else {
      console.log(
        chalk.cyan(
          `🚀 Launching Cloudflare Quick Tunnel for ${chalk.bold(`http://${this.config.host}:${this.config.port}`)}...`
        )
      );
    }

    return new Promise((resolve, reject) => {
      let resolved = false;

      try {
        this.child = spawn(binaryPath, args, {
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } catch (err) {
        return reject(new Error(`Failed to execute cloudflared at "${binaryPath}": ${err.message}`));
      }

      this.isAlive = true;

      const handleOutput = (chunk) => {
        const text = chunk.toString();
        this.emit('log', text);

        if (this.config.verbose) {
          process.stdout.write(chalk.dim(text));
        }

        // 1. Check for quick tunnel URL
        const quickUrl = extractQuickTunnelUrl(text);
        if (quickUrl && !resolved) {
          resolved = true;
          this.url = quickUrl;
          this._onReady(quickUrl);
          resolve(quickUrl);
          return;
        }

        // 2. Check for token-based connection success
        if (isTokenMode && !resolved) {
          // Cloudflare Zero Trust outputs messages like "Registered tunnel connection", "Connection ... registered"
          const connectionRegistered =
            /registered tunnel connection/i.test(text) ||
            /connection[^\n]+registered/i.test(text) ||
            /updated to state: signal/i.test(text);

          if (connectionRegistered) {
            resolved = true;
            const liveUrl = this.config.domain
              ? `https://${this.config.domain}`
              : 'https://[Your-Cloudflare-Configured-Domain]';
            this.url = liveUrl;
            this._onReady(liveUrl);
            resolve(liveUrl);
            return;
          }
        }

        // 3. Catch fatal authentication or configuration errors
        if (/error="tunnel [^\s]+ not found"/i.test(text) || /unauthorized/i.test(text)) {
          if (!resolved) {
            resolved = true;
            reject(new Error(`Cloudflare rejected tunnel token: ${text.trim()}`));
          }
        }
      };

      this.child.stdout.on('data', handleOutput);
      this.child.stderr.on('data', handleOutput);

      this.child.on('error', (err) => {
        this.isAlive = false;
        if (!resolved) {
          resolved = true;
          reject(err);
        }
        this.emit('error', err);
      });

      this.child.on('exit', (code, signal) => {
        this.isAlive = false;
        if (!resolved) {
          resolved = true;
          reject(new Error(`cloudflared exited prematurely with code ${code || signal}`));
        }
        this.emit('close', { code, signal });
      });

      // Safety timeout: if no URL or registration detected within 45s
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.stop();
          reject(
            new Error(
              'Timeout (45s) waiting for Cloudflare tunnel to establish connection. ' +
                'Please check your internet connection or Cloudflare settings.'
            )
          );
        }
      }, 45000);

      // Clear timeout if resolved
      this.once('ready', () => clearTimeout(timeout));
    });
  }

  _onReady(url) {
    if (this.config.urlFile) {
      writeSavedUrl(this.config.urlFile, url, {
        port: this.config.port,
        host: this.config.host,
        domain: this.config.domain || null,
        mode: this.config.token ? 'token' : 'quick'
      });
    }
    this.emit('ready', url);
  }

  /**
   * Gracefully terminates the tunnel process.
   */
  async stop() {
    if (!this.child || !this.isAlive) return;

    return new Promise((resolve) => {
      this.isAlive = false;
      const isWindows = process.platform === 'win32';

      try {
        if (isWindows && this.child.pid) {
          spawn('taskkill', ['/pid', this.child.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
        } else if (this.child.pid) {
          this.child.kill('SIGTERM');
        }
      } catch {
        // ignore
      }

      this.child.once('exit', () => resolve());
      // Fallback timeout
      setTimeout(resolve, 2000);
    });
  }
}

/**
 * Convenience helper to create and start a CloudflareTunnel.
 * @param {object} config
 * @returns {Promise<CloudflareTunnel>}
 */
async function startTunnel(config) {
  if (config && (config.provider === 'ngrok' || config.ngrok)) {
    const ngrokInstance = await startNgrokTunnel(config);
    return ngrokInstance;
  }
  const tunnel = new CloudflareTunnel(config);
  await tunnel.start();
  return tunnel;
}

module.exports = {
  CloudflareTunnel,
  startTunnel
};
