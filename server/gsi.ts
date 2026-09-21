import { loadCatalog } from "./catalog.ts";
import type { LivePlayer, LiveState, PickPhase } from "./types.ts";
import { heroShortName, itemKeyFromGsi } from "./paths.ts";

type GsiItem = { name?: string };
type Json = Record<string, unknown>;

export type GsiPayload = {
  auth?: { token?: string };
  previously?: unknown;
  added?: unknown;
  map?: {
    clock_time?: number;
    game_time?: number;
    paused?: boolean;
    game_state?: string;
    daytime?: boolean;
    nightstalker_night?: boolean;
    matchid?: string | number;
  };
  player?: Json & {
    name?: string;
    steamid?: string;
    team_name?: string;
    team?: string | number;
    hero?: unknown;
  };
  hero?: Json & { name?: string; level?: number; id?: number | string };
  items?: Record<string, GsiItem | Record<string, GsiItem>>;
  draft?: Json;
  allplayers?: Record<string, unknown>;
};

type AccDraft = {
  key: string;
  radiant: (number | null)[];
  dire: (number | null)[];
  bans: number[];
};

let lastRaw: GsiPayload | null = null;
let lastUpdate = 0;
let accDraft: AccDraft = emptyAcc("lobby");

function emptySlots(): (number | null)[] {
  return [null, null, null, null, null];
}

function emptyAcc(key: string): AccDraft {
  return { key, radiant: emptySlots(), dire: emptySlots(), bans: [] };
}

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function asHeroId(value: unknown): number | null {
  const n = asInt(value);
  return n != null && n > 0 && n < 400 ? n : null;
}

function asTeam(value: unknown): "radiant" | "dire" | null {
  if (value === 2 || value === "2" || value === "radiant" || value === "goodguys") return "radiant";
  if (value === 3 || value === "3" || value === "dire" || value === "badguys") return "dire";
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower.includes("radiant") || lower.includes("good")) return "radiant";
    if (lower.includes("dire") || lower.includes("bad")) return "dire";
  }
  return null;
}

function heroIdFromName(name: string | undefined | null): number | null {
  if (!name || typeof name !== "string") return null;
  const catalog = loadCatalog();
  const trimmed = name.trim();
  if (!trimmed) return null;
  const short = heroShortName(trimmed);
  const byShort = catalog?.heroesByShort.get(short)?.id;
  if (byShort) return byShort;
  const lower = trimmed.toLowerCase();
  if (!catalog) return null;
  for (const hero of catalog.heroes) {
    if (hero.localizedName.toLowerCase() === lower || hero.shortName === lower) return hero.id;
  }
  return null;
}

function slotId(id: unknown, className: unknown): number | null {
  return asHeroId(id) ?? (typeof className === "string" ? heroIdFromName(className) : null);
}

function isObject(value: unknown): value is Json {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isEmptyHeroField(key: string, value: unknown): boolean {
  if (/(_id|id)$/i.test(key) && asHeroId(value) == null) return true;
  if (/(class|name)$/i.test(key) && (value == null || value === "" || value === 0)) return true;
  return false;
}

function deepMerge(base: unknown, incoming: unknown): unknown {
  if (incoming === undefined) return base;
  if (!isObject(base) || !isObject(incoming)) return incoming;
  const out: Json = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    if (key === "previously" || key === "added" || key === "auth") continue;
    if (isEmptyHeroField(key, value) && out[key] != null && !isEmptyHeroField(key, out[key])) continue;
    if (isObject(out[key]) && isObject(value)) out[key] = deepMerge(out[key], value) as Json;
    else out[key] = value as unknown;
  }
  return out;
}

function sessionKey(raw: GsiPayload | null): string {
  const mid = raw?.map?.matchid;
  if (mid != null && String(mid) !== "0" && String(mid) !== "") return String(mid);
  return "lobby";
}

function rememberDraft(key: string, radiant: (number | null)[], dire: (number | null)[], bans: number[]) {
  if (accDraft.key !== key) {
    if (accDraft.key === "lobby" && key !== "lobby") {
      accDraft.key = key;
    } else {
      accDraft = emptyAcc(key);
    }
  }
  accDraft.radiant = mergeSlotsKeep(accDraft.radiant, radiant);
  accDraft.dire = mergeSlotsKeep(accDraft.dire, dire);
  for (const id of bans) {
    if (id > 0 && !accDraft.bans.includes(id)) accDraft.bans.push(id);
  }
}

function mergeSlotsKeep(prev: (number | null)[], next: (number | null)[]): (number | null)[] {
  const out = [...prev];
  while (out.length < 5) out.push(null);
  const used = new Set(out.filter((id): id is number => Boolean(id)));
  for (let i = 0; i < 5; i++) {
    const id = next[i];
    if (!id || used.has(id)) continue;
    if (out[i] == null) {
      out[i] = id;
      used.add(id);
    }
  }
  for (const id of next) {
    if (!id || used.has(id)) continue;
    const hole = out.findIndex((slot) => slot == null);
    if (hole < 0) break;
    out[hole] = id;
    used.add(id);
  }
  return out.slice(0, 5);
}

function heroRefFrom(node: unknown): number | null {
  if (typeof node === "string") return heroIdFromName(node);
  if (!isObject(node)) return slotId(node, null);
  return slotId(
    node.id ?? node.hero_id ?? node.heroId ?? node.heroid ?? node.hero,
    node.class ?? node.name ?? node.hero_name ?? node.heroname ?? node.hero,
  );
}

function pickIds(team: unknown): (number | null)[] {
  if (!isObject(team)) return emptySlots();
  const ids = emptySlots();

  const list = team.picks ?? team.pick ?? team.picks_and_bans;
  if (Array.isArray(list)) {
    let i = 0;
    for (const row of list) {
      if (!isObject(row) && typeof row !== "string") continue;
      const isBan = isObject(row) && String(row.type ?? row.mode ?? "").toLowerCase().includes("ban");
      if (isBan) continue;
      const id = heroRefFrom(row);
      if (!id || i >= 5) continue;
      ids[i] = id;
      i += 1;
    }
  }

  for (let i = 0; i <= 4; i++) {
    const id = slotId(team[`pick${i}_id`], team[`pick${i}_class`]) ?? heroRefFrom(team[`pick${i}`]);
    if (id) ids[i] = id;
  }

  const nested = team.picks;
  if (isObject(nested)) {
    for (let i = 0; i <= 4; i++) {
      const id = heroRefFrom(nested[`pick${i}`] ?? nested[String(i)]);
      if (id) ids[i] = id;
    }
  }

  for (let i = 0; i <= 9; i++) {
    const player = team[`player${i}`] ?? team[`Player${i}`];
    const id = heroRefFrom(player);
    if (!id) continue;
    if (!ids.includes(id)) {
      const hole = ids.findIndex((slot) => slot == null);
      if (hole >= 0) ids[hole] = id;
    }
  }

  return ids;
}

function banIds(team: unknown): number[] {
  if (!isObject(team)) return [];
  const out: number[] = [];
  const push = (id: number | null) => {
    if (id && !out.includes(id)) out.push(id);
  };
  const list = team.picks ?? team.picks_and_bans ?? team.bans;
  if (Array.isArray(list)) {
    for (const row of list) {
      if (!isObject(row)) continue;
      const isBan = String(row.type ?? row.mode ?? "").toLowerCase().includes("ban");
      if (!isBan && team.picks_and_bans == null) continue;
      if (isBan) push(heroRefFrom(row));
    }
  }
  for (let i = 0; i <= 8; i++) {
    push(slotId(team[`ban${i}_id`], team[`ban${i}_class`]) ?? heroRefFrom(team[`ban${i}`]));
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

function inventoryFrom(items: unknown): string[] {
  if (!items || typeof items !== "object") return [];
  const rec = items as Record<string, unknown>;
  const out: string[] = [];
  const keys = Object.keys(rec).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const key of keys) {
    if (!/^(slot|item)\d+$/i.test(key)) continue;
    const slot = rec[key] as { name?: string } | undefined;
    if (typeof slot?.name === "string" && slot.name.startsWith("item_") && slot.name !== "item_empty") {
      const itemKey = itemKeyFromGsi(slot.name);
      if (itemKey && itemKey !== "empty") out.push(itemKey);
    }
  }
  return out;
}

function heroFromPlayerNode(rec: Json): { id: number | null; name: string | null; level: number } {
  const hero = rec.hero;
  if (typeof hero === "string") {
    return { id: heroIdFromName(hero), name: hero, level: asInt(rec.level) ?? 0 };
  }
  if (isObject(hero)) {
    const name = typeof hero.name === "string" ? hero.name : null;
    return {
      id: asHeroId(hero.id) ?? heroIdFromName(name),
      name,
      level: asInt(hero.level) ?? 0,
    };
  }
  const name =
    (typeof rec.heroname === "string" && rec.heroname) ||
    (typeof rec.hero_name === "string" && rec.hero_name) ||
    (typeof rec.name === "string" && rec.name.startsWith("npc_dota_hero_") ? rec.name : null);
  const looksHeroNode = Boolean(name) || typeof rec.heroname === "string";
  return {
    id: asHeroId(rec.hero_id ?? rec.heroid) ?? (looksHeroNode ? asHeroId(rec.id) : null) ?? heroIdFromName(name),
    name,
    level: asInt(rec.level) ?? 0,
  };
}

function collectLivePlayers(raw: GsiPayload, inheritedRootTeam: "radiant" | "dire" | null): LivePlayer[] {
  const found: LivePlayer[] = [];
  const seen = new Set<string>();

  const add = (node: unknown, inheritedTeam: "radiant" | "dire" | null) => {
    if (!node || typeof node !== "object") return;
    const rec = node as Json;
    const team = asTeam(rec.team_name ?? rec.team) ?? inheritedTeam;
    const parsed = heroFromPlayerNode(rec);
    const looksLikePlayer = Boolean(
      rec.team_name ||
        rec.steamid ||
        rec.accountid ||
        parsed.id ||
        (parsed.name && parsed.name.includes("npc_dota_hero_")) ||
        isObject(rec.hero),
    );
    const bag = inventoryFrom(rec.items);
    if (looksLikePlayer && team && (parsed.id || parsed.name || bag.length)) {
      const key = String(rec.steamid ?? rec.accountid ?? parsed.id ?? rec.name ?? `${team}-${found.length}`);
      if (!seen.has(key)) {
        seen.add(key);
        found.push({
          name: typeof rec.name === "string" && !rec.name.startsWith("npc_dota_hero_") ? rec.name : null,
          team,
          heroId: parsed.id,
          shortName: parsed.name ? heroShortName(parsed.name) : null,
          level: parsed.level,
          items: bag,
          isYou: false,
        });
      }
    }
    for (const [key, child] of Object.entries(rec)) {
      if (key === "items" || key === "abilities" || key === "wearables") continue;
      if (key === "hero" && isObject(child) && (child.id != null || child.name != null) && !child.team2 && !child.player0) {
        continue;
      }
      const childTeam =
        key === "team2" || key === "radiant" || key === "goodguys"
          ? "radiant"
          : key === "team3" || key === "dire" || key === "badguys"
            ? "dire"
            : team;
      add(child, childTeam);
    }
  };

  if (raw.allplayers) add(raw.allplayers, inheritedRootTeam);
  if (raw.player) add(raw.player, inheritedRootTeam);
  if (raw.hero && (raw.hero.team2 || raw.hero.team3 || raw.hero.player0)) add(raw.hero, inheritedRootTeam);
  return found;
}

function markYou(
  players: LivePlayer[],
  playerTeam: "radiant" | "dire" | null,
  steamName: string | null,
  heroId: number | null,
): LivePlayer[] {
  let marked = false;
  const next = players.map((p) => {
    const isYou =
      (steamName && p.name === steamName) ||
      Boolean(heroId && p.heroId === heroId && (!playerTeam || p.team === playerTeam));
    if (isYou) marked = true;
    return { ...p, isYou };
  });
  if (!marked && (heroId || steamName)) {
    const you = next.find((p) => p.heroId === heroId) ?? next.find((p) => playerTeam && p.team === playerTeam);
    if (you) you.isYou = true;
  }
  return next;
}

function withDraftHeroes(
  players: LivePlayer[],
  draft: { radiant: (number | null)[]; dire: (number | null)[] } | null,
  you: {
    team: "radiant" | "dire";
    heroId: number | null;
    shortName: string | null;
    level: number;
    items: string[];
    name: string | null;
  } | null,
): LivePlayer[] {
  const next = [...players];
  if (you && (you.heroId || you.shortName || you.items.length)) {
    const existing = next.find((p) => p.isYou) ?? next.find((p) => you.heroId && p.heroId === you.heroId);
    if (existing) {
      existing.isYou = true;
      if (existing.items.length === 0 && you.items.length) existing.items = you.items;
      if (!existing.heroId && you.heroId) existing.heroId = you.heroId;
      if (!existing.shortName && you.shortName) existing.shortName = you.shortName;
    } else {
      next.unshift({
        name: you.name,
        team: you.team,
        heroId: you.heroId,
        shortName: you.shortName,
        level: you.level,
        items: you.items,
        isYou: true,
      });
    }
  }
  if (!draft) return next;
  for (const team of ["radiant", "dire"] as const) {
    for (const id of draft[team]) {
      if (!id || next.some((p) => p.heroId === id)) continue;
      next.push({
        name: null,
        team,
        heroId: id,
        shortName: null,
        level: 0,
        items: [],
        isYou: false,
      });
    }
  }
  return next;
}

function playerTeamFrom(raw: GsiPayload): "radiant" | "dire" | null {
  return asTeam(raw.player?.team_name ?? raw.player?.team);
}

function fillTeam(slots: (number | null)[], extras: LivePlayer[], team: "radiant" | "dire"): (number | null)[] {
  const next = [...slots];
  const used = new Set(next.filter((id): id is number => Boolean(id)));
  for (const row of extras.filter((p) => p.team === team && p.heroId)) {
    const id = row.heroId!;
    if (used.has(id)) continue;
    const hole = next.findIndex((slot) => slot == null);
    if (hole < 0) break;
    next[hole] = id;
    used.add(id);
  }
  return next;
}

function pickPhaseFrom(raw: GsiPayload, playerTeam: "radiant" | "dire" | null): PickPhase | null {
  const state = raw.map?.game_state ?? "";
  const draft = raw.draft;
  const selecting = /HERO_SELECTION|STRATEGY|PLAYER_DRAFT/i.test(state);
  const activeTeam = asTeam(isObject(draft) ? draft.activeteam : null);
  const remaining = isObject(draft) ? asInt(draft.activeteam_time_remaining) : null;
  const hasTimer = remaining != null && remaining > 0;
  const isDraft = selecting || hasTimer || activeTeam != null;
  if (!isDraft && !draft) return null;

  let action: PickPhase["action"] = null;
  if (selecting || hasTimer || activeTeam) {
    if (state.includes("STRATEGY")) action = "strategy";
    else if (isObject(draft) && draft.pick === false) action = "ban";
    else if (isObject(draft) && draft.pick === true) action = "pick";
    else if (selecting) action = "pick";
  }

  return {
    isDraft: Boolean(isDraft),
    action,
    activeTeam,
    timeRemaining: remaining,
    radiantBonus: isObject(draft) ? asInt(draft.radiant_bonus_time) : null,
    direBonus: isObject(draft) ? asInt(draft.dire_bonus_time) : null,
    yourTurn: Boolean(playerTeam && activeTeam && playerTeam === activeTeam),
  };
}

function localHero(raw: GsiPayload): { id: number | null; name: string | null; level: number } {
  const hero = raw.hero;
  const nested = isObject(raw.player) ? raw.player.hero : undefined;
  const name =
    (isObject(hero) && typeof hero.name === "string" && hero.name) ||
    (isObject(nested) && typeof nested.name === "string" && nested.name) ||
    (typeof nested === "string" ? nested : null) ||
    null;
  const idRaw = isObject(hero) ? hero.id : isObject(nested) ? nested.id : null;
  return {
    id: asHeroId(idRaw) ?? heroIdFromName(name),
    name,
    level: (isObject(hero) ? asInt(hero.level) : null) ?? (isObject(nested) ? asInt(nested.level) : null) ?? 0,
  };
}

export function ingestGsi(body: GsiPayload): void {
  const incoming: GsiPayload = { ...body };
  delete incoming.previously;
  delete incoming.added;
  const state = incoming.map?.game_state ?? "";
  const nextKey = sessionKey(incoming);
  const prevKey = sessionKey(lastRaw);
  const newSession = prevKey !== nextKey && !(prevKey === "lobby" && nextKey !== "lobby");
  const resetPhase = /STATE_INIT|WAIT_FOR_PLAYERS|POST_GAME/i.test(state) && !/HERO_SELECTION/i.test(state);
  if (!lastRaw || newSession || resetPhase) {
    lastRaw = incoming;
    accDraft = emptyAcc(nextKey);
  } else {
    lastRaw = deepMerge(lastRaw, incoming) as GsiPayload;
  }
  lastUpdate = Date.now();
}

function emptyLive(connected: boolean): LiveState {
  return {
    connected,
    lastUpdate: lastUpdate || null,
    clock: null,
    daytime: null,
    gameState: null,
    paused: false,
    steamName: null,
    matchId: null,
    playerTeam: null,
    hero: null,
    items: [],
    players: [],
    draft: null,
    pickPhase: null,
  };
}

export function getLiveState(): LiveState {
  const fresh = lastUpdate > 0 && Date.now() - lastUpdate < 45_000;
  if (!lastRaw || !fresh) {
    if (!fresh) accDraft = emptyAcc("lobby");
    return emptyLive(false);
  }

  const youHero = localHero(lastRaw);
  const draftSrc = lastRaw.draft;
  const radiantTeam = isObject(draftSrc) ? (draftSrc.radiant ?? draftSrc.team2 ?? draftSrc.goodguys) : undefined;
  const direTeam = isObject(draftSrc) ? (draftSrc.dire ?? draftSrc.team3 ?? draftSrc.badguys) : undefined;
  let radiant = pickIds(radiantTeam);
  let dire = pickIds(direTeam);
  const bans = [...banIds(radiantTeam), ...banIds(direTeam)];
  const playerTeam = playerTeamFrom(lastRaw);
  let players = markYou(
    collectLivePlayers(lastRaw, playerTeam),
    playerTeam,
    typeof lastRaw.player?.name === "string" ? lastRaw.player.name : null,
    youHero.id,
  );
  radiant = fillTeam(radiant, players, "radiant");
  dire = fillTeam(dire, players, "dire");
  if (youHero.id && playerTeam) {
    const slots = playerTeam === "radiant" ? radiant : dire;
    if (!slots.includes(youHero.id)) {
      const hole = slots.findIndex((id) => id == null);
      if (hole >= 0) slots[hole] = youHero.id;
    }
  }

  rememberDraft(sessionKey(lastRaw), radiant, dire, bans);
  radiant = accDraft.radiant;
  dire = accDraft.dire;
  const allBans = accDraft.bans;

  const hasDraft = [...radiant, ...dire, ...allBans].some((id) => typeof id === "number" && id > 0);
  const matchId =
    lastRaw.map?.matchid != null && String(lastRaw.map.matchid) !== "0" ? String(lastRaw.map.matchid) : null;
  const items = flattenItems(lastRaw.items);
  const hero =
    youHero.name || youHero.id
      ? {
          name: youHero.name ?? "",
          shortName: youHero.name ? heroShortName(youHero.name) : "",
          level: youHero.level,
          id: youHero.id,
        }
      : null;
  players = withDraftHeroes(players, hasDraft ? { radiant, dire } : null, {
    team: playerTeam ?? "radiant",
    heroId: youHero.id,
    shortName: hero?.shortName ?? null,
    level: hero?.level ?? 0,
    items,
    name: typeof lastRaw.player?.name === "string" ? lastRaw.player.name : null,
  });

  return {
    connected: true,
    lastUpdate,
    clock: lastRaw.map?.clock_time ?? lastRaw.map?.game_time ?? null,
    daytime: typeof lastRaw.map?.daytime === "boolean" ? lastRaw.map.daytime : null,
    gameState: lastRaw.map?.game_state ?? null,
    paused: Boolean(lastRaw.map?.paused),
    steamName: typeof lastRaw.player?.name === "string" ? lastRaw.player.name : null,
    matchId,
    playerTeam,
    hero,
    items,
    players,
    draft: hasDraft ? { radiant, dire, bans: allBans } : null,
    pickPhase: pickPhaseFrom(lastRaw, playerTeam),
  };
}
