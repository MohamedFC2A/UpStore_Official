import { Client } from 'ssh2';

const cmd = process.argv.slice(2).join(' ') || 'pm2 list';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => { conn.end(); })
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({
  host: '104.207.77.162',
  port: 22022,
  username: 'root',
  password: process.env.VPS_PASS || process.env.VPS_PASSWORD || 'Mohamedgg2008#',
  readyTimeout: 10000,
});
