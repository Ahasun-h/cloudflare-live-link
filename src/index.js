const { startTunnel, CloudflareTunnel } = require('./tunnel');
const { startNgrokTunnel, findNgrok } = require('./ngrok');
const { ensureServiceReady, spawnProjectProcess } = require('./project-runner');
const { ensureCloudflared, findCloudflared, downloadCloudflared } = require('./binary');
const { resolveConfig, loadConfigFile } = require('./config');
const { checkPort, waitForPort, writeSavedUrl, normalizeDomain } = require('./utils');
const { printBanner, renderLiveCard, renderErrorBox } = require('./ui');
const { runInteractiveWizard } = require('./interactive');

/**
 * End-to-end orchestrator: starts project (if configured), checks port readiness,
 * launches Cloudflare tunnel, prints live shareable link & QR code, and handles cleanup.
 *
 * @param {object} options
 * @returns {Promise<{ tunnel: CloudflareTunnel, url: string, stop: Function }>}
 */
async function deployProject(options = {}) {
  const config = resolveConfig(options);

  if (!options.silent) {
    printBanner();
  }

  let stopProject = null;

  // 1. Ensure local service is ready (or start it)
  try {
    const serviceStatus = await ensureServiceReady(config);
    if (serviceStatus.stopProject) {
      stopProject = serviceStatus.stopProject;
    }
  } catch (err) {
    renderErrorBox('SERVICE INITIALIZATION FAILED', err.message, [
      `Check if another program is occupying port ${config.port}`,
      `Verify your start command "${config.command}" runs cleanly in ${config.cwd}`
    ]);
    throw err;
  }

  // 2. Start Tunnel (Cloudflare or Ngrok)
  let tunnelInstance;
  let liveUrl;
  const isNgrok = config.provider === 'ngrok' || config.ngrok;

  try {
    if (isNgrok) {
      const ngrok = await startNgrokTunnel(config);
      liveUrl = ngrok.url;
      tunnelInstance = ngrok;
    } else {
      tunnelInstance = new CloudflareTunnel(config);
      liveUrl = await tunnelInstance.start();
    }

    // 3. Render success card and QR code
    if (!options.silent) {
      const mode = isNgrok
        ? (config.domain ? `Ngrok Custom Domain (${config.domain})` : 'Ngrok Public Tunnel')
        : (config.quick
          ? 'Cloudflare Quick Tunnel (trycloudflare.com)'
          : config.token
          ? 'Cloudflare Custom Domain (Zero Trust)'
          : 'Cloudflare Edge Tunnel');

      renderLiveCard({
        liveUrl,
        localTarget: `http://${config.host}:${config.port}`,
        mode,
        domain: config.domain || null,
        savedFile: config.urlFile || null,
        showQr: config.qr
      });
    }

    // 4. Combined stop handler
    const stopAll = async () => {
      console.log('\nStopping services and disconnecting Cloudflare tunnel...');
      if (tunnelInstance) await tunnelInstance.stop();
      if (stopProject) stopProject();
      console.log('All local tunnel services terminated cleanly.');
    };

    // Attach process exit signals
    const onExit = async () => {
      process.removeListener('SIGINT', onExit);
      process.removeListener('SIGTERM', onExit);
      await stopAll();
      process.exit(0);
    };

    process.once('SIGINT', onExit);
    process.once('SIGTERM', onExit);

    return {
      tunnel: tunnelInstance,
      url: liveUrl,
      stop: stopAll
    };
  } catch (err) {
    if (stopProject) stopProject();
    renderErrorBox('CLOUDFLARE TUNNEL FAILED', err.message, [
      'Ensure you have an active internet connection',
      'For custom domains: verify your Cloudflare Tunnel Token is valid in Cloudflare Zero Trust',
      'If using Quick Tunnel: try running with flag --quick'
    ]);
    throw err;
  }
}

module.exports = {
  deployProject,
  startTunnel,
  CloudflareTunnel,
  startNgrokTunnel,
  findNgrok,
  ensureCloudflared,
  findCloudflared,
  downloadCloudflared,
  ensureServiceReady,
  spawnProjectProcess,
  resolveConfig,
  loadConfigFile,
  checkPort,
  waitForPort,
  writeSavedUrl,
  normalizeDomain,
  runInteractiveWizard,
  printBanner,
  renderLiveCard,
  renderErrorBox
};
