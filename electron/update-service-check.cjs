const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createUpdateService } = require('./update-service.cjs');

class FakeUpdater extends EventEmitter {
  async checkForUpdates() { this.emit('checking-for-update'); this.emit('update-available', { version: '9.9.9' }); }
  async downloadUpdate() { this.emit('download-progress', { percent: 52 }); this.emit('update-downloaded', { version: '9.9.9' }); }
  quitAndInstall() { this.installed = true; }
}

const fake = new FakeUpdater();
const service = createUpdateService({ app: { isPackaged: true, getVersion: () => '0.5.0' }, config: { enabled: true, url: 'https://updates.example.test/windows' }, updaterFactory: () => fake });
(async () => {
  await service.check(); assert.equal(service.status().status, 'available');
  await service.download(); assert.equal(service.status().status, 'downloaded');
  assert.equal(service.install(), true); assert.equal(fake.installed, true);
  const disabled = createUpdateService({ app: { isPackaged: true, getVersion: () => '0.5.0' }, config: { enabled: false } });
  assert.throws(() => disabled.install(), /尚未配置/);
  console.log('Automatic update state machine and HTTPS configuration guard passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
