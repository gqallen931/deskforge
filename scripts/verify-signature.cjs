const { spawnSync } = require('node:child_process');
const path = require('node:path');

const target = process.argv[2] || path.join(__dirname, '..', 'release', 'win-unpacked', 'Deskforge.exe');
const signtool = path.join(__dirname, '..', 'node_modules', '@electron', 'windows-sign', 'vendor', 'signtool.exe');
const result = spawnSync(signtool, ['verify', '/pa', '/all', '/v', target], { encoding: 'utf8', windowsHide: true });
if (result.status !== 0) throw new Error(`Authenticode signature is not valid:\n${result.stdout || result.stderr}`);
console.log('Valid Windows Authenticode signature');
