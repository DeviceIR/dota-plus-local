import { useEffect, useMemo, useState } from "react";
import { ObjectiveArt } from "./ObjectiveArt";
import {
  buildClockCards,
  formatGameClock,
  interpolateClock,
  type ClockCard,
  type KillMark,
} from "./gameClock";
import type { LiveState } from "./types";

const ROSH_KEY = "dota-plus-rosh-death";
const TORM_KEY = "dota-plus-tormentor-death";

function readMark(key: string, clock: number | null): KillMark | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KillMark;
    if (typeof parsed.clock !== "number") return null;
    if (clock != null && clock + 30 < parsed.clock) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeMark(key: string, mark: KillMark | null) {
  if (!mark) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(mark));
}

function bigTimer(card: ClockCard): string {
  if (card.dueIn == null) {
    if (card.id === "rosh") return "UP";
    return "—";
  }
  if (card.dueIn <= 8 && card.dueIn >= -12) return "NOW";
  if (card.dueIn < 0) return formatGameClock(card.at);
  return formatGameClock(card.dueIn);
}

type Props = {
  live: LiveState | null;
  compact?: boolean;
};

const FEATURED = new Set(["bounty", "water", "power", "lotus", "wisdom", "rosh", "tormentor"]);

export function MapClockPanel({ live, compact }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [rosh, setRosh] = useState<KillMark | null>(() => readMark(ROSH_KEY, live?.clock ?? null));
  const [torm, setTorm] = useState<KillMark | null>(() => readMark(TORM_KEY, live?.clock ?? null));

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const clock = interpolateClock(live?.clock ?? null, live?.lastUpdate ?? null, Boolean(live?.paused), now);

  useEffect(() => {
    if (clock == null) return;
    if (rosh && clock + 30 < rosh.clock) {
      setRosh(null);
      writeMark(ROSH_KEY, null);
    }
    if (torm && clock + 30 < torm.clock) {
      setTorm(null);
      writeMark(TORM_KEY, null);
    }
  }, [clock, rosh, torm]);

  const cards = useMemo(
    () =>
      buildClockCards({
        clock,
        daytime: live?.daytime ?? null,
        roshDeath: rosh,
        tormentorDeath: torm,
      }),
    [clock, live?.daytime, rosh, torm],
  );

  function markRosh() {
    if (clock == null) return;
    const next = { clock };
    setRosh(next);
    writeMark(ROSH_KEY, next);
  }

  function markTorm() {
    if (clock == null) return;
    const next = { clock };
    setTorm(next);
    writeMark(TORM_KEY, next);
  }

  function clearMarks() {
    setRosh(null);
    setTorm(null);
    writeMark(ROSH_KEY, null);
    writeMark(TORM_KEY, null);
  }

  const shown = compact ? cards.filter((c) => FEATURED.has(c.id)) : cards;

  return (
    <div className={`panel ${compact ? "clock-compact" : ""}`}>
      <div className="clock-head">
        <h3>Map clock{clock != null ? ` · ${formatGameClock(clock)}` : ""}</h3>
        <div className="row">
          <button className="gold" disabled={clock == null} onClick={markRosh}>
            Rosh died
          </button>
          <button className="ghost" disabled={clock == null} onClick={markTorm}>
            Torm died
          </button>
          <button className="ghost" onClick={clearMarks}>
            Clear
          </button>
        </div>
      </div>
      {!compact && (
        <p className="muted">
          Big number is the countdown to the next spawn. GSI cannot see Roshan or Tormentor deaths —
          tap the buttons when they fall.
        </p>
      )}
      <div className={`clock-grid ${compact ? "compact" : ""}`}>
        {shown.map((c) => (
          <div key={c.id} className={`clock-card obj-card ${c.urgency}`}>
            <div className="obj-art">
              <ObjectiveArt id={c.id} />
              <div className="obj-timer">{bigTimer(c)}</div>
            </div>
            <div className="clock-card-top">
              <strong>{c.name}</strong>
            </div>
            {!compact && <p>{c.detail}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
