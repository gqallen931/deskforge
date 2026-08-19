const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createTaskRepository } = require('./task-repository.cjs');
const { createTaskService } = require('./task-service.cjs');
const { createDataManager } = require('./data-manager.cjs');
const { createWorkbenchService } = require('./workbench-service.cjs');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deskforge-data-'));
const db = new DatabaseSync(path.join(tempDir, 'test.db'));

try {
  const tasks = createTaskService(createTaskRepository(db));
  const workbench = createWorkbenchService(db);
  const data = createDataManager(db, path.join(tempDir, 'backups'));
  tasks.seed([{ name: '测试分组', color: 'green', tasks: [{ id: 'DF-TEST-001', name: '原始任务', description: '', priority: '中', status: 'todo', deadline: null, owner: 'tester', participant: true }] }]);
  data.saveSettings({ displayName: '测试用户', role: '开发者', workspaceName: '测试工作台', compactMode: true, reduceMotion: true });
  workbench.createProject({ name: '备份项目' });

  const exported = data.exportData();
  assert.equal(exported.format, 'deskforge-backup');
  assert.equal(exported.tasks.length, 1);
  assert.equal(exported.projects.length, 1);
  const backupPath = data.createBackup();
  assert.equal(fs.existsSync(backupPath), true);

  tasks.updateTask('DF-TEST-001', { name: '已修改任务' });
  data.importData(data.readBackup(backupPath));
  assert.equal(tasks.list()[0].tasks[0].name, '原始任务');
  assert.equal(data.readSettings().workspaceName, '测试工作台');
  assert.equal(workbench.listProjects()[0].name, '备份项目');
  assert.throws(() => data.importData({ format: 'unknown', version: 1 }), /受支持/);
  console.log('Data export/import/backup/settings passed');
} finally {
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
}
