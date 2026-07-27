import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSearch,
  Film,
  Link2,
  ListTree,
  RefreshCcw,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { CopyButton, Metric, PageHeader, ProgressSteps, StatusBadge } from '../components/Common';
import { ProfileDialog } from '../components/ProfileDialog';
import { compactNumber, sampleBreakdown, sampleVideoUrl } from '../data/mockData';
import { useAppStore } from '../store/AppStore';
import type { AccountProfile, RemakeResult } from '../types';

const analysisSteps = ['解析抖音链接', '获取作品元数据', '下载无水印视频', '上传多模态模型', '理解视频内容', '整理拆解报告'];
const remakeSteps = ['读取账号资料', '提取可迁移机制', '完成行业与人设迁移', '生成选题和脚本'];

type WorkspaceStage = 'idle' | 'analyzing' | 'report' | 'remaking' | 'remake';

export function VideoWorkspacePage() {
  const { id } = useParams();
  const location = useLocation();
  const { addTask, updateTask, notify } = useAppStore();
  const [url, setUrl] = useState((location.state as { url?: string } | null)?.url || '');
  const [stage, setStage] = useState<WorkspaceStage>(id === 'sample' ? 'report' : 'idle');
  const [activeStep, setActiveStep] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<AccountProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'breakdown' | 'remake'>('breakdown');
  const reportRef = useRef<HTMLDivElement>(null);
  const taskId = useRef(`video-${Date.now()}`);

  useEffect(() => {
    if (stage !== 'analyzing') return;
    if (activeStep >= analysisSteps.length - 1) {
      const done = window.setTimeout(() => {
        setStage('report');
        updateTask(taskId.current, { status: 'completed', progress: 100, detail: '单条视频拆解' });
        notify('拆解报告已生成');
      }, 700);
      return () => window.clearTimeout(done);
    }
    const timer = window.setTimeout(() => {
      setActiveStep((value) => value + 1);
      updateTask(taskId.current, { progress: Math.round(((activeStep + 1) / analysisSteps.length) * 100) });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [stage, activeStep, notify, updateTask]);

  useEffect(() => {
    if (stage !== 'remaking') return;
    if (activeStep >= remakeSteps.length - 1) {
      const done = window.setTimeout(() => {
        setStage('remake');
        setActiveTab('remake');
        notify('复刻产物已生成');
      }, 650);
      return () => window.clearTimeout(done);
    }
    const timer = window.setTimeout(() => setActiveStep((value) => value + 1), 600);
    return () => window.clearTimeout(timer);
  }, [stage, activeStep, notify]);

  const startAnalysis = () => {
    const input = url.trim() || sampleVideoUrl;
    setUrl(input);
    setActiveStep(0);
    setStage('analyzing');
    addTask({ id: taskId.current, kind: 'video', title: '正在拆解新的抖音视频', source: input, status: 'running', progress: 8, createdAt: '刚刚', detail: '解析链接' });
  };

  const selectProfile = (profile: AccountProfile) => {
    setSelectedProfile(profile);
    setPickerOpen(false);
    setActiveStep(0);
    setStage('remaking');
    setActiveTab('remake');
    addTask({ id: `remake-${Date.now()}`, kind: 'remake', title: `迁移到“${profile.name}”`, source: sampleBreakdown.source.title, status: 'running', progress: 18, createdAt: '刚刚', detail: '复刻产物' });
  };

  const remake = useMemo<RemakeResult>(() => ({
    profileId: selectedProfile?.id || 'profile-ai-director',
    profileName: selectedProfile?.name || 'AI 编导实验',
    angle: '从“展示 AI 很强”改成“编导如何用 AI 完成一次真实选题任务”，把专业判断放在工具之前。',
    titleOptions: ['我让 AI 拆了一条真实爆款，5 分钟拿到 20 个选题', '编导找选题最费时间的，可能不是搜案例', '同一条爆款，换一个行业还能不能成立？'],
    openingHook: '我没有让 AI 写选题，我先让它拆了一条真实爆款。',
    fullScript: '我没有让 AI 直接写选题，而是先给它一条真实爆款。它会把前 3 秒钩子、文案结构、情绪变化和画面承接全部拆开。然后我再告诉它：我是一个正在做 AI 内容的短视频编导，我能真人出镜，也能录屏，但单条视频不能做得太重。最后，它不是照抄原视频，而是把同一套结构换成了 20 个适合我账号的选题。这个工具接下来我会自己做出来，也会把整个过程拍给你看。',
    segments: [
      { time: '00:00–00:03', task: '先展示任务', copy: '我没有让 AI 写选题，我先让它拆了一条真实爆款。', shooting: '真人中近景；真实数据在旁边出现，并标记来源。' },
      { time: '00:03–00:12', task: '解释拆解机制', copy: '钩子、结构、情绪和画面承接，先被拆成可以复用的东西。', shooting: '切到报告录屏，只放大当前字段。' },
      { time: '00:12–00:24', task: '注入自己的限制', copy: '再告诉它我是谁、给谁看、能拍什么、不能做什么。', shooting: '账号资料卡与真人同屏，保留修改动作。' },
      { time: '00:24–00:36', task: '交付结果', copy: '5 分钟，我拿到了 20 个可以继续筛选的方向。', shooting: '选题节点展开，前三条保持可读。' },
    ],
    cta: '第一条视频，我就用这个工具来做。',
    inheritedMechanisms: ['真实任务前置', '过程作为可信证据', '可计数结果兑现', '人物判断与录屏交替'],
    adaptations: ['删除原作者的人设语气', '把行业案例换成 AI 编导真实工作流', '将强销售 CTA 改为公开开发承诺'],
  }), [selectedProfile]);

  const exportReport = async () => {
    if (!reportRef.current) return;
    const dataUrl = await toPng(reportRef.current, { pixelRatio: 1.5, backgroundColor: '#f2efe5' });
    const link = document.createElement('a');
    link.download = '视频对标工具-视频拆解报告.png';
    link.href = dataUrl;
    link.click();
    notify('拆解报告长图已导出');
  };

  if (stage === 'idle' || stage === 'analyzing') {
    return (
      <div className="page">
        <PageHeader eyebrow="SINGLE VIDEO / 单条视频" title="拆一条视频，不预设你的行业" description="拆解只回答原视频讲了什么、为什么可能有效，以及证据来自哪里。" />
        <section className="single-intake">
          <div className="single-intake-heading"><span>01</span><div><h2>粘贴抖音视频链接</h2><p>支持完整链接、短链接或包含链接的分享文案；用户端不开放本地上传。</p></div></div>
          <div className="url-entry url-entry--large"><Link2 size={20} /><input value={url} disabled={stage === 'analyzing'} onChange={(event) => setUrl(event.target.value)} placeholder="粘贴抖音视频链接或分享文案" /><button className="button button--primary" type="button" disabled={stage === 'analyzing'} onClick={startAnalysis}>{stage === 'analyzing' ? '处理中' : '开始拆解'} <ArrowRight size={17} /></button></div>
          {!url && stage === 'idle' ? <button className="sample-link" type="button" onClick={() => setUrl(sampleVideoUrl)}>填入示例链接</button> : null}
        </section>
        {stage === 'analyzing' ? (
          <section className="processing-panel">
            <header><div><span className="live-indicator" />分析任务运行中</div><strong>{Math.round(((activeStep + 1) / analysisSteps.length) * 100)}%</strong></header>
            <ProgressSteps steps={analysisSteps} active={activeStep} />
            <footer><Film size={16} /><span>当前：{analysisSteps[activeStep]}</span><small>Agent-wiki 媒体管线适配位</small></footer>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="page page--report">
      <PageHeader
        eyebrow="SINGLE VIDEO / 拆解完成"
        title="原视频报告与复刻产物分开保存"
        description="下面的拆解结论不会因目标账号变化；复刻只读取这份报告和你选定的账号资料。"
        actions={<><button className="button button--secondary" type="button" onClick={exportReport}><Download size={17} /> 导出拆解长图</button><button className="button button--primary" type="button" onClick={() => setPickerOpen(true)}><WandSparkles size={17} /> 开始复刻</button></>}
      />

      <div className="result-tabs" role="tablist"><button type="button" className={activeTab === 'breakdown' ? 'is-active' : ''} onClick={() => setActiveTab('breakdown')}><FileSearch size={17} /> 拆解报告</button><button type="button" className={activeTab === 'remake' ? 'is-active' : ''} disabled={!selectedProfile && stage !== 'remake'} onClick={() => setActiveTab('remake')}><Sparkles size={17} /> 复刻产物 {selectedProfile ? <StatusBadge tone="green">{selectedProfile.name}</StatusBadge> : null}</button></div>

      {activeTab === 'breakdown' ? (
        <div ref={reportRef} className="report-document">
          <section className="source-band">
            <div className={`video-cover-placeholder video-cover-placeholder--${sampleBreakdown.source.coverTone}`}><Film size={30} /><span>00:47</span></div>
            <div className="source-main"><StatusBadge tone="blue">抖音视频</StatusBadge><h2>{sampleBreakdown.source.title}</h2><p>@{sampleBreakdown.source.author} · 发布于 {sampleBreakdown.source.metrics.publishedAt}</p><a href={sampleBreakdown.source.url} target="_blank" rel="noreferrer">查看原视频 <ExternalLink size={14} /></a></div>
            <div className="metrics-grid"><Metric label="播放" value={compactNumber(sampleBreakdown.source.metrics.views)} /><Metric label="点赞" value={compactNumber(sampleBreakdown.source.metrics.likes)} /><Metric label="评论" value={compactNumber(sampleBreakdown.source.metrics.comments)} /><Metric label="分享" value={compactNumber(sampleBreakdown.source.metrics.shares)} /><Metric label="收藏" value={compactNumber(sampleBreakdown.source.metrics.collects)} /></div>
          </section>

          <section className="report-section report-summary">
            <div className="report-index">01</div><div><span className="section-kicker">EDITOR'S SUMMARY</span><h2>编导结论</h2><p className="report-lead">{sampleBreakdown.summary}</p><div className="theme-line"><strong>核心主题</strong><span>{sampleBreakdown.theme}</span></div></div>
          </section>

          <section className="report-section">
            <div className="report-index">02</div><div className="report-content"><span className="section-kicker">FIRST 3 SECONDS</span><h2>前 3 秒钩子</h2><blockquote>{sampleBreakdown.hook.copy}</blockquote><div className="analysis-columns"><div><strong>作用机制</strong><p>{sampleBreakdown.hook.mechanism}</p></div><div><strong>画面动作</strong><p>{sampleBreakdown.hook.visualAction}</p></div></div></div>
          </section>

          <section className="report-section">
            <div className="report-index">03</div><div className="report-content"><span className="section-kicker">STRUCTURE MAP</span><h2>按时间推进的内容结构</h2><div className="beat-list">{sampleBreakdown.beats.map((beat, index) => <article key={beat.timecode}><span className="beat-time">{beat.timecode}</span><span className="beat-node">{String(index + 1).padStart(2, '0')}</span><div><strong>{beat.role}</strong><p className="beat-copy">{beat.originalCopy}</p><dl><div><dt>情绪目标</dt><dd>{beat.emotion}</dd></div><div><dt>画面</dt><dd>{beat.visual}</dd></div><div><dt>承接</dt><dd>{beat.transition}</dd></div></dl></div></article>)}</div></div>
          </section>

          <section className="report-section">
            <div className="report-index">04</div><div className="report-content"><span className="section-kicker">CRAFT</span><h2>画面、剪辑、声音与字幕</h2><div className="craft-grid">{Object.entries(sampleBreakdown.craft).map(([key, items]) => <div key={key}><strong>{({ filming: '拍摄', editing: '剪辑', audio: '声音', captions: '字幕' } as Record<string, string>)[key]}</strong><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}</div></div>
          </section>

          <section className="report-section">
            <div className="report-index">05</div><div className="report-content"><span className="section-kicker">EVIDENCE</span><h2>可能促成传播的机制</h2><div className="evidence-table"><div className="evidence-row evidence-row--header"><span>判断</span><span>对应证据</span><span>置信度</span></div>{sampleBreakdown.evidence.map((point) => <div className="evidence-row" key={point.label}><strong>{point.label}</strong><span>{point.evidence}</span><StatusBadge tone={point.confidence === '高' ? 'green' : point.confidence === '中' ? 'blue' : 'warning'}>{point.confidence}</StatusBadge></div>)}</div><div className="boundary-note"><AlertTriangle size={17} /><p>{sampleBreakdown.boundary}</p></div></div>
          </section>

          <section className="report-section report-section--split">
            <div className="report-index">06</div><div className="report-content"><span className="section-kicker">TRANSFER</span><h2>哪些能学，哪些不能直接抄</h2><div className="transfer-columns"><div><strong><CheckCircle2 size={17} /> 可迁移原则</strong><ul>{sampleBreakdown.transferable.map((item) => <li key={item}>{item}</li>)}</ul></div><div><strong><AlertTriangle size={17} /> 不建议照搬</strong><ul>{sampleBreakdown.avoidCopying.map((item) => <li key={item}>{item}</li>)}</ul></div></div></div>
          </section>
        </div>
      ) : null}

      {activeTab === 'remake' ? (
        stage === 'remaking' ? (
          <section className="processing-panel processing-panel--compact"><header><div><span className="live-indicator" />正在迁移到“{selectedProfile?.name}”</div><strong>{Math.round(((activeStep + 1) / remakeSteps.length) * 100)}%</strong></header><ProgressSteps steps={remakeSteps} active={activeStep} /></section>
        ) : (
          <div className="remake-document">
            <section className="remake-header"><div><StatusBadge tone="green">复刻产物</StatusBadge><h2>{remake.profileName}</h2><p>{remake.angle}</p></div><button className="button button--secondary" type="button" onClick={() => setPickerOpen(true)}><RefreshCcw size={16} /> 更换账号资料</button></section>
            <section className="remake-section"><div className="section-heading"><div><span className="section-kicker">TOPIC & TITLE</span><h2>选题与标题方向</h2></div></div><ol className="title-options">{remake.titleOptions.map((title, index) => <li key={title}><span>0{index + 1}</span><strong>{title}</strong><CopyButton value={title} /></li>)}</ol></section>
            <section className="remake-section remake-script"><div className="section-heading"><div><span className="section-kicker">FULL SCRIPT</span><h2>可继续修改的完整文案</h2></div><CopyButton value={remake.fullScript} label="复制全文" /></div><blockquote>{remake.openingHook}</blockquote><p>{remake.fullScript}</p><div className="cta-line"><span>结尾</span><strong>{remake.cta}</strong></div></section>
            <section className="remake-section"><div className="section-heading"><div><span className="section-kicker">SHOOTING MAP</span><h2>分段表达与拍摄提示</h2></div></div><div className="segment-table"><div className="segment-row segment-row--header"><span>时间</span><span>表达任务</span><span>文案</span><span>拍摄提示</span></div>{remake.segments.map((segment) => <div className="segment-row" key={segment.time}><span>{segment.time}</span><strong>{segment.task}</strong><span>{segment.copy}</span><span>{segment.shooting}</span></div>)}</div></section>
            <section className="remake-section remake-mechanisms"><div><strong>继承的结构机制</strong>{remake.inheritedMechanisms.map((item) => <span key={item}>{item}</span>)}</div><div><strong>为当前账号做的迁移</strong>{remake.adaptations.map((item) => <span key={item}>{item}</span>)}</div></section>
          </div>
        )
      ) : null}

      <ProfileDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={selectProfile} />
    </div>
  );
}
