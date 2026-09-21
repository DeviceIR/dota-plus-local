import type { DraftState, LiveState } from "./types";

export function padFive(ids: (number | null)[] | undefined): (number | null)[] {
  const next = [...(ids ?? [])];
  while (next.length < 5) next.push(null);
  return next.slice(0, 5);
}

function mergeSlots(manual: (number | null)[], gsi: (number | null)[]): (number | null)[] {
  const next = padFive(gsi).map((id) => (id && id > 0 ? id : null));
  const used = new Set(next.filter((id): id is number => Boolean(id)));
  for (let i = 0; i < 5; i++) {
    const id = padFive(manual)[i];
    if (!id || used.has(id) || next[i] != null) continue;
    next[i] = id;
    used.add(id);
  }
  for (const id of padFive(manual)) {
    if (!id || used.has(id)) continue;
    const hole = next.findIndex((slot) => slot == null);
    if (hole < 0) break;
    next[hole] = id;
    used.add(id);
  }
  return next;
}

function sameSlots(a: (number | null)[], b: (number | null)[]): boolean {
  return padFive(a).every((id, i) => id === padFive(b)[i]);
}

export function resetTeams(draft: DraftState): DraftState {
  return {
    ...draft,
    radiant: [null, null, null, null, null],
    dire: [null, null, null, null, null],
    bans: [],
  };
}

function fillFromPlayers(
  slots: (number | null)[],
  players: { team: "radiant" | "dire"; heroId: number | null }[],
  team: "radiant" | "dire",
): (number | null)[] {
  const next = padFive(slots);
  const used = new Set(next.filter((id): id is number => Boolean(id)));
  for (const row of players) {
    if (row.team !== team || !row.heroId || used.has(row.heroId)) continue;
    const hole = next.findIndex((id) => id == null);
    if (hole < 0) break;
    next[hole] = row.heroId;
    used.add(row.heroId);
  }
  return next;
}

export function mergeLiveDraft(current: DraftState, live: LiveState): DraftState {
  let radiant = padFive(current.radiant);
  let dire = padFive(current.dire);
  let bans = [...current.bans];
  const side = live.playerTeam ?? current.side;

  if (live.draft) {
    radiant = mergeSlots(radiant, live.draft.radiant);
    dire = mergeSlots(dire, live.draft.dire);
    for (const id of live.draft.bans) {
      if (id > 0 && !bans.includes(id) && !radiant.includes(id) && !dire.includes(id)) {
        bans.push(id);
      }
    }
  }

  if (live.players?.length) {
    radiant = fillFromPlayers(radiant, live.players, "radiant");
    dire = fillFromPlayers(dire, live.players, "dire");
  }

  const heroId = live.hero?.id;
  if (heroId && heroId > 0 && !radiant.includes(heroId) && !dire.includes(heroId) && !bans.includes(heroId)) {
    const slots = side === "radiant" ? radiant : dire;
    const hole = slots.findIndex((id) => id == null);
    if (hole >= 0) slots[hole] = heroId;
  }

  if (
    side === current.side &&
    sameSlots(radiant, current.radiant) &&
    sameSlots(dire, current.dire) &&
    bans.length === current.bans.length &&
    bans.every((id, i) => id === current.bans[i])
  ) {
    return current;
  }

  return { ...current, side, radiant, dire, bans };
}

export function isHeroSelect(live: LiveState | null): boolean {
  const state = live?.gameState ?? "";
  if (state.includes("HERO_SELECTION") || state.includes("STRATEGY") || state.includes("PLAYER_DRAFT")) {
    return true;
  }
  return Boolean(live?.pickPhase?.isDraft);
}
