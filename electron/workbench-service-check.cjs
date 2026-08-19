const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { createTaskRepository } = require('./task-repository.cjs');
const { createTaskService } = require('./task-service.cjs');
const { createWorkbenchService } = require('./workbench-service.cjs');

const db = new DatabaseSync(':memory:');
try {
  const tasks = createTaskService(createTaskRepository(db));
  tasks.seed([{ name: '默认', color: 'blue', tasks: [{ id: 'DF-WB-001', name: '搜索测试任务', description: '', priority: '高', status: 'doing', deadline: '2020-01-01', owner: 'tester', participant: true }] }]);
  const service = createWorkbenchService(db);
  assert.equal(service.dashboard().workspaces.length, 1);
  const workspace = service.createWorkspace({ name: '第二工作区' });
  service.switchWorkspace(workspace.id);
  assert.equal(service.dashboard().workspace.name, '第二工作区');
  const project = service.createProject({ name: '商业版本', description: '测试项目' });
  assert.equal(service.listProjects()[0].id, project.id);
  assert.equal(service.addTag('DF-WB-001', { name: '核心' }).name, '核心');
  service.addFiles([{ name: 'plan.txt', path: 'D:\\fixtures\\plan.txt', size: 12 }]);
  assert.equal(service.listFiles().length, 1);
  assert.equal(service.search('测试').tasks.length, 1);
  assert.equal(service.notifications()[0].title, '任务已逾期');
  service.markNotificationsRead();
  assert.equal(service.notifications()[0].isRead, true);
  assert.equal(service.archiveProject(project.id), true);
  console.log('Workbench service passed');
} finally { db.close(); }
