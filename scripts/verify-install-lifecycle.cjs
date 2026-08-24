const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const oldInstaller = path.join(root, 'release', 'Deskforge-Setup-0.6.0.exe');
const newInstaller = path.join(root, 'release', 'Deskforge-Setup-0.7.0.exe');
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'deskforge-lifecycle-'));
const installDir = path.join(sandbox, 'Deskforge');
const appData = path.join(sandbox, 'AppData', 'Roaming');
const localAppData = path.join(sandbox, 'AppData', 'Local');
const userDataDir = path.join(sandbox, 'UserData');
const env = { ...process.env, APPDATA: appData, LOCALAPPDATA: localAppData };
let appProcess;

function install(installer) {
  const result = spawnSync(installer, ['/S', `/D=${installDir}`], { env, windowsHide: true, timeout: 120000 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `installer exited with ${result.status}`);
  assert.ok(fs.existsSync(path.join(installDir, 'Deskforge.exe')), 'installed executable missing');
}

async function start(port) {
  appProcess = spawn(path.join(installDir, 'Deskforge.exe'), [`--remote-debugging-port=${port}`, `--user-data-dir=${userDataDir}`], { env, windowsHide: true, stdio: 'ignore' });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json()); if (targets.length) return targets.find((target) => target.type === 'page'); } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('installed application did not expose a renderer target');
}

function stop() {
  if (appProcess && !appProcess.killed) appProcess.kill();
  appProcess = null;
}

async function evaluateOnce(page, expression) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    const timer = setTimeout(() => { socket.close(); reject(new Error('CDP evaluation timed out after 30 seconds')); }, 30000);
    socket.addEventListener('open', () => socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } })));
    socket.addEventListener('message', (event) => { const message = JSON.parse(event.data); if (message.id !== 1) return; clearTimeout(timer); socket.close(); if (message.error) reject(new Error(message.error.message)); else if (message.result && message.result.exceptionDetails) reject(new Error(message.result.exceptionDetails.text)); else resolve(message.result && message.result.result ? message.result.result.value : undefined); });
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP connection failed')); });
  });
}

async function evaluate(page, expression) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await evaluateOnce(page, expression); }
    catch (error) {
      lastError = error;
      if (!/CDP connection failed/.test(error.message) || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw lastError;
}

async function main() {
  assert.ok(fs.existsSync(oldInstaller), '0.6.0 installer is required for upgrade verification');
  assert.ok(fs.existsSync(newInstaller), '0.7.0 installer is required for upgrade verification');
  install(oldInstaller);
  let page = await start(9230);
  await evaluate(page, `(async()=>{const s=await window.deskforge.auth.status();if(s.needsSetup)await window.deskforge.auth.register({username:'upgradeowner',displayName:'Upgrade Owner',password:'Deskforge123'});else if(!s.authenticated)await window.deskforge.auth.login({username:'upgradeowner',password:'Deskforge123'});const groups=await window.deskforge.tasks.list();if(!groups.length)await window.deskforge.tasks.seed([{name:'升级验证',color:'green',tasks:[{id:'DF-UPGRADE-001',name:'升级后必须保留',description:'',priority:'高',status:'todo',deadline:null,owner:'owner',participant:true}]}]);return true})()`);
  await evaluate(page, `window.deskforge.app.quit()`).catch(() => true);
  await new Promise((resolve) => setTimeout(resolve, 1200)); stop();
  const dbPath = path.join(userDataDir, 'deskforge.db');
  assert.ok(fs.existsSync(dbPath), `0.6.0 user database missing at ${dbPath}`);

  install(newInstaller);
  page = await start(9231);
  await evaluate(page, `(async()=>{const s=await window.deskforge.auth.status();if(s.needsSetup)await window.deskforge.auth.register({username:'upgradeowner',displayName:'Upgrade Owner',password:'Deskforge123'});else if(!s.authenticated)await window.deskforge.auth.login({username:'upgradeowner',password:'Deskforge123'});location.reload();return true})()`).catch((error) => { if (!/context was destroyed/i.test(error.message)) throw error; });
  await new Promise((resolve) => setTimeout(resolve, 800));
  page = (await fetch('http://127.0.0.1:9231/json').then((response) => response.json())).find((target) => target.type === 'page');
  const preserved = await evaluate(page, `(async()=>{const groups=await window.deskforge.tasks.list();return groups.some(g=>g.tasks.some(t=>t.id==='DF-UPGRADE-001'))})()`);
  assert.equal(preserved, true, 'task data was not preserved after upgrade');
  await evaluate(page, `window.deskforge.app.quit()`).catch(() => true);
  await new Promise((resolve) => setTimeout(resolve, 1200)); stop();

  assert.ok(fs.existsSync(dbPath), 'user database missing before uninstall');
  const uninstaller = path.join(installDir, 'Uninstall Deskforge.exe');
  assert.ok(fs.existsSync(uninstaller), 'uninstaller missing');
  const uninstall = spawnSync(uninstaller, ['/S'], { env, windowsHide: true, timeout: 120000 });
  if (uninstall.error) throw uninstall.error;
  assert.equal(uninstall.status, 0, `uninstaller exited with ${uninstall.status}`);
  assert.ok(fs.existsSync(dbPath), 'uninstall removed user database');
  console.log('Install, 0.6.0 to 0.7.0 upgrade, uninstall and user-data retention passed');
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; }).finally(() => { stop(); });
