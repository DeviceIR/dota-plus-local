import type { Catalog, HeroStatsRow } from "./catalog.ts";
import { detailReasons, matchupDetails, payoffBonus, type BreakTool } from "./matchupNotes.ts";
import { tagsForShortName, SITUATIONAL_ITEMS } from "./tags.ts";
import type {
  DraftSuggestion,
  Hero,
  ItemPhase,
  ItemSuggestion,
  PlayerRole,
  RankBracket,
} from "./types.ts";

const MIN_GAMES = 15;
const ROLE_SLOTS = ["Carry", "Nuker", "Initiator", "Disabler", "Support"] as const;

const MID_SHORT = new Set([
  "nevermore",
  "storm_spirit",
  "puck",
  "queenofpain",
  "leshrac",
  "tinker",
  "zuus",
  "lina",
  "invoker",
  "viper",
  "death_prophet",
  "ember_spirit",
  "void_spirit",
  "obsidian_destroyer",
  "pugna",
  "batrider",
  "templar_assassin",
  "meepo",
  "arc_warden",
  "kunkka",
  "tiny",
  "dragon_knight",
  "sniper",
  "huskar",
  "alchemist",
  "keeper_of_the_light",
  "windrunner",
  "razor",
  "necrolyte",
  "pangolier",
  "primal_beast",
  "muerta",
  "kez",
  "lina",
  "puck",
  "leshrac",
]);

export function matchesRole(hero: Hero, role: PlayerRole): boolean {
  if (role === "any") return true;
  const roles = hero.roles;
  const primary = roles[0];
  switch (role) {
    case "carry":
      return roles.includes("Carry") && primary !== "Support";
    case "mid":
      if (MID_SHORT.has(hero.shortName)) return true;
      return (
        roles.includes("Nuker") &&
        primary !== "Support" &&
        !roles.includes("Support")
      );
    case "offlane":
      if (primary === "Support") return false;
      return (
        roles.includes("Initiator") ||
        roles.includes("Durable") ||
        (primary === "Disabler" && !roles.includes("Support"))
      );
    case "support":
      return roles.includes("Support") && primary !== "Carry";
    default:
      return true;
  }
}

function roleLabel(role: PlayerRole): string {
  if (role === "any") return "flex";
  if (role === "support") return "support";
  return role;
}

const RANK_INDEX: Record<Exclude<RankBracket, "all" | "divine_plus">, number> = {
  herald: 1,
  guardian: 2,
  crusader: 3,
  archon: 4,
  legend: 5,
  ancient: 6,
  divine: 7,
  immortal: 8,
};

function num(row: HeroStatsRow | undefined, key: string): number {
  const value = row?.[key];
  return typeof value === "number" ? value : 0;
}

export function metaWinrate(row: HeroStatsRow | undefined, rank: RankBracket): number {
  if (!row) return 0.5;
  if (rank === "divine_plus") {
    const pick = num(row, "7_pick") + num(row, "8_pick");
    const win = num(row, "7_win") + num(row, "8_win");
    return pick > 0 ? win / pick : 0.5;
  }
  if (rank === "all") {
    let pick = 0;
    let win = 0;
    for (let i = 1; i <= 8; i++) {
      pick += num(row, `${i}_pick`);
      win += num(row, `${i}_win`);
    }
    return pick > 0 ? win / pick : 0.5;
  }
  const i = RANK_INDEX[rank];
  const pick = num(row, `${i}_pick`);
  const win = num(row, `${i}_win`);
  return pick > 0 ? win / pick : 0.5;
}

function roleFit(catalog: Catalog, heroId: number, allied: number[]): number {
  const hero = catalog.heroesById.get(heroId);
  if (!hero) return 0.5;
  const alliedHeroes = allied
    .map((id) => catalog.heroesById.get(id))
    .filter((h): h is NonNullable<typeof h> => Boolean(h));
  const counts = new Map<string, number>();
  for (const ally of alliedHeroes) {
    for (const role of ally.roles) counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  let score = 0.5;
  const carryCount = counts.get("Carry") ?? 0;
  const supportCount = counts.get("Support") ?? 0;
  const initiatorCount = counts.get("Initiator") ?? 0;
  if (hero.roles.includes("Carry")) {
    if (carryCount === 0) score += 0.18;
    else if (carryCount >= 2) score -= 0.12;
  }
  if (hero.roles.includes("Support") && supportCount < 2) score += 0.14;
  if (hero.roles.includes("Initiator") && initiatorCount === 0) score += 0.08;
  if (hero.roles.includes("Durable") && (counts.get("Durable") ?? 0) === 0) score += 0.04;
  return Math.min(1, Math.max(0, score));
}

export function suggestDraft(
  catalog: Catalog,
  input: {
    allied: number[];
    enemy: number[];
    banned: number[];
    rank: RankBracket;
    role?: PlayerRole;
    limit?: number;
  },
): DraftSuggestion[] {
  const taken = new Set(
    [...input.allied, ...input.enemy, ...input.banned].filter((id) => id > 0),
  );
  const enemy = input.enemy.filter((id) => id > 0);
  const role = input.role ?? "any";
  const results: DraftSuggestion[] = [];
  const kitCache = new Map<number, BreakTool[]>();

  for (const hero of catalog.heroes) {
    if (taken.has(hero.id)) continue;
    if (!matchesRole(hero, role)) continue;
    const matchups = catalog.matchups[String(hero.id)] ?? [];
    let weight = 0;
    let wrSum = 0;
    const strong: string[] = [];
    const weak: string[] = [];

    for (const enemyId of enemy) {
      const row = matchups.find((m) => m.hero_id === enemyId);
      if (!row || row.games_played < MIN_GAMES) continue;
      const wr = row.wins / row.games_played;
      wrSum += wr;
      weight += 1;
      const enemyName = catalog.heroesById.get(enemyId)?.localizedName ?? `#${enemyId}`;
      if (wr >= 0.55) strong.push(enemyName);
      else if (wr <= 0.45) weak.push(enemyName);
    }

    const matchupWinrate = weight > 0 ? wrSum / weight : null;
    const meta = metaWinrate(catalog.heroStats[hero.id], input.rank);
    const fit = roleFit(catalog, hero.id, input.allied.filter((id) => id > 0));
    const matchupScore = matchupWinrate ?? 0.5;
    const details = matchupDetails(catalog, hero, enemy, kitCache);
    const score = Math.min(
      1,
      0.5 * matchupScore + 0.3 * meta + 0.2 * fit + payoffBonus(details),
    );

    const reasons: string[] = [];
    if (role !== "any") {
      reasons.push(`${roleLabel(role)} for ${input.rank.replace("_", " ")}`);
    }
    reasons.push(...detailReasons(details));
    if (strong.length && !reasons.some((r) => r.includes("vs "))) {
      reasons.push(`strong vs ${strong.slice(0, 3).join(", ")}`);
    }
    if (weak.length && strong.length === 0 && !reasons.some((r) => r.includes("caution"))) {
      reasons.push(`caution vs ${weak.slice(0, 2).join(", ")}`);
    }
    if (meta >= 0.52) reasons.push(`solid ${input.rank.replace("_", " ")} meta`);
    if (role === "any") {
      const missingRole = ROLE_SLOTS.find((slot) => {
        if (!hero.roles.includes(slot)) return false;
        const count = input.allied
          .map((id) => catalog.heroesById.get(id))
          .filter(Boolean)
          .filter((h) => h!.roles.includes(slot)).length;
        return slot === "Support" ? count < 2 : count === 0;
      });
      if (missingRole) reasons.push(`fills ${missingRole.toLowerCase()}`);
    }
    if (reasons.length === 0) reasons.push("balanced matchup");

    results.push({
      heroId: hero.id,
      score,
      matchupWinrate,
      metaWinrate: meta,
      reasons: [...new Set(reasons)].slice(0, 4),
      details,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, input.limit ?? 12);
}

const PHASES: { key: keyof import("./types.ts").ItemPopularity; phase: ItemPhase }[] = [
  { key: "start_game_items", phase: "start" },
  { key: "early_game_items", phase: "early" },
  { key: "mid_game_items", phase: "mid" },
  { key: "late_game_items", phase: "late" },
];

export function suggestItems(
  catalog: Catalog,
  input: {
    heroId: number;
    enemy: number[];
    ownedItems?: string[];
    phase?: ItemPhase | "all";
  },
): ItemSuggestion[] {
  const pop = catalog.itemPopularity[String(input.heroId)];
  if (!pop) return [];

  const owned = new Set((input.ownedItems ?? []).map((k) => k.replace(/^item_/, "")));
  const enemyTags = new Map<string, number>();
  for (const id of input.enemy.filter((n) => n > 0)) {
    const short = catalog.heroesById.get(id)?.shortName;
    if (!short) continue;
    for (const tag of tagsForShortName(short)) {
      enemyTags.set(tag, (enemyTags.get(tag) ?? 0) + 1);
    }
  }

  const out: ItemSuggestion[] = [];
  const phases =
    !input.phase || input.phase === "all"
      ? PHASES
      : PHASES.filter((p) => p.phase === input.phase);

  for (const { key, phase } of phases) {
    const bucket = pop[key] ?? {};
    for (const [itemId, count] of Object.entries(bucket)) {
      const item = catalog.itemsById.get(Number(itemId));
      if (!item || owned.has(item.key)) continue;
      if (item.key.startsWith("recipe_")) continue;
      let score = Number(count) || 0;
      const reasons = [`popular ${phase}`];

      for (const rule of SITUATIONAL_ITEMS) {
        const hits = rule.tags.reduce((sum, tag) => sum + (enemyTags.get(tag) ?? 0), 0);
        if (hits <= 0) continue;
        if (!rule.items.includes(item.key)) continue;
        score *= 1.35 + Math.min(hits, 3) * 0.12;
        reasons.push(rule.reason);
      }

      out.push({
        itemKey: item.key,
        phase,
        score,
        popularity: Number(count) || 0,
        reasons: [...new Set(reasons)],
      });
    }
  }

  const seen = new Set<string>();
  out.sort((a, b) => b.score - a.score);
  const unique: ItemSuggestion[] = [];
  for (const row of out) {
    const id = `${row.phase}:${row.itemKey}`;
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(row);
  }

  if (input.phase && input.phase !== "all") return unique.slice(0, 10);

  const perPhase = new Map<ItemPhase, ItemSuggestion[]>();
  for (const row of unique) {
    const list = perPhase.get(row.phase) ?? [];
    if (list.length < 8) list.push(row);
    perPhase.set(row.phase, list);
  }
  return PHASES.flatMap((p) => perPhase.get(p.phase) ?? []);
}
