const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { createStore } = require('./database.cjs');
const { createTaskRepository } = require('./task-repository.cjs');
const { createTaskService } = require('./task-service.cjs');
const { createDataManager } = require('./data-manager.cjs');
const { createWorkbenchService } = require('./workbench-service.cjs');
const { runMigrations } = require('./migrations.cjs');
const { createReminderService } = require('./reminder-service.cjs');
const { createAuthService } = require('./auth-service.cjs');
const { createUpdateService } = require('./update-service.cjs');

let store;
let taskService;
let dataManager;
let workbenchService;
let reminderService;
let authService;
let updateService;
let reminderTimer;
app.setName('Deskforge');

function createWindow() {
  const entryUrl = app.isPackaged
    ? pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).toString()
    : 'http://127.0.0.1:5173/';
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 680,
    backgroundColor: '#0a0b0d',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const navigationKey = (value) => {
    const parsed = new URL(value);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString();
  };
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, targetUrl) => {
    if (navigationKey(targetUrl) !== navigationKey(entryUrl)) event.preventDefault();
  });
  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));

  win.on('page-title-updated', (event) => {
    event.preventDefault();
    win.setTitle('Deskforge');
  });
  win.webContents.on('destroyed', () => { if (authService) authService.clear(win.webContents.id); });

  win.loadURL(entryUrl);
}

app.whenReady().then(() => {
  const dataDir = app.getPath('userData');
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'deskforge.db');
  store = createStore(dbPath);
  taskService = createTaskService(createTaskRepository(store.database));
  workbenchService = createWorkbenchService(store.database);
  runMigrations(store.database, { dbPath, snapshotDir: path.join(dataDir, 'migration-backups') });
  authService = createAuthService(store.database);
  dataManager = createDataManager(store.database, path.join(dataDir, 'backups'));
  reminderService = createReminderService(store.database);
  let updateConfig = { enabled: false, url: '' };
  if (app.isPackaged) { try { updateConfig = JSON.parse(fs.readFileSync(path.join(process.resourcesPath, 'update-config.json'), 'utf8')); } catch {} }
  updateService = createUpdateService({ app, config: updateConfig, emit: (state) => BrowserWindow.getAllWindows().forEach((win) => win.webContents.send('updates:state', state)) });
  ipcMain.handle('auth:status', (event) => authService.status(event.sender.id));
  ipcMain.handle('auth:register', (event, input) => authService.register(event.sender.id, input));
  ipcMain.handle('auth:login', (event, input) => authService.login(event.sender.id, input));
  ipcMain.handle('auth:logout', (event) => authService.logout(event.sender.id));
  const secureHandle = (channel, handler) => ipcMain.handle(channel, (event, ...args) => { authService.requireSession(event.sender.id); return handler(event, ...args); });
  secureHandle('auth:change-password', (event, input) => authService.changePassword(event.sender.id, input));
  secureHandle('db:load', () => store.load());
  secureHandle('db:save', (_event, value) => store.save(value));
  secureHandle('tasks:list', () => taskService.list());
  secureHandle('tasks:seed', (_event, groups) => taskService.seed(groups));
  secureHandle('tasks:create', (_event, input) => taskService.createTask(input));
  secureHandle('tasks:update', (_event, id, input) => taskService.updateTask(id, input));
  secureHandle('tasks:complete', (_event, id) => taskService.completeTask(id));
  secureHandle('tasks:archive', (_event, id) => taskService.archiveTask(id));
  secureHandle('tasks:remove', (_event, id) => taskService.removeTask(id));
  secureHandle('groups:create', (_event, input) => taskService.createGroup(input));
  secureHandle('settings:get', () => dataManager.readSettings());
  secureHandle('settings:save', (_event, input) => dataManager.saveSettings(input));
  secureHandle('data:export', async () => {
    const result = await dialog.showSaveDialog({ title: '导出 Deskforge 数据', defaultPath: `deskforge-export-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: 'Deskforge JSON', extensions: ['json'] }] });
    if (result.canceled || !result.filePath) return { canceled: true };
    dataManager.writeBackup(result.filePath);
    return { canceled: false, path: result.filePath };
  });
  secureHandle('data:import', async () => {
    const result = await dialog.showOpenDialog({ title: '导入 Deskforge 数据', properties: ['openFile'], filters: [{ name: 'Deskforge JSON', extensions: ['json'] }] });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const safetyBackup = dataManager.createBackup('pre-import');
    const summary = dataManager.importData(dataManager.readBackup(result.filePaths[0]));
    return { canceled: false, safetyBackup, summary };
  });
  secureHandle('data:backup', () => dataManager.createBackup('manual'));
  secureHandle('data:backups:list', () => dataManager.listBackups());
  secureHandle('data:backups:restore', (_event, id) => dataManager.restoreBackup(id));
  secureHandle('data:backups:remove', (_event, id) => dataManager.removeBackup(id));
  secureHandle('data:backups:prune', () => dataManager.pruneBackups());
  secureHandle('data:restore', async () => {
    const result = await dialog.showOpenDialog({ title: '恢复 Deskforge 备份', defaultPath: path.join(dataDir, 'backups'), properties: ['openFile'], filters: [{ name: 'Deskforge JSON', extensions: ['json'] }] });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const safetyBackup = dataManager.createBackup('pre-restore');
    const summary = dataManager.importData(dataManager.readBackup(result.filePaths[0]));
    return { canceled: false, safetyBackup, summary };
  });
  secureHandle('workbench:dashboard', () => workbenchService.dashboard());
  secureHandle('workspaces:list', () => workbenchService.listWorkspaces());
  secureHandle('workspaces:stats', () => workbenchService.workspaceStats());
  secureHandle('workspaces:create', (_event, input) => workbenchService.createWorkspace(input));
  secureHandle('workspaces:switch', (_event, id) => workbenchService.switchWorkspace(id));
  secureHandle('projects:list', () => workbenchService.listProjects());
  secureHandle('projects:create', (_event, input) => workbenchService.createProject(input));
  secureHandle('projects:archive', (_event, id) => workbenchService.archiveProject(id));
  secureHandle('projects:update', (_event, id, input) => workbenchService.updateProject(id, input));
  secureHandle('projects:remove', (_event, id) => workbenchService.deleteProject(id));
  secureHandle('projects:tasks', (_event, id) => workbenchService.projectTasks(id));
  secureHandle('projects:assign-task', (_event, id, code) => workbenchService.assignTask(id, code));
  secureHandle('projects:unassign-task', (_event, code) => workbenchService.unassignTask(code));
  secureHandle('tags:list', (_event, taskCode) => workbenchService.listTags(taskCode));
  secureHandle('tags:add', (_event, taskCode, input) => workbenchService.addTag(taskCode, input));
  secureHandle('files:list', () => workbenchService.listFiles());
  secureHandle('files:add', async () => {
    const result = await dialog.showOpenDialog({ title: '添加到文件归档', properties: ['openFile', 'multiSelections'] });
    if (result.canceled) return { canceled: true, files: [] };
    const files = result.filePaths.map((filePath) => { const stat = fs.statSync(filePath); return { path: filePath, name: path.basename(filePath), size: stat.size }; });
    return { canceled: false, files: workbenchService.addFiles(files) };
  });
  secureHandle('files:open', async (_event, filePath) => {
    const known = workbenchService.listFiles().find((file) => file.path === filePath);
    if (!known) throw new Error('文件不在归档记录中');
    const error = await shell.openPath(known.path);
    if (error) throw new Error(error);
    return true;
  });
  secureHandle('files:remove', (_event, id) => workbenchService.removeFile(id));
  secureHandle('notifications:list', () => workbenchService.notifications());
  secureHandle('notifications:read-all', () => workbenchService.markNotificationsRead());
  secureHandle('workbench:search', (_event, query) => workbenchService.search(query));
  secureHandle('reminders:list', () => reminderService.list());
  secureHandle('reminders:create', (_event, input) => reminderService.create(input));
  secureHandle('reminders:dismiss', (_event, id) => reminderService.dismiss(id));
  secureHandle('reminders:remove', (_event, id) => reminderService.remove(id));
  secureHandle('updates:status', () => updateService.status());
  secureHandle('updates:check', () => updateService.check());
  secureHandle('updates:download', () => updateService.download());
  secureHandle('updates:install', () => updateService.install());
  secureHandle('legal:open', (_event, type) => {
    const files = { privacy: 'privacy.html', terms: 'terms.html' };
    if (!files[type]) throw new Error('未知法律文档');
    const legalPath = path.join(__dirname, '..', app.isPackaged ? 'dist' : 'public', 'legal', files[type]);
    const legalUrl = pathToFileURL(legalPath).toString();
    const legalWindow = new BrowserWindow({ width: 860, height: 760, minWidth: 640, minHeight: 500, parent: BrowserWindow.getFocusedWindow() || undefined, backgroundColor: '#0d0f12', webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
    legalWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    legalWindow.webContents.on('will-navigate', (event, targetUrl) => { if (targetUrl !== legalUrl) event.preventDefault(); });
    return legalWindow.loadURL(legalUrl).then(() => true);
  });
  secureHandle('app:quit', () => { app.quit(); return true; });
  createWindow();
  const notifyDue = () => reminderService.claimDue().forEach((reminder) => {
    if (Notification.isSupported()) new Notification({ title: reminder.title, body: reminder.taskCode ? `任务 ${reminder.taskCode}` : 'Deskforge 本地提醒' }).show();
  });
  reminderTimer = setInterval(notifyDue, 60000);
  setTimeout(notifyDue, 2000);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (reminderTimer) clearInterval(reminderTimer);
  if (store) store.close();
});
