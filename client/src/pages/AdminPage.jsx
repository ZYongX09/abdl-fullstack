import { useState, useEffect } from 'react';
import { diapersAPI, wikiAPI, termWikiAPI, ratingsAPI, adminAPI } from '../api';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const DIMS = [
  { key: 'absorption_score', label: '吸水量' },
  { key: 'fit_score', label: '尺码贴合' },
  { key: 'comfort_score', label: '舒适度' },
  { key: 'thickness_score', label: '厚度' },
  { key: 'appearance_score', label: '外观' },
  { key: 'value_score', label: '性价比' },
];

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('diapers');
  const [diapers, setDiapers] = useState([]);
  const [terms, setTerms] = useState([]);
  const [wikis, setWikis] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDiaper, setEditingDiaper] = useState(null);
  const [editingTerm, setEditingTerm] = useState(null);
  const [editingWiki, setEditingWiki] = useState(null);
  const [msg, setMsg] = useState('');
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/');
  }, [user]);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'diapers') {
        const d = await diapersAPI.list({ limit: 100, sort: 'id', order: 'DESC' });
        setDiapers(d.diapers || []);
      } else if (tab === 'users') {
        const d = await adminAPI.users({});
        setUsers(d.users || []);
      } else if (tab === 'posts') {
        const d = await adminAPI.posts();
        setPosts(d.posts || []);
      } else if (tab === 'comments') {
        const d = await adminAPI.comments();
        setComments(d.comments || []);
      } else if (tab === 'stats') {
        const d = await adminAPI.stats();
        setStats(d);
      } else if (tab === 'terms') {
        const d = await termWikiAPI.list();
        setTerms(d.terms || []);
      } else if (tab === 'wikis') {
        const d = await wikiAPI.list();
        setWikis(d.wikis || []);
      } else if (tab === 'requests') {
        const d = await wikiAPI.pendingRequests();
        setRequests(d.requests || []);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const resetDiaperForm = () => setEditingDiaper(null);

  const handleEditDiaper = (d) => { setEditingDiaper(d); };

  const handleSaveDiaper = async () => {
    setMsg('');
    try {
      const body = { ...editingDiaper };
      delete body.id; delete body.sizes; delete body.avg_score; delete body.rating_count;
      delete body.created_at; delete body.updated_at; delete body.created_by;
      if (editingDiaper.id) {
        await diapersAPI.update(editingDiaper.id, body);
        setMsg('saved');
      } else {
        await diapersAPI.create(body);
        setMsg('saved');
      }
      resetDiaperForm();
      setAiResult(null);
      loadData();
    } catch (e) { setMsg('error:' + e.message); }
  };

  const handleAIComplete = async () => {
    if (!editingDiaper.brand || !editingDiaper.model) {
      setMsg('error:请先填写品牌和型号');
      return;
    }
    setAiSuggesting(true);
    setMsg('');
    setAiResult(null);
    try {
      const result = await adminAPI.aiCompleteDiaper(editingDiaper);
      setAiResult(result);
      setMsg('ai_done');
      // Auto-apply suggestions to form
      if (result.suggestions) {
        const updates = {};
        Object.entries(result.suggestions).forEach(([key, val]) => {
          if (!editingDiaper[key] || editingDiaper[key] === '' || editingDiaper[key] === 0) {
            updates[key] = val;
          }
        });
        if (Object.keys(updates).length > 0) {
          setEditingDiaper(prev => ({ ...prev, ...updates }));
        }
      }
    } catch (e) { setMsg('error:' + e.message); }
    finally { setAiSuggesting(false); }
  };

  const handleDeleteDiaper = async (id) => {
    if (!confirm('确定删除？这将同时删除相关评分和Wiki。')) return;
    try { await diapersAPI.delete(id); loadData(); setMsg('saved'); }
    catch (e) { setMsg('error:' + e.message); }
  };

  const handleEditTerm = (t) => { setEditingTerm(t || { term: '', definition: '' }); };
  const handleDeleteTerm = async (id) => {
    if (!confirm('确定删除？')) return;
    try { await termWikiAPI.delete(id); loadData(); setMsg('saved'); }
    catch (e) { setMsg('error:' + e.message); }
  };
  const handleSaveTerm = async () => {
    setMsg('');
    try {
      if (editingTerm.id) await termWikiAPI.update(editingTerm.id, editingTerm);
      else await termWikiAPI.create(editingTerm);
      setEditingTerm(null); loadData(); setMsg('saved');
    } catch (e) { setMsg('error:' + e.message); }
  };

  const handleEditWiki = (w) => {
    setEditingWiki(w || { diaper_id: '', intro: '', absorbency_review: '', comfort_review: '', user_experience: '', size_guide: '' });
  };
  const handleSaveWiki = async () => {
    setMsg('');
    try {
      await wikiAPI.save(editingWiki.diaper_id, editingWiki);
      setEditingWiki(null); loadData(); setMsg('saved');
    } catch (e) { setMsg('error:' + e.message); }
  };
  const handleDeleteWiki = async (diaperId) => {
    if (!confirm('确定删除Wiki？')) return;
    try { await wikiAPI.delete(diaperId); loadData(); setMsg('saved'); }
    catch (e) { setMsg('error:' + e.message); }
  };
  const handleApproveRequest = async (id, approved) => {
    try {
      await wikiAPI.approveRequest(id, { status: approved ? 'approved' : 'rejected' });
      loadData(); setMsg(approved ? '已批准' : '已拒绝');
    } catch (e) { setMsg('error:' + e.message); }
  };

  if (!user || user.role !== 'admin') return <div className="loading-spinner"><div className="spinner" /><span>需要管理员权限</span></div>;

  const TABS = [
    { key: 'stats', label: '概览', icon: 'fa-chart-bar' },
    { key: 'users', label: '用户管理', icon: 'fa-users' },
    { key: 'diapers', label: '纸尿裤管理', icon: 'fa-box' },
    { key: 'posts', label: '帖子管理', icon: 'fa-comments' },
    { key: 'wikis', label: 'Wiki管理', icon: 'fa-book-open' },
    { key: 'requests', label: '编辑申请', icon: 'fa-pen-to-square' },
    { key: 'terms', label: '术语管理', icon: 'fa-book' },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>
        <i className="fa-solid fa-screwdriver-wrench" /> 管理员后台
      </h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} className={`btn ${tab===t.key?'btn-primary':'btn-outline'} btn-sm`}
            onClick={() => { setTab(t.key); setMsg(''); }}>
            <i className={`fa-solid ${t.icon}`} style={{ marginRight: 4 }} />{t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`alert ${msg === 'saved' || msg === 'ai_done' || msg.includes('已') ? 'alert-success' : 'alert-danger'}`}>
          {msg === 'saved' ? <><i className="fa-solid fa-circle-check" /> 操作成功</> : msg === 'ai_done' ? <><i className="fa-solid fa-robot" /> AI 分析完成，建议已自动填入</> : msg.replace('error:', '')}
        </div>
      )}

      {/* Diapers */}
      {tab === 'diapers' && (
        <div>
          <button className="btn btn-accent btn-sm" style={{ marginBottom: 12 }}
            onClick={() => handleEditDiaper({ brand: '', model: '', product_type: '纸尿裤', thickness: 3, is_baby_diaper: 0, comfort: 3, popularity: 0 })}>
            <i className="fa-solid fa-plus" /> 添加纸尿裤
          </button>

          {editingDiaper && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>{editingDiaper.id ? <><i className="fa-solid fa-pen" /> 编辑</> : <><i className="fa-solid fa-plus" /> 添加</>}纸尿裤</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div className="form-group"><label>品牌 *</label>
                  <input className="form-control" value={editingDiaper.brand||''} onChange={e=>setEditingDiaper(f=>({...f,brand:e.target.value}))} /></div>
                <div className="form-group"><label>型号 *</label>
                  <input className="form-control" value={editingDiaper.model||''} onChange={e=>setEditingDiaper(f=>({...f,model:e.target.value}))} /></div>
                <div className="form-group"><label>类型</label>
                  <select className="form-control" value={editingDiaper.product_type||'纸尿裤'} onChange={e=>setEditingDiaper(f=>({...f,product_type:e.target.value}))}>
                    <option>纸尿裤</option><option>拉拉裤</option><option>一体裤</option></select></div>
                <div className="form-group"><label>厚度 (1-5)</label>
                  <input className="form-control" type="number" min="1" max="5" value={editingDiaper.thickness||3} onChange={e=>setEditingDiaper(f=>({...f,thickness:Number(e.target.value)}))} /></div>
                <div className="form-group"><label>厂家标称吸水量</label>
                  <input className="form-control" value={editingDiaper.absorbency_mfr||''} onChange={e=>setEditingDiaper(f=>({...f,absorbency_mfr:e.target.value}))} /></div>
                <div className="form-group"><label>成人实际吸水量</label>
                  <input className="form-control" value={editingDiaper.absorbency_adult||''} onChange={e=>setEditingDiaper(f=>({...f,absorbency_adult:e.target.value}))} /></div>
                <div className="form-group"><label>材质</label>
                  <input className="form-control" value={editingDiaper.material||''} onChange={e=>setEditingDiaper(f=>({...f,material:e.target.value}))} /></div>
                <div className="form-group"><label>均价</label>
                  <input className="form-control" value={editingDiaper.avg_price||''} onChange={e=>setEditingDiaper(f=>({...f,avg_price:e.target.value}))} /></div>
                <div className="form-group"><label>特点（逗号分隔）</label>
                  <input className="form-control" value={editingDiaper.features||''} onChange={e=>setEditingDiaper(f=>({...f,features:e.target.value}))} /></div>
                <div className="form-group"><label>图片URL</label>
                  <input className="form-control" value={editingDiaper.image_url||''} onChange={e=>setEditingDiaper(f=>({...f,image_url:e.target.value}))} /></div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={editingDiaper.is_baby_diaper===1} onChange={e=>setEditingDiaper(f=>({...f,is_baby_diaper:e.target.checked?1:0}))} />
                    婴儿纸尿裤
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={handleSaveDiaper}>
                  <i className="fa-solid fa-floppy-disk" /> 保存
                </button>
                <button className="btn btn-accent" onClick={handleAIComplete} disabled={aiSuggesting}>
                  {aiSuggesting ? <><i className="fa-solid fa-spinner fa-spin" /> AI 分析中...</> : <><i className="fa-solid fa-robot" /> AI 补全数据</>}
                </button>
                <button className="btn btn-outline" onClick={resetDiaperForm}>取消</button>
              </div>
              {aiResult && (
                <div style={{ marginTop: 16, padding: 16, borderRadius: 'var(--radius-sm)', background: 'var(--rating-bg)', border: '1px solid var(--border)' }}>
                  <h4 style={{ marginBottom: 8 }}><i className="fa-solid fa-robot" /> AI 建议</h4>
                  {aiResult.summary && <p style={{ fontSize: '0.85rem', color: 'var(--primary-dark)', marginBottom: 8 }}>{aiResult.summary}</p>}
                  {aiResult.suggestions && Object.keys(aiResult.suggestions).length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ fontSize: '0.85rem' }}>补全建议：</strong>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        {Object.entries(aiResult.suggestions).map(([key, val]) => (
                          <span key={key} className="tag" style={{ background: '#E8F8E8', color: '#2E7D32', fontSize: '0.78rem' }}>
                            {key}: {typeof val === 'string' ? val : JSON.stringify(val)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiResult.verification && aiResult.verification.length > 0 && (
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>
                        <i className="fa-solid fa-triangle-exclamation" /> 数据核验提醒：
                      </strong>
                      <ul style={{ margin: '4px 0 0 16px', fontSize: '0.82rem', color: 'var(--text-light)' }}>
                        {aiResult.verification.map((v, i) => <li key={i}>{v}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {loading ? <div className="loading-spinner"><div className="spinner" /><span>加载中</span></div> : (
            <div>
              <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>共 {diapers.length} 款</p>
              {diapers.map(d => (
                <div key={d.id} className="card" style={{ marginBottom: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{d.brand} {d.model}</strong>
                      <span className="tag" style={{ marginLeft: 8 }}>{d.product_type}</span>
                      {d.is_baby_diaper===1 && <span className="tag" style={{ background: 'var(--badge-bg)', color: 'var(--badge-color)' }}><i className="fa-solid fa-baby" /> 婴儿款</span>}
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                        <i className="fa-solid fa-star" style={{ color: 'var(--warning)', fontSize: '0.7rem' }} /> {Number(d.avg_score||0).toFixed(1)} | {d.rating_count}评 | {d.avg_price||'-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => handleEditDiaper(d)}>
                        <i className="fa-solid fa-pen-to-square" /> 编辑
                      </button>
                      <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                        onClick={() => handleDeleteDiaper(d.id)}>
                        <i className="fa-solid fa-trash" /> 删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Wikis */}
      {tab === 'wikis' && (
        <div>
          <button className="btn btn-accent btn-sm" style={{ marginBottom: 12 }} onClick={() => handleEditWiki(null)}>
            <i className="fa-solid fa-plus" /> 添加Wiki
          </button>

          {editingWiki && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>{editingWiki.id ? <><i className="fa-solid fa-pen" /> 编辑</> : <><i className="fa-solid fa-plus" /> 添加</>}Wiki</h3>
              <div className="form-group"><label>纸尿裤ID *</label>
                <input className="form-control" type="number" value={editingWiki.diaper_id||''} onChange={e=>setEditingWiki(f=>({...f,diaper_id:e.target.value}))} /></div>
              <div className="form-group"><label>产品介绍</label>
                <textarea className="form-control" rows={3} value={editingWiki.intro||''} onChange={e=>setEditingWiki(f=>({...f,intro:e.target.value}))} /></div>
              <div className="form-group"><label>吸水性能评测</label>
                <textarea className="form-control" rows={3} value={editingWiki.absorbency_review||''} onChange={e=>setEditingWiki(f=>({...f,absorbency_review:e.target.value}))} /></div>
              <div className="form-group"><label>舒适度评测</label>
                <textarea className="form-control" rows={3} value={editingWiki.comfort_review||''} onChange={e=>setEditingWiki(f=>({...f,comfort_review:e.target.value}))} /></div>
              <div className="form-group"><label>用户体验总结</label>
                <textarea className="form-control" rows={3} value={editingWiki.user_experience||''} onChange={e=>setEditingWiki(f=>({...f,user_experience:e.target.value}))} /></div>
              <div className="form-group"><label>尺码选择建议</label>
                <textarea className="form-control" rows={3} value={editingWiki.size_guide||''} onChange={e=>setEditingWiki(f=>({...f,size_guide:e.target.value}))} /></div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={handleSaveWiki}>
                  <i className="fa-solid fa-floppy-disk" /> 保存
                </button>
                <button className="btn btn-outline" onClick={() => setEditingWiki(null)}>取消</button>
              </div>
            </div>
          )}

          {loading ? <div className="loading-spinner"><div className="spinner" /><span>加载中</span></div> : (
            wikis.map(w => (
              <div key={w.id} className="card" style={{ marginBottom: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{w.brand} {w.model}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>ID: {w.diaper_id}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => handleEditWiki(w)}>
                      <i className="fa-solid fa-pen-to-square" /> 编辑
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => handleDeleteWiki(w.diaper_id)}>
                      <i className="fa-solid fa-trash" /> 删除
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Requests */}
      {tab === 'requests' && (
        <div>
          <h3><i className="fa-solid fa-pen-to-square" /> Wiki 编辑申请</h3>
          {loading ? <div className="loading-spinner"><div className="spinner" /><span>加载中</span></div> : requests.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>暂无待审批申请</p>
          ) : (
            requests.map(r => (
              <div key={r.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{r.username}</strong> 申请编辑 <strong>{r.brand} {r.model}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleString('zh-CN')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleApproveRequest(r.id, true)}>
                      <i className="fa-solid fa-check" /> 批准
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleApproveRequest(r.id, false)}>
                      <i className="fa-solid fa-xmark" /> 拒绝
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 8, padding: 8, background: 'var(--rating-bg)', borderRadius: 8 }}>
                  <strong>原始内容:</strong>
                  <pre style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', margin: '4px 0' }}>{r.original_text}</pre>
                  <strong>修改建议:</strong>
                  <pre style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', margin: '4px 0', color: 'var(--primary-dark)' }}>{r.proposed_changes}</pre>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Stats */}
      {tab === 'stats' && stats && (
        <div className="diaper-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {[
            { v: stats.users, icon: 'fa-users', label: '用户' },
            { v: stats.posts, icon: 'fa-comments', label: '帖子' },
            { v: stats.comments, icon: 'fa-comment-dots', label: '评论' },
            { v: stats.diapers, icon: 'fa-box', label: '纸尿裤' },
            { v: stats.ratings, icon: 'fa-star', label: '评分' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: '1.8rem', color: 'var(--primary)' }}>
                <i className={`fa-solid ${s.icon}`} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{s.v}</div>
              <div style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div>
          {users.map(u => (
            <div key={u.id} className="card" style={{ marginBottom: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{u.username}</strong>
                <span className="tag" style={{ marginLeft: 8 }}>{u.role}</span>
                <span className="tag" style={{ marginLeft: 4 }}>Lv{u.level}</span>
                {u.banned ? <span className="tag" style={{ background: '#FDE8E8', color: '#C0392B' }}><i className="fa-solid fa-ban" /> 禁言</span> : null}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>帖:{u.post_count} 评:{u.comment_count}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={async () => { await adminAPI.banUser(u.id); u.banned = u.banned ? 0 : 1; setUsers([...users]); }}>
                  {u.banned ? '解禁' : '禁言'}
                </button>
                <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={async () => { if (confirm('确定删除用户 '+u.username+'？')) { await adminAPI.deleteUser(u.id); setUsers(users.filter(x=>x.id!==u.id)); } }}>
                  <i className="fa-solid fa-trash" /> 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posts */}
      {tab === 'posts' && (
        <div>
          {posts.map(p => (
            <div key={p.id} className="card" style={{ marginBottom: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                {p.pinned ? <span className="tag" style={{ background: '#FFF8E1', color: '#8D6E00' }}><i className="fa-solid fa-thumbtack" /> 置顶</span> : null}
                <strong>{p.username}</strong>
                <span style={{ marginLeft: 8, color: 'var(--text-light)' }}>{p.content?.substring(0, 60)}...</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                  <i className="fa-regular fa-comment" />{p.comment_count} <i className="fa-regular fa-heart" />{p.like_count}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={async () => { await adminAPI.pinPost(p.id); p.pinned = p.pinned ? 0 : 1; setPosts([...posts]); }}>
                  {p.pinned ? '取消置顶' : '置顶'}
                </button>
                <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={async () => { if (confirm('确定删除？')) { await adminAPI.deletePost(p.id); setPosts(posts.filter(x=>x.id!==p.id)); } }}>
                  <i className="fa-solid fa-trash" /> 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comments */}
      {tab === 'comments' && (
        <div>
          {comments.map(c => (
            <div key={c.id} className="card" style={{ marginBottom: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{c.username}</strong>
                <span style={{ marginLeft: 8, color: 'var(--text-light)' }}>{c.content?.substring(0, 80)}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8 }}>{new Date(c.created_at).toLocaleString('zh-CN')}</span>
              </div>
              <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={async () => { if (confirm('确定删除？')) { await adminAPI.deleteComment(c.id); setComments(comments.filter(x=>x.id!==c.id)); } }}>
                <i className="fa-solid fa-trash" /> 删除
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Terms */}
      {tab === 'terms' && (
        <div>
          <button className="btn btn-accent btn-sm" style={{ marginBottom: 12 }} onClick={() => handleEditTerm(null)}>
            <i className="fa-solid fa-plus" /> 添加术语
          </button>

          {editingTerm && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>{editingTerm.id ? <><i className="fa-solid fa-pen" /> 编辑</> : <><i className="fa-solid fa-plus" /> 添加</>}术语</h3>
              <div className="form-group"><label>术语 *</label>
                <input className="form-control" value={editingTerm.term||''} onChange={e=>setEditingTerm(f=>({...f,term:e.target.value}))} /></div>
              <div className="form-group"><label>缩写</label>
                <input className="form-control" value={editingTerm.abbreviation||''} onChange={e=>setEditingTerm(f=>({...f,abbreviation:e.target.value}))} /></div>
              <div className="form-group"><label>定义 *</label>
                <textarea className="form-control" rows={3} value={editingTerm.definition||''} onChange={e=>setEditingTerm(f=>({...f,definition:e.target.value}))} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div className="form-group"><label>分类</label>
                  <input className="form-control" value={editingTerm.category||''} onChange={e=>setEditingTerm(f=>({...f,category:e.target.value}))} /></div>
                <div className="form-group"><label>相关术语</label>
                  <input className="form-control" value={editingTerm.related_terms||''} onChange={e=>setEditingTerm(f=>({...f,related_terms:e.target.value}))} /></div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={handleSaveTerm}>
                  <i className="fa-solid fa-floppy-disk" /> 保存
                </button>
                <button className="btn btn-outline" onClick={()=>setEditingTerm(null)}>取消</button>
              </div>
            </div>
          )}

          {loading ? <div className="loading-spinner"><div className="spinner" /><span>加载中</span></div> : (
            terms.map(t => (
              <div key={t.id} className="card" style={{ marginBottom: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{t.term}</strong>
                    {t.abbreviation && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>({t.abbreviation})</span>}
                    {t.category && <span className="tag" style={{ marginLeft: 8 }}>{t.category}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => handleEditTerm(t)}>
                      <i className="fa-solid fa-pen-to-square" /> 编辑
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => handleDeleteTerm(t.id)}>
                      <i className="fa-solid fa-trash" /> 删除
                    </button>
                  </div>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-light)' }}>{t.definition?.substring(0, 100)}...</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
