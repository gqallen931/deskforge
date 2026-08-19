const endpoint = process.argv[2] || 'http://127.0.0.1:9225/json';

async function main() {
  const targets = await fetch(endpoint).then((response) => response.json());
  let page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('packaged renderer target not found');
  await ensureAuthenticated(page);
  await new Promise((resolve) => setTimeout(resolve, 700));
  page = (await fetch(endpoint).then((response) => response.json())).find((target) => target.type === 'page');
  const result = await evaluate(page.webSocketDebuggerUrl, `(async () => {
    const frame = document.querySelector('.dashboard-frame');
    const doc = frame && frame.contentDocument;
    Array.from(doc.querySelectorAll('.wbi-modal__close')).reverse().forEach((button) => button.click());
    await new Promise((resolve) => setTimeout(resolve, 220));
    const original = await window.deskforge.settings.get();
    const temporary = await window.deskforge.settings.save({ ...original, workspaceName: 'Deskforge 验证工作区', compactMode: !original.compactMode });
    const persisted = await window.deskforge.settings.get();
    await window.deskforge.settings.save(original);
    const backup = await window.deskforge.data.backup();
    const settingsButton = Array.from(doc.querySelectorAll('.wb-nav__item')).find((item) => item.textContent.includes('设置中心'));
    settingsButton.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      title: doc.title,
      logoMark: doc.querySelector('.wb-logo__mark').textContent.trim(),
      logo: doc.querySelector('.wb-logo__name').textContent.trim(),
      settingPersisted: persisted.workspaceName === temporary.workspaceName,
      settingsModal: Boolean(Array.from(doc.querySelectorAll('.wbi-modal')).at(-1)) && Array.from(doc.querySelectorAll('.wbi-modal')).at(-1).textContent.includes('Deskforge 设置'),
      backupCreated: Boolean(backup.path && backup.path.endsWith('.json')),
    };
  })()`);
  if (result.title !== 'Deskforge · 个人工作台' || result.logoMark !== 'DF' || result.logo !== 'Deskforge' || !result.settingPersisted || !result.settingsModal || !result.backupCreated) {
    throw new Error(`productization verification failed: ${JSON.stringify(result)}`);
  }
  console.log('Deskforge branding/settings/backup passed');
}

async function ensureAuthenticated(page) {
  return evaluate(page.webSocketDebuggerUrl, `(async()=>{const s=await window.deskforge.auth.status();if(s.authenticated)return false;if(s.needsSetup)await window.deskforge.auth.register({username:'testowner',displayName:'Test Owner',password:'Deskforge123'});else await window.deskforge.auth.login({username:'testowner',password:'Deskforge123'});location.reload();return true})()`);
}

function evaluate(webSocketUrl, expression) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const timer = setTimeout(() => reject(new Error('CDP evaluation timed out')), 5000);
    socket.addEventListener('open', () => socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } })));
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== 1) return;
      clearTimeout(timer); socket.close();
      if (message.result.exceptionDetails) reject(new Error(message.result.exceptionDetails.text));
      else resolve(message.result.result.value);
    });
    socket.addEventListener('error', () => reject(new Error('CDP connection failed')));
  });
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
