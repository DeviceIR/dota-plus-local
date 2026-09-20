import type { LiveState } from "./types.ts";
import { heroShortName, itemKeyFromGsi } from "./paths.ts";

type GsiItem = { name?: string };
type GsiDraftTeam = {
  pick0_id?: number;
  pick1_id?: number;
  pick2_id?: number;
  pick3_id?: number;
  pick4_id?: number;
  ban0_id?: number;
  ban1_id?: number;
  ban2_id?: number;
  ban3_id?: number;
  ban4_id?: number;
  ban5_id?: number;
  ban6_id?: number;
  picks?: { type?: string; class?: string; id?: number }[];
};

export type GsiPayload = {
  auth?: { token?: string };
  map?: {
    clock_time?: number;
    game_time?: number;
    paused?: boolean;
    game_state?: string;
  };
  player?: { name?: string; steamid?: string };
  hero?: { name?: string; level?: number; id?: number };
  items?: Record<string, GsiItem | Record<string, GsiItem>>;
  draft?: {
    team2?: GsiDraftTeam;
    team3?: GsiDraftTeam;
    radiant?: GsiDraftTeam;
    dire?: GsiDraftTeam;
  };
};

let lastRaw: GsiPayload | null = null;
let lastUpdate = 0;

function pickIds(team: GsiDraftTeam | undefined): (number | null)[] {
  if (!team) return [null, null, null, null, null];
  if (Array.isArray(team.picks)) {
    const picks = team.picks.filter((p) => p.type === "pick" || p.id);
    const ids = picks.map((p) => (p.id && p.id > 0 ? p.id : null));
    while (ids.length < 5) ids.push(null);
    return ids.slice(0, 5);
  }
  return [0, 1, 2, 3, 4].map((i) => {
    const id = team[`pick${i}_id` as keyof GsiDraftTeam];
    return typeof id === "number" && id > 0 ? id : null;
  });
}

function banIds(team: GsiDraftTeam | undefined): number[] {
  if (!team) return [];
  if (Array.isArray(team.picks)) {
    return team.picks
      .filter((p) => p.type === "ban" && typeof p.id === "number" && p.id > 0)
      .map((p) => p.id as number);
  }
  const out: number[] = [];
  for (let i = 0; i <= 6; i++) {
    const id = team[`ban${i}_id` as keyof GsiDraftTeam];
    if (typeof id === "number" && id > 0) out.push(id);
  }
  return out;
}

function flattenItems(items: GsiPayload["items"]): string[] {
  if (!items) return [];
  const names: string[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const rec = value as Record<string, unknown>;
    if (typeof rec.name === "string" && rec.name.startsWith("item_")) {
      const key = itemKeyFromGsi(rec.name);
      if (key && key !== "empty") names.push(key);
      return;
    }
    for (const child of Object.values(rec)) visit(child);
  };
  visit(items);
  return [...new Set(names)];
}

export function ingestGsi(body: GsiPayload): void {
  lastRaw = body;
  lastUpdate = Date.now();
}

export function getLiveState(): LiveState {
  const fresh = lastUpdate > 0 && Date.now() - lastUpdate < 45_000;
  if (!lastRaw || !fresh) {
    return {
      connected: false,
      lastUpdate: lastUpdate || null,
      clock: null,
      gameState: null,
      paused: false,
      steamName: null,
      hero: null,
      items: [],
      draft: null,
    };
  }

  const heroName = lastRaw.hero?.name;
  const draftSrc = lastRaw.draft;
  const radiantTeam = draftSrc?.radiant ?? draftSrc?.team2;
  const direTeam = draftSrc?.dire ?? draftSrc?.team3;
  const radiant = pickIds(radiantTeam);
  const dire = pickIds(direTeam);
  const bans = [...banIds(radiantTeam), ...banIds(direTeam)];
  const hasDraft = [...radiant, ...dire, ...bans].some((id) => typeof id === "number" && id > 0);

  return {
    connected: true,
    lastUpdate,
    clock: lastRaw.map?.clock_time ?? lastRaw.map?.game_time ?? null,
    gameState: lastRaw.map?.game_state ?? null,
    paused: Boolean(lastRaw.map?.paused),
    steamName: lastRaw.player?.name ?? null,
    hero: heroName
      ? {
          name: heroName,
          shortName: heroShortName(heroName),
          level: lastRaw.hero?.level ?? 0,
        }
      : null,
    items: flattenItems(lastRaw.items),
    draft: hasDraft ? { radiant, dire, bans } : null,
  };
}
