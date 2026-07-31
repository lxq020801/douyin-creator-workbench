import { ArrowLeft, Check, ChevronDown, ChevronUp, Copy, Film, LoaderCircle, Pencil, RefreshCcw, Save, WandSparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { ProductHeader } from '../components/ProductHeader';
import { ProfileDialog } from '../components/ProfileDialog';
import { useAppStore } from '../store/AppStore';
import type { AccountProfile, AnalysisRecord, ExternalVideoBreakdown, GeneratedScript, GeneratedTopic } from '../types';

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

export function RemakeWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { profiles, notify } = useAppStore();
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [topicBatch, setTopicBatch] = useState<TopicBatchView | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [busy, setBusy] = useState(false);

  const topics = topicBatch?.topics || [];

  const load = async () => {
    if (!id) return;
    try {
      const row = await api.analyses.get(id);
      setAnalysis(row);
      if (row.status !== 'completed') return;
      const batch = normalizeTopicBatch(await api.topics.list(id));
      setTopicBatch(batch);
      const topicIds = new Set((batch?.topics || []).map((topic) => topic.id));
      setScripts((await api.scripts.list({ analysisId: id })).filter((script) => topicIds.has(script.topicId)));
    } catch (error) {
      notify(error instanceof Error ? error.message : '读取复刻工作台失败', 'danger');
    }
  };

  useEffect(() => { void load(); }, [id]);
  useEffect(() => {
    if (!topicBatch?.profileId) return;
    setProfile(profiles.find((item) => item.id === topicBatch.profileId) || null);
  }, [profiles, topicBatch?.profileId]);
  useEffect(() => {
    if (!scripts.some((item) => item.status === 'queued' || item.status === 'running')) return;
    const timer = window.setInterval(async () => {
      if (!id) return;
      const topicIds = new Set(topics.map((topic) => topic.id));
      setScripts((await api.scripts.list({ analysisId: id })).filter((script) => topicIds.has(script.topicId)));
    }, 2200);
    return () => window.clearInterval(timer);
  }, [scripts, topics, id]);

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
      notify(`已生成 ${generated?.topics.length || 0} 个对标迁移选题`);
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
      setScripts((current) => {
        const byTopic = new Map(current.map((script) => [script.topicId, script]));
        result.forEach((script) => byTopic.set(script.topicId, script));
        return [...byTopic.values()];
      });
      notify(`已提交 ${result.length} 个脚本任务`);
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
      const saved = await api.scripts.retry(scriptId);
      setScripts((items) => items.map((item) => item.id === saved.id ? saved : item));
      notify('失败脚本已重新提交');
    } catch (error) {
      notify(error instanceof Error ? error.message : '脚本重试失败', 'danger');
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
        <h2>{busy ? '正在把方法迁移到你的账号…' : '先告诉 AI，这些方法要用在谁身上'}</h2>
        <p>{busy ? '系统正在结合拆解结果与账号资料生成 20 个发散选题。' : '选择一份已经确认的账号资料。选题会在这个页面生成，原拆解报告不会被改变。'}</p>
        <button className="button button--primary" type="button" disabled={busy} onClick={() => setProfileOpen(true)}>{busy ? <LoaderCircle className="spin" size={17} /> : <WandSparkles size={17} />}{busy ? '正在生成选题' : '选择资料并生成 20 个选题'}</button>
      </section> : <TopicPanel
        batch={topicBatch}
        selected={selectedTopics}
        setSelected={setSelectedTopics}
        onGenerateScripts={() => void generateScripts()}
        onUpdateTopic={updateTopic}
        onRetryScript={(scriptId) => void retryScript(scriptId)}
        busy={busy}
        scripts={scripts}
        notify={notify}
      />}
    </main>
    <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} onSelect={(selected) => void selectProfile(selected)} />
  </div>;
}

function TopicPanel({ batch, selected, setSelected, onGenerateScripts, onUpdateTopic, onRetryScript, busy, scripts, notify }: { batch: TopicBatchView; selected: string[]; setSelected: (value: string[]) => void; onGenerateScripts: () => void; onUpdateTopic: (topic: ExternalTopic) => Promise<void>; onRetryScript: (scriptId: string) => void; busy: boolean; scripts: GeneratedScript[]; notify: (message: string, tone?: 'success' | 'info' | 'danger') => void }) {
  const topics = batch.topics;
  const [editingId, setEditingId] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<ExternalTopic | null>(null);
  const [saving, setSaving] = useState(false);
  const scriptByTopic = useMemo(() => new Map(scripts.map((script) => [script.topicId, script])), [scripts]);
  const allSelected = topics.length > 0 && selected.length === topics.length;
  const toggle = (topicId: string) => setSelected(selected.includes(topicId) ? selected.filter((item) => item !== topicId) : [...selected, topicId]);
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
  const copyScript = async (script: GeneratedScript) => {
    await navigator.clipboard?.writeText(formatScript(script));
    notify('完整可拍稿已复制');
  };

  return <section className="remake-topic-workspace">
    <div className="remake-topic-toolbar">
      <div><span>TOPIC SELECTION</span><strong>选择要继续生成脚本的选题</strong></div>
      <div className="topic-actions"><button className={`topic-select-all${allSelected ? ' is-active' : ''}`} type="button" aria-pressed={allSelected} title={allSelected ? '取消选择全部选题' : '选择全部选题'} onClick={() => setSelected(allSelected ? [] : topics.map((topic) => topic.id))}><span aria-hidden="true"><Check size={11} /></span>{allSelected ? '取消全选' : '全选'}</button><span>{selected.length} 个已选</span><button className="button button--primary button--sm" disabled={!selected.length || busy} type="button" onClick={onGenerateScripts}>{busy ? <LoaderCircle className="spin" size={15} /> : <WandSparkles size={15} />} 生成拍摄脚本</button></div>
    </div>
    {batch.direction ? <div className="remake-direction"><span>本轮迁移方向</span><p>{batch.direction.replaceAll('杂交', '迁移')}</p></div> : null}

    <div className="remake-topic-list">{topics.map((topic) => {
      const editing = editingId === topic.id && draft;
      const script = scriptByTopic.get(topic.id);
      const canExpand = script?.status === 'completed' && Boolean(script.data);
      const expanded = canExpand && expandedIds.includes(topic.id);
      return <article key={topic.id} className={`${selected.includes(topic.id) ? 'is-selected' : ''}${expanded ? ' is-expanded' : ''}`}>
        <div className="remake-topic-row">
          <label className="remake-topic-check" title="选择这个选题"><input type="checkbox" checked={selected.includes(topic.id)} onChange={() => toggle(topic.id)} /><span><Check size={13} /></span></label>
          <span className="remake-topic-index">{String(topic.position).padStart(2, '0')}</span>
          {editing ? <div className="topic-editor-v2 remake-topic-editor">
            <label><span>选题标题</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
            <label><span>内容设想</span><textarea value={topicConcept(draft)} onChange={(event) => setDraft({ ...draft, concept: event.target.value, angle: event.target.value })} /></label>
            <label><span>开头切入</span><textarea value={draft.hook} onChange={(event) => setDraft({ ...draft, hook: event.target.value })} /></label>
            <label><span>继承价值</span><textarea value={inheritedValue(draft)} onChange={(event) => setDraft({ ...draft, inheritedValue: event.target.value, inheritedMechanism: event.target.value })} /></label>
            <label><span>资料结合点</span><textarea value={profileConnection(draft)} onChange={(event) => setDraft({ ...draft, profileConnection: event.target.value, adaptation: event.target.value })} /></label>
            <label><span>适配理由 / 账号作用</span><textarea value={draft.accountRole || fitReason(draft)} onChange={(event) => setDraft({ ...draft, accountRole: event.target.value, fitReason: event.target.value, reason: event.target.value })} /></label>
          </div> : <div className="remake-topic-copy"><h2>{topic.title}</h2><p>{topicConcept(topic)}</p><dl><div><dt>开头切入</dt><dd>{topic.hook}</dd></div><div><dt>继承价值</dt><dd>{inheritedValue(topic)}</dd></div><div><dt>资料结合</dt><dd>{profileConnection(topic)}</dd></div><div><dt>{topic.accountRole ? '账号作用' : '适配理由'}</dt><dd>{topic.accountRole || fitReason(topic)}</dd></div></dl></div>}
          <div className="remake-topic-actions">{editing ? <><button type="button" title="取消编辑" onClick={() => { setEditingId(''); setDraft(null); }}><X size={16} /></button><button type="button" title="保存选题" disabled={saving} onClick={() => void saveEdit()}>{saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}</button></> : <><button type="button" title="编辑选题" onClick={() => startEdit(topic)}><Pencil size={16} /></button><button type="button" title="复制选题" onClick={() => void copyTopic(topic)}><Copy size={16} /></button></>}
            {script?.status === 'failed' ? <button type="button" title="重试脚本" onClick={() => onRetryScript(script.id)}><RefreshCcw size={16} /></button> : null}
            {script && !canExpand && script.status !== 'failed' ? <span className="remake-script-state"><LoaderCircle className="spin" size={14} /> {script.status === 'running' ? '生成中' : '排队中'}</span> : null}
            {canExpand ? <button className="remake-expand-script" type="button" aria-expanded={expanded} title={expanded ? '收起拍摄脚本' : '展开拍摄脚本'} onClick={() => setExpandedIds(expanded ? expandedIds.filter((item) => item !== topic.id) : [...expandedIds, topic.id])}>{expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}<span>{expanded ? '收起脚本' : '查看脚本'}</span></button> : null}
          </div>
        </div>
        {expanded && script ? <ScriptDetail script={script} onCopy={() => void copyScript(script)} /> : null}
      </article>;
    })}</div>
    {batch.spreadSummary ? <div className="remake-spread-summary"><span>{batch.kind === 'account' ? '内容组合说明' : '整体发散说明'}</span><p>{batch.spreadSummary}</p></div> : null}
  </section>;
}

function ScriptDetail({ script, onCopy }: { script: GeneratedScript; onCopy: () => void }) {
  const data = script.data;
  if (!data) return null;
  return <div className="remake-script-detail">
    <header><div><span>SHOOTING SCRIPT / 拍摄脚本</span><h3>{data.openingHook.line}</h3></div><button className="button button--ghost button--sm" type="button" onClick={onCopy}><Copy size={14} /> 复制完整稿</button></header>
    <section className="remake-script-idea"><strong>视频思路</strong><p>{data.videoIdea}</p></section>
    <section className="remake-script-hook"><strong>开头钩子</strong><blockquote>{data.openingHook.line}</blockquote><p>{data.openingHook.type} · {data.openingHook.viewerTrigger}</p>{data.openingHook.supportingCue ? <small>{data.openingHook.supportingCue}</small> : null}</section>
    <section><strong>完整文案脚本</strong><div className="external-script-table-wrap"><table className="external-script-table"><thead><tr><th>段落</th><th>台词 / 旁白 / 对话</th><th>本段作用</th><th>关键提示</th></tr></thead><tbody>{data.scriptRows.map((row, index) => <tr key={`${row.section}-${index}`}><td>{row.section}</td><td>{row.copy}</td><td>{row.purpose}</td><td>{row.keyCue || '—'}</td></tr>)}</tbody></table></div></section>
    {data.captionAndSound.length ? <section><strong>关键字幕与声音</strong><div className="external-cue-list">{data.captionAndSound.map((cue, index) => <div key={`${cue.content}-${index}`}><b>{cue.content}</b><span>{cue.usage}</span></div>)}</div></section> : null}
    <section><strong>结尾与评论区互动</strong><p>{data.endingInteraction.endingLine}</p>{data.endingInteraction.commentPrompts.length ? <ul>{data.endingInteraction.commentPrompts.map((item) => <li key={item}>{item}</li>)}</ul> : null}{data.endingInteraction.pinnedComment ? <p><b>置顶评论：</b>{data.endingInteraction.pinnedComment}</p> : null}{data.endingInteraction.starterComments.length ? <p><b>首轮互动：</b>{data.endingInteraction.starterComments.join('；')}</p> : null}</section>
    <section className="external-teleprompter"><strong>连续提词稿</strong><p>{data.teleprompterCopy}</p></section>
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
