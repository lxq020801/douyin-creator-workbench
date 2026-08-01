import { Clapperboard } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { AccountMenu } from './AccountMenu';

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

        <AccountMenu />
      </div>
    </header>
  );
}
