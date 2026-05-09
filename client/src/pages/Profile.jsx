import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { authAPI, ratingsAPI, feelingsAPI } from '../api';

const PROFILE_TABS = [
  { key: 'profile', icon: 'fa-address-card', label: '个人资料' },
  { key: 'reviews', icon: 'fa-regular fa-comment-dots', label: '我的评价' },
  { key: 'feelings', icon: 'fa-solid fa-heart', label: '使用感受' },
];

const FEELING_LABELS = {
  looseness: '宽松度', softness: '柔软度', dryness: '干爽度',
  odor_control: '气味控制', quietness: '声音大小',
};

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [myReviews, setMyReviews] = useState([]);
  const [myFeelings, setMyFeelings] = useState([]);
  const [diaperMap, setDiaperMap] = useState({});
  const [activeTab, setActiveTab] = useState('profile');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef(null);
  const tabRefs = useRef({});
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (user) {
      setForm({
        avatar: user.avatar || '',
        age: user.age || '',
        region: user.region || '',
        weight: user.weight || '',
        waist: user.waist || '',
        hip: user.hip || '',
        style_preference: user.style_preference || '',
        bio: user.bio || '',
      });
      if (user.id) {
        ratingsAPI.getForUser(user.id).then(d => {
          setMyReviews(d.reviews || []);
          const map = {};
          (d.reviews || []).forEach(r => {
            if (r.diaper) map[r.diaper_id] = r.diaper;
          });
          if (Object.keys(map).length) setDiaperMap(prev => ({ ...prev, ...map }));
        }).catch(() => {});
        feelingsAPI.getForUser(user.id).then(d => {
          setMyFeelings(d.feelings || []);
          const map = {};
          (d.feelings || []).forEach(f => {
            if (f.diaper) map[f.diaper_id] = f.diaper;
          });
          if (Object.keys(map).length) setDiaperMap(prev => ({ ...prev, ...map }));
        }).catch(() => {});
      }
    }
  }, [user]);

  // Update tab indicator position when tab changes
  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el) {
      const parent = el.parentElement;
      const pRect = parent.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      setTabIndicatorStyle({ left: eRect.left - pRect.left, width: eRect.width });
    }
  }, [activeTab, myReviews.length, myFeelings.length]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <h2><i className="fa-solid fa-circle-exclamation" /> 请先登录</h2>
        <p className="text-muted" style={{ marginTop: 12 }}>登录后查看个人主页</p>
      </div>
    );
  }

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleAvatarClick = () => {
    if (editing) fileRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({ ...f, avatar: ev.target.result }));
      setAvatarUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setForm(f => ({ ...f, avatar: '' }));
  };

  const handleSave = async () => {
    setMsg('');
    try {
      const body = {};
      Object.keys(form).forEach(k => {
        const val = form[k];
        if (val !== '' && val !== undefined) {
          body[k] = ['age', 'weight', 'waist', 'hip'].includes(k) ? Number(val) : val;
        }
      });
      const res = await authAPI.updateProfile(body);
      updateUser(res.user);
      setMsg('saved');
      setEditing(false);
    } catch (err) {
      setMsg('error:' + err.message);
    }
  };

  const profileComplete = user.weight || user.waist || user.hip || user.style_preference;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div className="avatar-container" onClick={handleAvatarClick} style={{
            width: 88, height: 88, borderRadius: '50%', margin: '0 auto 12px',
            background: user.avatar ? 'transparent' : 'var(--primary-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', cursor: editing ? 'pointer' : 'default',
            overflow: 'hidden',
            border: editing ? '3px dashed var(--primary)' : '3px solid var(--primary-light)',
            transition: 'all 0.3s',
          }} title={editing ? '点击更换头像' : ''}>
            {avatarUploading ? (
              <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
            ) : user.avatar || form.avatar ? (
              <img src={form.avatar || user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <i className="fa-solid fa-baby" style={{ fontSize: '2rem' }} />
            )}
            {editing && (
              <div className="avatar-hover-overlay">
                <i className="fa-solid fa-camera" style={{ color: 'white', fontSize: '1.3rem' }} />
              </div>
            )}
          </div>
          {editing && <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />}
          {editing && (form.avatar || user.avatar) && (
            <button className="btn btn-sm btn-outline" onClick={handleRemoveAvatar} style={{ marginTop: 4 }}>
              <i className="fa-solid fa-trash" /> 移除头像
            </button>
          )}

          <h2 style={{ marginTop: 4 }}>{user.username}</h2>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
            {user.role === 'admin' && <span className="tag" style={{ background: 'var(--accent)', color: 'white' }}>管理员</span>}
            <span className="tag">注册于 {new Date(user.created_at).toLocaleDateString('zh-CN')}</span>
          </div>
          {!profileComplete && (
            <div className="alert alert-info" style={{ marginTop: 16 }}>
              <i className="fa-solid fa-lightbulb" /> 完善个人资料后，AI 可以为你推荐最合适的纸尿裤！
            </div>
          )}
        </div>

        <div style={{ position: 'relative', display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap', paddingBottom: 4 }}>
          {PROFILE_TABS.map(t => (
            <button key={t.key}
              ref={el => tabRefs.current[t.key] = el}
              className={`btn tab-btn ${activeTab === t.key ? 'btn-primary' : 'btn-outline'} btn-sm`}
              style={{ position: 'relative', zIndex: 1 }}
              onClick={() => setActiveTab(t.key)}>
              <i className={`fa-solid ${t.icon}`} /> {t.label}
              {t.key === 'reviews' && ` (${myReviews.length})`}
              {t.key === 'feelings' && ` (${myFeelings.length})`}
            </button>
          ))}
          <div className="tab-indicator" style={{ left: tabIndicatorStyle.left, width: tabIndicatorStyle.width }} />
        </div>

        {activeTab === 'profile' && (
          <>
            {msg && (
              <div className={`alert ${msg === 'saved' ? 'alert-success' : 'alert-danger'}`}>
                {msg === 'saved' ? <><i className="fa-solid fa-circle-check" /> 资料更新成功</> : msg.replace('error:', '')}
              </div>
            )}

            {!editing ? (
              <div>
                <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 16px', fontSize: '0.95rem' }}>
                  <dt style={{ fontWeight: 600, color: 'var(--text-muted)' }}>年龄</dt><dd>{user.age || '未设置'}</dd>
                  <dt style={{ fontWeight: 600, color: 'var(--text-muted)' }}>地区</dt><dd>{user.region || '未设置'}</dd>
                  <dt style={{ fontWeight: 600, color: 'var(--text-muted)' }}>体重</dt><dd>{user.weight ? `${user.weight} kg` : '未设置'}</dd>
                  <dt style={{ fontWeight: 600, color: 'var(--text-muted)' }}>腰围</dt><dd>{user.waist ? `${user.waist} cm` : '未设置'}</dd>
                  <dt style={{ fontWeight: 600, color: 'var(--text-muted)' }}>臀围</dt><dd>{user.hip ? `${user.hip} cm` : '未设置'}</dd>
                  <dt style={{ fontWeight: 600, color: 'var(--text-muted)' }}>偏好款式</dt><dd>{user.style_preference || '未设置'}</dd>
                  <dt style={{ fontWeight: 600, color: 'var(--text-muted)' }}>简介</dt><dd>{user.bio || '未设置'}</dd>
                </dl>
                <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setEditing(true)}>
                  <i className="fa-solid fa-pen-to-square" /> 编辑资料
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <div className="form-group">
                    <label>年龄</label>
                    <input className="form-control" type="number" value={form.age} onChange={update('age')} />
                  </div>
                  <div className="form-group">
                    <label>地区</label>
                    <input className="form-control" value={form.region} onChange={update('region')} />
                  </div>
                  <div className="form-group">
                    <label>体重 (kg)</label>
                    <input className="form-control" type="number" step="0.1" value={form.weight} onChange={update('weight')} />
                  </div>
                  <div className="form-group">
                    <label>腰围 (cm)</label>
                    <input className="form-control" type="number" step="0.1" value={form.waist} onChange={update('waist')} />
                  </div>
                  <div className="form-group">
                    <label>臀围 (cm)</label>
                    <input className="form-control" type="number" step="0.1" value={form.hip} onChange={update('hip')} />
                  </div>
                  <div className="form-group">
                    <label>偏好款式</label>
                    <input className="form-control" value={form.style_preference} onChange={update('style_preference')} placeholder="如：日系可爱" />
                  </div>
                </div>
                <div className="form-group">
                  <label>简介</label>
                  <textarea className="form-control" value={form.bio} onChange={update('bio')} placeholder="介绍一下自己..." />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-primary" onClick={handleSave}>
                    <i className="fa-solid fa-floppy-disk" /> 保存
                  </button>
                  <button className="btn btn-outline" onClick={() => setEditing(false)}>取消</button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'reviews' && (
          <div>
            {myReviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div className="empty-state">
                  <div className="icon"><i className="fa-regular fa-comment-dots" /></div>
                  <h3>还没有评价过任何纸尿裤</h3>
                  <p>去纸尿裤页面留下你的评价吧</p>
                </div>
              </div>
            ) : (
              myReviews.map(r => {
                const d = diaperMap[r.diaper_id];
                const dims = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
                const avgScore = dims.filter(k => r[k] != null).reduce((sum, k) => sum + (r[k] || 0), 0) / (dims.filter(k => r[k] != null).length || 1);
                return (
                <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>
                      {d ? <Link to={`/diaper/${d.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{d.brand} {d.model}</Link> : `纸尿裤 #${r.diaper_id}`}
                    </strong>
                    <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                      <i className="fa-solid fa-star" /> {avgScore.toFixed(1)}/10
                    </span>
                  </div>
                  {r.review && <p style={{ margin: '4px 0', color: 'var(--text)' }}>{r.review}</p>}
                  <small style={{ color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString('zh-CN')}</small>
                </div>
              )})
            )}
          </div>
        )}

        {activeTab === 'feelings' && (
          <div>
            {myFeelings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div className="empty-state">
                  <div className="icon"><i className="fa-solid fa-heart" /></div>
                  <h3>还没有记录过使用感受</h3>
                </div>
                <Link to="/diapers" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                  去探索纸尿裤
                </Link>
              </div>
            ) : (
              myFeelings.map(f => {
                const d = diaperMap[f.diaper_id];
                return (
                <div key={f.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>
                      <Link to={`/diaper/${f.diaper_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        <i className="fa-solid fa-box" /> {d ? `${d.brand} ${d.model}` : `纸尿裤 #${f.diaper_id}`}
                      </Link>
                      <span className="tag" style={{ marginLeft: 8 }}>{f.size}码</span>
                    </strong>
                    <small style={{ color: 'var(--text-muted)' }}>{new Date(f.created_at).toLocaleDateString('zh-CN')}</small>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                    {Object.entries(FEELING_LABELS).map(([key, label]) => {
                      const val = f[key];
                      if (val == null) return null;
                      return (
                        <span key={key} style={{
                          padding: '2px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600,
                          background: val > 0 ? 'var(--success-bg)' : val < 0 ? 'var(--feeling-bg)' : 'var(--input-bg)',
                          color: val > 0 ? 'var(--success)' : val < 0 ? 'var(--danger)' : 'var(--text-muted)',
                        }}>
                          {label}: {val > 0 ? '+' : ''}{val}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )})
            )}
          </div>
        )}
      </div>
    </div>
  );
}
