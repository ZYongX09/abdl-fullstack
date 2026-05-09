// api/data.js — /api/diapers, /api/ratings, /api/feelings, /api/rankings, /api/recommend
const { diapers, listAll, listPush, listRemove, nextId } = require('./lib/db');
const { getUser, requireAuth } = require('./lib/auth');
const { router } = require('./lib/router');

// 计算综合评分
function calcScore(d, ratings, feelings) {
  const r = ratings.filter(r => r.diaper_id === d.id);
  const dr = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
  const rv = r.length>0 ? r.reduce((s,ri)=>s+dr.reduce((a,dim)=>a+(ri[dim]||0),0)/dr.length,0)/r.length : 0;
  const fs = feelings.filter(f=>f.diaper_id===d.id);
  const fd = ['looseness','softness','dryness','odor_control','quietness'];
  let fv = 0;
  if (fs.length>0) { const sc=fs.map(f=>{const v=fd.filter(k=>f[k]!=null);return v.length?v.reduce((s,k)=>s+(f[k]+5),0)/v.length:0;}); fv=sc.reduce((a,b)=>a+b,0)/sc.length; }
  return fs.length>0 ? Math.round((rv*0.9+fv*0.1)*10)/10 : Math.round(rv*10)/10;
}

const r = router()
  // ====== 纸尿裤 ======
  .get('/api/diapers', async (req, res) => {
    const { search, brand, size, sort='id', order='ASC', page=1, limit=20 } = req.query;
    let list = [...diapers()];
    if (search) { const s = search.toLowerCase(); list = list.filter(d => d.brand.toLowerCase().includes(s) || d.model.toLowerCase().includes(s)); }
    if (brand) list = list.filter(d => d.brand === brand);
    if (size) list = list.filter(d => d.sizes?.some(s => s.label === size));
    const [ratings, feelings] = await Promise.all([listAll('ratings'), listAll('feelings')]);
    list = list.map(d => ({ ...d, avg_score: calcScore(d, ratings, feelings), rating_count: ratings.filter(r=>r.diaper_id===d.id).length, feeling_count: feelings.filter(f=>f.diaper_id===d.id).length }));
    const sk = {id:'id',avg_score:'avg_score',rating_count:'rating_count',thickness:'thickness'}[sort]||'id';
    list.sort((a,b) => (order==='DESC'?-1:1)*((a[sk]||0)-(b[sk]||0)));
    const total=list.length, p=Math.max(1,Number(page)), l=Math.min(100,Math.max(1,Number(limit)));
    res.json({ diapers: list.slice((p-1)*l,p*l), pagination:{page:p,limit:l,total,totalPages:Math.ceil(total/l)} });
  })
  .get('/api/diapers/:id', async (req, res) => {
    const d = diapers().find(d => d.id === Number(req.params.id));
    if (!d) return res.status(404).json({ error: '不存在' });
    const [ratings, feelings, users] = await Promise.all([listAll('ratings'), listAll('feelings'), listAll('users')]);
    const r = ratings.filter(r => r.diaper_id === d.id);
    const reviews = r.map(ri => { const u = users.find(u=>u.id===ri.user_id); return { ...ri, username:u?.username||'已注销', role:u?.role||'user' }; }).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    res.json({ diaper: { ...d, avg_score: calcScore(d, ratings, feelings), rating_count: r.length, feeling_count: feelings.filter(f=>f.diaper_id===d.id).length }, reviews, wiki: null });
  })
  .get('/api/diapers/brands', (req, res) => res.json({ brands: [...new Set(diapers().map(d=>d.brand))] }))
  .get('/api/diapers/sizes', (req, res) => res.json({ sizes: [...new Set(diapers().flatMap(d=>d.sizes?.map(s=>s.label)||[]))] }))
  .get('/api/diapers/compare', async (req, res) => {
    const ids = (req.query.ids||'').split(',').map(Number).slice(0,5);
    const ratings = await listAll('ratings');
    const result = ids.map(id => {
      const d = diapers().find(d=>d.id===id); if(!d) return null;
      const r = ratings.filter(r=>r.diaper_id===d.id);
      const dr = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
      const dims = {}; dr.forEach(dim=>{const v=r.map(ri=>ri[dim]).filter(v=>v!=null); dims[dim]={weighted:v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length*10)/10:0};});
      const avg = r.length>0?dr.reduce((a,dim)=>a+dims[dim].weighted,0)/dr.length:0;
      return { id:d.id, brand:d.brand, model:d.model, thickness:d.thickness, absorbency_adult:d.absorbency_adult, avg_price:d.avg_price, sizes:d.sizes, dimensions:dims, avg_score:Math.round(avg*10)/10, rating_count:r.length };
    }).filter(Boolean);
    res.json({ diapers: result });
  })
  // 感受 for diaper
  .get('/api/diapers/:id/feelings', async (req, res) => {
    const id = Number(req.params.id);
    const [feelings, users] = await Promise.all([listAll('feelings'), listAll('users')]);
    const fs = feelings.filter(f=>f.diaper_id===id);
    const fd = ['looseness','softness','dryness','odor_control','quietness'];
    const stats = {}; fd.forEach(dim=>{const v=fs.map(f=>f[dim]).filter(v=>v!=null);stats[dim]=v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length*10)/10:0;});
    res.json({ feelings: fs.map(f=>{const u=users.find(u=>u.id===f.user_id);return{...f,username:u?.username||'已注销'};}).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)), stats, count:fs.length });
  })
  // ====== 评分 ======
  .get('/api/ratings', async (req, res) => {
    const id = Number(req.query.id);
    const [ratings, users] = await Promise.all([listAll('ratings'), listAll('users')]);
    const revs = ratings.filter(r=>r.diaper_id===id);
    const dr = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
    const stats = { composite:0, count:revs.length, dimensions:{} };
    dr.forEach(dim=>{const v=revs.map(r=>r[dim]).filter(v=>v!=null);stats.dimensions[dim]={avg:v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length*10)/10:0,count:v.length};});
    const allAvgs = dr.map(d=>stats.dimensions[d].avg);
    stats.composite = allAvgs.length?Math.round(allAvgs.reduce((a,b)=>a+b,0)/allAvgs.length*10)/10:0;
    res.json({ reviews: revs.map(r=>{const u=users.find(u=>u.id===r.user_id);return{...r,username:u?.username||'已注销',role:u?.role||'user'};}).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)), stats });
  })
  .post('/api/ratings', requireAuth(async (req, res) => {
    const { diaper_id, review, ...scores } = req.body||{};
    const dr = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
    for(const dim of dr){ const v=scores[dim]; if(v==null||v<1||v>10) return res.status(400).json({error:`${dim} 1-10`}); }
    if(review&&review.length>500) return res.status(400).json({error:'评价500字'});
    const ratings = await listAll('ratings');
    if(ratings.find(r=>r.user_id===req.user.id&&r.diaper_id===Number(diaper_id))) return res.status(409).json({error:'已评过分'});
    const r = { id:await nextId('rating'), user_id:req.user.id, diaper_id:Number(diaper_id), ...scores, review:review||null, review_status:'approved', created_at:new Date().toISOString() };
    await listPush('ratings', r);
    res.status(201).json({ message:'评分成功', review_status:'approved', id:r.id });
  }))
  .get('/api/ratings/my/:diaperId', requireAuth(async (req, res) => {
    const ratings = await listAll('ratings');
    const r = ratings.find(r=>r.user_id===req.user.id&&r.diaper_id===Number(req.params.diaperId));
    res.json({ rating: r||null });
  }))
  .del('/api/ratings/:id', requireAuth(async (req, res) => {
    const id = Number(req.params.id);
    const ratings = await listAll('ratings');
    const r = ratings.find(r=>r.id===id);
    if(!r) return res.status(404).json({error:'不存在'});
    if(r.user_id!==req.user.id&&req.user.role!=='admin') return res.status(403).json({error:'无权'});
    await listRemove('ratings',r=>r.id===id);
    res.json({message:'删除成功'});
  }))
  // ====== 使用感受 ======
  .post('/api/feelings', requireAuth(async (req, res) => {
    const { diaper_id, size, ...dims } = req.body||{};
    const fd = ['looseness','softness','dryness','odor_control','quietness'];
    for(const k of fd){ const v=dims[k]; if(v==null||v<-5||v>5) return res.status(400).json({error:`${k} -5到5`}); }
    const all = await listAll('feelings');
    if(all.find(f=>f.user_id===req.user.id&&f.diaper_id===Number(diaper_id)&&f.size===size)) return res.status(409).json({error:'已记录'});
    const f = { id:await nextId('feeling'), user_id:req.user.id, diaper_id:Number(diaper_id), size, ...dims, created_at:new Date().toISOString() };
    await listPush('feelings', f);
    res.status(201).json({ message:'记录成功', id:f.id });
  }))
  .get('/api/feelings/me/:diaperId/:size', requireAuth(async (req, res) => {
    const all = await listAll('feelings');
    const f = all.find(f=>f.user_id===req.user.id&&f.diaper_id===Number(req.params.diaperId)&&f.size===req.params.size);
    res.json({ feeling: f||null });
  }))
  .del('/api/feelings/:id', requireAuth(async (req, res) => {
    const id = Number(req.params.id);
    const all = await listAll('feelings');
    const f = all.find(f=>f.id===id);
    if(!f) return res.status(404).json({error:'不存在'});
    if(f.user_id!==req.user.id&&req.user.role!=='admin') return res.status(403).json({error:'无权'});
    await listRemove('feelings',f=>f.id===id);
    res.json({message:'删除成功'});
  }))
  // ====== 排行榜 ======
  .get('/api/rankings', async (req, res) => {
    const { type, dimension, limit=20 } = req.query;
    if(!['hot','absorbency','popular','dimension'].includes(type)) return res.status(400).json({error:'type错误'});
    const [ratings, feelings] = await Promise.all([listAll('ratings'), listAll('feelings')]);
    let list = diapers().map(d => {
      const r = ratings.filter(r=>r.diaper_id===d.id);
      const dr = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
      const rv = r.length>0?r.reduce((s,ri)=>s+dr.reduce((a,dim)=>a+(ri[dim]||0),0)/dr.length,0)/r.length:0;
      const ds = r.length>0&&dimension?r.reduce((s,ri)=>s+(ri[dimension]||0),0)/r.length:0;
      return { id:d.id, brand:d.brand, model:d.model, avg_score:Math.round(rv*10)/10, rating_count:r.length, thickness:d.thickness, absorbency_adult:d.absorbency_adult, dimension_score:ds };
    });
    if (type==='hot') list.sort((a,b)=>b.avg_score-a.avg_score);
    else if (type==='absorbency') { const ex=t=>{if(!t)return 0;const m=t.match(/(\d+)\s*ml/gi);return m?Math.max(...m.map(x=>parseInt(x))):0;}; list.sort((a,b)=>ex(b.absorbency_adult)-ex(a.absorbency_adult)); }
    else if (type==='popular') list.sort((a,b)=>b.rating_count-a.rating_count);
    else list.sort((a,b)=>b.dimension_score-a.dimension_score);
    res.json({ rankings: list.slice(0,Math.min(Number(limit),50)), type, cached:false });
  })
  // ====== 推荐 ======
  .post('/api/recommend', requireAuth(async (req, res) => {
    const { selected } = req.body||{};
    const u = req.user;
    const ratings = await listAll('ratings');
    const dr = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
    let cands = diapers().map(d => {
      const r = ratings.filter(r=>r.diaper_id===d.id);
      const avg = r.length>0?r.reduce((s,ri)=>s+dr.reduce((a,dim)=>a+(ri[dim]||0),0)/dr.length,0)/r.length:d.comfort*2;
      let bonus = 0;
      if(u.hip&&d.sizes){const ms=d.sizes.find(s=>u.hip>=s.hip_min&&u.hip<=s.hip_max);if(ms)bonus=3;}
      return { diaper_id:d.id, brand:d.brand, model:d.model, matchScore:Math.min(100,Math.max(1,Math.round((avg+bonus)*10))), reason:'' };
    }).sort((a,b)=>b.matchScore-a.matchScore).slice(0,5);
    cands = cands.map(c=>{
      const d = diapers().find(d=>d.id===c.diaper_id);
      const reasons = [];
      if(u.hip&&d.sizes?.some(s=>u.hip>=s.hip_min&&u.hip<=s.hip_max)) reasons.push('尺码匹配');
      if(c.matchScore>80) reasons.push('评分优秀');
      if(d.thickness<=2) reasons.push('超薄设计');
      c.reason = reasons.join('，')||'综合推荐';
      return c;
    });
    const profile = [];
    if(selected?.basic){ if(u.age)profile.push(`年龄${u.age}岁`); if(u.region)profile.push(`地区${u.region}`); }
    if(selected?.body){ if(u.weight)profile.push(`体重${u.weight}kg`); if(u.waist)profile.push(`腰围${u.waist}cm`); if(u.hip)profile.push(`臀围${u.hip}cm`); }
    if(selected?.prefs&&u.style_preference) profile.push(`偏好${u.style_preference}`);
    res.json({ recommendations:cands, summary:profile.length>0?`根据您的${profile.join('、')}，推荐以下纸尿裤`:'为您推荐热门纸尿裤' });
  }))
  .get('/api/recommend/guess', async (req, res) => {
    const ratings = await listAll('ratings');
    const dr = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
    const list = diapers().map(d=>{
      const r=ratings.filter(r=>r.diaper_id===d.id);
      const avg=r.length>0?r.reduce((s,ri)=>s+dr.reduce((a,dim)=>a+(ri[dim]||0),0)/dr.length,0)/r.length:0;
      return{...d,avg_score:Math.round(avg*10)/10,rating_count:r.length};
    }).sort((a,b)=>b.avg_score-a.avg_score).slice(0,5).map(d=>({
      id:d.id,brand:d.brand,model:d.model,avg_score:d.avg_score,rating_count:d.rating_count,thickness:d.thickness,
      reason:d.avg_score>=8?'综合评分超高，社区力荐':d.thickness<=2?'超薄设计，适合日常穿着':'热门之选'
    }));
    res.json({ recommendations:list });
  });

module.exports = (req, res) => r.handle(req, res);
