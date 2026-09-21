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
  const [bucketId, setBucketId] = useState<"hot" | "laning" | "overall">("hot");
  const [whyId, setWhyId] = useState<number | null>(null);

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
  const buckets = useMemo(() => splitSuggestions(suggestions), [suggestions]);
  const activeBucket = buckets.find((b) => b.id === bucketId) ?? buckets[0];
  const why = suggestions.find((s) => s.heroId === whyId) ?? null;
  const whyHero = why ? heroesById.get(why.heroId) : null;

  return (
    <div className="page draft-page">
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
        <div className="panel layout-pane">
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
          <div className="grid pane-scroll">
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

        <aside className="panel suggest-panel layout-pane">
          <h3>{busy ? "Reading matchups…" : "Suggested picks"}</h3>
          <p className="muted suggest-col-copy">
            {pool.suggestFromPool && pool.ids.length === 0
              ? "Your pool is empty. Open the Pool tab and click the heroes you play."
              : pool.suggestFromPool && pool.ids.length > 0
                ? `Ranking ${pool.ids.length} pool heroes${draft.role && draft.role !== "any" ? ` as ${ROLES.find((r) => r.id === draft.role)?.label}` : ""} vs this lineup.`
                : `Click a name to see why vs this lineup. ${patchVersion ?? "This patch"} buffs stay in Hot. Grid stays one-click.`}
          </p>
          <div className="row filters suggest-tabs">
            {buckets.map((col) => (
              <button
                key={col.id}
                className={bucketId === col.id ? "active ghost" : "ghost"}
                onClick={() => setBucketId(col.id)}
              >
                {col.title}
                <span className="muted"> {col.rows.length}</span>
              </button>
            ))}
          </div>
          <p className="muted suggest-col-copy">{activeBucket.blurb}</p>

          {why && whyHero && (
            <div className="why-strip">
              <div className="why-strip-head">
                <SafeImage src={whyHero.img} alt={whyHero.localizedName} />
                <div>
                  <strong>{whyHero.localizedName}</strong>
                  <div className="muted">{why.reasons.slice(0, 2).join(" · ")}</div>
                </div>
                <button
                  className="gold"
                  onClick={() => placeHero(why.heroId)}
                  disabled={mode === "pick" && taken.has(why.heroId)}
                >
                  {mode === "ban" ? "Ban" : "Pick"}
                </button>
              </div>
              {why.patch && <p className="note-line patch-note">{why.patch.note}</p>}
              {(why.details ?? []).slice(0, 4).map((d) => (
                <div key={d.enemyId} className="matchup-note">
                  <div className="matchup-note-title">
                    vs {d.enemyName}
                    {d.winrate != null && <span className="pct"> {pct(d.winrate)}</span>}
                    <span className={`laning-tag ${d.laning}`}>{d.laning} lane</span>
                  </div>
                  <p className={`note-line ${d.laning}`}>{d.laningNote}</p>
                  {d.benefits.slice(0, 2).map((line) => (
                    <p key={line} className="note-line benefit">
                      {line}
                    </p>
                  ))}
                </div>
              ))}
              {(why.details ?? []).length === 0 && (
                <p className="muted">Fill enemy slots to see lane notes vs this pick.</p>
              )}
            </div>
          )}

          <div className="suggest-list pane-scroll">
            {activeBucket.rows.map((s) => {
              const hero = heroesById.get(s.heroId);
              if (!hero) return null;
              return (
                <SuggestMini
                  key={`${activeBucket.id}-${s.heroId}`}
                  suggestion={s}
                  hero={hero}
                  selected={whyId === s.heroId}
                  onSelect={() => setWhyId(s.heroId)}
                  onPick={() => placeHero(s.heroId)}
                />
              );
            })}
            {activeBucket.rows.length === 0 && !busy && (
              <p className="muted">Nothing in this bucket yet. Fill enemy slots or pick a role.</p>
            )}
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
          </div>
        </aside>
      </div>
    </div>
  );
}

function takeUnique(rows: DraftSuggestion[], limit: number): DraftSuggestion[] {
  const seen = new Set<number>();
  const out: DraftSuggestion[] = [];
  for (const row of rows) {
    if (seen.has(row.heroId)) continue;
    seen.add(row.heroId);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

function splitSuggestions(rows: DraftSuggestion[]): {
  id: "hot" | "laning" | "overall";
  title: string;
  blurb: string;
  rows: DraftSuggestion[];
}[] {
  const hot = takeUnique(
    [...rows].sort((a, b) => {
      const ap = a.patch ? 1 : 0;
      const bp = b.patch ? 1 : 0;
      if (ap !== bp) return bp - ap;
      const am = a.metaRecommended ? 1 : 0;
      const bm = b.metaRecommended ? 1 : 0;
      if (am !== bm) return bm - am;
      return b.metaWinrate - a.metaWinrate || b.score - a.score;
    }).filter((r) => r.patch || r.metaRecommended || r.metaWinrate >= 0.52),
    12,
  );
  const laning = takeUnique(
    [...rows]
      .filter((r) => r.laningScore >= 0.15 || (r.matchupWinrate ?? 0) >= 0.52)
      .sort((a, b) => b.laningScore - a.laningScore || (b.matchupWinrate ?? 0) - (a.matchupWinrate ?? 0)),
    12,
  );
  const overall = takeUnique(
    [...rows].sort((a, b) => b.score - a.score),
    12,
  );
  return [
    {
      id: "hot",
      title: "Hot this patch",
      blurb: "Buffed and high-pick meta for this rank.",
      rows: hot.length ? hot : overall.slice(0, 8),
    },
    {
      id: "laning",
      title: "Good laning",
      blurb: "Lane notes vs the heroes already picked.",
      rows: laning.length ? laning : overall.slice(0, 8),
    },
    {
      id: "overall",
      title: "Good overall",
      blurb: "Matchup + meta + role fit together.",
      rows: overall,
    },
  ];
}

function SuggestMini({
  suggestion,
  hero,
  selected,
  onSelect,
  onPick,
}: {
  suggestion: DraftSuggestion;
  hero: Hero;
  selected: boolean;
  onSelect: () => void;
  onPick: () => void;
}) {
  const goodMatchup = (suggestion.matchupWinrate ?? 0) >= 0.52;
  return (
    <button
      className={`suggest-mini ${selected ? "selected" : ""}`}
      onClick={onSelect}
      onDoubleClick={onPick}
    >
      <SafeImage src={hero.img} alt={hero.localizedName} />
      <div>
        <strong className="name">{hero.localizedName}</strong>
        <div className="suggest-pills">
          {suggestion.patch && <span className="pill patch">{suggestion.patch.version} buff</span>}
          {goodMatchup && <span className="pill matchup">good vs lineup</span>}
          {suggestion.metaRecommended && !suggestion.patch && <span className="pill meta">hot</span>}
          {suggestion.laningScore >= 0.2 && <span className="pill matchup">lane</span>}
        </div>
        <div className="meta">
          {suggestion.matchupWinrate != null && (
            <span className="pct">vs {pct(suggestion.matchupWinrate)} · </span>
          )}
          meta {pct(suggestion.metaWinrate)}
        </div>
      </div>
    </button>
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
