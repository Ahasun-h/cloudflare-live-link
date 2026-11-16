#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const pkg = require('../package.json');
const {
  deployProject,
  runInteractiveWizard,
  resolveConfig,
  ensureCloudflared,
  findCloudflared,
  checkPort,
  printBanner
} = require('../src');

const program = new Command();

program
  .name('cloudflare-live-link')
  .description('Deploy local projects on your PC with Cloudflare Tunnels, custom domains, and live shareable links.')
  .version(pkg.version, '-V, --version', 'Output package version')
  .option('-P, --provider <provider>', 'Tunnel provider: "cloudflare" or "ngrok"', 'cloudflare')
  .option('--ngrok', 'Use Ngrok instead of Cloudflare')
  .option('-p, --port <number>', 'Local port to expose (e.g. 5001, 3000)')
  .option('-d, --domain <domain>', 'Custom Domain configured in Cloudflare (e.g. app.example.com)')
  .option('-t, --token <token>', 'Cloudflare Tunnel Token (from Cloudflare Zero Trust)')
  .option('-s, --start <command>', 'Command to start local project (e.g. "npm start", "node server.js")')
  .option('--dir <path>', 'Working directory for the start command')
  .option('-q, --quick', 'Force instant Quick Tunnel (*.trycloudflare.com, no setup required)')
  .option('-i, --interactive', 'Launch interactive configuration wizard')
  .option('-c, --config <path>', 'Path to custom config file (JSON)')
  .option('--url-file <path>', 'File path to save the live URL', 'LIVE_URL.txt')
  .option('--no-qr', 'Disable QR code in terminal')
  .option('-v, --verbose', 'Print detailed cloudflared process output')
  .action(async (options) => {
    try {
      // Determine if interactive wizard should be triggered:
      // If user passed -i/--interactive flag, OR if no arguments were provided and no config file exists
      const configFromFile = resolveConfig(options);
      const hasSpecificArgs =
        options.port ||
        options.domain ||
        options.token ||
        options.start ||
        options.quick ||
        options.config;

      const hasSavedConfig =
        fs.existsSync(path.resolve(process.cwd(), '.cflocalrc.json')) ||
        fs.existsSync(path.resolve(process.cwd(), '.cflocalrc'));

      if (options.interactive || (!hasSpecificArgs && !hasSavedConfig && process.stdin.isTTY)) {
        printBanner();
        const wizardAnswers = await runInteractiveWizard(configFromFile);
        await deployProject({ ...wizardAnswers, verbose: options.verbose });
      } else {
        await deployProject(options);
      }
    } catch (err) {
      if (options.verbose) {
        console.error(err);
      }
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Interactively configure and generate a .cflocalrc.json config file')
  .action(async () => {
    printBanner();
    const config = resolveConfig();
    await runInteractiveWizard(config);
    console.log(chalk.green('✔ Initialized configuration! You can now run "npx cloudflare-live-link" to start.'));
  });

program
  .command('status')
  .description('Check local port status, binary status, and last saved live URL')
  .option('-p, --port <number>', 'Port to check', '5001')
  .action(async (cmdOpts) => {
    printBanner();
    const port = parseInt(cmdOpts.port, 10) || 5001;
    const isUp = await checkPort(port);
    const binary = findCloudflared();

    console.log(chalk.bold('Environment & Service Status:\n'));
    console.log(
      `  • Local Port ${port}:       ${isUp ? chalk.green.bold('LISTENING (Active)') : chalk.yellow('NOT LISTENING')}`
    );
    console.log(
      `  • cloudflared binary:    ${
        binary ? chalk.green.bold(`FOUND (${binary})`) : chalk.red('NOT FOUND (Will auto-download on run)')
      }`
    );

    const savedUrlFile = path.resolve(process.cwd(), 'LIVE_URL.txt');
    if (fs.existsSync(savedUrlFile)) {
      const savedUrl = fs.readFileSync(savedUrlFile, 'utf8').trim();
      console.log(`  • Last Saved Live URL:   ${chalk.cyan.underline(savedUrl)}`);
    } else {
      console.log(`  • Last Saved Live URL:   ${chalk.dim('None (run tunnel to generate)')}`);
    }
    console.log('');
  });

program
  .command('download')
  .description('Download or update official cloudflared binary for your system')
  .action(async () => {
    printBanner();
    console.log(chalk.cyan('Downloading official cloudflared binary...'));
    const binaryPath = await ensureCloudflared({}, (msg) => console.log(chalk.dim(msg)));
    console.log(chalk.green.bold(`\n✔ cloudflared binary successfully installed at: ${binaryPath}`));
  });

program.parse(process.argv);
