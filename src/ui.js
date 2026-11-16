const chalk = require('chalk');
const qrcodeTerminal = require('qrcode-terminal');

const BANNER = `
  ${chalk.bold.cyan('╔═══════════════════════════════════════════════════════╗')}
  ${chalk.bold.cyan('║')}   ${chalk.bold.yellow('⚡ CLOUDFLARE LIVE LINK')} ${chalk.dim('— PC Local Deployment')}     ${chalk.bold.cyan('║')}
  ${chalk.bold.cyan('║')}   ${chalk.gray('Instant Shareable URLs for Local PC Services')}       ${chalk.bold.cyan('║')}
  ${chalk.bold.cyan('╚═══════════════════════════════════════════════════════╝')}
`;

function printBanner() {
  console.log(BANNER);
}

/**
 * Formats a clean border box around text lines.
 */
function createBox(lines, options = {}) {
  const color = options.color || chalk.cyan;
  const padding = options.padding || 1;
  const title = options.title ? ` ${options.title} ` : '';

  // Calculate maximum line length (stripping ANSI codes for accurate width)
  const stripAnsi = (str) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  const lengths = lines.map((l) => stripAnsi(l).length);
  const maxContentWidth = Math.max(...lengths, stripAnsi(title).length);
  const boxWidth = maxContentWidth + padding * 2;

  const topBorder = '┌' + (title ? title + '─'.repeat(boxWidth - stripAnsi(title).length) : '─'.repeat(boxWidth)) + '┐';
  const bottomBorder = '└' + '─'.repeat(boxWidth) + '┘';

  const output = [];
  output.push(color(topBorder));

  for (const line of lines) {
    const rawLen = stripAnsi(line).length;
    const padRight = ' '.repeat(boxWidth - rawLen - padding);
    const padLeft = ' '.repeat(padding);
    output.push(color('│') + padLeft + line + padRight + color('│'));
  }

  output.push(color(bottomBorder));
  return output.join('\n');
}

/**
 * Renders the primary deployment summary card.
 */
function renderLiveCard({ liveUrl, localTarget, mode, domain, savedFile, showQr = true }) {
  const lines = [
    '',
    ` ${chalk.bold.green('✔')} ${chalk.bold.white('STATUS:')}       ${chalk.bold.greenBright('ONLINE & SECURED')}`,
    ` ${chalk.bold.cyan('➜')} ${chalk.bold.white('PUBLIC URL:')}   ${chalk.bold.underline.cyanBright(liveUrl)}`,
    ` ${chalk.bold.blue('➜')} ${chalk.bold.white('LOCAL TARGET:')} ${chalk.gray(localTarget)}`,
    ` ${chalk.bold.magenta('➜')} ${chalk.bold.white('MODE:')}         ${mode}`,
    domain ? ` ${chalk.bold.yellow('➜')} ${chalk.bold.white('DOMAIN:')}       ${chalk.yellow(domain)}` : '',
    savedFile ? ` ${chalk.bold.gray('➜')} ${chalk.bold.white('SAVED TO:')}     ${chalk.gray(savedFile)}` : '',
    '',
    chalk.dim(' Press [Ctrl + C] anytime to stop the tunnel and disconnect.')
  ].filter(Boolean);

  console.log('\n' + createBox(lines, { title: 'DEPLOYMENT ACTIVE', color: chalk.cyanBright }) + '\n');

  if (showQr && liveUrl) {
    console.log(chalk.bold.dim('📱 Scan with your phone for instant mobile testing:\n'));
    qrcodeTerminal.generate(liveUrl, { small: true }, (qrcode) => {
      console.log(qrcode);
    });
  }
}

/**
 * Displays an error box with actionable troubleshooting tips.
 */
function renderErrorBox(title, message, suggestions = []) {
  const lines = [
    '',
    ` ${chalk.bold.red('✖ ERROR:')} ${chalk.redBright(message)}`,
    ''
  ];

  if (suggestions.length > 0) {
    lines.push(` ${chalk.bold.yellow('Suggestions:')}`);
    for (const sug of suggestions) {
      lines.push(`  ${chalk.dim('•')} ${sug}`);
    }
    lines.push('');
  }

  console.error('\n' + createBox(lines, { title: title || 'FAILURE', color: chalk.redBright }) + '\n');
}

module.exports = {
  printBanner,
  createBox,
  renderLiveCard,
  renderErrorBox
};
