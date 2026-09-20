import { useMemo, useState } from "react";
import { api } from "../api";
import { SafeImage } from "../SafeImage";
import type { Ability, Hero, Item } from "../types";

type Props = {
  heroes: Hero[];
  items: Item[];
};

export function LibraryPage({ heroes, items }: Props) {
  const [tab, setTab] = useState<"heroes" | "items">("heroes");
  const [q, setQ] = useState("");
  const [hero, setHero] = useState<Hero | null>(null);
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [item, setItem] = useState<Item | null>(null);

  const heroList = useMemo(() => {
    const query = q.trim().toLowerCase();
    return heroes.filter(
      (h) =>
        !query ||
        h.localizedName.toLowerCase().includes(query) ||
        h.roles.join(" ").toLowerCase().includes(query),
    );
  }, [heroes, q]);

  const itemList = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter(
      (i) =>
        !query ||
        i.dname.toLowerCase().includes(query) ||
        i.key.includes(query.replace(/\s+/g, "_")),
    );
  }, [items, q]);

  async function openHero(h: Hero) {
    setItem(null);
    setHero(h);
    try {
      const detail = await api.heroDetail(h.id);
      setAbilities(detail.abilities);
    } catch {
      setAbilities([]);
    }
  }

  return (
    <div className="page">
      <div className="row">
        <button className={tab === "heroes" ? "gold" : "ghost"} onClick={() => setTab("heroes")}>
          Heroes ({heroes.length})
        </button>
        <button className={tab === "items" ? "gold" : "ghost"} onClick={() => setTab("items")}>
          Items ({items.length})
        </button>
        <input
          className="search"
          placeholder={tab === "heroes" ? "Search heroes" : "Search items"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {tab === "heroes" && (
        <div className={hero ? "library-detail" : ""}>
          <div className="grid">
            {heroList.map((h) => (
              <button
                key={h.id}
                className={`hero-card ${hero?.id === h.id ? "selected" : ""}`}
                onClick={() => void openHero(h)}
              >
                <SafeImage src={h.img} alt={h.localizedName} />
                <span className="name">{h.localizedName}</span>
              </button>
            ))}
          </div>
          {hero && (
            <aside className="panel">
              <SafeImage src={hero.img} alt={hero.localizedName} />
              <h3 style={{ marginTop: 10 }}>{hero.localizedName}</h3>
              <p className="muted">
                {hero.attackType} · {hero.primaryAttr} · {hero.roles.join(", ")}
              </p>
              {abilities.map((ab) => (
                <div key={ab.key} className="ability">
                  <SafeImage src={ab.img} alt={ab.dname} />
                  <div>
                    <strong>{ab.dname}</strong>
                    <div className="muted">{ab.desc}</div>
                  </div>
                </div>
              ))}
            </aside>
          )}
        </div>
      )}

      {tab === "items" && (
        <div className={item ? "library-detail" : ""}>
          <div className="item-grid">
            {itemList.map((it) => (
              <button
                key={it.key}
                className="item-card"
                onClick={() => {
                  setHero(null);
                  setItem(it);
                }}
              >
                <SafeImage className="item-icon" src={it.img} alt={it.dname} />
                <div className="body">
                  <strong>{it.dname}</strong>
                  <span className="muted">{it.cost ? `${it.cost} gold` : it.qual || "special"}</span>
                </div>
              </button>
            ))}
          </div>
          {item && (
            <aside className="panel">
              <SafeImage className="item-icon" src={item.img} alt={item.dname} />
              <h3>{item.dname}</h3>
              <p className="muted">{item.cost ? `${item.cost} gold` : "No gold cost"}</p>
              {item.hint && <p>{item.hint}</p>}
              {item.notes && <p className="muted">{item.notes}</p>}
              {item.lore && <p className="reason">{item.lore}</p>}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
