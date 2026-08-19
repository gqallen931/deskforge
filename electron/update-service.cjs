function createUpdateService(options) {
  const app = options.app;
  const emit = options.emit || (() => {});
  const config = options.config || {};
  let updater = null;
  let state = { status: config.enabled ? 'idle' : 'disabled', currentVersion: app.getVersion(), availableVersion: null, progress: 0, message: config.enabled ? '可以检查更新' : '自动更新通道尚未配置' };
  const publish = () => { emit({ ...state }); return { ...state }; };
  const requireConfigured = () => { if (!updater) throw new Error('自动更新通道尚未配置'); };

  if (config.enabled) {
    if (!app.isPackaged) state = { ...state, status: 'development', message: '开发模式不执行自动更新' };
    else if (!/^https:\/\//i.test(String(config.url || ''))) state = { ...state, status: 'disabled', message: '更新地址必须使用 HTTPS' };
    else {
      const factory = options.updaterFactory || ((provider) => { const { NsisUpdater } = require('electron-updater'); return new NsisUpdater(provider); });
      updater = factory({ provider: 'generic', url: config.url });
      updater.autoDownload = false;
      updater.autoInstallOnAppQuit = true;
      updater.on('checking-for-update', () => { state = { ...state, status: 'checking', message: '正在检查更新…' }; publish(); });
      updater.on('update-available', (info) => { state = { ...state, status: 'available', availableVersion: info.version, message: `发现新版本 ${info.version}` }; publish(); });
      updater.on('update-not-available', () => { state = { ...state, status: 'current', message: '当前已是最新版本' }; publish(); });
      updater.on('download-progress', (progress) => { state = { ...state, status: 'downloading', progress: Math.round(progress.percent || 0), message: `正在下载 ${Math.round(progress.percent || 0)}%` }; publish(); });
      updater.on('update-downloaded', (info) => { state = { ...state, status: 'downloaded', availableVersion: info.version, progress: 100, message: '更新已下载，等待安装' }; publish(); });
      updater.on('error', (error) => { state = { ...state, status: 'error', message: error.message || '更新失败' }; publish(); });
    }
  }

  return {
    status: publish,
    async check() { requireConfigured(); await updater.checkForUpdates(); return publish(); },
    async download() { requireConfigured(); await updater.downloadUpdate(); return publish(); },
    install() { requireConfigured(); if (state.status !== 'downloaded') throw new Error('更新尚未下载完成'); updater.quitAndInstall(false, true); return true; },
  };
}

module.exports = { createUpdateService };
