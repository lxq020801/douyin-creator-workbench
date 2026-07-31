import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api';
import { defaultSettings } from '../data/mockData';
import type { AccountProfile, RuntimeSettings } from '../types';

interface ToastState {
  message: string;
  tone: 'success' | 'info' | 'danger';
}

interface AppStoreValue {
  profiles: AccountProfile[];
  settings: RuntimeSettings;
  ready: boolean;
  toast: ToastState | null;
  refreshProfiles: () => Promise<void>;
  addProfile: (profile: AccountProfile) => Promise<AccountProfile>;
  updateProfile: (profile: AccountProfile) => Promise<AccountProfile>;
  removeProfile: (id: string) => Promise<void>;
  saveSettings: (settings: RuntimeSettings) => Promise<RuntimeSettings>;
  notify: (message: string, tone?: ToastState['tone']) => void;
}

const AppStore = createContext<AppStoreValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);
  const [settings, setSettings] = useState<RuntimeSettings>(defaultSettings);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const notify = (message: string, tone: ToastState['tone'] = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  const refreshProfiles = async () => setProfiles(await api.profiles.list());

  useEffect(() => {
    const load = async () => {
      try {
        const [serverSettings, serverProfiles] = await Promise.all([api.settings.get(), api.profiles.list()]);
        setSettings(serverSettings);
        window.localStorage.removeItem('reference.settings');
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
    saveSettings: async (draft) => {
      const saved = await api.settings.save(draft);
      setSettings(saved);
      window.localStorage.removeItem('reference.settings');
      return saved;
    },
    notify,
  }), [profiles, settings, ready, toast]);

  return <AppStore.Provider value={value}>{children}</AppStore.Provider>;
}

export function useAppStore() {
  const value = useContext(AppStore);
  if (!value) throw new Error('useAppStore must be used inside AppProvider');
  return value;
}
