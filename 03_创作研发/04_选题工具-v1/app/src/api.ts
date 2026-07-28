import type {
  AccountProfile,
  AnalysisRecord,
  GeneratedScript,
  GeneratedTopic,
  RuntimeSettings,
} from './types';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    let message = `请求失败 (${response.status})`;
    try {
      const payload = await response.json() as { detail?: string | Record<string, string> };
      message = typeof payload.detail === 'string' ? payload.detail : JSON.stringify(payload.detail);
    } catch {
      // Keep the status-based message when the backend did not return JSON.
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

type ProfileWire = Omit<AccountProfile, 'color'>;

function withColor(profile: ProfileWire, index = 0): AccountProfile {
  const colors: AccountProfile['color'][] = ['red', 'green', 'blue'];
  return { ...profile, color: colors[index % colors.length] };
}

export const api = {
  settings: {
    get: () => request<RuntimeSettings>('/api/settings'),
    save: (value: RuntimeSettings) => request<RuntimeSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(value) }),
    testModel: () => request<{ ok: boolean; message: string; detail: Record<string, unknown> }>('/api/settings/test-model', { method: 'POST' }),
    testCookie: () => request<{ ok: boolean; message: string }>('/api/settings/test-cookie', { method: 'POST' }),
  },
  profiles: {
    list: async () => (await request<ProfileWire[]>('/api/profiles')).map(withColor),
    create: async (value: AccountProfile) => withColor(await request<ProfileWire>('/api/profiles', { method: 'POST', body: JSON.stringify(value) })),
    update: async (value: AccountProfile) => withColor(await request<ProfileWire>(`/api/profiles/${value.id}`, { method: 'PUT', body: JSON.stringify(value) })),
    remove: (id: string) => request<void>(`/api/profiles/${id}`, { method: 'DELETE' }),
    intake: (description: string, answers: string[]) => request<{ status: 'followup' | 'complete'; question: string; draft: Omit<AccountProfile, 'id' | 'color' | 'updatedAt'> | null }>('/api/profiles/intake', { method: 'POST', body: JSON.stringify({ description, answers }) }),
  },
  analyses: {
    list: () => request<AnalysisRecord[]>('/api/analyses'),
    get: (id: string) => request<AnalysisRecord>(`/api/analyses/${id}`),
    create: (kind: 'video' | 'account', source: string) => request<AnalysisRecord>(`/api/analyses/${kind}`, { method: 'POST', body: JSON.stringify({ source }) }),
    retry: (id: string) => request<AnalysisRecord>(`/api/analyses/${id}/retry`, { method: 'POST' }),
    cancel: (id: string) => request<AnalysisRecord>(`/api/analyses/${id}/cancel`, { method: 'POST' }),
    remove: (id: string) => request<void>(`/api/analyses/${id}`, { method: 'DELETE' }),
  },
  topics: {
    list: (analysisId: string, profileId?: string) => request<GeneratedTopic[]>(`/api/analyses/${analysisId}/topics${profileId ? `?profileId=${profileId}` : ''}`),
    generate: (analysisId: string, profileId: string) => request<GeneratedTopic[]>(`/api/analyses/${analysisId}/topics`, { method: 'POST', body: JSON.stringify({ profileId }) }),
    update: (topic: GeneratedTopic) => request<GeneratedTopic>(`/api/topics/${topic.id}`, { method: 'PUT', body: JSON.stringify(topic) }),
  },
  scripts: {
    list: (filters: { analysisId?: string; topicId?: string } = {}) => {
      const query = new URLSearchParams();
      if (filters.analysisId) query.set('analysisId', filters.analysisId);
      if (filters.topicId) query.set('topicId', filters.topicId);
      return request<GeneratedScript[]>(`/api/scripts${query.size ? `?${query}` : ''}`);
    },
    batch: (topicIds: string[]) => request<GeneratedScript[]>('/api/scripts/batch', { method: 'POST', body: JSON.stringify({ topicIds }) }),
    retry: (id: string) => request<GeneratedScript>(`/api/scripts/${id}/retry`, { method: 'POST' }),
  },
};

export { ApiError };
