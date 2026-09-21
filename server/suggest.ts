import type { Catalog, HeroStatsRow } from "./catalog.ts";
import { detailReasons, matchupDetails, payoffBonus, type BreakTool } from "./matchupNotes.ts";
import { patchBuffFor } from "./patchPriority.ts";
import type {
  DraftSuggestion,
  Hero,
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

export function metaPickCount(row: HeroStatsRow | undefined, rank: RankBracket): number {
  if (!row) return 0;
  if (rank === "divine_plus") return num(row, "7_pick") + num(row, "8_pick");
  if (rank === "all") {
    let pick = 0;
    for (let i = 1; i <= 8; i++) pick += num(row, `${i}_pick`);
    return pick;
  }
  return num(row, `${RANK_INDEX[rank]}_pick`);
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

function laningScoreFor(details: { laning: "weak" | "even" | "strong" }[]): number {
  if (!details.length) return 0;
  let total = 0;
  for (const d of details) {
    if (d.laning === "strong") total += 1;
    else if (d.laning === "weak") total -= 1;
  }
  return total / details.length;
}

function mixSuggestions(
  rows: DraftSuggestion[],
  limit: number,
  hasEnemies: boolean,
): DraftSuggestion[] {
  const ranked = [...rows].sort((a, b) => b.score - a.score);
  const matchup = ranked.filter((r) => (r.matchupWinrate ?? 0) >= 0.52);
  const patch = ranked.filter((r) => r.patch);
  const meta = ranked.filter((r) => r.metaRecommended);
  const laning = ranked.filter((r) => r.laningScore >= 0.2);
  const groups = hasEnemies ? [matchup, laning, patch, meta, ranked] : [patch, meta, ranked];
  const seen = new Set<number>();
  const out: DraftSuggestion[] = [];
  let added = true;
  while (out.length < limit && added) {
    added = false;
    for (const group of groups) {
      const next = group.find((row) => !seen.has(row.heroId));
      if (!next) continue;
      seen.add(next.heroId);
      out.push(next);
      added = true;
      if (out.length >= limit) break;
    }
  }
  return out;
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
    pool?: number[];
    poolOnly?: boolean;
    limit?: number;
  },
): DraftSuggestion[] {
  const taken = new Set(
    [...input.allied, ...input.enemy, ...input.banned].filter((id) => id > 0),
  );
  const enemy = input.enemy.filter((id) => id > 0);
  const role = input.role ?? "any";
  const pool = (input.pool ?? []).filter((id) => id > 0);
  const poolSet = new Set(pool);
  const poolOnly = Boolean(input.poolOnly && poolSet.size > 0);
  const results: DraftSuggestion[] = [];
  const kitCache = new Map<number, BreakTool[]>();
  const eligible: Hero[] = [];
  for (const hero of catalog.heroes) {
    if (taken.has(hero.id)) continue;
    if (poolOnly && !poolSet.has(hero.id)) continue;
    if (!matchesRole(hero, role)) continue;
    eligible.push(hero);
  }

  const pickCounts = eligible.map((hero) => metaPickCount(catalog.heroStats[hero.id], input.rank));
  const sortedPicks = [...pickCounts].sort((a, b) => a - b);
  const pickCutoff = sortedPicks[Math.floor(sortedPicks.length * 0.65)] ?? 0;

  for (let i = 0; i < eligible.length; i++) {
    const hero = eligible[i];
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
    const laningScore = laningScoreFor(details);
    const inPool = poolSet.has(hero.id) ? 0.04 : 0;
    const buff = patchBuffFor(catalog.patch, hero.shortName, role);
    const patchBonus = buff ? 0.08 : 0;
    const picks = pickCounts[i];
    const metaRecommended = meta >= 0.52 && picks >= pickCutoff && picks > 0;
    const metaBonus = metaRecommended && !buff ? 0.03 : 0;
    const score = Math.min(
      1,
      0.5 * matchupScore + 0.3 * meta + 0.2 * fit + payoffBonus(details) + inPool + patchBonus + metaBonus,
    );

    const reasons: string[] = [];
    if (buff) reasons.push(`buffed in ${catalog.patch.version}`);
    else if (metaRecommended) reasons.push(`highly recommended ${catalog.patch.version} ${roleLabel(role)}`);
    if (poolSet.has(hero.id)) reasons.push("in your pool");
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
    if (meta >= 0.52 && !metaRecommended && !buff) {
      reasons.push(`solid ${input.rank.replace("_", " ")} meta`);
    }
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
      laningScore,
      reasons: [...new Set(reasons)].slice(0, 5),
      details,
      patch: buff ? { version: catalog.patch.version, note: buff.note } : null,
      metaRecommended,
    });
  }

  const limit = input.limit ?? (poolOnly ? Math.max(36, Math.min(results.length, 48)) : 42);
  return mixSuggestions(results, limit, enemy.length > 0);
}

export { suggestItems, suggestItemPlan } from "./itemEngine.ts";
