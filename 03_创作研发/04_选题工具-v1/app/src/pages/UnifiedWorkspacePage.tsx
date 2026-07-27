import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Film,
  WandSparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ProfileDialog } from '../components/ProfileDialog';
import { Metric, StatusBadge } from '../components/Common';
import { ProductHeader } from '../components/ProductHeader';
import { compactNumber, initialProfiles, sampleAccountReport, sampleBreakdown } from '../data/mockData';
import type { AccountProfile } from '../types';

type ResultKind = 'video' | 'account';

const demoTopics = [
  { index: '01', title: '我让 AI 拆了一条真实爆款，5 分钟拿到 20 个选题', reason: '保留“真实任务 + 可计数结果”，把主角换成编导自己的工作过程。' },
  { index: '02', title: '为什么 AI 写的选题，总有一股 AI 味？', reason: '把原视频的工具证明结构，迁移为编导判断与真实操作的对照。' },
  { index: '03', title: '同一条爆款，换 3 个行业还能不能成立？', reason: '用跨行业测试证明迁移边界，适合继续发展为系列内容。' },
];

export function UnifiedWorkspacePage() {
  const location = useLocation();
  const kind = ((location.state as { kind?: ResultKind } | null)?.kind || 'video') as ResultKind;
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<AccountProfile>(initialProfiles[0]);

  return (
    <div className="workspace-v2">
      <ProductHeader />

      <main className="workspace-v2-main">
        <Link className="result-back-v3" to="/workspace"><ArrowLeft size={16} /> 返回工作台</Link>
        <header className="workspace-v2-heading">
          <div className="workspace-v2-label"><i /> {kind === 'video' ? 'SINGLE VIDEO / 单条拆解' : 'ACCOUNT STUDY / 账号研究'}</div>
          <div className="workspace-v2-heading-row">
            <div>
              <h1>{kind === 'video' ? sampleBreakdown.source.title : `${sampleAccountReport.account.name} · 账号全景研究`}</h1>
              <p>{kind === 'video' ? `@${sampleBreakdown.source.author} · ${sampleBreakdown.source.duration}` : `@${sampleAccountReport.account.handle} · 采集 50 条作品`}</p>
            </div>
            <span className="workspace-v2-status"><Check size={15} /> 拆解完成</span>
          </div>
        </header>

        {kind === 'video' ? <VideoReport /> : <AccountReport />}

        <section className="remake-bridge-v2">
          <div className="remake-bridge-v2-index">NEXT / 复刻</div>
          <div>
            <h2>把有效机制，换成你的行业和账号</h2>
            <p>拆解报告保持不变。选择一份账号资料后，才会生成针对你的选题和表达方向。</p>
          </div>
          <button type="button" onClick={() => setProfileOpen(true)}><WandSparkles size={18} />选择账号资料</button>
        </section>

        <section className="remake-output-v2">
          <header>
            <div><span>REFERENCE OUTPUT / 对标结果</span><h2>{profile.name}</h2></div>
            <button type="button" onClick={() => setProfileOpen(true)}>更换资料</button>
          </header>
          <p className="remake-output-v2-lead">从“展示 AI 很强”改成“编导如何用 AI 完成一次真实任务”，保留结果前置和过程举证，不复制原作者的话术。</p>
          <div className="topic-list-v2">
            {demoTopics.map((topic) => (
              <article key={topic.index}>
                <span>{topic.index}</span>
                <div><h3>{topic.title}</h3><p>{topic.reason}</p></div>
                <ArrowRight size={18} />
              </article>
            ))}
          </div>
        </section>
      </main>

      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} onSelect={(selected) => { setProfile(selected); setProfileOpen(false); }} />
    </div>
  );
}

function VideoReport() {
  return (
    <div className="report-v2">
      <section className="source-v2">
        <div className="source-cover-v2"><span>VIDEO / 00:47</span><Film size={32} /><small>9:16 SOURCE</small></div>
        <div className="source-copy-v2">
          <StatusBadge tone="blue">抖音视频</StatusBadge>
          <h2>{sampleBreakdown.source.title}</h2>
          <p>@{sampleBreakdown.source.author} · 发布于 {sampleBreakdown.source.metrics.publishedAt}</p>
          <a href={sampleBreakdown.source.url} target="_blank" rel="noreferrer">查看原视频 <ExternalLink size={14} /></a>
        </div>
        <div className="metrics-v2">
          <Metric label="播放" value={compactNumber(sampleBreakdown.source.metrics.views)} />
          <Metric label="点赞" value={compactNumber(sampleBreakdown.source.metrics.likes)} />
          <Metric label="评论" value={compactNumber(sampleBreakdown.source.metrics.comments)} />
          <Metric label="收藏" value={compactNumber(sampleBreakdown.source.metrics.collects)} />
        </div>
      </section>

      <ReportSection index="01" kicker="EDITOR'S SUMMARY" title="编导结论">
        <p className="report-v2-lead">{sampleBreakdown.summary}</p>
        <div className="report-v2-theme"><strong>核心主题</strong><span>{sampleBreakdown.theme}</span></div>
      </ReportSection>

      <ReportSection index="02" kicker="FIRST 3 SECONDS" title="前 3 秒，为什么能抓住人">
        <blockquote>{sampleBreakdown.hook.copy}</blockquote>
        <div className="report-v2-columns"><div><strong>作用机制</strong><p>{sampleBreakdown.hook.mechanism}</p></div><div><strong>画面动作</strong><p>{sampleBreakdown.hook.visualAction}</p></div></div>
      </ReportSection>

      <ReportSection index="03" kicker="STRUCTURE MAP" title="这条视频怎么往下走">
        <div className="timeline-v2">
          {sampleBreakdown.beats.map((beat, index) => (
            <article key={beat.timecode}><span>{beat.timecode}</span><i>{String(index + 1).padStart(2, '0')}</i><div><h3>{beat.role}</h3><p>{beat.originalCopy}</p><small>{beat.emotion} / {beat.visual}</small></div></article>
          ))}
        </div>
      </ReportSection>

      <ReportSection index="04" kicker="EVIDENCE & TRANSFER" title="什么值得学，什么不能照抄">
        <div className="evidence-v2">
          {sampleBreakdown.evidence.slice(0, 3).map((point) => <article key={point.label}><div><strong>{point.label}</strong><StatusBadge tone={point.confidence === '高' ? 'green' : 'blue'}>{point.confidence}</StatusBadge></div><p>{point.evidence}</p></article>)}
        </div>
        <div className="transfer-v2"><div><strong><Check size={16} /> 可迁移</strong>{sampleBreakdown.transferable.map((item) => <p key={item}>{item}</p>)}</div><div><strong><AlertTriangle size={16} /> 不建议照搬</strong>{sampleBreakdown.avoidCopying.map((item) => <p key={item}>{item}</p>)}</div></div>
      </ReportSection>
    </div>
  );
}

function AccountReport() {
  return (
    <div className="report-v2">
      <section className="account-source-v2">
        <div><span>ACCOUNT / SAMPLE 50</span><h2>{sampleAccountReport.account.name}</h2><p>{sampleAccountReport.account.promise}</p></div>
        <div className="account-numbers-v2"><Metric label="粉丝" value={compactNumber(sampleAccountReport.account.followers)} /><Metric label="账号作品" value={String(sampleAccountReport.account.videos)} /></div>
      </section>

      <section className="sampling-v2">
        <div><strong>50</strong><span>条作品完成采集</span></div>
        <div><strong>30</strong><span>条视频完整深拆</span></div>
        <div><strong>20</strong><span>条元数据辅助判断</span></div>
        <p>其余 20 条只读取标题、封面文字、发布时间、时长、标签与互动数据，不上传视频本体。</p>
      </section>

      <ReportSection index="01" kicker="CONTENT MAP" title="账号主要在讲什么">
        <div className="pillar-list-v2">{sampleAccountReport.pillars.map((pillar) => <article key={pillar.name}><div><strong>{pillar.name}</strong><span>{pillar.ratio}%</span></div><i><b style={{ width: `${pillar.ratio}%` }} /></i><p>{pillar.note}</p></article>)}</div>
      </ReportSection>

      <ReportSection index="02" kicker="GROWTH PATH" title="它是怎么一步步起量的">
        <div className="account-timeline-v2">{sampleAccountReport.timeline.map((phase, index) => <article key={phase.phase}><span>0{index + 1}</span><div><h3>{phase.phase} <small>{phase.range}</small></h3><p>{phase.action}</p><strong>{phase.signal}</strong></div></article>)}</div>
      </ReportSection>

      <ReportSection index="03" kicker="VIRAL VS NORMAL" title="爆款和常态内容，差在哪里">
        <div className="comparison-v2"><header><span>对比维度</span><span>高表现内容</span><span>常态内容</span></header>{sampleAccountReport.viralVsNormal.map((row) => <article key={row.dimension}><strong>{row.dimension}</strong><span>{row.viral}</span><span>{row.normal}</span><p>{row.conclusion}</p></article>)}</div>
      </ReportSection>

      <ReportSection index="04" kicker="ACCOUNT ADVICE" title="这个账号真正值得参考的方向">
        <div className="rules-v2">{sampleAccountReport.transferable.map((item, index) => <article key={item.rule}><span>0{index + 1}</span><div><h3>{item.rule}</h3><p>{item.evidence}</p><small>{item.boundary}</small></div></article>)}</div>
      </ReportSection>
    </div>
  );
}

function ReportSection({ index, kicker, title, children }: { index: string; kicker: string; title: string; children: React.ReactNode }) {
  return <section className="report-section-v2"><span className="report-index-v2">{index}</span><div><span className="report-kicker-v2">{kicker}</span><h2>{title}</h2>{children}</div></section>;
}
