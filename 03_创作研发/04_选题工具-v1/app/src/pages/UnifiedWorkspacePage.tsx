import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronDown, Copy, Download, ExternalLink, Film, LoaderCircle, Pencil, RefreshCcw, Save, WandSparkles, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Metric, StatusBadge } from '../components/Common';
import { ProfileDialog } from '../components/ProfileDialog';
import { ProductHeader } from '../components/ProductHeader';
import { compactNumber } from '../data/mockData';
import { useAppStore } from '../store/AppStore';
import type { AccountProfile, AnalysisRecord, ExternalAccountReport, ExternalVideoBreakdown, GeneratedScript, GeneratedTopic } from '../types';

type ExternalTopic = GeneratedTopic & {
  concept?: string;
  inheritedValue?: string;
  profileConnection?: string;
  fitReason?: string;
  accountRole?: string;
  angle?: string;
  reason?: string;
  inheritedMechanism?: string;
  adaptation?: string;
};

type TopicBatchView = {
  id?: string;
  analysisId?: string;
  profileId: string;
  kind?: 'video' | 'account';
  direction: string;
  spreadSummary: string;
  topics: ExternalTopic[];
};

function normalizeTopicBatch(payload: unknown): TopicBatchView | null {
  if (!payload) return null;
  if (Array.isArray(payload)) {
    const topics = payload as ExternalTopic[];
    if (!topics.length) return null;
    return { profileId: topics[0].profileId, direction: '', spreadSummary: '', topics };
  }
  const batch = payload as Partial<TopicBatchView>;
  if (!Array.isArray(batch.topics)) return null;
  return {
    id: batch.id,
    analysisId: batch.analysisId,
    profileId: batch.profileId || batch.topics[0]?.profileId || '',
    kind: batch.kind,
    direction: batch.direction || '',
    spreadSummary: batch.spreadSummary || '',
    topics: batch.topics,
  };
}

export function UnifiedWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { profiles, notify } = useAppStore();
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [topicBatch, setTopicBatch] = useState<TopicBatchView | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const topics = topicBatch?.topics || [];

  const load = async () => {
    if (!id) return;
    try {
      const row = await api.analyses.get(id);
      setAnalysis(row);
      if (row.status === 'completed') {
        const batch = normalizeTopicBatch(await api.topics.list(id, profile?.id));
        setTopicBatch(batch);
        const activeProfileId = profile?.id || batch?.profileId;
        if (!profile && activeProfileId) setProfile(profiles.find((item) => item.id === activeProfileId) || null);
        const topicIds = new Set((batch?.topics || []).map((topic) => topic.id));
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
    if (profile || !topicBatch?.profileId) return;
    setProfile(profiles.find((item) => item.id === topicBatch.profileId) || null);
  }, [profiles, profile, topicBatch?.profileId]);

  const selectProfile = async (selected: AccountProfile) => {
    if (!analysis) return;
    setProfile(selected);
    setProfileOpen(false);
    setBusy(true);
    try {
      const generated = normalizeTopicBatch(await api.topics.generate(analysis.id, selected.id));
      setTopicBatch(generated);
      setSelectedTopics([]);
      setScripts([]);
      notify(`已生成 ${generated?.topics.length || 0} 个对标杂交选题`);
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

  const updateTopic = async (topic: ExternalTopic) => {
    const saved = await api.topics.update(topic);
    setTopicBatch((current) => current ? {
      ...current,
      topics: current.topics.map((item) => item.id === saved.id ? saved as ExternalTopic : item),
    } : current);
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
      const dataUrl = await toPng(reportRef.current, { backgroundColor: '#f6f5f0', cacheBust: true, pixelRatio: 2 });
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

  if (!analysis) return <div className="page-loading"><LoaderCircle className="spin" size={24} /> 正在读取工作区…</div>;
  if (analysis.status === 'queued' || analysis.status === 'running') return <ProcessingView analysis={analysis} onCancel={async () => { const next = await api.analyses.cancel(analysis.id); setAnalysis(next); }} />;
  if (analysis.status === 'failed') return <FailureView analysis={analysis} onRetry={async () => setAnalysis(await api.analyses.retry(analysis.id))} />;

  const report = analysis.report;
  const videoSource = analysis.kind === 'video' && report ? (report as ExternalVideoBreakdown).source : null;
  return (
    <div className="workspace-v2 external-workspace">
      <ProductHeader />
      <main className="workspace-v2-main">
        <div className="result-toolbar-v3"><Link className="result-back-v3" to="/workspace"><ArrowLeft size={16} /> 返回工作台</Link><button className="button button--ghost button--sm" type="button" disabled={exporting} onClick={() => void exportReport()}><Download size={15} /> {exporting ? '正在生成长图…' : '导出报告长图'}</button></div>
        <div className="report-export-surface" ref={reportRef}>
          <header className="workspace-v2-heading external-heading">
            <div className="workspace-v2-label"><i /> {analysis.kind === 'video' ? 'SINGLE VIDEO / 对标拆解' : 'ACCOUNT STUDY / 账号研究'}</div>
            <div className="workspace-v2-heading-row"><div><h1>{videoSource?.title || analysis.title}</h1><p>{videoSource ? `@${videoSource.author || '未获取作者'} · ${videoSource.duration || '时长未获取'}` : `采集 ${analysis.coverage?.collected || 0} 条 · 深拆 ${analysis.coverage?.completed || 0} 条`}</p></div><span className="workspace-v2-status"><Check size={15} /> 研究完成</span></div>
          </header>
          {analysis.kind === 'video' && report ? <VideoReport report={report as ExternalVideoBreakdown} /> : null}
          {analysis.kind === 'account' && report ? <AccountReportView report={report as ExternalAccountReport} coverage={analysis.coverage} /> : null}
        </div>

        <section className="remake-bridge-v2 external-remake-bridge">
          <div className="remake-bridge-v2-index">NEXT / 对标杂交</div>
          <div><h2>把创作方法，重新长到你的账号里</h2><p>选择一份已经确认的账号资料，系统会把拆解出的创作基因与你的真实业务、受众和素材重新组合。</p></div>
          <button type="button" disabled={busy} onClick={() => setProfileOpen(true)}><WandSparkles size={18} />{profile ? '更换账号资料' : '选择账号资料'}</button>
        </section>

        {profile ? <TopicPanel batch={topicBatch} selected={selectedTopics} setSelected={setSelectedTopics} onGenerateScripts={() => void generateScripts()} onUpdateTopic={updateTopic} onRetryScript={(scriptId) => void retryScript(scriptId)} busy={busy} scripts={scripts} notify={notify} /> : <div className="empty-state empty-state--workspace">选择账号资料后，这里会生成针对你的 20 个对标杂交选题。</div>}
      </main>
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} onSelect={(selected) => void selectProfile(selected)} />
    </div>
  );
}

function ProcessingView({ analysis, onCancel }: { analysis: AnalysisRecord; onCancel: () => Promise<void> }) {
  return <div className="page page--processing"><ProductHeader /><main className="processing-shell"><Link className="back-link" to="/workspace"><ArrowLeft size={15} /> 返回工作台</Link><div className="processing-kicker">{analysis.kind === 'video' ? 'SINGLE VIDEO / 单条视频' : 'ACCOUNT STUDY / 账号研究'}</div><h1>{analysis.kind === 'video' ? '正在提炼这条视频的创作方法' : '正在归纳这个账号的内容体系'}</h1><p>{analysis.detail}</p><div className="processing-progress"><div><span>{analysis.step}</span><strong>{analysis.progress}%</strong></div><i><b style={{ width: `${analysis.progress}%` }} /></i></div><div className="processing-status-list"><div className="is-active"><LoaderCircle size={17} className="spin" /><span>{analysis.detail}</span></div><div><CheckCircle2 size={17} /><span>报告完成后会自动保存到工作台</span></div></div><button className="button button--ghost" type="button" onClick={() => void onCancel()}>取消任务</button></main></div>;
}

function FailureView({ analysis, onRetry }: { analysis: AnalysisRecord; onRetry: () => Promise<void> }) {
  return <div className="page page--processing"><ProductHeader /><main className="processing-shell"><Link className="back-link" to="/workspace"><ArrowLeft size={15} /> 返回工作台</Link><div className="processing-kicker">TASK FAILED / 任务失败</div><h1>这次分析没有完成</h1><p>{analysis.error || '没有返回更多错误信息。'}</p><div className="boundary-note"><AlertTriangle size={17} /><p>先检查设置页中的模型连接和抖音 Cookie，再重试；失败任务不会覆盖历史结果。</p></div><button className="button button--primary" type="button" onClick={() => void onRetry()}><RefreshCcw size={17} /> 重试任务</button></main></div>;
}

function VideoReport({ report: data }: { report: ExternalVideoBreakdown }) {
  return <div className="report-v2 external-report">
    <SourceStrip source={data.source} />
    <ReportSection index="01" kicker="BREAKOUT JUDGMENT / 爆点判断" title="这条内容真正抓人的地方">
      <p className="external-lead">{data.breakoutJudgment.coreAttraction}</p>
      <DefinitionGrid items={[['内容切口', data.breakoutJudgment.entryPoint], ['观众处境', data.breakoutJudgment.viewerSituation], ['情绪价值', data.breakoutJudgment.emotionalValue]]} />
    </ReportSection>
    <ReportSection index="02" kicker="VIRAL SKELETON / 爆款骨架" title="整条视频怎样把人带到最后">
      <div className="external-formula">{data.viralSkeleton.formula}</div>
      <div className="external-stage-list">{data.viralSkeleton.stages.map((stage, index) => <article key={`${stage.timeRange}-${stage.name}-${index}`}><span>{stage.timeRange || `阶段 ${index + 1}`}</span><strong>{stage.name}</strong><p>{stage.function}</p></article>)}</div>
    </ReportSection>
    <ReportSection index="03" kicker="OPENING HOOK / 开头钩子" title="前几秒如何把人拦下来">
      <blockquote className="external-hook-line">{data.openingHook.openingLine || '没有可识别的开场原话'}</blockquote>
      <DefinitionGrid items={[['首帧', data.openingHook.firstFrame], ['配合元素', data.openingHook.supportingElements.join('；')], ['触发点', data.openingHook.audienceTrigger], ['观看期待', data.openingHook.viewingExpectation]]} />
    </ReportSection>
    <ReportSection index="04" kicker="COPY & RETENTION / 文案留人" title="关键文案分别做了什么">
      <div className="external-copy-list">{data.copyRetention.map((point, index) => <article key={`${point.excerpt}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><blockquote>{point.excerpt}</blockquote><div><strong>创作作用</strong><p>{point.function}</p><strong>前后承接</strong><p>{point.bridge}</p></div></article>)}</div>
    </ReportSection>
    <ReportSection index="05" kicker="AUDIOVISUAL / 视听配合" title="哪些视听设计真正服务了内容">
      {data.audiovisual.length ? <div className="external-audiovisual">{data.audiovisual.map((point, index) => <article key={`${point.element}-${index}`}><strong>{point.element}</strong><p>{point.design}</p><small>{point.function}</small></article>)}</div> : <p className="external-empty-copy">无特殊设计，常规呈现即可。</p>}
    </ReportSection>
    <ReportSection index="06" kicker="REPLICABLE METHODS / 可复刻方法" title="真正值得带走的创作基因">
      <div className="external-methods">{data.replicableMethods.map((method, index) => <article key={`${method.name}-${index}`}><header><span>{String(index + 1).padStart(2, '0')}</span><h3>{method.name}</h3></header><dl><div><dt>原视频怎么用</dt><dd>{method.originalUse}</dd></div><div><dt>迁移时必须保留</dt><dd>{method.mustKeep}</dd></div><div><dt>可以自由替换</dt><dd>{method.replaceable.join('、') || '未标注'}</dd></div></dl></article>)}</div>
    </ReportSection>
  </div>;
}

function SourceStrip({ source }: { source: ExternalVideoBreakdown['source'] }) {
  const publishedAt = formatPublishedAt(source.metrics.publishedAt);
  return <section className="external-source-strip">
    <div className="external-cover">{source.coverUrl ? <img src={source.coverUrl} alt="视频封面" /> : <Film size={26} />}<span>{source.duration || '—'}</span></div>
    <div className="external-source-copy"><StatusBadge tone="blue">抖音视频</StatusBadge><h2>{source.title}</h2><p>@{source.author || '未获取作者'}{publishedAt ? ` · ${publishedAt}` : ''}</p><a href={source.url} target="_blank" rel="noreferrer">查看原视频 <ExternalLink size={14} /></a></div>
    <div className="external-metrics"><Metric label="点赞" value={compactNumber(source.metrics.likes)} /><Metric label="评论" value={compactNumber(source.metrics.comments)} /><Metric label="分享" value={compactNumber(source.metrics.shares)} /><Metric label="收藏" value={compactNumber(source.metrics.collects)} /></div>
  </section>;
}

function formatPublishedAt(value: string | null | undefined) {
  if (!value) return '';
  const trimmed = value.trim();
  const numeric = Number(trimmed);
  const parsed = Number.isFinite(numeric) && /^\d{10,13}$/.test(trimmed)
    ? new Date(trimmed.length === 10 ? numeric * 1000 : numeric)
    : new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(parsed);
}

function AccountReportView({ report: data, coverage }: { report: ExternalAccountReport; coverage: Record<string, number> | null }) {
  const accountName = String(data.account.nickname || data.account.name || data.account.unique_id || '对标账号');
  const followers = Number(data.account.follower_count || data.account.followers || 0) || null;
  const works = String(data.account.aweme_count || data.account.videos || '—');
  return <div className="report-v2 external-report external-account-report">
    <section className="external-account-source"><div><span>ACCOUNT STUDY / {coverage?.collected || 0} SAMPLES</span><h2>{accountName}</h2><p>{data.strategyOverview.positioning}</p></div><div className="external-account-metrics"><Metric label="粉丝" value={compactNumber(followers)} /><Metric label="账号作品" value={works} /><Metric label="采集样本" value={String(coverage?.collected || 0)} /><Metric label="完成深拆" value={String(coverage?.completed || 0)} /></div></section>
    <ReportSection index="01" kicker="STRATEGY OVERVIEW / 打法总览" title="这个账号靠什么持续获得关注">
      <p className="external-lead">{data.strategyOverview.attentionModel}</p>
      <DefinitionGrid items={[['核心人群', data.strategyOverview.coreAudience], ['持续价值', data.strategyOverview.coreValue], ['账号定位', data.strategyOverview.positioning], ['变现逻辑', data.strategyOverview.monetizationLogic]]} />
    </ReportSection>
    <ReportSection index="02" kicker="CONTENT MAP / 内容版图" title="不同内容分别承担什么任务">
      <div className="external-map-list">{data.contentMap.map((area, index) => <article key={`${area.name}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{area.name}</h3><p>{area.role}</p><small>{area.recurringPattern}</small></div></article>)}</div>
    </ReportSection>
    <ReportSection index="03" kicker="TOPIC ENGINE / 选题生产逻辑" title="它怎样持续找到题可拍">
      <div className="external-topic-engine">{data.topicEngine.map((engine, index) => <article key={`${engine.source}-${index}`}><strong>{engine.source}</strong><p>{engine.recurringTension}</p><small>{engine.generationLogic}</small></article>)}</div>
    </ReportSection>
    <ReportSection index="04" kicker="REPEATABLE METHODS / 反复有效的方法" title="跨样本成立的爆款方法">
      <div className="external-repeatable">{data.repeatableMethods.map((method, index) => <article key={`${method.name}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{method.name}</h3><p>{method.method}</p><small>样本依据：{method.evidence}</small></div></article>)}</div>
    </ReportSection>
    <ReportSection index="05" kicker="EXPRESSION SYSTEM / 表达体系" title="辨识度是怎样形成的">
      <DefinitionGrid items={[['人物角色', data.expressionSystem.characterRole], ['文案语气', data.expressionSystem.copyTone], ['出镜状态', data.expressionSystem.onCameraState], ['视听语言', data.expressionSystem.visualLanguage]]} />
      <p className="external-system-effect"><strong>组合效果</strong>{data.expressionSystem.combinedEffect}</p>
    </ReportSection>
    <ReportSection index="06" kicker="TRANSFERABLE ASSETS / 可杂交资产" title="哪些方法能迁移，哪些条件不能照搬">
      <div className="external-assets">{data.transferableAssets.map((asset, index) => <article key={`${asset.name}-${index}`}><header><span>{String(index + 1).padStart(2, '0')}</span><h3>{asset.name}</h3></header><div><strong><Check size={15} /> 可迁移机制</strong><p>{asset.transferableMechanism}</p></div><div><strong><AlertTriangle size={15} /> 原账号依赖</strong><p>{asset.dependencies}</p></div></article>)}</div>
    </ReportSection>
  </div>;
}

function DefinitionGrid({ items }: { items: Array<[string, string]> }) {
  return <dl className="external-definition-grid">{items.filter(([, value]) => Boolean(value)).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function formatScript(script: GeneratedScript) {
  if (!script.data) return '';
  const data = script.data as GeneratedScript['data'] & {
    videoIdea: string;
    openingHook: { line: string; type: string; viewerTrigger: string; supportingCue: string };
    scriptRows: Array<{ section: string; copy: string; purpose: string; keyCue: string }>;
    captionAndSound: Array<{ content: string; usage: string }>;
    endingInteraction: { endingLine: string; commentPrompts: string[]; pinnedComment: string; starterComments: string[] };
    teleprompterCopy: string;
  };
  const rows = data.scriptRows.map((row) => `[${row.section}]\n${row.copy}\n作用：${row.purpose}${row.keyCue ? `\n提示：${row.keyCue}` : ''}`).join('\n\n');
  const cues = data.captionAndSound.map((cue) => `${cue.content}：${cue.usage}`).join('\n');
  const ending = [data.endingInteraction.endingLine, ...data.endingInteraction.commentPrompts, data.endingInteraction.pinnedComment, ...data.endingInteraction.starterComments].filter(Boolean).join('\n');
  return `视频思路\n${data.videoIdea}\n\n开头钩子\n${data.openingHook.line}\n${data.openingHook.type} · ${data.openingHook.viewerTrigger}\n\n完整文案脚本\n${rows}\n\n字幕与声音\n${cues}\n\n结尾与互动\n${ending}\n\n连续提词稿\n${data.teleprompterCopy}`;
}

function TopicPanel({ batch, selected, setSelected, onGenerateScripts, onUpdateTopic, onRetryScript, busy, scripts, notify }: { batch: TopicBatchView | null; selected: string[]; setSelected: (value: string[]) => void; onGenerateScripts: () => void; onUpdateTopic: (topic: ExternalTopic) => Promise<void>; onRetryScript: (scriptId: string) => void; busy: boolean; scripts: GeneratedScript[]; notify: (message: string, tone?: 'success' | 'info' | 'danger') => void }) {
  const topics = batch?.topics || [];
  const [editingId, setEditingId] = useState('');
  const [draft, setDraft] = useState<ExternalTopic | null>(null);
  const [saving, setSaving] = useState(false);
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  const topicConcept = (topic: ExternalTopic) => topic.concept || topic.angle || '';
  const inheritedValue = (topic: ExternalTopic) => topic.inheritedValue || topic.inheritedMechanism || '';
  const profileConnection = (topic: ExternalTopic) => topic.profileConnection || topic.adaptation || '';
  const fitReason = (topic: ExternalTopic) => topic.fitReason || topic.reason || '';

  const startEdit = (topic: ExternalTopic) => { setEditingId(topic.id); setDraft({ ...topic }); };
  const saveEdit = async () => {
    if (!draft?.title.trim()) return;
    setSaving(true);
    try { await onUpdateTopic(draft); setEditingId(''); setDraft(null); }
    catch (error) { notify(error instanceof Error ? error.message : '选题保存失败', 'danger'); }
    finally { setSaving(false); }
  };
  const copyTopic = async (topic: ExternalTopic) => {
    await navigator.clipboard?.writeText([topic.title, topicConcept(topic), topic.hook, inheritedValue(topic), profileConnection(topic), fitReason(topic), topic.accountRole].filter(Boolean).join('\n'));
    notify('选题已复制');
  };
  const copyScript = async (script: GeneratedScript) => { await navigator.clipboard?.writeText(formatScript(script)); notify('完整可拍稿已复制'); };
  const allSelected = topics.length > 0 && selected.length === topics.length;

  return <section className="remake-output-v2 external-topic-output">
    <header><div><span>TOPIC HYBRID / 对标杂交</span><h2>{topics.length || 20} 个原创选题</h2></div><div className="topic-actions"><button className="topic-select-all" type="button" onClick={() => setSelected(allSelected ? [] : topics.map((topic) => topic.id))}>{allSelected ? '清空选择' : '全选'}</button><span>{selected.length} 个已选</span><button className="button button--primary button--sm" disabled={!selected.length || busy} type="button" onClick={onGenerateScripts}><WandSparkles size={15} /> 生成可拍稿</button></div></header>
    {batch?.direction ? <div className="external-batch-direction"><span>本轮杂交方向</span><p>{batch.direction}</p></div> : null}
    <div className="topic-list-v2 external-topic-list">{topics.map((topic) => {
      const editing = editingId === topic.id && draft;
      return <article key={topic.id} className={`${selected.includes(topic.id) ? 'is-selected' : ''}${editing ? ' is-editing' : ''}`} onClick={() => { if (!editing) toggle(topic.id); }}>
        <input type="checkbox" checked={selected.includes(topic.id)} onChange={() => toggle(topic.id)} onClick={(event) => event.stopPropagation()} />
        <span>{String(topic.position).padStart(2, '0')}</span>
        {editing ? <div className="topic-editor-v2 external-topic-editor" onClick={(event) => event.stopPropagation()}>
          <label><span>选题标题</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label><span>内容设想</span><textarea value={topicConcept(draft)} onChange={(event) => setDraft({ ...draft, concept: event.target.value, angle: event.target.value })} /></label>
          <label><span>开头切入</span><textarea value={draft.hook} onChange={(event) => setDraft({ ...draft, hook: event.target.value })} /></label>
          <label><span>继承价值</span><textarea value={inheritedValue(draft)} onChange={(event) => setDraft({ ...draft, inheritedValue: event.target.value, inheritedMechanism: event.target.value })} /></label>
          <label><span>资料结合点</span><textarea value={profileConnection(draft)} onChange={(event) => setDraft({ ...draft, profileConnection: event.target.value, adaptation: event.target.value })} /></label>
          <label><span>适配理由 / 账号作用</span><textarea value={draft.accountRole || fitReason(draft)} onChange={(event) => setDraft({ ...draft, accountRole: event.target.value, fitReason: event.target.value, reason: event.target.value })} /></label>
        </div> : <div className="external-topic-copy"><h3>{topic.title}</h3><p>{topicConcept(topic)}</p><dl><div><dt>开头切入</dt><dd>{topic.hook}</dd></div><div><dt>继承价值</dt><dd>{inheritedValue(topic)}</dd></div><div><dt>资料结合</dt><dd>{profileConnection(topic)}</dd></div><div><dt>{topic.accountRole ? '账号作用' : '适配理由'}</dt><dd>{topic.accountRole || fitReason(topic)}</dd></div></dl></div>}
        <div className="topic-row-actions" onClick={(event) => event.stopPropagation()}>{editing ? <><button type="button" title="取消编辑" aria-label="取消编辑" onClick={() => { setEditingId(''); setDraft(null); }}><X size={16} /></button><button type="button" title="保存选题" aria-label="保存选题" disabled={saving} onClick={() => void saveEdit()}>{saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}</button></> : <><button type="button" title="编辑选题" aria-label="编辑选题" onClick={() => startEdit(topic)}><Pencil size={16} /></button><button type="button" title="复制选题" aria-label="复制选题" onClick={() => void copyTopic(topic)}><Copy size={16} /></button></>}</div>
      </article>;
    })}</div>
    {batch?.spreadSummary ? <div className="external-batch-summary"><span>{batch.kind === 'account' ? '内容组合说明' : '整体发散说明'}</span><p>{batch.spreadSummary}</p></div> : null}
    {scripts.length ? <ScriptBatch scripts={scripts} onRetryScript={onRetryScript} onCopyScript={(script) => void copyScript(script)} /> : null}
  </section>;
}

function ScriptBatch({ scripts, onRetryScript, onCopyScript }: { scripts: GeneratedScript[]; onRetryScript: (id: string) => void; onCopyScript: (script: GeneratedScript) => void }) {
  return <div className="script-batch external-script-batch"><header><span>SCRIPT BATCH / 可拍文案</span><strong>{scripts.filter((script) => script.status === 'completed').length}/{scripts.length} 完成</strong></header>{scripts.map((script) => {
    const data = script.data as (GeneratedScript['data'] & {
      videoIdea: string;
      openingHook: { line: string; type: string; viewerTrigger: string; supportingCue: string };
      scriptRows: Array<{ section: string; copy: string; purpose: string; keyCue: string }>;
      captionAndSound: Array<{ content: string; usage: string }>;
      endingInteraction: { endingLine: string; commentPrompts: string[]; pinnedComment: string; starterComments: string[] };
      teleprompterCopy: string;
    }) | null;
    return <article key={script.id}>
      <div className="script-batch-summary"><StatusBadge tone={script.status === 'completed' ? 'green' : script.status === 'failed' ? 'warning' : 'blue'}>{script.status === 'completed' ? '已完成' : script.status === 'failed' ? '失败' : script.status === 'running' ? '生成中' : '排队中'}</StatusBadge><h3>{data?.openingHook.line || `选题脚本 ${script.id.slice(0, 6)}`}</h3>{data ? <p>{data.videoIdea}</p> : <small>{script.error || '后台正在生成可拍文案…'}</small>}</div>
      {data ? <details><summary>查看完整可拍稿 <ChevronDown size={15} /></summary><div className="script-detail-v2 external-script-detail">
        <section className="external-script-idea"><strong>视频思路</strong><p>{data.videoIdea}</p></section>
        <section className="external-opening-hook"><strong>开头钩子</strong><blockquote>{data.openingHook.line}</blockquote><p>{data.openingHook.type} · {data.openingHook.viewerTrigger}</p>{data.openingHook.supportingCue ? <small>{data.openingHook.supportingCue}</small> : null}</section>
        <section><strong>完整文案脚本</strong><div className="external-script-table-wrap"><table className="external-script-table"><thead><tr><th>段落</th><th>台词 / 旁白 / 对话</th><th>本段作用</th><th>关键提示</th></tr></thead><tbody>{data.scriptRows.map((row, index) => <tr key={`${row.section}-${index}`}><td>{row.section}</td><td>{row.copy}</td><td>{row.purpose}</td><td>{row.keyCue || '—'}</td></tr>)}</tbody></table></div></section>
        {data.captionAndSound.length ? <section><strong>关键字幕与声音</strong><div className="external-cue-list">{data.captionAndSound.map((cue, index) => <div key={`${cue.content}-${index}`}><b>{cue.content}</b><span>{cue.usage}</span></div>)}</div></section> : null}
        <section><strong>结尾与评论区互动</strong><p>{data.endingInteraction.endingLine}</p>{data.endingInteraction.commentPrompts.length ? <ul>{data.endingInteraction.commentPrompts.map((item) => <li key={item}>{item}</li>)}</ul> : null}{data.endingInteraction.pinnedComment ? <p><b>置顶评论：</b>{data.endingInteraction.pinnedComment}</p> : null}{data.endingInteraction.starterComments.length ? <p><b>首轮互动：</b>{data.endingInteraction.starterComments.join('；')}</p> : null}</section>
        <section className="external-teleprompter"><strong>连续提词稿</strong><p>{data.teleprompterCopy}</p></section>
      </div></details> : null}
      <div className="script-row-actions">{script.status === 'failed' ? <button className="button button--ghost button--sm" type="button" onClick={() => onRetryScript(script.id)}><RefreshCcw size={14} /> 只重试这一条</button> : null}{data ? <button className="button button--ghost button--sm" type="button" onClick={() => onCopyScript(script)}><Copy size={14} /> 复制完整稿</button> : null}</div>
    </article>;
  })}</div>;
}

function ReportSection({ index, kicker, title, children }: { index: string; kicker: string; title: string; children: React.ReactNode }) {
  return <section className="report-section-v2 external-report-section"><span className="report-index-v2">{index}</span><div><span className="report-kicker-v2">{kicker}</span><h2>{title}</h2>{children}</div></section>;
}
