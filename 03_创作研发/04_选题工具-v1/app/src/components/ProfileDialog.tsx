import { ArrowLeft, ArrowRight, Check, Plus, Sparkles, UserRoundCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/AppStore';
import type { AccountProfile } from '../types';
import { Modal } from './Modal';
import { StatusBadge } from './Common';

interface ProfileDialogProps {
  open: boolean;
  title?: string;
  initialProfile?: AccountProfile;
  onClose: () => void;
  onSelect: (profile: AccountProfile) => void;
}

const exampleDescription = '我是一个有短视频编导经验的创作者，准备做 AI 工具实测账号，主要给编导和内容创作者看。我会真人出镜，也能录屏和做动画，但希望单条视频不要制作太久。';

const emptyDraft = {
  name: '新账号资料',
  industry: 'AI 工具与内容创作',
  creatorIdentity: '有短视频编导经验的内容创作者。',
  audience: '想提高选题、文案和制作效率的编导与内容创作者。',
  valuePromise: '用真实案例展示 AI 如何进入内容生产流程。',
  formatsAndResources: '真人讲解、录屏和基础动画。',
  constraints: '需要控制单条内容制作时间，保证可以持续更新。',
};

export function ProfileDialog({ open, title = '选择复刻到哪个账号', initialProfile, onClose, onSelect }: ProfileDialogProps) {
  const { profiles, addProfile, updateProfile, notify } = useAppStore();
  const [mode, setMode] = useState<'select' | 'create'>(initialProfile ? 'create' : 'select');
  const [selectedId, setSelectedId] = useState(profiles[0]?.id || '');
  const [description, setDescription] = useState('');
  const [createStep, setCreateStep] = useState<'describe' | 'followup' | 'card'>(initialProfile ? 'card' : 'describe');
  const [followup, setFollowup] = useState('');
  const [draft, setDraft] = useState(emptyDraft);

  const selected = useMemo(() => profiles.find((profile) => profile.id === selectedId), [profiles, selectedId]);

  useEffect(() => {
    if (!open) return;
    if (initialProfile) {
      setMode('create');
      setCreateStep('card');
      setDescription(initialProfile.originalDescription);
      setDraft({
        name: initialProfile.name,
        industry: initialProfile.industry,
        creatorIdentity: initialProfile.creatorIdentity,
        audience: initialProfile.audience,
        valuePromise: initialProfile.valuePromise,
        formatsAndResources: initialProfile.formatsAndResources,
        constraints: initialProfile.constraints,
      });
      return;
    }
    setMode('select');
    setCreateStep('describe');
    setDescription('');
    setFollowup('');
    setDraft(emptyDraft);
  }, [open, initialProfile]);

  const startIntake = () => {
    if (description.trim().length < 24) {
      setCreateStep('followup');
      return;
    }
    setDraft((value) => ({ ...value, name: description.includes('编导') ? 'AI 编导实验' : '新账号资料' }));
    setCreateStep('card');
  };

  const confirmNewProfile = () => {
    const profile: AccountProfile = {
      id: initialProfile?.id || `profile-${Date.now()}`,
      name: draft.name,
      color: initialProfile?.color || 'green',
      industry: draft.industry,
      creatorIdentity: draft.creatorIdentity,
      audience: draft.audience,
      valuePromise: draft.valuePromise,
      formatsAndResources: draft.formatsAndResources,
      constraints: draft.constraints,
      originalDescription: description || initialProfile?.originalDescription || '',
      inferredFields: initialProfile?.inferredFields || ['目标受众', '持续价值'],
      updatedAt: '刚刚',
    };
    if (initialProfile) updateProfile(profile);
    else addProfile(profile);
    notify(initialProfile ? '账号资料已更新' : '账号资料已保存');
    onSelect(profile);
  };

  const close = () => {
    setMode('select');
    setCreateStep('describe');
    onClose();
  };

  return (
    <Modal open={open} title={title} description={initialProfile ? '修改会同步到后续复刻使用的内容生产上下文。' : '拆解报告不会改变；这里只决定把结构迁移到哪一份内容生产上下文。'} wide onClose={close}>
      {mode === 'select' ? (
        <>
          <div className="profile-choice-list">
            {profiles.map((profile) => (
              <button
                type="button"
                key={profile.id}
                className={`profile-choice ${selectedId === profile.id ? 'is-selected' : ''}`}
                onClick={() => setSelectedId(profile.id)}
              >
                <span className={`profile-avatar profile-avatar--${profile.color}`}>{profile.name.slice(0, 1)}</span>
                <span className="profile-choice-main">
                  <strong>{profile.name}</strong>
                  <small>{profile.industry}</small>
                  <span>{profile.audience}</span>
                </span>
                <span className="profile-check">{selectedId === profile.id ? <Check size={16} /> : null}</span>
              </button>
            ))}
            <button type="button" className="profile-choice profile-choice--new" onClick={() => setMode('create')}>
              <span className="profile-avatar profile-avatar--empty"><Plus size={20} /></span>
              <span className="profile-choice-main"><strong>新建账号资料</strong><span>用一段话描述，AI 会整理成可确认的资料卡。</span></span>
              <ArrowRight size={17} />
            </button>
          </div>
          <div className="modal-footer">
            <button className="button button--ghost" type="button" onClick={close}>取消</button>
            <button className="button button--primary" type="button" disabled={!selected} onClick={() => selected && onSelect(selected)}>
              <UserRoundCheck size={17} /> 使用这份资料
            </button>
          </div>
        </>
      ) : (
        <div className="profile-intake">
          <button className="back-link" type="button" onClick={() => initialProfile ? close() : setMode('select')}><ArrowLeft size={15} /> {initialProfile ? '取消编辑' : '返回已有资料'}</button>

          {createStep === 'describe' ? (
            <div className="intake-stage">
              <div className="intake-step-label">01 / 一句话描述</div>
              <h3>告诉 AI 你是谁，以及准备做什么内容</h3>
              <p>有帮助的信息包括：行业、身份、受众、内容形式、可用素材和现实限制。不需要按表格逐项回答。</p>
              <textarea className="large-textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="例如：我是……，准备做……，主要给……看，我能提供……，但目前……" />
              <div className="example-box">
                <div><strong>完整示例</strong><span>身份 · 行业 · 受众 · 形式 · 资源 · 限制</span></div>
                <p>{exampleDescription}</p>
                <button className="text-button" type="button" onClick={() => setDescription(exampleDescription)}>使用这个示例</button>
              </div>
              <button className="button button--primary" type="button" disabled={!description.trim()} onClick={startIntake}><Sparkles size={17} /> AI 整理资料</button>
            </div>
          ) : null}

          {createStep === 'followup' ? (
            <div className="intake-stage">
              <div className="intake-step-label">02 / 必要追问</div>
              <div className="assistant-message"><Sparkles size={18} /><p>我已经知道你大概要做什么了。为了让后面的复刻结果更可执行，你现在最容易拿到哪些拍摄素材？还有没有明确不能做的形式？</p></div>
              <textarea className="large-textarea" value={followup} onChange={(event) => setFollowup(event.target.value)} placeholder="例如：可以真人出镜和录屏，但没有团队，暂时不做复杂外拍……" />
              <button className="button button--primary" type="button" disabled={!followup.trim()} onClick={() => setCreateStep('card')}><Sparkles size={17} /> 生成资料卡</button>
            </div>
          ) : null}

          {createStep === 'card' ? (
            <div className="intake-stage">
              <div className="intake-step-label">03 / 核对资料卡</div>
              <div className="intake-title-row"><div><h3>确认后才能用于复刻</h3><p>所有字段都可以手动调整。</p></div><StatusBadge tone="blue">2 项 AI 推断</StatusBadge></div>
              <div className="profile-form-grid">
                {Object.entries(draft).map(([key, value]) => (
                  <label key={key} className={key === 'name' ? '' : 'span-2'}>
                    <span>{({ name: '资料名称', industry: '行业 / 业务', creatorIdentity: '创作者身份与可信依据', audience: '目标受众及具体问题', valuePromise: '持续提供的内容价值', formatsAndResources: '视频形式与可用素材', constraints: '制作与表达限制' } as Record<string, string>)[key]}</span>
                    {key === 'name' || key === 'industry' ? (
                      <input value={value} onChange={(event) => setDraft((item) => ({ ...item, [key]: event.target.value }))} />
                    ) : (
                      <textarea value={value} onChange={(event) => setDraft((item) => ({ ...item, [key]: event.target.value }))} />
                    )}
                  </label>
                ))}
              </div>
              <div className="modal-footer modal-footer--flush">
                <button className="button button--ghost" type="button" onClick={() => initialProfile ? close() : setCreateStep('describe')}>{initialProfile ? '取消' : '重新描述'}</button>
                <button className="button button--primary" type="button" onClick={confirmNewProfile}><Check size={17} /> {initialProfile ? '保存修改' : '确认并使用'}</button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
