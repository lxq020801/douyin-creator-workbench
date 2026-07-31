import { ArrowRight, FileSearch, LoaderCircle, Search, Trash2, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { AnalysisRecord, ExternalVideoBreakdown, VideoSource } from '../types';

type RecordKind = 'video' | 'account';

function statusLabel(status: AnalysisRecord['status']) {
  return ({ queued: '排队中', running: '处理中', completed: '已完成', failed: '失败', cancelled: '已取消' } as const)[status];
}

function recordVideoSource(record: AnalysisRecord): Partial<VideoSource> | null {
  if (record.kind !== 'video') return null;
  const reportSource = record.report && 'source' in record.report
    ? (record.report as ExternalVideoBreakdown).source
    : null;
  return reportSource || (record.metadata as Partial<VideoSource> | null);
}

function RecordVisual({ record }: { record: AnalysisRecord }) {
  const source = recordVideoSource(record);
  if (source?.coverUrl) {
    return <span className="record-cover-v3">
      <img src={source.coverUrl} alt="" />
      {source.duration ? <small>{source.duration}</small> : null}
    </span>;
  }
  return <span className={`record-symbol-v3 record-symbol-v3--${record.kind}`}>{record.kind === 'video' ? <FileSearch size={19} /> : <UsersRound size={19} />}</span>;
}

export function AnalysisHistorySection() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [filter, setFilter] = useState<'all' | RecordKind>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const load = async () => {
    try {
      setRecords(await api.analyses.list());
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!records.some((record) => record.status === 'queued' || record.status === 'running')) return;
    const timer = window.setInterval(() => void load(), 2400);
    return () => window.clearInterval(timer);
  }, [records]);

  const visibleRecords = useMemo(() => records.filter((record) => {
    const matchesKind = filter === 'all' || record.kind === filter;
    const matchesQuery = `${record.title}${record.source}${record.detail}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesKind && matchesQuery;
  }), [records, filter, query]);

  const deleteRecord = async (record: AnalysisRecord) => {
    if (!window.confirm(`删除“${record.title}”及其选题和脚本？此操作无法撤销。`)) return;
    setDeletingId(record.id);
    try {
      await api.analyses.remove(record.id);
      setRecords((items) => items.filter((item) => item.id !== record.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除记录失败');
    } finally {
      setDeletingId('');
    }
  };

  return <section className="home-history-v3" id="history" aria-labelledby="history-title">
    <div className="home-history-v3-inner">
      <header className="home-history-v3-heading">
        <div>
          <span className="workspace-eyebrow-v3">HISTORY / 创作记录</span>
          <h2 id="history-title">以前的拆解记录 <small>{String(records.length).padStart(2, '0')}</small></h2>
          <p>点击一条记录，直接回到对应的拆解结果。</p>
        </div>
        <div className="records-tools-v3">
          <div className="records-filter-v3" role="tablist" aria-label="筛选记录">
            {(['all', 'video', 'account'] as const).map((item) => <button key={item} type="button" className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{({ all: '全部', video: '单条视频', account: '账号研究' } as const)[item]}</button>)}
          </div>
          <label className="records-search-v3"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索记录" /></label>
        </div>
      </header>

      <div className="records-list-v3 home-records-list-v3">
        {loading ? <div className="empty-state">正在读取本地历史…</div> : null}
        {!loading && error ? <div className="empty-state empty-state--danger">{error}</div> : null}
        {!loading && visibleRecords.length === 0 ? <div className="empty-state">还没有符合条件的分析记录。</div> : null}
        {visibleRecords.map((record) => <article className="record-row-v3" key={record.id}>
          <button className="record-open-v3" type="button" onClick={() => navigate(`/workspace/result/${record.id}`)}>
            <RecordVisual record={record} />
            <span className="record-copy-v3"><small>{record.kind === 'video' ? '单条视频' : '账号研究'} · {statusLabel(record.status)}</small><strong>{record.title}</strong><p>{record.detail}</p></span>
            <span className="record-meta-v3"><strong>{record.progress}%</strong><small>{new Date(record.createdAt).toLocaleDateString('zh-CN')}</small></span>
            <ArrowRight size={18} />
          </button>
          <button className="record-delete-v3" type="button" title="删除记录" aria-label={`删除 ${record.title}`} disabled={deletingId === record.id} onClick={() => void deleteRecord(record)}>{deletingId === record.id ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}</button>
        </article>)}
      </div>
    </div>
  </section>;
}
