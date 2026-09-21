import type { Catalog } from "./catalog.ts";
import {
  allBuildKeys,
  buildsForHero,
  exclusiveKeys,
  keysForBuild,
  recommendBuildId,
  resolveBuildId,
  SHARED_BUILD_ITEMS,
  type HeroBuild,
} from "./heroBuilds.ts";
import { SITUATIONAL_ITEMS, tagsForShortName } from "./tags.ts";
import type {
  Hero,
  HeroTag,
  Item,
  ItemBuildInfo,
  ItemPhase,
  ItemSuggestion,
  ItemSuggestResult,
  PlayerRole,
} from "./types.ts";

type PopKey = keyof import("./types.ts").ItemPopularity;

const PHASES: { key: PopKey; phase: ItemPhase }[] = [
  { key: "start_game_items", phase: "start" },
  { key: "early_game_items", phase: "early" },
  { key: "mid_game_items", phase: "mid" },
  { key: "late_game_items", phase: "late" },
];

const CONSUMABLES = new Set([
  "tango",
  "tango_single",
  "flask",
  "clarity",
  "enchanted_mango",
  "blood_grenade",
  "dust",
  "ward_observer",
  "ward_sentry",
  "smoke_of_deceit",
  "infused_raindrop",
  "bottle",
  "gem",
  "faerie_fire",
]);

const START_ALLOW = new Set([
  "boots",
  "magic_stick",
  "magic_wand",
  "bracer",
  "wraith_band",
  "null_talisman",
  "quelling_blade",
  "bottle",
  "soul_ring",
  "orb_of_corrosion",
  "falcon_blade",
  "infused_raindrop",
  "mango",
  "enchanted_mango",
  "tango",
  "branches",
  "circlet",
  "blood_grenade",
  "blight_stone",
  "wind_lace",
  "cloak",
  "headdress",
  "ring_of_basilius",
  "buckler",
  "ghost",
  "blink",
  "gem",
  "dust",
  "aghanims_shard",
  "shadow_amulet",
]);

const ALWAYS_SKIP = new Set([
  "tpscroll",
  "aegis",
  "cheese",
  "refresher_shard",
  "rapier",
  "aghanims_shard_roshan",
  "tome_of_knowledge",
  "tome_of_aghanim",
  "pocket_roshan",
  "tango_single",
  "flask",
]);

const DETECTION = new Set(["dust", "gem", "ward_sentry"]);
const SUPPORT_ONLY = new Set([
  "ward_observer",
  "ward_sentry",
  "smoke_of_deceit",
  "mekansm",
  "holy_locket",
  "pavise",
]);

const ROLE_CORE: Record<PlayerRole, string[]> = {
  any: [],
  carry: [
    "power_treads",
    "phase_boots",
    "bfury",
    "mask_of_madness",
    "maelstrom",
    "black_king_bar",
    "manta",
    "satanic",
    "skadi",
    "butterfly",
    "abyssal_blade",
    "monkey_king_bar",
    "greater_crit",
    "desolator",
    "sange_and_yasha",
    "basher",
    "silver_edge",
    "nullifier",
    "assault",
    "moon_shard",
    "diffusal_blade",
    "disperser",
    "bloodthorn",
  ],
  mid: [
    "bottle",
    "null_talisman",
    "bracer",
    "power_treads",
    "travel_boots",
    "blink",
    "black_king_bar",
    "ultimate_scepter",
    "sheepstick",
    "shivas_guard",
    "kaya_and_sange",
    "orchid",
    "bloodthorn",
    "sphere",
    "refresher",
    "octarine_core",
    "ethereal_blade",
    "dagon_5",
    "wind_waker",
    "phylactery",
    "angels_demise",
    "mage_slayer",
  ],
  offlane: [
    "phase_boots",
    "arcane_boots",
    "vanguard",
    "blink",
    "blade_mail",
    "crimson_guard",
    "pipe",
    "lotus_orb",
    "black_king_bar",
    "assault",
    "shivas_guard",
    "heavens_halberd",
    "heart",
    "ultimate_scepter",
    "overwhelming_blink",
    "aeon_disk",
    "crimson_guard",
    "mage_slayer",
    "eternal_shroud",
  ],
  support: [
    "arcane_boots",
    "tranquil_boots",
    "magic_wand",
    "force_staff",
    "glimmer_cape",
    "aether_lens",
    "solar_crest",
    "pavise",
    "mekansm",
    "guardian_greaves",
    "pipe",
    "lotus_orb",
    "ghost",
    "cyclone",
    "wind_waker",
    "ultimate_scepter",
    "aghanims_shard",
    "holy_locket",
    "urn_of_shadows",
    "spirit_vessel",
    "boots_of_bearing",
    "dust",
    "ward_sentry",
    "smoke_of_deceit",
    "aeon_disk",
    "force_staff",
  ],
};

const ANTI_ROLE: Record<PlayerRole, string[]> = {
  any: [],
  carry: ["mekansm", "holy_locket", "pavise", "glimmer_cape", "guardian_greaves"],
  mid: ["vanguard", "crimson_guard", "mekansm", "bfury"],
  offlane: ["bottle", "greater_crit", "satanic", "mask_of_madness"],
  support: [
    "bfury",
    "satanic",
    "greater_crit",
    "moon_shard",
    "mask_of_madness",
    "desolator",
    "abyssal_blade",
    "daedalus",
  ],
};

const EXCLUSIVE_FAMILIES: string[][] = [
  [
    "boots",
    "phase_boots",
    "power_treads",
    "arcane_boots",
    "tranquil_boots",
    "travel_boots",
    "travel_boots_2",
    "guardian_greaves",
    "boots_of_bearing",
  ],
  ["blink", "overwhelming_blink", "swift_blink", "arcane_blink"],
  ["magic_stick", "magic_wand", "holy_locket"],
  ["vanguard", "crimson_guard"],
  ["mekansm", "guardian_greaves"],
  ["force_staff", "hurricane_pike"],
  ["orchid", "bloodthorn"],
  ["basher", "abyssal_blade"],
  ["maelstrom", "mjollnir"],
  ["urn_of_shadows", "spirit_vessel"],
  ["cyclone", "wind_waker"],
  ["diffusal_blade", "disperser"],
  ["phylactery", "angels_demise"],
  ["echo_sabre", "harpoon"],
  ["lesser_crit", "greater_crit"],
  ["invis_sword", "silver_edge"],
  ["travel_boots", "travel_boots_2"],
  ["ultimate_scepter", "ultimate_scepter_2"],
  ["pavise", "solar_crest"],
  ["dagon", "dagon_2", "dagon_3", "dagon_4", "dagon_5"],
  ["helm_of_the_dominator", "helm_of_the_overlord"],
];

const MID_SHORT = new Set([
  "nevermore",
  "storm_spirit",
  "puck",
  "queenofpain",
  "leshrac",
  "tinker",
  "zuus",
  "lina",
  "invoker",
  "viper",
  "death_prophet",
  "ember_spirit",
  "void_spirit",
  "obsidian_destroyer",
  "pugna",
  "batrider",
  "templar_assassin",
  "meepo",
  "arc_warden",
  "tiny",
  "sniper",
  "huskar",
  "alchemist",
  "keeper_of_the_light",
  "razor",
  "necrolyte",
  "muerta",
  "kez",
]);

type Answer = { item: string; benefit: (name: string) => string };

const ENEMY_ANSWERS: Record<string, Answer[]> = {
  phantom_assassin: [
    { item: "monkey_king_bar", benefit: (n) => `True strike so ${n}'s evasion does not waste hits` },
    { item: "ghost", benefit: (n) => `Ghost so ${n} cannot right-click you during the jump` },
    { item: "heavens_halberd", benefit: (n) => `Disarm ${n} before she lands a crit` },
  ],
  bristleback: [
    {
      item: "silver_edge",
      benefit: (n) => `Break Bristleback / Warpath so ${n} stops reducing and stacking`,
    },
    { item: "spirit_vessel", benefit: (n) => `Cut ${n}'s regen in the long fight` },
    { item: "shivas_guard", benefit: (n) => `AoE slow and regen reduction vs ${n}` },
    { item: "desolator", benefit: (n) => `Armor shred so ${n} actually takes right-click damage` },
  ],
  huskar: [
    { item: "spirit_vessel", benefit: (n) => `Anti-heal vs ${n}'s Berserker's Blood regen` },
    { item: "heavens_halberd", benefit: (n) => `Disarm ${n} while he is still a right-click threat` },
    { item: "ethereal_blade", benefit: (n) => `Ethereal so ${n} cannot hit you` },
  ],
  antimage: [
    { item: "sheepstick", benefit: (n) => `Hard lock ${n} before he blinks out` },
    { item: "basher", benefit: (n) => `Bash interrupt vs ${n}'s blink` },
    { item: "nullifier", benefit: (n) => `Mute ${n}'s defensive spells after the jump` },
  ],
  phantom_lancer: [
    { item: "bfury", benefit: (n) => `Cleave clears ${n}'s illusion army` },
    { item: "mjollnir", benefit: (n) => `Maelstrom bounce deletes ${n} clones` },
    { item: "radiance", benefit: (n) => `Burn plus miss chance vs ${n} illusions` },
  ],
  naga_siren: [
    { item: "bfury", benefit: (n) => `Cleave vs ${n} illusions` },
    { item: "mjollnir", benefit: (n) => `Bounce damage vs ${n} clones` },
    { item: "radiance", benefit: (n) => `AoE burn vs ${n} illusions` },
  ],
  chaos_knight: [
    { item: "bfury", benefit: (n) => `Cleave vs ${n} illusions` },
    { item: "crimson_guard", benefit: (n) => `Block ${n}'s illusion crits` },
  ],
  spectre: [
    { item: "silver_edge", benefit: (n) => `Break Dispersion so ${n} stops reflecting damage` },
    { item: "skadi", benefit: (n) => `Slow and HP vs ${n}'s long fights` },
  ],
  ursa: [
    { item: "ghost", benefit: (n) => `Ghost so ${n} cannot dump Fury Swipes` },
    { item: "force_staff", benefit: (n) => `Force out of ${n}'s Overpower window` },
    { item: "heavens_halberd", benefit: (n) => `Disarm ${n} during Overpower` },
    { item: "silver_edge", benefit: (n) => `Break Fury Swipes so stacks stop` },
  ],
  lifestealer: [
    { item: "silver_edge", benefit: (n) => `Break Feast so ${n} stops healing on hit` },
    { item: "assault", benefit: (n) => `Armor vs ${n}` },
  ],
  skeleton_king: [
    { item: "silver_edge", benefit: (n) => `Break Reincarnation so ${n} actually dies` },
  ],
  viper: [
    { item: "black_king_bar", benefit: (n) => `BKB to ignore ${n}'s nethertoxin / corrosive` },
    { item: "skadi", benefit: (n) => `HP and slow vs ${n}'s long kiting fights` },
    { item: "pipe", benefit: (n) => `Pipe the team vs ${n}'s poison` },
  ],
  riki: [
    { item: "dust", benefit: (n) => `Dust ${n} when he fades` },
    { item: "gem", benefit: (n) => `True sight so ${n} cannot sit on you` },
    { item: "ward_sentry", benefit: (n) => `Sentries vs ${n} invis` },
    { item: "sheepstick", benefit: (n) => `Hex ${n} out of smoke` },
  ],
  bounty_hunter: [
    { item: "dust", benefit: (n) => `Dust vs ${n} invis` },
    { item: "ward_sentry", benefit: (n) => `Sentries vs ${n}` },
  ],
  clinkz: [
    { item: "dust", benefit: (n) => `Dust vs ${n}` },
    { item: "gem", benefit: (n) => `Gem vs ${n} invis ganks` },
  ],
  weaver: [
    { item: "dust", benefit: (n) => `Dust when ${n} fades` },
    { item: "sheepstick", benefit: (n) => `Hex ${n} before Shukuchi` },
  ],
  slark: [
    { item: "sheepstick", benefit: (n) => `Hex ${n} so Dark Pact / pounce cannot save him` },
    { item: "black_king_bar", benefit: (n) => `BKB so ${n} cannot essence-shift you` },
    { item: "ghost", benefit: (n) => `Ghost vs ${n}'s right clicks` },
    { item: "silver_edge", benefit: (n) => `Break Shadow Dance regen / essence shift` },
  ],
  nyx_assassin: [
    { item: "black_king_bar", benefit: (n) => `BKB vs ${n} stun + mana burn` },
    { item: "dust", benefit: (n) => `Dust ${n} vendetta` },
  ],
  pudge: [
    { item: "force_staff", benefit: (n) => `Force yourself or an ally out of ${n}'s hook` },
    { item: "cyclone", benefit: (n) => `Eul's ${n} after the hook, or save yourself` },
    { item: "glimmer_cape", benefit: (n) => `Glimmer the hooked target` },
  ],
  rattletrap: [
    { item: "force_staff", benefit: (n) => `Force out of ${n}'s cogs` },
    { item: "cyclone", benefit: (n) => `Eul's to break ${n} battery / hookshot setups` },
  ],
  lion: [
    { item: "black_king_bar", benefit: (n) => `BKB so ${n} cannot hex / finger you` },
    { item: "lotus_orb", benefit: (n) => `Reflect ${n}'s hex and finger` },
    { item: "sphere", benefit: (n) => `Linken's blocks ${n}'s first targeted disable` },
  ],
  shadow_shaman: [
    { item: "black_king_bar", benefit: (n) => `BKB vs ${n} shackles + hex` },
    { item: "lotus_orb", benefit: (n) => `Lotus vs ${n}'s hex` },
    { item: "sphere", benefit: (n) => `Linken's vs ${n} hex` },
  ],
  invoker: [
    { item: "black_king_bar", benefit: (n) => `BKB through ${n} tornado / blast / meteor` },
    { item: "lotus_orb", benefit: (n) => `Lotus vs ${n} cold snap / blast` },
  ],
  faceless_void: [
    { item: "black_king_bar", benefit: (n) => `BKB so ${n}'s chrono does not lock you forever` },
    { item: "manta", benefit: (n) => `Manta disjoints ${n} chrono if timed` },
  ],
  enigma: [
    { item: "black_king_bar", benefit: (n) => `BKB to walk out of ${n}'s black hole` },
  ],
  axe: [
    { item: "ghost", benefit: (n) => `Ghost so ${n} cannot call-crit you` },
    { item: "cyclone", benefit: (n) => `Eul's after ${n} call` },
    { item: "force_staff", benefit: (n) => `Force out of ${n}'s call` },
    { item: "silver_edge", benefit: (n) => `Break Counter Helix` },
  ],
  legion_commander: [
    { item: "ghost", benefit: (n) => `Ghost so ${n} duel does nothing` },
    { item: "cyclone", benefit: (n) => `Eul's to waste ${n}'s duel` },
    { item: "lotus_orb", benefit: (n) => `Lotus reflects ${n}'s duel` },
  ],
  troll_warlord: [
    { item: "heavens_halberd", benefit: (n) => `Disarm ${n}'s melee rampage` },
    { item: "skadi", benefit: (n) => `Slow ${n} so he cannot sit on you` },
    { item: "silver_edge", benefit: (n) => `Break Fervor / berserker bonuses` },
  ],
  windrunner: [
    { item: "monkey_king_bar", benefit: (n) => `True strike vs ${n} windrun evasion` },
    { item: "nullifier", benefit: (n) => `Dispel ${n}'s windrun / focus fire tanking` },
  ],
  brewmaster: [
    { item: "monkey_king_bar", benefit: (n) => `True strike vs ${n} drunken evasion` },
    { item: "silver_edge", benefit: (n) => `Break Drunken Brawler` },
  ],
  medusa: [
    { item: "diffusal_blade", benefit: (n) => `Burn ${n}'s mana shield` },
    { item: "skadi", benefit: (n) => `HP and slow vs ${n}` },
    { item: "silver_edge", benefit: (n) => `Break Mana Shield` },
  ],
  necrolyte: [
    { item: "spirit_vessel", benefit: (n) => `Anti-heal vs ${n} sadist / shroud` },
    { item: "black_king_bar", benefit: (n) => `BKB through ${n} scythe` },
  ],
  abaddon: [
    { item: "silver_edge", benefit: (n) => `Break Borrowed Time` },
    { item: "spirit_vessel", benefit: (n) => `Anti-heal vs ${n}` },
    { item: "nullifier", benefit: (n) => `Dispel ${n}'s shield` },
  ],
  tidehunter: [
    { item: "silver_edge", benefit: (n) => `Break Kraken Shell so ${n} stops blocking and dispelling` },
  ],
  silencer: [
    { item: "black_king_bar", benefit: (n) => `BKB so ${n} global silence does not delete you` },
    { item: "manta", benefit: (n) => `Manta the silence if you are not hexed` },
    { item: "lotus_orb", benefit: (n) => `Lotus vs ${n} last word / glaives` },
  ],
  ancient_apparition: [
    { item: "black_king_bar", benefit: (n) => `BKB through ${n} blast / ice vortex` },
    { item: "manta", benefit: (n) => `Manta ${n}'s ice blast if you can time it` },
    { item: "lotus_orb", benefit: (n) => `Lotus vs ${n} cold feet` },
  ],
  doom_bringer: [
    { item: "black_king_bar", benefit: (n) => `BKB so ${n} doom does not last the whole fight` },
    { item: "lotus_orb", benefit: (n) => `Lotus vs ${n} doom` },
  ],
  sniper: [
    { item: "blink", benefit: (n) => `Gap close onto ${n}` },
    { item: "black_king_bar", benefit: (n) => `BKB through ${n} shrapnel / assassinate setups` },
  ],
  drow_ranger: [
    { item: "blink", benefit: (n) => `Jump ${n} before hurricane pike kites you` },
    { item: "black_king_bar", benefit: (n) => `BKB vs ${n} silence / gust` },
    { item: "heavens_halberd", benefit: (n) => `Disarm ${n}'s aura damage` },
  ],
  templar_assassin: [
    { item: "dust", benefit: (n) => `Dust ${n} meld / blink` },
    { item: "gem", benefit: (n) => `Gem vs ${n}` },
    { item: "monkey_king_bar", benefit: (n) => `Pierce ${n} refraction / evasion windows` },
  ],
  enchantress: [
    { item: "silver_edge", benefit: (n) => `Break Untouchable so you can hit ${n}` },
    { item: "sheepstick", benefit: (n) => `Hex ${n} before she kites` },
  ],
  omniknight: [
    { item: "silver_edge", benefit: (n) => `Break ${n}'s regen / guardian angel value` },
    { item: "nullifier", benefit: (n) => `Dispel ${n} Degen / Guardian Angel` },
  ],
  winter_wyvern: [
    { item: "black_king_bar", benefit: (n) => `BKB so ${n} curse / blast does not flip the fight` },
    { item: "lotus_orb", benefit: (n) => `Lotus vs ${n} curse` },
  ],
  witch_doctor: [
    { item: "force_staff", benefit: (n) => `Force out of ${n} cask / maledict / ult channel` },
    { item: "black_king_bar", benefit: (n) => `BKB through ${n} death ward` },
  ],
  crystal_maiden: [
    { item: "black_king_bar", benefit: (n) => `BKB through ${n} frostbite / crystal nova` },
    { item: "blink", benefit: (n) => `Jump ${n} before she ults` },
  ],
  zuus: [
    { item: "black_king_bar", benefit: (n) => `BKB so ${n} ult / bolt does not delete you` },
    { item: "pipe", benefit: (n) => `Pipe the team vs ${n} magic` },
    { item: "eternal_shroud", benefit: (n) => `Magic barrier vs ${n}` },
  ],
  leshrac: [
    { item: "black_king_bar", benefit: (n) => `BKB through ${n} pulse / edict` },
    { item: "pipe", benefit: (n) => `Pipe vs ${n} magic` },
  ],
  tinker: [
    { item: "black_king_bar", benefit: (n) => `BKB through ${n} missiles / laser` },
    { item: "blade_mail", benefit: (n) => `Return ${n}'s right-click / missile burst` },
  ],
  puck: [
    { item: "black_king_bar", benefit: (n) => `BKB so ${n} coil / silence cannot bounce you` },
    { item: "orchid", benefit: (n) => `Silence ${n} before jaunt` },
  ],
  storm_spirit: [
    { item: "orchid", benefit: (n) => `Silence ${n} so he cannot zip` },
    { item: "sheepstick", benefit: (n) => `Hex ${n} out of remnant` },
    { item: "sphere", benefit: (n) => `Linken's vs ${n} remnant / vortex` },
  ],
  queenofpain: [
    { item: "black_king_bar", benefit: (n) => `BKB through ${n} scream / sonic` },
    { item: "mage_slayer", benefit: (n) => `Cut ${n}'s magic damage` },
  ],
  nevermore: [
    { item: "black_king_bar", benefit: (n) => `BKB ${n}'s requiem` },
    { item: "manta", benefit: (n) => `Manta / dodge ${n} raze timing if you can` },
  ],
  pangolier: [
    { item: "black_king_bar", benefit: (n) => `BKB so ${n} rolling thunder does not stun-lock` },
    { item: "force_staff", benefit: (n) => `Force out of ${n} roll` },
  ],
  mars: [
    { item: "black_king_bar", benefit: (n) => `BKB through ${n} spear / arena` },
    { item: "force_staff", benefit: (n) => `Force out of ${n} arena` },
  ],
  magnataur: [
    { item: "black_king_bar", benefit: (n) => `BKB ${n} reverse polarity` },
    { item: "force_staff", benefit: (n) => `Force allies out of ${n} RP` },
  ],
  earthshaker: [
    { item: "black_king_bar", benefit: (n) => `BKB ${n} echo / fissure` },
    { item: "force_staff", benefit: (n) => `Force out of ${n} echo slam` },
  ],
  sand_king: [
    { item: "black_king_bar", benefit: (n) => `BKB ${n} epicenter / burrow` },
    { item: "dust", benefit: (n) => `Dust ${n} sand storm` },
  ],
  broodmother: [
    { item: "bfury", benefit: (n) => `Cleave the spider army around ${n}` },
    { item: "dust", benefit: (n) => `Dust if ${n} fades in webs` },
  ],
  meepo: [
    { item: "bfury", benefit: (n) => `Cleave every ${n} clone` },
    { item: "sheepstick", benefit: (n) => `Hex the prime ${n}` },
    { item: "shivas_guard", benefit: (n) => `AoE vs every ${n}` },
  ],
  terrorblade: [
    { item: "bfury", benefit: (n) => `Cleave ${n} illusions` },
    { item: "skadi", benefit: (n) => `Slow ${n} after sunder` },
    { item: "butterfly", benefit: (n) => `Evasion vs ${n} metamorphosis` },
  ],
  morphling: [
    { item: "skadi", benefit: (n) => `Slow ${n} so he cannot replicate-kite` },
    { item: "nullifier", benefit: (n) => `Mute ${n}'s adaptive / sustain` },
    { item: "sheepstick", benefit: (n) => `Hex ${n} before waveform` },
  ],
  gyrocopter: [
    { item: "black_king_bar", benefit: (n) => `BKB through ${n} missiles / flak` },
    { item: "heavens_halberd", benefit: (n) => `Disarm ${n}` },
  ],
  luna: [
    { item: "black_king_bar", benefit: (n) => `BKB ${n} eclipse` },
    { item: "pipe", benefit: (n) => `Pipe ${n} moon Glaives / eclipse` },
  ],
  juggernaut: [
    { item: "skadi", benefit: (n) => `Slow ${n} so he cannot spin on you` },
    { item: "ghost", benefit: (n) => `Ghost ${n}'s omni slash` },
    { item: "heavens_halberd", benefit: (n) => `Disarm ${n} after blade fury` },
  ],
  sven: [
    { item: "ghost", benefit: (n) => `Ghost ${n}'s god's strength` },
    { item: "heavens_halberd", benefit: (n) => `Disarm ${n} during ult` },
    { item: "ethereal_blade", benefit: (n) => `Ethereal vs ${n} BKB-less right clicks` },
  ],
  tiny: [
    { item: "black_king_bar", benefit: (n) => `BKB ${n} toss / avalanche` },
    { item: "force_staff", benefit: (n) => `Force out of ${n} combo` },
  ],
  undying: [
    { item: "spirit_vessel", benefit: (n) => `Anti-heal vs ${n} tomb / flesh golem` },
    { item: "skadi", benefit: (n) => `HP race vs ${n}` },
  ],
  warlock: [
    { item: "black_king_bar", benefit: (n) => `BKB ${n} upheaval / fatal bonds / ult` },
    { item: "pipe", benefit: (n) => `Pipe ${n} chaotic offering` },
  ],
  jakiro: [
    { item: "black_king_bar", benefit: (n) => `BKB ${n} dual breath / macropyre` },
    { item: "pipe", benefit: (n) => `Pipe vs ${n}` },
  ],
  lina: [
    { item: "black_king_bar", benefit: (n) => `BKB ${n} stun / laguna` },
    { item: "sphere", benefit: (n) => `Linken's vs ${n} laguna / lasso-style lock` },
  ],
  bane: [
    { item: "black_king_bar", benefit: (n) => `BKB ${n} fiend's grip` },
    { item: "lotus_orb", benefit: (n) => `Lotus vs ${n} grip / nightmare` },
    { item: "sphere", benefit: (n) => `Linken's vs ${n} grip` },
  ],
  oracle: [
    { item: "nullifier", benefit: (n) => `Dispel ${n} false promise / fate's edict` },
    { item: "spirit_vessel", benefit: (n) => `Anti-heal vs ${n} promise` },
  ],
  dazzle: [
    { item: "spirit_vessel", benefit: (n) => `Anti-heal vs ${n} grave / weave` },
    { item: "nullifier", benefit: (n) => `Dispel ${n} shallow grave` },
  ],
  chen: [
    { item: "bfury", benefit: (n) => `Cleave ${n}'s army` },
    { item: "spirit_vessel", benefit: (n) => `Anti-heal vs ${n}` },
  ],
  venomancer: [
    { item: "black_king_bar", benefit: (n) => `BKB ${n} gale / nova` },
    { item: "pipe", benefit: (n) => `Pipe vs ${n} poison` },
  ],
};

type Graph = {
  components: Map<string, string[]>;
  parents: Map<string, string[]>;
};

const graphCache = new WeakMap<Catalog, Graph>();

function normalizeKey(raw: string): string {
  return raw.replace(/^item_/, "").trim();
}

function cleanComponents(raw: string[] | null | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.map(normalizeKey).filter((c) => c && !c.startsWith("recipe_")))];
}

function graphFor(catalog: Catalog): Graph {
  const cached = graphCache.get(catalog);
  if (cached) return cached;
  const components = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const item of catalog.items) {
    const comps = cleanComponents(item.components);
    components.set(item.key, comps);
    for (const c of comps) {
      const list = parents.get(c) ?? [];
      list.push(item.key);
      parents.set(c, list);
    }
  }
  const graph = { components, parents };
  graphCache.set(catalog, graph);
  return graph;
}

function allComponents(graph: Graph, key: string): Set<string> {
  const out = new Set<string>();
  const stack = [...(graph.components.get(key) ?? [])];
  while (stack.length) {
    const child = stack.pop()!;
    if (out.has(child)) continue;
    out.add(child);
    for (const next of graph.components.get(child) ?? []) stack.push(next);
  }
  return out;
}

function isUpgradeOf(graph: Graph, candidate: string, owned: string): boolean {
  if (candidate === owned) return false;
  return allComponents(graph, candidate).has(owned);
}

function inferRole(hero: Hero, requested: PlayerRole | undefined): PlayerRole {
  if (requested && requested !== "any") return requested;
  if (MID_SHORT.has(hero.shortName)) return "mid";
  const primary = hero.roles[0];
  if (primary === "Carry") return "carry";
  if (primary === "Support") return "support";
  if (hero.roles.includes("Initiator") || hero.roles.includes("Durable")) return "offlane";
  if (hero.roles.includes("Carry")) return "carry";
  if (hero.roles.includes("Support")) return "support";
  return "any";
}

function roleLabel(role: PlayerRole): string {
  if (role === "any") return "this hero";
  if (role === "offlane") return "offlane";
  return role;
}

function isJunk(item: Item): boolean {
  if (!item.dname) return true;
  if (item.key.startsWith("recipe_")) return true;
  if (ALWAYS_SKIP.has(item.key)) return true;
  if (/painter|halloween|mutation|seasonal|courier|treasure|player/.test(item.key)) return true;
  if (item.cost === 0 && !CONSUMABLES.has(item.key) && item.key !== "ward_observer") return true;
  return false;
}

function isRawIngredient(graph: Graph, item: Item): boolean {
  if (START_ALLOW.has(item.key) || CONSUMABLES.has(item.key)) return false;
  if ((item.components ?? []).some((c) => Boolean(c) && !String(c).startsWith("recipe_"))) return false;
  return (graph.parents.get(item.key) ?? []).length > 0;
}

function ownedSet(raw: string[] | undefined, catalog: Catalog): Set<string> {
  const out = new Set<string>();
  for (const name of raw ?? []) {
    const key = normalizeKey(name);
    if (!key || key === "empty") continue;
    out.add(key);
    if (catalog.itemsByKey.has(key)) out.add(key);
  }
  return out;
}

function blockedKeys(owned: Set<string>, catalog: Catalog, graph: Graph): Set<string> {
  const blocked = new Set<string>();
  for (const key of owned) {
    blocked.add(key);
    for (const comp of allComponents(graph, key)) blocked.add(comp);
    for (const family of EXCLUSIVE_FAMILIES) {
      if (!family.includes(key)) continue;
      for (const other of family) {
        if (other === key) continue;
        if (isUpgradeOf(graph, other, key)) continue;
        blocked.add(other);
      }
    }
  }
  return blocked;
}

function tooLateFor(item: Item, phase: ItemPhase, owned: Set<string>, inventoryValue: number): boolean {
  const cheapKeys = new Set([
    "tango",
    "branches",
    "circlet",
    "faerie_fire",
    "flask",
    "clarity",
    "blood_grenade",
    "enchanted_mango",
    "magic_stick",
    "quelling_blade",
  ]);
  const cheap = item.cost <= 700 || cheapKeys.has(item.key);
  if (!cheap) return false;
  if (phase === "mid" || phase === "late") return true;
  if (inventoryValue >= 2500) return item.key !== "magic_wand" && !DETECTION.has(item.key);
  const finishedBoot = [...owned].some((k) =>
    [
      "phase_boots",
      "power_treads",
      "arcane_boots",
      "tranquil_boots",
      "travel_boots",
      "travel_boots_2",
      "guardian_greaves",
      "boots_of_bearing",
    ].includes(k),
  );
  if (finishedBoot) return item.key !== "magic_wand" && !DETECTION.has(item.key);
  return false;
}

function phaseCostMult(phase: ItemPhase, cost: number, key: string): number {
  if (DETECTION.has(key) || key === "smoke_of_deceit") return phase === "start" ? 0.7 : 1;
  if (phase === "start") {
    if (cost <= 700) return 1;
    if (cost <= 1600) return 0.75;
    if (cost <= 2500) return 0.25;
    return 0.04;
  }
  if (phase === "early") {
    if (cost < 200) return CONSUMABLES.has(key) ? 0.55 : 0.15;
    if (cost <= 2800) return 1;
    if (cost <= 4200) return 0.45;
    return 0.12;
  }
  if (phase === "mid") {
    if (cost < 900) return CONSUMABLES.has(key) || DETECTION.has(key) ? 0.5 : 0.08;
    if (cost <= 5200) return 1;
    return 0.55;
  }
  if (cost < 1400) return DETECTION.has(key) || key === "gem" ? 0.8 : 0.05;
  if (cost < 3500) return 0.45;
  return 1;
}

function maxInBucket(bucket: Record<string, number>): number {
  let max = 1;
  for (const v of Object.values(bucket)) if (v > max) max = v;
  return max;
}

function uniquePush(list: string[], line: string) {
  if (!line || list.includes(line)) return;
  list.push(line);
}

type EnemyInfo = { id: number; hero: Hero; tags: ReturnType<typeof tagsForShortName> };

function coverageHoles(
  enemies: EnemyInfo[],
  ownedOrBlocked: Set<string>,
): { id: string; items: string[]; benefit: string }[] {
  const tagCount = new Map<string, number>();
  const named = (tag: HeroTag) =>
    enemies.filter((e) => e.tags.includes(tag)).map((e) => e.hero.localizedName);

  for (const e of enemies) {
    for (const t of e.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }

  const holes: { id: string; items: string[]; benefit: string }[] = [];
  const add = (id: string, items: string[], n: number, benefit: string) => {
    if (n <= 0) return;
    if (items.some((k) => ownedOrBlocked.has(k))) return;
    holes.push({ id, items, benefit });
  };

  const stun = (tagCount.get("stun") ?? 0) + (tagCount.get("silence") ?? 0);
  add(
    "bkb",
    ["black_king_bar", "lotus_orb", "sphere", "manta", "aeon_disk"],
    stun,
    `Spell immunity / dispel vs ${named("stun").concat(named("silence")).slice(0, 3).join(", ") || "their disables"}`,
  );
  add(
    "magic",
    ["pipe", "eternal_shroud", "mage_slayer", "black_king_bar", "glimmer_cape"],
    tagCount.get("magic") ?? 0,
    `Magic resist vs ${named("magic").slice(0, 3).join(", ") || "their nukes"}`,
  );
  add(
    "detect",
    ["dust", "gem", "ward_sentry"],
    tagCount.get("invis") ?? 0,
    `Detection vs ${named("invis").slice(0, 3).join(", ") || "invis heroes"}`,
  );
  add(
    "mkb",
    ["monkey_king_bar"],
    tagCount.get("evasion") ?? 0,
    `True strike vs ${named("evasion").slice(0, 2).join(", ") || "evasion"}`,
  );
  add(
    "illu",
    ["bfury", "maelstrom", "mjollnir", "radiance", "crimson_guard", "shivas_guard"],
    tagCount.get("illusion") ?? 0,
    `Clear ${named("illusion").slice(0, 2).join(", ") || "illusion"} clones`,
  );
  add(
    "heal",
    ["spirit_vessel", "skadi", "nullifier"],
    tagCount.get("heal") ?? 0,
    `Anti-heal vs ${named("heal").slice(0, 2).join(", ") || "their regen"}`,
  );
  add(
    "break",
    ["silver_edge"],
    tagCount.get("passive") ?? 0,
    `Break ${named("passive").slice(0, 2).join(", ") || "their passives"}`,
  );
  add(
    "phys",
    ["assault", "crimson_guard", "heavens_halberd", "ghost", "blade_mail", "shivas_guard"],
    tagCount.get("physical") ?? 0,
    `Armor / disarm vs ${named("physical").slice(0, 3).join(", ") || "right-click cores"}`,
  );
  return holes;
}

function progressFor(
  graph: Graph,
  item: Item,
  owned: Set<string>,
  catalog: Catalog,
): { score: number; benefit: string | null } {
  const comps = (graph.components.get(item.key) ?? []).filter((c) => catalog.itemsByKey.has(c));
  if (owned.has(item.key)) return { score: 0, benefit: null };

  let ownedComps = 0;
  const names: string[] = [];
  for (const c of comps) {
    if (owned.has(c)) {
      ownedComps += 1;
      const dname = catalog.itemsByKey.get(c)?.dname ?? c;
      names.push(dname);
    }
  }

  let score = 0;
  if (comps.length > 0) score = ownedComps / comps.length;
  for (const o of owned) {
    if (isUpgradeOf(graph, item.key, o)) {
      score = Math.max(score, 0.72);
      const dname = catalog.itemsByKey.get(o)?.dname ?? o;
      if (!names.includes(dname)) names.push(dname);
    }
  }

  if (score < 0.34 || names.length === 0) {
    return { score: score < 0.2 ? 0 : score * 0.5, benefit: null };
  }
  return {
    score,
    benefit: `You already have ${names.slice(0, 2).join(" + ")} — next step is ${item.dname}`,
  };
}

function situationalHits(
  itemKey: string,
  enemies: EnemyInfo[],
): { hits: number; reasons: string[]; benefits: string[] } {
  const tagCount = new Map<string, number>();
  for (const e of enemies) {
    for (const t of e.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }
  const reasons: string[] = [];
  const benefits: string[] = [];
  let hits = 0;
  for (const rule of SITUATIONAL_ITEMS) {
    if (!rule.items.includes(itemKey)) continue;
    const n = rule.tags.reduce((sum, tag) => sum + (tagCount.get(tag) ?? 0), 0);
    if (n <= 0) continue;
    hits += n;
    uniquePush(reasons, rule.reason);
    const names = enemies
      .filter((e) => rule.tags.some((t) => e.tags.includes(t)))
      .map((e) => e.hero.localizedName)
      .slice(0, 3);
    if (names.length) uniquePush(benefits, `${rule.reason} (${names.join(", ")})`);
    else uniquePush(benefits, rule.reason);
  }
  for (const e of enemies) {
    for (const ans of ENEMY_ANSWERS[e.hero.shortName] ?? []) {
      if (ans.item !== itemKey) continue;
      hits += 2;
      uniquePush(benefits, ans.benefit(e.hero.localizedName));
    }
  }
  return { hits, reasons, benefits };
}

function collapseFamilies(
  scored: ItemSuggestion[],
  graph: Graph,
  owned: Set<string>,
): ItemSuggestion[] {
  const drop = new Set<string>();
  for (const family of EXCLUSIVE_FAMILIES) {
    const hits = scored.filter((s) => family.includes(s.itemKey));
    if (hits.length <= 1) continue;
    hits.sort((a, b) => b.score - a.score || b.popularity - a.popularity);
    const keep = hits[0];
    for (const row of hits.slice(1)) {
      if (owned.has(keep.itemKey) && isUpgradeOf(graph, row.itemKey, keep.itemKey)) continue;
      drop.add(row.itemKey);
    }
  }
  return scored.filter((s) => !drop.has(s.itemKey));
}

function dropCoveredComponents(scored: ItemSuggestion[], graph: Graph): ItemSuggestion[] {
  return scored.filter((row) => {
    for (const other of scored) {
      if (other.itemKey === row.itemKey) continue;
      if (!allComponents(graph, other.itemKey).has(row.itemKey)) continue;
      if (other.score >= row.score * 0.65) return false;
    }
    return true;
  });
}

export function suggestItems(
  catalog: Catalog,
  input: {
    heroId: number;
    enemy: number[];
    ownedItems?: string[];
    phase?: ItemPhase | "all";
    role?: PlayerRole;
    buildId?: string;
  },
): ItemSuggestion[] {
  return suggestItemPlan(catalog, input).items;
}

function toBuildInfo(builds: HeroBuild[], recommendedId: string): ItemBuildInfo[] {
  return builds.map((b) => ({
    id: b.id,
    name: b.name,
    summary: b.summary,
    recommended: b.id === recommendedId,
    start: b.start,
    early: b.early,
    mid: b.mid,
    late: b.late,
  }));
}

export function suggestItemPlan(
  catalog: Catalog,
  input: {
    heroId: number;
    enemy: number[];
    ownedItems?: string[];
    phase?: ItemPhase | "all";
    role?: PlayerRole;
    buildId?: string;
  },
): ItemSuggestResult {
  const empty: ItemSuggestResult = { builds: [], selectedBuildId: "", items: [] };
  const hero = catalog.heroesById.get(input.heroId);
  if (!hero) return empty;

  const graph = graphFor(catalog);
  const role = inferRole(hero, input.role);
  const owned = ownedSet(input.ownedItems, catalog);
  const blocked = blockedKeys(owned, catalog, graph);
  const pop = catalog.itemPopularity[String(input.heroId)] ?? {
    start_game_items: {},
    early_game_items: {},
    mid_game_items: {},
    late_game_items: {},
  };

  const enemies: EnemyInfo[] = input.enemy
    .filter((id) => id > 0)
    .map((id) => catalog.heroesById.get(id))
    .filter((h): h is Hero => Boolean(h))
    .map((h) => ({ id: h.id, hero: h, tags: tagsForShortName(h.shortName) }));

  const holes = coverageHoles(enemies, blocked);
  const roleCore = new Set(ROLE_CORE[role] ?? []);
  const anti = new Set(ANTI_ROLE[role] ?? []);
  const hasEnemies = enemies.length > 0;
  const builds = buildsForHero(hero, role);
  const recommendedId = recommendBuildId(
    builds,
    enemies.map((e) => e.tags),
    owned,
  );
  const selectedBuildId = resolveBuildId(
    builds,
    input.buildId,
    enemies.map((e) => e.tags),
    owned,
  );
  const selectedBuild = builds.find((b) => b.id === selectedBuildId) ?? builds[0];
  if (!selectedBuild) {
    return { builds: [], selectedBuildId: "", items: [] };
  }
  const selectedKeys = new Set(allBuildKeys(selectedBuild));
  const otherPath = exclusiveKeys(builds, selectedBuild.id);

  const inventoryValue = [...owned].reduce((sum, key) => {
    const item = catalog.itemsByKey.get(key);
    return sum + (item?.cost ?? 0);
  }, 0);

  const phases =
    !input.phase || input.phase === "all"
      ? PHASES
      : PHASES.filter((p) => p.phase === input.phase);

  const extraKeys = new Set<string>();
  if (hasEnemies) {
    for (const rule of SITUATIONAL_ITEMS) {
      for (const k of rule.items) extraKeys.add(k);
    }
  }
  for (const e of enemies) {
    for (const ans of ENEMY_ANSWERS[e.hero.shortName] ?? []) extraKeys.add(ans.item);
  }
  for (const k of roleCore) extraKeys.add(k);
  for (const hole of holes) for (const k of hole.items) extraKeys.add(k);
  for (const o of owned) {
    for (const parent of graph.parents.get(o) ?? []) extraKeys.add(parent);
  }
  for (const k of selectedKeys) extraKeys.add(k);

  const out: ItemSuggestion[] = [];

  for (const { key: popKey, phase } of phases) {
    const bucket = pop[popKey] ?? {};
    const maxPop = maxInBucket(bucket);
    const phaseKeys = new Set(keysForBuild(selectedBuild, phase));
    const candidateIds = new Set<string>([
      ...Object.keys(bucket),
      ...[...extraKeys].map((k) => String(catalog.itemsByKey.get(k)?.id ?? "")).filter(Boolean),
    ]);

    const candidates = new Map<string, Item>();
    for (const itemId of candidateIds) {
      const item = catalog.itemsById.get(Number(itemId));
      if (item) candidates.set(item.key, item);
    }
    for (const k of extraKeys) {
      const item = catalog.itemsByKey.get(k);
      if (item) candidates.set(item.key, item);
    }
    for (const [itemId] of Object.entries(bucket)) {
      const item = catalog.itemsById.get(Number(itemId));
      if (item) candidates.set(item.key, item);
    }

    const scored: ItemSuggestion[] = [];
    for (const item of candidates.values()) {
      if (!item || blocked.has(item.key) || owned.has(item.key)) continue;
      if (isJunk(item) || isRawIngredient(graph, item)) continue;
      if (SUPPORT_ONLY.has(item.key) && role !== "support" && role !== "any") {
        if (item.key !== "dust" && item.key !== "ward_sentry") continue;
      }
      if (item.key === "quelling_blade" && hero.attackType !== "Melee") continue;
      if (item.key === "mask_of_madness" && owned.has("bfury")) continue;
      if (tooLateFor(item, phase, owned, inventoryValue)) continue;
      if (inventoryValue >= 2500 && item.cost < 800 && !DETECTION.has(item.key) && item.key !== "magic_wand" && item.key !== "bottle") {
        continue;
      }
      if (inventoryValue > 14000 && item.cost < 1800 && !DETECTION.has(item.key)) continue;
      if (phase === "start" && inventoryValue >= 2500 && item.cost > 1000) continue;
      if (phase !== "start" && phase !== "early" && CONSUMABLES.has(item.key) && !DETECTION.has(item.key) && item.key !== "gem") {
        continue;
      }

      const popCount = Number(bucket[String(item.id)] ?? 0);
      const meta = popCount > 0 ? Math.min(1, popCount / maxPop) : 0;

      const sit = situationalHits(item.key, enemies);
      let counter = hasEnemies ? Math.min(1, sit.hits / 6) : 0;

      let roleScore = 0.28;
      if (roleCore.has(item.key)) roleScore = 1;
      if (hero.attackType === "Melee" && ["bfury", "echo_sabre", "basher", "abyssal_blade", "vanguard"].includes(item.key)) {
        roleScore = Math.max(roleScore, 0.7);
      }
      if (hero.attackType === "Ranged" && ["hurricane_pike", "maelstrom", "monkey_king_bar", "dragon_lance"].includes(item.key)) {
        roleScore = Math.max(roleScore, 0.62);
      }
      if (anti.has(item.key) && meta < 0.35) roleScore *= 0.25;
      if (role === "support" && item.cost >= 5000 && meta < 0.4) roleScore *= 0.4;

      const prog = progressFor(graph, item, owned, catalog);
      const hole = holes.find((h) => h.items.includes(item.key));
      let coverage = hole ? 0.85 : 0;
      const targeted = enemies.some((e) =>
        (ENEMY_ANSWERS[e.hero.shortName] ?? []).some((a) => a.item === item.key),
      );
      const offRole = !roleCore.has(item.key) && meta < 0.2 && !(targeted && role !== "support");
      if (offRole) {
        counter *= 0.4;
        coverage *= 0.35;
      }

      let buildScore = 0.28;
      if (phaseKeys.has(item.key)) buildScore = 1;
      else if (selectedKeys.has(item.key)) buildScore = 0.78;
      else if (SHARED_BUILD_ITEMS.has(item.key)) buildScore = 0.58;
      else if (otherPath.has(item.key) && !targeted && !hole) buildScore = 0.08;

      const wMeta = hasEnemies ? 0.24 : 0.34;
      const wCounter = hasEnemies ? 0.18 : 0;
      const wRole = 0.16;
      const wProg = 0.1;
      const wCov = hasEnemies ? 0.08 : 0.04;
      const wBuild = 0.28;

      let score =
        wMeta * meta +
        wCounter * counter +
        wRole * roleScore +
        wProg * prog.score +
        wCov * coverage +
        wBuild * buildScore;

      score *= phaseCostMult(phase, item.cost, item.key);
      if (otherPath.has(item.key) && !targeted && !hole && !SHARED_BUILD_ITEMS.has(item.key)) {
        score *= 0.35;
      }
      if (
        meta < 0.05 &&
        counter < 0.15 &&
        prog.score < 0.4 &&
        coverage < 0.4 &&
        !roleCore.has(item.key) &&
        !selectedKeys.has(item.key) &&
        !SHARED_BUILD_ITEMS.has(item.key)
      ) {
        score *= 0.3;
      }
      if (score < 0.06) continue;

      const reasons: string[] = [];
      const benefits: string[] = [];
      if (phaseKeys.has(item.key) || selectedKeys.has(item.key)) {
        uniquePush(reasons, `${selectedBuild.name} build`);
      }
      if (meta >= 0.2) uniquePush(reasons, `usual ${phase} buy on ${hero.localizedName}`);
      if (counter >= 0.18) uniquePush(reasons, "into this lineup");
      if (roleCore.has(item.key)) uniquePush(reasons, `${roleLabel(role)} core`);
      if (prog.score >= 0.34) uniquePush(reasons, "finishes what you own");
      if (coverage >= 0.5) uniquePush(reasons, "covers a hole vs enemies");

      for (const b of sit.benefits) uniquePush(benefits, b);
      if (prog.benefit) uniquePush(benefits, prog.benefit);
      if (hole) uniquePush(benefits, hole.benefit);
      if (benefits.length === 0 && (phaseKeys.has(item.key) || selectedKeys.has(item.key))) {
        uniquePush(benefits, `${selectedBuild.name}: ${selectedBuild.summary}`);
      }
      if (benefits.length === 0 && meta >= 0.25) {
        uniquePush(benefits, `High pick-rate ${phase} item on ${hero.localizedName}`);
      }
      if (benefits.length === 0 && roleCore.has(item.key)) {
        uniquePush(benefits, `Standard ${roleLabel(role)} timing for ${hero.localizedName}`);
      }
      if (reasons.length === 0 && benefits.length === 0) continue;

      scored.push({
        itemKey: item.key,
        phase,
        score,
        popularity: popCount,
        reasons,
        benefits: benefits.slice(0, 3),
      });
    }

    scored.sort((a, b) => b.score - a.score || b.popularity - a.popularity);
    const collapsed = dropCoveredComponents(collapseFamilies(scored, graph, owned), graph);
    const cap = input.phase && input.phase !== "all" ? 8 : 7;
    out.push(...collapsed.slice(0, cap));
  }

  return {
    builds: toBuildInfo(builds, recommendedId),
    selectedBuildId: selectedBuild.id,
    items: out,
  };
}
