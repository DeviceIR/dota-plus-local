import type { Catalog } from "./catalog.ts";
import type { Ability, Hero, MatchupDetail, MatchupLaning } from "./types.ts";

export type BreakTool = {
  dname: string;
  source: "skill" | "Aghanim's" | "Innate" | "Talent" | "Facet";
  duration?: string;
};

type EnemyPassive = {
  name: string;
  summary: string;
};

type EnemyProfile = {
  laning?: string;
  laneThreat?: "high" | "medium" | "low";
  vsMelee?: MatchupLaning;
  payoff?: string;
};

type HeroPack = {
  abilities?: string[];
  talents?: { name: string; level?: number }[] | string[];
  facets?: { title?: string; description?: string }[];
};

const ENEMY_PROFILES: Record<string, EnemyProfile> = {
  bristleback: {
    laning: "Quill Spray stacks and Warpath punish melee trades.",
    laneThreat: "high",
    vsMelee: "weak",
    payoff: "Once Break is on, rear/side reduction is gone and you can actually right-click him down.",
  },
  huskar: {
    laning: "Berserker's Blood wins trades as his HP drops.",
    laneThreat: "high",
    vsMelee: "weak",
    payoff: "Break shuts off Berserker's Blood regen, magic resist, and attack speed.",
  },
  viper: {
    laning: "Poison Attack and Nethertoxin control the lane.",
    laneThreat: "high",
    vsMelee: "weak",
    payoff: "Break disables Corrosive Skin so he stops punishing you for hitting him.",
  },
  sniper: {
    laning: "Outranges almost every melee hero.",
    laneThreat: "high",
    vsMelee: "weak",
  },
  spectre: {
    laning: "Haunts later; Dispersion makes right-clicks feel terrible.",
    payoff: "Break disables Dispersion so your damage is not reflected back.",
  },
  tidehunter: {
    laning: "Anchor Smash and Kraken Shell make him a brick in lane.",
    vsMelee: "weak",
    payoff: "Break stops Kraken Shell damage block and the threshold dispel.",
  },
  phantom_assassin: {
    laning: "Blur/Immaterial evasion plus Coup de Grace bursts.",
    payoff: "Break disables Immaterial evasion so Monkey King Bar is not mandatory.",
  },
  brewmaster: {
    laning: "Drunken Brawler evasion and crit make trades swingy.",
    payoff: "Break disables Drunken Brawler evasion/crit.",
  },
  antimage: {
    payoff: "Break disables Mana Break so he stops burning your mana on hit.",
  },
  slark: {
    laning: "Essence Shift steals stats if the lane goes long.",
    payoff: "Break pauses Essence Shift stacks and Shadow Dance regen while it lasts.",
  },
  ursa: {
    laning: "Fury Swipes stack fast in melee range.",
    vsMelee: "weak",
    payoff: "Break stops Fury Swipes from stacking while it is applied.",
  },
  necrolyte: {
    laning: "Heartstopper aura chips you down for free.",
    payoff: "Break disables Heartstopper aura while it lasts.",
  },
  abaddon: {
    payoff: "Break can stop Borrowed Time from triggering passively.",
  },
  skeleton_king: {
    payoff: "Break disables Reincarnation — the biggest reason to Break Wraith King.",
  },
  shredder: {
    laning: "Reactive Armor stacks from last hits and harass.",
    vsMelee: "weak",
    payoff: "Break stops Reactive Armor from stacking and cuts the bonus regen.",
  },
  enchantress: {
    laning: "Untouchable wrecks melee right-clickers.",
    vsMelee: "weak",
    laneThreat: "high",
    payoff: "Break disables Untouchable so you can actually hit her.",
  },
  medusa: {
    payoff: "Break disables Mana Shield, which is most of her HP pool.",
  },
  axe: {
    laning: "Counter Helix punishes melee trades.",
    vsMelee: "weak",
    payoff: "Break disables Counter Helix while it lasts.",
  },
  lifestealer: {
    payoff: "Break disables Feast, cutting his sustain in a fight.",
  },
  dragon_knight: {
    payoff: "Break disables Dragon Blood regen and armor.",
  },
  troll_warlord: {
    payoff: "Break disables Fervor attack-speed stacks and Berserker's Rage bonuses.",
  },
  weaver: {
    payoff: "Break disables Geminate Attack.",
  },
  spirit_breaker: {
    payoff: "Break disables Greater Bash / Knockout procs.",
  },
  broodmother: {
    laning: "Spiders and webs take over the lane if you cannot contest.",
    laneThreat: "high",
  },
  venomancer: {
    laning: "Poison Nova/gale makes the lane miserable, especially melee.",
    laneThreat: "high",
    vsMelee: "weak",
  },
  batrider: {
    laning: "Sticky Napalm stacks turn every trade into a death sentence.",
    laneThreat: "high",
    vsMelee: "weak",
  },
  death_prophet: {
    laning: "Crypt Swarm plus spirit siphon wins most lanes.",
    laneThreat: "high",
  },
};

const PASSIVE_RE =
  /takes less damage|damage reduction|damage block|evasion|regenerat|lifesteal|bonus damage|magic resist|dispersion|cannot miss|critical|bash|return|reflect|stack|attack speed|armor|untouchable|reincarnat|mana shield|borrowed time|heartstopper|corrosive|warpath|fury swipes|essence shift|counter helix|reactive armor|feast|greater bash|geminate|mana break|dragon blood/;

function packFor(catalog: Catalog, hero: Hero): HeroPack {
  return (
    catalog.heroAbilities[hero.name] ??
    catalog.heroAbilities[`npc_dota_hero_${hero.shortName}`] ??
    {}
  );
}

function talentKeys(pack: HeroPack): string[] {
  return (pack.talents ?? []).map((row) => (typeof row === "string" ? row : row.name));
}

function abilityKeys(pack: HeroPack): string[] {
  return (pack.abilities ?? []).filter((key) => key && key !== "generic_hidden");
}

function isPassive(ability: Ability): boolean {
  const list = Array.isArray(ability.behavior)
    ? ability.behavior
    : ability.behavior
      ? [ability.behavior]
      : [];
  return list.includes("Passive");
}

function grantSource(ability: Ability): BreakTool["source"] {
  if (ability.key.startsWith("special_bonus")) return "Talent";
  if (ability.isInnate) return "Innate";
  if (ability.hidden) return "Aghanim's";
  return "skill";
}

function fmtDuration(value?: string): string {
  if (!value) return "";
  if (/[s%]$/i.test(value.trim())) return ` (${value})`;
  return ` (${value}s)`;
}

function firstSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const cut = trimmed.split(/(?<=\.)\s/)[0] ?? trimmed;
  return cut.length > 160 ? `${cut.slice(0, 157)}…` : cut;
}

function buildBreakTools(catalog: Catalog, hero: Hero): BreakTool[] {
  const pack = packFor(catalog, hero);
  const keys = [...abilityKeys(pack), ...talentKeys(pack)];
  const tools: BreakTool[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    const ability = catalog.abilities[key];
    if (!ability?.appliesBreak || seen.has(ability.dname)) continue;
    seen.add(ability.dname);
    tools.push({
      dname: ability.dname,
      source: grantSource(ability),
      duration: ability.breakDuration,
    });
  }
  for (const facet of pack.facets ?? []) {
    const text = `${facet.title ?? ""} ${facet.description ?? ""}`;
    if (!/appl(?:y|ies|ying)(?: a)? break|applies break/i.test(text)) continue;
    if (/mana break|life break/i.test(text)) continue;
    const name = facet.title || "Facet";
    if (seen.has(name)) continue;
    seen.add(name);
    tools.push({ dname: name, source: "Facet" });
  }
  return tools;
}

function enemyPassives(catalog: Catalog, enemy: Hero): EnemyPassive[] {
  const pack = packFor(catalog, enemy);
  const out: EnemyPassive[] = [];
  for (const key of abilityKeys(pack)) {
    const ability = catalog.abilities[key];
    if (!ability) continue;
    const blob = `${ability.dname} ${ability.desc}`.toLowerCase();
    const looksImportant = isPassive(ability) && PASSIVE_RE.test(blob);
    if (!looksImportant) continue;
    out.push({
      name: ability.dname,
      summary: firstSentence(ability.desc),
    });
  }
  const preferred =
    /bristleback|warpath|dispersion|berserker|kraken|reincarn|untouchable|mana shield|heartstopper|fury swipes|reactive armor|corrosive|immaterial|essence shift|counter helix|borrowed time|feast|dragon blood/;
  out.sort((a, b) => Number(preferred.test(b.name.toLowerCase())) - Number(preferred.test(a.name.toLowerCase())));
  return out.slice(0, 2);
}

function winrateVs(catalog: Catalog, heroId: number, enemyId: number): number | null {
  const row = (catalog.matchups[String(heroId)] ?? []).find((m) => m.hero_id === enemyId);
  if (!row || row.games_played < 15) return null;
  return row.wins / row.games_played;
}

function laningFor(
  hero: Hero,
  enemy: Hero,
  wr: number | null,
  profile: EnemyProfile | undefined,
): { laning: MatchupLaning; note: string } {
  let laning: MatchupLaning = "even";
  if (hero.attackType === "Melee" && profile?.vsMelee) laning = profile.vsMelee;
  else if (hero.attackType === "Melee" && profile?.laneThreat === "high") laning = "weak";
  else if (profile?.laneThreat === "high" && (wr == null || wr < 0.52)) laning = "weak";

  if (wr != null) {
    if (wr <= 0.46) laning = "weak";
    else if (wr >= 0.54) laning = "strong";
  }

  const why =
    laning === "weak"
      ? (profile?.laning ??
        (hero.attackType === "Melee" && enemy.attackType === "Ranged"
          ? `${enemy.localizedName} outranges you.`
          : ""))
      : "";
  const head =
    laning === "weak" ? "Laning is weak" : laning === "strong" ? "Laning is strong" : "Laning is even";
  const note = why ? `${head}: ${why}` : `${head}.`;
  return { laning, note };
}

function breakLine(tool: BreakTool, enemy: Hero, passives: EnemyPassive[], payoff?: string): string {
  const dur = fmtDuration(tool.duration);
  const targets = passives.map((p) => p.name);
  const disable = targets.length ? ` — disables ${targets.join(" + ")}` : ` vs ${enemy.localizedName}`;
  let line: string;
  if (tool.source === "Aghanim's") {
    line = `Aghanim's ${tool.dname} applies Break${dur}${disable}.`;
  } else if (tool.source === "skill") {
    line = `${tool.dname} applies Break${dur}${disable}.`;
  } else {
    line = `${tool.source}: ${tool.dname} applies Break${dur}${disable}.`;
  }
  if (payoff && !line.toLowerCase().includes(payoff.slice(0, 18).toLowerCase())) {
    return `${line} ${payoff}`;
  }
  return line;
}

export function matchupDetails(
  catalog: Catalog,
  hero: Hero,
  enemyIds: number[],
  kitCache?: Map<number, BreakTool[]>,
): MatchupDetail[] {
  const details: MatchupDetail[] = [];
  let tools = kitCache?.get(hero.id);
  if (!tools) {
    tools = buildBreakTools(catalog, hero);
    kitCache?.set(hero.id, tools);
  }

  for (const enemyId of enemyIds) {
    const enemy = catalog.heroesById.get(enemyId);
    if (!enemy) continue;
    const wr = winrateVs(catalog, hero.id, enemyId);
    const profile = ENEMY_PROFILES[enemy.shortName];
    const passives = enemyPassives(catalog, enemy);
    const { laning, note } = laningFor(hero, enemy, wr, profile);
    const benefits: string[] = [];
    const items: string[] = [];

    const aghsBreak = tools.find((t) => t.source === "Aghanim's");
    const anyBreak = aghsBreak ?? tools[0];
    const breakMatters = passives.length > 0 || Boolean(profile?.payoff);

    if (anyBreak && breakMatters) {
      benefits.push(breakLine(anyBreak, enemy, passives, profile?.payoff));
    } else if (anyBreak && laning === "weak") {
      benefits.push(breakLine(anyBreak, enemy, passives, profile?.payoff));
    }

    if (breakMatters) {
      if (aghsBreak) {
        items.push("Silver Edge is the fallback Break if Aghanim's is delayed.");
      } else if (!anyBreak && laning !== "strong") {
        items.push(
          `Silver Edge applies Break (5s)${
            passives.length ? ` — disables ${passives.map((p) => p.name).join(" + ")}` : ` vs ${enemy.localizedName}`
          }.`,
        );
      }
      if (
        (anyBreak || laning === "weak") &&
        hero.roles.includes("Carry") &&
        (enemy.roles.includes("Durable") || enemy.shortName === "bristleback")
      ) {
        items.push("Desolator or Assault Armor pairs with Break against tanky cores.");
      }
    }

    const interesting =
      laning !== "even" || benefits.length > 0 || items.length > 0 || (wr != null && (wr <= 0.47 || wr >= 0.53));
    if (!interesting) continue;

    details.push({
      enemyId,
      enemyName: enemy.localizedName,
      winrate: wr,
      laning,
      laningNote: note,
      benefits: [...new Set(benefits)].slice(0, 3),
      items: [...new Set(items)].slice(0, 2),
    });
  }

  return details;
}

export function detailReasons(details: MatchupDetail[]): string[] {
  const out: string[] = [];
  for (const row of details) {
    if (row.laning === "weak" && row.benefits.length) {
      out.push(`weak lane vs ${row.enemyName}, payoff later`);
    } else if (row.benefits.some((line) => /aghanim/i.test(line))) {
      out.push(`Aghs Break vs ${row.enemyName}`);
    } else if (row.benefits.length) {
      out.push(`tools vs ${row.enemyName}`);
    } else if (row.laning === "weak") {
      out.push(`caution vs ${row.enemyName}`);
    } else if (row.laning === "strong") {
      out.push(`strong vs ${row.enemyName}`);
    }
    if (out.length >= 2) break;
  }
  return out;
}

export function payoffBonus(details: MatchupDetail[]): number {
  let bonus = 0;
  for (const row of details) {
    const aghs = row.benefits.some((line) => /aghanim/i.test(line));
    if (aghs && row.laning === "weak") bonus += 0.055;
    else if (aghs) bonus += 0.03;
    else if (row.benefits.length && row.laning === "weak") bonus += 0.03;
    else if (row.benefits.length) bonus += 0.015;
  }
  return Math.min(0.12, bonus);
}
