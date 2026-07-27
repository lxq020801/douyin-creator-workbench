import { ArrowRight, FileSearch, Plus, Search, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProductHeader } from '../components/ProductHeader';

type RecordKind = 'video' | 'account';

interface WorkspaceRecord {
  id: string;
  kind: RecordKind;
  title: string;
  source: string;
  createdAt: string;
  summary: string;
}

const records: WorkspaceRecord[] = [
  { id: 'video-01', kind: 'video', title: '一条视频，拆出 20 个能直接拍的选题', source: '@内容实验室 · 单条视频', createdAt: '今天 16:40', summary: '结果前置、真实过程举证，以及可计数的选题交付。' },
  { id: 'account-01', kind: 'account', title: '内容实验室 · 账号全景研究', source: '50 条作品 · 账号研究', createdAt: '昨天 22:18', summary: '从工具实测到公开实验，梳理账号的内容方向与起量路径。' },
  { id: 'video-02', kind: 'video', title: '为什么 AI 写的选题总有一股 AI 味', source: '@创作方法局 · 单条视频', createdAt: '07-25 19:20', summary: '对比 AI 直接生成与编导判断介入后的内容差异。' },
  { id: 'account-02', kind: 'account', title: '餐饮老板说 · 账号方向研究', source: '50 条作品 · 账号研究', createdAt: '07-24 14:08', summary: '识别门店实拍、老板口播和顾客反馈三类稳定内容。' },
];

export function WorkspaceOverviewPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | RecordKind>('all');
  const [query, setQuery] = useState('');

  const visibleRecords = useMemo(() => records.filter((record) => {
    const matchesKind = filter === 'all' || record.kind === filter;
    const matchesQuery = `${record.title}${record.source}${record.summary}`.includes(query.trim());
    return matchesKind && matchesQuery;
  }), [filter, query]);

  const openRecord = (record: WorkspaceRecord) => navigate('/workspace/result', { state: { kind: record.kind, recordId: record.id } });
  const recent = records[0];

  return (
    <div className="workspace-overview-v3">
      <ProductHeader />
      <main className="workspace-overview-v3-main">
        <header className="workspace-overview-v3-heading">
          <div>
            <span className="workspace-eyebrow-v3">WORKSPACE / 工作台</span>
            <h1>创作记录 <small>0{records.length}</small></h1>
          </div>
          <Link to="/"><Plus size={17} /> 新建拆解</Link>
        </header>

        <section className="recent-record-v3">
          <div className="recent-record-v3-label">RECENT / 最近一次</div>
          <button type="button" onClick={() => openRecord(recent)}>
            <span className="record-symbol-v3"><FileSearch size={21} /></span>
            <span className="recent-record-v3-copy"><small>{recent.source}</small><strong>{recent.title}</strong><p>{recent.summary}</p></span>
            <span className="recent-record-v3-time">{recent.createdAt}</span>
            <ArrowRight size={20} />
          </button>
        </section>

        <section className="records-section-v3">
          <header>
            <div><span className="workspace-eyebrow-v3">ARCHIVE</span><h2>全部记录</h2></div>
            <div className="records-tools-v3">
              <div className="records-filter-v3" role="tablist" aria-label="筛选记录">
                {(['all', 'video', 'account'] as const).map((item) => <button key={item} type="button" className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{({ all: '全部', video: '单条视频', account: '账号研究' } as const)[item]}</button>)}
              </div>
              <label className="records-search-v3"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索记录" /></label>
            </div>
          </header>

          <div className="records-list-v3">
            {visibleRecords.map((record) => (
              <button type="button" key={record.id} onClick={() => openRecord(record)}>
                <span className={`record-symbol-v3 record-symbol-v3--${record.kind}`}>{record.kind === 'video' ? <FileSearch size={19} /> : <UsersRound size={19} />}</span>
                <span className="record-copy-v3"><small>{record.kind === 'video' ? '单条视频' : '账号研究'}</small><strong>{record.title}</strong><p>{record.summary}</p></span>
                <span className="record-meta-v3"><strong>{record.createdAt}</strong><small>{record.source}</small></span>
                <ArrowRight size={18} />
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
