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

async function purgeStaleWebhooks() {
  console.log('Flushing Telegram API webhooks & stale queued updates...');
  const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`);
  const data = await res.json();
  console.log('Result:', JSON.stringify(data, null, 2));

  const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const infoData = await infoRes.json();
  console.log('Webhook Status Now:', JSON.stringify(infoData, null, 2));
}

purgeStaleWebhooks();
