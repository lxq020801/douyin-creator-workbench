import { Bot, CheckCircle2, Cookie, Cpu, FileText, Gauge, KeyRound, RotateCcw, Save, UsersRound, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader, StatusBadge } from '../components/Common';
import { api } from '../api';
import { defaultSettings } from '../data/mockData';
import { useAppStore } from '../store/AppStore';
import type { RuntimeSettings } from '../types';
import { UserManagementPanel } from '../components/UserManagementPanel';
import { ProductHeader } from '../components/ProductHeader';

const promptTabs = [
  { key: 'common', label: '公共基础提示词' },
  { key: 'videoBreakdown', label: '单条视频拆解' },
  { key: 'accountSummary', label: '账号主页综合分析' },
  { key: 'profileIntake', label: '账号资料问诊与资料卡' },
  { key: 'videoTopics', label: '单条视频对标选题' },
  { key: 'accountTopics', label: '账号对标选题' },
  { key: 'scriptGeneration', label: '选题生成可拍脚本' },
] as const;

export function SettingsPage() {
  const { settings, saveSettings, notify } = useAppStore();
  const [draft, setDraft] = useState<RuntimeSettings>(settings);
  const [promptDefaults, setPromptDefaults] = useState<Record<string, string>>(defaultSettings.prompts);
  const [promptVersion, setPromptVersion] = useState(settings.promptPackVersion || 'codex-topic-diversity-v1');
  const [tab, setTab] = useState<'users' | 'model' | 'crawler' | 'video' | 'prompts'>('users');
  const [promptKey, setPromptKey] = useState<(typeof promptTabs)[number]['key']>('videoBreakdown');
  const [testing, setTesting] = useState<'model' | 'cookie' | null>(null);
  const [testState, setTestState] = useState<{ type: 'model' | 'cookie'; message: string; ok: boolean } | null>(null);
  const modelReady = Boolean((draft.apiKey.trim() || draft.apiKeyConfigured) && draft.baseUrl.trim() && draft.model.trim());
  const cookieReady = Boolean(draft.douyinCookie.trim() || draft.douyinCookieConfigured);

  useEffect(() => setDraft(settings), [settings]);
  useEffect(() => {
    let active = true;
    api.settings.promptDefaults()
      .then((result) => {
        if (!active) return;
        setPromptDefaults(result.prompts);
        setPromptVersion(result.version);
      })
      .catch(() => {
        // The saved prompts remain editable if the defaults endpoint is temporarily unavailable.
      });
    return () => { active = false; };
  }, []);

  const save = async () => {
    try {
      await saveSettings(draft);
      notify('运行设置已保存');
    } catch (error) {
      notify(error instanceof Error ? error.message : '设置保存失败', 'danger');
    }
  };

  const testConnection = async (type: 'model' | 'cookie') => {
    setTestState(null);
    setTesting(type);
    try {
      const saved = await saveSettings(draft);
      setDraft(saved);
      const result = type === 'model' ? await api.settings.testModel() : await api.settings.testCookie();
      setTestState({ type, message: result.message, ok: result.ok });
    } catch (error) {
      setTestState({ type, message: error instanceof Error ? error.message : '检测失败', ok: false });
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="settings-page-shell">
      <ProductHeader />
      <div className="page page--settings">
        <PageHeader eyebrow="ADMIN / 系统管理" title="管理用户与运行设置" description="用户空间彼此隔离；模型、采集和提示词由管理员统一维护。" actions={tab === 'users' ? undefined : <button className="button button--primary" type="button" onClick={() => void save()}><Save size={17} /> 保存设置</button>} />
        <div className="settings-layout">
        <nav className="settings-nav" aria-label="设置类别">
          <button type="button" className={tab === 'users' ? 'is-active' : ''} onClick={() => setTab('users')}><UsersRound size={17} /><span><strong>用户管理</strong><small>账号与工作空间</small></span></button>
          <button type="button" className={tab === 'model' ? 'is-active' : ''} onClick={() => setTab('model')}><Cpu size={17} /><span><strong>模型与 API</strong><small>Ark / 兼容接口</small></span></button>
          <button type="button" className={tab === 'crawler' ? 'is-active' : ''} onClick={() => setTab('crawler')}><Cookie size={17} /><span><strong>抖音认证</strong><small>Cookie 与同步状态</small></span></button>
          <button type="button" className={tab === 'video' ? 'is-active' : ''} onClick={() => setTab('video')}><Gauge size={17} /><span><strong>视频处理</strong><small>抽帧、超时与并发</small></span></button>
          <button type="button" className={tab === 'prompts' ? 'is-active' : ''} onClick={() => setTab('prompts')}><Bot size={17} /><span><strong>系统提示词</strong><small>公共底座 + 六项专业能力</small></span></button>
        </nav>

        <section className="settings-panel">
          {tab === 'users' ? <UserManagementPanel /> : null}
          {tab !== 'users' ? <form className="settings-form" id="runtime-settings-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          {tab === 'model' ? (
            <div className="settings-section">
              <div className="settings-section-heading"><div><span>MODEL CONNECTION</span><h2>模型与 API</h2></div><StatusBadge tone={modelReady ? 'green' : 'warning'}><CheckCircle2 size={13} /> {modelReady ? '配置完整' : '等待 API Key'}</StatusBadge></div>
              <div className="form-grid">
                <label className="span-2"><span>API Key</span><div className="secret-field"><KeyRound size={17} /><input type="password" value={draft.apiKey} onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })} placeholder={draft.apiKeyConfigured ? '已保存；留空保留原值，输入新值可替换' : '输入 Ark 或兼容服务的 API Key'} /></div></label>
                <label className="span-2"><span>Base URL</span><input value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} /></label>
                <label><span>模型名称</span><input value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} /></label>
                <label><span>请求超时（秒）</span><input type="number" value={draft.timeout} onChange={(event) => setDraft({ ...draft, timeout: Number(event.target.value) })} /></label>
              </div>
              <div className="settings-actions-row"><button className="button button--ghost button--sm" type="button" disabled={!modelReady || testing !== null} onClick={() => void testConnection('model')}><Wifi size={15} /> {testing === 'model' ? '正在保存并测试…' : '保存并测试模型'}</button>{testState?.type === 'model' ? <StatusBadge tone={testState.ok ? 'green' : 'warning'}>{testState.message}</StatusBadge> : null}</div>
              <div className="connection-note"><Cpu size={18} /><div><strong>统一配置</strong><p>本地所有分析任务使用这里的模型配置；敏感值保存后不再回显，留空提交不会清除原配置。</p></div></div>
            </div>
          ) : null}

          {tab === 'crawler' ? (
            <div className="settings-section">
              <div className="settings-section-heading"><div><span>DOUYIN ACCESS</span><h2>抖音 Cookie</h2></div><StatusBadge tone={cookieReady ? 'green' : 'warning'}>{cookieReady ? '已配置' : '等待配置'}</StatusBadge></div>
              <label><span>Web Cookie</span><textarea className="settings-textarea settings-textarea--cookie" value={draft.douyinCookie} onChange={(event) => setDraft({ ...draft, douyinCookie: event.target.value })} placeholder={draft.douyinCookieConfigured ? '已保存；留空保留原值，粘贴新 Cookie 可替换' : 'sessionid=...; msToken=...'} /></label>
              <div className="cookie-status-grid"><div><span>配置状态</span><strong>{cookieReady ? '已保存' : '未配置'}</strong></div><div><span>保存位置</span><strong>本机服务端</strong></div><div><span>配置来源</span><strong>管理员手动粘贴</strong></div></div>
              <div className="settings-actions-row"><button className="button button--ghost button--sm" type="button" disabled={!cookieReady || testing !== null} onClick={() => void testConnection('cookie')}><Wifi size={15} /> {testing === 'cookie' ? '正在保存并检测…' : '保存并检测 Cookie'}</button>{testState?.type === 'cookie' ? <StatusBadge tone={testState.ok ? 'green' : 'warning'}>{testState.message}</StatusBadge> : null}</div>
              <div className="connection-note"><Cookie size={18} /><div><strong>手动配置</strong><p>本地版不迁移浏览器自动同步；任务会继续验证 Cookie 是否真的能读取视频和主页。</p></div></div>
            </div>
          ) : null}

          {tab === 'video' ? (
            <div className="settings-section">
              <div className="settings-section-heading"><div><span>VIDEO PIPELINE</span><h2>视频处理参数</h2></div></div>
              <div className="form-grid">
                <label><span>模型抽帧 FPS</span><input type="number" step="0.1" min="0.1" max="5" value={draft.videoFps} onChange={(event) => setDraft({ ...draft, videoFps: Number(event.target.value) })} /><small>长视频会继续按帧预算自动切片。</small></label>
                <label><span>最大并发任务</span><input type="number" min="1" max="3" value={draft.maxConcurrent} onChange={(event) => setDraft({ ...draft, maxConcurrent: Number(event.target.value) })} /><small>账号深拆与批量脚本最多同时运行 3 条。</small></label>
                <label><span>单任务超时（秒）</span><input type="number" value={draft.timeout} onChange={(event) => setDraft({ ...draft, timeout: Number(event.target.value) })} /></label>
              </div>
            </div>
          ) : null}

          {tab === 'prompts' ? (
            <div className="settings-section settings-section--prompts">
              <div className="settings-section-heading"><div><span>PROMPT REGISTRY / {promptVersion}</span><h2>外部方案提示词</h2></div><button className="button button--ghost button--sm" type="button" disabled={!promptDefaults[promptKey]} onClick={() => setDraft({ ...draft, prompts: { ...draft.prompts, [promptKey]: promptDefaults[promptKey] || '' } })}><RotateCcw size={14} /> 恢复本版默认</button></div>
              <div className="prompt-workspace">
                <div className="prompt-list">{promptTabs.map((item) => <button key={item.key} type="button" className={promptKey === item.key ? 'is-active' : ''} onClick={() => setPromptKey(item.key)}><FileText size={15} />{item.label}</button>)}</div>
                <div className="prompt-editor"><div><strong>{promptTabs.find((item) => item.key === promptKey)?.label}</strong><span>{(draft.prompts[promptKey] || '').length} 字</span></div><textarea value={draft.prompts[promptKey] || ''} onChange={(event) => setDraft({ ...draft, prompts: { ...draft.prompts, [promptKey]: event.target.value } })} /><p className="prompt-runtime-note"><CheckCircle2 size={14} />这里的正文会直接参与真实模型请求。公共基础提示词会与当前专业任务组合，程序只在之后追加本次真实输入和保存结果所需的 JSON 结构。</p></div>
              </div>
            </div>
          ) : null}
          </form> : null}
        </section>
        </div>
      </div>
    </div>
  );
}
