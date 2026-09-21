import type { Item, ItemBuildInfo } from "./types";
import { SafeImage } from "./SafeImage";

export function BuildPicker({
  builds,
  selectedId,
  itemsByKey,
  onPick,
}: {
  builds: ItemBuildInfo[];
  selectedId: string;
  itemsByKey: Map<string, Item>;
  onPick: (id: string) => void;
}) {
  if (builds.length === 0) return null;
  return (
    <div className="build-board">
      {builds.map((build) => {
        const preview = uniqueKeys([...build.start, ...build.early]).slice(0, 6);
        return (
          <button
            key={build.id}
            className={`build-card ${build.id === selectedId ? "selected" : ""}`}
            onClick={() => onPick(build.id)}
          >
            <div className="build-card-head">
              <strong>{build.name}</strong>
              {build.recommended && <span className="pill matchup">vs this lineup</span>}
              {build.id === selectedId && <span className="pill patch">selected</span>}
            </div>
            <p className="muted">{build.summary}</p>
            <div className="build-preview">
              {preview.map((key) => {
                const item = itemsByKey.get(key);
                if (!item) return null;
                return <SafeImage key={key} className="item-icon" src={item.img} alt={item.dname} />;
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function uniqueKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
