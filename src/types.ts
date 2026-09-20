export type RankBracket =
  | "all"
  | "herald"
  | "guardian"
  | "crusader"
  | "archon"
  | "legend"
  | "ancient"
  | "divine"
  | "immortal"
  | "divine_plus";

export type PlayerRole = "any" | "carry" | "mid" | "offlane" | "support";

export type Hero = {
  id: number;
  name: string;
  shortName: string;
  localizedName: string;
  primaryAttr: string;
  attackType: string;
  roles: string[];
  img: string;
  icon: string;
};

export type Item = {
  id: number;
  key: string;
  dname: string;
  cost: number;
  img: string;
  hint: string;
  notes: string;
  lore: string;
  components: string[] | null;
  cd: number | boolean;
  mc: number | boolean;
  qual: string;
};

export type Ability = {
  key: string;
  dname: string;
  desc: string;
  img: string;
  isInnate?: boolean;
  hidden?: boolean;
  appliesBreak?: boolean;
  breakDuration?: string;
};

export type MatchupLaning = "weak" | "even" | "strong";

export type MatchupDetail = {
  enemyId: number;
  enemyName: string;
  winrate: number | null;
  laning: MatchupLaning;
  laningNote: string;
  benefits: string[];
  items: string[];
};

export type DraftSuggestion = {
  heroId: number;
  score: number;
  matchupWinrate: number | null;
  metaWinrate: number;
  reasons: string[];
  details: MatchupDetail[];
};

export type ItemSuggestion = {
  itemKey: string;
  phase: "start" | "early" | "mid" | "late";
  score: number;
  popularity: number;
  reasons: string[];
  item: Item | null;
};

export type LiveState = {
  connected: boolean;
  lastUpdate: number | null;
  clock: number | null;
  gameState: string | null;
  paused: boolean;
  steamName: string | null;
  hero: { name: string; shortName: string; level: number } | null;
  items: string[];
  draft: {
    radiant: (number | null)[];
    dire: (number | null)[];
    bans: number[];
  } | null;
};

export type StatusPayload = {
  synced: boolean;
  syncedAt: string | null;
  heroes: number;
  items: number;
  abilities: number;
  matchups: number;
  images: Record<string, number> | null;
};

export type DraftState = {
  radiant: (number | null)[];
  dire: (number | null)[];
  bans: number[];
  side: "radiant" | "dire";
  rank: RankBracket;
  role: PlayerRole;
};
