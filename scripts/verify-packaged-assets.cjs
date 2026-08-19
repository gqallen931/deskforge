const fs = require('node:fs');
const path = require('node:path');

const distDir = path.join(__dirname, '..', 'dist');
const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
const dashboardHtml = fs.readFileSync(path.join(distDir, 'dashboard.html'), 'utf8');

const absoluteAssets = [...indexHtml.matchAll(/(?:src|href)="(\/[^\"]+)"/g)].map((match) => match[1]);
if (absoluteAssets.length) {
  throw new Error(`file:// incompatible absolute assets: ${absoluteAssets.join(', ')}`);
}

const assets = [...indexHtml.matchAll(/(?:src|href)="(\.\/[^\"]+)"/g)].map((match) => match[1]);
for (const asset of assets) {
  const filename = path.resolve(distDir, asset);
  if (!fs.existsSync(filename)) throw new Error(`missing packaged asset: ${asset}`);
}

if (!dashboardHtml.includes('task-dashboard.js')) throw new Error('dashboard script reference missing');
if (!fs.existsSync(path.join(distDir, 'task-dashboard.js'))) throw new Error('dashboard script missing');

console.log('Packaged file:// assets passed');
