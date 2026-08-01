import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { SettingsPage } from './pages/SettingsPage';
import { WorkbenchPage } from './pages/WorkbenchPage';
import { UnifiedWorkspacePage } from './pages/UnifiedWorkspacePage';
import { RemakeWorkspacePage } from './pages/RemakeWorkspacePage';
import { LoginPage } from './pages/LoginPage';
import { useAppStore } from './store/AppStore';

export function App() {
  const { currentUser, authReady } = useAppStore();

  if (!authReady) return <div className="auth-loading"><span /><p>正在连接工作空间…</p></div>;
  if (!currentUser) return <LoginPage />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<WorkbenchPage />} />
        <Route path="workspace" element={<Navigate to="/#history" replace />} />
        <Route path="workspace/result/:id" element={<UnifiedWorkspacePage />} />
        <Route path="workspace/remake/:id" element={<RemakeWorkspacePage />} />
        <Route path="admin/settings" element={currentUser.role === 'admin' ? <SettingsPage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
