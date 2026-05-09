import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { getRecommendStream } from '../api';

const DATA_OPTIONS = [
  { key: 'basic', label: '基本信息', desc: '年龄、地区', icon: 'fa-user' },
  { key: 'body', label: '身材数据', desc: '体重、腰围、臀围', icon: 'fa-ruler' },
  { key: 'prefs', label: '偏好款式', desc: '你偏好的纸尿裤款式', icon: 'fa-heart' },
  { key: 'bio', label: '个人简介', desc: '你在个人资料中填写的简介', icon: 'fa-pen' },
  { key: 'feelings', label: '使用感受记录', desc: '你对各款纸尿裤的感受评分', icon: 'fa-note-sticky' },
];

export default function Recommendations() {
  const { user } = useAuth();
  const [streaming, setStreaming] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [profileWarning, setProfileWarning] = useState(false);
  const chatEndRef = useRef(null);

  // Permission modal
  const [showPermission, setShowPermission] = useState(false);
  const [dataSelection, setDataSelection] = useState({
    basic: true, body: true, prefs: true, bio: true, feelings: true,
  });

  useEffect(() => {
    if (user) {
      const h = JSON.parse(localStorage.getItem('abdl_rec_history') || '[]');
      setHistory(h.slice(0, 5));
    }
  }, [user]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <h2><i className="fa-solid fa-robot" /> AI 智能推荐</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>请先登录以获取个性化推荐</p>
        <Link to="/login" className="btn btn-primary" style={{ marginTop: 20 }}>去登录</Link>
      </div>
    );
  }

  const profileComplete = user.weight || user.waist || user.hip || user.style_preference;

  const anySelected = () => Object.values(dataSelection).some(v => v);

  const toggleSelection = (key) => {
    setDataSelection(prev => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
  };

  const openPermission = () => {
    if (!profileComplete) {
      setProfileWarning(true);
      return;
    }
    setProfileWarning(false);
    // Reset to all selected
    setDataSelection({ basic: true, body: true, prefs: true, bio: true, feelings: true });
    setShowPermission(true);
  };

  const confirmAndStart = () => {
    if (!anySelected()) return;
    setShowPermission(false);
    startRecommend();
  };

  const startRecommend = () => {
    setStreaming(true);
    setStatusText('');
    setResult(null);
    setError('');

    getRecommendStream(
      dataSelection,
      (chunk) => {
        setStatusText(prev => prev + chunk);
        if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      },
      (data) => {
        setResult(data);
        setStreaming(false);
        if (data.recommendations) {
          const h = JSON.parse(localStorage.getItem('abdl_rec_history') || '[]');
          h.unshift({ time: new Date().toISOString(), data, preview: data.summary?.substring(0, 80) });
          localStorage.setItem('abdl_rec_history', JSON.stringify(h.slice(0, 10)));
          setHistory(h.slice(0, 5));
        }
      },
      (err) => {
        setError(err);
        setStreaming(false);
      }
    );
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Permission Modal */}
      {showPermission && createPortal(
        <div className="modal-overlay" onClick={() => setShowPermission(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h2 style={{ marginBottom: 8 }}><i className="fa-solid fa-shield-halved" style={{ color: 'var(--primary-dark)' }} /> 数据隐私说明</h2>
            <div className="alert alert-warning" style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
              <strong>⚠️ 重要提醒：</strong>AI 智能推荐功能由 <strong>DeepSeek</strong> 提供支持。
              您选择的个人数据将被发送到 DeepSeek 服务器进行处理。<br />
              我们不会存储您的 AI 对话记录，但建议您不要发送敏感信息。
            </div>

            <h4 style={{ marginBottom: 12, marginTop: 16 }}>请选择要发送给 AI 的数据：</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DATA_OPTIONS.map(opt => (
                <label key={opt.key} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 10,
                  background: dataSelection[opt.key] ? 'var(--primary-light)' : 'var(--input-bg)',
                  border: `2px solid ${dataSelection[opt.key] ? 'var(--primary)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  <input
                    type="checkbox"
                    checked={dataSelection[opt.key]}
                    onChange={() => toggleSelection(opt.key)}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                      <i className={`fa-solid ${opt.icon}`} style={{ marginRight: 6, color: 'var(--primary-dark)' }} />
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowPermission(false)}>返回</button>
              <button
                className="btn btn-primary"
                onClick={confirmAndStart}
                disabled={!anySelected()}
                style={!anySelected() ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                title={!anySelected() ? '请至少选择一项数据' : ''}
              >
                <i className="fa-solid fa-check" /> 确认并开始推荐
              </button>
            </div>
            {!anySelected() && (
              <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 8, textAlign: 'center' }}>
                <i className="fa-solid fa-triangle-exclamation" /> 必须至少选择一项数据才能使用 AI 推荐
              </p>
            )}
          </div>
        </div>,
        document.body
      )}

      <div className="hero-card" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: 8 }}><i className="fa-solid fa-robot" /> AI 智能推荐</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.9rem' }}>
          根据你的身材数据和偏好，AI 为你挑选最合适的纸尿裤
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          {user.weight && <span className="tag"><i className="fa-solid fa-weight-scale" /> {user.weight}kg</span>}
          {user.waist && <span className="tag"><i className="fa-solid fa-ruler" /> 腰围 {user.waist}cm</span>}
          {user.hip && <span className="tag"><i className="fa-solid fa-ruler" /> 臀围 {user.hip}cm</span>}
          {user.style_preference && <span className="tag"><i className="fa-solid fa-heart" /> {user.style_preference}</span>}
        </div>
        {profileWarning && (
          <div className="alert alert-info" style={{ marginBottom: 12, fontSize: '0.9rem' }}>
            <i className="fa-solid fa-circle-info" /> 请先前往 <Link to="/profile" style={{ fontWeight: 700 }}>个人中心</Link> 完善个人资料
          </div>
        )}
        {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}><i className="fa-solid fa-circle-exclamation" /> {error}</div>}
        <button className="btn btn-accent" style={{ fontSize: '1.1rem', padding: '12px 40px' }} onClick={openPermission} disabled={streaming}>
          {streaming ? <><i className="fa-solid fa-spinner fa-spin" /> 分析中...</> : <><i className="fa-solid fa-wand-magic-sparkles" /> 开始推荐</>}
        </button>
      </div>

      {/* Streaming output */}
      {statusText && (
        <div className="card" style={{ marginBottom: 16, maxHeight: 300, overflowY: 'auto', background: 'var(--rating-bg)', fontSize: '0.9rem', lineHeight: 1.6, fontFamily: 'var(--font)' }}>
          {statusText.split('\n').map((line, i) => <p key={i} style={{ margin: 0 }}>{line}</p>)}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Result cards */}
      {result && result.recommendations && (
        <div>
          {result.summary && (
            <div className="alert alert-info" style={{ marginBottom: 12 }}><i className="fa-solid fa-lightbulb" /> {result.summary}</div>
          )}
          <div style={{ display: 'grid', gap: 12 }}>
            {result.recommendations.map((rec, i) => (
              <Link key={i} to={`/diaper/${rec.diaper_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 18 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)', flexShrink: 0
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{rec.brand} — {rec.model}</div>
                    {rec.reason && <div style={{ fontSize: '0.88rem', color: 'var(--text)', marginTop: 4 }}><i className="fa-solid fa-thumbs-up" style={{ color: 'var(--accent)', marginRight: 4 }} />{rec.reason}</div>}
                  </div>
                  <div style={{
                    padding: '6px 14px', borderRadius: 20, background: rec.matchScore >= 90 ? 'var(--success-bg)' : rec.matchScore >= 70 ? 'var(--warning-bg)' : 'var(--input-bg)',
                    fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap'
                  }}>
                    {rec.matchScore}%
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Error from AI */}
      {result && result.error && (
        <div className="alert alert-warning" style={{ marginTop: 12 }}>
          <i className="fa-solid fa-triangle-exclamation" /> AI 返回格式异常：{result.raw?.substring(0, 200)}...
        </div>
      )}

      {/* History */}
      {history.length > 0 && !streaming && !result && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}><i className="fa-solid fa-clock-rotate-left" /> 推荐历史</h3>
          {history.map((h, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i < history.length-1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
              onClick={() => setResult(h.data)}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(h.time).toLocaleString('zh-CN')}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{h.preview || '查看推荐结果'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
