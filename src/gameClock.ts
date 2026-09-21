export type ClockUrgency = "now" | "soon" | "ok";

export type ClockCard = {
  id: string;
  name: string;
  detail: string;
  at: number | null;
  dueIn: number | null;
  urgency: ClockUrgency;
};

export type KillMark = {
  clock: number;
};

export const ROSH_MIN = 8 * 60;
export const ROSH_MAX = 11 * 60;
export const TORMENTOR_FIRST = 20 * 60;
export const TORMENTOR_RESPAWN = 10 * 60;

export function formatGameClock(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const sign = seconds < 0 ? "-" : "";
  const abs = Math.abs(Math.floor(seconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

export function interpolateClock(
  clock: number | null,
  lastUpdate: number | null,
  paused: boolean,
  now = Date.now(),
): number | null {
  if (clock == null) return null;
  if (paused || lastUpdate == null) return clock;
  const elapsed = Math.max(0, (now - lastUpdate) / 1000);
  return clock + elapsed;
}

function urgency(dueIn: number | null): ClockUrgency {
  if (dueIn == null) return "ok";
  if (dueIn <= 8 && dueIn >= -12) return "now";
  if (dueIn > 8 && dueIn <= 25) return "soon";
  return "ok";
}

function repeating(clock: number, first: number, interval: number): { at: number; dueIn: number } {
  if (clock < first) return { at: first, dueIn: first - clock };
  const last = first + Math.floor((clock - first) / interval) * interval;
  if (clock - last < 8) return { at: last, dueIn: last - clock };
  const next = last + interval;
  return { at: next, dueIn: next - clock };
}

function oneShot(clock: number, at: number, hideAfter = 20): { at: number; dueIn: number } | null {
  const dueIn = at - clock;
  if (dueIn < -hideAfter) return null;
  return { at, dueIn };
}

function isDay(clock: number, daytime: boolean | null): boolean {
  if (daytime != null) return daytime;
  if (clock < 0) return true;
  return Math.floor(clock / 300) % 2 === 0;
}

function nextStack(clock: number): { at: number; dueIn: number } {
  const sec = ((Math.floor(clock) % 60) + 60) % 60;
  const minuteStart = Math.floor(clock) - sec;
  const at = sec <= 53 ? minuteStart + 53 : minuteStart + 113;
  return { at, dueIn: at - clock };
}

function card(
  id: string,
  name: string,
  detail: string,
  at: number | null,
  dueIn: number | null,
): ClockCard {
  return { id, name, detail, at, dueIn, urgency: urgency(dueIn) };
}

export function buildClockCards(input: {
  clock: number | null;
  daytime: boolean | null;
  roshDeath: KillMark | null;
  tormentorDeath: KillMark | null;
}): ClockCard[] {
  const clock = input.clock;
  if (clock == null) {
    return [
      card("bounty", "Bounty runes", "0:00, then every 4:00", 0, null),
      card("water", "Water runes", "River at 2:00 and 4:00 only", 120, null),
      card("power", "Power runes", "First 6:00, then every 2:00", 360, null),
      card("lotus", "Lotus shrines", "First 3:00, then every 3:00", 180, null),
      card("wisdom", "Wisdom shrines", "First 7:00, then every 7:00", 420, null),
      card("rosh", "Roshan", "Alive from horn. Respawn 8–11 min after death.", 0, null),
      card("tormentor", "Tormentor", "First spawn 20:00. One active, follows day/night.", TORMENTOR_FIRST, null),
    ];
  }

  const day = isDay(clock, input.daytime);
  const cycle = repeating(clock, 300, 300);
  const nextIsNight = Math.floor(cycle.at / 300) % 2 === 1;
  const bounty = repeating(clock, 0, 240);
  const power = repeating(clock, 360, 120);
  const lotus = repeating(clock, 180, 180);
  const wisdom = repeating(clock, 420, 420);
  const siege = repeating(clock, 300, 300);
  const stack = nextStack(clock);

  const pit =
    clock < 15 * 60
      ? "Top pit (first spawn)"
      : day
        ? "Top pit (day)"
        : "Bottom pit (night)";
  const tormentSide = day
    ? "Radiant / south-east (day)"
    : "Dire / north-west (night)";

  const cards: ClockCard[] = [];

  cards.push(
    card(
      "bounty",
      "Bounty runes",
      `Four map bounties. Next ${formatGameClock(bounty.at)}.`,
      bounty.at,
      bounty.dueIn,
    ),
  );

  const waterTimes = [120, 240];
  for (const at of waterTimes) {
    const hit = oneShot(clock, at, 15);
    if (hit) {
      cards.push(
        card("water", "Water runes", "River spots, then they stop spawning.", hit.at, hit.dueIn),
      );
      break;
    }
  }

  if (clock >= 360 - 90) {
    cards.push(
      card(
        "power",
        "Power runes",
        `River runes. Next ${formatGameClock(power.at)}. Does not name the rune.`,
        power.at,
        power.dueIn,
      ),
    );
  } else {
    cards.push(card("power", "Power runes", "First spawn at 6:00, then every 2:00.", 360, 360 - clock));
  }

  cards.push(
    card(
      "lotus",
      "Lotus shrines",
      `Offlane shrines. Next ${formatGameClock(lotus.at)}. Stand in the shrine to siphon the lotus.`,
      lotus.at,
      lotus.dueIn,
    ),
    card(
      "wisdom",
      "Wisdom shrines",
      `Offlane shrines. Next ${formatGameClock(wisdom.at)}. Stand in the shrine to siphon XP.`,
      wisdom.at,
      wisdom.dueIn,
    ),
    card(
      "daynight",
      nextIsNight ? "Night coming" : "Day coming",
      `${day ? "Day" : "Night"} now · swap every 5:00. Roshan/Tormentor sides follow this.`,
      cycle.at,
      cycle.dueIn,
    ),
    card("siege", "Siege creeps", "Lane catapults on the 5:00 marks.", siege.at, siege.dueIn),
    card("stack", "Stack camps", "Start the pull around :53 this minute.", stack.at, stack.dueIn),
  );

  if (input.roshDeath) {
    const minAt = input.roshDeath.clock + ROSH_MIN;
    const maxAt = input.roshDeath.clock + ROSH_MAX;
    const dueMin = minAt - clock;
    const dueMax = maxAt - clock;
    let detail: string;
    let dueIn: number;
    let at: number;
    if (clock < minAt) {
      detail = `Earliest ${formatGameClock(minAt)}, guaranteed by ${formatGameClock(maxAt)}. ${pit}.`;
      dueIn = dueMin;
      at = minAt;
    } else if (clock <= maxAt) {
      detail = `Can be up now through ${formatGameClock(maxAt)}. ${pit}.`;
      dueIn = 0;
      at = clock;
    } else {
      detail = `Window passed (${formatGameClock(minAt)}–${formatGameClock(maxAt)}). Mark again if he died once more. ${pit}.`;
      dueIn = dueMax;
      at = maxAt;
    }
    cards.push(card("rosh", "Roshan", detail, at, dueIn));
  } else {
    cards.push(
      card(
        "rosh",
        "Roshan",
        `Up from the horn. ${pit}. Click “Roshan died” after a kill — GSI cannot see the pit.`,
        null,
        null,
      ),
    );
  }

  if (clock < TORMENTOR_FIRST && !input.tormentorDeath) {
    cards.push(
      card(
        "tormentor",
        "Tormentor",
        `First spawn ${formatGameClock(TORMENTOR_FIRST)}. ${tormentSide}.`,
        TORMENTOR_FIRST,
        TORMENTOR_FIRST - clock,
      ),
    );
  } else if (input.tormentorDeath) {
    const at = input.tormentorDeath.clock + TORMENTOR_RESPAWN;
    cards.push(
      card(
        "tormentor",
        "Tormentor",
        `Respawn ~10:00 after death → ${formatGameClock(at)}. ${tormentSide}.`,
        at,
        at - clock,
      ),
    );
  } else {
    cards.push(
      card(
        "tormentor",
        "Tormentor",
        `Should be up. ${tormentSide}. Only one active. Click “Tormentor died” when it falls.`,
        TORMENTOR_FIRST,
        0,
      ),
    );
  }

  const tiers: [string, number][] = [
    ["Neutral tier 1", 5 * 60],
    ["Neutral tier 2", 15 * 60],
    ["Neutral tier 3", 25 * 60],
    ["Neutral tier 4", 35 * 60],
    ["Neutral tier 5", 60 * 60],
  ];
  const nextTier = tiers.find(([, at]) => at - clock > -20);
  if (nextTier) {
    const [name, at] = nextTier;
    cards.push(
      card("neutrals", name, "Crafting materials start dropping at this clock.", at, at - clock),
    );
  }

  return cards;
}

export function soonestCue(cards: ClockCard[]): ClockCard | null {
  const live = cards
    .filter((c) => c.dueIn != null && c.dueIn > -12 && c.dueIn <= 90)
    .sort((a, b) => (a.dueIn ?? 99) - (b.dueIn ?? 99));
  return live[0] ?? null;
}
