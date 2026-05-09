// api/likes.js — POST 点赞/取消点赞 (toggle)
const { listAll, listPush, listRemove, nextId } = require('./lib/db');
const { requireAuth } = require('./lib/auth');

module.exports = requireAuth(async function handler(req, res) {
  const { target_type, target_id } = req.body || {};
  if (!['post','comment'].includes(target_type)) return res.status(400).json({ error: 'target_type 必须为 post 或 comment' });
  if (!target_id) return res.status(400).json({ error: 'target_id 必填' });

  const allLikes = await listAll('likes');
  const existing = allLikes.find(l => l.user_id === req.user.id && l.target_type === target_type && l.target_id === Number(target_id));

  if (existing) {
    await listRemove('likes', l => l.id === existing.id);
    return res.json({ liked: false });
  }

  const like = { id: await nextId('like'), user_id: req.user.id, target_type, target_id: Number(target_id), created_at: new Date().toISOString() };
  await listPush('likes', like);
  res.json({ liked: true });
});
