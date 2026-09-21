import fs from "node:fs";
import path from "node:path";
import { ASSETS_DIR, DATA_DIR, heroShortName, stripHtml } from "./paths.ts";
import { loadPatch, type PatchInfo } from "./patchPriority.ts";
import type {
  Ability,
  Hero,
  Item,
  ItemPopularity,
  Matchup,
  StatusPayload,
} from "./types.ts";

type RawHero = {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: string;
  attack_type: string;
  roles?: string[];
};

type RawItem = {
  id?: number;
  dname?: string;
  cost?: number;
  hint?: string | string[];
  notes?: string;
  lore?: string;
  components?: string[] | null;
  cd?: number | boolean;
  mc?: number | boolean;
  qual?: string;
};

type RawAttrib = {
  key?: string;
  header?: string;
  value?: string | string[] | number;
};

type RawAbility = {
  dname?: string;
  desc?: string;
  attrib?: RawAttrib[];
  behavior?: string | string[];
  is_innate?: boolean;
};

type RawHeroAbilities = {
  abilities?: string[];
  talents?: { name: string; level?: number }[] | string[];
  facets?: { title?: string; description?: string }[];
};

export type HeroStatsRow = {
  id: number;
  [key: string]: number | string | string[] | undefined;
};

export type Catalog = {
  heroes: Hero[];
  heroesById: Map<number, Hero>;
  heroesByShort: Map<string, Hero>;
  items: Item[];
  itemsById: Map<number, Item>;
  itemsByKey: Map<string, Item>;
  abilities: Record<string, Ability>;
  heroAbilities: Record<string, RawHeroAbilities>;
  matchups: Record<string, Matchup[]>;
  itemPopularity: Record<string, ItemPopularity>;
  heroStats: Record<number, HeroStatsRow>;
  patch: PatchInfo;
  status: StatusPayload;
};

let catalog: Catalog | null = null;
let loadedMtime = 0;

function mtime(file: string): number {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function imageUrl(kind: "heroes" | "icons" | "items" | "abilities", name: string): string {
  const file = path.join(ASSETS_DIR, kind, `${name}.png`);
  if (fs.existsSync(file)) return `/assets/${kind}/${name}.png`;
  return `/assets/${kind}/${name}.png`;
}

function attribDuration(value: string | string[] | number | undefined): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value.join("/") : String(value);
}

export function detectBreak(
  dname: string,
  desc: string,
  attrib: RawAttrib[] | undefined,
): { appliesBreak: boolean; breakDuration?: string } {
  const name = dname.toLowerCase();
  const nameIsFalsePositive =
    name === "mana break" ||
    name === "life break" ||
    name === "break tether" ||
    name === "break of dawn";
  let breakDuration: string | undefined;
  let flagged = false;
  for (const row of attrib ?? []) {
    const header = (row.header ?? "").toLowerCase();
    const key = (row.key ?? "").toLowerCase();
    if (header.includes("break duration") || key === "break_duration") {
      flagged = true;
      breakDuration = attribDuration(row.value);
    }
    if (key === "does_break") {
      const first = Array.isArray(row.value) ? String(row.value[0]) : String(row.value ?? "0");
      if (first !== "0" && first !== "false") flagged = true;
    }
  }
  const blob = `${dname} ${desc}`.toLowerCase();
  const textHit =
    /appl(?:y|ies|ying)(?: a)? break/.test(blob) ||
    /disabl(?:e|es|ing) their passives?/.test(blob);
  if (nameIsFalsePositive && !textHit && !flagged) return { appliesBreak: false };
  return { appliesBreak: flagged || textHit, breakDuration };
}

export function hasData(): boolean {
  return fs.existsSync(path.join(DATA_DIR, "heroes.json"));
}

export function loadCatalog(force = false): Catalog | null {
  if (!hasData()) {
    catalog = null;
    return null;
  }
  const stamp = Math.max(
    mtime(path.join(DATA_DIR, "heroes.json")),
    mtime(path.join(DATA_DIR, "abilities.json")),
    mtime(path.join(DATA_DIR, "hero_abilities.json")),
    mtime(path.join(DATA_DIR, "matchups.json")),
    mtime(path.join(DATA_DIR, "itemPopularity.json")),
    mtime(path.join(DATA_DIR, "manifest.json")),
    mtime(path.join(DATA_DIR, "patch.json")),
  );
  if (!force && catalog && stamp === loadedMtime) return catalog;

  const rawHeroes = readJson<Record<string, RawHero>>(path.join(DATA_DIR, "heroes.json"), {});
  const rawItems = readJson<Record<string, RawItem>>(path.join(DATA_DIR, "items.json"), {});
  const rawAbilities = readJson<Record<string, RawAbility>>(
    path.join(DATA_DIR, "abilities.json"),
    {},
  );
  const heroAbilities = readJson<Record<string, RawHeroAbilities>>(
    path.join(DATA_DIR, "hero_abilities.json"),
    {},
  );
  const matchups = readJson<Record<string, Matchup[]>>(path.join(DATA_DIR, "matchups.json"), {});
  const itemPopularity = readJson<Record<string, ItemPopularity>>(
    path.join(DATA_DIR, "itemPopularity.json"),
    {},
  );
  const statsList = readJson<HeroStatsRow[]>(path.join(DATA_DIR, "heroStats.json"), []);
  const manifest = readJson<{
    syncedAt?: string;
    images?: Record<string, number>;
  }>(path.join(DATA_DIR, "manifest.json"), {});

  const heroes: Hero[] = Object.values(rawHeroes)
    .filter((h) => h && typeof h.id === "number" && h.name)
    .map((h) => {
      const shortName = heroShortName(h.name);
      return {
        id: h.id,
        name: h.name,
        shortName,
        localizedName: h.localized_name,
        primaryAttr: h.primary_attr,
        attackType: h.attack_type,
        roles: h.roles ?? [],
        img: imageUrl("heroes", shortName),
        icon: imageUrl("icons", shortName),
      };
    })
    .sort((a, b) => a.localizedName.localeCompare(b.localizedName));

  const heroesById = new Map(heroes.map((h) => [h.id, h]));
  const heroesByShort = new Map(heroes.map((h) => [h.shortName, h]));

  const items: Item[] = [];
  const itemsById = new Map<number, Item>();
  const itemsByKey = new Map<string, Item>();
  for (const [key, raw] of Object.entries(rawItems)) {
    if (!raw?.dname || key.startsWith("recipe_")) continue;
    const item: Item = {
      id: raw.id ?? 0,
      key,
      dname: raw.dname,
      cost: typeof raw.cost === "number" ? raw.cost : 0,
      img: imageUrl("items", key),
      hint: stripHtml(raw.hint),
      notes: stripHtml(raw.notes),
      lore: stripHtml(raw.lore),
      components: raw.components ?? null,
      cd: raw.cd ?? false,
      mc: raw.mc ?? false,
      qual: raw.qual ?? "",
    };
    items.push(item);
    itemsByKey.set(key, item);
    if (item.id) itemsById.set(item.id, item);
  }
  items.sort((a, b) => a.dname.localeCompare(b.dname));

  const abilities: Record<string, Ability> = {};
  for (const [key, raw] of Object.entries(rawAbilities)) {
    if (!raw?.dname) continue;
    const desc = stripHtml(raw.desc);
    const behaviors = Array.isArray(raw.behavior) ? raw.behavior : raw.behavior ? [raw.behavior] : [];
    const brk = detectBreak(raw.dname, desc, raw.attrib);
    abilities[key] = {
      key,
      dname: raw.dname,
      desc,
      img: imageUrl("abilities", key),
      behavior: raw.behavior,
      isInnate: Boolean(raw.is_innate),
      hidden: behaviors.includes("Hidden"),
      appliesBreak: brk.appliesBreak || undefined,
      breakDuration: brk.breakDuration,
    };
  }

  const heroStats: Record<number, HeroStatsRow> = {};
  for (const row of statsList) {
    if (typeof row?.id === "number") heroStats[row.id] = row;
  }

  const patch = loadPatch();
  const status: StatusPayload = {
    synced: heroes.length > 0,
    syncedAt: manifest.syncedAt ?? null,
    heroes: heroes.length,
    items: items.length,
    abilities: Object.keys(abilities).length,
    matchups: Object.keys(matchups).length,
    images: manifest.images ?? null,
    patchVersion: patch.version,
  };

  catalog = {
    heroes,
    heroesById,
    heroesByShort,
    items,
    itemsById,
    itemsByKey,
    abilities,
    heroAbilities,
    matchups,
    itemPopularity,
    heroStats,
    patch,
    status,
  };
  loadedMtime = stamp;
  return catalog;
}

export function requireCatalog(): Catalog {
  const data = loadCatalog();
  if (!data) {
    throw Object.assign(new Error("Data not synced. Run npm run sync."), { status: 503 });
  }
  return data;
}
