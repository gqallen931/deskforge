const fs = require('node:fs');
const path = require('node:path');

const FORMAT = 'deskforge-backup';
const VERSION = 2;
const DEFAULT_SETTINGS = {
  displayName: 'Brandon',
  role: '产品经理',
  workspaceName: '个人工作台',
  compactMode: false,
  reduceMotion: false,
};

function createDataManager(db, backupDir) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  fs.mkdirSync(backupDir, { recursive: true });

  function readSettings() {
    const result = { ...DEFAULT_SETTINGS };
    db.prepare('SELECT key, value FROM settings').all().forEach((row) => {
      if (!(row.key in DEFAULT_SETTINGS)) return;
      try { result[row.key] = JSON.parse(row.value); } catch { result[row.key] = row.value; }
    });
    return result;
  }

  function validateSettings(input) {
    const source = input && typeof input === 'object' ? input : {};
    const clean = {
      displayName: String(source.displayName ?? DEFAULT_SETTINGS.displayName).trim().slice(0, 40),
      role: String(source.role ?? DEFAULT_SETTINGS.role).trim().slice(0, 40),
      workspaceName: String(source.workspaceName ?? DEFAULT_SETTINGS.workspaceName).trim().slice(0, 60),
      compactMode: Boolean(source.compactMode),
      reduceMotion: Boolean(source.reduceMotion),
    };
    if (!clean.displayName || !clean.workspaceName) throw new Error('姓名和工作区名称不能为空');
    return clean;
  }

  const saveSettingStmt = db.prepare(`
      INSERT INTO settings(key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  function writeSettings(clean) {
    Object.entries(clean).forEach(([key, value]) => saveSettingStmt.run(key, JSON.stringify(value)));
  }

  function saveSettings(input) {
    const clean = validateSettings(input);
    db.exec('BEGIN IMMEDIATE');
    try {
      writeSettings(clean);
      db.exec('COMMIT');
      return clean;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  function exportData() {
    return {
      format: FORMAT,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      settings: readSettings(),
      groups: db.prepare(`SELECT id, name, color, position, archived, created_at AS createdAt, updated_at AS updatedAt FROM task_groups ORDER BY id`).all(),
      tasks: db.prepare(`SELECT row_id AS rowId, code, group_id AS groupId, name, description, priority, status, deadline, owner, participant, position, archived, created_at AS createdAt, updated_at AS updatedAt FROM tasks ORDER BY row_id`).all(),
      workspaces: db.prepare('SELECT id,name,active FROM workspaces ORDER BY id').all(),
      projects: db.prepare('SELECT id,workspace_id AS workspaceId,name,description,status,deadline,archived FROM projects ORDER BY id').all(),
      tags: db.prepare('SELECT id,name,color FROM tags ORDER BY id').all(),
      taskTags: db.prepare('SELECT task_code AS taskCode,tag_id AS tagId FROM task_tags ORDER BY task_code,tag_id').all(),
      files: db.prepare('SELECT id,workspace_id AS workspaceId,name,file_path AS path,size,extension FROM workspace_files ORDER BY id').all(),
      notifications: db.prepare('SELECT id,type,title,message,is_read AS isRead FROM notifications ORDER BY id').all(),
    };
  }

  function validateImport(payload) {
    if (!payload || payload.format !== FORMAT || ![1, VERSION].includes(payload.version)) throw new Error('不是受支持的 Deskforge 备份文件');
    if (!Array.isArray(payload.groups) || !Array.isArray(payload.tasks)) throw new Error('备份文件缺少任务数据');
    const groupIds = new Set();
    const codes = new Set();
    payload.groups.forEach((group) => {
      if (!Number.isInteger(group.id) || group.id <= 0 || !String(group.name || '').trim()) throw new Error('备份中的分组数据无效');
      if (groupIds.has(group.id)) throw new Error('备份中存在重复分组');
      groupIds.add(group.id);
    });
    payload.tasks.forEach((task) => {
      if (!String(task.code || '').trim() || !String(task.name || '').trim() || !groupIds.has(task.groupId)) throw new Error('备份中的任务数据无效');
      if (codes.has(task.code)) throw new Error('备份中存在重复任务编号');
      codes.add(task.code);
    });
    return payload;
  }

  function importData(payload) {
    const clean = validateImport(payload);
    const insertGroup = db.prepare(`INSERT INTO task_groups(id, name, color, position, archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const insertTask = db.prepare(`INSERT INTO tasks(row_id, code, group_id, name, description, priority, status, deadline, owner, participant, position, archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertWorkspace = db.prepare('INSERT INTO workspaces(id,name,active) VALUES (?,?,?)');
    const insertProject = db.prepare('INSERT INTO projects(id,workspace_id,name,description,status,deadline,archived) VALUES (?,?,?,?,?,?,?)');
    const insertTag = db.prepare('INSERT INTO tags(id,name,color) VALUES (?,?,?)');
    const insertTaskTag = db.prepare('INSERT INTO task_tags(task_code,tag_id) VALUES (?,?)');
    const insertFile = db.prepare('INSERT INTO workspace_files(id,workspace_id,name,file_path,size,extension) VALUES (?,?,?,?,?,?)');
    const insertNotification = db.prepare('INSERT INTO notifications(id,type,title,message,is_read) VALUES (?,?,?,?,?)');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec('DELETE FROM task_tags; DELETE FROM projects; DELETE FROM workspace_files; DELETE FROM notifications; DELETE FROM tags; DELETE FROM workspaces; DELETE FROM tasks; DELETE FROM task_groups; DELETE FROM settings;');
      clean.groups.forEach((g) => insertGroup.run(g.id, String(g.name).slice(0, 80), g.color || 'blue', Number(g.position) || 0, g.archived ? 1 : 0, g.createdAt || new Date().toISOString(), g.updatedAt || new Date().toISOString()));
      clean.tasks.forEach((t) => insertTask.run(t.rowId || null, String(t.code).slice(0, 40), t.groupId, String(t.name).slice(0, 200), String(t.description || '').slice(0, 5000), ['高', '中', '低'].includes(t.priority) ? t.priority : '中', ['todo', 'doing', 'done', 'archived'].includes(t.status) ? t.status : 'todo', t.deadline || null, String(t.owner || 'brandon').slice(0, 40), t.participant ? 1 : 0, Number(t.position) || 0, t.archived ? 1 : 0, t.createdAt || new Date().toISOString(), t.updatedAt || new Date().toISOString()));
      const workspaces = Array.isArray(clean.workspaces) && clean.workspaces.length ? clean.workspaces : [{ id: 1, name: clean.settings && clean.settings.workspaceName || '个人工作台', active: 1 }];
      workspaces.forEach((w, index) => insertWorkspace.run(Number(w.id), requiredBackupText(w.name, '工作区名称', 60), w.active || index === 0 ? 1 : 0));
      (clean.projects || []).forEach((p) => insertProject.run(Number(p.id), Number(p.workspaceId), requiredBackupText(p.name, '项目名称', 100), String(p.description || '').slice(0, 1000), p.status || 'active', p.deadline || null, p.archived ? 1 : 0));
      (clean.tags || []).forEach((tag) => insertTag.run(Number(tag.id), requiredBackupText(tag.name, '标签名称', 20), tag.color || 'green'));
      (clean.taskTags || []).forEach((link) => insertTaskTag.run(link.taskCode, Number(link.tagId)));
      (clean.files || []).forEach((f) => insertFile.run(Number(f.id), Number(f.workspaceId), requiredBackupText(f.name, '文件名', 255), requiredBackupText(f.path, '文件路径', 2000), Number(f.size || 0), String(f.extension || '').slice(0, 20)));
      (clean.notifications || []).forEach((n) => insertNotification.run(Number(n.id), n.type || 'info', requiredBackupText(n.title, '通知标题', 100), String(n.message || '').slice(0, 1000), n.isRead ? 1 : 0));
      writeSettings(validateSettings(clean.settings || DEFAULT_SETTINGS));
      db.exec('COMMIT');
    } catch (error) {
      try { db.exec('ROLLBACK'); } catch {}
      throw error;
    }
    return { groups: clean.groups.length, tasks: clean.tasks.length, projects: (clean.projects || []).length, files: (clean.files || []).length };
  }

  function requiredBackupText(value, label, max) {
    const text = String(value || '').trim();
    if (!text) throw new Error(`备份中的${label}无效`);
    return text.slice(0, max);
  }

  function backupFilename() {
    return `deskforge-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
  }

  function writeBackup(targetPath) {
    const resolved = path.resolve(targetPath);
    fs.writeFileSync(resolved, JSON.stringify(exportData(), null, 2), 'utf8');
    return resolved;
  }

  function createBackup() {
    return writeBackup(path.join(backupDir, backupFilename()));
  }

  function readBackup(sourcePath) {
    const raw = fs.readFileSync(path.resolve(sourcePath), 'utf8');
    if (Buffer.byteLength(raw, 'utf8') > 10 * 1024 * 1024) throw new Error('备份文件不能超过 10 MB');
    return validateImport(JSON.parse(raw));
  }

  return { exportData, importData, readBackup, writeBackup, createBackup, readSettings, saveSettings };
}

module.exports = { createDataManager, FORMAT, VERSION };
