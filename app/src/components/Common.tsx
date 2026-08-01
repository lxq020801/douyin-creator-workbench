import { Check, Copy, LoaderCircle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useAppStore } from '../store/AppStore';

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'red' | 'green' | 'blue' | 'warning' }) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}

export function CopyButton({ value, label = '复制' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { notify } = useAppStore();

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    notify('已复制到剪贴板');
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button className="button button--ghost button--sm" type="button" onClick={copy}>
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? '已复制' : label}
    </button>
  );
}

export function ProgressSteps({ steps, active }: { steps: string[]; active: number }) {
  return (
    <ol className="progress-steps">
      {steps.map((step, index) => {
        const done = index < active;
        const current = index === active;
        return (
          <li key={step} className={done ? 'is-done' : current ? 'is-current' : ''}>
            <span className="progress-step-icon">
              {done ? <Check size={15} /> : current ? <LoaderCircle className="spin" size={15} /> : index + 1}
            </span>
            <span>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}
