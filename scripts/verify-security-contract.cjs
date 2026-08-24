const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const main = read('electron/main.cjs');
const index = read('index.html');
const dashboard = read('public/dashboard.html');
const host = read('src/features/dashboard/LegacyDashboardHost.jsx');

const assertions = [
  [main.includes('sandbox: true'), 'Renderer sandbox must be enabled'],
  [main.includes("setWindowOpenHandler(() => ({ action: 'deny' }))"), 'New windows must be denied'],
  [main.includes("webContents.on('will-navigate'"), 'Main window navigation must be guarded'],
  [main.includes('setPermissionRequestHandler'), 'Renderer permissions must be denied by default'],
  [main.includes("require('node:url')"), 'Packaged entry must use an explicit file URL'],
  [index.includes('Content-Security-Policy'), 'React entry CSP is missing'],
  [dashboard.includes('Content-Security-Policy'), 'Dashboard CSP is missing'],
  [index.includes("object-src 'none'"), 'React entry CSP must deny plugins'],
  [dashboard.includes("connect-src 'none'"), 'Dashboard CSP must deny network connections'],
  [dashboard.includes("script-src 'self' 'sha256-"), 'Dashboard inline bootstrap must be hash-pinned'],
  [host.includes('event.source === frameRef.current?.contentWindow'), 'Legacy bridge must validate iframe message source'],
  [host.includes('event.source === window'), 'Self-posted workspace events must validate their source'],
];

const failed = assertions.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) throw new Error(`Security contract failed:\n- ${failed.join('\n- ')}`);
console.log(`Security contract passed: ${assertions.length} renderer and navigation boundaries verified`);
