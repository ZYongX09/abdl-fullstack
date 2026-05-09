// api/admin/posts.js — GET 帖子管理列表
const { listAll } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');

module.exports = requireAdmin(async (req, res) => {
  const posts = await listAll('posts');
  const allUsers = await listAll('users');
  const allComments = await listAll('comments');
  const allLikes = await listAll('likes');
  const enriched = posts.map(p => {
    const u = allUsers.find(u => u.id === p.user_id);
    return {
      ...p,
      username: u?.username || '已注销',
      comment_count: allComments.filter(c => c.post_id === p.id).length,
      like_count: allLikes.filter(l => l.target_type === 'post' && l.target_id === p.id).length
    };
  });
  res.json({ posts: enriched });
});
