const crypto = require('node:crypto');

function createAuthService(db) {
  const sessions = new Map();
  const normalizeUsername = (value) => {
    const username = String(value || '').trim();
    if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) throw new Error('用户名需为 3-40 位字母、数字、点、横线或下划线');
    return username;
  };
  const validatePassword = (value) => {
    const password = String(value || '');
    if (password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new Error('密码需为 8-128 位，且同时包含字母和数字');
    return password;
  };
  const hash = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');
  const safeUser = (user) => user && ({ id: Number(user.id), username: user.username, displayName: user.display_name, role: user.role });

  function status(clientId) {
    const count = Number(db.prepare('SELECT COUNT(*) AS count FROM users').get().count);
    return { needsSetup: count === 0, authenticated: sessions.has(clientId), user: sessions.get(clientId) || null };
  }

  function register(clientId, input) {
    if (db.prepare('SELECT id FROM users LIMIT 1').get()) throw new Error('本机账户已经初始化');
    const username = normalizeUsername(input && input.username);
    const password = validatePassword(input && input.password);
    const displayName = String(input && input.displayName || username).trim().slice(0, 40) || username;
    const salt = crypto.randomBytes(16).toString('hex');
    const result = db.prepare('INSERT INTO users(username,display_name,password_hash,salt) VALUES (?,?,?,?)').run(username, displayName, hash(password, salt), salt);
    const user = { id: Number(result.lastInsertRowid), username, displayName, role: 'owner' };
    sessions.set(clientId, user);
    return user;
  }

  function login(clientId, input) {
    const username = normalizeUsername(input && input.username);
    const password = String(input && input.password || '');
    const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
    const now = Date.now();
    if (user && user.locked_until && new Date(user.locked_until).getTime() > now) throw new Error('登录尝试过多，请稍后再试');
    const valid = user && password.length <= 128 && crypto.timingSafeEqual(Buffer.from(hash(password, user.salt), 'hex'), Buffer.from(user.password_hash, 'hex'));
    if (!valid) {
      if (user) {
        const attempts = Number(user.failed_attempts || 0) + 1;
        const lockedUntil = attempts >= 5 ? new Date(now + 5 * 60 * 1000).toISOString() : null;
        db.prepare('UPDATE users SET failed_attempts=?,locked_until=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(lockedUntil ? 0 : attempts, lockedUntil, user.id);
      }
      throw new Error('用户名或密码错误');
    }
    db.prepare('UPDATE users SET failed_attempts=0,locked_until=NULL,last_login_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(user.id);
    const clean = safeUser(user); sessions.set(clientId, clean); return clean;
  }

  function requireSession(clientId) {
    const user = sessions.get(clientId);
    if (!user) throw new Error('AUTH_REQUIRED');
    return user;
  }

  function logout(clientId) { sessions.delete(clientId); return true; }
  function changePassword(clientId, input) {
    const session = requireSession(clientId);
    const currentPassword = String(input && input.currentPassword || '');
    const newPassword = validatePassword(input && input.newPassword);
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(session.id);
    const currentHash = Buffer.from(hash(currentPassword, user.salt), 'hex');
    if (!crypto.timingSafeEqual(currentHash, Buffer.from(user.password_hash, 'hex'))) throw new Error('当前密码错误');
    const salt = crypto.randomBytes(16).toString('hex');
    db.prepare('UPDATE users SET password_hash=?,salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(hash(newPassword, salt), salt, user.id);
    return true;
  }
  function clear(clientId) { sessions.delete(clientId); }

  return { status, register, login, logout, changePassword, requireSession, clear };
}

module.exports = { createAuthService };
