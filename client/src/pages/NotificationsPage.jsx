import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { forumAPI } from '../api';
import { useAuth } from '../AuthContext';

function timeAgo(d) {
  const diff = Date.now()-new Date(d).getTime();
  const m=Math.floor(diff/60000),h=Math.floor(diff/3600000),day=Math.floor(diff/86400000);
  if(m<1)return'刚刚';if(m<60)return`${m}分钟前`;if(h<24)return`${h}小时前`;if(day<7)return`${day}天前`;
  return new Date(d).toLocaleDateString('zh-CN');
}

const typeLabels = { comment: '评论了你的帖子', reply: '回复了你的评论', like: '赞了你的' };
const typeIcons = { comment: 'fa-comment', reply: 'fa-reply', like: 'fa-heart' };

export default function Notifications() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadNotifs();
    forumAPI.readAllNotifications().catch(()=>{});
  }, []);

  const loadNotifs = async () => {
    try {
      const d = await forumAPI.notifications();
      setNotifs(d.notifications);
    } catch(e) {} finally { setLoading(false); }
  };

  if (!user) return <div style={{textAlign:'center',padding:60}}><h2><i className="fa-solid fa-circle-exclamation" /> 请先登录</h2></div>;
  if (loading) return <div className="loading-spinner"><div className="spinner" /><span>加载通知</span></div>;

  const getLink = (n) => {
    if (n.type === 'like' && n.target_type === 'post') return `/forum/${n.target_id}`;
    if (n.post_id) return `/forum/${n.post_id}`;
    return '#';
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 16 }}>
        <i className="fa-solid fa-bell" /> 通知
      </h2>
      {notifs.length === 0 ? (
        <div className="empty-state">
          <div className="icon"><i className="fa-solid fa-bell-slash" /></div>
          <h3>暂无通知</h3>
        </div>
      ) : (
        notifs.map(n => (
          <Link to={getLink(n)} key={n.id} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              padding: '12px 16px', borderRadius: 12, marginBottom: 8,
              background: n.is_read ? 'var(--bg-card)' : 'var(--primary-light)',
              border: `1px solid ${n.is_read ? 'var(--border)' : 'var(--primary)'}`,
              transition: 'all 0.2s'
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: '1.3rem', color: n.type === 'like' ? 'var(--like-active)' : 'var(--primary-dark)' }}>
                  <i className={`fa-solid ${typeIcons[n.type]}`} />
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: n.is_read?400:600 }}>
                    <strong>{n.from_username}</strong> {typeLabels[n.type]}
                    {n.type === 'like' && (n.target_type==='post'?'帖子':'评论')}
                  </span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
                {!n.is_read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-dark)' }} />
                )}
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
