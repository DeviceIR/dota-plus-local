import { useMemo, useState } from "react";
import { SafeImage } from "../SafeImage";
import { togglePoolHero, type HeroPool } from "../heroPool";
import type { Hero } from "../types";

const GROUPS: { attr: string; label: string; cls: string }[] = [
  { attr: "str", label: "Strength", cls: "str" },
  { attr: "agi", label: "Agility", cls: "agi" },
  { attr: "int", label: "Intelligence", cls: "int" },
  { attr: "all", label: "Universal", cls: "uni" },
];

type Props = {
  heroes: Hero[];
  pool: HeroPool;
  setPool: (next: HeroPool | ((p: HeroPool) => HeroPool)) => void;
};

export function PoolPage({ heroes, pool, setPool }: Props) {
  const [q, setQ] = useState("");
  const selected = useMemo(() => new Set(pool.ids), [pool.ids]);
  const heroesById = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const grouped = useMemo(() => {
    const query = q.trim().toLowerCase();
    const map = new Map<string, Hero[]>();
    for (const group of GROUPS) map.set(group.attr, []);
    for (const hero of heroes) {
      if (
        query &&
        !hero.localizedName.toLowerCase().includes(query) &&
        !hero.shortName.includes(query)
      ) {
        continue;
      }
      const list = map.get(hero.primaryAttr) ?? map.get("all");
      if (list) list.push(hero);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.id - b.id);
    }
    return map;
  }, [heroes, q]);

  function toggle(id: number) {
    setPool((p) => togglePoolHero(p, id));
  }

  const pinned = pool.ids.map((id) => heroesById.get(id)).filter(Boolean) as Hero[];

  return (
    <div className="page pool-page">
      <div className="row">
        <input
          className="search"
          placeholder="Search heroes"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="muted">{pool.ids.length} in pool</span>
        <button className="ghost" onClick={() => setPool((p) => ({ ...p, ids: [] }))}>
          Clear pool
        </button>
      </div>

      <div className="panel pool-mine">
        <h3>Your pool</h3>
        {pinned.length === 0 ? (
          <p className="muted">
            Click the portraits below — Strength, Agility, Intelligence, Universal, same as the Dota
            pick screen. Draft will only suggest from these when “Suggest from my pool” is on.
          </p>
        ) : (
          <div className="pool-row pool-mine-row">
            {pinned.map((hero) => (
              <button
                key={hero.id}
                className="hero-card pool-card in-pool"
                onClick={() => toggle(hero.id)}
                title={`Remove ${hero.localizedName}`}
              >
                <SafeImage src={hero.img} alt={hero.localizedName} />
                <span className="name">{hero.localizedName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {GROUPS.map((group) => {
        const list = grouped.get(group.attr) ?? [];
        if (list.length === 0) return null;
        return (
          <div key={group.attr} className={`pool-group attr-${group.cls}`}>
            <div className="pool-attr">{group.label}</div>
            <div className="pool-row">
              {list.map((hero) => {
                const on = selected.has(hero.id);
                return (
                  <button
                    key={hero.id}
                    className={`hero-card pool-card ${on ? "in-pool" : ""}`}
                    onClick={() => toggle(hero.id)}
                    title={on ? `Remove ${hero.localizedName}` : `Add ${hero.localizedName}`}
                  >
                    <SafeImage src={hero.img} alt={hero.localizedName} />
                    <span className="name">{hero.localizedName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
