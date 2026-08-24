const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deskforge', {
  auth: {
    status: () => ipcRenderer.invoke('auth:status'),
    register: (input) => ipcRenderer.invoke('auth:register', input),
    login: (input) => ipcRenderer.invoke('auth:login', input),
    logout: () => ipcRenderer.invoke('auth:logout'),
    changePassword: (input) => ipcRenderer.invoke('auth:change-password', input),
  },
  platform: process.platform,
  storage: {
    load: () => ipcRenderer.invoke('db:load'),
    save: (value) => ipcRenderer.invoke('db:save', value),
  },
  tasks: {
    list: () => ipcRenderer.invoke('tasks:list'),
    seed: (groups) => ipcRenderer.invoke('tasks:seed', groups),
    create: (input) => ipcRenderer.invoke('tasks:create', input),
    update: (id, input) => ipcRenderer.invoke('tasks:update', id, input),
    complete: (id) => ipcRenderer.invoke('tasks:complete', id),
    archive: (id) => ipcRenderer.invoke('tasks:archive', id),
    remove: (id) => ipcRenderer.invoke('tasks:remove', id),
  },
  groups: {
    create: (input) => ipcRenderer.invoke('groups:create', input),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (input) => ipcRenderer.invoke('settings:save', input),
  },
  data: {
    exportJson: () => ipcRenderer.invoke('data:export'),
    importJson: () => ipcRenderer.invoke('data:import'),
    backup: () => ipcRenderer.invoke('data:backup'),
    restore: () => ipcRenderer.invoke('data:restore'),
    listBackups: () => ipcRenderer.invoke('data:backups:list'),
    restoreBackup: (id) => ipcRenderer.invoke('data:backups:restore', id),
    removeBackup: (id) => ipcRenderer.invoke('data:backups:remove', id),
    pruneBackups: () => ipcRenderer.invoke('data:backups:prune'),
  },
  workbench: {
    dashboard: () => ipcRenderer.invoke('workbench:dashboard'),
    search: (query) => ipcRenderer.invoke('workbench:search', query),
  },
  workspaces: {
    list: () => ipcRenderer.invoke('workspaces:list'),
    stats: () => ipcRenderer.invoke('workspaces:stats'),
    create: (input) => ipcRenderer.invoke('workspaces:create', input),
    switch: (id) => ipcRenderer.invoke('workspaces:switch', id),
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    create: (input) => ipcRenderer.invoke('projects:create', input),
    archive: (id) => ipcRenderer.invoke('projects:archive', id),
    update: (id, input) => ipcRenderer.invoke('projects:update', id, input),
    remove: (id) => ipcRenderer.invoke('projects:remove', id),
    tasks: (id) => ipcRenderer.invoke('projects:tasks', id),
    assignTask: (id, code) => ipcRenderer.invoke('projects:assign-task', id, code),
    unassignTask: (code) => ipcRenderer.invoke('projects:unassign-task', code),
  },
  tags: {
    list: (taskCode) => ipcRenderer.invoke('tags:list', taskCode),
    add: (taskCode, input) => ipcRenderer.invoke('tags:add', taskCode, input),
  },
  files: {
    list: () => ipcRenderer.invoke('files:list'),
    add: () => ipcRenderer.invoke('files:add'),
    open: (filePath) => ipcRenderer.invoke('files:open', filePath),
    remove: (id) => ipcRenderer.invoke('files:remove', id),
  },
  notifications: {
    list: () => ipcRenderer.invoke('notifications:list'),
    readAll: () => ipcRenderer.invoke('notifications:read-all'),
  },
  reminders: {
    list: () => ipcRenderer.invoke('reminders:list'),
    create: (input) => ipcRenderer.invoke('reminders:create', input),
    dismiss: (id) => ipcRenderer.invoke('reminders:dismiss', id),
    remove: (id) => ipcRenderer.invoke('reminders:remove', id),
  },
  updates: {
    status: () => ipcRenderer.invoke('updates:status'),
    check: () => ipcRenderer.invoke('updates:check'),
    download: () => ipcRenderer.invoke('updates:download'),
    install: () => ipcRenderer.invoke('updates:install'),
    onState: (callback) => { const listener = (_event, state) => callback(state); ipcRenderer.on('updates:state', listener); return () => ipcRenderer.removeListener('updates:state', listener); },
  },
  legal: { open: (type) => ipcRenderer.invoke('legal:open', type) },
  app: { quit: () => ipcRenderer.invoke('app:quit') },
});
