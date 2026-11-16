const { spawn } = require('child_process');
const chalk = require('chalk');
const { checkPort, waitForPort } = require('./utils');

/**
 * Spawns the user's local project process.
 * @param {string} command
 * @param {string} cwd
 * @param {object} [options]
 * @returns {object} { process, stop }
 */
function spawnProjectProcess(command, cwd, options = {}) {
  const isWindows = process.platform === 'win32';
  console.log(chalk.blue(`▶ Starting local project command: "${chalk.bold(command)}" in ${cwd}`));

  const child = spawn(command, {
    shell: true,
    cwd,
    stdio: options.silent ? ['ignore', 'ignore', 'ignore'] : ['ignore', 'pipe', 'pipe'],
    detached: !isWindows
  });

  if (!options.silent && child.stdout && child.stderr) {
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      text.split(/\r?\n/).forEach((line) => {
        if (line.trim()) {
          console.log(`${chalk.dim('[App]')} ${line}`);
        }
      });
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      text.split(/\r?\n/).forEach((line) => {
        if (line.trim()) {
          console.error(`${chalk.red.dim('[App Err]')} ${line}`);
        }
      });
    });
  }

  const stop = () => {
    if (!child || child.killed) return;
    try {
      if (isWindows) {
        // Force kill process tree on Windows
        spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
      } else {
        process.kill(-child.pid, 'SIGTERM');
      }
    } catch {
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
    }
  };

  return { process: child, stop };
}

/**
 * Ensures the target service port is active, optionally starting the project first.
 * @param {object} config
 * @returns {Promise<{ spawned: boolean, stopProject?: Function }>}
 */
async function ensureServiceReady(config) {
  const { port, host = '127.0.0.1', command, cwd = process.cwd() } = config;

  console.log(chalk.cyan(`🔍 Checking if local port ${chalk.bold(port)} is listening...`));
  const isAlreadyUp = await checkPort(port, host);

  if (isAlreadyUp) {
    console.log(chalk.green(`✔ Port ${port} is already active and ready.`));
    return { spawned: false };
  }

  if (!command) {
    console.warn(
      chalk.yellow(
        `⚠ Nothing is currently listening on port ${port}. ` +
          `Starting Cloudflare tunnel anyway — make sure your local server is started!`
      )
    );
    return { spawned: false };
  }

  // Start the project command
  const projectInstance = spawnProjectProcess(command, cwd);
  console.log(chalk.cyan(`⏳ Waiting for local service on port ${port}...`));

  const isReady = await waitForPort(port, host, 40, 1000);
  if (!isReady) {
    projectInstance.stop();
    throw new Error(
      `Service failed to start on port ${port} within 40 seconds using command: "${command}".`
    );
  }

  console.log(chalk.green(`✔ Local service is now active on port ${port}!`));
  return {
    spawned: true,
    stopProject: projectInstance.stop
  };
}

module.exports = {
  spawnProjectProcess,
  ensureServiceReady
};
