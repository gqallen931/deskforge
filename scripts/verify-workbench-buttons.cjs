const endpoint = process.argv[2] || 'http://127.0.0.1:9227/json';

async function main() {
  const targets = await fetch(endpoint).then((response) => response.json());
  let page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('packaged renderer target not found');
  await ensureAuthenticated(page);
  await new Promise((resolve) => setTimeout(resolve, 700));
  page = (await fetch(endpoint).then((response) => response.json())).find((target) => target.type === 'page');
  const result = await evaluate(page.webSocketDebuggerUrl, `(async () => {
    const doc = document.querySelector('.dashboard-frame').contentDocument;
    const wait = () => new Promise((resolve) => setTimeout(resolve, 120));
    Array.from(doc.querySelectorAll('.wbi-modal__close')).reverse().forEach((button) => button.click()); await wait();
    const tested = {};
    for (const label of ['项目总览','文件归档','日程管理','团队协作','智能分析','知识库','设置中心']) {
      const button = Array.from(doc.querySelectorAll('.wb-nav__item')).find((item) => item.textContent.includes(label));
      button.click(); await wait();
      const modal = Array.from(doc.querySelectorAll('.wbi-modal')).at(-1);
      tested[label] = Boolean(modal && modal.textContent.includes(label === '知识库' ? '文件归档' : label === '设置中心' ? 'Deskforge 设置' : label));
      const close = Array.from(doc.querySelectorAll('.wbi-modal__close')).at(-1); if (close) close.click(); await wait();
    }
    doc.querySelector('#wbWsItem').click(); await wait();
    const workspaceMenu = Boolean(doc.querySelector('.wbi-drop'));
    doc.body.click();
    const search = doc.querySelector('#wbSearchInput'); search.value = '任务'; search.dispatchEvent(new Event('input', { bubbles:true })); search.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true })); await wait();
    const searchModalNode = Array.from(doc.querySelectorAll('.wbi-modal')).at(-1);
    const searchModal = Boolean(searchModalNode && searchModalNode.textContent.includes('搜索结果'));
    return { tested, workspaceMenu, searchModal, dashboard: await window.deskforge.workbench.dashboard() };
  })()`);
  if (Object.values(result.tested).some((passed) => !passed) || !result.workspaceMenu || !result.searchModal || !result.dashboard.workspace) throw new Error(`workbench button verification failed: ${JSON.stringify(result)}`);
  console.log('Workbench navigation/search buttons passed');
}

async function ensureAuthenticated(page) {
  return evaluate(page.webSocketDebuggerUrl, `(async()=>{const s=await window.deskforge.auth.status();if(s.authenticated)return false;if(s.needsSetup)await window.deskforge.auth.register({username:'testowner',displayName:'Test Owner',password:'Deskforge123'});else await window.deskforge.auth.login({username:'testowner',password:'Deskforge123'});location.reload();return true})()`);
}

function evaluate(webSocketUrl, expression) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl); const timer = setTimeout(() => reject(new Error('CDP evaluation timed out')), 20000);
    socket.addEventListener('open', () => socket.send(JSON.stringify({ id:1, method:'Runtime.evaluate', params:{ expression, returnByValue:true, awaitPromise:true } })));
    socket.addEventListener('message', (event) => { const message=JSON.parse(event.data); if(message.id!==1)return; clearTimeout(timer); socket.close(); if(message.result.exceptionDetails)reject(new Error(message.result.exceptionDetails.text)); else resolve(message.result.result.value); });
    socket.addEventListener('error', () => reject(new Error('CDP connection failed')));
  });
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
