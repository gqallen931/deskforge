import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error, info) {
    console.error('Deskforge renderer failure', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="rx-fatal">
      <div className="auth-logo">DF</div>
      <h1>界面加载遇到问题</h1>
      <p>本地数据没有被删除。重新载入即可再次进入工作台。</p>
      <button onClick={() => window.location.reload()}>重新载入 Deskforge</button>
    </main>;
  }
}
