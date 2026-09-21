import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, emptyDraft } from "./api";
import { buildClockCards, formatGameClock, interpolateClock, soonestCue } from "./gameClock";
import { isHeroSelect, mergeLiveDraft, resetTeams } from "./gsiDraft";
import { loadPool, savePool, type HeroPool } from "./heroPool";
import { PoolPage } from "./pages/Pool";
import { DraftPage } from "./pages/Draft";
import { ItemsPage } from "./pages/Items";
import { LibraryPage } from "./pages/Library";
import { LivePage } from "./pages/Live";
import type { DraftState, Hero, Item, LiveState, StatusPayload } from "./types";

const DRAFT_KEY = "dota-plus-draft";
type Tab = "draft" | "pool" | "items" | "library" | "live";

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
  const [pool, setPool] = useState<HeroPool>(loadPool);
  const [live, setLive] = useState<LiveState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const matchRef = useRef<string | null>(null);

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
    savePool(pool);
  }, [pool]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const state = await api.live();
        if (!alive) return;
        setLive(state);
        timer = setTimeout(tick, isHeroSelect(state) ? 400 : state.connected ? 1000 : 2500);
      } catch {
        if (alive) timer = setTimeout(tick, 2500);
      }
    };
    void tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!live?.connected) return;
    const matchChanged = Boolean(live.matchId && matchRef.current && live.matchId !== matchRef.current);
    if (live.matchId) matchRef.current = live.matchId;
    setDraft((d) => mergeLiveDraft(matchChanged ? resetTeams(d) : d, live));
  }, [live]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const liveClock = interpolateClock(
    live?.clock ?? null,
    live?.lastUpdate ?? null,
    Boolean(live?.paused),
    now,
  );
  const nextCue = live?.connected
    ? soonestCue(
        buildClockCards({
          clock: liveClock,
          daytime: live?.daytime ?? null,
          roshDeath: null,
          tormentorDeath: null,
        }).filter((c) => c.id !== "stack" && c.id !== "siege"),
      )
    : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>DotaPlus Local</strong>
          <span>second screen</span>
        </div>
        <nav className="nav">
          {(["draft", "pool", "items", "library", "live"] as Tab[]).map((id) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              {id === "pool" && pool.ids.length ? `pool (${pool.ids.length})` : id}
            </button>
          ))}
        </nav>
        <div className="live-pill">
          <span className={`dot ${live?.connected ? "on" : ""}`} />
          {live?.connected
            ? `${isHeroSelect(live) && live.pickPhase?.action ? live.pickPhase.action.toUpperCase() : "GSI"} ${formatGameClock(liveClock)}${nextCue?.dueIn != null && nextCue.dueIn > -5 ? ` · ${nextCue.name} ${nextCue.dueIn <= 8 ? "now" : `in ${formatGameClock(nextCue.dueIn)}`}` : ""}`
            : "GSI idle"}
          {status?.patchVersion ? ` · ${status.patchVersion}` : ""}
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
        <DraftPage
          heroes={heroes}
          heroesById={heroesById}
          draft={draft}
          setDraft={setDraft}
          pool={pool}
          setPool={setPool}
          patchVersion={status?.patchVersion}
          live={live}
        />
      )}
      {tab === "pool" && <PoolPage heroes={heroes} pool={pool} setPool={setPool} />}
      {tab === "items" && (
        <ItemsPage
          heroes={heroes}
          heroesById={heroesById}
          itemsByKey={itemsByKey}
          draft={draft}
          setDraft={setDraft}
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
