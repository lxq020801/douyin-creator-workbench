import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Download, ExternalLink, Film, LoaderCircle, RefreshCcw } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { ProductHeader } from '../components/ProductHeader';
import { compactNumber } from '../data/mockData';
import { useAppStore } from '../store/AppStore';
import type { AnalysisRecord, ExternalAccountReport, ExternalVideoBreakdown, VideoSource } from '../types';

export function UnifiedWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { notify } = useAppStore();
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!id) return;
    try {
      setAnalysis(await api.analyses.get(id));
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
  return (
    <div className="workspace-v2 external-workspace">
      <ProductHeader />
      <main className="workspace-v2-main report-only-main">
        <div className="result-toolbar-v3">
          <Link className="result-back-v3" to="/workspace"><ArrowLeft size={16} /> 返回工作台</Link>
          <button className="button button--ghost button--sm" type="button" disabled={exporting} onClick={() => void exportReport()}><Download size={15} /> {exporting ? '正在生成长图…' : '导出报告长图'}</button>
        </div>

        <div className="report-export-surface" ref={reportRef}>
          {analysis.kind === 'video' && report ? <VideoReportHeader source={(report as ExternalVideoBreakdown).source} /> : null}
          {analysis.kind === 'account' && report ? <AccountReportHeader report={report as ExternalAccountReport} coverage={analysis.coverage} /> : null}
          {analysis.kind === 'video' && report ? <VideoReport report={report as ExternalVideoBreakdown} /> : null}
          {analysis.kind === 'account' && report ? <AccountReportView report={report as ExternalAccountReport} /> : null}
        </div>

        {report ? <section className="report-next-step">
          <div><span>NEXT / 对标复刻</span><h2>把拆解结果变成你的选题</h2><p>进入独立复刻工作台，结合账号资料生成 20 个选题，再选择需要的内容生成可拍脚本。</p></div>
          <Link to={`/workspace/remake/${analysis.id}`}>进入复刻工作台 <ArrowRight size={18} /></Link>
        </section> : null}
      </main>
    </div>
  );
}

function ProcessingView({ analysis, onCancel }: { analysis: AnalysisRecord; onCancel: () => Promise<void> }) {
  return <div className="page page--processing"><ProductHeader /><main className="processing-shell"><Link className="back-link" to="/workspace"><ArrowLeft size={15} /> 返回工作台</Link><div className="processing-kicker">{analysis.kind === 'video' ? 'SINGLE VIDEO / 单条视频' : 'ACCOUNT STUDY / 账号研究'}</div><h1>{analysis.kind === 'video' ? '正在提炼这条视频的创作方法' : '正在归纳这个账号的内容体系'}</h1><p>{analysis.detail}</p><div className="processing-progress"><div><span>{analysis.step}</span><strong>{analysis.progress}%</strong></div><i><b style={{ width: `${analysis.progress}%` }} /></i></div><div className="processing-status-list"><div className="is-active"><LoaderCircle size={17} className="spin" /><span>{analysis.detail}</span></div><div><CheckCircle2 size={17} /><span>报告完成后会自动保存到工作台</span></div></div><button className="button button--ghost" type="button" onClick={() => void onCancel()}>取消任务</button></main></div>;
}

function FailureView({ analysis, onRetry }: { analysis: AnalysisRecord; onRetry: () => Promise<void> }) {
  return <div className="page page--processing"><ProductHeader /><main className="processing-shell"><Link className="back-link" to="/workspace"><ArrowLeft size={15} /> 返回工作台</Link><div className="processing-kicker">TASK FAILED / 任务失败</div><h1>这次分析没有完成</h1><p>{analysis.error || '没有返回更多错误信息。'}</p><div className="boundary-note"><AlertTriangle size={17} /><p>先检查设置页中的模型连接和抖音 Cookie，再重试；失败任务不会覆盖历史结果。</p></div><button className="button button--primary" type="button" onClick={() => void onRetry()}><RefreshCcw size={17} /> 重试任务</button></main></div>;
}

function VideoReportHeader({ source }: { source: VideoSource }) {
  const publishedAt = formatPublishedAt(source.metrics.publishedAt);
  const metrics = [
    ['点赞', source.metrics.likes],
    ['评论', source.metrics.comments],
    ['分享', source.metrics.shares],
    ['收藏', source.metrics.collects],
  ] as const;
  return <header className="video-report-hero">
    <div className="video-report-hero-label"><span><i /> SINGLE VIDEO / 对标拆解</span><b><Check size={14} /> 研究完成</b></div>
    <div className="video-report-identity">
      <div className="video-report-cover">{source.coverUrl ? <img src={source.coverUrl} alt="视频封面" /> : <Film size={26} />}<span>{source.duration || '—'}</span></div>
      <div className="video-report-copy">
        <span className="video-platform-tag">抖音视频</span>
        <h1>{source.title}</h1>
        <p className="video-report-byline">@{source.author || '未获取作者'}{publishedAt ? ` · ${publishedAt}` : ''}{source.duration ? ` · ${source.duration}` : ''}</p>
        <div className="video-report-metrics" aria-label="视频互动数据">{metrics.map(([label, value]) => <span key={label}><small>{label}</small><strong>{compactNumber(value)}</strong></span>)}</div>
        <a href={source.url} target="_blank" rel="noreferrer">查看原视频 <ExternalLink size={14} /></a>
      </div>
    </div>
  </header>;
}

function AccountReportHeader({ report, coverage }: { report: ExternalAccountReport; coverage: Record<string, number> | null }) {
  const accountName = String(report.account.nickname || report.account.name || report.account.unique_id || '对标账号');
  return <header className="account-report-hero">
    <div className="video-report-hero-label"><span><i /> ACCOUNT STUDY / 账号研究</span><b><Check size={14} /> 研究完成</b></div>
    <h1>{accountName}</h1>
    <p>{report.strategyOverview.positioning}</p>
    <div className="account-report-meta"><span>采集 {coverage?.collected || 0} 条</span><span>完成深拆 {coverage?.completed || 0} 条</span></div>
  </header>;
}

function VideoReport({ report: data }: { report: ExternalVideoBreakdown }) {
  return <div className="report-v2 external-report">
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

function AccountReportView({ report: data }: { report: ExternalAccountReport }) {
  return <div className="report-v2 external-report external-account-report">
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

function ReportSection({ index, kicker, title, children }: { index: string; kicker: string; title: string; children: React.ReactNode }) {
  return <section className="report-section-v2 external-report-section"><span className="report-index-v2">{index}</span><div><span className="report-kicker-v2">{kicker}</span><h2>{title}</h2>{children}</div></section>;
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
