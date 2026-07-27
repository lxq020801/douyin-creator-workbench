import { BookOpenText, FileSearch, Filter, RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, StatusBadge } from '../components/Common';
import { useAppStore } from '../store/AppStore';

export function HistoryPage() {
  const { tasks, updateTask, notify } = useAppStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'video' | 'account' | 'remake'>('all');
  const rows = useMemo(() => tasks.filter((task) => (filter === 'all' || task.kind === filter) && `${task.title}${task.source}`.includes(query)), [tasks, query, filter]);

  return (
    <div className="page">
      <PageHeader eyebrow="ARCHIVE / 历史任务" title="继续之前的研究" description="拆解报告、账号打法地图和复刻产物分别保存，可以从任一结果继续。" />
      <div className="list-toolbar">
        <label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题或来源" /></label>
        <div className="filter-tabs"><Filter size={16} />{(['all', 'video', 'account', 'remake'] as const).map((item) => <button key={item} type="button" className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{({ all: '全部', video: '单条拆解', account: '账号研究', remake: '复刻' } as const)[item]}</button>)}</div>
      </div>
      <div className="task-table task-table--history">
        <div className="task-row task-row--header"><span>任务</span><span>类型</span><span>进度</span><span>状态</span><span>创建时间</span><span /></div>
        {rows.map((task) => (
          <div className="task-row" key={task.id}>
            <span className="task-title"><span className={`task-icon task-icon--${task.kind}`}>{task.kind === 'account' ? <BookOpenText size={17} /> : <FileSearch size={17} />}</span><span><strong>{task.title}</strong><small>{task.source}</small></span></span>
            <span>{task.detail}</span>
            <span><span className="mini-progress"><i style={{ width: `${task.progress}%` }} /></span><small>{task.progress}%</small></span>
            <span><StatusBadge tone={task.status === 'completed' ? 'green' : task.status === 'failed' ? 'red' : 'blue'}>{task.status === 'completed' ? '已完成' : task.status === 'failed' ? '失败' : '进行中'}</StatusBadge></span>
            <span>{task.createdAt}</span>
            <span>{task.status === 'failed' ? <button className="button button--ghost button--sm" type="button" onClick={() => { updateTask(task.id, { status: 'queued', progress: 0, detail: '等待重新执行' }); notify('任务已重新加入队列'); }}><RotateCcw size={14} /> 重试</button> : <button className="button button--ghost button--sm" type="button" onClick={() => navigate(task.kind === 'account' ? '/account/sample' : '/video/sample')}>打开</button>}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
