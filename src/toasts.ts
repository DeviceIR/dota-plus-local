import type { ClockCard } from "./gameClock";

const PREF = "dota-plus-toasts";
const TOASTABLE = new Set(["bounty", "water", "power", "lotus", "wisdom", "tormentor", "rosh"]);
const SKIP_ITEMS = new Set([
  "tango",
  "tango_single",
  "branches",
  "clarity",
  "faerie_fire",
  "flask",
  "ward_observer",
  "enchanted_mango",
  "blood_grenade",
]);

const fired = new Set<string>();
let lastItemKey: string | null = null;
let lastItemAt = 0;

export function toastsEnabled(): boolean {
  try {
    return localStorage.getItem(PREF) !== "0";
  } catch {
    return true;
  }
}

export function setToastsEnabled(on: boolean) {
  localStorage.setItem(PREF, on ? "1" : "0");
}

export async function ensureToastPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const next = await Notification.requestPermission();
  return next === "granted";
}

export function resetGameToasts() {
  fired.clear();
  lastItemKey = null;
  lastItemAt = 0;
}

function fire(title: string, body: string, tag: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag, silent: false });
  } catch {
    /* Windows toast is best-effort */
  }
}

/** Runes / objectives only. Never pick or ban. */
export function tickRuneToasts(cards: ClockCard[], drafting: boolean) {
  if (drafting || !toastsEnabled()) return;
  for (const card of cards) {
    if (!TOASTABLE.has(card.id)) continue;
    if (card.dueIn == null || card.dueIn > 22 || card.dueIn < 0) continue;
    const tag = `${card.id}-${Math.round(card.at ?? 0)}`;
    if (fired.has(tag)) continue;
    fired.add(tag);
    const seconds = Math.max(0, Math.round(card.dueIn));
    fire(`DotaPlus · ${card.name}`, `In ${seconds}s. ${card.detail}`, tag);
  }
}

export function tickItemToast(
  itemName: string | null,
  itemKey: string | null,
  drafting: boolean,
  inGame: boolean,
) {
  if (drafting || !inGame || !toastsEnabled()) return;
  if (!itemKey || !itemName || SKIP_ITEMS.has(itemKey)) return;
  if (itemKey === lastItemKey) return;
  const now = Date.now();
  if (lastItemKey && now - lastItemAt < 90_000) return;
  lastItemKey = itemKey;
  lastItemAt = now;
  fire("DotaPlus · Next buy", itemName, `item-${itemKey}`);
}
