import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { HeroPool } from "../heroPool";
import { PickPhaseBanner } from "../PickPhase";
import { SafeImage } from "../SafeImage";
import type { DraftState, DraftSuggestion, Hero, LiveState, PlayerRole, RankBracket } from "../types";

const RANKS: { id: RankBracket; label: string }[] = [
  { id: "divine_plus", label: "Divine+" },
  { id: "immortal", label: "Immortal" },
  { id: "divine", label: "Divine" },
  { id: "ancient", label: "Ancient" },
  { id: "legend", label: "Legend" },
  { id: "all", label: "All ranks" },
];

const ROLES: { id: PlayerRole; label: string }[] = [
  { id: "any", label: "Any role" },
  { id: "carry", label: "Carry" },
  { id: "mid", label: "Mid" },
  { id: "offlane", label: "Offlane" },
  { id: "support", label: "Support" },
];

const ATTRS = [
  { id: "all", label: "All" },
  { id: "str", label: "Str" },
  { id: "agi", label: "Agi" },
  { id: "int", label: "Int" },
  { id: "all_attr", label: "Uni" },
];

type Props = {
  heroes: Hero[];
  heroesById: Map<number, Hero>;
  draft: DraftState;
  setDraft: (next: DraftState | ((d: DraftState) => DraftState)) => void;
  pool: HeroPool;
  setPool: (next: HeroPool | ((p: HeroPool) => HeroPool)) => void;
  patchVersion?: string;
  live?: LiveState | null;
};

function pct(n: number | null): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export function DraftPage({ heroes, heroesById, draft, setDraft, pool, setPool, patchVersion, live }: Props) {
  const [mode, setMode] = useState<"pick" | "ban">("pick");
  const [target, setTarget] = useState<{ team: "radiant" | "dire"; index: number } | null>({
    team: draft.side,
    index: 0,
  });
  const [q, setQ] = useState("");
  const [attr, setAttr] = useState("all");
  const [suggestions, setSuggestions] = useState<DraftSuggestion[]>([]);
  const [busy, setBusy] = useState(false);

  const taken = useMemo(() => {
    const ids = new Set<number>();
    for (const id of [...draft.radiant, ...draft.dire, ...draft.bans]) {
      if (id) ids.add(id);
    }
    return ids;
  }, [draft]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return heroes.filter((h) => {
      if (query && !h.localizedName.toLowerCase().includes(query) && !h.shortName.includes(query)) {
        return false;
      }
      if (attr === "all") return true;
      if (attr === "all_attr") return h.primaryAttr === "all";
      return h.primaryAttr === attr;
    });
  }, [heroes, q, attr]);

  useEffect(() => {
    if (!heroes.length) return;
    const allied = draft.side === "radiant" ? draft.radiant : draft.dire;
    const enemy = draft.side === "radiant" ? draft.dire : draft.radiant;
    const t = setTimeout(() => {
      setBusy(true);
      void api
        .draftSuggest({
          allied: allied.filter((id): id is number => Boolean(id)),
          enemy: enemy.filter((id): id is number => Boolean(id)),
          banned: draft.bans,
          rank: draft.rank,
          role: draft.role ?? "any",
          pool: pool.ids,
          poolOnly: pool.suggestFromPool && pool.ids.length > 0,
        })
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
        .finally(() => setBusy(false));
    }, 200);
    return () => clearTimeout(t);
  }, [heroes.length, draft, pool.ids, pool.suggestFromPool]);

  function placeHero(id: number) {
    if (mode === "ban") {
      setDraft((d) => {
        if (d.bans.includes(id)) return { ...d, bans: d.bans.filter((x) => x !== id) };
        if (taken.has(id)) return d;
        return { ...d, bans: [...d.bans, id] };
      });
      return;
    }
    if (taken.has(id)) return;
    const team = target?.team ?? draft.side;
    const slots = team === "radiant" ? [...draft.radiant] : [...draft.dire];
    let index = target?.index ?? slots.findIndex((x) => x == null);
    if (index < 0) index = 0;
    slots[index] = id;
    setDraft((d) => ({ ...d, [team]: slots }));
    const nextEmpty = slots.findIndex((x, i) => i > index && x == null);
    setTarget({ team, index: nextEmpty >= 0 ? nextEmpty : index });
  }

  function clearSlot(team: "radiant" | "dire", index: number) {
    const slots = team === "radiant" ? [...draft.radiant] : [...draft.dire];
    slots[index] = null;
    setDraft((d) => ({ ...d, [team]: slots }));
    setTarget({ team, index });
  }

  const allied = draft.side === "radiant" ? draft.radiant : draft.dire;

  return (
    <div className="page">
      <PickPhaseBanner live={live ?? null} />
      <div className="row">
        <button
          className={draft.side === "radiant" ? "gold" : "ghost"}
          onClick={() => setDraft({ ...draft, side: "radiant" })}
        >
          I am Radiant
        </button>
        <button
          className={draft.side === "dire" ? "gold" : "ghost"}
          onClick={() => setDraft({ ...draft, side: "dire" })}
        >
          I am Dire
        </button>
        <button className={mode === "pick" ? "gold" : "ghost"} onClick={() => setMode("pick")}>
          Pick
        </button>
        <button className={mode === "ban" ? "gold" : "ghost"} onClick={() => setMode("ban")}>
          Ban
        </button>
        <select
          className="search"
          style={{ flex: "0 0 160px" }}
          value={draft.rank}
          onChange={(e) => setDraft({ ...draft, rank: e.target.value as RankBracket })}
        >
          {RANKS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          className="search"
          style={{ flex: "0 0 150px" }}
          value={draft.role ?? "any"}
          onChange={(e) => setDraft({ ...draft, role: e.target.value as PlayerRole })}
        >
          {ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <button className="ghost" onClick={() => setDraft({ ...emptyFrom(draft) })}>
          Clear board
        </button>
        <label className="pool-toggle">
          <input
            type="checkbox"
            checked={pool.suggestFromPool}
            onChange={(e) => setPool({ ...pool, suggestFromPool: e.target.checked })}
          />
          Suggest from my pool{pool.ids.length ? ` (${pool.ids.length})` : ""}
        </label>
      </div>

      <div className="teams">
        {(["radiant", "dire"] as const).map((team) => (
          <div key={team} className={`team ${team}`}>
            <h3>
              {team} {draft.side === team ? "(you · GSI auto)" : "(enemy · GSI if Valve sends it)"}
            </h3>
            <div className="slots">
              {(team === "radiant" ? draft.radiant : draft.dire).map((id, index) => {
                const hero = id ? heroesById.get(id) : null;
                const selected = target?.team === team && target.index === index;
                return (
                  <button
                    key={index}
                    className={`slot ${selected ? "selected" : ""}`}
                    onClick={() =>
                      hero ? clearSlot(team, index) : setTarget({ team, index })
                    }
                  >
                    {hero ? (
                      <>
                        <SafeImage className="portrait" src={hero.img} alt={hero.localizedName} />
                        <span className="name">{hero.localizedName}</span>
                      </>
                    ) : (
                      <span className="muted">Pick</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {draft.bans.length > 0 && (
        <div className="panel">
          <h3>Bans</h3>
          <div className="row">
            {draft.bans.map((id) => {
              const hero = heroesById.get(id);
              if (!hero) return null;
              return (
                <button key={id} className="ghost" onClick={() => placeHero(id)}>
                  {hero.localizedName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="layout">
        <div className="panel">
          <div className="row">
            <input
              className="search"
              placeholder="Search heroes"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="row filters">
              {ATTRS.map((a) => (
                <button
                  key={a.id}
                  className={attr === a.id ? "active ghost" : "ghost"}
                  onClick={() => setAttr(a.id)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid" style={{ marginTop: 12 }}>
            {filtered.map((hero) => {
              const used = taken.has(hero.id);
              const pinned = pool.ids.includes(hero.id);
              return (
                <button
                  key={hero.id}
                  className={`hero-card ${used ? "taken" : ""} ${draft.bans.includes(hero.id) ? "banned" : ""} ${pinned ? "in-pool" : ""}`}
                  onClick={() => placeHero(hero.id)}
                  disabled={used && mode === "pick"}
                >
                  <SafeImage src={hero.img} alt={hero.localizedName} />
                  <span className="name">{hero.localizedName}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="panel">
          <h3>{busy ? "Reading matchups…" : "Suggested picks"}</h3>
          <p className="muted">
            {pool.suggestFromPool && pool.ids.length === 0
              ? "Your pool is empty. Open the Pool tab and click the heroes you play."
              : pool.suggestFromPool && pool.ids.length > 0
                ? `Ranking ${pool.ids.length} pool heroes${draft.role && draft.role !== "any" ? ` as ${ROLES.find((r) => r.id === draft.role)?.label}` : ""} vs this lineup. ${patchVersion ?? "Patch"} buffs you play stay next to matchup counters.`
                : `Comparing ${draft.role && draft.role !== "any" ? `${ROLES.find((r) => r.id === draft.role)?.label.toLowerCase()} ` : ""}matchup counters with ${patchVersion ?? "this patch"} buffs and hot meta. Both can show.`}
          </p>
          {suggestions.map((s) => {
            const hero = heroesById.get(s.heroId);
            if (!hero) return null;
            const goodMatchup = (s.matchupWinrate ?? 0) >= 0.52;
            return (
              <button key={s.heroId} className="suggest-card" onClick={() => placeHero(s.heroId)}>
                <div className="suggest-head">
                  <SafeImage src={hero.img} alt={hero.localizedName} />
                  <div>
                    <strong className="name">{hero.localizedName}</strong>
                    <div className="suggest-pills">
                      {s.patch && <span className="pill patch">{s.patch.version} buff</span>}
                      {goodMatchup && <span className="pill matchup">good vs lineup</span>}
                      {s.metaRecommended && !s.patch && (
                        <span className="pill meta">hot this patch</span>
                      )}
                    </div>
                    <div className="meta">
                      {s.matchupWinrate != null && (
                        <span className="pct">vs lineup {pct(s.matchupWinrate)} · </span>
                      )}
                      meta {pct(s.metaWinrate)}
                      <div className="reason">{s.reasons.slice(0, 2).join(" · ")}</div>
                    </div>
                  </div>
                </div>
                {s.patch && <p className="note-line patch-note">{s.patch.note}</p>}
                {(s.details ?? []).map((d) => (
                  <div key={d.enemyId} className="matchup-note">
                    <div className="matchup-note-title">
                      vs {d.enemyName}
                      {d.winrate != null && <span className="pct"> {pct(d.winrate)}</span>}
                      <span className={`laning-tag ${d.laning}`}>{d.laning} lane</span>
                    </div>
                    <p className={`note-line ${d.laning}`}>{d.laningNote}</p>
                    {d.benefits.map((line) => (
                      <p key={line} className="note-line benefit">
                        {line}
                      </p>
                    ))}
                    {d.items.map((line) => (
                      <p key={line} className="note-line item-note">
                        {line}
                      </p>
                    ))}
                  </div>
                ))}
              </button>
            );
          })}
          {!busy && suggestions.length === 0 && (
            <p className="muted">
              {pool.suggestFromPool && pool.ids.length > 0
                ? "No pool heroes left for this role or lineup. Add more in Pool, switch role to Any, or uncheck Suggest from my pool."
                : "Fill enemy slots or pick a role to rank suggestions."}
            </p>
          )}
          {allied.filter(Boolean).length >= 5 && (
            <p className="muted">Your side is full. Clear a slot to keep drafting.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function emptyFrom(draft: DraftState): DraftState {
  return {
    ...draft,
    radiant: [null, null, null, null, null],
    dire: [null, null, null, null, null],
    bans: [],
  };
}
