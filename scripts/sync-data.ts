import fs from "node:fs/promises";
import path from "node:path";
import { ASSETS_DIR, CDN, DATA_DIR, OPENDOTA, heroShortName } from "../server/paths.ts";

const force = process.argv.includes("--force");
const DELAY_MS = 2000;

type Json = Record<string, unknown> | unknown[] | null;

const imageStats = { ok: 0, skip: 0, miss: 0 };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeJson(file: string, data: unknown) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function fetchOpenDota(pathname: string, attempt = 1): Promise<Json> {
  const url = `${OPENDOTA}${pathname}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "dota-plus-local/1.0 (personal companion)" },
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 6) throw new Error(`${pathname} failed after retries (${res.status})`);
    const wait = res.status === 429 ? 15000 * attempt : DELAY_MS * attempt * 2;
    console.log(`  retry ${pathname} in ${wait}ms (${res.status})`);
    await sleep(wait);
    return fetchOpenDota(pathname, attempt + 1);
  }
  if (!res.ok) throw new Error(`${pathname} -> ${res.status}`);
  return (await res.json()) as Json;
}

let lastCall = 0;
let queue: Promise<unknown> = Promise.resolve();

function openDota(pathname: string): Promise<Json> {
  const run = async () => {
    const wait = DELAY_MS - (Date.now() - lastCall);
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    return fetchOpenDota(pathname);
  };
  const next = queue.then(run, run);
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function downloadImage(url: string, dest: string) {
  if (!force) {
    try {
      const st = await fs.stat(dest);
      if (st.size > 200) {
        imageStats.skip += 1;
        return;
      }
    } catch {
      // missing
    }
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "dota-plus-local/1.0 (personal companion)" },
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.includes("image")) {
      imageStats.miss += 1;
      return;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) {
      imageStats.miss += 1;
      return;
    }
    await ensureDir(path.dirname(dest));
    await fs.writeFile(dest, buf);
    imageStats.ok += 1;
  } catch {
    imageStats.miss += 1;
  }
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

async function main() {
  await ensureDir(DATA_DIR);
  await ensureDir(path.join(ASSETS_DIR, "heroes"));
  await ensureDir(path.join(ASSETS_DIR, "icons"));
  await ensureDir(path.join(ASSETS_DIR, "items"));
  await ensureDir(path.join(ASSETS_DIR, "abilities"));

  console.log("Fetching OpenDota constants...");
  async function saveConstant(name: string, pathname: string) {
    const file = path.join(DATA_DIR, `${name}.json`);
    if (!force) {
      try {
        const existing = await fs.readFile(file, "utf8");
        if (existing.length > 50) {
          console.log(`  ${name}.json cached`);
          return JSON.parse(existing) as Json;
        }
      } catch {
        // fetch
      }
    }
    const data = await openDota(pathname);
    await writeJson(file, data);
    return data;
  }

  const heroes = (await saveConstant("heroes", "/constants/heroes")) as Record<
    string,
    { id: number; name: string }
  >;
  const items = (await saveConstant("items", "/constants/items")) as Record<
    string,
    { id?: number; dname?: string }
  >;
  await saveConstant("item_ids", "/constants/item_ids");
  const abilities = (await saveConstant("abilities", "/constants/abilities")) as Record<
    string,
    { dname?: string }
  >;
  let heroAbilities: Record<string, { abilities?: string[] }> = {};
  try {
    heroAbilities = (await saveConstant("hero_abilities", "/constants/hero_abilities")) as Record<
      string,
      { abilities?: string[] }
    >;
  } catch (err) {
    console.log("hero_abilities skipped:", (err as Error).message);
  }
  await saveConstant("heroStats", "/heroStats");
  const heroList = Object.values(heroes).filter((h) => h?.id && h?.name);
  console.log(`Heroes: ${heroList.length}`);

  const imageJobs: { url: string; dest: string }[] = [];
  for (const hero of heroList) {
    const short = heroShortName(hero.name);
    imageJobs.push({
      url: `${CDN}/heroes/${short}.png`,
      dest: path.join(ASSETS_DIR, "heroes", `${short}.png`),
    });
    imageJobs.push({
      url: `${CDN}/heroes/icons/${short}.png`,
      dest: path.join(ASSETS_DIR, "icons", `${short}.png`),
    });
  }
  for (const [key, item] of Object.entries(items)) {
    if (!item?.dname || key.startsWith("recipe_")) continue;
    imageJobs.push({
      url: `${CDN}/items/${key}.png`,
      dest: path.join(ASSETS_DIR, "items", `${key}.png`),
    });
  }
  const abilityKeys = new Set<string>();
  for (const pack of Object.values(heroAbilities)) {
    const list = Array.isArray(pack?.abilities) ? pack.abilities : [];
    for (const key of list) {
      const name = typeof key === "string" ? key : "";
      if (!name || name === "generic_hidden" || name.includes("special_bonus")) continue;
      abilityKeys.add(name);
    }
  }
  for (const key of abilityKeys) {
    imageJobs.push({
      url: `${CDN}/abilities/${key}.png`,
      dest: path.join(ASSETS_DIR, "abilities", `${key}.png`),
    });
  }

  console.log(`Downloading ${imageJobs.length} images from Steam CDN...`);
  let n = 0;
  await mapLimit(imageJobs, 10, async (job) => {
    await downloadImage(job.url, job.dest);
    n += 1;
    if (n % 25 === 0 || n === imageJobs.length) {
      process.stdout.write(
        `  images ${n}/${imageJobs.length} ok=${imageStats.ok} skip=${imageStats.skip} miss=${imageStats.miss}\r`,
      );
    }
  });
  console.log(
    `\nImages done. ok=${imageStats.ok} skip=${imageStats.skip} miss=${imageStats.miss}`,
  );

  const matchups = await readJson<Record<string, unknown>>(
    path.join(DATA_DIR, "matchups.json"),
    {},
  );
  const popularity = await readJson<Record<string, unknown>>(
    path.join(DATA_DIR, "itemPopularity.json"),
    {},
  );

  let done = 0;
  let dirty = 0;
  for (const hero of heroList) {
    done += 1;
    const key = String(hero.id);
    const needMatchups = force || !matchups[key];
    const needPop = force || !popularity[key];
    if (!needMatchups && !needPop) {
      process.stdout.write(`Stats ${done}/${heroList.length} ${hero.name} (cached)\r`);
      continue;
    }
    process.stdout.write(`Stats ${done}/${heroList.length} ${hero.name}          \r`);
    if (needMatchups) {
      try {
        matchups[key] = await openDota(`/heroes/${hero.id}/matchups`);
        dirty += 1;
      } catch (err) {
        console.log(`\n  matchups failed for ${hero.id}: ${(err as Error).message}`);
      }
    }
    if (needPop) {
      try {
        popularity[key] = await openDota(`/heroes/${hero.id}/itemPopularity`);
        dirty += 1;
      } catch (err) {
        console.log(`\n  itemPopularity failed for ${hero.id}: ${(err as Error).message}`);
      }
    }
    if (dirty >= 10) {
      await writeJson(path.join(DATA_DIR, "matchups.json"), matchups);
      await writeJson(path.join(DATA_DIR, "itemPopularity.json"), popularity);
      dirty = 0;
    }
  }
  await writeJson(path.join(DATA_DIR, "matchups.json"), matchups);
  await writeJson(path.join(DATA_DIR, "itemPopularity.json"), popularity);
  console.log("\nHero stats cached.");

  const manifest = {
    syncedAt: new Date().toISOString(),
    heroes: heroList.length,
    items: Object.values(items).filter((i) => i?.dname && true).length,
    abilities: Object.keys(abilities).length,
    matchups: Object.keys(matchups).length,
    images: { ...imageStats, attempted: imageJobs.length },
  };
  await writeJson(path.join(DATA_DIR, "manifest.json"), manifest);
  console.log("Sync complete.", manifest.syncedAt);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
