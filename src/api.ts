import type {
  DraftSuggestion,
  DraftState,
  Hero,
  Item,
  ItemSuggestion,
  LiveState,
  PlayerRole,
  RankBracket,
  StatusPayload,
} from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText);
  return data as T;
}

export const api = {
  status: () => request<StatusPayload>("/api/status"),
  heroes: () => request<Hero[]>("/api/heroes"),
  items: () => request<Item[]>("/api/items"),
  heroDetail: (id: number) =>
    request<{ hero: Hero; abilities: { key: string; dname: string; desc: string; img: string }[] }>(
      `/api/heroes/${id}`,
    ),
  draftSuggest: (body: {
    allied: number[];
    enemy: number[];
    banned: number[];
    rank: RankBracket;
    role: PlayerRole;
    pool?: number[];
    poolOnly?: boolean;
  }) =>
    request<DraftSuggestion[]>("/api/draft/suggest", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  itemSuggest: (body: {
    heroId: number;
    enemy: number[];
    ownedItems?: string[];
    phase?: string;
    role?: PlayerRole;
  }) =>
    request<ItemSuggestion[]>("/api/items/suggest", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  live: () => request<LiveState>("/api/live"),
  installGsi: () =>
    request<{ ok: boolean; path?: string; message: string; searched: string[] }>(
      "/api/gsi/install",
      { method: "POST" },
    ),
};

export function emptyDraft(): DraftState {
  return {
    radiant: [null, null, null, null, null],
    dire: [null, null, null, null, null],
    bans: [],
    side: "radiant",
    rank: "divine_plus",
    role: "any",
  };
}
