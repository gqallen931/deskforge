const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { createTaskRepository } = require('./task-repository.cjs');
const { createWorkbenchService } = require('./workbench-service.cjs');
const { runMigrations } = require('./migrations.cjs');
const { createAuthService } = require('./auth-service.cjs');

const db = new DatabaseSync(':memory:');
try {
  createTaskRepository(db); createWorkbenchService(db); runMigrations(db);
  const auth = createAuthService(db);
  assert.equal(auth.status(1).needsSetup, true);
  const user = auth.register(1, { username: 'owner', displayName: 'Owner', password: 'Deskforge123' });
  assert.equal(user.role, 'owner');
  assert.equal(auth.status(1).authenticated, true);
  assert.equal(db.prepare('SELECT password_hash FROM users').get().password_hash.includes('Deskforge123'), false);
  auth.logout(1); assert.throws(() => auth.requireSession(1), /AUTH_REQUIRED/);
  assert.throws(() => auth.login(2, { username: 'owner', password: 'wrong' }), /用户名或密码错误/);
  assert.equal(auth.login(2, { username: 'owner', password: 'Deskforge123' }).username, 'owner');
  assert.equal(auth.changePassword(2, { currentPassword: 'Deskforge123', newPassword: 'NewDeskforge456' }), true);
  auth.logout(2);
  assert.equal(auth.login(3, { username: 'owner', password: 'NewDeskforge456' }).username, 'owner');
  console.log('Local authentication, password hashing and session guard passed');
} finally { db.close(); }
