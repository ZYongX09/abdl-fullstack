import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BackToTop from './components/BackToTop';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalMouseTracker from './components/GlobalMouseTracker';
import ForumFeed from './pages/ForumFeed';
import PostDetail from './pages/PostDetail';
import NotificationsPage from './pages/NotificationsPage';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import DiaperDetail from './pages/DiaperDetail';
import Profile from './pages/Profile';
import Rankings from './pages/Rankings';
import Recommendations from './pages/Recommendations';
import TermWiki from './pages/TermWiki';
import AdminPage from './pages/AdminPage';
import ComparePage from './pages/ComparePage';
import MessagesPage from './pages/MessagesPage';
import UserPage from './pages/UserPage';
import About from './pages/About';
import Settings from './pages/Settings';

function getInitialTheme() {
  const saved = localStorage.getItem('abdl_theme');
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="scroll-progress" style={{ width: `${progress}%` }} />
  );
}

const ROUTE_TITLES = {
  '/': '论坛 — ABDL Space',
  '/diapers': '纸尿裤列表 — ABDL Space',
  '/rankings': '排行榜 — ABDL Space',
  '/compare': '对比工具 — ABDL Space',
  '/recommend': 'AI 推荐 — ABDL Space',
  '/termwiki': '术语 Wiki — ABDL Space',
  '/profile': '个人中心 — ABDL Space',
  '/login': '登录 — ABDL Space',
  '/register': '注册 — ABDL Space',
  '/messages': '私信 — ABDL Space',
  '/notifications': '通知 — ABDL Space',
  '/admin': '管理后台 — ABDL Space',
  '/about': '关于 — ABDL Space',
  '/settings': '设置 — ABDL Space',
};

function getTitle(pathname) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith('/diaper/')) return '纸尿裤详情 — ABDL Space';
  if (pathname.startsWith('/forum/')) return '帖子详情 — ABDL Space';
  if (pathname.startsWith('/user/')) return '用户主页 — ABDL Space';
  if (pathname.startsWith('/about')) return '关于 — ABDL Space';
  if (pathname.startsWith('/settings')) return '设置 — ABDL Space';
  return 'ABDL Space';
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = getTitle(pathname);
  }, [pathname]);
  return null;
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('abdl_theme', theme);
  }, [theme]);

  // Initialize glass effect from settings
  useEffect(() => {
    try {
      const glass = JSON.parse(localStorage.getItem('abdl_settings_glassEffect'));
      if (glass) document.documentElement.classList.add('glass-enabled');
    } catch {}
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const navigate = useNavigate();

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;

      // Ctrl+Shift+T: Toggle theme
      if (ctrl && e.shiftKey && key === 't') { e.preventDefault(); toggleTheme(); return; }

      // Alt+1..9: Navigate pages
      const navMap = { '1': '/', '2': '/diapers', '3': '/rankings', '4': '/recommend', '5': '/termwiki', '6': '/profile', '7': '/compare', '8': '/messages', '9': '/about' };
      if (alt && navMap[key]) { e.preventDefault(); navigate(navMap[key]); return; }

      // G then H: Go Home
      if (key === 'h' && !ctrl && !alt) { e.preventDefault(); navigate('/'); return; }
      // G then D: Go Diapers
      if (key === 'd' && ctrl && !alt) { e.preventDefault(); navigate('/diapers'); return; }
      // Escape: close modals, go back
      if (key === 'escape') { /* handled by individual components */ return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [theme]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <GlobalMouseTracker />
      <ScrollToTop />
      <Sidebar />
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>

        <div className="container page-enter" style={{ maxWidth: 800, padding: '24px 20px' }}>
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<ForumFeed />} />
            <Route path="/forum/:id" element={<PostDetail />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/diapers" element={<Home />} />
            <Route path="/diaper/:id" element={<DiaperDetail />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/recommend" element={<Recommendations />} />
            <Route path="/termwiki" element={<TermWiki />} />
            <Route path="/user/:id" element={<UserPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
          </ErrorBoundary>
        </div>
        <footer style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <i className="fa-solid fa-baby" style={{ color: 'var(--primary)' }} /> ABDL Space v5 · © {new Date().getFullYear()} · <a href="/about" style={{ color: 'var(--link-color)' }}>关于</a> · <a href="/settings" style={{ color: 'var(--link-color)' }}>设置</a> · <a href="/" style={{ color: 'var(--link-color)' }}>论坛</a> · <a href="/termwiki" style={{ color: 'var(--link-color)' }}>术语</a> · <a href="https://github.com/ZYongX09/abdl" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--link-color)' }}><i className="fa-brands fa-github" /> GitHub</a>
        </footer>
      </div>
      <ScrollProgress />
      <BackToTop />
    </div>
  );
}
