import { Clapperboard, Settings } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

export function ProductHeader() {
  return (
    <header className="product-header-v3">
      <div className="product-header-v3-inner">
        <Link className="v2-brand" to="/">
          <span className="v2-brand-mark"><Clapperboard size={17} /></span>
          <span><strong>视频对标工具</strong><small>VIDEO BENCHMARK</small></span>
        </Link>

        <nav className="product-nav-v3" aria-label="主要页面">
          <NavLink to="/" end>首页</NavLink>
          <Link to="/#history">创作记录</Link>
        </nav>

        <Link className="v2-icon-link" to="/admin/settings" aria-label="管理员设置" title="管理员设置"><Settings size={18} /></Link>
      </div>
    </header>
  );
}
