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
    if (!fs.existsSync(localPath)) {
      console.warn(`⚠️ Warning: Local file not found: ${localPath}`);
      return resolve();
    }
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
  console.log('════════════════════════════════════════════════════════════');
  console.log('🚀 DEPLOYING UPSTORE PROMOTER ENGINE 24/7 TO VPS (PM2)');
  console.log('════════════════════════════════════════════════════════════\n');

  const conn = await connectSSH();

  console.log('\n📦 Step 1: Installing Telethon on VPS if missing...');
  await execCommand(conn, 'pip3 install --break-system-packages telethon || pip3 install telethon');

  console.log('\n📁 Step 2: Uploading promoter code, session & databases to VPS...');
  const files = [
    { local: path.resolve('./scripts/smart_telegram_promoter.py'), remote: `${REMOTE_APP_DIR}/scripts/smart_telegram_promoter.py` },
    { local: path.resolve('./upstore_promoter_session.session'), remote: `${REMOTE_APP_DIR}/upstore_promoter_session.session` },
    { local: path.resolve('./scripts/promoter_blacklist.json'), remote: `${REMOTE_APP_DIR}/scripts/promoter_blacklist.json` },
    { local: path.resolve('./scripts/promoter_verified_100.json'), remote: `${REMOTE_APP_DIR}/scripts/promoter_verified_100.json` },
    { local: path.resolve('./scripts/promoter_vip_groups.json'), remote: `${REMOTE_APP_DIR}/scripts/promoter_vip_groups.json` },
    { local: path.resolve('./scripts/test_vip_and_blacklist.py'), remote: `${REMOTE_APP_DIR}/scripts/test_vip_and_blacklist.py` },
  ];

  for (const f of files) {
    await uploadFile(conn, f.local, f.remote);
  }

  console.log('\n🧪 Step 3: Running test verification suite on VPS...');
  await execCommand(conn, `cd ${REMOTE_APP_DIR} && python3 -u scripts/test_vip_and_blacklist.py`);

  console.log('\n🔄 Step 4: Registering and starting UpStore Promoter under PM2...');
  await execCommand(conn, `cd ${REMOTE_APP_DIR} && pm2 delete upstore-promoter || true`);
  await execCommand(conn, `cd ${REMOTE_APP_DIR} && pm2 start "python3 -u scripts/smart_telegram_promoter.py" --name "upstore-promoter" --restart-delay 3000 --max-restarts 1000`);
  await execCommand(conn, `pm2 save`);

  console.log('\n📊 Step 5: Checking PM2 Process List on VPS...');
  await execCommand(conn, `pm2 list`);

  console.log('\n📋 Step 6: Checking Live Promoter Logs from VPS...');
  await execCommand(conn, `sleep 3 && pm2 logs upstore-promoter --lines 25 --nostream`);

  conn.end();
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('🎉 PROMOTER ENGINE IS NOW OFFICIALLY LIVE 24/7 ON VPS!');
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('❌ Deployment error:', err);
  process.exit(1);
});
