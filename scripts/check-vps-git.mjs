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

  console.log('--- Checking git on VPS in /root/upstorebot ---');
  const res1 = await execCmd(conn, 'cd /root/upstorebot && git remote -v || echo "No git repo"');
  console.log('VPS Git Remotes:', res1.stdout);

  conn.end();
}

main().catch(console.error);
