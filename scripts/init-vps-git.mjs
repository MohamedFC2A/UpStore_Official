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

  console.log('--- Initializing git in /root/upstorebot on VPS ---');
  await execCmd(conn, 'cd /root/upstorebot && git init && git remote add origin https://github.com/MohamedFC2A/UpStore_Official.git || git remote set-url origin https://github.com/MohamedFC2A/UpStore_Official.git');
  await execCmd(conn, 'cd /root/upstorebot && git config user.email "bot@upstore.one" && git config user.name "UpStore Official Bot"');
  
  const res = await execCmd(conn, 'cd /root/upstorebot && git remote -v');
  console.log('VPS Git Remotes Now:\n', res.stdout);

  conn.end();
}

main().catch(console.error);
