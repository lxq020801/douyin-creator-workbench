import {
  AlertTriangle,
  ArrowRight,
  BookOpenText,
  Check,
  Clock3,
  Database,
  Filter,
  Link2,
  ListChecks,
  ScanSearch,
  Sparkles,
  TrendingUp,
  UsersRound,
  WandSparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Metric, PageHeader, ProgressSteps, StatusBadge } from '../components/Common';
import { Modal } from '../components/Modal';
import { ProfileDialog } from '../components/ProfileDialog';
import { compactNumber, researchVideos, sampleAccountReport, sampleAccountUrl } from '../data/mockData';
import { useAppStore } from '../store/AppStore';
import type { AccountProfile } from '../types';

type CollectionMode = 'all' | 'smart';
type AccountStage = 'setup' | 'running' | 'report';

const accountSteps = ['扫描全量作品元数据', '建立内容数据池', '下载并深拆选中视频', '比较爆款与常态样本', '生成账号打法地图'];

export function AccountWorkspacePage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addTask, updateTask, notify } = useAppStore();
  const [url, setUrl] = useState((location.state as { url?: string } | null)?.url || '');
  const [mode, setMode] = useState<CollectionMode>('smart');
  const [deepCount, setDeepCount] = useState(12);
  const [stage, setStage] = useState<AccountStage>(id === 'sample' ? 'report' : 'setup');
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [targetProfile, setTargetProfile] = useState<AccountProfile | null>(null);
  const [showViralOnly, setShowViralOnly] = useState(false);
  const taskId = useMemo(() => `account-${Date.now()}`, []);
  const visibleResearchVideos = showViralOnly ? researchVideos.filter((video) => video.sampleRole === '爆款') : researchVideos;

  const totalVideos = 186;
  const actualDeepCount = mode === 'all' ? totalVideos : deepCount;
  const estimate = mode === 'all'
    ? { time: '约 4 小时 20 分', cost: '¥46–68', note: '所有可获取视频都会真实上传给模型深拆。' }
    : { time: `约 ${Math.max(18, Math.round(actualDeepCount * 2.6))} 分钟`, cost: `¥${Math.max(2, Math.round(actualDeepCount * 0.28))}–${Math.max(3, Math.round(actualDeepCount * 0.42))}`, note: '全量元数据保留，深拆样本覆盖爆款、常态、早期和转折期。' };

  useEffect(() => {
    if (stage !== 'running') return;
    if (activeStep >= accountSteps.length - 1) {
      const done = window.setTimeout(() => {
        setStage('report');
        updateTask(taskId, { status: 'completed', progress: 100, detail: '账号打法地图' });
        notify('账号打法地图已生成');
      }, 800);
      return () => window.clearTimeout(done);
    }
    const timer = window.setTimeout(() => {
      setActiveStep((value) => value + 1);
      updateTask(taskId, { progress: Math.round(((activeStep + 1) / accountSteps.length) * 100) });
    }, 850);
    return () => window.clearTimeout(timer);
  }, [stage, activeStep, notify, taskId, updateTask]);

  const openPreflight = () => {
    if (!url.trim()) setUrl(sampleAccountUrl);
    setPreflightOpen(true);
  };

  const confirmRun = () => {
    setPreflightOpen(false);
    setStage('running');
    setActiveStep(0);
    addTask({ id: taskId, kind: 'account', title: '内容实验室账号打法研究', source: `${totalVideos} 条作品 · 深拆 ${actualDeepCount} 条`, status: 'running', progress: 6, createdAt: '刚刚', detail: '扫描账号元数据' });
  };

  const selectProfile = (profile: AccountProfile) => {
    setTargetProfile(profile);
    setProfileOpen(false);
    notify(`已按“${profile.name}”生成第一轮测试选题`);
  };

  if (stage === 'setup' || stage === 'running') {
    return (
      <div className="page">
        <PageHeader eyebrow="ACCOUNT RESEARCH / 账号研究" title="研究一个账号的长期打法" description="先获取全量作品数据，再决定所有视频都深拆，还是只深拆有代表性的样本。" />
        <section className="account-setup">
          <div className="account-setup-block">
            <div className="setup-index">01</div><div className="setup-content"><h2>输入抖音账号主页</h2><p>系统会先读取账号资料和全部可获取作品的元数据。</p><div className="url-entry"><Link2 size={19} /><input value={url} disabled={stage === 'running'} onChange={(event) => setUrl(event.target.value)} placeholder="粘贴抖音账号主页链接" /></div>{!url ? <button className="sample-link" type="button" onClick={() => setUrl(sampleAccountUrl)}>填入示例主页</button> : null}</div>
          </div>

          <div className="account-setup-block">
            <div className="setup-index">02</div><div className="setup-content"><h2>选择分析方案</h2><p>两种方案都会保留全量元数据；差别在于真正上传模型深拆的视频数量。</p>
              <div className="collection-modes">
                <button type="button" className={mode === 'all' ? 'is-active' : ''} disabled={stage === 'running'} onClick={() => setMode('all')}><span className="mode-icon"><Database size={20} /></span><span><strong>全量深拆</strong><small>全部作品都下载并上传模型</small></span><span className="radio-mark">{mode === 'all' ? <Check size={14} /> : null}</span></button>
                <button type="button" className={mode === 'smart' ? 'is-active' : ''} disabled={stage === 'running'} onClick={() => setMode('smart')}><span className="mode-icon"><ScanSearch size={20} /></span><span><strong>智能取样</strong><small>全量扫描，选择多层样本深拆</small></span><span className="radio-mark">{mode === 'smart' ? <Check size={14} /> : null}</span></button>
              </div>
              {mode === 'smart' ? <div className="sampling-config"><div><label><span>深拆数量</span><strong>{deepCount} 条</strong></label><input type="range" min="6" max="30" step="2" value={deepCount} disabled={stage === 'running'} onChange={(event) => setDeepCount(Number(event.target.value))} /></div><div className="sample-mix"><span><i className="sample-dot sample-dot--red" /> 高表现样本 40%</span><span><i className="sample-dot sample-dot--blue" /> 常态样本 30%</span><span><i className="sample-dot sample-dot--green" /> 时间线样本 30%</span></div></div> : <div className="full-scan-note"><AlertTriangle size={18} /><p><strong>这不是只采集标题。</strong>全部 {totalVideos} 条作品都会下载、上传并生成独立单条拆解，再汇总为账号报告。</p></div>}
            </div>
          </div>

          <div className="account-setup-block account-setup-block--last">
            <div className="setup-index">03</div><div className="setup-content"><h2>执行前核对</h2><div className="preflight-inline"><div><span>作品数据池</span><strong>{totalVideos} 条</strong></div><div><span>真实深拆</span><strong>{actualDeepCount} 条</strong></div><div><span>预计耗时</span><strong>{estimate.time}</strong></div><div><span>模型成本</span><strong>{estimate.cost}</strong></div></div><button className="button button--primary" type="button" disabled={stage === 'running'} onClick={openPreflight}>{stage === 'running' ? '研究进行中' : '核对并开始'} <ArrowRight size={17} /></button></div>
          </div>
        </section>

        {stage === 'running' ? <section className="processing-panel account-processing"><header><div><span className="live-indicator" />账号任务运行中</div><strong>{Math.round(((activeStep + 1) / accountSteps.length) * 100)}%</strong></header><ProgressSteps steps={accountSteps} active={activeStep} /><div className="processing-video-list"><div className="processing-video-row processing-video-row--header"><span>深拆样本</span><span>样本角色</span><span>互动信号</span><span>状态</span></div>{researchVideos.slice(0, Math.min(6, actualDeepCount)).map((video, index) => { const complete = index < activeStep + 1; return <div className="processing-video-row" key={video.id}><span>{video.title}</span><StatusBadge tone={video.sampleRole === '爆款' ? 'red' : video.sampleRole === '常态' ? 'blue' : 'green'}>{video.sampleRole}</StatusBadge><span>{compactNumber(video.likes)} 赞 · {compactNumber(video.comments)} 评</span><span>{complete ? <StatusBadge tone="green">已拆解</StatusBadge> : index === activeStep + 1 ? <StatusBadge tone="blue">处理中</StatusBadge> : <StatusBadge>等待</StatusBadge>}</span></div>})}</div></section> : null}

        <Modal open={preflightOpen} title="确认本次账号研究" description="账号深拆会产生模型调用和较长处理时间，确认后才开始。" onClose={() => setPreflightOpen(false)}>
          <div className="preflight-modal">
            <div className="preflight-mode"><span className="mode-icon">{mode === 'all' ? <Database size={21} /> : <ScanSearch size={21} />}</span><div><strong>{mode === 'all' ? '全量深拆' : '智能取样'}</strong><p>{estimate.note}</p></div></div>
            <dl><div><dt>检测到的作品</dt><dd>{totalVideos} 条</dd></div><div><dt>进入模型深拆</dt><dd>{actualDeepCount} 条</dd></div><div><dt>预计完成时间</dt><dd>{estimate.time}</dd></div><div><dt>预计模型成本</dt><dd>{estimate.cost}</dd></div></dl>
            <div className="boundary-note"><AlertTriangle size={17} /><p>估算会受视频时长、切片数量和模型计费变化影响；正式执行前将读取实际账号数据重新计算。</p></div>
            <div className="modal-footer"><button className="button button--ghost" type="button" onClick={() => setPreflightOpen(false)}>返回调整</button><button className="button button--primary" type="button" onClick={confirmRun}><Check size={17} /> 确认并开始</button></div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="page page--account-report">
      <PageHeader eyebrow="ACCOUNT PLAYBOOK / 打法地图" title="这个账号如何持续运转" description="单条报告作为证据保留；这里重点呈现长期内容结构、起量路径与可以迁移的动作。" actions={<button className="button button--primary" type="button" onClick={() => setProfileOpen(true)}><WandSparkles size={17} /> 迁移到我的账号</button>} />

      <section className="account-source-band">
        <span className="account-avatar-large">内</span><div className="account-source-main"><StatusBadge tone="blue">抖音账号</StatusBadge><h2>{sampleAccountReport.account.name}</h2><p>@{sampleAccountReport.account.handle}</p><strong>{sampleAccountReport.account.promise}</strong></div><div className="account-metrics"><Metric label="粉丝" value={compactNumber(sampleAccountReport.account.followers)} /><Metric label="作品" value={`${sampleAccountReport.account.videos}`} /><Metric label="本次深拆" value="12" detail="爆款 / 常态 / 时间线" /></div>
      </section>

      <section className="report-section account-map-section"><div className="report-index">01</div><div className="report-content"><span className="section-kicker">CONTENT MAP</span><h2>内容支柱与稳定承诺</h2><div className="pillar-list">{sampleAccountReport.pillars.map((pillar) => <div className="pillar-row" key={pillar.name}><div><strong>{pillar.name}</strong><span>{pillar.note}</span></div><div className="pillar-bar"><i style={{ width: `${pillar.ratio}%` }} /></div><b>{pillar.ratio}%</b></div>)}</div></div></section>

      <section className="report-section"><div className="report-index">02</div><div className="report-content"><span className="section-kicker">GROWTH PATH</span><h2>从试探到稳定起量</h2><div className="growth-timeline">{sampleAccountReport.timeline.map((item, index) => <article key={item.phase}><span className="timeline-number">0{index + 1}</span><div><StatusBadge tone={index === 2 ? 'red' : index === 3 ? 'green' : 'blue'}>{item.phase}</StatusBadge><small>{item.range}</small><h3>{item.action}</h3><p>{item.signal}</p></div></article>)}</div></div></section>

      <section className="report-section"><div className="report-index">03</div><div className="report-content"><span className="section-kicker">VIRAL VS BASELINE</span><h2>爆款和常态内容，差别在哪里</h2><div className="comparison-table"><div className="comparison-row comparison-row--header"><span>维度</span><span>高表现样本</span><span>常态样本</span><span>判断</span></div>{sampleAccountReport.viralVsNormal.map((item) => <div className="comparison-row" key={item.dimension}><strong>{item.dimension}</strong><span>{item.viral}</span><span>{item.normal}</span><span>{item.conclusion}</span></div>)}</div></div></section>

      <section className="report-section"><div className="report-index">04</div><div className="report-content"><span className="section-kicker">HOOK LIBRARY</span><h2>反复出现的开头模式</h2><ol className="hook-patterns">{sampleAccountReport.hookPatterns.map((pattern, index) => <li key={pattern}><span>0{index + 1}</span><strong>{pattern}</strong></li>)}</ol></div></section>

      <section className="report-section"><div className="report-index">05</div><div className="report-content"><span className="section-kicker">TRANSFER RULES</span><h2>可以迁移的原则与边界</h2><div className="rule-list">{sampleAccountReport.transferable.map((item) => <article key={item.rule}><div><TrendingUp size={18} /><strong>{item.rule}</strong></div><p>{item.evidence}</p><small><AlertTriangle size={14} /> {item.boundary}</small></article>)}</div><div className="risk-line"><strong>需要规避</strong>{sampleAccountReport.risks.map((risk) => <span key={risk}>{risk}</span>)}</div></div></section>

      <section className="report-section report-section--topics"><div className="report-index">06</div><div className="report-content"><div className="section-heading"><div><span className="section-kicker">FIRST TESTS</span><h2>{targetProfile ? `给“${targetProfile.name}”的第一轮测试` : '优先测试的选题方向'}</h2></div>{targetProfile ? <StatusBadge tone="green"><UsersRound size={13} /> 已结合账号资料</StatusBadge> : <button className="button button--secondary button--sm" type="button" onClick={() => setProfileOpen(true)}><Sparkles size={15} /> 结合我的账号</button>}</div><div className="topic-result-list">{sampleAccountReport.testTopics.map((topic, index) => <article key={topic.title}><span className="topic-priority">{String(index + 1).padStart(2, '0')}</span><div><StatusBadge tone={topic.priority === '优先' ? 'red' : 'neutral'}>{topic.priority}</StatusBadge><h3>{topic.title}</h3><p>{topic.reason}</p></div><button className="icon-button" type="button" aria-label="加入候选选题" onClick={() => notify('已加入候选选题')}><ListChecks size={17} /></button></article>)}</div></div></section>

      <section className="sample-evidence-section"><div className="section-heading"><div><span className="section-kicker">SAMPLE EVIDENCE</span><h2>本次深拆样本</h2><p>每条样本都保留独立的单条视频报告。</p></div><button className="button button--ghost button--sm" type="button" onClick={() => setShowViralOnly((value) => !value)}><Filter size={15} /> {showViralOnly ? '查看全部样本' : '只看爆款'}</button></div><div className="research-video-table"><div className="research-video-row research-video-row--header"><span>视频</span><span>角色</span><span>发布时间</span><span>互动数据</span><span>报告</span></div>{visibleResearchVideos.map((video) => <div className="research-video-row" key={video.id}><strong>{video.title}</strong><StatusBadge tone={video.sampleRole === '爆款' ? 'red' : video.sampleRole === '常态' ? 'blue' : 'green'}>{video.sampleRole}</StatusBadge><span>{video.publishedAt}</span><span>{compactNumber(video.likes)} 赞 · {compactNumber(video.shares)} 分享</span><button className="button button--ghost button--sm" type="button" onClick={() => navigate('/video/sample')}><BookOpenText size={14} /> 查看拆解</button></div>)}</div></section>

      <ProfileDialog open={profileOpen} title="把账号打法迁移到哪份资料" onClose={() => setProfileOpen(false)} onSelect={selectProfile} />
    </div>
  );
}
