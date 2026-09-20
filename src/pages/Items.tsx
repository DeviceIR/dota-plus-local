import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { SafeImage } from "../SafeImage";
import type { DraftState, Hero, Item, ItemSuggestion, LiveState } from "../types";

type Props = {
  heroes: Hero[];
  heroesById: Map<number, Hero>;
  itemsByKey: Map<string, Item>;
  draft: DraftState;
  live: LiveState | null;
};

const PHASES = ["all", "start", "early", "mid", "late"] as const;

export function ItemsPage({ heroes, heroesById, itemsByKey, draft, live }: Props) {
  const allied = draft.side === "radiant" ? draft.radiant : draft.dire;
  const enemy = draft.side === "radiant" ? draft.dire : draft.radiant;
  const liveHero = live?.hero
    ? heroes.find((h) => h.shortName === live.hero?.shortName)
    : undefined;

  const [heroId, setHeroId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState<(typeof PHASES)[number]>("all");
  const [rows, setRows] = useState<ItemSuggestion[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fromDraft = allied.find((id): id is number => Boolean(id));
    if (fromDraft) setHeroId(fromDraft);
  }, [allied.join(",")]);

  useEffect(() => {
    if (liveHero) setHeroId(liveHero.id);
  }, [liveHero?.id]);

  const filteredHeroes = useMemo(() => {
    const query = q.trim().toLowerCase();
    return heroes.filter(
      (h) =>
        !query ||
        h.localizedName.toLowerCase().includes(query) ||
        h.shortName.includes(query),
    );
  }, [heroes, q]);

  useEffect(() => {
    if (!heroId) return;
    const t = setTimeout(() => {
      setBusy(true);
      void api
        .itemSuggest({
          heroId,
          enemy: enemy.filter((id): id is number => Boolean(id)),
          ownedItems: live?.items ?? [],
          phase,
        })
        .then(setRows)
        .catch(() => setRows([]))
        .finally(() => setBusy(false));
    }, 150);
    return () => clearTimeout(t);
  }, [heroId, enemy.join(","), phase, live?.items.join(",")]);

  const grouped = useMemo(() => {
    const map = new Map<string, ItemSuggestion[]>();
    for (const row of rows) {
      const list = map.get(row.phase) ?? [];
      list.push(row);
      map.set(row.phase, list);
    }
    return map;
  }, [rows]);

  const selected = heroId ? heroesById.get(heroId) : null;

  return (
    <div className="page">
      <div className="panel">
        <h3>Your hero</h3>
        <div className="row">
          <input
            className="search"
            placeholder="Search hero"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {selected && <span className="muted">Building for {selected.localizedName}</span>}
          {live?.connected && liveHero && (
            <span className="reason">Live GSI: {liveHero.localizedName}</span>
          )}
        </div>
        <div className="hero-select" style={{ marginTop: 10 }}>
          {filteredHeroes.map((hero) => (
            <button
              key={hero.id}
              className={`hero-card ${hero.id === heroId ? "selected" : ""}`}
              onClick={() => setHeroId(hero.id)}
            >
              <SafeImage src={hero.img} alt={hero.localizedName} />
              <span className="name">{hero.localizedName}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="row tabs">
        {PHASES.map((p) => (
          <button key={p} className={phase === p ? "gold" : "ghost"} onClick={() => setPhase(p)}>
            {p}
          </button>
        ))}
      </div>

      {!heroId && <p className="muted">Pick a hero to see start / early / mid / late items.</p>}
      {busy && <p className="muted">Scoring items…</p>}

      {(["start", "early", "mid", "late"] as const)
        .filter((p) => phase === "all" || phase === p)
        .map((p) => (
          <div key={p} className="panel">
            <h3>{p} game</h3>
            <div className="item-grid">
              {(grouped.get(p) ?? []).map((row) => {
                const item = row.item ?? itemsByKey.get(row.itemKey);
                if (!item) return null;
                return (
                  <div key={`${p}-${item.key}`} className="item-card">
                    <SafeImage className="item-icon" src={item.img} alt={item.dname} />
                    <div className="body">
                      <strong>{item.dname}</strong>
                      <span className="muted">
                        {item.cost ? `${item.cost} gold` : "no cost"} · {row.popularity} buys
                      </span>
                      <span className="reason">{row.reasons.join(" · ")}</span>
                    </div>
                  </div>
                );
              })}
              {(grouped.get(p) ?? []).length === 0 && (
                <p className="muted">No cached popularity for this phase yet.</p>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}
