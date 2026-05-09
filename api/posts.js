// api/posts.js — GET 帖子列表 / POST 创建帖子
const { listAll, listPush, listRemove, nextId } = require('./lib/db');
const { requireAuth, getUser } = require('./lib/auth');

module.exports = async function handler(req, res) {
  // GET — 帖子列表
  if (req.method === 'GET') {
    const { page = 1, limit = 20, search } = req.query;
    let posts = await listAll('posts');
    const allUsers = await listAll('users');
    const allLikes = await listAll('likes');
    const allComments = await listAll('comments');
    const currentUser = await getUser(req);

    if (search) { const s = search.toLowerCase(); posts = posts.filter(p => p.content?.toLowerCase().includes(s)); }

    posts.sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at));
    const total = posts.length;
    const p = Math.max(1, Number(page)); const l = Math.min(100, Math.max(1, Number(limit)));
    posts = posts.slice((p-1)*l, p*l);

    const enriched = posts.map(post => {
      const u = allUsers.find(u => u.id === post.user_id);
      const likeCount = allLikes.filter(l => l.target_type === 'post' && l.target_id === post.id).length;
      const commentCount = allComments.filter(c => c.post_id === post.id).length;
      const hasLiked = currentUser ? allLikes.some(l => l.user_id === currentUser.id && l.target_type === 'post' && l.target_id === post.id) : false;
      return { ...post, user: u ? { id: u.id, username: u.username, role: u.role } : null, like_count: likeCount, comment_count: commentCount, has_liked: hasLiked };
    });

    return res.json({ posts: enriched, pagination: { page: p, limit: l, total, totalPages: Math.ceil(total/l) } });
  }

  // POST — 创建帖子
  return requireAuth(async (req2, res2) => {
    const { content, diaper_id } = req2.body || {};
    if (!content || !content.trim()) return res2.status(400).json({ error: '内容不能为空' });
    if (content.length > 5000) return res2.status(400).json({ error: '内容最多 5000 字' });
    const post = { id: await nextId('post'), user_id: req2.user.id, content, diaper_id: diaper_id||null, pinned: false, created_at: new Date().toISOString() };
    await listPush('posts', post);
    res2.status(201).json({ id: post.id, message: '发布成功' });
  })(req, res);
};
