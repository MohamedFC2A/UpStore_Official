import { Client } from 'ssh2';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
for (const line of env.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    envVars[key] = val;
  }
}

const token = envVars.TELEGRAM_SUPPORT_BOT_TOKEN;
console.log('Bot Token:', token ? token.slice(0, 10) + '...' : 'NONE');

function execCmd(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => resolve({ code, stdout, stderr }))
        .on('data', (d) => { stdout += d.toString(); })
        .stderr.on('data', (d) => { stderr += d.toString(); });
    });
  });
}

async function main() {
  const webhookRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const webhookData = await webhookRes.json();
  console.log('=== Telegram Webhook Info ===\n', JSON.stringify(webhookData, null, 2));

  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const meData = await meRes.json();
  console.log('=== Telegram Bot Info ===\n', JSON.stringify(meData, null, 2));

  console.log('=== Connecting to VPS via SSH ===');
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject).connect({
      host: '104.207.77.162',
      port: 22022,
      username: 'root',
      password: process.env.VPS_PASS || process.env.VPS_PASSWORD || 'Mohamedgg2008#',
    });
  });

  console.log('--- Checking PM2 Process List ---');
  const listRes = await execCmd(conn, 'pm2 list');
  console.log(listRes.stdout);

  console.log('--- Checking Running Process Details & Working Dir ---');
  const showRes = await execCmd(conn, 'pm2 show upstore-bot');
  console.log(showRes.stdout);

  console.log('--- Grepping in /root/upstorebot/scripts/telegram-support-bot.mjs ---');
  const grep1 = await execCmd(conn, 'grep -n "نظام المكافآت ورصيد المحفظة المجاني" /root/upstorebot/scripts/telegram-support-bot.mjs');
  console.log('Grep match:', grep1.stdout);

  console.log('--- PM2 Log Tail (Last 30 lines) ---');
  const logsRes = await execCmd(conn, 'tail -n 30 /root/.pm2/logs/upstore-bot-out.log');
  console.log(logsRes.stdout);

  const errsRes = await execCmd(conn, 'tail -n 30 /root/.pm2/logs/upstore-bot-error.log');
  console.log('Errors:', errsRes.stdout);

  conn.end();
}

main().catch(console.error);
