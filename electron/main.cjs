const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { createStore } = require('./database.cjs');
const { createTaskRepository } = require('./task-repository.cjs');
const { createTaskService } = require('./task-service.cjs');
const { createDataManager } = require('./data-manager.cjs');
const { createWorkbenchService } = require('./workbench-service.cjs');
const { runMigrations } = require('./migrations.cjs');
const { createReminderService } = require('./reminder-service.cjs');

let store;
let taskService;
let dataManager;
let workbenchService;
let reminderService;
let reminderTimer;
app.setName('Deskforge');

function createWindow() {
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
    },
  });

  win.on('page-title-updated', (event) => {
    event.preventDefault();
    win.setTitle('Deskforge');
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    win.loadURL('http://127.0.0.1:5173');
  }
}

app.whenReady().then(() => {
  const dataDir = app.getPath('userData');
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'deskforge.db');
  store = createStore(dbPath);
  taskService = createTaskService(createTaskRepository(store.database));
  workbenchService = createWorkbenchService(store.database);
  runMigrations(store.database, { dbPath, snapshotDir: path.join(dataDir, 'migration-backups') });
  dataManager = createDataManager(store.database, path.join(dataDir, 'backups'));
  reminderService = createReminderService(store.database);
  ipcMain.handle('db:load', () => store.load());
  ipcMain.handle('db:save', (_event, value) => store.save(value));
  ipcMain.handle('tasks:list', () => taskService.list());
  ipcMain.handle('tasks:seed', (_event, groups) => taskService.seed(groups));
  ipcMain.handle('tasks:create', (_event, input) => taskService.createTask(input));
  ipcMain.handle('tasks:update', (_event, id, input) => taskService.updateTask(id, input));
  ipcMain.handle('tasks:complete', (_event, id) => taskService.completeTask(id));
  ipcMain.handle('tasks:archive', (_event, id) => taskService.archiveTask(id));
  ipcMain.handle('tasks:remove', (_event, id) => taskService.removeTask(id));
  ipcMain.handle('groups:create', (_event, input) => taskService.createGroup(input));
  ipcMain.handle('settings:get', () => dataManager.readSettings());
  ipcMain.handle('settings:save', (_event, input) => dataManager.saveSettings(input));
  ipcMain.handle('data:export', async () => {
    const result = await dialog.showSaveDialog({ title: '导出 Deskforge 数据', defaultPath: `deskforge-export-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: 'Deskforge JSON', extensions: ['json'] }] });
    if (result.canceled || !result.filePath) return { canceled: true };
    dataManager.writeBackup(result.filePath);
    return { canceled: false, path: result.filePath };
  });
  ipcMain.handle('data:import', async () => {
    const result = await dialog.showOpenDialog({ title: '导入 Deskforge 数据', properties: ['openFile'], filters: [{ name: 'Deskforge JSON', extensions: ['json'] }] });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const safetyBackup = dataManager.createBackup('pre-import');
    const summary = dataManager.importData(dataManager.readBackup(result.filePaths[0]));
    return { canceled: false, safetyBackup, summary };
  });
  ipcMain.handle('data:backup', () => dataManager.createBackup('manual'));
  ipcMain.handle('data:backups:list', () => dataManager.listBackups());
  ipcMain.handle('data:backups:restore', (_event, id) => dataManager.restoreBackup(id));
  ipcMain.handle('data:backups:remove', (_event, id) => dataManager.removeBackup(id));
  ipcMain.handle('data:restore', async () => {
    const result = await dialog.showOpenDialog({ title: '恢复 Deskforge 备份', defaultPath: path.join(dataDir, 'backups'), properties: ['openFile'], filters: [{ name: 'Deskforge JSON', extensions: ['json'] }] });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const safetyBackup = dataManager.createBackup('pre-restore');
    const summary = dataManager.importData(dataManager.readBackup(result.filePaths[0]));
    return { canceled: false, safetyBackup, summary };
  });
  ipcMain.handle('workbench:dashboard', () => workbenchService.dashboard());
  ipcMain.handle('workspaces:create', (_event, input) => workbenchService.createWorkspace(input));
  ipcMain.handle('workspaces:switch', (_event, id) => workbenchService.switchWorkspace(id));
  ipcMain.handle('projects:list', () => workbenchService.listProjects());
  ipcMain.handle('projects:create', (_event, input) => workbenchService.createProject(input));
  ipcMain.handle('projects:archive', (_event, id) => workbenchService.archiveProject(id));
  ipcMain.handle('projects:update', (_event, id, input) => workbenchService.updateProject(id, input));
  ipcMain.handle('projects:remove', (_event, id) => workbenchService.deleteProject(id));
  ipcMain.handle('projects:tasks', (_event, id) => workbenchService.projectTasks(id));
  ipcMain.handle('projects:assign-task', (_event, id, code) => workbenchService.assignTask(id, code));
  ipcMain.handle('projects:unassign-task', (_event, code) => workbenchService.unassignTask(code));
  ipcMain.handle('tags:list', (_event, taskCode) => workbenchService.listTags(taskCode));
  ipcMain.handle('tags:add', (_event, taskCode, input) => workbenchService.addTag(taskCode, input));
  ipcMain.handle('files:list', () => workbenchService.listFiles());
  ipcMain.handle('files:add', async () => {
    const result = await dialog.showOpenDialog({ title: '添加到文件归档', properties: ['openFile', 'multiSelections'] });
    if (result.canceled) return { canceled: true, files: [] };
    const files = result.filePaths.map((filePath) => { const stat = fs.statSync(filePath); return { path: filePath, name: path.basename(filePath), size: stat.size }; });
    return { canceled: false, files: workbenchService.addFiles(files) };
  });
  ipcMain.handle('files:open', async (_event, filePath) => {
    const known = workbenchService.listFiles().find((file) => file.path === filePath);
    if (!known) throw new Error('文件不在归档记录中');
    const error = await shell.openPath(known.path);
    if (error) throw new Error(error);
    return true;
  });
  ipcMain.handle('files:remove', (_event, id) => workbenchService.removeFile(id));
  ipcMain.handle('notifications:list', () => workbenchService.notifications());
  ipcMain.handle('notifications:read-all', () => workbenchService.markNotificationsRead());
  ipcMain.handle('workbench:search', (_event, query) => workbenchService.search(query));
  ipcMain.handle('reminders:list', () => reminderService.list());
  ipcMain.handle('reminders:create', (_event, input) => reminderService.create(input));
  ipcMain.handle('reminders:dismiss', (_event, id) => reminderService.dismiss(id));
  ipcMain.handle('reminders:remove', (_event, id) => reminderService.remove(id));
  ipcMain.handle('app:quit', () => { app.quit(); return true; });
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
