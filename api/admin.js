// api/admin.js — /api/admin (管理面板)
const { diapers, listAll, listPush, listRemove } = require('./lib/db');
const { requireAdmin } = require('./lib/auth');
const { router } = require('./lib/router');

const r = router()
  .get('/api/admin/stats', requireAdmin(async (req, res) => {
    const [users, posts, comments, ratings] = await Promise.all([listAll('users'), listAll('posts'), listAll('comments'), listAll('ratings')]);
    res.json({ users:users.length, posts:posts.length, comments:comments.length, diapers:diapers().length, ratings:ratings.length });
  }))
  .get('/api/admin/users', requireAdmin(async (req, res) => {
    const users = await listAll('users');
    res.json({ users: users.map(u=>{const{password,...s}=u;return s;}) });
  }))
  .del('/api/admin/users/:id', requireAdmin(async (req, res) => {
    const id = Number(req.params.id);
    await listRemove('users',u=>u.id===id);
    res.json({message:'已删除'});
  }))
  .post('/api/admin/users/:id/ban', requireAdmin(async (req, res) => {
    const id = Number(req.params.id);
    const users = await listAll('users');
    const u = users.find(u=>u.id===id);
    if(!u) return res.status(404).json({error:'不存在'});
    u.banned = u.banned ? 0 : 1;
    await listRemove('users',()=>true);
    for(const user of users) await listPush('users',user);
    res.json({ banned: !!u.banned });
  }))
  .get('/api/admin/posts', requireAdmin(async (req, res) => {
    const [posts, users, comments, likes] = await Promise.all([listAll('posts'), listAll('users'), listAll('comments'), listAll('likes')]);
    res.json({ posts: posts.map(p=>{
      const u=users.find(u=>u.id===p.user_id);
      return {...p, username:u?.username||'已注销', comment_count:comments.filter(c=>c.post_id===p.id).length, like_count:likes.filter(l=>l.target_type==='post'&&l.target_id===p.id).length};
    }) });
  }))
  .post('/api/admin/posts/:id/pin', requireAdmin(async (req, res) => {
    const id = Number(req.params.id);
    const posts = await listAll('posts');
    const p = posts.find(p=>p.id===id);
    if(!p) return res.status(404).json({error:'不存在'});
    p.pinned = !p.pinned;
    await listRemove('posts',()=>true);
    for(const post of posts) await listPush('posts',post);
    res.json({ pinned: p.pinned });
  }))
  .del('/api/admin/posts/:id', requireAdmin(async (req, res) => {
    const id = Number(req.params.id);
    await listRemove('posts',p=>p.id===id);
    res.json({message:'已删除'});
  }))
  .get('/api/admin/comments', requireAdmin(async (req, res) => {
    const [comments, users] = await Promise.all([listAll('comments'), listAll('users')]);
    res.json({ comments: comments.map(c=>({...c,username:users.find(u=>u.id===c.user_id)?.username||'已注销'})) });
  }))
  .del('/api/admin/comments/:id', requireAdmin(async (req, res) => {
    const id = Number(req.params.id);
    await listRemove('comments',c=>c.id===id);
    res.json({message:'已删除'});
  }));

module.exports = (req, res) => r.handle(req, res);
