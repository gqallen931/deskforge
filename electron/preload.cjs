const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deskforge', {
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
  },
  workbench: {
    dashboard: () => ipcRenderer.invoke('workbench:dashboard'),
    search: (query) => ipcRenderer.invoke('workbench:search', query),
  },
  workspaces: {
    create: (input) => ipcRenderer.invoke('workspaces:create', input),
    switch: (id) => ipcRenderer.invoke('workspaces:switch', id),
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    create: (input) => ipcRenderer.invoke('projects:create', input),
    archive: (id) => ipcRenderer.invoke('projects:archive', id),
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
  app: { quit: () => ipcRenderer.invoke('app:quit') },
});
