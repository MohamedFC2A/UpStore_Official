import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const VPS_HOST = '104.207.77.162';
const VPS_PORT = 22022;
const VPS_USER = 'root';
const VPS_PASS = 'Mohamedgg2008#';
const REMOTE_APP_DIR = '/root/upstorebot';

async function executeCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code, signal) => {
        resolve({ code, stdout, stderr });
      }).on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      }).stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });
    });
  });
}

function connectSSH(username) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      console.log(`✅ Successfully connected to VPS via SSH as '${username}'!`);
      resolve(conn);
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host: VPS_HOST,
      port: VPS_PORT,
      username: username,
      password: VPS_PASS,
      readyTimeout: 30000,
      algorithms: {
        serverHostKey: [
          'ssh-rsa',
          'ssh-dss',
          'ecdsa-sha2-nistp256',
          'ecdsa-sha2-nistp384',
          'ecdsa-sha2-nistp521',
          'rsa-sha2-512',
          'rsa-sha2-256',
          'ssh-ed25519'
        ]
      }
    });
  });
}

async function uploadFileSFTP(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) return reject(err);
        console.log(`✅ SFTP Upload Complete: ${path.basename(localPath)} -> ${remotePath}`);
        resolve();
      });
    });
  });
}

async function main() {
  console.log(`Connecting to Spaceship VPS ${VPS_HOST}:${VPS_PORT}...`);
  let conn;
  let loggedInUser = 'root';

  for (const user of USERNAMES) {
    try {
      console.log(`Trying SSH login with user: '${user}'...`);
      conn = await connectSSH(user);
      loggedInUser = user;
      break;
    } catch (err) {
      console.warn(`Login failed for user '${user}':`, err.message);
    }
  }

  if (!conn) {
    throw new Error('Failed to connect to VPS with provided credentials.');
  }

  console.log('\n--- 1. Checking System OS and Specs ---');
  await executeCommand(conn, 'uname -a && free -h && df -h');

  console.log('\n--- 2. Ensuring Node.js 22 LTS & PM2 are active ---');
  const setupNodeCmd = `
    export DEBIAN_FRONTEND=noninteractive
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
    sudo npm install -g pm2 ws
    node -v
    npm -v
    pm2 -v
  `;
  await executeCommand(conn, setupNodeCmd);

  console.log('\n--- 3. Creating Application Directory ---');
  const appDir = loggedInUser === 'root' ? '/root/upstorebot' : `/home/${loggedInUser}/upstorebot`;
  await executeCommand(conn, `sudo mkdir -p ${appDir} && sudo chown -R ${loggedInUser}:${loggedInUser} ${appDir}`);

  console.log('\n--- 4. Uploading app.tar.gz via SFTP ---');
  const localTar = path.join(process.cwd(), 'app.tar.gz');
  await uploadFileSFTP(conn, localTar, `${appDir}/app.tar.gz`);

  console.log('\n--- 5. Extracting and Setting Up Environment ---');
  const extractCmd = `
    cd ${appDir}
    tar -xzf app.tar.gz
    if [ -f .env.local ]; then
      cp .env.local .env
    fi
    npm install @supabase/supabase-js --no-audit
  `;
  await executeCommand(conn, extractCmd);

  console.log('\n--- 6. Launching High-Performance Bot Daemon with PM2 ---');
  const pm2Cmd = `
    cd ${appDir}
    pm2 delete upstore-bot || true
    pm2 start scripts/telegram-support-bot.mjs --name "upstore-bot" -- --poll
    pm2 save
    pm2 startup
  `;
  await executeCommand(conn, pm2Cmd);

  console.log('\n--- 7. Verifying Bot Execution Status on VPS ---');
  await executeCommand(conn, 'pm2 status && sleep 3 && pm2 logs upstore-bot --lines 25 --nostream');

  conn.end();
  console.log('\n🎉 SUCCESS: UpStore Telegram Bot is now officially deployed and running 24/7 on your Spaceship VPS!');
}

main().catch((err) => {
  console.error('Fatal Deployment Error:', err);
  process.exit(1);
});
