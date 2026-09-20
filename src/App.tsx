import { useCallback, useEffect, useMemo, useState } from "react";
import { api, emptyDraft } from "./api";
import { DraftPage } from "./pages/Draft";
import { ItemsPage } from "./pages/Items";
import { LibraryPage } from "./pages/Library";
import { LivePage } from "./pages/Live";
import type { DraftState, Hero, Item, LiveState, StatusPayload } from "./types";

const DRAFT_KEY = "dota-plus-draft";
type Tab = "draft" | "items" | "library" | "live";

function loadDraft(): DraftState {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyDraft();
    return { ...emptyDraft(), ...JSON.parse(raw) };
  } catch {
    return emptyDraft();
  }
}

export function App() {
  const [tab, setTab] = useState<Tab>("draft");
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(loadDraft);
  const [live, setLive] = useState<LiveState | null>(null);

  const heroesById = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);
  const itemsByKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);

  const refreshStatus = useCallback(async () => {
    try {
      const next = await api.status();
      setStatus(next);
      if (next.synced) {
        const [h, i] = await Promise.all([api.heroes(), api.items()]);
        setHeroes(h);
        setItems(i);
        setError(null);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    const id = setInterval(() => {
      if (heroes.length === 0) void refreshStatus();
    }, 2500);
    return () => clearInterval(id);
  }, [refreshStatus, heroes.length]);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const state = await api.live();
        if (alive) setLive(state);
      } catch {
        /* server may still be booting */
      }
    };
    void tick();
    const id = setInterval(tick, 2500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>DotaPlus Local</strong>
          <span>second screen</span>
        </div>
        <nav className="nav">
          {(["draft", "items", "library", "live"] as Tab[]).map((id) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              {id}
            </button>
          ))}
        </nav>
        <div className="live-pill">
          <span className={`dot ${live?.connected ? "on" : ""}`} />
          {live?.connected ? "GSI connected" : "GSI idle"}
        </div>
      </header>

      {status && !status.synced && (
        <div className="banner">
          Game data is not synced yet. In this folder run <code>npm run sync</code> (several
          minutes), then refresh. That downloads heroes, items, abilities, and images for offline
          use.
        </div>
      )}
      {error && <div className="banner">{error}</div>}

      {tab === "draft" && (
        <DraftPage heroes={heroes} heroesById={heroesById} draft={draft} setDraft={setDraft} />
      )}
      {tab === "items" && (
        <ItemsPage
          heroes={heroes}
          heroesById={heroesById}
          itemsByKey={itemsByKey}
          draft={draft}
          live={live}
        />
      )}
      {tab === "library" && <LibraryPage heroes={heroes} items={items} />}
      {tab === "live" && (
        <LivePage
          live={live}
          heroes={heroes}
          heroesById={heroesById}
          itemsByKey={itemsByKey}
          draft={draft}
          setDraft={setDraft}
          onRefreshStatus={refreshStatus}
        />
      )}
    </div>
  );
}
