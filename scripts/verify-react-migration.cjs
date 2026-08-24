const endpoint = process.argv[2] || 'http://127.0.0.1:9227/json';
const { getPage, authenticate, evaluate, wait } = require('./verify-runtime-helpers.cjs');
(async () => {
  let page = await getPage(endpoint);
  await authenticate(page);
  await wait(800);
  page = await getPage(endpoint);
  const result = await evaluate(page.webSocketDebuggerUrl, `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const frame = document.querySelector('.dashboard-frame');
    const doc = frame?.contentDocument;
    const close = async () => { document.querySelector('.rx-icon-button')?.click(); await sleep(80); };
    const open = async text => {
      const button = [...doc.querySelectorAll('.wb-nav__item')].find(el => el.textContent.includes(text));
      if (!button) throw new Error('missing ' + text);
      button.click(); await sleep(140);
      const title = document.querySelector('.rx-modal h2')?.textContent;
      await close(); return title;
    };
    const modules = {
      settings: await open('设置中心'), projects: await open('项目总览'),
      tasks: await open('任务管理'), reminders: await open('日程管理'),
      files: await open('文件归档'), team: await open('团队协作'),
      analysis: await open('智能分析'),
    };
    doc.querySelector('.wb-gantt__title').click(); await sleep(120);
    modules.timeline = document.querySelector('.rx-modal h2')?.textContent; await close();
    doc.querySelector('.wb-iconbtn[title="通知"]').click(); await sleep(120);
    modules.notifications = document.querySelector('.rx-modal h2')?.textContent; await close();
    doc.querySelector('#wbWsItem').click(); await sleep(140);
    modules.workspaces = document.querySelector('.rx-modal h2')?.textContent; await close();
    const taskGroups = await window.deskforge.tasks.list();
    const searchTerm = taskGroups.flatMap(group => group.tasks)[0]?.name || '';
    const search = doc.querySelector('#wbSearchInput');
    search.value = searchTerm; search.dispatchEvent(new Event('input', { bubbles: true }));
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await sleep(600);
    modules.search = document.querySelector('.rx-modal h2')?.textContent;
    const searchResultCount = document.querySelectorAll('.rx-search-result').length;
    const directSearch = await Promise.race([window.deskforge.workbench.search(searchTerm), sleep(2000).then(() => ({ timedOut: true, tasks: [] }))]);
    const searchDebug = { term: searchTerm, input: document.querySelector('.rx-global-search input')?.value, text: document.querySelector('.rx-modal-body')?.textContent, directTaskCount: directSearch.tasks.length, directTimedOut: Boolean(directSearch.timedOut) };
    return { modules, searchResultCount, searchDebug, frameTitle: doc.title, brand: doc.querySelector('.wb-logo__name')?.textContent.trim(), mark: doc.querySelector('.wb-logo__mark')?.textContent.trim(), hasThreeColumns: getComputedStyle(doc.querySelector('.wb-app')).gridTemplateColumns.split(' ').length >= 3, hasOriginalGantt: Boolean(doc.querySelector('.wb-gantt')), hasOriginalAnimations: [...doc.styleSheets].some(sheet => { try { return [...sheet.cssRules].some(rule => rule.type === CSSRule.KEYFRAMES_RULE); } catch { return false; } }) };
  })()`);
  const expected = { settings: '设置中心', projects: '项目总览', tasks: '任务管理', reminders: '通知与提醒', files: '文件归档 / 知识库', team: '团队协作', analysis: '智能分析', timeline: '项目时间线', notifications: '通知与提醒', workspaces: '工作区管理', search: '全局搜索' };
  for (const [key, value] of Object.entries(expected)) if (result.modules[key] !== value) throw new Error(`${key} failed: ${JSON.stringify(result)}`);
  if (!result.searchResultCount) throw new Error(`search returned no results: ${JSON.stringify(result)}`);
  if (result.frameTitle !== 'Deskforge · 个人工作台' || result.brand !== 'Deskforge' || result.mark !== 'DF' || !result.hasThreeColumns || !result.hasOriginalGantt || !result.hasOriginalAnimations) throw new Error(`A-UI visual shell failed: ${JSON.stringify(result)}`);
  console.log('A-UI visual shell preserved; React modules (incl. search/team/analysis/workspaces), Gantt and animations passed');
})().catch(e => { console.error(e.stack || e.message); process.exitCode = 1; });
