import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultSettings, initialProfiles, initialTasks } from '../data/mockData';
import type { AccountProfile, RuntimeSettings, TaskRecord } from '../types';

interface ToastState {
  message: string;
  tone: 'success' | 'info' | 'danger';
}

interface AppStoreValue {
  profiles: AccountProfile[];
  tasks: TaskRecord[];
  settings: RuntimeSettings;
  toast: ToastState | null;
  addProfile: (profile: AccountProfile) => void;
  updateProfile: (profile: AccountProfile) => void;
  removeProfile: (id: string) => void;
  addTask: (task: TaskRecord) => void;
  updateTask: (id: string, patch: Partial<TaskRecord>) => void;
  saveSettings: (settings: RuntimeSettings) => void;
  notify: (message: string, tone?: ToastState['tone']) => void;
}

const AppStore = createContext<AppStoreValue | null>(null);

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<AccountProfile[]>(() => readStorage('reference.profiles', initialProfiles));
  const [tasks, setTasks] = useState<TaskRecord[]>(() => readStorage('reference.tasks', initialTasks));
  const [settings, setSettings] = useState<RuntimeSettings>(() => readStorage('reference.settings', defaultSettings));
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => window.localStorage.setItem('reference.profiles', JSON.stringify(profiles)), [profiles]);
  useEffect(() => window.localStorage.setItem('reference.tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => window.localStorage.setItem('reference.settings', JSON.stringify(settings)), [settings]);

  const notify = (message: string, tone: ToastState['tone'] = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 2600);
  };

  const value = useMemo<AppStoreValue>(() => ({
    profiles,
    tasks,
    settings,
    toast,
    addProfile: (profile) => setProfiles((items) => [profile, ...items]),
    updateProfile: (profile) => setProfiles((items) => items.map((item) => item.id === profile.id ? profile : item)),
    removeProfile: (id) => setProfiles((items) => items.filter((item) => item.id !== id)),
    addTask: (task) => setTasks((items) => [task, ...items.filter((item) => item.id !== task.id)]),
    updateTask: (id, patch) => setTasks((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item)),
    saveSettings: setSettings,
    notify,
  }), [profiles, tasks, settings, toast]);

  return <AppStore.Provider value={value}>{children}</AppStore.Provider>;
}

export function useAppStore() {
  const value = useContext(AppStore);
  if (!value) throw new Error('useAppStore must be used inside AppProvider');
  return value;
}
