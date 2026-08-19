const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const preload = fs.readFileSync(path.join(root, 'electron', 'preload.cjs'), 'utf8');
const main = fs.readFileSync(path.join(root, 'electron', 'main.cjs'), 'utf8');
const requested = [...preload.matchAll(/ipcRenderer\.invoke\('([^']+)'/g)].map((match) => match[1]);
const registered = new Set([...main.matchAll(/(?:ipcMain\.handle|secureHandle)\('([^']+)'/g)].map((match) => match[1]));
const missing = [...new Set(requested)].filter((channel) => !registered.has(channel));
assert.deepEqual(missing, [], `Preload IPC channels without Main handler: ${missing.join(', ')}`);
assert.ok(requested.length >= 40, 'Unexpectedly small IPC surface; contract parser may be stale');
console.log(`IPC contract passed: ${new Set(requested).size} renderer channels are registered in Main`);
