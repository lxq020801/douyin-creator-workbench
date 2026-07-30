import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronDown, Copy, Download, ExternalLink, Film, LoaderCircle, Pencil, RefreshCcw, Save, WandSparkles, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Metric, StatusBadge } from '../components/Common';
import { ProfileDialog } from '../components/ProfileDialog';
import { ProductHeader } from '../components/ProductHeader';
import { compactNumber } from '../data/mockData';
import { useAppStore } from '../store/AppStore';
import type { AccountProfile, AccountReport, AnalysisRecord, GeneratedScript, GeneratedTopic, VideoBreakdown } from '../types';

export function UnifiedWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profiles, notify } = useAppStore();
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [topics, setTopics] = useState<GeneratedTopic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!id) return;
    try {
      const row = await api.analyses.get(id);
      setAnalysis(row);
      if (row.status === 'completed') {
        const availableTopics = await api.topics.list(id, profile?.id);
        const activeProfileId = profile?.id || availableTopics[0]?.profileId;
        const activeTopics = activeProfileId ? availableTopics.filter((topic) => topic.profileId === activeProfileId) : [];
        setTopics(activeTopics);
        if (!profile && activeProfileId) setProfile(profiles.find((item) => item.id === activeProfileId) || null);
        const topicIds = new Set(activeTopics.map((topic) => topic.id));
        setScripts((await api.scripts.list({ analysisId: id })).filter((script) => topicIds.has(script.topicId)));
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : '读取分析失败', 'danger');
    }
  };
  useEffect(() => { void load(); }, [id]);
  useEffect(() => {
    if (!analysis || !['queued', 'running'].includes(analysis.status)) return;
    const timer = window.setInterval(() => void load(), 2200);
    return () => window.clearInterval(timer);
  }, [analysis?.status, id]);
  useEffect(() => {
    if (!scripts.some((item) => item.status === 'queued' || item.status === 'running')) return;
    const timer = window.setInterval(async () => {
      if (!id) return;
      const topicIds = new Set(topics.map((topic) => topic.id));
      setScripts((await api.scripts.list({ analysisId: id })).filter((script) => topicIds.has(script.topicId)));
    }, 2200);
    return () => window.clearInterval(timer);
  }, [scripts, topics, id]);
  useEffect(() => {
    if (profile || !topics.length) return;
    setProfile(profiles.find((item) => item.id === topics[0].profileId) || null);
  }, [profiles, profile, topics]);

  const selectProfile = async (selected: AccountProfile) => {
    if (!analysis) return;
    setProfile(selected);
    setProfileOpen(false);
    setBusy(true);
    try {
      const generated = await api.topics.generate(analysis.id, selected.id);
      setTopics(generated);
      setSelectedTopics([]);
      setScripts([]);
      notify(`已生成 ${generated.length} 个可执行选题`);
    } catch (error) {
      notify(error instanceof Error ? error.message : '选题生成失败', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const generateScripts = async () => {
    if (!selectedTopics.length) return;
    setBusy(true);
    try {
      const result = await api.scripts.batch(selectedTopics);
      setScripts(result);
      notify(`已提交 ${result.length} 个脚本任务`);
    } catch (error) {
      notify(error instanceof Error ? error.message : '脚本任务提交失败', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const updateTopic = async (topic: GeneratedTopic) => {
    const saved = await api.topics.update(topic);
    setTopics((items) => items.map((item) => item.id === saved.id ? saved : item));
    notify('选题已保存');
  };

  const retryScript = async (scriptId: string) => {
    try {
      const saved = await api.scripts.retry(scriptId);
      setScripts((items) => items.map((item) => item.id === saved.id ? saved : item));
      notify('失败脚本已重新提交');
    } catch (error) {
      notify(error instanceof Error ? error.message : '脚本重试失败', 'danger');
    }
  };

  const exportReport = async () => {
    if (!reportRef.current || !analysis) return;
    setExporting(true);
    try {
      await document.fonts.ready;
      const dataUrl = await toPng(reportRef.current, { backgroundColor: '#f2efe5', cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${analysis.title.replace(/[\\/:*?"<>|]/g, '-').slice(0, 80)}-拆解报告.png`;
      link.href = dataUrl;
      link.click();
      notify('报告长图已导出');
    } catch (error) {
      notify(error instanceof Error ? `导出失败：${error.message}` : '报告导出失败', 'danger');
    } finally {
      setExporting(false);
    }
  };

  if (!analysis) {
    return <div className="page-loading"><LoaderCircle className="spin" size={24} /> 正在读取工作区…</div>;
  }

  if (analysis.status === 'queued' || analysis.status === 'running') {
    return <ProcessingView analysis={analysis} onCancel={async () => { const next = await api.analyses.cancel(analysis.id); setAnalysis(next); }} />;
  }

  if (analysis.status === 'failed') {
    return <FailureView analysis={analysis} onRetry={async () => setAnalysis(await api.analyses.retry(analysis.id))} />;
  }

  const report = analysis.report;
  const videoSource = analysis.kind === 'video' && report ? (report as VideoBreakdown).source : null;
  return (
    <div className="workspace-v2">
      <ProductHeader />
      <main className="workspace-v2-main">
        <div className="result-toolbar-v3"><Link className="result-back-v3" to="/workspace"><ArrowLeft size={16} /> 返回工作台</Link><button className="button button--ghost button--sm" type="button" disabled={exporting} onClick={() => void exportReport()}><Download size={15} /> {exporting ? '正在生成长图…' : '导出报告长图'}</button></div>
        <div className="report-export-surface" ref={reportRef}>
          <header className="workspace-v2-heading">
            <div className="workspace-v2-label"><i /> {analysis.kind === 'video' ? 'SINGLE VIDEO / 单条拆解' : 'ACCOUNT STUDY / 账号研究'}</div>
            <div className="workspace-v2-heading-row"><div><h1>{videoSource?.title || analysis.title}</h1><p>{videoSource ? `@${videoSource.author || '未获取作者'} · ${videoSource.duration || '时长未获取'}` : `采集 ${analysis.coverage?.collected || 0} 条 · 深拆 ${analysis.coverage?.completed || 0} 条`}</p></div><span className="workspace-v2-status"><Check size={15} /> 拆解完成</span></div>
          </header>

          {analysis.kind === 'video' && report ? <VideoReport report={report as VideoBreakdown} /> : null}
          {analysis.kind === 'account' && report ? <AccountReport report={report as AccountReport} coverage={analysis.coverage} /> : null}
        </div>

        <section className="remake-bridge-v2">
          <div className="remake-bridge-v2-index">NEXT / 复刻</div>
          <div><h2>把有效机制，换成你的行业和账号</h2><p>拆解报告保持不变。选择一份账号资料后，生成20个可编辑选题。</p></div>
          <button type="button" disabled={busy} onClick={() => setProfileOpen(true)}><WandSparkles size={18} />{profile ? '更换账号资料' : '选择账号资料'}</button>
        </section>

        {profile ? <TopicPanel topics={topics} selected={selectedTopics} setSelected={setSelectedTopics} onGenerateScripts={() => void generateScripts()} onUpdateTopic={updateTopic} onRetryScript={(scriptId) => void retryScript(scriptId)} busy={busy} scripts={scripts} notify={notify} /> : <div className="empty-state empty-state--workspace">选择账号资料后，这里会生成针对你的 20 个选题。</div>}
      </main>
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} onSelect={(selected) => void selectProfile(selected)} />
    </div>
  );
}

function ProcessingView({ analysis, onCancel }: { analysis: AnalysisRecord; onCancel: () => Promise<void> }) {
  return <div className="page page--processing"><ProductHeader /><main className="processing-shell"><Link className="back-link" to="/workspace"><ArrowLeft size={15} /> 返回工作台</Link><div className="processing-kicker">{analysis.kind === 'video' ? 'SINGLE VIDEO / 单条视频' : 'ACCOUNT STUDY / 账号研究'}</div><h1>{analysis.kind === 'video' ? '正在把这条视频拆明白' : '正在建立账号打法地图'}</h1><p>{analysis.detail}</p><div className="processing-progress"><div><span>{analysis.step}</span><strong>{analysis.progress}%</strong></div><i><b style={{ width: `${analysis.progress}%` }} /></i></div><div className="processing-status-list"><div className="is-active"><LoaderCircle size={17} className="spin" /><span>{analysis.detail}</span></div><div><CheckCircle2 size={17} /><span>报告完成后会自动保存到工作台</span></div></div><button className="button button--ghost" type="button" onClick={() => void onCancel()}>取消任务</button></main></div>;
}

function FailureView({ analysis, onRetry }: { analysis: AnalysisRecord; onRetry: () => Promise<void> }) {
  return <div className="page page--processing"><ProductHeader /><main className="processing-shell"><Link className="back-link" to="/workspace"><ArrowLeft size={15} /> 返回工作台</Link><div className="processing-kicker">TASK FAILED / 任务失败</div><h1>这次分析没有完成</h1><p>{analysis.error || '没有返回更多错误信息。'}</p><div className="boundary-note"><AlertTriangle size={17} /><p>先检查设置页中的模型连接和抖音 Cookie，再重试；失败任务不会覆盖历史结果。</p></div><button className="button button--primary" type="button" onClick={() => void onRetry()}><RefreshCcw size={17} /> 重试任务</button></main></div>;
}

function VideoReport({ report }: { report: VideoBreakdown }) {
  const metadata = report.metadata || {
    category: report.theme,
    format: '未获取',
    visualStyle: report.craft.filming.join('；'),
    bgmStyle: report.craft.audio.join('；'),
    captionStyle: report.craft.captions.join('；'),
    tags: [], location: '', keywords: [],
    audience: { summary: '暂未形成明确受众判断', basis: [], confidence: '待验证' as const },
  };
  const logic = report.trafficLogic || {
    hook: { copy: report.hook.copy, type: '未标注', emotion: report.hook.mechanism, viewerTask: '', evidence: report.hook.visualAction },
    narrativeSummary: '按视频实际内容推进。',
    narrativeStages: report.beats.map((beat) => ({ timeRange: beat.timecode, function: beat.role, content: beat.originalCopy, evidence: `${beat.emotion}；${beat.visual}` })),
    emotionCurve: report.beats.map((beat) => ({ point: beat.timecode, emotion: beat.emotion, trigger: beat.visual, effect: beat.transition })),
    interaction: { prompts: [], commentTriggers: [], observedComments: [], note: '旧报告未保存互动字段。' },
  };
  const commercial = report.commercial || {
    valueType: '未标注', valueSupply: '', conversionPath: '', placement: '', callToAction: '', platformSignals: [], availabilityNote: '旧报告未保存商业运营字段。',
  };
  const review = report.review || {
    strengths: report.evidence.filter((point) => point.confidence !== '待验证').map((point) => point.label),
    shortcomings: [], improvements: [], formula: '', transferable: report.transferable, nonCopyable: report.avoidCopying, boundary: report.boundary,
  };
  const hasItems = (items: string[]) => items.filter(Boolean).length > 0;
  return <div className="report-v2 report-four-layer">
    <section className="source-v2 source-v2--compact">
      <div className="source-cover-v2 source-cover-v2--real">{report.source.coverUrl ? <img src={report.source.coverUrl} alt="视频封面" /> : <><Film size={30} /><small>9:16 SOURCE</small></>}<span>{report.source.duration || '—'}</span></div>
      <div className="source-copy-v2"><StatusBadge tone="blue">抖音视频</StatusBadge><h2>{report.source.title}</h2><p>@{report.source.author || '未获取作者'} · 发布于 {report.source.metrics.publishedAt || '未获取'}</p><a href={report.source.url} target="_blank" rel="noreferrer">查看原视频 <ExternalLink size={14} /></a></div>
      <div className="metrics-v2"><Metric label="播放" value={compactNumber(report.source.metrics.views)} /><Metric label="点赞" value={compactNumber(report.source.metrics.likes)} /><Metric label="评论" value={compactNumber(report.source.metrics.comments)} /><Metric label="收藏" value={compactNumber(report.source.metrics.collects)} /></div>
    </section>

    <ReportSection index="01" kicker="METADATA / 基础元数据" title="先看清这条视频的底子">
      <div className="four-layer-summary"><div><strong>赛道</strong><span>{metadata.category || '未获取'}</span></div><div><strong>拍摄形式</strong><span>{metadata.format || '未获取'}</span></div><div><strong>定位与话题</strong><span>{[metadata.location, ...metadata.tags].filter(Boolean).join(' · ') || '未获取'}</span></div><div><strong>关键词</strong><span>{metadata.keywords.join('、') || '未获取'}</span></div></div>
      <div className="metadata-details"><div><strong>画面与字幕</strong><p>{metadata.visualStyle || '未获取'}{metadata.captionStyle ? `；字幕：${metadata.captionStyle}` : ''}</p></div><div><strong>声音配置</strong><p>{metadata.bgmStyle || '未获取'}</p></div><div><strong>可能受众 <StatusBadge tone={metadata.audience.confidence === '高' ? 'green' : metadata.audience.confidence === '中' ? 'blue' : 'warning'}>{metadata.audience.confidence}</StatusBadge></strong><p>{metadata.audience.summary || '暂未形成明确判断'}</p>{hasItems(metadata.audience.basis) ? <small>依据：{metadata.audience.basis.join('；')}</small> : null}</div></div>
    </ReportSection>

    <ReportSection index="02" kicker="TRAFFIC LOGIC / 流量逻辑" title="它凭什么可能留住人">
      <p className="report-v2-lead">{report.summary || logic.narrativeSummary}</p><div className="report-v2-theme"><strong>核心主题</strong><span>{report.theme || '未获取'}</span></div>
      <div className="hook-analysis"><div className="hook-analysis-copy"><span>开篇钩子 · {logic.hook.type || '未标注'}</span><blockquote>{logic.hook.copy || '未获取原文或忠实概括'}</blockquote></div><div className="hook-analysis-details"><div><strong>观众任务 / 情绪</strong><p>{[logic.hook.viewerTask, logic.hook.emotion].filter(Boolean).join(' · ') || '未形成明确判断'}</p></div><div><strong>对应证据</strong><p>{logic.hook.evidence || '暂未获取'}</p></div></div></div>
      <div className="narrative-block"><div className="subsection-heading"><strong>完整叙事流程</strong><span>{logic.narrativeSummary}</span></div><div className="narrative-stages">{logic.narrativeStages.map((stage, index) => <article key={`${stage.timeRange}-${index}`}><span>{stage.timeRange || `阶段 ${index + 1}`}</span><div><strong>{stage.function || '内容推进'}</strong><p>{stage.content}</p><small>{stage.evidence}</small></div></article>)}</div></div>
      <div className="logic-columns"><div><div className="subsection-heading"><strong>情绪推进</strong><span>视频中可观察到的情绪变化</span></div>{logic.emotionCurve.length ? <ul className="compact-list">{logic.emotionCurve.map((point, index) => <li key={`${point.point}-${index}`}><b>{point.point || '节点'}</b><span>{point.emotion}：{point.trigger || point.effect}</span></li>)}</ul> : <p className="muted-note">未形成足够证据的情绪曲线。</p>}</div><div><div className="subsection-heading"><strong>互动设计</strong><span>{logic.interaction.note || '视频内可见的互动信号'}</span></div>{hasItems(logic.interaction.prompts) || hasItems(logic.interaction.commentTriggers) ? <ul className="compact-list">{[...logic.interaction.prompts, ...logic.interaction.commentTriggers].filter(Boolean).map((item, index) => <li key={`${item}-${index}`}><span>{item}</span></li>)}</ul> : <p className="muted-note">未发现明确的主动互动设计。</p>}{hasItems(logic.interaction.observedComments) ? <small className="observed-comments">观察到的留言：{logic.interaction.observedComments.join('；')}</small> : null}</div></div>
    </ReportSection>

    <ReportSection index="03" kicker="COMMERCIAL / 商业运营" title="它怎样提供价值并承接行动">
      <div className="commercial-grid"><div><strong>价值供给</strong><p><StatusBadge tone="blue">{commercial.valueType || '未标注'}</StatusBadge> {commercial.valueSupply || '未获取'}</p></div><div><strong>转化链路</strong><p>{commercial.conversionPath || '未发现明确的转化链路'}</p></div><div><strong>植入与行动</strong><p>{[commercial.placement, commercial.callToAction].filter(Boolean).join('；') || '未发现明确设计'}</p></div></div><div className="platform-signals"><strong>可观察的平台适配信号</strong>{commercial.platformSignals.length ? <ul>{commercial.platformSignals.map((item) => <li key={item}>{item}</li>)}</ul> : <p>未发现足够证据，不对平台推荐机制下结论。</p>}</div><p className="boundary-inline">{commercial.availabilityNote || '商业判断仅基于视频中可观察到的表达，不代表实际成交结果。'}</p>
    </ReportSection>

    <ReportSection index="04" kicker="REVIEW / 复盘提炼" title="最后留下可复用的判断">
      <div className="review-grid"><div><strong>做得好的地方</strong>{review.strengths.length ? <ul>{review.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p>暂未形成明确判断。</p>}</div><div><strong>视频短板</strong>{review.shortcomings.length ? <ul>{review.shortcomings.map((item) => <li key={item}>{item}</li>)}</ul> : <p>暂未发现明显结构性问题。</p>}</div><div><strong>优化建议</strong>{review.improvements.length ? <ul>{review.improvements.map((item) => <li key={item}>{item}</li>)}</ul> : <p>当前没有必须优先修改的地方。</p>}</div></div><div className="formula-block"><span>通用爆款公式 / 内容模型</span><p>{review.formula || '暂未提炼出可验证的通用模型。'}</p></div><div className="transfer-v2"><div><strong><Check size={16} /> 可迁移底层逻辑</strong>{review.transferable.map((item) => <p key={item}>{item}</p>)}</div><div><strong><AlertTriangle size={16} /> 不可直接复制的条件</strong>{review.nonCopyable.map((item) => <p key={item}>{item}</p>)}</div></div><p className="boundary-inline">{review.boundary || report.boundary}</p>
    </ReportSection>
  </div>;
}

function AccountReport({ report, coverage }: { report: AccountReport; coverage: Record<string, number> | null }) {
  return <div className="report-v2"><section className="account-source-v2"><div><span>ACCOUNT / SAMPLE {coverage?.collected || 0}</span><h2>{report.account.name}</h2><p>{report.promise}</p></div><div className="account-numbers-v2"><Metric label="粉丝" value={compactNumber(Number(report.account.followers) || null)} /><Metric label="账号作品" value={String(report.account.videos || '—')} /></div></section><section className="sampling-v2"><div><strong>{coverage?.collected || 0}</strong><span>条作品完成采集</span></div><div><strong>{coverage?.completed || 0}</strong><span>条视频完成深拆</span></div><div><strong>{coverage?.failed || 0}</strong><span>条深拆失败</span></div><p>图文与未深拆作品只参与元数据判断；报告结论以本次样本覆盖范围为边界。</p></section><ReportSection index="01" kicker="CONTENT MAP" title="账号主要在讲什么"><div className="pillar-list-v2">{report.pillars.map((pillar) => <article key={pillar.name}><div><strong>{pillar.name}</strong><span>{pillar.ratio}%</span></div><i><b style={{ width: `${pillar.ratio}%` }} /></i><p>{pillar.note}</p></article>)}</div></ReportSection><ReportSection index="02" kicker="GROWTH PATH" title="样本期内的内容变化"><div className="account-timeline-v2">{report.timeline.map((phase, index) => <article key={`${phase.phase}-${index}`}><span>0{index + 1}</span><div><h3>{phase.phase} <small>{phase.range}</small></h3><p>{phase.action}</p><strong>{phase.signal}</strong></div></article>)}</div></ReportSection><ReportSection index="03" kicker="VIRAL VS NORMAL" title="高表现和常态内容，差在哪里"><div className="comparison-v2"><header><span>对比维度</span><span>高表现内容</span><span>常态内容</span></header>{report.viralVsNormal.map((row) => <article key={row.dimension}><strong>{row.dimension}</strong><span>{row.viral}</span><span>{row.normal}</span><p>{row.conclusion}</p></article>)}</div></ReportSection><ReportSection index="04" kicker="ACCOUNT ADVICE" title="这个账号真正值得参考的方向"><div className="rules-v2">{report.transferable.map((item, index) => <article key={item.rule}><span>0{index + 1}</span><div><h3>{item.rule}</h3><p>{item.evidence}</p><small>{item.boundary}</small></div></article>)}</div><div className="risk-line"><strong>需要规避</strong>{report.risks.map((risk) => <span key={risk}>{risk}</span>)}</div></ReportSection></div>;
}

function formatScript(script: GeneratedScript) {
  if (!script.data) return '';
  const segments = script.data.segments.map((segment) => `[${segment.time}] ${segment.task}\n台词：${segment.copy}\n画面：${segment.shooting}\n节奏：${segment.rhythm}`).join('\n\n');
  return `${script.data.title}\n\n前三秒钩子\n${script.data.openingHook}\n\n完整文案\n${script.data.fullCopy}\n\n分段执行\n${segments}\n\n结尾互动\n${script.data.cta}\n\n制作提示\n${script.data.productionNotes.join('\n')}`;
}

function TopicPanel({ topics, selected, setSelected, onGenerateScripts, onUpdateTopic, onRetryScript, busy, scripts, notify }: { topics: GeneratedTopic[]; selected: string[]; setSelected: (value: string[]) => void; onGenerateScripts: () => void; onUpdateTopic: (topic: GeneratedTopic) => Promise<void>; onRetryScript: (scriptId: string) => void; busy: boolean; scripts: GeneratedScript[]; notify: (message: string, tone?: 'success' | 'info' | 'danger') => void }) {
  const [editingId, setEditingId] = useState('');
  const [draft, setDraft] = useState<GeneratedTopic | null>(null);
  const [saving, setSaving] = useState(false);
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);

  const startEdit = (topic: GeneratedTopic) => {
    setEditingId(topic.id);
    setDraft({ ...topic });
  };

  const saveEdit = async () => {
    if (!draft?.title.trim()) return;
    setSaving(true);
    try {
      await onUpdateTopic(draft);
      setEditingId('');
      setDraft(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : '选题保存失败', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const copyTopic = async (topic: GeneratedTopic) => {
    await navigator.clipboard?.writeText(`${topic.title}\n${topic.hook}\n${topic.reason}\n${topic.adaptation}`);
    notify('选题已复制');
  };

  const copyScript = async (script: GeneratedScript) => {
    await navigator.clipboard?.writeText(formatScript(script));
    notify('完整可拍稿已复制');
  };

  const allSelected = topics.length > 0 && selected.length === topics.length;
  return (
    <section className="remake-output-v2">
      <header>
        <div><span>TOPIC TRANSFER / 选题迁移</span><h2>20 个可执行选题</h2></div>
        <div className="topic-actions"><button className="topic-select-all" type="button" onClick={() => setSelected(allSelected ? [] : topics.map((topic) => topic.id))}>{allSelected ? '清空选择' : '全选'}</button><span>{selected.length} 个已选</span><button className="button button--primary button--sm" disabled={!selected.length || busy} type="button" onClick={onGenerateScripts}><WandSparkles size={15} /> 生成可拍稿</button></div>
      </header>
      <p className="remake-output-v2-lead">选题可以先编辑再生成脚本；你可以只选一个，也可以一次全选。</p>
      <div className="topic-list-v2">
        {topics.map((topic) => {
          const editing = editingId === topic.id && draft;
          return (
            <article key={topic.id} className={`${selected.includes(topic.id) ? 'is-selected' : ''}${editing ? ' is-editing' : ''}`} onClick={() => { if (!editing) toggle(topic.id); }}>
              <input type="checkbox" checked={selected.includes(topic.id)} onChange={() => toggle(topic.id)} onClick={(event) => event.stopPropagation()} />
              <span>{String(topic.position).padStart(2, '0')}</span>
              {editing ? (
                <div className="topic-editor-v2" onClick={(event) => event.stopPropagation()}>
                  <label><span>选题标题</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
                  <label><span>前三秒钩子</span><textarea value={draft.hook} onChange={(event) => setDraft({ ...draft, hook: event.target.value })} /></label>
                  <label><span>推荐理由</span><textarea value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} /></label>
                  <label><span>迁移方式</span><textarea value={draft.adaptation} onChange={(event) => setDraft({ ...draft, adaptation: event.target.value })} /></label>
                </div>
              ) : <div><h3>{topic.title}</h3><p>{topic.reason}</p><small>{topic.hook} · {topic.adaptation}</small></div>}
              <div className="topic-row-actions" onClick={(event) => event.stopPropagation()}>
                {editing ? <><button type="button" title="取消编辑" aria-label="取消编辑" onClick={() => { setEditingId(''); setDraft(null); }}><X size={16} /></button><button type="button" title="保存选题" aria-label="保存选题" disabled={saving} onClick={() => void saveEdit()}>{saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}</button></> : <><button type="button" title="编辑选题" aria-label="编辑选题" onClick={() => startEdit(topic)}><Pencil size={16} /></button><button type="button" title="复制选题" aria-label="复制选题" onClick={() => void copyTopic(topic)}><Copy size={16} /></button></>}
              </div>
            </article>
          );
        })}
      </div>
      {scripts.length ? (
        <div className="script-batch">
          <header><span>SCRIPT BATCH / 编导可拍稿</span><strong>{scripts.filter((script) => script.status === 'completed').length}/{scripts.length} 完成</strong></header>
          {scripts.map((script) => (
            <article key={script.id}>
              <div className="script-batch-summary"><StatusBadge tone={script.status === 'completed' ? 'green' : script.status === 'failed' ? 'warning' : 'blue'}>{script.status === 'completed' ? '已完成' : script.status === 'failed' ? '失败' : script.status === 'running' ? '生成中' : '排队中'}</StatusBadge><h3>{script.data?.title || `选题脚本 ${script.id.slice(0, 6)}`}</h3>{script.data ? <p>{script.data.openingHook}</p> : <small>{script.error || '后台正在生成分段台词与拍摄提示…'}</small>}</div>
              {script.data ? <details><summary>查看完整可拍稿 <ChevronDown size={15} /></summary><div className="script-detail-v2"><section><strong>完整文案</strong><p>{script.data.fullCopy}</p></section><section><strong>分段执行</strong>{script.data.segments.map((segment, index) => <div className="script-segment-v2" key={`${segment.time}-${index}`}><span>{segment.time}</span><div><h4>{segment.task}</h4><p>{segment.copy}</p><small>画面：{segment.shooting}</small><small>节奏：{segment.rhythm}</small></div></div>)}</section><section><strong>结尾互动</strong><p>{script.data.cta}</p></section></div></details> : null}
              <div className="script-row-actions">{script.status === 'failed' ? <button className="button button--ghost button--sm" type="button" onClick={() => onRetryScript(script.id)}><RefreshCcw size={14} /> 只重试这一条</button> : null}{script.data ? <button className="button button--ghost button--sm" type="button" onClick={() => void copyScript(script)}><Copy size={14} /> 复制完整稿</button> : null}</div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ReportSection({ index, kicker, title, children }: { index: string; kicker: string; title: string; children: React.ReactNode }) {
  return <section className="report-section-v2"><span className="report-index-v2">{index}</span><div><span className="report-kicker-v2">{kicker}</span><h2>{title}</h2>{children}</div></section>;
}
