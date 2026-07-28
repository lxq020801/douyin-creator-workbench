import { ArrowRight, FileSearch, Link2, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductHeader } from '../components/ProductHeader';
import { sampleAccountUrl, sampleVideoUrl } from '../data/mockData';
import { api } from '../api';

type IntakeMode = 'video' | 'account';

const headlineSets = {
  video: [
    { lead: '先把一条视频', accent: '拆明白' },
    { lead: '从一条爆款里', accent: '找到方法' },
    { lead: '把对标思路', accent: '变成选题' },
  ],
  account: [
    { lead: '先看清一个账号', accent: '怎么持续做' },
    { lead: '从五十条作品里', accent: '找到方向' },
    { lead: '把起量路径', accent: '变成方法' },
  ],
} satisfies Record<IntakeMode, Array<{ lead: string; accent: string }>>;

export function WorkbenchPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<IntakeMode>('video');
  const [url, setUrl] = useState('');
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const headlines = headlineSets[mode];
  const headline = headlines[headlineIndex];
  const previousHeadlineIndex = (headlineIndex - 1 + headlines.length) % headlines.length;

  useEffect(() => {
    setHeadlineIndex(0);
    const rotation = window.setInterval(() => {
      setHeadlineIndex((current) => (current + 1) % headlineSets[mode].length);
    }, 5200);

    return () => window.clearInterval(rotation);
  }, [mode]);

  const start = async () => {
    if (!url.trim()) return;
    setSubmitting(true);
    try {
      const analysis = await api.analyses.create(mode, url.trim());
      navigate(`/workspace/result/${analysis.id}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '任务创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const isVideo = mode === 'video';

  return (
    <div className="home-v2">
      <ProductHeader />

      <main className="home-v2-main">
        <div className="home-v2-meta"><i /> INPUT / 参考输入</div>

        <div className="home-v2-mode" role="tablist" aria-label="选择分析对象">
          <button type="button" className={isVideo ? 'is-active' : ''} onClick={() => { setMode('video'); setUrl(''); }}>
            <span>01</span><FileSearch size={18} />单条视频
          </button>
          <button type="button" className={!isVideo ? 'is-active' : ''} onClick={() => { setMode('account'); setUrl(''); }}>
            <span>02</span><UsersRound size={18} />整个账号
          </button>
        </div>

        <section className="home-v2-hero">
          <div className="home-v2-copy">
            <h1 aria-label={`${headline.lead}${headline.accent}`}>
              {headlines.map((item, index) => (
                <span
                  aria-hidden={index !== headlineIndex}
                  className={`home-v2-headline-frame${index === headlineIndex ? ' is-active' : index === previousHeadlineIndex ? ' is-previous' : ' is-next'}`}
                  key={`${mode}-${item.lead}`}
                >
                  <span>{item.lead}</span><em>{item.accent}</em>
                </span>
              ))}
            </h1>
            <p>{isVideo ? '看懂钩子、结构和画面为什么有效，再决定哪些值得学。' : '采集 50 条作品，找到内容方向、起量路径和真正可迁移的方法。'}</p>
          </div>
        </section>

        <section className="home-v2-intake">
          <div className="home-v2-input">
            <Link2 size={20} />
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') void start(); }}
              placeholder={isVideo ? '粘贴抖音视频链接或分享文案' : '粘贴抖音账号主页链接'}
              aria-label={isVideo ? '抖音视频链接' : '抖音账号主页链接'}
            />
            <button type="button" disabled={!url.trim() || submitting} onClick={() => void start()}>
              {submitting ? '任务创建中…' : isVideo ? '开始拆解' : '采集 50 条视频'} <ArrowRight size={18} />
            </button>
          </div>
          <div className="home-v2-intake-note">
            <button type="button" onClick={() => setUrl(isVideo ? sampleVideoUrl : sampleAccountUrl)}>填入演示链接</button>
            <span>{isVideo ? '拆解不需要先填写行业资料' : '30 条完整深拆 · 20 条元数据辅助判断'}</span>
          </div>
        </section>
      </main>

      <footer className="home-v2-footer">
        <span>DIRECTOR LINE / EDIT DECISION</span>
        <span>VIDEO BENCHMARK / 01</span>
      </footer>
    </div>
  );
}
