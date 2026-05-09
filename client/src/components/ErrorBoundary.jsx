import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          textAlign: 'center', padding: '60px 20px', maxWidth: 500, margin: '0 auto',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: 'var(--feeling-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: '2rem',
          }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--danger)' }} />
          </div>
          <h2 style={{ marginBottom: 8 }}>页面出错了</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: '0.9rem', lineHeight: 1.6 }}>
            抱歉，这个组件遇到了意外错误。请尝试刷新页面。
          </p>
          {this.state.error && (
            <details style={{
              textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)',
              background: 'var(--input-bg)', padding: '10px 14px', borderRadius: 8,
              marginBottom: 20,
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>错误详情</summary>
              <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button className="btn btn-primary" onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}>
            <i className="fa-solid fa-rotate-right" /> 刷新页面
          </button>
          {this.props.fallback}
        </div>
      );
    }

    return this.props.children;
  }
}
