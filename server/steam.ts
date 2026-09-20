import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { GSI_TOKEN, GSI_URI } from "./paths.ts";

const execFileAsync = promisify(execFile);

const CFG = `"DotaPlus Local"
{
\t"uri"\t\t"${GSI_URI}"
\t"timeout"\t"5.0"
\t"buffer"\t"0.1"
\t"throttle"\t"0.1"
\t"heartbeat"\t"30.0"
\t"data"
\t{
\t\t"provider"\t\t"1"
\t\t"map"\t\t\t"1"
\t\t"player"\t\t"1"
\t\t"hero"\t\t\t"1"
\t\t"abilities"\t\t"1"
\t\t"items"\t\t\t"1"
\t\t"draft"\t\t\t"1"
\t}
\t"auth"
\t{
\t\t"token"\t\t"${GSI_TOKEN}"
\t}
}
`;

const COMMON_STEAM = [
  "C:\\Program Files (x86)\\Steam",
  "C:\\Program Files\\Steam",
  "D:\\Steam",
  "D:\\SteamLibrary",
  "E:\\Steam",
  "E:\\SteamLibrary",
];

async function steamFromRegistry(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("reg", [
      "query",
      "HKCU\\Software\\Valve\\Steam",
      "/v",
      "SteamPath",
    ]);
    const match = stdout.match(/SteamPath\s+REG_SZ\s+(.+)/i);
    return match?.[1]?.trim().replace(/\//g, "\\") ?? null;
  } catch {
    return null;
  }
}

function parseLibraryFolders(steamRoot: string): string[] {
  const vdf = path.join(steamRoot, "steamapps", "libraryfolders.vdf");
  if (!fs.existsSync(vdf)) return [steamRoot];
  const text = fs.readFileSync(vdf, "utf8");
  const paths = [...text.matchAll(/"path"\s+"([^"]+)"/g)].map((m) =>
    m[1].replace(/\\\\/g, "\\"),
  );
  return [steamRoot, ...paths];
}

function dotaCfgDirs(steamLibrary: string): string[] {
  const common = path.join(steamLibrary, "steamapps", "common", "dota 2 beta");
  return [
    path.join(common, "game", "dota", "cfg", "gamestate_integration"),
    path.join(common, "dota", "cfg", "gamestate_integration"),
  ];
}

export async function installGsiConfig(): Promise<{
  ok: boolean;
  path?: string;
  searched: string[];
  message: string;
}> {
  const searched: string[] = [];
  const roots = new Set<string>();
  const fromReg = await steamFromRegistry();
  if (fromReg) roots.add(fromReg);
  for (const p of COMMON_STEAM) roots.add(p);

  const libraries: string[] = [];
  for (const root of roots) {
    searched.push(root);
    if (!fs.existsSync(root)) continue;
    for (const lib of parseLibraryFolders(root)) libraries.push(lib);
  }

  for (const lib of libraries) {
    for (const dir of dotaCfgDirs(lib)) {
      searched.push(dir);
      const dotaRoot = path.resolve(dir, "..", "..");
      if (!fs.existsSync(dotaRoot)) continue;
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, "gamestate_integration_dotaplus.cfg");
      fs.writeFileSync(file, CFG, "utf8");
      return {
        ok: true,
        path: file,
        searched,
        message:
          "GSI config installed. Add -gamestateintegration to Dota 2 launch options, then restart Dota.",
      };
    }
  }

  return {
    ok: false,
    searched,
    message:
      "Could not find a Dota 2 install. Install Steam/Dota, or copy the cfg manually into game/dota/cfg/gamestate_integration.",
  };
}

export function gsiConfigPreview(): string {
  return CFG;
}
