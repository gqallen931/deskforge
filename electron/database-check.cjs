const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStore } = require('./database.cjs');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deskforge-db-'));
const filename = path.join(dir, 'test.db');

try {
  const store = createStore(filename);
  const value = { tasks: [{ id: 'check-1', name: 'SQLite works' }] };
  store.save(value);
  const loaded = store.load();
  if (loaded.tasks[0].name !== value.tasks[0].name) throw new Error('SQLite round-trip failed');
  console.log('SQLite round-trip passed');
  store.close();
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
