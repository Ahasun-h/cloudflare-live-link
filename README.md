# ⚡ cloudflare-live-link

> Turn your local PC project into a **public, live, secure HTTPS website** in seconds.
> Powered by **Cloudflare Tunnels** & **Ngrok Free Tier** — supports **Custom Branded Domains**, **Zero-Configuration Instant Links**, and **Mobile QR Verification**.


> [!IMPORTANT]
> **Developer Dependency (`devDependencies`)**: This tool is designed exclusively for **local development and testing**. It enables developers to expose their local PC ports to the internet for client demos, mobile device testing, and webhook debugging. It is **not** meant for production servers and should always be installed with `--save-dev` (or `-D`).


[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Cloudflare](https://img.shields.io/badge/Tunnel-Cloudflare%20Edge-orange.svg)](https://cloudflare.com)
[![Ngrok](https://img.shields.io/badge/Tunnel-Ngrok%20Free-blue.svg)](https://ngrok.com)
[![Developer Dependency](https://img.shields.io/badge/type-devDependencies-blueviolet.svg)](#-developer-dependency-usage)


---

## 📋 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [How to Install in Other Projects](#-how-to-install-in-other-projects)
  - [Method 1: Local Path Installation (Easiest)](#method-1-local-path-installation-easiest)
  - [Method 2: Using the `.tgz` Package Tarball](#method-2-using-the-tgz-package-tarball)
  - [Method 3: Global Link via `npm link`](#method-3-global-link-via-npm-link)
  - [Method 4: Publish to NPM](#method-4-publish-to-npm)
- [How to Connect Cloudflare Tunnel](#1️⃣-how-to-connect-cloudflare-tunnel)
  - [Mode A: Instant Quick Tunnel (No Sign-Up, 5 Seconds)](#mode-a-instant-quick-tunnel-no-sign-up-needed)
  - [Mode B: Custom Domain via Cloudflare Zero Trust (100% Free Forever)](#mode-b-custom-domain-via-cloudflare-zero-trust-recommended)
- [How to Connect Ngrok Free Tier](#2️⃣-how-to-connect-ngrok-free-tier)
  - [Getting Your Authtoken & Free Static Domain](#setting-up-ngrok)
- [1-Click Interactive Wizard (`init`)](#3️⃣-1-click-interactive-wizard-init)
- [Project Configuration File (`.cflocalrc.json`)](#-project-configuration-file-cflocalrcjson)
- [Adding npm Scripts to Your Project](#-adding-npm-scripts-to-your-project)
- [CLI Options Reference](#-cli-options-reference)
- [Programmatic Node.js API](#-programmatic-nodejs-api)
- [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 🚀 Overview & Architecture

When running local development servers (`http://localhost:3000`, `http://localhost:5001`), only people on your local machine or local Wi-Fi can view them.

This package creates an **encrypted outbound tunnel** from your PC directly to the Cloudflare or Ngrok edge network. This allows clients, mobile devices, and webhook services anywhere in the world to access your project through a live HTTPS URL — **with zero router port-forwarding and zero public IP requirements**.

```
 [ Your PC / Laptop ]                       [ Cloudflare / Ngrok Edge ]                    [ Remote Visitors ]
 ┌──────────────────────┐                     ┌────────────────────────┐                     ┌─────────────────────┐
 │ Local App (Port 5001)│ ──Outbound SSL───>  │ Global Edge Network    │ <───HTTPS Visit───  │ Client, Phone, or   │
 │ + NPM Package Tunnel │    (No Port-Forward)│ SSL & DDoS Protection  │                     │ Webhook Providers   │
 └──────────────────────┘                     └────────────────────────┘                     └─────────────────────┘
```

---

## 📦 How to Install in Other Projects

You can use this package in any project on your computer without needing to publish to the public npm registry first:

### Method 1: Local Path Installation (Easiest)
In your other project directory, run `npm install` pointing to the folder containing this package:

```bash
cd "C:\path\to\my-other-project"
npm install "C:\Users\habib\OneDrive\Desktop\Leslie_Project\local-deploy-tools"
```
*(Or if they are in sibling folders: `npm install ../local-deploy-tools`)*

### Method 2: Using the `.tgz` Package Tarball
We have pre-packaged a standalone release tarball `cloudflare-live-link-1.0.0.tgz` (17.5 kB). You can install it directly:

```bash
cd "C:\path\to\my-other-project"
npm install "C:\Users\habib\OneDrive\Desktop\Leslie_Project\local-deploy-tools\cloudflare-live-link-1.0.0.tgz"
```

### Method 3: Global Link via `npm link`
To make the CLI commands (`cf-live`, `cloudflare-live-link`, `local-deploy`) available in **any terminal window** across your entire computer:

1. In this package folder, run:
   ```bash
   npm link
   ```
2. Now, from **any folder on your PC**, you can run:
   ```bash
   cf-live -p 3000
   ```

### Method 4: Publish to NPM
If you want to install it from npm anywhere (`npm install --save-dev github:Ahasun-h/cloudflare-live-link
# Or shorthand:
npm i -D github:Ahasun-h/cloudflare-live-link`):
```bash
npm login
npm publish
```

---

## 1️⃣ How to Connect Cloudflare Tunnel

### Mode A: Instant Quick Tunnel (No Sign-Up Needed)
Creates an instant, free HTTPS link (`https://*.trycloudflare.com`). Perfect for rapid client demos or mobile testing.

```bash
npx cloudflare-live-link -p 5001 -q
```

**Terminal Output:**
```text
  ╔═══════════════════════════════════════════════════════╗
  ║   ⚡ CLOUDFLARE LIVE LINK — PC Local Deployment     ║
  ║   Instant Shareable URLs for Local PC Services       ║
  ╚═══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────┐
│  STATUS:       ONLINE & SECURED                              │
│  PUBLIC URL:   https://bottom-scholarship-prostate.trycloudflare.com
│  LOCAL TARGET: http://localhost:5001                         │
│  MODE:         Cloudflare Quick Tunnel (trycloudflare.com)   │
│  SAVED TO:     LIVE_URL.txt                                  │
│                                                              │
│  Press [Ctrl + C] anytime to stop the tunnel.                │
└──────────────────────────────────────────────────────────────┘

📱 Scan with your phone for instant mobile testing:
[ Terminal QR Code ]
```

---

### Mode B: Custom Domain via Cloudflare Zero Trust (Recommended)
Route traffic to your own permanent custom domain (e.g., `app.yourdomain.com` or `demo.mycompany.com`) with enterprise SSL, edge caching, and unlimited bandwidth for free.

#### Step 1: Open Cloudflare Zero Trust
1. Log in to [Cloudflare](https://dash.cloudflare.com/) (your domain must be added to Cloudflare DNS).
2. Click **Zero Trust** on the sidebar (or visit [one.dash.cloudflare.com](https://one.dash.cloudflare.com/)).
3. Select the **Free Plan** ($0/month, includes up to 50 users).

#### Step 2: Create a Tunnel
1. In the Zero Trust dashboard sidebar, go to **Networks** ➔ **Tunnels**.
2. Click **Add a tunnel** (or **Create a tunnel**).
3. Select **Cloudflared** as the connector type and click **Next**.
4. Name your tunnel (e.g. `pc-local-deploy`) and click **Save tunnel**.

#### Step 3: Copy Your Tunnel Token
In the **Install and run a connector** step:
1. Select the **Windows** tab (or macOS/Linux).
2. In the box labeled *"If you already have cloudflared installed..."*, locate the command:
   ```text
   cloudflared.exe tunnel run --token eyJhIjoiYmFiYz...YOUR_TOKEN...
   ```
3. Copy the token string (starting with `eyJh...`).

#### Step 4: Configure the Public Hostname
1. Click **Next** to open the **Public Hostnames** tab.
2. Click **Add a public hostname**:
   - **Subdomain**: e.g., `app` or `preview` *(or leave blank for root domain)*
   - **Domain**: Choose your domain from the dropdown (e.g., `yourdomain.com`)
   - **Path**: Leave blank
   - **Type**: Select `HTTP`
   - **URL**: `localhost:5001` *(or whatever port your local project runs on)*
3. Click **Save Tunnel**.

#### Step 5: Start the Live Link
Run the tool with your domain and token:
```bash
npx cloudflare-live-link -p 5001 -d "app.yourdomain.com" -t "YOUR_COPIED_TOKEN"
```

Traffic from `https://app.yourdomain.com` will immediately route straight into your local PC!

---

## 2️⃣ How to Connect Ngrok Free Tier

If you prefer using **Ngrok** with its free static domain:

### Setting Up Ngrok
1. Create a free account at [dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup).
2. Go to **Getting Started** ➔ **Your Authtoken** and copy your token.
3. Go to **Cloud Edge** ➔ **Domains** and click **Create Domain** to get your free static domain (e.g., `your-name.ngrok-free.dev`).
4. Run the package with the `--ngrok` flag:
   ```bash
   npx cloudflare-live-link --ngrok -p 5001 -d "your-name.ngrok-free.dev" -t "YOUR_NGROK_AUTHTOKEN"
   ```

---

## 3️⃣ 1-Click Interactive Wizard (`init`)

To avoid memorizing or typing long flags every time, run the interactive setup wizard:

```bash
npx cloudflare-live-link init
```

The wizard guides you through:
1. Choosing **Cloudflare** or **Ngrok**.
2. Setting your local port (e.g., `5001`, `3000`).
3. Entering your Domain and Token.
4. Setting a command to start your local project automatically (e.g. `npm run dev`).
5. Saving everything into `.cflocalrc.json`.

After saving, you can simply run:
```bash
npx cloudflare-live-link
```
and it launches with your saved configuration automatically!

---

## ⚙ Project Configuration File (`.cflocalrc.json`)

You can place a `.cflocalrc.json` in the root of any project:

```json
{
  "provider": "cloudflare",
  "port": 5001,
  "domain": "app.yourdomain.com",
  "token": "YOUR_CLOUDFLARE_ZERO_TRUST_TOKEN",
  "command": "npm run dev",
  "qr": true,
  "urlFile": "LIVE_URL.txt"
}
```

Or for Ngrok:
```json
{
  "provider": "ngrok",
  "port": 5001,
  "domain": "your-name.ngrok-free.dev",
  "token": "YOUR_NGROK_AUTHTOKEN"
}
```

---

## 🛠 Adding npm Scripts to Your Project

Once installed in your project, add handy shortcuts to your `package.json`:

```json
{
  "scripts": {
    "dev": "node src/server.js",
    "tunnel:quick": "cloudflare-live-link -p 5001 -q",
    "tunnel:domain": "cloudflare-live-link -p 5001",
    "tunnel:ngrok": "cloudflare-live-link --ngrok -p 5001",
    "deploy:pc": "cloudflare-live-link -p 5001 -s \"npm run dev\""
  }
}
```

- `npm run tunnel:quick` ➔ Instant live URL without setup.
- `npm run deploy:pc` ➔ Launches your local backend/frontend AND creates the live shareable URL simultaneously!

---

## 📖 CLI Options Reference

| Flag | Shorthand | Description | Default |
| :--- | :--- | :--- | :--- |
| `--port <number>` | `-p` | Local port to expose | `5001` |
| `--provider <provider>` | `-P` | Tunnel provider: `"cloudflare"` or `"ngrok"` | `"cloudflare"` |
| `--ngrok` | | Shortcut flag to use Ngrok | `false` |
| `--domain <domain>` | `-d` | Custom domain (Cloudflare or Ngrok static domain) | `""` |
| `--token <token>` | `-t` | Tunnel token / Ngrok authtoken | `""` |
| `--start <command>` | `-s` | Local command to boot your app (e.g. `"npm start"`) | `""` |
| `--dir <path>` | | Working directory for the start command | `process.cwd()` |
| `--quick` | `-q` | Force instant Quick Tunnel (`*.trycloudflare.com`) | `true` if no token |
| `--interactive` | `-i` | Open the interactive configuration wizard | `false` |
| `--config <path>` | `-c` | Path to custom config JSON file | `.cflocalrc.json` |
| `--url-file <path>` | | File to save the live URL | `LIVE_URL.txt` |
| `--no-qr` | | Disable QR code in terminal | `false` |
| `--verbose` | `-v` | Output raw daemon logs | `false` |

---

## 💻 Programmatic Node.js API

You can also import and control tunnels programmatically from any Node.js code:

```javascript
const { deployProject, startTunnel } = require('cloudflare-live-link');

async function run() {
  // Option 1: Full project deployer (starts app + tunnel)
  const deploy = await deployProject({
    port: 5001,
    domain: 'preview.yourdomain.com',
    token: process.env.CLOUDFLARE_TUNNEL_TOKEN,
    command: 'npm start'
  });

  console.log('Live Shareable URL:', deploy.url);

  // Stop everything gracefully when done:
  // await deploy.stop();
}

run();
```

---

## ❓ Troubleshooting & FAQ

#### 1. "cloudflared binary not found"
The package includes an automatic binary downloader. On first run, if `cloudflared` is not found on your system, it automatically downloads the official release from Cloudflare's GitHub for your exact OS and CPU architecture.

#### 2. "Port 5001 is not listening"
Make sure your local application is actually started on that port, or pass `--start "npm start"` so the tool starts it for you and waits until it is ready.

#### 3. "Cannot connect to Cloudflare Zero Trust"
- Check that your Tunnel Token is correct (starts with `eyJh...`).
- Verify in Cloudflare Zero Trust that the **Public Hostname** is set to `HTTP` and `localhost:<your-port>`.

#### 4. How do I stop the tunnel?
Simply press **Ctrl + C** in your terminal. The package catches exit signals and cleanly shuts down the tunnel and any spawned child processes to prevent zombie processes.

---

## 📄 License

MIT © [Leslie Project / Contributors]
