import { useEffect, useState } from "react";
import { api } from "../api";
import { SafeImage } from "../SafeImage";
import type { DraftState, Hero, Item, ItemSuggestion, LiveState } from "../types";

type Props = {
  live: LiveState | null;
  heroes: Hero[];
  heroesById: Map<number, Hero>;
  itemsByKey: Map<string, Item>;
  draft: DraftState;
  setDraft: (next: DraftState | ((d: DraftState) => DraftState)) => void;
  onRefreshStatus: () => void;
};

function formatClock(seconds: number | null): string {
  if (seconds == null) return "—";
  const sign = seconds < 0 ? "-" : "";
  const abs = Math.abs(Math.floor(seconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

function phaseFromClock(clock: number | null): "start" | "early" | "mid" | "late" | "all" {
  if (clock == null) return "all";
  if (clock < 0) return "start";
  if (clock < 600) return "early";
  if (clock < 1500) return "mid";
  return "late";
}

export function LivePage({
  live,
  heroesById,
  itemsByKey,
  draft,
  setDraft,
  onRefreshStatus,
}: Props) {
  const [installMsg, setInstallMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nextBuys, setNextBuys] = useState<ItemSuggestion[]>([]);

  const liveHero = live?.hero
    ? [...heroesById.values()].find((h) => h.shortName === live.hero?.shortName)
    : undefined;

  useEffect(() => {
    if (!liveHero) {
      setNextBuys([]);
      return;
    }
    const enemy = (draft.side === "radiant" ? draft.dire : draft.radiant).filter(
      (id): id is number => Boolean(id),
    );
    const fromGsi = live?.draft
      ? (draft.side === "radiant" ? live.draft.dire : live.draft.radiant).filter(
          (id): id is number => Boolean(id),
        )
      : [];
    void api
      .itemSuggest({
        heroId: liveHero.id,
        enemy: fromGsi.length ? fromGsi : enemy,
        ownedItems: live?.items ?? [],
        phase: phaseFromClock(live?.clock ?? null),
      })
      .then(setNextBuys)
      .catch(() => setNextBuys([]));
  }, [liveHero?.id, live?.items, live?.draft, live?.clock, draft, liveHero]);

  async function install() {
    setBusy(true);
    try {
      const result = await api.installGsi();
      setInstallMsg(result.path ? `${result.message} Wrote ${result.path}` : result.message);
    } catch (err) {
      setInstallMsg((err as Error).message);
    } finally {
      setBusy(false);
      onRefreshStatus();
    }
  }

  function applyDraft() {
    if (!live?.draft) return;
    setDraft((d) => ({
      ...d,
      radiant: padFive(live.draft!.radiant),
      dire: padFive(live.draft!.dire),
      bans: live.draft!.bans,
    }));
    setInstallMsg("Copied GSI draft onto the Draft board.");
  }

  return (
    <div className="page">
      <div className="status-card">
        <div>
          <h3 style={{ margin: "0 0 8px", color: "var(--gold)" }}>Game State Integration</h3>
          <p className="muted">
            Official Valve feed only. This app never injects into Dota, never reads memory, and
            never clicks or buys for you. Keep this window on a second screen.
          </p>
          <p>
            Status:{" "}
            <strong>{live?.connected ? "connected" : "waiting for Dota"}</strong>
            {live?.steamName ? ` · ${live.steamName}` : ""}
          </p>
          <p className="muted">
            Clock {formatClock(live?.clock ?? null)}
            {live?.paused ? " (paused)" : ""} · {live?.gameState ?? "no map state"}
          </p>
        </div>
        <div className="row" style={{ flexDirection: "column", alignItems: "flex-end" }}>
          <button className="gold" disabled={busy} onClick={() => void install()}>
            {busy ? "Installing…" : "Install GSI config"}
          </button>
          <span className="muted">Launch option: -gamestateintegration</span>
        </div>
      </div>

      {installMsg && <div className="banner">{installMsg}</div>}

      <div className="panel">
        <h3>Your hero</h3>
        {liveHero ? (
          <div className="row">
            <div style={{ width: 160 }}>
              <SafeImage src={liveHero.img} alt={liveHero.localizedName} />
            </div>
            <div>
              <strong>{liveHero.localizedName}</strong>
              <div className="muted">Level {live?.hero?.level ?? 0}</div>
            </div>
          </div>
        ) : (
          <p className="muted">
            No hero yet. Start a match (or pick phase, if Valve sends it) with GSI enabled.
          </p>
        )}
      </div>

      <div className="panel">
        <h3>Inventory</h3>
        <div className="inv">
          {(live?.items ?? []).map((key) => {
            const item = itemsByKey.get(key);
            return (
              <SafeImage
                key={key}
                className="item-icon"
                src={item?.img ?? `/assets/items/${key}.png`}
                alt={item?.dname ?? key}
              />
            );
          })}
          {(!live?.items || live.items.length === 0) && (
            <span className="muted">Empty until the game reports items.</span>
          )}
        </div>
      </div>

      {nextBuys.length > 0 && (
        <div className="panel">
          <h3>Next buys</h3>
          <div className="item-grid">
            {nextBuys.slice(0, 8).map((row) => {
              const item = row.item ?? itemsByKey.get(row.itemKey);
              if (!item) return null;
              return (
                <div key={`${row.phase}-${item.key}`} className="item-card">
                  <SafeImage className="item-icon" src={item.img} alt={item.dname} />
                  <div className="body">
                    <strong>{item.dname}</strong>
                    <span className="muted">{row.phase}</span>
                    <span className="reason">{row.reasons.join(" · ")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="panel">
        <h3>Draft from GSI</h3>
        {live?.draft ? (
          <>
            <div className="teams">
              <TeamLine title="Radiant" ids={live.draft.radiant} heroesById={heroesById} />
              <TeamLine title="Dire" ids={live.draft.dire} heroesById={heroesById} />
            </div>
            <button className="gold" style={{ marginTop: 12 }} onClick={applyDraft}>
              Copy onto Draft board
            </button>
            <p className="muted">
              Ranked often hides enemy picks from GSI. If this looks empty, use the Draft tab
              manually.
            </p>
          </>
        ) : (
          <p className="muted">
            No draft payload right now. That is normal in many ranked games — Valve simply does not
            send it.
          </p>
        )}
      </div>
    </div>
  );
}

function padFive(ids: (number | null)[]): (number | null)[] {
  const next = [...ids];
  while (next.length < 5) next.push(null);
  return next.slice(0, 5);
}

function TeamLine({
  title,
  ids,
  heroesById,
}: {
  title: string;
  ids: (number | null)[];
  heroesById: Map<number, Hero>;
}) {
  return (
    <div>
      <h3>{title}</h3>
      <div className="slots">
        {padFive(ids).map((id, i) => {
          const hero = id ? heroesById.get(id) : null;
          return (
            <div key={i} className="slot">
              {hero ? (
                <>
                  <SafeImage src={hero.img} alt={hero.localizedName} />
                  <span className="name">{hero.localizedName}</span>
                </>
              ) : (
                <span className="muted">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
