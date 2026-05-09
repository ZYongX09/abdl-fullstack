// api/posts.js — /api/posts, /api/likes (帖子+评论+点赞)
const { listAll, listPush, listRemove, nextId } = require('./lib/db');
const { getUser, requireAuth } = require('./lib/auth');
const { router } = require('./lib/router');

const r = router()
  // 帖子列表
  .get('/api/posts', async (req, res) => {
    const { page=1, limit=20, search } = req.query;
    let posts = await listAll('posts');
    const [users, likes, comments] = await Promise.all([listAll('users'), listAll('likes'), listAll('comments')]);
    const cu = await getUser(req);
    if (search) { const s = search.toLowerCase(); posts = posts.filter(p => p.content?.toLowerCase().includes(s)); }
    posts.sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0) || new Date(b.created_at)-new Date(a.created_at));
    const total=posts.length, p=Math.max(1,Number(page)), l=Math.min(100,Math.max(1,Number(limit)));
    posts = posts.slice((p-1)*l, p*l);
    const enriched = posts.map(post => {
      const u = users.find(u=>u.id===post.user_id);
      return { ...post, user: u?{id:u.id,username:u.username,role:u.role}:null,
        like_count: likes.filter(l=>l.target_type==='post'&&l.target_id===post.id).length,
        comment_count: comments.filter(c=>c.post_id===post.id).length,
        has_liked: cu ? likes.some(l=>l.user_id===cu.id&&l.target_type==='post'&&l.target_id===post.id) : false };
    });
    res.json({ posts: enriched, pagination:{page:p,limit:l,total,totalPages:Math.ceil(total/l)} });
  })
  // 创建帖子
  .post('/api/posts', requireAuth(async (req, res) => {
    const { content, diaper_id } = req.body||{};
    if(!content||!content.trim()) return res.status(400).json({error:'内容不能为空'});
    if(content.length>5000) return res.status(400).json({error:'最多5000字'});
    const post = { id:await nextId('post'), user_id:req.user.id, content, diaper_id:diaper_id||null, pinned:false, created_at:new Date().toISOString() };
    await listPush('posts', post);
    res.status(201).json({ id:post.id, message:'发布成功' });
  }))
  // 帖子详情 + 删除
  .get('/api/posts/:id', async (req, res) => {
    const id = Number(req.params.id);
    const [posts, users, comments, likes] = await Promise.all([listAll('posts'), listAll('users'), listAll('comments'), listAll('likes')]);
    const post = posts.find(p=>p.id===id);
    if(!post) return res.status(404).json({error:'帖子不存在'});
    const cu = await getUser(req);
    const u = users.find(u=>u.id===post.user_id);
    const pcomments = comments.filter(c=>c.post_id===id).map(c=>{
      const cu2 = users.find(u=>u.id===c.user_id);
      const cl = likes.filter(l=>l.target_type==='comment'&&l.target_id===c.id).length;
      const chl = cu ? likes.some(l=>l.user_id===cu.id&&l.target_type==='comment'&&l.target_id===c.id) : false;
      return { ...c, username:cu2?.username||'已注销', like_count:cl, has_liked:chl };
    }).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    const lc = likes.filter(l=>l.target_type==='post'&&l.target_id===post.id).length;
    const hl = cu ? likes.some(l=>l.user_id===cu.id&&l.target_type==='post'&&l.target_id===post.id) : false;
    res.json({ post:{...post, user:u?{id:u.id,username:u.username,role:u.role}:null, like_count:lc, comment_count:pcomments.length, has_liked:hl}, comments:pcomments });
  })
  .del('/api/posts/:id', requireAuth(async (req, res) => {
    const id = Number(req.params.id);
    const posts = await listAll('posts');
    const post = posts.find(p=>p.id===id);
    if(!post) return res.status(404).json({error:'不存在'});
    if(post.user_id!==req.user.id&&req.user.role!=='admin') return res.status(403).json({error:'无权'});
    await listRemove('posts',p=>p.id===id);
    await listRemove('comments',c=>c.post_id===id);
    res.json({message:'已删除'});
  }))
  // 评论
  .post('/api/posts/:id/comments', requireAuth(async (req, res) => {
    const postId = Number(req.params.id);
    const posts = await listAll('posts');
    if(!posts.find(p=>p.id===postId)) return res.status(404).json({error:'帖子不存在'});
    const { content, parent_id } = req.body||{};
    if(!content||!content.trim()) return res.status(400).json({error:'内容不能为空'});
    if(content.length>2000) return res.status(400).json({error:'最多2000字'});
    const c = { id:await nextId('comment'), post_id:postId, user_id:req.user.id, parent_id:parent_id||null, content, created_at:new Date().toISOString() };
    await listPush('comments', c);
    res.status(201).json({ message:'评论成功', id:c.id });
  }))
  // 点赞
  .post('/api/likes', requireAuth(async (req, res) => {
    const { target_type, target_id } = req.body||{};
    if(!['post','comment'].includes(target_type)) return res.status(400).json({error:'target_type错误'});
    if(!target_id) return res.status(400).json({error:'target_id必填'});
    const likes = await listAll('likes');
    const ex = likes.find(l=>l.user_id===req.user.id&&l.target_type===target_type&&l.target_id===Number(target_id));
    if(ex) {
      await listRemove('likes',l=>l.id===ex.id);
      return res.json({ liked:false });
    }
    const l = { id:await nextId('like'), user_id:req.user.id, target_type, target_id:Number(target_id), created_at:new Date().toISOString() };
    await listPush('likes', l);
    res.json({ liked:true });
  }));

module.exports = (req, res) => r.handle(req, res);
