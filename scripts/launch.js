const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
process.chdir(root);

function runNode(file) {
  const result = spawnSync(process.execPath, [file], { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}

if (Number(process.versions.node.split('.')[0]) < 22) {
  console.error('Use Node.js 22 ou superior neste notebook.');
  process.exit(1);
}
const marker = path.join(root, 'node_modules', '.caloriq-lock');
const hash = crypto.createHash('sha256').update(fs.readFileSync('package-lock.json')).digest('hex');
const installed = fs.existsSync(marker) && fs.readFileSync(marker, 'utf8') === hash
  && fs.existsSync('node_modules/expo/package.json') && fs.existsSync('node_modules/pg/package.json');
if (!installed) {
  console.log('Preparando dependências. Esta etapa precisa de internet e pode demorar na primeira vez.');
  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/c', 'npm ci'], { cwd: root, stdio: 'inherit' })
    : spawnSync('npm', ['ci'], { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error('Falha na instalação. Confira a internet e a instalação do Node.js/npm.');
    process.exit(1);
  }
  fs.writeFileSync(marker, hash);
}
runNode('scripts/configure-local.js');
runNode('scripts/setup-local-db.js');
runNode('scripts/present.js');
