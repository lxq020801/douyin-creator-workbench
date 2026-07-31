import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { SettingsPage } from './pages/SettingsPage';
import { WorkbenchPage } from './pages/WorkbenchPage';
import { WorkspaceOverviewPage } from './pages/WorkspaceOverviewPage';
import { UnifiedWorkspacePage } from './pages/UnifiedWorkspacePage';
import { RemakeWorkspacePage } from './pages/RemakeWorkspacePage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<WorkbenchPage />} />
        <Route path="workspace" element={<WorkspaceOverviewPage />} />
        <Route path="workspace/result/:id" element={<UnifiedWorkspacePage />} />
        <Route path="workspace/remake/:id" element={<RemakeWorkspacePage />} />
        <Route path="admin/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
