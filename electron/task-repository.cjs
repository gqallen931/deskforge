function createTaskRepository(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'blue',
      position INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      row_id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      group_id INTEGER NOT NULL REFERENCES task_groups(id),
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT '中',
      status TEXT NOT NULL DEFAULT 'todo',
      deadline TEXT,
      owner TEXT NOT NULL DEFAULT 'brandon',
      participant INTEGER NOT NULL DEFAULT 1,
      position INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_group_position ON tasks(group_id, position);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, archived);
  `);

  const listGroupsStmt = db.prepare(`
    SELECT id, name, color, position
    FROM task_groups
    WHERE archived = 0
    ORDER BY position, id
  `);
  const listTasksStmt = db.prepare(`
    SELECT code AS id, group_id AS groupId, name, description, priority, status,
           deadline, owner, participant, position
    FROM tasks
    WHERE archived = 0
    ORDER BY group_id, position, row_id
  `);
  const getTaskStmt = db.prepare(`
    SELECT code AS id, group_id AS groupId, name, description, priority, status,
           deadline, owner, participant, position, archived
    FROM tasks
    WHERE code = ?
  `);
  const taskCountStmt = db.prepare('SELECT COUNT(*) AS count FROM tasks');
  const groupExistsStmt = db.prepare('SELECT id FROM task_groups WHERE id = ? AND archived = 0');
  const insertGroupStmt = db.prepare(`
    INSERT INTO task_groups(name, color, position) VALUES (?, ?, ?)
  `);
  const insertTaskStmt = db.prepare(`
    INSERT INTO tasks(code, group_id, name, description, priority, status, deadline, owner, participant, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const setTaskCodeStmt = db.prepare('UPDATE tasks SET code = ? WHERE row_id = ?');
  const updateTaskStmt = db.prepare(`
    UPDATE tasks
    SET group_id = ?, name = ?, description = ?, priority = ?, status = ?, deadline = ?,
        owner = ?, participant = ?, position = ?, updated_at = CURRENT_TIMESTAMP
    WHERE code = ? AND archived = 0
  `);
  const completeTaskStmt = db.prepare(`
    UPDATE tasks SET status = 'done', updated_at = CURRENT_TIMESTAMP WHERE code = ? AND archived = 0
  `);
  const archiveTaskStmt = db.prepare(`
    UPDATE tasks SET archived = 1, status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE code = ?
  `);
  const removeTaskStmt = db.prepare('DELETE FROM tasks WHERE code = ?');

  function mapTask(row) {
    if (!row) return null;
    return { ...row, participant: Boolean(row.participant), archived: Boolean(row.archived) };
  }

  function createGroup(group) {
    const result = insertGroupStmt.run(group.name, group.color, group.position);
    return { id: Number(result.lastInsertRowid), ...group };
  }

  function insertTask(task) {
    const result = insertTaskStmt.run(
      task.id || null,
      task.groupId,
      task.name,
      task.description,
      task.priority,
      task.status,
      task.deadline || null,
      task.owner,
      task.participant ? 1 : 0,
      task.position,
    );
    const rowId = Number(result.lastInsertRowid);
    const id = task.id || `DF-${new Date().getFullYear()}-${String(rowId).padStart(4, '0')}`;
    if (!task.id) setTaskCodeStmt.run(id, rowId);
    return mapTask(getTaskStmt.get(id));
  }

  return {
    hasTasks: () => Number(taskCountStmt.get().count) > 0,
    listGroups: () => listGroupsStmt.all(),
    listTasks: () => listTasksStmt.all().map(mapTask),
    getTask: (id) => mapTask(getTaskStmt.get(id)),
    groupExists: (id) => Boolean(groupExistsStmt.get(id)),
    createGroup,
    createTask: insertTask,
    updateTask(task) {
      const result = updateTaskStmt.run(
        task.groupId,
        task.name,
        task.description,
        task.priority,
        task.status,
        task.deadline || null,
        task.owner,
        task.participant ? 1 : 0,
        task.position,
        task.id,
      );
      return result.changes ? mapTask(getTaskStmt.get(task.id)) : null;
    },
    completeTask(id) {
      const result = completeTaskStmt.run(id);
      return result.changes ? mapTask(getTaskStmt.get(id)) : null;
    },
    archiveTask(id) {
      const result = archiveTaskStmt.run(id);
      return Boolean(result.changes);
    },
    removeTask(id) {
      const result = removeTaskStmt.run(id);
      return Boolean(result.changes);
    },
    seed(groups) {
      if (this.hasTasks()) return false;
      db.exec('BEGIN IMMEDIATE');
      try {
        groups.forEach((group, groupIndex) => {
          const createdGroup = createGroup({ name: group.name, color: group.color, position: groupIndex });
          group.tasks.forEach((task, taskIndex) => insertTask({ ...task, groupId: createdGroup.id, position: taskIndex }));
        });
        db.exec('COMMIT');
        return true;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

module.exports = { createTaskRepository };
