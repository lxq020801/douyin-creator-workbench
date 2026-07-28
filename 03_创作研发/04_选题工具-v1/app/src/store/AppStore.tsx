import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api';
import { defaultSettings, initialTasks } from '../data/mockData';
import type { AccountProfile, RuntimeSettings, TaskRecord } from '../types';

interface ToastState {
  message: string;
  tone: 'success' | 'info' | 'danger';
}

interface AppStoreValue {
  profiles: AccountProfile[];
  tasks: TaskRecord[];
  settings: RuntimeSettings;
  ready: boolean;
  toast: ToastState | null;
  refreshProfiles: () => Promise<void>;
  addProfile: (profile: AccountProfile) => Promise<AccountProfile>;
  updateProfile: (profile: AccountProfile) => Promise<AccountProfile>;
  removeProfile: (id: string) => Promise<void>;
  addTask: (task: TaskRecord) => void;
  updateTask: (id: string, patch: Partial<TaskRecord>) => void;
  saveSettings: (settings: RuntimeSettings) => Promise<RuntimeSettings>;
  notify: (message: string, tone?: ToastState['tone']) => void;
}

const AppStore = createContext<AppStoreValue | null>(null);

function legacySettings(): RuntimeSettings {
  try {
    const value = window.localStorage.getItem('reference.settings');
    return value ? { ...defaultSettings, ...JSON.parse(value) as RuntimeSettings } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks);
  const [settings, setSettings] = useState<RuntimeSettings>(legacySettings);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const notify = (message: string, tone: ToastState['tone'] = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  const refreshProfiles = async () => setProfiles(await api.profiles.list());

  useEffect(() => {
    const load = async () => {
      const legacy = legacySettings();
      try {
        const [serverSettings, serverProfiles] = await Promise.all([api.settings.get(), api.profiles.list()]);
        setSettings({
          ...serverSettings,
          apiKey: serverSettings.apiKeyConfigured ? serverSettings.apiKey : legacy.apiKey,
          douyinCookie: serverSettings.douyinCookieConfigured ? serverSettings.douyinCookie : legacy.douyinCookie,
        });
        setProfiles(serverProfiles);
      } catch (error) {
        notify(error instanceof Error ? error.message : '后端尚未启动', 'danger');
      } finally {
        setReady(true);
      }
    };
    void load();
  }, []);

  const value = useMemo<AppStoreValue>(() => ({
    profiles,
    tasks,
    settings,
    ready,
    toast,
    refreshProfiles,
    addProfile: async (profile) => {
      const saved = await api.profiles.create(profile);
      setProfiles((items) => [saved, ...items]);
      return saved;
    },
    updateProfile: async (profile) => {
      const saved = await api.profiles.update(profile);
      setProfiles((items) => items.map((item) => item.id === saved.id ? saved : item));
      return saved;
    },
    removeProfile: async (id) => {
      await api.profiles.remove(id);
      setProfiles((items) => items.filter((item) => item.id !== id));
    },
    addTask: (task) => setTasks((items) => [task, ...items.filter((item) => item.id !== task.id)]),
    updateTask: (id, patch) => setTasks((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item)),
    saveSettings: async (draft) => {
      const saved = await api.settings.save(draft);
      setSettings(saved);
      window.localStorage.removeItem('reference.settings');
      return saved;
    },
    notify,
  }), [profiles, tasks, settings, ready, toast]);

  return <AppStore.Provider value={value}>{children}</AppStore.Provider>;
}

export function useAppStore() {
  const value = useContext(AppStore);
  if (!value) throw new Error('useAppStore must be used inside AppProvider');
  return value;
}
