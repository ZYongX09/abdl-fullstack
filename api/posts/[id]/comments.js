// api/posts/[id]/comments.js — POST /api/posts/:id/comments
const { listAll, listPush, nextId } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');

module.exports = requireAuth(async function handler(req, res) {
  const postId = Number(req.query.id);
  const allPosts = await listAll('posts');
  if (!allPosts.find(p => p.id === postId)) return res.status(404).json({ error: '帖子不存在' });

  const { content, parent_id } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: '内容不能为空' });
  if (content.length > 2000) return res.status(400).json({ error: '评论最多2000字' });

  const c = { id: await nextId('comment'), post_id: postId, user_id: req.user.id, parent_id: parent_id||null, content, created_at: new Date().toISOString() };
  await listPush('comments', c);
  res.status(201).json({ message: '评论成功', id: c.id });
});
