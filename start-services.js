const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function waitForPort(port, maxTries = 30) {
  for (let i = 0; i < maxTries; i++) {
    const isUp = await checkPort(port);
    if (isUp) return true;
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

const projectRoot = path.resolve(__dirname, '..');

async function start() {
  console.log('--- [1/3] Checking / Starting PostgreSQL (port 5432) ---');
  let pgUp = await checkPort(5432);
  if (!pgUp) {
    const pg = spawn('node', ['scripts/start-postgres.js'], {
      cwd: path.resolve(projectRoot, 'api-main'),
      stdio: 'inherit'
    });
    pgUp = await waitForPort(5432);
    if (!pgUp) {
      console.error('Failed to start PostgreSQL');
      process.exit(1);
    }
  }
  console.log('PostgreSQL is UP and ready!');

  console.log('--- [2/3] Checking / Starting Node.js Server (port 5001) ---');
  let appUp = await checkPort(5001);
  if (!appUp) {
    const app = spawn('node', ['src/server.js'], {
      cwd: path.resolve(projectRoot, 'api-main'),
      stdio: 'inherit'
    });
    appUp = await waitForPort(5001);
    if (!appUp) {
      console.error('Failed to start App Server');
      process.exit(1);
    }
  }
  console.log('App Server is UP on port 5001!');

  console.log('--- [3/3] Checking / Starting Ngrok Tunnel ---');
  let ngrokUp = await checkPort(4040);
  if (!ngrokUp) {
    spawn('node', ['run-ngrok.js'], {
      cwd: __dirname,
      stdio: 'inherit'
    });
    await waitForPort(4040);
  }
  console.log('\n======================================================');
  console.log('PERMANENT LIVE URL IS ACTIVE:');
  console.log('https://uncourtly-unsigned-kimberlee.ngrok-free.dev');
  console.log('======================================================\n');
}

start();
