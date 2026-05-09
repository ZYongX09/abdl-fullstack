import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { forumAPI, uploadImage } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import GuessYouLike from '../components/GuessYouLike';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
  if (m < 1) return '刚刚'; if (m < 60) return `${m}分钟前`;
  if (h < 24) return `${h}小时前`; if (d < 7) return `${d}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export default function ForumFeed() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [diaperId, setDiaperId] = useState('');
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [notifCount, setNotifCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const postTextareaRef = useRef(null);

  const autoResize = useCallback(() => {
    const el = postTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 300) + 'px';
  }, []);

  useEffect(() => { autoResize(); }, [content, autoResize]);

  const loadPosts = async (p = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const params = { page: p, limit: 20 }; if (search) params.search = search;
      const d = await forumAPI.feed(params);
      setPosts(prev => append ? [...prev, ...d.posts] : d.posts);
      setHasMore(d.pagination.page < d.pagination.totalPages);
      setPage(p);
    } catch(e) {} finally { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => { loadPosts(); loadNotifCount(); }, []);

  const loadNotifCount = async () => {
    if (!user) return;
    try { const d = await forumAPI.notifications(); setNotifCount(d.unread_count); } catch {}
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    setMsg(''); setUploading(true);
    try {
      let imgUrl = null;
      if (image) { const r = await uploadImage(image); imgUrl = r.url; }
      await forumAPI.create({ content, diaper_id: diaperId||null, image_url: imgUrl });
      setContent(''); setDiaperId(''); setImage(null); setShowForm(false);
      loadPosts();
      setMsg('');
    } catch(e) { setMsg(e.message); }
    finally { setUploading(false); }
  };

  const handleLike = async (postId) => {
    if (!user) return;
    try { await forumAPI.like({ target_type: 'post', target_id: postId }); loadPosts(page); } catch {}
  };

  const handleSearch = () => { loadPosts(); };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, flex: 1 }}>
          <i className="fa-regular fa-comments" /> 社区论坛
        </h2>
        {user && (
          <>
            <Link to="/notifications" style={{ position: 'relative', textDecoration: 'none', fontSize: '1.3rem', color: 'var(--text)' }}>
              <i className="fa-solid fa-bell" />
              {notifCount > 0 && (
                <span className="notif-badge" style={{ position: 'absolute', top: -6, right: -8 }}>{notifCount}</span>
              )}
            </Link>
            <button className="btn btn-accent" onClick={() => setShowForm(!showForm)}>
              <i className="fa-solid fa-pen" /> 发帖
            </button>
          </>
        )}
      </div>

      <GuessYouLike />

      <div className="search-bar" style={{ marginBottom: 16 }}>
        <input className="form-control" placeholder="搜索帖子内容..." value={search}
          onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSearch()} />
        <button className="btn btn-primary btn-sm" onClick={handleSearch}>
          <i className="fa-solid fa-search" /> 搜索
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          {msg && <div className={`alert ${msg.includes('成功')?'alert-success':'alert-danger'}`}>{msg}</div>}
          <textarea ref={postTextareaRef} className="form-control auto-resize" rows={4} placeholder="分享你的想法..." value={content} onChange={e=>setContent(e.target.value)} maxLength={5000} onInput={autoResize} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <span style={{ fontSize: '0.75rem', color: content.length > 4500 ? 'var(--danger)' : content.length > 3500 ? 'var(--warning)' : 'var(--text-muted)' }}>
              {content.length}/5000
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <i className="fa-solid fa-image" /> 选择图片
              <input type="file" accept="image/*" onChange={e=>setImage(e.target.files[0])} style={{ display: 'none' }} />
            </label>
            {image && (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={URL.createObjectURL(image)} alt="预览" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                <button onClick={() => setImage(null)} style={{
                  position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                  border: 'none', background: 'var(--danger)', color: 'white', cursor: 'pointer',
                  fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1
                }} title="移除图片" aria-label="移除图片"><i className="fa-solid fa-xmark" /></button>
              </div>
            )}
            <button className="btn btn-primary btn-sm" onClick={handlePost} disabled={uploading||!content.trim()}>
              {uploading ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
      )}

      {loading && posts.length === 0 ? <LoadingSkeleton type="feed" count={4} /> : posts.length === 0 ? (
        <div className="empty-state">
          <div className="icon"><i className="fa-solid fa-feather" /></div>
          <h3>{search ? '没有找到匹配的帖子' : '还没有帖子'}</h3>
          <p>{search ? '试试换个关键词搜索' : '成为第一个发帖的人吧'}</p>
        </div>
      ) : (
        posts.map((p, i) => (
          <div key={p.id} className="card stagger-item" style={{ marginBottom: 12, animationDelay: `${i * 0.05}s` }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="post-avatar">
                <i className="fa-solid fa-user-astronaut" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Link to={`/user/${p.user?.id}`} style={{ fontWeight: 700, textDecoration: 'none', color: 'var(--text)' }}>
                    {p.user?.username}
                  </Link>
                  {user && p.user?.id !== user.id && (
                    <Link to={`/messages?to=${encodeURIComponent(p.user?.username)}`} className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 10px' }} title="发私信">
                      <i className="fa-solid fa-paper-plane" />
                    </Link>
                  )}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    @{p.user?.username} · {timeAgo(p.created_at)}
                  </span>
                </div>
                <Link to={`/forum/${p.id}`} style={{ textDecoration: 'none', color: 'var(--text)' }}>
                  <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{p.content}</p>
                </Link>
                {p.images?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 4, marginBottom: 8 }}>
                    {p.images.map((img, i) => <img key={i} src={img.image_url} alt="" loading="lazy" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} onError={(e) => { e.target.style.display = 'none'; }} />)}
                  </div>
                )}
                {p.diaper && (
                  <Link to={`/diaper/${p.diaper.id}`} className="tag" style={{ textDecoration: 'none' }}>
                    <i className="fa-solid fa-tag" /> {p.diaper.brand} {p.diaper.model}
                  </Link>
                )}
                <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
                  <button onClick={() => handleLike(p.id)}
                    className={`like-btn${p.has_liked ? ' liked' : ''}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer',
                      color: p.has_liked ? 'var(--like-active)' : 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <i className={`fa-heart ${p.has_liked ? 'fa-solid' : 'fa-regular'}`} /> {p.like_count}
                  </button>
                  <Link to={`/forum/${p.id}`} style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <i className="fa-regular fa-comment" /> {p.comment_count}
                  </Link>
                  <button onClick={(e) => { e.preventDefault(); navigator.clipboard?.writeText(window.location.origin + '/forum/' + p.id).then(() => addToast('链接已复制到剪贴板', 'success', 2000)).catch(()=>{}); }} title="复制链接" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="复制帖子链接">
                    <i className="fa-solid fa-share-nodes" /> 分享
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      {hasMore && !loading && (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <button className="btn btn-outline" onClick={() => loadPosts(page+1, true)} disabled={loadingMore}>
            {loadingMore ? <><i className="fa-solid fa-spinner fa-spin" /> 加载中...</> : <><i className="fa-solid fa-chevron-down" /> 加载更多</>}
          </button>
        </div>
      )}
    </div>
  );
}
