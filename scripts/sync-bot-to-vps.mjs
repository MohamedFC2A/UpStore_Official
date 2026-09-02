import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const VPS_HOST = '104.207.77.162';
const VPS_PORT = 22022;
const VPS_USER = 'root';
const VPS_PASS = process.env.VPS_PASS || process.env.VPS_PASSWORD || 'Mohamedgg2008#';
const REMOTE_APP_DIR = '/root/upstorebot';

function connectSSH() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      console.log(`✅ Connected to VPS (${VPS_HOST}:${VPS_PORT})`);
      resolve(conn);
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host: VPS_HOST,
      port: VPS_PORT,
      username: VPS_USER,
      password: VPS_PASS,
      readyTimeout: 20000,
    });
  });
}

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) return reject(err);
        console.log(`✅ Uploaded: ${path.basename(localPath)} -> ${remotePath}`);
        resolve();
      });
    });
  });
}

function execCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        resolve({ code, stdout, stderr });
      }).on('data', (d) => {
        stdout += d.toString();
        process.stdout.write(d);
      }).stderr.on('data', (d) => {
        stderr += d.toString();
        process.stderr.write(d);
      });
    });
  });
}

async function main() {
  console.log('🚀 Deploying updated i18n & bot files to VPS...');
  const conn = await connectSSH();

  const files = [
    { local: path.resolve('./scripts/storeCatalog.mjs'), remote: `${REMOTE_APP_DIR}/scripts/storeCatalog.mjs` },
    { local: path.resolve('./scripts/storeWallet.mjs'), remote: `${REMOTE_APP_DIR}/scripts/storeWallet.mjs` },
    { local: path.resolve('./scripts/storeI18n.mjs'), remote: `${REMOTE_APP_DIR}/scripts/storeI18n.mjs` },
    { local: path.resolve('./scripts/liveMonitor.mjs'), remote: `${REMOTE_APP_DIR}/scripts/liveMonitor.mjs` },
    { local: path.resolve('./scripts/telegram-support-bot.mjs'), remote: `${REMOTE_APP_DIR}/scripts/telegram-support-bot.mjs` },
    { local: path.resolve('./scripts/test-i18n.mjs'), remote: `${REMOTE_APP_DIR}/scripts/test-i18n.mjs` },
    { local: path.resolve('./scripts/test-wallet.mjs'), remote: `${REMOTE_APP_DIR}/scripts/test-wallet.mjs` },
    { local: path.resolve('./scripts/test-approval-and-serials.mjs'), remote: `${REMOTE_APP_DIR}/scripts/test-approval-and-serials.mjs` },
    { local: path.resolve('./scripts/test-bot-interactive-pump.mjs'), remote: `${REMOTE_APP_DIR}/scripts/test-bot-interactive-pump.mjs` },
  ];

  for (const f of files) {
    await uploadFile(conn, f.local, f.remote);
  }

  console.log('\n🧪 Running test-approval-and-serials.mjs on VPS...');
  await execCommand(conn, `cd ${REMOTE_APP_DIR} && node scripts/test-approval-and-serials.mjs`);

  console.log('\n🧪 Running test-wallet.mjs on VPS...');
  await execCommand(conn, `cd ${REMOTE_APP_DIR} && node scripts/test-wallet.mjs`);

  console.log('\n🧪 Running test-i18n.mjs on VPS...');
  await execCommand(conn, `cd ${REMOTE_APP_DIR} && node scripts/test-i18n.mjs`);

  console.log('\n🧪 Running test-bot-interactive-pump.mjs on VPS...');
  await execCommand(conn, `cd ${REMOTE_APP_DIR} && node scripts/test-bot-interactive-pump.mjs`);

  console.log('\n🔄 Restarting PM2 process upstore-bot on VPS...');
  await execCommand(conn, `pm2 restart upstore-bot`);

  console.log('\n📋 Checking PM2 logs...');
  await execCommand(conn, `sleep 2 && pm2 logs upstore-bot --lines 30 --nostream`);

  conn.end();
  console.log('\n🎉 ALL UPDATED SCRIPTS DEPLOYED AND RUNNING SMOOTHLY ON VPS!');
}

main().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
