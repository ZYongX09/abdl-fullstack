import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const VERSION = '5.7.10';

// Embedded changelog (kept in sync with CHANGELOG.md)
const CHANGELOG = [
  {
    version: 'v5.7.10',
    date: '2026-05-09',
    changes: [
      '侧边栏搜索框聚焦样式改用 CSS 实现',
      '活跃筛选标签增加独立圆形关闭按钮',
      '筛选标签排序名称中文化显示',
    ],
  },
  {
    version: 'v5.7.8',
    date: '2026-05-09',
    changes: [
      '头像悬停遮罩改用纯 CSS 实现',
      '侧边栏退出按钮样式优化',
      '个人信息卡片布局精简',
    ],
  },
  {
    version: 'v5.7.7',
    date: '2026-05-09',
    changes: [
      '修复对比工具残留数据导致结果展示错乱',
      '点赞按钮增加心形跳动动画',
      '版本号展示统一使用最新 Git tag',
    ],
  },
  {
    version: 'v5.7.6',
    date: '2026-05-09',
    changes: [
      '修复全局卡片滚动条显示问题',
      '将 overflow-y:auto 限定到弹窗区域',
    ],
  },
  {
    version: 'v5.7.5',
    date: '2026-05-09',
    changes: [
      '增强玻璃材质效果可见度',
      '修复弹窗滚动问题',
      '新增鼠标位置驱动的折射光晕模拟',
    ],
  },
  {
    version: 'v5.7.0 - v5.7.4',
    date: '2026-05-09',
    changes: [
      '密码强度指示器、表格响应式容器',
      '回车键快捷提交回复',
      '加载骨架、动画增强、移动端适配',
      '高级玻璃材质效果、全局鼠标追踪',
      'AI推荐删除按钮、对比工具增强',
    ],
  },
  {
    version: 'v5.6.x',
    date: '2026-05-08',
    changes: [
      '滚动进度条、图片渐进加载',
      '深色模式全面适配与修复',
      '快捷键支持、通知与私信增强',
    ],
  },
  {
    version: 'v5.5.x',
    date: '2026-05-07',
    changes: [
      '论坛帖子带图发布',
      'AI 推荐分桶策略优化',
      'Dark reader 伪元素不展示修复',
    ],
  },
  {
    version: 'v5.0.0 - v5.4.x',
    date: '2026-05-06',
    changes: [
      '使用感受评分系统（-5 ~ +5 滑块）',
      'AI 推荐隐私权限弹窗、用户头像上传',
      '深色/浅色模式切换、CSS 变量统一',
      '综合评分整合感受权重（90% + 10%）',
      'Font Awesome 图标、论坛搜索、术语 Wiki',
    ],
  },
];

export default function About() {
  const [showChangelog, setShowChangelog] = useState(true);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="hero-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>
          <i className="fa-solid fa-baby" style={{ color: 'var(--primary-dark)' }} />
        </div>
        <h1 style={{ fontSize: '1.8rem', marginBottom: 4 }}>ABDL Space</h1>
        <p style={{ color: 'var(--hero-text)', fontSize: '1rem', fontWeight: 500 }}>
          <i className="fa-solid fa-code-branch" /> {VERSION}
        </p>
        <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: '0.9rem' }}>
          纸尿裤评测与推荐平台 — 帮助成年用户找到最适合的纸尿裤
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>
            <i className="fa-solid fa-clock-rotate-left" /> 更新日志
          </h3>
          <button className="btn btn-outline btn-sm" onClick={() => setShowChangelog(!showChangelog)}>
            {showChangelog ? '收起' : '展开'}
          </button>
        </div>

        {showChangelog && (
          <div>
            {CHANGELOG.map((entry, i) => (
              <div key={entry.version} style={{
                padding: '16px 0',
                borderBottom: i < CHANGELOG.length - 1 ? '1px solid var(--border)' : 'none',
                animation: `fadeInUp 0.3s ease-out ${i * 0.05}s both`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{
                    background: 'var(--primary)',
                    color: 'white',
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}>
                    {entry.version}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{entry.date}</span>
                </div>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  {entry.changes.map((c, j) => (
                    <li key={j} style={{ fontSize: '0.9rem', marginBottom: 3, color: 'var(--text-light)' }}>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>
          <i className="fa-solid fa-circle-info" /> 技术栈
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { name: 'React 18', icon: 'fa-brands fa-react', desc: '前端框架' },
            { name: 'Vite 5', icon: 'fa-solid fa-bolt', desc: '构建工具' },
            { name: 'Font Awesome 6', icon: 'fa-solid fa-icons', desc: '图标库' },
            { name: 'DeepSeek', icon: 'fa-solid fa-robot', desc: 'AI 推荐' },
            { name: 'localStorage', icon: 'fa-solid fa-database', desc: '数据存储' },
            { name: 'GitHub', icon: 'fa-brands fa-github', desc: '代码托管' },
          ].map(tech => (
            <div key={tech.name} style={{
              padding: 12, borderRadius: 'var(--radius-sm)',
              background: 'var(--rating-bg)', border: '1px solid var(--rating-border)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.5rem', color: 'var(--primary-dark)', marginBottom: 4 }}>
                <i className={tech.icon} />
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{tech.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tech.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>
          <i className="fa-solid fa-keyboard" /> 快捷键
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 8 }}>
          {[
            { keys: 'Ctrl+Shift+T', desc: '切换深色/浅色模式' },
            { keys: 'Alt+1', desc: '论坛首页' },
            { keys: 'Alt+2', desc: '纸尿裤列表' },
            { keys: 'Alt+3', desc: '排行榜' },
            { keys: 'Alt+4', desc: 'AI 智能推荐' },
            { keys: 'Alt+5', desc: '术语 Wiki' },
            { keys: 'Alt+6', desc: '个人中心' },
            { keys: 'Alt+7', desc: '对比工具' },
            { keys: 'Alt+8', desc: '私信 & 通知' },
            { keys: 'Alt+9', desc: '关于页面' },
            { keys: 'Ctrl+D', desc: '跳转纸尿裤列表' },
          ].map(s => (
            <div key={s.keys} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: '0.88rem' }}>
              <kbd style={{
                background: 'var(--input-bg)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '2px 8px', fontSize: '0.78rem',
                fontFamily: 'monospace', whiteSpace: 'nowrap',
              }}>{s.keys}</kbd>
              <span style={{ color: 'var(--text-light)' }}>{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 8 }}>
          <i className="fa-solid fa-shield-halved" /> 隐私说明
        </p>
        <p style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>
          AI 推荐功能由 DeepSeek 提供支持。用户可选择发送哪些数据，详见推荐页面的隐私弹窗。
          所有评分和感受数据仅存储在本地浏览器中。
        </p>
      </div>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Link to="/" className="btn btn-outline">
          <i className="fa-solid fa-house" /> 返回首页
        </Link>
      </div>
    </div>
  );
}
