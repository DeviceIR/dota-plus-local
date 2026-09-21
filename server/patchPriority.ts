import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./paths.ts";
import type { PlayerRole } from "./types.ts";

export type PatchHero = {
  shortName: string;
  roles: PlayerRole[];
  note: string;
};

export type PatchInfo = {
  version: string;
  date: string;
  title: string;
  buffed: PatchHero[];
};

const FALLBACK: PatchInfo = {
  version: "7.41f",
  date: "2026-09-15",
  title: "Gameplay Patch",
  buffed: [
    { shortName: "antimage", roles: ["carry"], note: "Mana Break damage from burned mana 0.6 → 0.65" },
    { shortName: "ursa", roles: ["carry"], note: "Maul current-HP as damage 1.25% → 1.75%" },
    { shortName: "batrider", roles: ["mid", "offlane"], note: "Intelligence gain 2.9 → 3.2" },
    { shortName: "broodmother", roles: ["mid", "offlane"], note: "Insatiable Hunger mana cost 80 → 70" },
    { shortName: "mars", roles: ["offlane"], note: "Base armor -1 → 0" },
    {
      shortName: "chen",
      roles: ["support"],
      note: "Strength gain 2 → 2.2; Zealot respawn now scales with hero level",
    },
    { shortName: "disruptor", roles: ["support"], note: "Base intelligence 20 → 21" },
    { shortName: "warlock", roles: ["support"], note: "Base attack speed 90 → 95" },
  ],
};

export function loadPatch(): PatchInfo {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "patch.json"), "utf8")) as PatchInfo;
    if (raw?.version && Array.isArray(raw.buffed) && raw.buffed.length > 0) {
      return {
        version: raw.version,
        date: raw.date ?? FALLBACK.date,
        title: raw.title ?? FALLBACK.title,
        buffed: raw.buffed.filter((h) => h?.shortName && Array.isArray(h.roles)),
      };
    }
  } catch {
    /* use fallback */
  }
  return FALLBACK;
}

export function patchBuffFor(
  patch: PatchInfo,
  shortName: string,
  role: PlayerRole,
): PatchHero | null {
  const hit = patch.buffed.find((h) => h.shortName === shortName);
  if (!hit) return null;
  if (role === "any" || hit.roles.length === 0 || hit.roles.includes(role)) return hit;
  return null;
}
