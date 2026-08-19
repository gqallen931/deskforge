const { createStore } = require('./database.cjs');
const { createTaskRepository } = require('./task-repository.cjs');
const { createTaskService } = require('./task-service.cjs');

const store = createStore(':memory:');
const service = createTaskService(createTaskRepository(store.database));

service.seed([{ name: '默认分组', color: 'blue', tasks: [] }]);
const group = service.list()[0];
const created = service.createTask({ groupId: group.id, name: '真实任务', priority: '高' });
if (!created.id.startsWith('DF-')) throw new Error('task id was not generated');

const updated = service.updateTask(created.id, { name: '已编辑任务', groupId: group.id, priority: '中' });
if (updated.name !== '已编辑任务') throw new Error('task update failed');

const completed = service.completeTask(created.id);
if (completed.status !== 'done') throw new Error('task completion failed');

service.archiveTask(created.id);
if (service.list()[0].tasks.length !== 0) throw new Error('task archive failed');

const removable = service.createTask({ groupId: group.id, name: '待删除任务' });
service.removeTask(removable.id);
if (service.list()[0].tasks.length !== 0) throw new Error('task removal failed');

let validationPassed = false;
try {
  service.createTask({ groupId: group.id, name: '' });
} catch {
  validationPassed = true;
}
if (!validationPassed) throw new Error('task validation failed');

store.close();
console.log('Task service CRUD passed');
