import { Outlet } from 'react-router-dom';
import { useAppStore } from '../store/AppStore';

export function AppShell() {
  const { toast } = useAppStore();

  return (
    <div className="app-shell">
      <main className="app-main"><Outlet /></main>
      {toast ? <div className={`toast toast--${toast.tone}`}>{toast.message}</div> : null}
    </div>
  );
}
