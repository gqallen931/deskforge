const { DatabaseSync } = require('node:sqlite');

function createStore(filename) {
  const db = new DatabaseSync(filename);
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const read = db.prepare('SELECT value FROM app_state WHERE key = ?');
  const write = db.prepare(`
    INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  return {
    database: db,
    load() {
      const row = read.get('dashboard');
      if (!row) return null;
      try {
        return JSON.parse(row.value);
      } catch {
        return null;
      }
    },
    save(value) {
      write.run('dashboard', JSON.stringify(value));
      return true;
    },
    close() {
      db.close();
    },
  };
}

module.exports = { createStore };
