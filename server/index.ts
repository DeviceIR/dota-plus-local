import express from "express";
import cors from "cors";
import { ASSETS_DIR, GSI_TOKEN, PORT } from "./paths.ts";
import { loadCatalog, requireCatalog } from "./catalog.ts";
import { suggestDraft, suggestItems } from "./suggest.ts";
import { getLiveState, ingestGsi, type GsiPayload } from "./gsi.ts";
import { gsiConfigPreview, installGsiConfig } from "./steam.ts";
import type { ItemPhase, PlayerRole, RankBracket } from "./types.ts";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "4mb" }));
app.use("/assets", express.static(ASSETS_DIR));

function asyncHandler(
  fn: (req: express.Request, res: express.Response) => Promise<void> | void,
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

app.get("/api/status", (_req, res) => {
  const catalog = loadCatalog();
  if (!catalog) {
    res.json({
      synced: false,
      syncedAt: null,
      heroes: 0,
      items: 0,
      abilities: 0,
      matchups: 0,
      images: null,
    });
    return;
  }
  res.json(catalog.status);
});

app.get(
  "/api/heroes",
  asyncHandler((_req, res) => {
    res.json(requireCatalog().heroes);
  }),
);

app.get(
  "/api/items",
  asyncHandler((_req, res) => {
    res.json(requireCatalog().items);
  }),
);

app.get(
  "/api/heroes/:id",
  asyncHandler((req, res) => {
    const catalog = requireCatalog();
    const hero = catalog.heroesById.get(Number(req.params.id));
    if (!hero) {
      res.status(404).json({ error: "Hero not found" });
      return;
    }
    const pack = catalog.heroAbilities[hero.name] ?? catalog.heroAbilities[hero.shortName] ?? {};
    const abilityKeys = (pack.abilities ?? []).filter(
      (key) => !key.includes("special_bonus") && key !== "generic_hidden",
    );
    const abilities = abilityKeys
      .map((key) => catalog.abilities[key])
      .filter(Boolean);
    res.json({ hero, abilities });
  }),
);

app.post(
  "/api/draft/suggest",
  asyncHandler((req, res) => {
    const catalog = requireCatalog();
    const allied = (req.body?.allied ?? []) as number[];
    const enemy = (req.body?.enemy ?? []) as number[];
    const banned = (req.body?.banned ?? []) as number[];
    const rank = (req.body?.rank ?? "divine_plus") as RankBracket;
    const role = (req.body?.role ?? "any") as PlayerRole;
    res.json(suggestDraft(catalog, { allied, enemy, banned, rank, role }));
  }),
);

app.post(
  "/api/items/suggest",
  asyncHandler((req, res) => {
    const catalog = requireCatalog();
    const heroId = Number(req.body?.heroId);
    if (!heroId) {
      res.status(400).json({ error: "heroId required" });
      return;
    }
    const enemy = (req.body?.enemy ?? []) as number[];
    const ownedItems = (req.body?.ownedItems ?? []) as string[];
    const phase = (req.body?.phase ?? "all") as ItemPhase | "all";
    const suggestions = suggestItems(catalog, { heroId, enemy, ownedItems, phase });
    const withItems = suggestions.map((row) => ({
      ...row,
      item: catalog.itemsByKey.get(row.itemKey) ?? null,
    }));
    res.json(withItems);
  }),
);

app.get("/api/live", (_req, res) => {
  res.json(getLiveState());
});

app.get("/api/gsi/preview", (_req, res) => {
  res.type("text/plain").send(gsiConfigPreview());
});

app.post(
  "/api/gsi/install",
  asyncHandler(async (_req, res) => {
    const result = await installGsiConfig();
    res.status(result.ok ? 200 : 404).json(result);
  }),
);

app.post("/gsi", (req, res) => {
  const body = (req.body ?? {}) as GsiPayload;
  if (body.auth?.token && body.auth.token !== GSI_TOKEN) {
    res.status(401).json({ ok: false });
    return;
  }
  ingestGsi(body);
  res.json({ ok: true });
});

app.use(
  (
    err: Error & { status?: number },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const status = err.status ?? 500;
    res.status(status).json({ error: err.message });
  },
);

app.listen(PORT, "127.0.0.1", () => {
  console.log(`DotaPlus Local API http://127.0.0.1:${PORT}`);
  loadCatalog();
});
