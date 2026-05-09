import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

function getStoredSetting(key, fallback) {
  try { return JSON.parse(localStorage.getItem('abdl_settings_' + key)); } catch { return fallback; }
}
function setStoredSetting(key, val) {
  localStorage.setItem('abdl_settings_' + key, JSON.stringify(val));
}

export default function Settings() {
  const { user } = useAuth();
  const [theme, setTheme] = useState(() => getStoredSetting('theme') || localStorage.getItem('abdl_theme') || 'system');
  const [animations, setAnimations] = useState(() => getStoredSetting('animations') ?? true);
  const [aiPrivacy, setAiPrivacy] = useState(() => getStoredSetting('aiPrivacy') || { basic: true, body: true, prefs: true, bio: false, feelings: true });
  const [msg, setMsg] = useState('');
  const [glassEffect, setGlassEffect] = useState(() => getStoredSetting('glassEffect') ?? false);

  // Apply glass effect — NO cleanup so it persists across page navigation
  useEffect(() => {
    setStoredSetting('glassEffect', glassEffect);
    document.documentElement.classList.toggle('glass-enabled', glassEffect);
  }, [glassEffect]);

  // Apply theme
  useEffect(() => {
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.setAttribute('data-theme', resolved);
    localStorage.setItem('abdl_theme', resolved);
    setStoredSetting('theme', theme);
  }, [theme]);

  // Apply animation preference
  useEffect(() => {
    setStoredSetting('animations', animations);
    document.documentElement.style.setProperty('--animation-duration', animations ? '' : '0s');
  }, [animations]);

  const toggleAiPrivacy = (key) => {
    setAiPrivacy(prev => {
      const next = { ...prev, [key]: !prev[key] };
      setStoredSetting('aiPrivacy', next);
      return next;
    });
  };

  const handleClearData = (type) => {
    if (!confirm(`确定清除${type}？此操作不可撤销。`)) return;
    if (type === 'ratings') {
      localStorage.removeItem('abdl_ratings');
    } else if (type === 'feelings') {
      localStorage.removeItem('abdl_feelings');
    } else if (type === 'history') {
      localStorage.removeItem('abdl_rec_history');
    } else if (type === 'all') {
      const keep = ['abdl_users', 'abdl_currentUser', 'abdl_theme', 'abdl_settings_theme', 'abdl_settings_animations'];
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('abdl_') && !keep.includes(k)) localStorage.removeItem(k);
      });
    }
    setMsg('cleared:' + type);
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 20 }}>
        <i className="fa-solid fa-gear" /> 设置
      </h2>

      {msg && (
        <div className="alert alert-success" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <i className="fa-solid fa-circle-check" /> {msg.startsWith('cleared:') ? '数据已清除' : msg}
        </div>
      )}

      {/* 外观 */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>
          <i className="fa-solid fa-palette" /> 外观
        </h3>

        <div className="form-group">
          <label>主题模式</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: 'light', label: '浅色', icon: 'fa-sun' },
              { key: 'dark', label: '深色', icon: 'fa-moon' },
              { key: 'system', label: '跟随系统', icon: 'fa-display' },
            ].map(opt => (
              <button key={opt.key}
                className={`btn btn-sm ${theme === opt.key ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setTheme(opt.key)}>
                <i className={`fa-solid ${opt.icon}`} /> {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span>
              <i className="fa-solid fa-film" style={{ marginRight: 8 }} />
              交互动画
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>关闭后所有过渡和动画效果将停止</div>
            </span>
            <button
              className={`btn btn-sm ${animations ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setAnimations(!animations)}
              style={{ minWidth: 80, textAlign: 'center' }}>
              {animations ? '已开启' : '已关闭'}
            </button>
          </label>
        </div>

        <div className="form-group" style={{ marginTop: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span>
              <i className="fa-solid fa-gem" style={{ marginRight: 8 }} />
              高级材质
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>卡片和面板使用半透明毛玻璃质感，带环境光流动</div>
            </span>
            <button
              className={`btn btn-sm ${glassEffect ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setGlassEffect(!glassEffect)}
              style={{ minWidth: 80, textAlign: 'center' }}>
              {glassEffect ? '已开启' : '已关闭'}
            </button>
          </label>
        </div>
      </div>

      {/* AI 隐私 */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>
          <i className="fa-solid fa-shield-halved" /> AI 推荐隐私
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          设置 AI 推荐时默认发送哪些个人数据（可在推荐页面临时修改）
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { key: 'basic', label: '基本信息', desc: '年龄、地区', icon: 'fa-user' },
            { key: 'body', label: '身材数据', desc: '体重、腰围、臀围', icon: 'fa-ruler' },
            { key: 'prefs', label: '偏好款式', desc: '你偏好的纸尿裤款式', icon: 'fa-heart' },
            { key: 'bio', label: '个人简介', desc: '个人资料中的简介', icon: 'fa-pen' },
            { key: 'feelings', label: '使用感受记录', desc: '你对各款纸尿裤的感受评分', icon: 'fa-note-sticky' },
          ].map(opt => (
            <label key={opt.key} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
              borderRadius: 8, cursor: 'pointer',
              background: aiPrivacy[opt.key] ? 'var(--primary-light)' : 'var(--input-bg)',
              border: `1px solid ${aiPrivacy[opt.key] ? 'var(--primary)' : 'var(--border)'}`,
              transition: 'all 0.2s',
            }}>
              <input type="checkbox" checked={aiPrivacy[opt.key]} onChange={() => toggleAiPrivacy(opt.key)}
                style={{ accentColor: 'var(--primary)' }} />
              <i className={`fa-solid ${opt.icon}`} style={{ color: 'var(--primary-dark)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{opt.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 数据管理 */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>
          <i className="fa-solid fa-database" /> 数据管理
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          管理本地存储的数据。所有数据仅保存在你的浏览器中。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { type: 'ratings', label: '清除评分记录', desc: '删除你对纸尿裤的所有评分', icon: 'fa-star' },
            { type: 'feelings', label: '清除使用感受', desc: '删除所有使用感受记录', icon: 'fa-heart' },
            { type: 'history', label: '清除推荐历史', desc: '删除 AI 推荐历史记录', icon: 'fa-clock-rotate-left' },
            { type: 'all', label: '清除全部缓存', desc: '清除帖子、评论等所有本地数据（保留账号和设置）', icon: 'fa-triangle-exclamation', danger: true },
          ].map(item => (
            <div key={item.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  <i className={`fa-solid ${item.icon}`} style={{ marginRight: 6, color: item.danger ? 'var(--danger)' : 'var(--text-muted)' }} />
                  {item.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
              <button className={`btn btn-sm ${item.danger ? 'btn-danger' : 'btn-outline'}`}
                onClick={() => handleClearData(item.type)}>
                清除
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 关于 */}
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>
          <i className="fa-solid fa-circle-info" /> 关于
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>版本</span>
            <span>v5.7.7</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>数据存储</span>
            <span>浏览器 localStorage</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>AI 服务</span>
            <span>DeepSeek</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>当前用户</span>
            <span>{user ? '@' + user.username : '未登录'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
