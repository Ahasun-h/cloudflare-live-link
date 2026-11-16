const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const chalk = require('chalk');
const { normalizeDomain } = require('./utils');

/**
 * Runs interactive prompt wizard to gather deployment settings.
 * @param {object} [existingConfig]
 * @returns {Promise<object>}
 */
async function runInteractiveWizard(existingConfig = {}) {
  console.log(chalk.cyan('\n📋 Interactive Setup Wizard for Cloudflare Local Deployment\n'));

  const questions = [
    {
      type: 'select',
      name: 'provider',
      message: 'Choose Tunnel Provider:',
      choices: [
        {
          title: '⚡ Cloudflare (Recommended: 100% Free, Unlimited Bandwidth, Custom Domains)',
          value: 'cloudflare'
        },
        {
          title: '🚀 Ngrok (Fast, requires Ngrok Auth Token & free static domain)',
          value: 'ngrok'
        }
      ],
      initial: existingConfig.provider === 'ngrok' ? 1 : 0
    },
    {
      type: (prev, values) => (values.provider === 'cloudflare' ? 'select' : null),
      name: 'mode',
      message: 'Choose Cloudflare tunnel mode:',
      choices: [
        {
          title: '⚡ Quick Tunnel (Instant free HTTPS link, zero Cloudflare setup)',
          value: 'quick'
        },
        {
          title: '🌐 Custom Domain with Token (Permanent custom domain via Cloudflare Zero Trust)',
          value: 'custom'
        }
      ],
      initial: existingConfig.token ? 1 : 0
    },
    {
      type: 'number',
      name: 'port',
      message: 'Local port to expose:',
      initial: existingConfig.port || 5001,
      validate: (val) => (val > 0 && val < 65536 ? true : 'Port must be between 1 and 65535')
    },
    {
      type: (prev, values) => (values.provider === 'ngrok' || values.mode === 'custom' ? 'text' : null),
      name: 'domain',
      message: (prev, values) =>
        values.provider === 'ngrok'
          ? 'Enter your reserved Ngrok Domain (e.g., your-subdomain.ngrok-free.dev, or leave blank):'
          : 'Enter your Custom Domain (e.g., app.yourdomain.com):',
      initial: existingConfig.domain || '',
      validate: (val, values) =>
        values.mode === 'custom' && !val.trim() ? 'Domain is required for Cloudflare custom domain mode' : true
    },
    {
      type: (prev, values) => (values.provider === 'ngrok' ? 'password' : values.mode === 'custom' ? 'password' : null),
      name: 'token',
      message: (prev, values) =>
        values.provider === 'ngrok'
          ? 'Enter your Ngrok Authtoken (or leave blank if already configured):'
          : 'Enter your Cloudflare Tunnel Token:',
      initial: existingConfig.token || '',
      validate: (val, values) =>
        values.mode === 'custom' && !val.trim() ? 'Tunnel token is required for Cloudflare custom mode' : true
    },
    {
      type: 'confirm',
      name: 'runCommand',
      message: 'Do you want to run a local project command first (e.g., npm start)?',
      initial: Boolean(existingConfig.command)
    },
    {
      type: (prev) => (prev ? 'text' : null),
      name: 'command',
      message: 'Enter start command:',
      initial: existingConfig.command || 'npm start'
    },
    {
      type: 'confirm',
      name: 'qr',
      message: 'Show mobile QR code in terminal when link is ready?',
      initial: existingConfig.qr !== false
    },
    {
      type: 'confirm',
      name: 'saveConfig',
      message: 'Save these settings to .cflocalrc.json for one-click launches?',
      initial: true
    }
  ];

  const answers = await prompts(questions, {
    onCancel: () => {
      console.log(chalk.yellow('\nSetup cancelled.'));
      process.exit(0);
    }
  });

  const isNgrok = answers.provider === 'ngrok';
  const config = {
    provider: answers.provider || 'cloudflare',
    port: answers.port || 5001,
    host: existingConfig.host || 'localhost',
    quick: isNgrok ? false : answers.mode === 'quick',
    domain: answers.domain ? normalizeDomain(answers.domain) : '',
    token: answers.token ? answers.token.trim() : '',
    ngrokToken: isNgrok && answers.token ? answers.token.trim() : undefined,
    command: answers.runCommand ? answers.command : undefined,
    qr: answers.qr,
    urlFile: existingConfig.urlFile || 'LIVE_URL.txt'
  };

  if (answers.saveConfig) {
    const configPath = path.resolve(process.cwd(), '.cflocalrc.json');
    const toSave = {
      provider: config.provider,
      port: config.port,
      quick: config.quick,
      domain: config.domain || undefined,
      token: config.token || undefined,
      command: config.command || undefined,
      qr: config.qr,
      urlFile: config.urlFile
    };

    // Clean undefined
    Object.keys(toSave).forEach((key) => toSave[key] === undefined && delete toSave[key]);

    fs.writeFileSync(configPath, JSON.stringify(toSave, null, 2), 'utf8');
    console.log(chalk.green(`✔ Configuration saved to ${chalk.bold(configPath)}\n`));
  }

  return config;
}

module.exports = {
  runInteractiveWizard
};
