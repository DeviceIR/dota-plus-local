import { useEffect, useMemo, useState } from "react";
import { MapClockPanel } from "../MapClock";
import { PickPhaseBanner } from "../PickPhase";
import { api } from "../api";
import { loadBuildId, saveBuildId } from "../buildPrefs";
import { BuildPicker } from "../BuildPicker";
import { SafeImage } from "../SafeImage";
import { ensureToastPermission, setToastsEnabled, toastsEnabled } from "../toasts";
import type { DraftState, Hero, Item, ItemSuggestResult, LivePlayer, LiveState } from "../types";

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

function resolveHero(player: LivePlayer, heroesById: Map<number, Hero>, heroes: Hero[]): Hero | undefined {
  if (player.heroId) return heroesById.get(player.heroId);
  if (player.shortName) return heroes.find((h) => h.shortName === player.shortName);
  return undefined;
}

export function LivePage({
  live,
  heroes,
  heroesById,
  itemsByKey,
  draft,
  setDraft,
  onRefreshStatus,
}: Props) {
  const [installMsg, setInstallMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<ItemSuggestResult | null>(null);
  const [buildId, setBuildId] = useState<string | undefined>(undefined);
  const [alertsOn, setAlertsOn] = useState(toastsEnabled);

  const liveHero = live?.hero
    ? [...heroesById.values()].find((h) => h.shortName === live.hero?.shortName) ??
      (live.hero.id ? heroesById.get(live.hero.id) : undefined)
    : undefined;

  const you = useMemo(
    () => live?.players.find((p) => p.isYou) ?? null,
    [live?.players],
  );
  const enemies = useMemo(() => {
    const team = live?.playerTeam ?? you?.team ?? draft.side;
    const fromPlayers = (live?.players ?? []).filter((p) => !p.isYou && p.team !== team);
    if (fromPlayers.length) return fromPlayers;
    const ids = team === "radiant" ? (live?.draft?.dire ?? draft.dire) : (live?.draft?.radiant ?? draft.radiant);
    const enemyTeam: "radiant" | "dire" = team === "radiant" ? "dire" : "radiant";
    return ids
      .filter((id): id is number => Boolean(id))
      .map((heroId) => ({
        name: null,
        team: enemyTeam,
        heroId,
        shortName: null,
        level: 0,
        items: [] as string[],
        isYou: false,
      }));
  }, [live?.players, live?.playerTeam, live?.draft, you?.team, draft]);

  useEffect(() => {
    setBuildId(loadBuildId(liveHero?.id));
  }, [liveHero?.id]);

  useEffect(() => {
    if (!liveHero) {
      setPlan(null);
      return;
    }
    const enemyIds = enemies.map((p) => p.heroId).filter((id): id is number => Boolean(id));
    const ownedItems = [...new Set([...(you?.items ?? []), ...(live?.items ?? [])])];
    void api
      .itemSuggest({
        heroId: liveHero.id,
        enemy: enemyIds,
        ownedItems,
        phase: phaseFromClock(live?.clock ?? null),
        role: draft.role ?? "any",
        buildId,
      })
      .then(setPlan)
      .catch(() => setPlan(null));
  }, [liveHero?.id, you?.items, live?.items, live?.clock, enemies, liveHero, draft.role, buildId]);

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

  const drafting = Boolean(live?.pickPhase?.isDraft);
  const enemyHasItems = enemies.some((p) => p.items.length > 0);
  const nextBuys = plan?.items ?? [];

  return (
    <div className="page live-page">
      <div className="live-status">
        <div>
          <strong>{live?.connected ? "GSI connected" : "GSI waiting"}</strong>
          {live?.steamName ? ` · ${live.steamName}` : ""}
          <span className="muted">
            {" "}
            · {formatClock(live?.clock ?? null)}
            {live?.paused ? " paused" : ""}
          </span>
        </div>
        <div className="row">
          <button className="ghost" disabled={busy} onClick={() => void install()}>
            {busy ? "Installing…" : "Install GSI"}
          </button>
          <label className="pool-toggle">
            <input
              type="checkbox"
              checked={alertsOn}
              onChange={(e) => {
                const on = e.target.checked;
                setAlertsOn(on);
                setToastsEnabled(on);
                if (on) void ensureToastPermission();
              }}
            />
            Windows alerts (runes / next buy)
          </label>
        </div>
      </div>
      {installMsg && <div className="banner">{installMsg}</div>}
      <PickPhaseBanner live={live} compact />

      <div className="live-board">
        <div className="live-fighters">
          <div className="panel">
            <h3>You</h3>
            {you || liveHero ? (
              <PlayerRow
                player={
                  you ?? {
                    name: live?.steamName ?? null,
                    team: live?.playerTeam ?? draft.side,
                    heroId: liveHero?.id ?? null,
                    shortName: liveHero?.shortName ?? null,
                    level: live?.hero?.level ?? 0,
                    items: live?.items ?? [],
                    isYou: true,
                  }
                }
                heroes={heroes}
                heroesById={heroesById}
                itemsByKey={itemsByKey}
                you
              />
            ) : (
              <p className="muted">No hero yet. Start a match with GSI enabled.</p>
            )}
          </div>

          <div className="panel">
            <h3>Enemy</h3>
            {enemies.length ? (
              enemies.map((player, i) => (
                <PlayerRow
                  key={`${player.heroId ?? i}-${player.name ?? i}`}
                  player={player}
                  heroes={heroes}
                  heroesById={heroesById}
                  itemsByKey={itemsByKey}
                />
              ))
            ) : (
              <p className="muted">No enemy heroes yet. Ranked often hides them until picks lock.</p>
            )}
            {enemies.length > 0 && !enemyHasItems && (
              <p className="muted">
                Valve GSI usually hides enemy inventories in ranked. Spectating a match shows items.
              </p>
            )}
          </div>

          {plan && liveHero && plan.builds.length > 0 && (
            <div className="panel">
              <h3>Playstyle</h3>
              <BuildPicker
                builds={plan.builds}
                selectedId={plan.selectedBuildId}
                itemsByKey={itemsByKey}
                onPick={(id) => {
                  saveBuildId(liveHero.id, id);
                  setBuildId(id);
                }}
              />
            </div>
          )}

          {nextBuys.length > 0 && (
            <div className="panel">
              <h3>Next buys</h3>
              <div className="live-buys">
                {nextBuys.slice(0, 6).map((row) => {
                  const item = row.item ?? itemsByKey.get(row.itemKey);
                  if (!item) return null;
                  const why = (row.benefits ?? [])[0] || row.reasons[0];
                  return (
                    <div
                      key={`${row.phase}-${item.key}`}
                      className="live-buy"
                      title={[...(row.benefits ?? []), ...row.reasons].join(" · ")}
                    >
                      <SafeImage className="item-icon" src={item.img} alt={item.dname} />
                      <div className="live-buy-copy">
                        <span>{item.dname}</span>
                        {why && <span className="live-buy-why">{why}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <MapClockPanel live={live} compact />
      </div>

      {drafting && live?.draft && (
        <div className="panel">
          <h3>Draft snapshot</h3>
          <div className="teams">
            <TeamLine title="Radiant" ids={live.draft.radiant} heroesById={heroesById} />
            <TeamLine title="Dire" ids={live.draft.dire} heroesById={heroesById} />
          </div>
          <button
            className="ghost"
            style={{ marginTop: 10 }}
            onClick={() =>
              setDraft((d) => ({
                ...d,
                radiant: padFive(live.draft!.radiant),
                dire: padFive(live.draft!.dire),
                bans: live.draft!.bans,
              }))
            }
          >
            Copy onto Draft board
          </button>
        </div>
      )}
    </div>
  );
}

function PlayerRow({
  player,
  heroes,
  heroesById,
  itemsByKey,
  you,
}: {
  player: LivePlayer;
  heroes: Hero[];
  heroesById: Map<number, Hero>;
  itemsByKey: Map<string, Item>;
  you?: boolean;
}) {
  const hero = resolveHero(player, heroesById, heroes);
  const slots = [...player.items];
  while (slots.length < 6) slots.push("");
  return (
    <div className={`live-player ${you ? "you" : ""}`}>
      <div className="live-hero">
        {hero ? <SafeImage src={hero.img} alt={hero.localizedName} /> : <div className="img-fallback" />}
        <div>
          <strong>{hero?.localizedName ?? player.name ?? "Unknown"}</strong>
          <div className="muted">
            {player.level ? `Lv ${player.level}` : player.team}
            {player.name && hero ? ` · ${player.name}` : ""}
          </div>
        </div>
      </div>
      <div className="live-items">
        {slots.slice(0, 6).map((key, i) => {
          if (!key) return <div key={`empty-${i}`} className="live-item empty" />;
          const item = itemsByKey.get(key);
          return (
            <SafeImage
              key={`${key}-${i}`}
              className="live-item"
              src={item?.img ?? `/assets/items/${key}.png`}
              alt={item?.dname ?? key}
            />
          );
        })}
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
