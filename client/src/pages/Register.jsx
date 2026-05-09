import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Register() {
  const [form, setForm] = useState({
    username: '', email: '', password: '',
    age: '', region: '', weight: '', waist: '', hip: '', style_preference: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  // Auto-focus username field
  useEffect(() => { usernameRef.current?.focus(); }, []);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const p = form.password;
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }, [form.password]);
  const strengthColors = ['', '#E8837C', '#F0C040', '#7BC67E', '#5DAE60', '#2E7D32'];
  const strengthLabels = ['', '弱', '较弱', '一般', '强', '很强'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = {
        username: form.username,
        password: form.password,
        email: form.email || undefined,
        age: form.age ? Number(form.age) : undefined,
        region: form.region || undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        waist: form.waist ? Number(form.waist) : undefined,
        hip: form.hip ? Number(form.hip) : undefined,
        style_preference: form.style_preference || undefined,
      };
      await register(body);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto' }}>
      <div className="card">
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>
          <i className="fa-solid fa-user-plus" style={{ color: 'var(--accent)' }} /> 加入 ABDL Space
        </h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名 *</label>
            <input ref={usernameRef} className="form-control" value={form.username} onChange={update('username')} placeholder="你的昵称" required />
          </div>
          <div className="form-group">
            <label>邮箱</label>
            <input className="form-control" type="email" value={form.email} onChange={update('email')} placeholder="选填" />
          </div>
          <div className="form-group">
            <label>密码 *</label>
            <div style={{ position: 'relative' }}>
              <input className="form-control" type={showPassword ? 'text' : 'password'} value={form.password}
                onChange={update('password')} placeholder="至少 6 位" required
                style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  fontSize: '1rem', padding: '6px 10px', borderRadius: 6 }}
                tabIndex={-1} aria-label={showPassword ? '隐藏密码' : '显示密码'}>
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
            {form.password.length > 0 && (
              <div className="password-strength">
                <div className="password-strength-bar">
                  <div className="password-strength-bar-fill" style={{
                    width: `${(passwordStrength / 5) * 100}%`,
                    background: strengthColors[passwordStrength]
                  }} />
                </div>
                <span className="password-strength-text" style={{ color: strengthColors[passwordStrength] }}>
                  密码强度: {strengthLabels[passwordStrength]}
                </span>
              </div>
            )}
          </div>
          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
            <i className="fa-solid fa-circle-info" /> 以下信息帮助 AI 为你推荐最合适的纸尿裤（选填，可后续补充）
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group">
              <label>年龄</label>
              <input className="form-control" type="number" value={form.age} onChange={update('age')} placeholder="岁" />
            </div>
            <div className="form-group">
              <label>地区</label>
              <input className="form-control" value={form.region} onChange={update('region')} placeholder="城市" />
            </div>
            <div className="form-group">
              <label>体重 (kg)</label>
              <input className="form-control" type="number" step="0.1" value={form.weight} onChange={update('weight')} placeholder="kg" />
            </div>
            <div className="form-group">
              <label>腰围 (cm)</label>
              <input className="form-control" type="number" step="0.1" value={form.waist} onChange={update('waist')} placeholder="cm" />
            </div>
            <div className="form-group">
              <label>臀围 (cm)</label>
              <input className="form-control" type="number" step="0.1" value={form.hip} onChange={update('hip')} placeholder="cm" />
            </div>
            <div className="form-group">
              <label>偏好款式</label>
              <input className="form-control" value={form.style_preference} onChange={update('style_preference')} placeholder="如：日系可爱" />
            </div>
          </div>
          <button className="btn btn-accent" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? <><i className="fa-solid fa-spinner fa-spin" /> 注册中...</> : <><i className="fa-solid fa-baby" /> 注册</>}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.9rem' }}>
          已有账号？<Link to="/login">去登录</Link>
        </p>
      </div>
    </div>
  );
}
