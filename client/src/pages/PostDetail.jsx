import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { forumAPI } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';

function timeAgo(d) {
  const diff = Date.now()-new Date(d).getTime();
  const m=Math.floor(diff/60000),h=Math.floor(diff/3600000),day=Math.floor(diff/86400000);
  if(m<1)return'刚刚';if(m<60)return`${m}分钟前`;if(h<24)return`${h}小时前`;if(day<7)return`${day}天前`;
  return new Date(d).toLocaleDateString('zh-CN');
}

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const MAX_COMMENT_LEN = 500;
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [commentImage, setCommentImage] = useState(null);
  const [commentImagePreview, setCommentImagePreview] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const commentTextareaRef = useRef(null);

  const autoResize = useCallback(() => {
    const el = commentTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, []);

  useEffect(() => { autoResize(); }, [commentText, autoResize]);
  useEffect(() => { loadPost(); }, [id]);

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e) => { if (e.key === 'Escape') setLightboxSrc(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxSrc]);

  const loadPost = async () => {
    setLoading(true);
    try { const d = await forumAPI.getPost(id); setPost(d.post); setComments(d.comments); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const handleLike = async (type, targetId) => {
    if (!user) return;
    try { await forumAPI.like({ target_type: type, target_id: targetId }); loadPost(); } catch {}
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      await forumAPI.comment(id, { content: commentText, parent_id: replyTo, image_url: commentImagePreview || null });
      setCommentText(''); setReplyTo(null); setCommentImage(null); setCommentImagePreview(null);
      loadPost();
    } catch(e) { alert(e.message); }
  };

  const handleCommentImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) { setCommentImage(null); setCommentImagePreview(null); return; }
    setCommentImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setCommentImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const clearCommentImage = () => {
    setCommentImage(null);
    setCommentImagePreview(null);
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /><span>加载中</span></div>;
  if (!post) return <div className="alert alert-danger">帖子不存在</div>;

  const nestedComments = {};
  comments.forEach(c => {
    if (c.parent_id) {
      nestedComments[c.parent_id] = nestedComments[c.parent_id] || [];
      nestedComments[c.parent_id].push(c);
    }
  });
  const topComments = comments.filter(c => !c.parent_id);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Link to="/" style={{ color: 'var(--link-color)', fontSize: '0.9rem' }}>
        <i className="fa-solid fa-arrow-left" /> 返回论坛
      </Link>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="post-avatar">
            <i className="fa-solid fa-user-astronaut" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Link to={`/user/${post.user?.id}`} style={{ fontWeight: 700, textDecoration: 'none', color: 'var(--text)' }}>
                  {post.user?.username}
                </Link>
                {user && post.user?.id !== user.id && (
                  <Link to={`/messages?to=${encodeURIComponent(post.user?.username)}`} className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.7rem', padding: '2px 10px' }} title="发私信">
                    <i className="fa-solid fa-paper-plane" />
                  </Link>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  @{post.user?.username} · {timeAgo(post.created_at)}
                </span>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => { navigator.clipboard?.writeText(window.location.href).then(() => addToast('链接已复制到剪贴板', 'success', 2000)).catch(()=>{}); }}
                title="复制帖子链接" aria-label="分享帖子"
                style={{ flexShrink: 0 }}
              >
                <i className="fa-solid fa-share-nodes" />
              </button>
            </div>
            <p style={{ margin: '12px 0', whiteSpace: 'pre-wrap', fontSize: '1.1rem', lineHeight: 1.6 }}>
              {post.content}
            </p>
            {post.images?.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6, marginBottom: 12 }}>
                {post.images.map((img,i) => <img key={i} src={img.image_url} alt="" style={{ width:'100%', borderRadius:8, cursor:'pointer' }} onClick={() => setLightboxSrc(img.image_url)} />)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 24, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <button onClick={() => handleLike('post', post.id)}
                className={`like-btn${post.has_liked ? ' liked' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  color: post.has_liked ? 'var(--like-active)' : 'var(--text-muted)', fontSize: '0.9rem' }}>
                <i className={`fa-heart ${post.has_liked ? 'fa-solid' : 'fa-regular'}`} /> {post.like_count}
              </button>
              <span style={{ color: 'var(--text-muted)' }}>
                <i className="fa-regular fa-comment" /> {post.comment_count}
              </span>
            </div>
          </div>
        </div>
      </div>

      {user && (
        <div className="card">
          {replyTo && (
            <div className="alert alert-info">
              <i className="fa-solid fa-reply" /> 回复评论
              <button className="btn btn-outline btn-sm" style={{ marginLeft: 8 }} onClick={() => setReplyTo(null)}>取消</button>
            </div>
          )}
          <textarea ref={commentTextareaRef} className="form-control auto-resize" rows={2} placeholder="写评论..." value={commentText} onChange={e=>setCommentText(e.target.value)} maxLength={MAX_COMMENT_LEN} onInput={autoResize} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginTop: 4 }}>
            <span style={{ color: 'var(--text-muted)' }}>支持 Markdown</span>
            <span style={{
              color: commentText.length > MAX_COMMENT_LEN * 0.8 ? (commentText.length >= MAX_COMMENT_LEN ? 'var(--danger)' : 'var(--warning)') : 'var(--text-muted)'
            }}>{commentText.length}/{MAX_COMMENT_LEN}</span>
          </div>
          {commentImagePreview && (
            <div style={{ position: 'relative', display: 'inline-block', marginTop: 8 }}>
              <img src={commentImagePreview} alt="预览" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
              <button onClick={clearCommentImage} style={{
                position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%',
                background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', padding: 0, lineHeight: 1
              }} title="移除图片" aria-label="移除图片"><i className="fa-solid fa-xmark" /></button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
              <i className="fa-solid fa-image" /> 图片
              <input type="file" accept="image/*" onChange={handleCommentImageChange} style={{ display: 'none' }} />
            </label>
            <button className="btn btn-primary btn-sm" onClick={handleComment} disabled={!commentText.trim()}>
              <i className="fa-solid fa-paper-plane" /> 评论
            </button>
          </div>
        </div>
      )}

      <h3 style={{ marginBottom: 12 }}>
        <i className="fa-regular fa-comments" /> 评论 ({comments.length})
      </h3>
      {topComments.length === 0 && (
        <div className="empty-state" style={{ padding: 32 }}>
          <div className="icon"><i className="fa-regular fa-comment-dots" /></div>
          <h3>还没有评论</h3>
          <p>来成为第一个评论的人吧</p>
        </div>
      )}
      {topComments.map(c => (
        <div key={c.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="post-avatar" style={{ width: 32, height: 32, fontSize: '0.85rem' }}>
              <i className="fa-solid fa-user-astronaut" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Link to={`/user/${c.user_id}`} style={{ fontWeight: 600, textDecoration: 'none', color: 'var(--text)', fontSize: '0.9rem' }}>
                  {c.username}
                </Link>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{timeAgo(c.created_at)}</span>
              </div>
              <p style={{ margin: '4px 0', fontSize: '0.95rem' }}>{c.content}</p>
              {c.image_url && (
                <img src={c.image_url} alt="评论图片" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, marginTop: 6, border: '1px solid var(--border)', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setLightboxSrc(c.image_url)} />
              )}
              <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem' }}>
                <button onClick={() => handleLike('comment', c.id)}
                  className={`like-btn${c.has_liked ? ' liked' : ''}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    color: c.has_liked ? 'var(--like-active)' : 'var(--text-muted)' }}>
                  <i className={`fa-heart ${c.has_liked ? 'fa-solid' : 'fa-regular'}`} /> {c.like_count}
                </button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={() => { setReplyTo(c.id); setCommentText(`@${c.username} `); }}>
                  <i className="fa-solid fa-reply" /> 回复
                </button>
              </div>
              {nestedComments[c.id]?.map(sub => (
                <div key={sub.id} style={{ marginLeft: 24, marginTop: 8, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Link to={`/user/${sub.user_id}`} style={{ fontWeight: 600, textDecoration: 'none', color: 'var(--text)', fontSize: '0.85rem' }}>
                      {sub.username}
                    </Link>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{timeAgo(sub.created_at)}</span>
                  </div>
                  <p style={{ margin: '2px 0', fontSize: '0.9rem' }}>{sub.content}</p>
                  {sub.image_url && (
                    <img src={sub.image_url} alt="评论图片" style={{ maxWidth: 160, maxHeight: 160, borderRadius: 8, marginTop: 4, border: '1px solid var(--border)', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setLightboxSrc(sub.image_url)} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* 图片灯箱 */}
      {lightboxSrc && (
        <>
          <div className="lightbox-overlay" onClick={() => setLightboxSrc(null)}>
            <img src={lightboxSrc} alt="查看大图" onClick={e => e.stopPropagation()} />
          </div>
          <button className="lightbox-close" onClick={() => setLightboxSrc(null)} aria-label="关闭灯箱">
            <i className="fa-solid fa-xmark" />
          </button>
        </>
      )}
    </div>
  );
}
