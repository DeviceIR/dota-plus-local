export type HeroPool = {
  ids: number[];
  suggestFromPool: boolean;
};

const KEY = "dota-plus-hero-pool";

export function emptyPool(): HeroPool {
  return { ids: [], suggestFromPool: true };
}

export function loadPool(): HeroPool {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyPool();
    const parsed = JSON.parse(raw) as Partial<HeroPool>;
    const ids = Array.isArray(parsed.ids)
      ? [...new Set(parsed.ids.filter((id) => typeof id === "number" && id > 0))]
      : [];
    return {
      ids,
      suggestFromPool: parsed.suggestFromPool !== false,
    };
  } catch {
    return emptyPool();
  }
}

export function savePool(pool: HeroPool): void {
  localStorage.setItem(KEY, JSON.stringify(pool));
}

export function togglePoolHero(pool: HeroPool, heroId: number): HeroPool {
  const has = pool.ids.includes(heroId);
  return {
    ...pool,
    ids: has ? pool.ids.filter((id) => id !== heroId) : [...pool.ids, heroId],
  };
}
