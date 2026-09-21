const KEY = "dota-plus-builds";

function readMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value) out[id] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function loadBuildId(heroId: number | null | undefined): string | undefined {
  if (!heroId) return undefined;
  return readMap()[String(heroId)];
}

export function saveBuildId(heroId: number, buildId: string) {
  const next = readMap();
  next[String(heroId)] = buildId;
  localStorage.setItem(KEY, JSON.stringify(next));
}
