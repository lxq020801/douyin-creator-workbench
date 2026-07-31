import { ArrowLeft, ArrowRight, Check, Plus, Sparkles, UserRoundCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAppStore } from '../store/AppStore';
import type { AccountProfile, IntakeAnswer } from '../types';
import { Modal } from './Modal';
import { StatusBadge } from './Common';

interface ProfileDialogProps {
  open: boolean;
  title?: string;
  initialProfile?: AccountProfile;
  onClose: () => void;
  onSelect: (profile: AccountProfile) => void;
}

const exampleDescription = '我在柳州开了一家社区型的老牌螺蛳粉店，开了8年，主打传统骨汤螺蛳粉，还有卤味、炒螺这些小吃。店是自己的房子，没有加盟，就是夫妻店加两个员工。账号由我本人出镜，我是30多岁的柳州本地老板，说话比较直，不会演，想做得真实一点。我主要想吸引周边3公里的居民和来柳州旅游的游客，最终目标是到店消费，也想慢慢卖一些真空包装螺蛳粉。现阶段先把人设和门店口碑立起来，不急着硬推产品。我可以拍每天熬汤、卤味制作、顾客到店、顾客反馈、螺蛳粉冷知识、本地人的吃法，以及开店这些年的真实经历。拍摄就是手机，我老婆偶尔帮忙，不会复杂剪辑，每周更新2到3条，每条拍加剪大约2小时。账号想做成真实、接地气的本地老店老板，不搞夸张剧情，不贬低同行，不做9.9元低价引流，不承诺“最好吃”“第一”这类话。';

const emptyDraft = {
  name: '新账号资料',
  creatorAndAccount: '',
  businessAndGoals: '',
  audienceAndAction: '',
  availableMaterials: '',
  productionConditions: '',
  toneAndBoundaries: '',
};

export function ProfileDialog({ open, title = '选择复刻到哪个账号', initialProfile, onClose, onSelect }: ProfileDialogProps) {
  const { profiles, addProfile, updateProfile, notify } = useAppStore();
  const [mode, setMode] = useState<'select' | 'create'>(initialProfile ? 'create' : 'select');
  const [selectedId, setSelectedId] = useState(profiles[0]?.id || '');
  const [description, setDescription] = useState('');
  const [createStep, setCreateStep] = useState<'describe' | 'followup' | 'card'>(initialProfile ? 'card' : 'describe');
  const [followup, setFollowup] = useState('');
  const [followupQuestion, setFollowupQuestion] = useState('');
  const [answers, setAnswers] = useState<IntakeAnswer[]>([]);
  const [busy, setBusy] = useState(false);
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
        creatorAndAccount: initialProfile.creatorAndAccount,
        businessAndGoals: initialProfile.businessAndGoals,
        audienceAndAction: initialProfile.audienceAndAction,
        availableMaterials: initialProfile.availableMaterials,
        productionConditions: initialProfile.productionConditions,
        toneAndBoundaries: initialProfile.toneAndBoundaries,
      });
      return;
    }
    setMode('select');
    setCreateStep('describe');
    setDescription('');
    setFollowup('');
    setFollowupQuestion('');
    setAnswers([]);
    setDraft(emptyDraft);
  }, [open, initialProfile]);

  const applyIntake = (result: Awaited<ReturnType<typeof api.profiles.intake>>) => {
    if (result.status === 'followup') {
      setFollowupQuestion(result.question);
      setCreateStep('followup');
      return;
    }
    if (result.draft) {
      const { originalDescription: _originalDescription, ...card } = result.draft;
      setDraft(card);
      setCreateStep('card');
    }
  };

  const startIntake = async () => {
    setBusy(true);
    try {
      applyIntake(await api.profiles.intake(description, []));
    } catch (error) {
      notify(error instanceof Error ? error.message : '资料整理失败', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const submitFollowup = async () => {
    const nextAnswers = [...answers, { question: followupQuestion, answer: followup.trim() }];
    setBusy(true);
    try {
      const result = await api.profiles.intake(description, nextAnswers);
      setAnswers(nextAnswers);
      setFollowup('');
      applyIntake(result);
    } catch (error) {
      notify(error instanceof Error ? error.message : '资料整理失败', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const confirmNewProfile = async () => {
    const profile: AccountProfile = {
      id: initialProfile?.id || `profile-${Date.now()}`,
      name: draft.name,
      color: initialProfile?.color || 'green',
      creatorAndAccount: draft.creatorAndAccount,
      businessAndGoals: draft.businessAndGoals,
      audienceAndAction: draft.audienceAndAction,
      availableMaterials: draft.availableMaterials,
      productionConditions: draft.productionConditions,
      toneAndBoundaries: draft.toneAndBoundaries,
      originalDescription: description || initialProfile?.originalDescription || '',
      updatedAt: '刚刚',
    };
    setBusy(true);
    try {
      const saved = initialProfile ? await updateProfile(profile) : await addProfile(profile);
      notify(initialProfile ? '账号资料已更新' : '账号资料已保存');
      onSelect(saved);
    } catch (error) {
      notify(error instanceof Error ? error.message : '账号资料保存失败', 'danger');
    } finally {
      setBusy(false);
    }
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
                  <small>{profile.businessAndGoals}</small>
                  <span>{profile.audienceAndAction}</span>
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
              <div className="intake-step-label">01 / 一段自然描述</div>
              <h3>告诉 AI 你是谁，以及真实能做什么</h3>
              <p>尽量说清业务、目标、受众、素材、拍摄条件和不能做的事。AI 只会对真正影响后续创作的缺项追问。</p>
              <textarea className="large-textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="例如：我是……，准备做……，主要给……看，我能提供……，但目前……" />
              <div className="example-box">
                <div><strong>完整示例</strong><span>业务 · 目标 · 受众 · 资源 · 制作条件 · 边界</span></div>
                <p>{exampleDescription}</p>
                <button className="text-button" type="button" onClick={() => setDescription(exampleDescription)}>使用这个示例</button>
              </div>
              <button className="button button--primary" type="button" disabled={!description.trim() || busy} onClick={() => void startIntake()}><Sparkles size={17} /> {busy ? '正在整理…' : 'AI 整理资料'}</button>
            </div>
          ) : null}

          {createStep === 'followup' ? (
            <div className="intake-stage">
              <div className="intake-step-label">02 / 必要追问</div>
              <div className="assistant-message"><Sparkles size={18} /><p>{followupQuestion}</p></div>
              <textarea className="large-textarea" value={followup} onChange={(event) => setFollowup(event.target.value)} placeholder="例如：可以真人出镜和录屏，但没有团队，暂时不做复杂外拍……" />
              <button className="button button--primary" type="button" disabled={!followup.trim() || busy} onClick={() => void submitFollowup()}><Sparkles size={17} /> {busy ? '正在整理…' : '继续生成资料卡'}</button>
            </div>
          ) : null}

          {createStep === 'card' ? (
            <div className="intake-stage">
              <div className="intake-step-label">03 / 核对资料卡</div>
              <div className="intake-title-row"><div><h3>确认后才能用于对标迁移</h3><p>所有字段都来自你的描述和回答，也可以手动调整。</p></div><StatusBadge tone="green">待你确认</StatusBadge></div>
              <div className="profile-form-grid">
                {Object.entries(draft).map(([key, value]) => (
                  <label key={key} className={key === 'name' ? '' : 'span-2'}>
                    <span>{({ name: '资料名称', creatorAndAccount: '创作者与账号', businessAndGoals: '业务与内容目标', audienceAndAction: '目标受众与期待行动', availableMaterials: '真实可用创作素材', productionConditions: '创作能力与制作条件', toneAndBoundaries: '账号调性与内容边界' } as Record<string, string>)[key]}</span>
                    {key === 'name' ? (
                      <input value={value} onChange={(event) => setDraft((item) => ({ ...item, [key]: event.target.value }))} />
                    ) : (
                      <textarea value={value} onChange={(event) => setDraft((item) => ({ ...item, [key]: event.target.value }))} />
                    )}
                  </label>
                ))}
              </div>
              <div className="modal-footer modal-footer--flush">
                <button className="button button--ghost" type="button" onClick={() => initialProfile ? close() : setCreateStep('describe')}>{initialProfile ? '取消' : '重新描述'}</button>
                <button className="button button--primary" type="button" disabled={busy} onClick={() => void confirmNewProfile()}><Check size={17} /> {initialProfile ? '保存修改' : '确认并使用'}</button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
