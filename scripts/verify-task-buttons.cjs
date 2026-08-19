const endpoint = process.argv[2] || 'http://127.0.0.1:9224/json';

async function main() {
  const targets = await fetch(endpoint).then((response) => response.json());
  let page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('packaged renderer target not found');
  await ensureAuthenticated(page);
  await new Promise((resolve) => setTimeout(resolve, 700));
  page = (await fetch(endpoint).then((response) => response.json())).find((target) => target.type === 'page');

  const result = await evaluate(page.webSocketDebuggerUrl, `(async () => {
    const api = window.deskforge.tasks;
    const frame = document.querySelector('.dashboard-frame');
    const doc = frame.contentDocument;
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const findButton = (selector, text) => [...doc.querySelectorAll(selector)].find((button) => button.textContent.includes(text));
    let createdId = null;

    try {
      doc.querySelector('.wb-btn-new').click();
      await wait(100);
      doc.querySelector('#wbiNtName').value = '自动化验证任务';
      findButton('.wbi-modal__foot button', '创建任务').click();
      await wait(350);

      let row = [...doc.querySelectorAll('.wb-task')].find((task) => task.querySelector('.wb-task__name').textContent === '自动化验证任务');
      if (!row) throw new Error('create button did not add task');
      createdId = row.dataset.task;
      let task = (await api.list()).flatMap((group) => group.tasks).find((item) => item.id === createdId);
      if (!task) throw new Error('created task was not persisted');

      row.click();
      doc.querySelector('.wb-detail__footer .wb-btn--ghost').click();
      await wait(100);
      doc.querySelector('#wbiEtName').value = '自动化验证任务-已编辑';
      findButton('.wbi-modal__foot button', '保存修改').click();
      await wait(350);
      task = (await api.list()).flatMap((group) => group.tasks).find((item) => item.id === createdId);
      if (!task || task.name !== '自动化验证任务-已编辑') throw new Error('edit button did not persist task');

      doc.querySelector('.wb-btn--done').click();
      await wait(100);
      findButton('.wbi-modal__foot button', '确认完成').click();
      await wait(350);
      task = (await api.list()).flatMap((group) => group.tasks).find((item) => item.id === createdId);
      if (!task || task.status !== 'done') throw new Error('complete button did not persist task');

      row = doc.querySelector('.wb-task[data-task="' + createdId + '"]');
      row.click();
      doc.querySelector('.wb-btn--more').click();
      await wait(100);
      findButton('.wbi-drop__item', '删除任务').click();
      await wait(100);
      findButton('.wbi-modal__foot button', '确认删除').click();
      await wait(350);
      task = (await api.list()).flatMap((group) => group.tasks).find((item) => item.id === createdId);
      if (task || doc.querySelector('.wb-task[data-task="' + createdId + '"]')) throw new Error('delete button did not remove task');

      createdId = null;
      return { created: true, edited: true, completed: true, removed: true };
    } finally {
      if (createdId) {
        const exists = (await api.list()).flatMap((group) => group.tasks).some((item) => item.id === createdId);
        if (exists) await api.remove(createdId);
      }
    }
  })()`);

  if (!result.created || !result.edited || !result.completed || !result.removed) {
    throw new Error(`task button verification failed: ${JSON.stringify(result)}`);
  }
  console.log('Task buttons CRUD passed');
}

async function ensureAuthenticated(page) {
  return evaluate(page.webSocketDebuggerUrl, `(async()=>{const s=await window.deskforge.auth.status();if(s.authenticated)return false;if(s.needsSetup)await window.deskforge.auth.register({username:'testowner',displayName:'Test Owner',password:'Deskforge123'});else await window.deskforge.auth.login({username:'testowner',password:'Deskforge123'});location.reload();return true})()`);
}

function evaluate(webSocketUrl, expression) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const timer = setTimeout(() => reject(new Error('CDP task verification timed out')), 15000);

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
      if (message.result.exceptionDetails) {
        const description = message.result.exceptionDetails.exception && message.result.exceptionDetails.exception.description;
        reject(new Error(description || message.result.exceptionDetails.text));
      } else {
        resolve(message.result.result.value);
      }
    });

    socket.addEventListener('error', () => reject(new Error('CDP connection failed')));
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
