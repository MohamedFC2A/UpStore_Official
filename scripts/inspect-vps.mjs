import { Client } from 'ssh2';

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
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject).connect({
      host: '104.207.77.162',
      port: 22022,
      username: 'root',
      password: process.env.VPS_PASS || process.env.VPS_PASSWORD || 'Mohamedgg2008#',
    });
  });

  console.log('=== 1. Checking ALL Running Processes on VPS ===');
  const psRes = await execCmd(conn, 'ps aux | grep node');
  console.log(psRes.stdout);

  console.log('=== 2. Checking PM2 processes ===');
  const pm2Res = await execCmd(conn, 'pm2 list');
  console.log(pm2Res.stdout);

  console.log('=== 3. Checking for any other bots or services ===');
  const netRes = await execCmd(conn, 'ss -tulpn');
  console.log(netRes.stdout);

  conn.end();
}

main().catch(console.error);
