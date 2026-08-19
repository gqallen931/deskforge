const path = require('node:path');

function createWorkbenchService(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
      name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active',
      deadline TEXT, archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color TEXT NOT NULL DEFAULT 'green',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS task_tags (
      task_code TEXT NOT NULL REFERENCES tasks(code) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY(task_code, tag_id)
    );
    CREATE TABLE IF NOT EXISTS workspace_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
      name TEXT NOT NULL, file_path TEXT NOT NULL UNIQUE, size INTEGER NOT NULL DEFAULT 0,
      extension TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL DEFAULT 'info', title TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '', is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  if (!db.prepare('SELECT id FROM workspaces LIMIT 1').get()) {
    db.prepare('INSERT INTO workspaces(name, active) VALUES (?, 1)').run('个人工作台');
  }

  const required = (value, label, max = 100) => {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) throw new Error(`${label}不能为空`);
    if (text.length > max) throw new Error(`${label}不能超过${max}个字符`);
    return text;
  };
  const activeWorkspace = () => db.prepare('SELECT id, name FROM workspaces WHERE active = 1 ORDER BY id LIMIT 1').get() || db.prepare('SELECT id, name FROM workspaces ORDER BY id LIMIT 1').get();

  function listWorkspaces() {
    return db.prepare('SELECT id, name, active FROM workspaces ORDER BY id').all().map((row) => ({ ...row, active: Boolean(row.active) }));
  }

  function listProjects() {
    return db.prepare(`SELECT id, workspace_id AS workspaceId, name, description, status, deadline FROM projects WHERE archived = 0 AND workspace_id = ? ORDER BY id DESC`).all(activeWorkspace().id);
  }

  function listTags(taskCode) {
    if (taskCode) return db.prepare(`SELECT t.id, t.name, t.color FROM tags t JOIN task_tags tt ON tt.tag_id=t.id WHERE tt.task_code=? ORDER BY t.name`).all(taskCode);
    return db.prepare('SELECT id, name, color FROM tags ORDER BY name').all();
  }

  function listFiles() {
    return db.prepare(`SELECT id, name, file_path AS path, size, extension, created_at AS createdAt FROM workspace_files WHERE workspace_id=? ORDER BY id DESC`).all(activeWorkspace().id);
  }

  function refreshDeadlineNotifications() {
    const overdue = db.prepare(`SELECT code, name, deadline FROM tasks WHERE archived=0 AND status!='done' AND deadline IS NOT NULL AND deadline!='' AND date(deadline) < date('now','localtime')`).all();
    const exists = db.prepare(`SELECT id FROM notifications WHERE title=? AND message=? LIMIT 1`);
    const insert = db.prepare(`INSERT INTO notifications(type,title,message) VALUES ('warning',?,?)`);
    overdue.forEach((task) => {
      const title = '任务已逾期';
      const message = `${task.code} · ${task.name}`;
      if (!exists.get(title, message)) insert.run(title, message);
    });
  }

  return {
    dashboard() {
      const stats = db.prepare(`SELECT COUNT(*) AS total, SUM(status='doing') AS doing, SUM(status='done') AS done, SUM(status!='done' AND deadline IS NOT NULL AND date(deadline)<date('now','localtime')) AS overdue FROM tasks WHERE archived=0`).get();
      return { workspace: activeWorkspace(), workspaces: listWorkspaces(), projects: listProjects(), tags: listTags(), files: listFiles(), stats: { total: Number(stats.total || 0), doing: Number(stats.doing || 0), done: Number(stats.done || 0), overdue: Number(stats.overdue || 0) } };
    },
    createWorkspace(input) {
      const name = required(input && input.name, '工作区名称', 60);
      const result = db.prepare('INSERT INTO workspaces(name) VALUES (?)').run(name);
      return { id: Number(result.lastInsertRowid), name, active: false };
    },
    switchWorkspace(id) {
      const target = db.prepare('SELECT id, name FROM workspaces WHERE id=?').get(Number(id));
      if (!target) throw new Error('工作区不存在');
      db.exec('BEGIN IMMEDIATE');
      try { db.prepare('UPDATE workspaces SET active=0').run(); db.prepare('UPDATE workspaces SET active=1, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(target.id); db.exec('COMMIT'); }
      catch (error) { db.exec('ROLLBACK'); throw error; }
      return target;
    },
    createProject(input) {
      const name = required(input && input.name, '项目名称', 100);
      const description = String(input.description || '').trim().slice(0, 1000);
      const deadline = String(input.deadline || '').trim().slice(0, 40) || null;
      const result = db.prepare('INSERT INTO projects(workspace_id,name,description,deadline) VALUES (?,?,?,?)').run(activeWorkspace().id, name, description, deadline);
      return { id: Number(result.lastInsertRowid), workspaceId: activeWorkspace().id, name, description, status: 'active', deadline };
    },
    listProjects,
    archiveProject(id) {
      return Boolean(db.prepare('UPDATE projects SET archived=1,status=\'archived\',updated_at=CURRENT_TIMESTAMP WHERE id=?').run(Number(id)).changes);
    },
    addTag(taskCode, input) {
      if (!db.prepare('SELECT code FROM tasks WHERE code=? AND archived=0').get(required(taskCode, '任务编号', 40))) throw new Error('任务不存在');
      const name = required(input && input.name, '标签名称', 20);
      db.prepare('INSERT INTO tags(name,color) VALUES (?,?) ON CONFLICT(name) DO NOTHING').run(name, input.color || 'green');
      const tag = db.prepare('SELECT id,name,color FROM tags WHERE name=?').get(name);
      db.prepare('INSERT INTO task_tags(task_code,tag_id) VALUES (?,?) ON CONFLICT DO NOTHING').run(taskCode, tag.id);
      return tag;
    },
    listTags,
    addFiles(paths) {
      const stmt = db.prepare('INSERT INTO workspace_files(workspace_id,name,file_path,size,extension) VALUES (?,?,?,?,?) ON CONFLICT(file_path) DO NOTHING');
      const workspaceId = activeWorkspace().id;
      (paths || []).forEach((file) => stmt.run(workspaceId, required(file.name, '文件名', 255), required(file.path, '文件路径', 2000), Number(file.size || 0), path.extname(file.name).slice(0, 20).toLowerCase()));
      return listFiles();
    },
    listFiles,
    removeFile(id) { return Boolean(db.prepare('DELETE FROM workspace_files WHERE id=?').run(Number(id)).changes); },
    notifications() { refreshDeadlineNotifications(); return db.prepare('SELECT id,type,title,message,is_read AS isRead,created_at AS createdAt FROM notifications ORDER BY id DESC LIMIT 50').all().map((n) => ({ ...n, isRead: Boolean(n.isRead) })); },
    markNotificationsRead() { db.prepare('UPDATE notifications SET is_read=1').run(); return true; },
    search(query) {
      const q = `%${required(query, '搜索内容', 100)}%`;
      return {
        tasks: db.prepare(`SELECT code AS id,name,'task' AS type FROM tasks WHERE archived=0 AND (name LIKE ? OR description LIKE ? OR code LIKE ?) LIMIT 20`).all(q, q, q),
        projects: db.prepare(`SELECT id,name,'project' AS type FROM projects WHERE archived=0 AND (name LIKE ? OR description LIKE ?) LIMIT 20`).all(q, q),
        files: db.prepare(`SELECT id,name,'file' AS type,file_path AS path FROM workspace_files WHERE name LIKE ? LIMIT 20`).all(q),
      };
    },
  };
}

module.exports = { createWorkbenchService };
