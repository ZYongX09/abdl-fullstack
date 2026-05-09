// api/posts/[id].js — GET 帖子详情 + DELETE 删除
const { listAll, listRemove, listPush } = require('../lib/db');
const { requireAuth, getUser } = require('../lib/auth');

module.exports = async function handler(req, res) {
  const id = Number(req.query.id);
  const allPosts = await listAll('posts');
  const post = allPosts.find(p => p.id === id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  if (req.method === 'GET') {
    const allUsers = await listAll('users');
    const allComments = await listAll('comments');
    const allLikes = await listAll('likes');
    const currentUser = await getUser(req);
    const u = allUsers.find(u => u.id === post.user_id);
    const comments = allComments.filter(c => c.post_id === id)
      .map(c => {
        const cu = allUsers.find(u => u.id === c.user_id);
        const cl = allLikes.filter(l => l.target_type === 'comment' && l.target_id === c.id).length;
        const chl = currentUser ? allLikes.some(l => l.user_id === currentUser.id && l.target_type === 'comment' && l.target_id === c.id) : false;
        return { ...c, username: cu?.username||'已注销', like_count: cl, has_liked: chl };
      })
      .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    const likeCount = allLikes.filter(l => l.target_type === 'post' && l.target_id === post.id).length;
    const hasLiked = currentUser ? allLikes.some(l => l.user_id === currentUser.id && l.target_type === 'post' && l.target_id === post.id) : false;

    return res.json({
      post: { ...post, user: u ? { id: u.id, username: u.username, role: u.role } : null, like_count: likeCount, comment_count: comments.length, has_liked: hasLiked },
      comments
    });
  }

  // DELETE
  return requireAuth(async (req2, res2) => {
    if (post.user_id !== req2.user.id && req2.user.role !== 'admin') return res2.status(403).json({ error: '无权删除' });
    await listRemove('posts', p => p.id === id);
    await listRemove('comments', c => c.post_id === id);
    res2.json({ message: '已删除' });
  })(req, res);
};
