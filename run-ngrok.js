const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ngrokPath = path.resolve(__dirname, 'ngrok.exe');
const domain = 'uncourtly-unsigned-kimberlee.ngrok-free.dev';

console.log('Starting permanent ngrok tunnel on domain:', domain);

const p = spawn(ngrokPath, ['http', '5001', `--domain=${domain}`, '--log=stdout'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

const logFile = path.resolve(__dirname, 'ngrok.log');
const stream = fs.createWriteStream(logFile, { flags: 'a' });

function handleData(data) {
  const text = data.toString();
  stream.write(text);
  process.stdout.write(text);
  if (text.includes('url=https://')) {
    const match = text.match(/url=(https:\/\/[^\s]+)/);
    if (match) {
      fs.writeFileSync(path.resolve(__dirname, 'PERMANENT_URL.txt'), match[1]);
      console.log('\n=============================================');
      console.log('PERMANENT LIVE URL ONLINE:', match[1]);
      console.log('=============================================\n');
    }
  }
}

p.stdout.on('data', handleData);
p.stderr.on('data', handleData);

p.on('exit', (code) => {
  console.log('ngrok exited with code:', code);
});
