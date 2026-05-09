import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (p) => location.pathname.startsWith(p) ? 'active' : '';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <i className="fa-solid fa-baby" /> ABDL Space
      </Link>
      <div className="navbar-links">
        <Link to="/" className={isActive('/diaper')||location.pathname==='/'?'active':''}>
          <i className="fa-solid fa-house" /> 首页
        </Link>
        <Link to="/rankings" className={isActive('/rankings')}>
          <i className="fa-solid fa-trophy" /> 排行榜
        </Link>
        <Link to="/forum" className={isActive('/forum')}>
          <i className="fa-regular fa-comments" /> 论坛
        </Link>
        <Link to="/termwiki" className={isActive('/termwiki')}>
          <i className="fa-solid fa-book" /> 术语
        </Link>
        {user && (
          <Link to="/recommend" className={isActive('/recommend')}>
            <i className="fa-solid fa-robot" /> 推荐
          </Link>
        )}
      </div>
      <div className="navbar-user">
        {user ? (<>
          {user.role==='admin' && <span className="role-badge admin">管理员</span>}
          <Link to="/profile" className="btn btn-outline btn-sm">
            <i className="fa-solid fa-user" /> {user.username}
          </Link>
          <button className="btn btn-outline btn-sm" onClick={()=>{logout();navigate('/');}}>
            <i className="fa-solid fa-right-from-bracket" /> 退出
          </button>
        </>) : (<>
          <Link to="/login" className="btn btn-outline btn-sm">登录</Link>
          <Link to="/register" className="btn btn-primary btn-sm">注册</Link>
        </>)}
      </div>
    </nav>
  );
}
