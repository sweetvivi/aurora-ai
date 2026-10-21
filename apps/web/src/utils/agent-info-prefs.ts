export interface AgentInfoPrefs {
  favorites: string[];
  pinned: string[];
}

export const AGENT_INFO_PREFS_STORAGE_KEY = 'aurora:agent-info-prefs:v1';

export function emptyAgentInfoPrefs(): AgentInfoPrefs {
  return { favorites: [], pinned: [] };
}

export function parseAgentInfoPrefs(raw: string | null): AgentInfoPrefs {
  if (!raw) {
    return emptyAgentInfoPrefs();
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return emptyAgentInfoPrefs();
    }

    return {
      favorites: toStringArray(parsed.favorites),
      pinned: toStringArray(parsed.pinned),
    };
  } catch {
    return emptyAgentInfoPrefs();
  }
}

export function serializeAgentInfoPrefs(prefs: AgentInfoPrefs): string {
  return JSON.stringify({
    favorites: [...new Set(prefs.favorites)],
    pinned: [...new Set(prefs.pinned)],
  });
}

export function readAgentInfoPrefs(): AgentInfoPrefs {
  try {
    return parseAgentInfoPrefs(window.localStorage.getItem(AGENT_INFO_PREFS_STORAGE_KEY));
  } catch {
    return emptyAgentInfoPrefs();
  }
}

export function writeAgentInfoPrefs(prefs: AgentInfoPrefs): void {
  try {
    window.localStorage.setItem(AGENT_INFO_PREFS_STORAGE_KEY, serializeAgentInfoPrefs(prefs));
  } catch {
    // 存储不可用（隐私模式等）时静默降级：仅失去持久化，不影响当次交互
  }
}

export function toggleAgentPreference(
  prefs: AgentInfoPrefs,
  kind: 'favorites' | 'pinned',
  agentId: string,
): AgentInfoPrefs {
  const current = kind === 'favorites' ? prefs.favorites : prefs.pinned;
  const next = current.includes(agentId)
    ? current.filter((id) => id !== agentId)
    : [...current, agentId];

  return kind === 'favorites' ? { ...prefs, favorites: next } : { ...prefs, pinned: next };
}

export function isAgentFavorited(prefs: AgentInfoPrefs, agentId: string): boolean {
  return prefs.favorites.includes(agentId);
}

export function isAgentPinned(prefs: AgentInfoPrefs, agentId: string): boolean {
  return prefs.pinned.includes(agentId);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
