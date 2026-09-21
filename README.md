# DotaPlus Local

Personal second-screen companion for Dota 2 pick phase and item suggestions. It downloads heroes, items, abilities, and images to this machine and serves a local dashboard. It does **not** inject into Dota, read game memory, or click/buy for you.

## Run

```bash
npm install
npm run sync
npm run dev
```

Then open [http://localhost:3003](http://localhost:3003). Keep it on a second monitor (or Alt-Tab). Put Dota in borderless windowed if you want both visible.

Desktop window (same localhost GSI, not an overlay):

```bash
npm run app
```

## Share a Windows .exe with friends

```bash
npm run pack:win
```

Installers land in `release/`:

- `DotaPlus Local-1.6.0-win-x64.exe` — setup (NSIS)
- `DotaPlus Local-1.6.0-portable.exe` — no install, double-click

Send one of those files. Friends do **not** need Node. Windows may SmartScreen-warn because the build is unsigned; that is expected.

Each friend should:

1. Run the app (second monitor, not over Dota)
2. Open **Live** → **Install GSI config**
3. Steam → Dota 2 → Launch Options → add `-gamestateintegration`
4. Restart Dota, then join a bot/demo match to test

GSI still only talks to `127.0.0.1` on that PC.

`npm run sync` talks to OpenDota (throttled) and the Steam CDN. First run takes several minutes. Later runs skip files you already have. Use `npm run sync -- --force` to refresh everything.

## Live GSI (optional)

1. Open the **Live** tab and click **Install GSI config**, or copy `gamestate_integration_dotaplus.cfg` into  
   `steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/`
2. In Steam: Dota 2 → Properties → Launch Options → add `-gamestateintegration`
3. Restart Dota 2

The game POSTs JSON to `http://127.0.0.1:5174/gsi` (localhost only). Ranked drafts often omit enemy picks; use the Draft tab manually when that happens.

Draft is a two-column board (heroes | suggestions) with Hot / laning / overall tabs. Item pages offer 2–3 playstyle builds from the laning stage (Shadow Fiend Magical vs Right-click, and the same idea on other heroes). Live can fire **Windows notifications** for runes/objectives and the next buy — never pick/ban, and never an in-game overlay. Put Dota in borderless windowed so Action Center toasts can show.

## Safety

Valve Game State Integration is an official, read-only feed. This app never overlays inside the Dota process. No warranty that Valve policy stays the same forever — stay informational only.
