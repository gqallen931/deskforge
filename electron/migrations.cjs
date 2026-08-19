const fs = require('node:fs');
const path = require('node:path');

const MIGRATIONS = [
  { version: 1, name: 'baseline', up() {} },
  { version: 2, name: 'project-task-link', up(db) {
    const columns = db.prepare('PRAGMA table_info(tasks)').all();
    if (!columns.some((column) => column.name === 'project_id')) db.exec('ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)');
  } },
  { version: 3, name: 'local-reminders', up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, task_code TEXT REFERENCES tasks(code) ON DELETE SET NULL,
      title TEXT NOT NULL, remind_at TEXT NOT NULL, repeat_rule TEXT NOT NULL DEFAULT 'none',
      status TEXT NOT NULL DEFAULT 'pending', notified_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ); CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(status, remind_at);`);
  } },
  { version: 4, name: 'backup-history', up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS backup_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, file_path TEXT NOT NULL UNIQUE, filename TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0, format_version INTEGER NOT NULL, kind TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  } },
  { version: 5, name: 'local-users', up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner', failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT, last_login_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  } },
];

function runMigrations(db, options = {}) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  const applied = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((row) => row.version));
  const pending = MIGRATIONS.filter((migration) => !applied.has(migration.version));
  let snapshot = null;
  if (pending.length && options.dbPath && options.dbPath !== ':memory:') {
    const snapshotDir = options.snapshotDir || path.join(path.dirname(options.dbPath), 'migration-backups');
    fs.mkdirSync(snapshotDir, { recursive: true });
    snapshot = path.join(snapshotDir, `deskforge-pre-migration-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.db`);
    db.exec(`VACUUM INTO '${snapshot.replaceAll("'", "''")}'`);
  }
  const record = db.prepare('INSERT INTO schema_migrations(version,name) VALUES (?,?)');
  for (const migration of pending) {
    db.exec('BEGIN IMMEDIATE');
    try { migration.up(db); record.run(migration.version, migration.name); db.exec('COMMIT'); }
    catch (error) { try { db.exec('ROLLBACK'); } catch {} throw new Error(`数据库迁移 ${migration.version} (${migration.name}) 失败: ${error.message}`); }
  }
  return { applied: pending.map(({ version, name }) => ({ version, name })), snapshot };
}

module.exports = { MIGRATIONS, runMigrations };
