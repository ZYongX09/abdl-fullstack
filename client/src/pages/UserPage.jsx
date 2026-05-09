import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authAPI, forumAPI } from '../api';

function timeAgo(d) {
  const now = Date.now();
  const diff = now - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月前`;
  return `${Math.floor(months / 12)}年前`;
}

export default function UserPage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [error, setError] = useState('');

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await authAPI.getUser(Number(id));
      setProfile(d.user);
      // Load user's posts
      try {
        const allData = await forumAPI.feed({ limit: 100 });
        const userPosts = allData.posts.filter(p => p.user?.id === d.user.id);
        setPosts(userPosts.slice(0, 20));
      } catch (e) {
        setPosts([]);
      }
    } catch (e) {
      setError(e.message || '用户不存在');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: 12 }}>
      <div className="skeleton" style={{ height: 20, width: 80, marginBottom: 16, borderRadius: 4 }} />
      <div className="card" style={{ textAlign: 'center', padding: 30 }}>
        <div className="skeleton" style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto 12px' }} />
        <div className="skeleton" style={{ height: 28, width: 120, margin: '0 auto 8px', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 16, width: 200, margin: '0 auto 16px', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 60, width: '100%', borderRadius: 8 }} />
      </div>
    </div>
  );

  if (error || !profile) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div className="empty-state">
        <div className="icon"><i className="fa-solid fa-user-slash" /></div>
        <h3>{error || '用户不存在'}</h3>
        <p>该用户可能已注销或 ID 无效</p>
      </div>
      <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
        <i className="fa-solid fa-arrow-left" /> 返回论坛
      </Link>
    </div>
  );

  const profileComplete = profile.weight || profile.waist || profile.hip || profile.style_preference;
  const joinDate = new Date(profile.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Link to="/" style={{ color: 'var(--link-color)', fontSize: '0.9rem', display: 'inline-block', marginBottom: 8 }}>
        <i className="fa-solid fa-arrow-left" /> 返回论坛
      </Link>

      {/* Profile Card */}
      <div className="card" style={{ textAlign: 'center', padding: '24px 20px' }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%', margin: '0 auto 12px',
          background: profile.avatar ? 'transparent' : 'var(--primary-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.5rem', overflow: 'hidden', border: '3px solid var(--primary-light)',
        }}>
          {profile.avatar ? (
            <img src={profile.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <i className="fa-solid fa-user-astronaut" style={{ fontSize: '2rem', color: 'var(--primary-dark)' }} />
          )}
        </div>

        <h2 style={{ margin: '4px 0' }}>{profile.username}</h2>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 6, flexWrap: 'wrap' }}>
          {profile.role === 'admin' && (
            <span className="tag" style={{ background: 'var(--accent)', color: 'white' }}>
              <i className="fa-solid fa-shield-halved" /> 管理员
            </span>
          )}
          <span className="tag">
            <i className="fa-solid fa-calendar" /> {joinDate} 加入
          </span>
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16,
          padding: '10px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{posts.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>帖子</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent)' }}>{posts.reduce((sum, p) => sum + (p.comment_count || 0), 0)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>收到评论</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#e74c3c' }}>{posts.reduce((sum, p) => sum + (p.like_count || 0), 0)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>获得点赞</div>
          </div>
        </div>

        {/* About */}
        {profile.bio && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--input-bg)', borderRadius: 10, textAlign: 'left', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text)' }}>
            <i className="fa-solid fa-quote-left" style={{ color: 'var(--primary-dark)', marginRight: 6, opacity: 0.5 }} />
            {profile.bio}
          </div>
        )}

        {/* Profile Details */}
        {profileComplete && (
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'left' }}>
            {[
              { label: '年龄', val: profile.age, unit: '岁', icon: 'fa-cake-candles' },
              { label: '地区', val: profile.region, icon: 'fa-location-dot' },
              { label: '体重', val: profile.weight, unit: 'kg', icon: 'fa-weight-scale' },
              { label: '腰围', val: profile.waist, unit: 'cm', icon: 'fa-ruler' },
              { label: '臀围', val: profile.hip, unit: 'cm', icon: 'fa-ruler-combined' },
              { label: '偏好', val: profile.style_preference, icon: 'fa-shirt' },
            ].filter(item => item.val).map(item => (
              <div key={item.label} style={{
                background: 'var(--input-bg)', borderRadius: 10, padding: '8px 12px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem'
              }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  <i className={`fa-solid ${item.icon}`} style={{ width: 16, marginRight: 4, textAlign: 'center' }} />
                  {item.label}
                </span>
                <span style={{ fontWeight: 600 }}>{item.val}{item.unit || ''}</span>
              </div>
            ))}
          </div>
        )}

        {!profileComplete && !profile.bio && (
          <p style={{ marginTop: 14, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <i className="fa-solid fa-circle-info" /> 该用户暂未完善个人资料
          </p>
        )}
      </div>

      {/* Posts Section */}
      <div style={{ marginTop: 16 }}>
        {/* Tab */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
          <button
            onClick={() => setActiveTab('posts')}
            style={{
              background: 'none', border: 'none', padding: '10px 20px',
              borderBottom: activeTab === 'posts' ? '2px solid var(--primary-dark)' : '2px solid transparent',
              color: activeTab === 'posts' ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: activeTab === 'posts' ? 600 : 400,
              cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s',
            }}
          >
            <i className="fa-solid fa-newspaper" style={{ marginRight: 6 }} />
            帖子 ({posts.length})
          </button>
        </div>

        {/* Posts List */}
        <div style={{ marginTop: 0 }}>
          {posts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, borderRadius: '0 0 12px 12px' }}>
              <i className="fa-solid fa-inbox" style={{ fontSize: '2rem', color: 'var(--text-muted)', opacity: 0.5 }} />
              <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>暂无帖子</p>
            </div>
          ) : (
            <div style={{ borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
              {posts.map((p, i) => (
                <Link
                  key={p.id}
                  to={`/forum/${p.id}`}
                  style={{
                    display: 'block', padding: '14px 16px',
                    background: 'var(--card-bg)', borderBottom: i < posts.length - 1 ? '1px solid var(--border)' : 'none',
                    textDecoration: 'none', color: 'var(--text)', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--card-bg)'}
                >
                  <div style={{ fontSize: '0.9rem', lineHeight: 1.5, marginBottom: 6 }}>
                    {p.content?.length > 120 ? p.content.slice(0, 120) + '…' : p.content}
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span title="发布时间"><i className="fa-regular fa-clock" /> {timeAgo(p.created_at)}</span>
                    <span><i className="fa-regular fa-heart" /> {p.like_count || 0}</span>
                    <span><i className="fa-regular fa-comment" /> {p.comment_count || 0}</span>
                    {p.diaper_id && <span><i className="fa-solid fa-baby" /> 关联纸尿裤</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
