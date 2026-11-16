const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const cloudflaredPath = path.resolve(__dirname, 'cloudflared.exe');
console.log('Spawning cloudflared from:', cloudflaredPath);

const p = spawn(cloudflaredPath, ['tunnel', '--url', 'http://localhost:5001'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

const logFile = path.resolve(__dirname, 'tunnel.log');
const stream = fs.createWriteStream(logFile, { flags: 'w' });

function handleData(data) {
  const text = data.toString();
  stream.write(text);
  process.stdout.write(text);
  const match = text.match(/https:\/\/[a-z0-9\-]+\.trycloudflare\.com/);
  if (match) {
    fs.writeFileSync(path.resolve(__dirname, 'LIVE_URL.txt'), match[0]);
    console.log('\n\n=============================================');
    console.log('LIVE URL FOUND:', match[0]);
    console.log('=============================================\n');
  }
}

p.stdout.on('data', handleData);
p.stderr.on('data', handleData);

p.on('exit', (code) => {
  console.log('cloudflared exited with code:', code);
});
