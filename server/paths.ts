import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "..");
export const DATA_DIR = path.join(ROOT, "data");
export const ASSETS_DIR = path.join(DATA_DIR, "assets");
export const PORT = 5174;
export const GSI_TOKEN = "dotaplus-local";
export const GSI_URI = `http://127.0.0.1:${PORT}/gsi`;
export const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react";
export const OPENDOTA = "https://api.opendota.com/api";

export function heroShortName(name: string): string {
  return name.replace(/^npc_dota_hero_/, "");
}

export function itemKeyFromGsi(name: string): string {
  return name.replace(/^item_/, "");
}

export function stripHtml(value: string | string[] | undefined): string {
  if (!value) return "";
  const text = Array.isArray(value) ? value.join(" ") : String(value);
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
