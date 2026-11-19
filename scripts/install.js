'use strict';
// 스킬을 에이전트별 사용자 스킬 폴더로 복사한다.
// 사용: node scripts/install.js [--claude] [--codex] [--antigravity] [--all]   (아무것도 안 주면 --all)
// 복사 후 대상 폴더의 scripts/ 에서 npm install 을 실행한다(playwright-core, esbuild).
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const NAME = 'bangmotion-visual-director';
const SRC = path.resolve(__dirname, '..');
const TARGETS = {
  claude: path.join(os.homedir(), '.claude', 'skills', NAME),
  codex: path.join(os.homedir(), '.codex', 'skills', NAME),
  antigravity: path.join(os.homedir(), '.gemini', 'config', 'skills', NAME),
};
const SKIP = new Set(['node_modules', '.git']);

const args = process.argv.slice(2).map((a) => a.replace(/^--/, ''));
const unknown = args.filter((a) => a !== 'all' && !(a in TARGETS));
if (unknown.length) { console.error(`알 수 없는 옵션: ${unknown.join(', ')}`); process.exit(2); }
const chosen = !args.length || args.includes('all') ? Object.keys(TARGETS) : args;

for (const key of chosen) {
  const dest = TARGETS[key];
  if (path.resolve(dest) === SRC) { console.log(`[건너뜀] ${key}: 이미 이 위치에서 실행 중`); continue; }
  fs.mkdirSync(dest, { recursive: true });
  // 기존 설치는 node_modules 만 남기고 덮어쓴다(사용자 파일이 섞이지 않는 스킬 전용 폴더).
  fs.cpSync(SRC, dest, { recursive: true, force: true, filter: (p) =>
    !SKIP.has(path.basename(p)) && p !== path.join(SRC, 'preview') && p !== path.join(SRC, 'scripts', 'preview.js') });
  // 고정 문자열이라 셸로 실행해도 안전하다(Windows 의 npm.cmd 는 셸이 필요).
  const npm = spawnSync('npm install --silent --no-fund --no-audit', { cwd: path.join(dest, 'scripts'), stdio: 'inherit', shell: true });
  console.log(`[설치] ${key} → ${dest}${npm.status === 0 ? '' : '  (npm install 실패: scripts/ 에서 직접 실행하세요)'}`);
}
