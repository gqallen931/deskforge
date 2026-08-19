const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createTaskRepository } = require('./task-repository.cjs');
const { createWorkbenchService } = require('./workbench-service.cjs');
const { runMigrations, MIGRATIONS } = require('./migrations.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deskforge-migrations-'));
const dbPath = path.join(root, 'legacy.db');
const db = new DatabaseSync(dbPath);
try {
  createTaskRepository(db);
  createWorkbenchService(db);
  const first = runMigrations(db, { dbPath, snapshotDir: path.join(root, 'snapshots') });
  assert.equal(first.applied.length, MIGRATIONS.length);
  assert.equal(fs.existsSync(first.snapshot), true);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count, MIGRATIONS.length);
  assert.ok(db.prepare('PRAGMA table_info(tasks)').all().some((column) => column.name === 'project_id'));
  assert.equal(runMigrations(db, { dbPath }).applied.length, 0);
  console.log('Database migrations and pre-migration snapshot passed');
} finally { db.close(); fs.rmSync(root, { recursive: true, force: true }); }
