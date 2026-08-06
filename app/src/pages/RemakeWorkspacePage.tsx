import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, Film, History, LoaderCircle, Pencil, RefreshCcw, Save, WandSparkles, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { ProductHeader } from '../components/ProductHeader';
import { ProfileDialog } from '../components/ProfileDialog';
import { useAppStore } from '../store/AppStore';
import type { AccountProfile, AnalysisRecord, ExternalVideoBreakdown, GeneratedScript, GeneratedTopic, RuntimeSettings } from '../types';

type ExternalTopic = GeneratedTopic & {
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
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  step: string;
  detail: string;
  error?: string | null;
  pipeline?: string[];
  topics: ExternalTopic[];
};

const SCRIPT_EXPORT_PIXEL_RATIO = 3;
const SCRIPT_EXPORT_MAX_DIMENSION = 30_000;
const SCRIPT_EXPORT_MAX_PIXELS = 120_000_000;

function normalizeTopicBatch(payload: unknown): TopicBatchView | null {
  if (!payload) return null;
  if (Array.isArray(payload)) {
    const topics = payload as ExternalTopic[];
    if (!topics.length) return null;
    return { profileId: topics[0].profileId, direction: '', spreadSummary: '', status: 'completed', progress: 100, step: 'completed', detail: '选题已生成', topics };
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
    status: batch.status || 'completed',
    progress: typeof batch.progress === 'number' ? batch.progress : 0,
    step: batch.step || 'queued',
    detail: batch.detail || '任务已排队',
    error: batch.error || null,
    pipeline: Array.isArray(batch.pipeline) ? batch.pipeline : undefined,
    topics: batch.topics,
  };
}

export function RemakeWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProfileId = searchParams.get('profileId') || '';
  const { profiles, settings, notify } = useAppStore();
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [topicBatch, setTopicBatch] = useState<TopicBatchView | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [busy, setBusy] = useState(false);
  const loadRequest = useRef(0);
  const [topicReload, setTopicReload] = useState(0);

  const topics = topicBatch?.topics || [];

  useEffect(() => {
    if (!id) return;
    const request = ++loadRequest.current;
    const run = async () => {
      try {
        const row = await api.analyses.get(id);
        if (request !== loadRequest.current) return;
        setAnalysis(row);
        if (row.status !== 'completed') return;
        if (!selectedProfileId) {
          setTopicBatch(null);
          setScripts([]);
          setBusy(false);
          setProfileOpen(true);
          return;
        }

        setBusy(true);
        setTopicBatch(null);
        setScripts([]);
        let batch = normalizeTopicBatch(await api.topics.list(id, selectedProfileId));
        if (!batch) {
          batch = normalizeTopicBatch(await api.topics.generate(id, selectedProfileId));
        }
        if (request !== loadRequest.current || !batch) return;
        setTopicBatch(batch);
        while (batch.status === 'queued' || batch.status === 'running') {
          await new Promise((resolve) => window.setTimeout(resolve, 2200));
          if (request !== loadRequest.current) return;
          batch = normalizeTopicBatch(await api.topics.list(id, selectedProfileId));
          if (!batch) throw new Error('选题任务记录不存在');
          setTopicBatch(batch);
        }
        if (batch.status === 'failed') throw new Error(batch.error || '选题生成失败，请重试');
        const topicIds = new Set(batch.topics.map((topic) => topic.id));
        const savedScripts = await api.scripts.list({ analysisId: id });
        if (request !== loadRequest.current) return;
        setScripts(savedScripts.filter((script) => topicIds.has(script.topicId)));
      } catch (error) {
        if (request === loadRequest.current) notify(error instanceof Error ? error.message : '读取复刻工作台失败', 'danger');
      } finally {
        if (request === loadRequest.current) setBusy(false);
      }
    };
    void run();
  }, [id, selectedProfileId, topicReload]);

  useEffect(() => {
    if (!selectedProfileId) {
      setProfile(null);
      return;
    }
    setProfile(profiles.find((item) => item.id === selectedProfileId) || null);
  }, [profiles, selectedProfileId]);

  useEffect(() => {
    if (!scripts.some((item) => item.status === 'queued' || item.status === 'running')) return;
    const timer = window.setInterval(async () => {
      if (!id) return;
      const topicIds = new Set(topics.map((topic) => topic.id));
      setScripts((await api.scripts.list({ analysisId: id })).filter((script) => topicIds.has(script.topicId)));
    }, 2200);
    return () => window.clearInterval(timer);
  }, [scripts, topicBatch?.id, id]);

  const selectProfile = (selected: AccountProfile) => {
    setProfile(selected);
    setProfileOpen(false);
    setBusy(true);
    setSelectedTopics([]);
    setTopicBatch(null);
    setScripts([]);
    setTopicReload((value) => value + 1);
    setSearchParams({ profileId: selected.id }, { replace: true });
  };

  const retryTopics = () => {
    setTopicBatch(null);
    setScripts([]);
    setSelectedTopics([]);
    setBusy(true);
    setTopicReload((value) => value + 1);
  };

  const replaceScript = (saved: GeneratedScript) => {
    setScripts((items) => items.map((item) => item.id === saved.id ? saved : item));
  };

  const generateScripts = async () => {
    if (!selectedTopics.length) return;
    setBusy(true);
    const existingTopics = new Set(scripts.map((script) => script.topicId));
    try {
      const result = await api.scripts.batch(selectedTopics);
      setScripts((current) => {
        const byTopic = new Map(current.map((script) => [script.topicId, script]));
        result.forEach((script) => byTopic.set(script.topicId, script));
        return [...byTopic.values()];
      });
      const created = result.filter((script) => !existingTopics.has(script.topicId)).length;
      notify(created ? `已提交 ${created} 个脚本任务` : '所选选题已有脚本，可展开查看或单独重新生成');
    } catch (error) {
      notify(error instanceof Error ? error.message : '脚本任务提交失败', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const updateTopic = async (topic: ExternalTopic) => {
    const saved = await api.topics.update(topic);
    setTopicBatch((current) => current ? { ...current, topics: current.topics.map((item) => item.id === saved.id ? saved as ExternalTopic : item) } : current);
    notify('选题已保存');
  };

  const retryScript = async (scriptId: string) => {
    try {
      replaceScript(await api.scripts.retry(scriptId));
      notify('失败脚本已重新提交');
    } catch (error) {
      notify(error instanceof Error ? error.message : '脚本重试失败', 'danger');
    }
  };

  const regenerateScript = async (scriptId: string) => {
    try {
      replaceScript(await api.scripts.regenerate(scriptId));
      notify('正在生成新版本，当前版本会保留到新稿完成');
    } catch (error) {
      notify(error instanceof Error ? error.message : '重新生成失败', 'danger');
    }
  };

  const activateScriptVersion = async (scriptId: string, version: number) => {
    try {
      replaceScript(await api.scripts.activateVersion(scriptId, version));
      notify(`已切换到第 ${version} 版脚本`);
    } catch (error) {
      notify(error instanceof Error ? error.message : '历史版本切换失败', 'danger');
    }
  };

  if (!analysis) return <div className="page-loading"><LoaderCircle className="spin" size={24} /> 正在读取复刻工作台…</div>;

  const source = analysis.kind === 'video' && analysis.report ? (analysis.report as ExternalVideoBreakdown).source : null;
  return <div className="workspace-v2 remake-workspace">
    <ProductHeader />
    <main className="remake-workspace-main">
      <header className="remake-page-header">
        <Link to={`/workspace/result/${analysis.id}`}><ArrowLeft size={16} /> 返回拆解报告</Link>
        <div className="remake-page-heading">
          <div><span>REMIX WORKSPACE / 复刻工作台</span><h1>{topicBatch ? `${topics.length} 个对标选题` : '开始生成对标选题'}</h1><p>从拆解中继承有效方法，再结合你的账号条件重新创作。</p></div>
          {topicBatch ? <button className="button button--ghost button--sm" type="button" onClick={() => setProfileOpen(true)}>更换账号资料</button> : null}
        </div>
        <div className="remake-source-context">
          <div className="remake-source-cover">{source?.coverUrl ? <img src={source.coverUrl} alt="视频封面" /> : <Film size={22} />}</div>
          <div><small>本次对标来源</small><strong>{source?.title || analysis.title}</strong><p>{profile ? `复刻给：${profile.name}` : '尚未选择账号资料'}</p></div>
        </div>
      </header>

      {!topicBatch ? <section className="remake-profile-gate">
        <span>01 / 选择复刻对象</span>
        <h2>{busy ? '正在把方法迁移到你的账号…' : '先选择这次要使用的账号资料'}</h2>
        <p>{busy ? '系统正在结合拆解结果与账号资料生成 20 个发散选题。' : '同一份拆解可以分别用于不同商户。选定资料后，系统会恢复这个账号已有的选题，或生成一组新的选题。'}</p>
        <button className="button button--primary" type="button" disabled={busy} onClick={() => setProfileOpen(true)}>{busy ? <LoaderCircle className="spin" size={17} /> : <WandSparkles size={17} />}{busy ? '正在准备选题' : '选择账号资料'}</button>
      </section> : <TopicPanel
        batch={topicBatch}
        selected={selectedTopics}
        setSelected={setSelectedTopics}
        onGenerateScripts={() => void generateScripts()}
        onUpdateTopic={updateTopic}
        onRetryScript={(scriptId) => void retryScript(scriptId)}
        onRegenerateScript={(scriptId) => void regenerateScript(scriptId)}
        onActivateVersion={(scriptId, version) => void activateScriptVersion(scriptId, version)}
        onRetryTopics={retryTopics}
        busy={busy}
        scripts={scripts}
        settings={settings}
        notify={notify}
      />}
    </main>
    <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} onSelect={selectProfile} />
  </div>;
}

function TopicPanel({ batch, selected, setSelected, onGenerateScripts, onUpdateTopic, onRetryScript, onRegenerateScript, onActivateVersion, onRetryTopics, busy, scripts, settings, notify }: {
  batch: TopicBatchView;
  selected: string[];
  setSelected: (value: string[]) => void;
  onGenerateScripts: () => void;
  onUpdateTopic: (topic: ExternalTopic) => Promise<void>;
  onRetryScript: (scriptId: string) => void;
  onRegenerateScript: (scriptId: string) => void;
  onActivateVersion: (scriptId: string, version: number) => void;
  onRetryTopics: () => void;
  busy: boolean;
  scripts: GeneratedScript[];
  settings: RuntimeSettings;
  notify: (message: string, tone?: 'success' | 'info' | 'danger') => void;
}) {
  const topics = batch.topics;
  const [editingId, setEditingId] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<ExternalTopic | null>(null);
  const [saving, setSaving] = useState(false);
  const scriptByTopic = useMemo(() => new Map(scripts.map((script) => [script.topicId, script])), [scripts]);
  const allSelected = topics.length > 0 && selected.length === topics.length;
  const toggle = (topicId: string) => setSelected(selected.includes(topicId) ? selected.filter((item) => item !== topicId) : [...selected, topicId]);
  const toggleExpanded = (topicId: string) => setExpandedIds((current) => current.includes(topicId) ? current.filter((item) => item !== topicId) : [...current, topicId]);
  const topicConcept = (topic: ExternalTopic) => topic.concept || topic.angle || '';
  const inheritedValue = (topic: ExternalTopic) => topic.inheritedValue || topic.inheritedMechanism || '';
  const profileConnection = (topic: ExternalTopic) => topic.profileConnection || topic.adaptation || '';
  const fitReason = (topic: ExternalTopic) => topic.fitReason || topic.reason || '';
  const topicGenerating = batch.status === 'queued' || batch.status === 'running';
  const stepLabels: Record<string, string> = {
    load: '读取资料', seed_draft: '生成创意种子', seed_audit: '审核创意种子',
    draft: '生成选题', factual_audit: '选题事实审计', save: '保存结果',
  };
  const stepThresholds: Record<string, number> = { load: 8, seed_draft: 18, seed_audit: 35, draft: 48, factual_audit: 75, save: 90 };
  const fallbackPipeline = [
    'load',
    ...(settings.topicSeedEnabled ? ['seed_draft'] : []),
    ...(settings.topicSeedEnabled && settings.topicSeedReviewEnabled ? ['seed_audit'] : []),
    'draft',
    ...(settings.topicFactualAuditEnabled ? ['factual_audit'] : []),
    'save',
  ];
  const progressSteps = (batch.pipeline?.length ? batch.pipeline : fallbackPipeline).map((key) => ({ key, label: stepLabels[key] || key, threshold: stepThresholds[key] ?? 0 }));

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
  const copyScript = async (script: GeneratedScript) => {
    await navigator.clipboard?.writeText(formatScript(script));
    notify('完整可拍稿已复制');
  };

  return <section className="remake-topic-workspace">
    <div className="remake-topic-toolbar">
      <div><span>TOPIC SELECTION</span><strong>{topicGenerating ? '正在规划并生成对标选题' : batch.status === 'failed' ? '选题生成失败' : '选择要继续生成脚本的选题'}</strong></div>
      {batch.status === 'completed' ? <div className="topic-actions"><button className={`topic-select-all${allSelected ? ' is-active' : ''}`} type="button" aria-pressed={allSelected} title={allSelected ? '取消选择全部选题' : '选择全部选题'} onClick={() => setSelected(allSelected ? [] : topics.map((topic) => topic.id))}><span aria-hidden="true"><Check size={11} /></span>{allSelected ? '取消全选' : '全选'}</button><span>{selected.length} 个已选</span><button className="button button--primary button--sm" disabled={!selected.length || busy} type="button" onClick={onGenerateScripts}>{busy ? <LoaderCircle className="spin" size={15} /> : <WandSparkles size={15} />} 生成拍摄脚本</button></div> : null}
    </div>
    {topicGenerating ? <div className="remake-topic-progress"><LoaderCircle className="spin" size={18} /><div className="remake-topic-progress-content"><div className="remake-topic-progress-heading"><strong>{batch.status === 'running' ? '正在规划并生成 20 个对标选题' : '选题任务已排队'}</strong><span>{batch.progress}%</span></div><div className="remake-topic-progress-track"><i style={{ width: `${Math.max(4, batch.progress)}%` }} /></div><p>{batch.detail}</p><ol className="remake-topic-steps">{progressSteps.map((step) => <li key={step.key} className={batch.step === step.key ? 'is-current' : (step.key === 'save' ? batch.progress >= 100 : batch.progress > step.threshold) ? 'is-done' : ''}>{step.label}</li>)}</ol></div></div> : null}
    {batch.status === 'failed' ? <div className="remake-topic-progress is-failed"><div><strong>这次生成没有完成</strong><p>{batch.error || '服务暂时不可用，请重新尝试。'}</p></div><button className="button button--primary button--sm" type="button" onClick={onRetryTopics}><RefreshCcw size={15} />重新生成选题</button></div> : null}
    {batch.status === 'completed' && batch.direction ? <div className="remake-direction"><span>本轮迁移方向</span><p>{batch.direction.replaceAll('杂交', '迁移')}</p></div> : null}

    {batch.status === 'completed' ? <div className="remake-topic-list">{topics.map((topic) => {
      const editing = editingId === topic.id && draft;
      const script = scriptByTopic.get(topic.id);
      const canExpand = Boolean(script?.data);
      const expanded = canExpand && expandedIds.includes(topic.id);
      const generating = script?.status === 'queued' || script?.status === 'running';
      return <article key={topic.id} className={`${selected.includes(topic.id) ? 'is-selected' : ''}${expanded ? ' is-expanded' : ''}`}>
        <div
          className={`remake-topic-row${canExpand && !editing ? ' can-expand' : ''}`}
          onClick={() => { if (canExpand && !editing) toggleExpanded(topic.id); }}
        >
          <label className="remake-topic-check" title="选择这个选题" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selected.includes(topic.id)} onChange={() => toggle(topic.id)} /><span><Check size={13} /></span></label>
          <span className="remake-topic-index">{String(topic.position).padStart(2, '0')}</span>
          {editing ? <div className="topic-editor-v2 remake-topic-editor" onClick={(event) => event.stopPropagation()}>
            <label><span>选题标题</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
            <label><span>内容设想</span><textarea value={topicConcept(draft)} onChange={(event) => setDraft({ ...draft, concept: event.target.value, angle: event.target.value })} /></label>
            <label><span>开头切入</span><textarea value={draft.hook} onChange={(event) => setDraft({ ...draft, hook: event.target.value })} /></label>
            <label><span>继承价值</span><textarea value={inheritedValue(draft)} onChange={(event) => setDraft({ ...draft, inheritedValue: event.target.value, inheritedMechanism: event.target.value })} /></label>
            <label><span>资料结合点</span><textarea value={profileConnection(draft)} onChange={(event) => setDraft({ ...draft, profileConnection: event.target.value, adaptation: event.target.value })} /></label>
            <label><span>适配理由 / 账号作用</span><textarea value={draft.accountRole || fitReason(draft)} onChange={(event) => setDraft({ ...draft, accountRole: event.target.value, fitReason: event.target.value, reason: event.target.value })} /></label>
          </div> : <div className="remake-topic-copy"><h2>{topic.title}</h2><p>{topicConcept(topic)}</p><dl><div><dt>开头切入</dt><dd>{topic.hook}</dd></div><div><dt>继承价值</dt><dd>{inheritedValue(topic)}</dd></div><div><dt>资料结合</dt><dd>{profileConnection(topic)}</dd></div><div><dt>{topic.accountRole ? '账号作用' : '适配理由'}</dt><dd>{topic.accountRole || fitReason(topic)}</dd></div></dl></div>}
          <div className="remake-topic-actions" onClick={(event) => event.stopPropagation()}>{editing ? <><button type="button" title="取消编辑" onClick={() => { setEditingId(''); setDraft(null); }}><X size={16} /></button><button type="button" title="保存选题" disabled={saving} onClick={() => void saveEdit()}>{saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}</button></> : <><button type="button" title="编辑选题" onClick={() => startEdit(topic)}><Pencil size={16} /></button><button type="button" title="复制选题" onClick={() => void copyTopic(topic)}><Copy size={16} /></button></>}
            {script?.status === 'failed' && !script.data ? <button type="button" title="重试脚本" onClick={() => onRetryScript(script.id)}><RefreshCcw size={16} /></button> : null}
            {generating ? <span className="remake-script-state"><LoaderCircle className="spin" size={14} /> {script?.data ? '新版本生成中' : script.status === 'running' ? '生成中' : '排队中'}</span> : null}
            {canExpand ? <button className={`remake-expand-script${expanded ? ' is-open' : ''}`} type="button" aria-expanded={expanded} title={expanded ? '收起拍摄脚本' : '展开拍摄脚本'} onClick={() => toggleExpanded(topic.id)}><ChevronDown size={18} /></button> : null}
          </div>
        </div>
        {expanded && script ? <ScriptDetail
          topic={topic}
          script={script}
          onCopy={() => void copyScript(script)}
          onRegenerate={() => onRegenerateScript(script.id)}
          onActivateVersion={(version) => onActivateVersion(script.id, version)}
          notify={notify}
        /> : null}
      </article>;
    })}</div> : null}
    {batch.status === 'completed' && batch.spreadSummary ? <div className="remake-spread-summary"><span>{batch.kind === 'account' ? '内容组合说明' : '整体发散说明'}</span><p>{batch.spreadSummary}</p></div> : null}
  </section>;
}

function ScriptDetail({ topic, script, onCopy, onRegenerate, onActivateVersion, notify }: {
  topic: ExternalTopic;
  script: GeneratedScript;
  onCopy: () => void;
  onRegenerate: () => void;
  onActivateVersion: (version: number) => void;
  notify: (message: string, tone?: 'success' | 'info' | 'danger') => void;
}) {
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const data = script.data;
  if (!data) return null;
  const generating = script.status === 'queued' || script.status === 'running';
  const activeVersion = script.activeVersion || 1;
  const versionCount = Math.max(script.versionCount || 1, activeVersion);
  const versions = Array.from({ length: versionCount }, (_, index) => versionCount - index);

  const exportScript = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      await document.fonts.ready;
      const { scrollWidth: width, scrollHeight: height } = exportRef.current;
      const ratio = Math.max(1, Math.min(
        SCRIPT_EXPORT_PIXEL_RATIO,
        SCRIPT_EXPORT_MAX_DIMENSION / Math.max(width, height),
        Math.sqrt(SCRIPT_EXPORT_MAX_PIXELS / Math.max(width * height, 1)),
      ));
      const dataUrl = await toPng(exportRef.current, {
        backgroundColor: '#f6f5f0',
        cacheBust: true,
        pixelRatio: ratio,
        width,
        height,
      });
      const link = document.createElement('a');
      link.download = `${String(topic.position).padStart(2, '0')}-${topic.title.replace(/[\\/:*?"<>|]/g, '-').slice(0, 60)}-脚本-v${activeVersion}.png`;
      link.href = dataUrl;
      link.click();
      notify('脚本图片已导出');
    } catch (error) {
      notify(error instanceof Error ? `导出失败：${error.message}` : '脚本图片导出失败', 'danger');
    } finally {
      setExporting(false);
    }
  };

  return <div className="remake-script-detail">
    <div className="remake-script-toolbar">
      <div className="script-version-control" aria-label="脚本版本历史">
        <History size={15} />
        <button type="button" disabled={activeVersion <= 1} title="上一版" onClick={() => onActivateVersion(activeVersion - 1)}><ChevronLeft size={15} /></button>
        <label title="选择脚本历史版本"><select value={activeVersion} onChange={(event) => onActivateVersion(Number(event.target.value))}>{versions.map((version) => <option key={version} value={version}>第 {version} 版{version === versionCount ? ' · 最新' : ''}</option>)}</select><ChevronDown size={13} /></label>
        <button type="button" disabled={activeVersion >= versionCount} title="下一版" onClick={() => onActivateVersion(activeVersion + 1)}><ChevronRight size={15} /></button>
      </div>
      <div className="script-toolbar-actions">
        <button type="button" disabled={generating} onClick={onRegenerate}><RefreshCcw className={generating ? 'spin' : ''} size={14} /> {generating ? '新版本生成中' : '重新生成'}</button>
        <button type="button" disabled={exporting} onClick={() => void exportScript()}><Download size={14} /> {exporting ? '正在导出' : '导出图片'}</button>
        <button type="button" onClick={onCopy}><Copy size={14} /> 复制</button>
      </div>
    </div>
    {script.status === 'failed' ? <div className="script-regeneration-error">新版本生成失败，当前仍显示已保存的第 {activeVersion} 版。可以再次重新生成。</div> : null}
    <div className="remake-script-export-surface" ref={exportRef}>
      <header><div><span>SHOOTING SCRIPT / 拍摄脚本 · 第 {activeVersion} 版</span><small>选题 {String(topic.position).padStart(2, '0')}</small><h3>{topic.title}</h3></div></header>
      <section className="remake-script-idea"><strong>视频思路</strong><p>{data.videoIdea}</p></section>
      <section className="remake-script-hook"><strong>开头钩子</strong><blockquote>{data.openingHook.line}</blockquote><p>{data.openingHook.type} · {data.openingHook.viewerTrigger}</p>{data.openingHook.supportingCue ? <small>{data.openingHook.supportingCue}</small> : null}</section>
      <section className="remake-script-table-section">
        <strong>完整拍摄脚本</strong>
        <div className="remake-script-grid-wrap">
          <div className="remake-script-grid" role="table" aria-label="完整拍摄脚本">
            <div className="remake-script-grid-row remake-script-grid-head" role="row">
              <div role="columnheader">段次</div><div role="columnheader">内容阶段</div><div role="columnheader">台词 / 旁白 / 对话</div><div role="columnheader">拍摄 / 剪辑提示</div><div role="columnheader">编导目的</div>
            </div>
            {data.scriptRows.map((row, index) => <div className="remake-script-grid-row" role="row" key={`${row.section}-${index}`}>
              <div role="cell"><span className="remake-script-row-number">{String(index + 1).padStart(2, '0')}</span></div>
              <div role="cell"><strong>{row.section}</strong></div>
              <div className="remake-script-spoken-copy" role="cell">{row.copy}</div>
              <div role="cell">{row.keyCue || <span className="remake-script-empty-cell">—</span>}</div>
              <div role="cell">{row.purpose}</div>
            </div>)}
          </div>
        </div>
      </section>
      {data.captionAndSound.length ? <section><strong>关键字幕与声音</strong><div className="external-cue-list">{data.captionAndSound.map((cue, index) => <div key={`${cue.content}-${index}`}><b>{cue.content}</b><span>{cue.usage}</span></div>)}</div></section> : null}
      <section><strong>结尾与评论区互动</strong><p>{data.endingInteraction.endingLine}</p>{data.endingInteraction.commentPrompts.length ? <ul>{data.endingInteraction.commentPrompts.map((item) => <li key={item}>{item}</li>)}</ul> : null}{data.endingInteraction.pinnedComment ? <p><b>置顶评论：</b>{data.endingInteraction.pinnedComment}</p> : null}{data.endingInteraction.starterComments.length ? <p><b>首轮互动：</b>{data.endingInteraction.starterComments.join('；')}</p> : null}</section>
      <section className="external-teleprompter"><strong>连续提词稿</strong><p>{data.teleprompterCopy}</p></section>
    </div>
  </div>;
}

function formatScript(script: GeneratedScript) {
  if (!script.data) return '';
  const data = script.data;
  const rows = data.scriptRows.map((row) => `[${row.section}]\n${row.copy}\n作用：${row.purpose}${row.keyCue ? `\n提示：${row.keyCue}` : ''}`).join('\n\n');
  const cues = data.captionAndSound.map((cue) => `${cue.content}：${cue.usage}`).join('\n');
  const ending = [data.endingInteraction.endingLine, ...data.endingInteraction.commentPrompts, data.endingInteraction.pinnedComment, ...data.endingInteraction.starterComments].filter(Boolean).join('\n');
  return `视频思路\n${data.videoIdea}\n\n开头钩子\n${data.openingHook.line}\n${data.openingHook.type} · ${data.openingHook.viewerTrigger}\n\n完整文案脚本\n${rows}\n\n字幕与声音\n${cues}\n\n结尾与互动\n${ending}\n\n连续提词稿\n${data.teleprompterCopy}`;
}
