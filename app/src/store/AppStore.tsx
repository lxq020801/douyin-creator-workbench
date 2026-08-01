import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api';
import { defaultSettings } from '../data/mockData';
import type { AccountProfile, AuthUser, RuntimeSettings } from '../types';

interface ToastState {
  message: string;
  tone: 'success' | 'info' | 'danger';
}

interface AppStoreValue {
  currentUser: AuthUser | null;
  authReady: boolean;
  profiles: AccountProfile[];
  settings: RuntimeSettings;
  ready: boolean;
  toast: ToastState | null;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
  addProfile: (profile: AccountProfile) => Promise<AccountProfile>;
  updateProfile: (profile: AccountProfile) => Promise<AccountProfile>;
  removeProfile: (id: string) => Promise<void>;
  saveSettings: (settings: RuntimeSettings) => Promise<RuntimeSettings>;
  notify: (message: string, tone?: ToastState['tone']) => void;
}

const AppStore = createContext<AppStoreValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);
  const [settings, setSettings] = useState<RuntimeSettings>(defaultSettings);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const notify = (message: string, tone: ToastState['tone'] = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  const refreshProfiles = async () => setProfiles(await api.profiles.list());

  const loadWorkspace = async (user: AuthUser) => {
    const serverProfiles = await api.profiles.list();
    setProfiles(serverProfiles);
    if (user.role === 'admin') {
      const serverSettings = await api.settings.get();
      setSettings(serverSettings);
      window.localStorage.removeItem('reference.settings');
    } else {
      setSettings(defaultSettings);
    }
    setReady(true);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const user = await api.auth.me();
        if (!active) return;
        setCurrentUser(user);
        await loadWorkspace(user);
      } catch (error) {
        if (active && (!(error instanceof Error) || !('status' in error) || (error as { status?: number }).status !== 401)) {
          notify(error instanceof Error ? error.message : '后端尚未启动', 'danger');
        }
      } finally {
        if (active) setAuthReady(true);
      }
    };
    void load();
    const expire = () => {
      setCurrentUser(null);
      setProfiles([]);
      setReady(false);
      setAuthReady(true);
    };
    window.addEventListener('auth:unauthorized', expire);
    return () => {
      active = false;
      window.removeEventListener('auth:unauthorized', expire);
    };
  }, []);

  const value = useMemo<AppStoreValue>(() => ({
    currentUser,
    authReady,
    profiles,
    settings,
    ready,
    toast,
    login: async (username, password) => {
      const user = await api.auth.login(username, password);
      setCurrentUser(user);
      setReady(false);
      await loadWorkspace(user);
      return user;
    },
    logout: async () => {
      try {
        await api.auth.logout();
      } finally {
        setCurrentUser(null);
        setProfiles([]);
        setReady(false);
      }
    },
    changePassword: async (currentPassword, newPassword) => {
      await api.auth.changePassword(currentPassword, newPassword);
      setCurrentUser(null);
      setProfiles([]);
      setReady(false);
    },
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
  }), [currentUser, authReady, profiles, settings, ready, toast]);

  return <AppStore.Provider value={value}>{children}</AppStore.Provider>;
}

export function useAppStore() {
  const value = useContext(AppStore);
  if (!value) throw new Error('useAppStore must be used inside AppProvider');
  return value;
}
