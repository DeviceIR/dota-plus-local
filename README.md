# DotaPlus Local

Personal second-screen companion for Dota 2 pick phase and item suggestions. It downloads heroes, items, abilities, and images to this machine and serves a local dashboard. It does **not** inject into Dota, read game memory, or click/buy for you.

## Run

```bash
npm install
npm run sync
npm run dev
```

Then open [http://localhost:3003](http://localhost:3003). Keep it on a second monitor (or Alt-Tab). Put Dota in borderless windowed if you want both visible.

`npm run sync` talks to OpenDota (throttled) and the Steam CDN. First run takes several minutes. Later runs skip files you already have. Use `npm run sync -- --force` to refresh everything.

## Live GSI (optional)

1. Open the **Live** tab and click **Install GSI config**, or copy `gamestate_integration_dotaplus.cfg` into  
   `steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/`
2. In Steam: Dota 2 → Properties → Launch Options → add `-gamestateintegration`
3. Restart Dota 2

The game POSTs JSON to `http://127.0.0.1:5174/gsi` (localhost only). Ranked drafts often omit enemy picks; use the Draft tab manually when that happens.

## Safety

Valve Game State Integration is an official, read-only feed. This app never overlays inside the Dota process. No warranty that Valve policy stays the same forever — stay informational only.
