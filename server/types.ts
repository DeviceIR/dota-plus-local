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

export type HeroTag =
  | "magic"
  | "physical"
  | "stun"
  | "silence"
  | "invis"
  | "evasion"
  | "illusion"
  | "heal"
  | "passive";

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
  behavior: string | string[] | undefined;
  isInnate?: boolean;
  hidden?: boolean;
  appliesBreak?: boolean;
  breakDuration?: string;
};

export type Matchup = {
  hero_id: number;
  games_played: number;
  wins: number;
};

export type ItemPopularity = {
  start_game_items: Record<string, number>;
  early_game_items: Record<string, number>;
  mid_game_items: Record<string, number>;
  late_game_items: Record<string, number>;
};

export type ItemPhase = "start" | "early" | "mid" | "late";

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
  laningScore: number;
  reasons: string[];
  details: MatchupDetail[];
  patch: { version: string; note: string } | null;
  metaRecommended: boolean;
};

export type ItemSuggestion = {
  itemKey: string;
  phase: ItemPhase;
  score: number;
  popularity: number;
  reasons: string[];
  benefits: string[];
};

export type ItemBuildInfo = {
  id: string;
  name: string;
  summary: string;
  recommended: boolean;
  start: string[];
  early: string[];
  mid: string[];
  late: string[];
};

export type ItemSuggestResult = {
  builds: ItemBuildInfo[];
  selectedBuildId: string;
  items: ItemSuggestion[];
};

export type PickPhase = {
  isDraft: boolean;
  action: "pick" | "ban" | "strategy" | null;
  activeTeam: "radiant" | "dire" | null;
  timeRemaining: number | null;
  radiantBonus: number | null;
  direBonus: number | null;
  yourTurn: boolean;
};

export type LivePlayer = {
  name: string | null;
  team: "radiant" | "dire";
  heroId: number | null;
  shortName: string | null;
  level: number;
  items: string[];
  isYou: boolean;
};

export type LiveState = {
  connected: boolean;
  lastUpdate: number | null;
  clock: number | null;
  daytime: boolean | null;
  gameState: string | null;
  paused: boolean;
  steamName: string | null;
  matchId: string | null;
  playerTeam: "radiant" | "dire" | null;
  hero: { name: string; shortName: string; level: number; id?: number | null } | null;
  items: string[];
  players: LivePlayer[];
  draft: {
    radiant: (number | null)[];
    dire: (number | null)[];
    bans: number[];
  } | null;
  pickPhase: PickPhase | null;
};

export type StatusPayload = {
  synced: boolean;
  syncedAt: string | null;
  heroes: number;
  items: number;
  abilities: number;
  matchups: number;
  images: Record<string, number> | null;
  patchVersion?: string;
};
