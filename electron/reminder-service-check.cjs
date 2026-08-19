const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { createTaskRepository } = require('./task-repository.cjs');
const { createWorkbenchService } = require('./workbench-service.cjs');
const { runMigrations } = require('./migrations.cjs');
const { createReminderService } = require('./reminder-service.cjs');

const db = new DatabaseSync(':memory:');
try {
  createTaskRepository(db); createWorkbenchService(db); runMigrations(db);
  const service = createReminderService(db);
  const due = service.create({ title: '立即提醒', remindAt: '2026-01-01T00:00:00.000Z' });
  const daily = service.create({ title: '每天提醒', remindAt: '2026-01-01T00:00:00.000Z', repeatRule: 'daily' });
  assert.equal(service.claimDue(new Date('2026-01-02T00:00:00.000Z')).length, 2);
  assert.equal(service.list().find((item) => item.id === due.id).status, 'notified');
  assert.equal(service.list().find((item) => item.id === daily.id).status, 'pending');
  assert.equal(service.remove(due.id), true);
  console.log('Local reminder lifecycle passed');
} finally { db.close(); }
