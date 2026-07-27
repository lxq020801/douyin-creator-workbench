import { Bot, CheckCircle2, Cookie, Cpu, Eye, EyeOff, FileText, Gauge, KeyRound, RotateCcw, Save } from 'lucide-react';
import { useState } from 'react';
import { PageHeader, StatusBadge } from '../components/Common';
import { defaultSettings } from '../data/mockData';
import { useAppStore } from '../store/AppStore';
import type { RuntimeSettings } from '../types';

const promptTabs = [
  { key: 'videoBreakdown', label: '单条视频拆解' },
  { key: 'videoRemake', label: '单条视频复刻' },
  { key: 'profileIntake', label: '账号资料问诊' },
  { key: 'accountSummary', label: '账号打法汇总' },
  { key: 'globalFacts', label: '全局事实规则' },
] as const;

export function SettingsPage() {
  const { settings, saveSettings, notify } = useAppStore();
  const [draft, setDraft] = useState<RuntimeSettings>(settings);
  const [tab, setTab] = useState<'model' | 'crawler' | 'video' | 'prompts'>('model');
  const [promptKey, setPromptKey] = useState<(typeof promptTabs)[number]['key']>('videoBreakdown');
  const [showSecret, setShowSecret] = useState(false);
  const modelReady = Boolean(draft.apiKey.trim() && draft.baseUrl.trim() && draft.model.trim());

  const save = () => {
    saveSettings(draft);
    notify('运行设置已保存');
  };

  return (
    <div className="page page--settings">
      <PageHeader eyebrow="ADMIN / 运行设置" title="管理模型、采集与提示词" description="这些配置只对管理员开放。敏感字段在正式接入时由后端加密保存。" actions={<button className="button button--primary" type="button" onClick={save}><Save size={17} /> 保存设置</button>} />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="设置类别">
          <button type="button" className={tab === 'model' ? 'is-active' : ''} onClick={() => setTab('model')}><Cpu size={17} /><span><strong>模型与 API</strong><small>Ark / 兼容接口</small></span></button>
          <button type="button" className={tab === 'crawler' ? 'is-active' : ''} onClick={() => setTab('crawler')}><Cookie size={17} /><span><strong>抖音认证</strong><small>Cookie 与同步状态</small></span></button>
          <button type="button" className={tab === 'video' ? 'is-active' : ''} onClick={() => setTab('video')}><Gauge size={17} /><span><strong>视频处理</strong><small>抽帧、超时与并发</small></span></button>
          <button type="button" className={tab === 'prompts' ? 'is-active' : ''} onClick={() => setTab('prompts')}><Bot size={17} /><span><strong>系统提示词</strong><small>五个独立场景</small></span></button>
        </nav>

        <section className="settings-panel">
          {tab === 'model' ? (
            <div className="settings-section">
              <div className="settings-section-heading"><div><span>MODEL CONNECTION</span><h2>模型与 API</h2></div><StatusBadge tone={modelReady ? 'green' : 'warning'}><CheckCircle2 size={13} /> {modelReady ? '配置完整' : '等待 API Key'}</StatusBadge></div>
              <div className="form-grid">
                <label className="span-2"><span>API Key</span><div className="secret-field"><KeyRound size={17} /><input type={showSecret ? 'text' : 'password'} value={draft.apiKey} onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })} placeholder="输入 Ark 或兼容服务的 API Key" /><button className="icon-button" type="button" onClick={() => setShowSecret((value) => !value)} aria-label="显示或隐藏 API Key">{showSecret ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
                <label className="span-2"><span>Base URL</span><input value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} /></label>
                <label><span>模型名称</span><input value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} /></label>
                <label><span>请求超时（秒）</span><input type="number" value={draft.timeout} onChange={(event) => setDraft({ ...draft, timeout: Number(event.target.value) })} /></label>
              </div>
              <div className="connection-note"><Cpu size={18} /><div><strong>接入边界</strong><p>页面只读取统一配置。实际 Files 上传、状态轮询和 Responses API 调用继续由 Agent-wiki 的媒体适配层负责。</p></div></div>
            </div>
          ) : null}

          {tab === 'crawler' ? (
            <div className="settings-section">
              <div className="settings-section-heading"><div><span>DOUYIN ACCESS</span><h2>抖音 Cookie</h2></div><StatusBadge tone={draft.douyinCookie ? 'green' : 'warning'}>{draft.douyinCookie ? '已配置' : '等待配置'}</StatusBadge></div>
              <label><span>Web Cookie</span><textarea className="settings-textarea settings-textarea--cookie" value={draft.douyinCookie} onChange={(event) => setDraft({ ...draft, douyinCookie: event.target.value })} placeholder="sessionid=...; msToken=..." /></label>
              <div className="cookie-status-grid"><div><span>当前长度</span><strong>{draft.douyinCookie.length}</strong></div><div><span>最近同步</span><strong>尚未连接</strong></div><div><span>同步来源</span><strong>Agent-wiki 扩展</strong></div></div>
              <div className="connection-note"><Cookie size={18} /><div><strong>正式接入后</strong><p>沿用现有浏览器扩展和私有 Cookie 文件，不在浏览器本地存储中保存明文。</p></div></div>
            </div>
          ) : null}

          {tab === 'video' ? (
            <div className="settings-section">
              <div className="settings-section-heading"><div><span>VIDEO PIPELINE</span><h2>视频处理参数</h2></div></div>
              <div className="form-grid">
                <label><span>模型抽帧 FPS</span><input type="number" step="0.1" min="0.1" value={draft.videoFps} onChange={(event) => setDraft({ ...draft, videoFps: Number(event.target.value) })} /><small>长视频会继续按帧预算自动切片。</small></label>
                <label><span>最大并发任务</span><input type="number" min="1" max="8" value={draft.maxConcurrent} onChange={(event) => setDraft({ ...draft, maxConcurrent: Number(event.target.value) })} /><small>账号全量深拆时控制同时上传数量。</small></label>
                <label><span>单任务超时（秒）</span><input type="number" value={draft.timeout} onChange={(event) => setDraft({ ...draft, timeout: Number(event.target.value) })} /></label>
              </div>
            </div>
          ) : null}

          {tab === 'prompts' ? (
            <div className="settings-section settings-section--prompts">
              <div className="settings-section-heading"><div><span>PROMPT REGISTRY</span><h2>系统提示词</h2></div><button className="button button--ghost button--sm" type="button" onClick={() => setDraft({ ...draft, prompts: { ...draft.prompts, [promptKey]: defaultSettings.prompts[promptKey] } })}><RotateCcw size={14} /> 恢复默认</button></div>
              <div className="prompt-workspace">
                <div className="prompt-list">{promptTabs.map((item) => <button key={item.key} type="button" className={promptKey === item.key ? 'is-active' : ''} onClick={() => setPromptKey(item.key)}><FileText size={15} />{item.label}</button>)}</div>
                <div className="prompt-editor"><div><strong>{promptTabs.find((item) => item.key === promptKey)?.label}</strong><span>{draft.prompts[promptKey].length} 字</span></div><textarea value={draft.prompts[promptKey]} onChange={(event) => setDraft({ ...draft, prompts: { ...draft.prompts, [promptKey]: event.target.value } })} /></div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
