import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader, StatusBadge } from '../components/Common';
import { ProfileDialog } from '../components/ProfileDialog';
import { useAppStore } from '../store/AppStore';
import type { AccountProfile } from '../types';

export function ProfilesPage() {
  const { profiles, removeProfile, notify } = useAppStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccountProfile | null>(null);

  const selected = (_profile: AccountProfile) => {
    setOpen(false);
    setEditing(null);
  };

  return (
    <div className="page">
      <PageHeader eyebrow="ACCOUNT CONTEXT / 账号资料" title="让 AI 先理解你要做什么" description="这里保存的是复刻所需的最小内容上下文，不是完整的账号策划方案。" actions={<button className="button button--primary" type="button" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={17} /> 新建资料</button>} />

      <div className="profile-page-grid">
        {profiles.map((profile) => (
          <article className="profile-card" key={profile.id}>
            <header>
              <span className={`profile-avatar profile-avatar--${profile.color}`}>{profile.name.slice(0, 1)}</span>
              <div><h2>{profile.name}</h2><p>{profile.businessAndGoals}</p></div>
              <StatusBadge tone="neutral">更新于 {profile.updatedAt}</StatusBadge>
            </header>
            <dl>
              <div><dt>创作者与账号</dt><dd>{profile.creatorAndAccount}</dd></div>
              <div><dt>目标受众与期待行动</dt><dd>{profile.audienceAndAction}</dd></div>
              <div><dt>真实可用素材</dt><dd>{profile.availableMaterials}</dd></div>
              <div><dt>制作条件</dt><dd>{profile.productionConditions}</dd></div>
              <div><dt>调性与边界</dt><dd>{profile.toneAndBoundaries}</dd></div>
            </dl>
            <footer>
              <span>全部来自用户确认</span>
              <div>
                <button className="icon-button" type="button" aria-label="编辑资料" onClick={() => { setEditing(profile); setOpen(true); }}><Pencil size={16} /></button>
                <button className="icon-button icon-button--danger" type="button" aria-label="删除资料" onClick={() => { removeProfile(profile.id); notify('资料已删除', 'info'); }}><Trash2 size={16} /></button>
              </div>
            </footer>
          </article>
        ))}
      </div>

      <ProfileDialog open={open} title={editing ? `编辑“${editing.name}”` : '新建账号资料'} initialProfile={editing || undefined} onClose={() => { setOpen(false); setEditing(null); }} onSelect={selected} />
    </div>
  );
}
