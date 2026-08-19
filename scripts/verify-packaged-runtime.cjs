const endpoint = process.argv[2] || 'http://127.0.0.1:9223/json';

async function main() {
  const targets = await fetch(endpoint).then((response) => response.json());
  let page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('packaged renderer target not found');
  await ensureAuthenticated(page);
  await new Promise((resolve) => setTimeout(resolve, 700));
  page = (await fetch(endpoint).then((response) => response.json())).find((target) => target.type === 'page');

  const result = await evaluate(page.webSocketDebuggerUrl, `(async () => {
    const root = document.querySelector('#root');
    const frame = document.querySelector('.dashboard-frame');
    const frameDocument = frame && frame.contentDocument;
    const groups = window.deskforge && window.deskforge.tasks ? await window.deskforge.tasks.list() : [];
    return {
      rootChildren: root ? root.childElementCount : 0,
      hasFrame: Boolean(frame),
      frameTitle: frameDocument ? frameDocument.title : '',
      frameText: frameDocument && frameDocument.body ? frameDocument.body.innerText.slice(0, 500) : '',
      frameTaskCount: frameDocument ? frameDocument.querySelectorAll('.wb-task').length : 0,
      backendTaskCount: groups.reduce((total, group) => total + group.tasks.length, 0)
    };
  })()`);

  if (!result.rootChildren || !result.hasFrame || !result.frameText.includes('任务管理') ||
      !result.backendTaskCount || result.frameTaskCount !== result.backendTaskCount) {
    throw new Error(`packaged renderer is blank: ${JSON.stringify(result)}`);
  }

  console.log(`Packaged runtime rendered: ${result.frameTitle}`);
}

async function ensureAuthenticated(page) {
  const changed = await evaluate(page.webSocketDebuggerUrl, `(async()=>{const s=await window.deskforge.auth.status();if(s.authenticated)return false;if(s.needsSetup)await window.deskforge.auth.register({username:'testowner',displayName:'Test Owner',password:'Deskforge123'});else await window.deskforge.auth.login({username:'testowner',password:'Deskforge123'});location.reload();return true})()`);
  return changed;
}

function evaluate(webSocketUrl, expression) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const timer = setTimeout(() => reject(new Error('CDP evaluation timed out')), 5000);

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true, awaitPromise: true },
      }));
    });

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== 1) return;
      clearTimeout(timer);
      socket.close();
      if (message.result.exceptionDetails) reject(new Error(message.result.exceptionDetails.text));
      else resolve(message.result.result.value);
    });

    socket.addEventListener('error', () => reject(new Error('CDP connection failed')));
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
