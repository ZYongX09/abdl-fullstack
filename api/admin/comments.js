// api/admin/comments.js — GET 评论管理列表
const { listAll } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');

module.exports = requireAdmin(async (req, res) => {
  const comments = await listAll('comments');
  const allUsers = await listAll('users');
  res.json({ comments: comments.map(c => ({ ...c, username: allUsers.find(u => u.id === c.user_id)?.username || '已注销' })) });
});
