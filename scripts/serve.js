'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');
const { ROOT, startServer, parseArgs, positive, main } = require('./lib');

async function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv, { values: ['port', 'root'], flags: ['open', 'clear'] });
  if (options.ids.length) throw new Error('서버 옵션만 지정하세요.');
  const port = positive(options.port, 4173, 'port', true);
  if (port > 65535) throw new Error('port는 65535 이하여야 합니다.');
  const server = await startServer(path.resolve(options.root || ROOT), { port, clear: options.clear });
  const address = `${server.url}/gallery/`;
  console.log(`[갤러리] ${address}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    server.close().catch(error => { console.error(error.message); process.exitCode = 1; });
  });
  if (options.open) {
    const command = process.platform === 'win32' ? 'cmd.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/d', '/c', 'start', '', address] : [address];
    const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', error => console.warn(`[경고] 브라우저 열기 실패: ${error.message}`));
    child.unref();
  }
  return server;
}

if (require.main === module) main(run);
module.exports = { run };
