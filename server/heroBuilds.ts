import type { Hero, ItemPhase, PlayerRole } from "./types.ts";

export type HeroBuild = {
  id: string;
  name: string;
  summary: string;
  start: string[];
  early: string[];
  mid: string[];
  late: string[];
};

const MAGICAL: Omit<HeroBuild, "id" | "name" | "summary"> = {
  start: ["tango", "null_talisman", "branches", "faerie_fire"],
  early: ["bottle", "boots", "magic_wand", "null_talisman"],
  mid: ["power_treads", "kaya", "black_king_bar", "ultimate_scepter"],
  late: ["kaya_and_sange", "sheepstick", "refresher", "octarine_core", "ethereal_blade", "shivas_guard"],
};

const RIGHTCLICK: Omit<HeroBuild, "id" | "name" | "summary"> = {
  start: ["tango", "wraith_band", "branches", "faerie_fire"],
  early: ["boots", "wraith_band", "magic_wand", "blight_stone"],
  mid: ["power_treads", "yasha", "black_king_bar", "dragon_lance"],
  late: ["manta", "sange_and_yasha", "greater_crit", "satanic", "skadi", "monkey_king_bar"],
};

const FARM: Omit<HeroBuild, "id" | "name" | "summary"> = {
  start: ["tango", "quelling_blade", "branches", "circlet"],
  early: ["boots", "wraith_band", "magic_wand", "quelling_blade"],
  mid: ["power_treads", "bfury", "maelstrom", "black_king_bar"],
  late: ["manta", "satanic", "abyssal_blade", "skadi", "butterfly", "greater_crit"],
};

const FIGHT: Omit<HeroBuild, "id" | "name" | "summary"> = {
  start: ["tango", "bracer", "faerie_fire", "branches"],
  early: ["boots", "bracer", "magic_wand", "orb_of_corrosion"],
  mid: ["phase_boots", "mask_of_madness", "black_king_bar", "desolator"],
  late: ["basher", "abyssal_blade", "satanic", "nullifier", "monkey_king_bar"],
};

const AURA: Omit<HeroBuild, "id" | "name" | "summary"> = {
  start: ["tango", "branches", "circlet", "enchanted_mango"],
  early: ["boots", "bracer", "magic_wand", "ring_of_basilius"],
  mid: ["phase_boots", "vanguard", "pipe", "crimson_guard"],
  late: ["assault", "lotus_orb", "heart", "shivas_guard", "guardian_greaves"],
};

const BLINK: Omit<HeroBuild, "id" | "name" | "summary"> = {
  start: ["tango", "branches", "faerie_fire", "bracer"],
  early: ["boots", "bracer", "magic_wand", "soul_ring"],
  mid: ["phase_boots", "blink", "blade_mail", "black_king_bar"],
  late: ["overwhelming_blink", "shivas_guard", "assault", "heart", "ultimate_scepter"],
};

const SAVE: Omit<HeroBuild, "id" | "name" | "summary"> = {
  start: ["tango", "blood_grenade", "ward_observer", "clarity"],
  early: ["boots", "magic_wand", "arcane_boots", "urn_of_shadows"],
  mid: ["glimmer_cape", "force_staff", "holy_locket", "solar_crest"],
  late: ["guardian_greaves", "lotus_orb", "wind_waker", "ultimate_scepter"],
};

const DISABLE: Omit<HeroBuild, "id" | "name" | "summary"> = {
  start: ["tango", "blood_grenade", "clarity", "ward_observer"],
  early: ["boots", "magic_wand", "arcane_boots", "aether_lens"],
  mid: ["aether_lens", "force_staff", "cyclone", "blink"],
  late: ["ultimate_scepter", "aghanims_shard", "octarine_core", "refresher", "sheepstick"],
};

function named(
  id: string,
  name: string,
  summary: string,
  pack: Omit<HeroBuild, "id" | "name" | "summary">,
  extra?: Partial<Pick<HeroBuild, "start" | "early" | "mid" | "late">>,
): HeroBuild {
  return {
    id,
    name,
    summary,
    start: extra?.start ?? pack.start,
    early: extra?.early ?? pack.early,
    mid: extra?.mid ?? pack.mid,
    late: extra?.late ?? pack.late,
  };
}

/** Full playstyle paths from lane items. First entry is the default. */
const HERO_BUILDS: Record<string, HeroBuild[]> = {
  nevermore: [
    named("magical", "Magical", "Raze burst: bottle, Kaya, Aghs, eblade.", MAGICAL, {
      start: ["tango", "null_talisman", "faerie_fire", "branches"],
      early: ["bottle", "boots", "null_talisman", "magic_wand"],
      mid: ["power_treads", "kaya", "black_king_bar", "ultimate_scepter"],
      late: ["kaya_and_sange", "ethereal_blade", "refresher", "sheepstick", "octarine_core"],
    }),
    named("rightclick", "Right-click", "Attacker: treads, dragon lance, BKB, crit.", RIGHTCLICK, {
      start: ["tango", "wraith_band", "faerie_fire", "branches"],
      early: ["boots", "wraith_band", "magic_wand", "blight_stone"],
      mid: ["power_treads", "dragon_lance", "yasha", "black_king_bar"],
      late: ["hurricane_pike", "greater_crit", "satanic", "skadi", "monkey_king_bar"],
    }),
  ],
  lina: [
    named("magical", "Magical", "Nuke mid: aether, Aghs, BKB, Laguna setup.", MAGICAL, {
      early: ["bottle", "boots", "null_talisman", "aether_lens"],
      mid: ["aether_lens", "black_king_bar", "ultimate_scepter", "blink"],
      late: ["octarine_core", "sheepstick", "refresher", "ethereal_blade"],
    }),
    named("rightclick", "Right-click", "Fiery Soul attacks: treads, pike, BKB, damage.", RIGHTCLICK, {
      mid: ["power_treads", "dragon_lance", "black_king_bar", "yasha"],
      late: ["hurricane_pike", "greater_crit", "satanic", "monkey_king_bar"],
    }),
  ],
  queenofpain: [
    named("magical", "Magical", "Scream/orchid: orchid, BKB, Aghs, hex.", MAGICAL, {
      mid: ["power_treads", "orchid", "black_king_bar", "ultimate_scepter"],
      late: ["bloodthorn", "sheepstick", "ethereal_blade", "shivas_guard"],
    }),
    named("rightclick", "Right-click", "Tempo attacks: treads, yasha, BKB, pike.", RIGHTCLICK),
  ],
  obsidian_destroyer: [
    named("magical", "Magical", "Int steal: treads, bkb, hurricane, sheep.", MAGICAL, {
      mid: ["power_treads", "hurricane_pike", "black_king_bar", "ultimate_scepter"],
      late: ["sheepstick", "shivas_guard", "octarine_core", "refresher"],
    }),
    named("rightclick", "Right-click", "Hit-based: treads, pike, BKB, skadi.", RIGHTCLICK, {
      late: ["hurricane_pike", "skadi", "sheepstick", "greater_crit", "satanic"],
    }),
  ],
  obsidiandestroyer: [
    named("magical", "Magical", "Int steal: treads, bkb, hurricane, sheep.", MAGICAL, {
      mid: ["power_treads", "hurricane_pike", "black_king_bar", "ultimate_scepter"],
      late: ["sheepstick", "shivas_guard", "octarine_core", "refresher"],
    }),
    named("rightclick", "Right-click", "Hit-based: treads, pike, BKB, skadi.", RIGHTCLICK),
  ],
  zuus: [
    named("magical", "Magical", "Classic Zeus: aether, aghs, refresher.", MAGICAL, {
      early: ["null_talisman", "boots", "aether_lens", "bottle"],
      mid: ["aether_lens", "ultimate_scepter", "aghanims_shard", "black_king_bar"],
      late: ["octarine_core", "refresher", "sheepstick", "ethereal_blade"],
    }),
  ],
  tinker: [
    named("magical", "Magical", "Rearm: blink, aether, aghs, sheep.", MAGICAL, {
      early: ["bottle", "boots", "soul_ring", "null_talisman"],
      mid: ["blink", "aether_lens", "ultimate_scepter", "aghanims_shard"],
      late: ["sheepstick", "ethereal_blade", "overwhelming_blink", "octarine_core"],
    }),
  ],
  invoker: [
    named("magical", "Magical", "Exort/quas nukes: urn, aghs, bkb, refresher.", MAGICAL, {
      early: ["null_talisman", "boots", "urn_of_shadows", "hand_of_midas"],
      mid: ["travel_boots", "ultimate_scepter", "black_king_bar", "aghanims_shard"],
      late: ["refresher", "sheepstick", "octarine_core", "ethereal_blade"],
    }),
    named("rightclick", "Alacrity right-click", "Alacrity hits: treads, dragon lance, bkb.", RIGHTCLICK, {
      mid: ["power_treads", "dragon_lance", "black_king_bar", "yasha"],
    }),
  ],
  leshrac: [
    named("magical", "Magical", "Pulse/edict: bloodstone-style, bkb, aghs, shivas.", MAGICAL, {
      mid: ["bloodstone", "black_king_bar", "ultimate_scepter", "blink"],
      late: ["shivas_guard", "octarine_core", "refresher", "sheepstick"],
    }),
  ],
  storm_spirit: [
    named("magical", "Magical", "Zip: orchid, bkb, aghs, bloodthorn.", MAGICAL, {
      mid: ["power_treads", "orchid", "black_king_bar", "ultimate_scepter"],
      late: ["bloodthorn", "sheepstick", "shivas_guard", "octarine_core"],
    }),
  ],
  puck: [
    named("magical", "Magical", "Tempo mage: blink, bkb, aghs, dagon/eblade.", MAGICAL, {
      mid: ["power_treads", "blink", "black_king_bar", "ultimate_scepter"],
      late: ["ethereal_blade", "dagon_5", "sheepstick", "octarine_core"],
    }),
  ],
  death_prophet: [
    named("magical", "Magical", "Siphon: phase, bkb, aghs, shivas.", MAGICAL, {
      early: ["null_talisman", "boots", "magic_wand", "phase_boots"],
      mid: ["phase_boots", "black_king_bar", "ultimate_scepter", "aghanims_shard"],
      late: ["shivas_guard", "octarine_core", "refresher", "bloodstone"],
    }),
  ],
  viper: [
    named("rightclick", "Right-click", "Corrosive hits: treads, pike, skadi, bkb.", RIGHTCLICK, {
      mid: ["power_treads", "dragon_lance", "black_king_bar", "hurricane_pike"],
      late: ["skadi", "satanic", "monkey_king_bar", "butterfly"],
    }),
    named("magical", "Magical", "Poison mage: mage slayer, bkb, aghs.", MAGICAL, {
      mid: ["power_treads", "mage_slayer", "black_king_bar", "ultimate_scepter"],
    }),
  ],
  sniper: [
    named("rightclick", "Right-click", "Headshot: maelstrom, pike, bkb, daedalus.", RIGHTCLICK, {
      early: ["wraith_band", "boots", "magic_wand", "maelstrom"],
      mid: ["power_treads", "maelstrom", "hurricane_pike", "black_king_bar"],
      late: ["mjollnir", "greater_crit", "satanic", "monkey_king_bar"],
    }),
    named("magical", "Magical", "Shrapnel/assassinate: aether, aghs, pike.", MAGICAL, {
      mid: ["power_treads", "aether_lens", "hurricane_pike", "ultimate_scepter"],
    }),
  ],
  templar_assassin: [
    named("rightclick", "Right-click", "Refraction hits: deso, bkb, daedalus.", FIGHT, {
      start: ["tango", "wraith_band", "branches", "faerie_fire"],
      early: ["boots", "blight_stone", "power_treads", "dragon_lance"],
      mid: ["desolator", "black_king_bar", "hurricane_pike"],
      late: ["greater_crit", "bloodthorn", "nullifier", "satanic"],
    }),
  ],
  ember_spirit: [
    named("rightclick", "Right-click", "Sleight hits: maelstrom, bkb, daedalus.", RIGHTCLICK, {
      mid: ["phase_boots", "maelstrom", "black_king_bar", "bfury"],
      late: ["mjollnir", "greater_crit", "aghanims_shard", "satanic"],
    }),
    named("magical", "Magical", "Chains burst: veil/kaya, bkb, aghs.", MAGICAL),
  ],
  void_spirit: [
    named("magical", "Magical", "Resonant pulse: orchid, bkb, aghs.", MAGICAL, {
      mid: ["power_treads", "orchid", "black_king_bar", "ultimate_scepter"],
    }),
    named("rightclick", "Right-click", "Tempo: treads, yasha, bkb.", RIGHTCLICK),
  ],
  windrunner: [
    named("rightclick", "Right-click", "Focus Fire: maelstrom, bkb, aghs, daedalus.", RIGHTCLICK, {
      mid: ["phase_boots", "maelstrom", "black_king_bar", "ultimate_scepter"],
      late: ["mjollnir", "greater_crit", "monkey_king_bar", "satanic"],
    }),
    named("magical", "Magical", "Setup: aether, aghs, forcestaff.", MAGICAL),
  ],
  razor: [
    named("rightclick", "Right-click", "Static link: treads, pike, bkb, sange yasha.", RIGHTCLICK, {
      mid: ["phase_boots", "sange_and_yasha", "black_king_bar", "hurricane_pike"],
    }),
  ],
  life_stealer: [
    named("fight", "Fighting", "Phase, armlet, bkb, deso, basher.", FIGHT, {
      mid: ["phase_boots", "armlet", "black_king_bar", "desolator"],
    }),
  ],
  huskar: [
    named("rightclick", "Right-click", "Spear: armlet, bkb, hellblade, satanic.", FIGHT, {
      early: ["boots", "bracer", "armlet", "magic_wand"],
      mid: ["armlet", "black_king_bar", "heavens_halberd", "sange"],
      late: ["satanic", "skadi", "ultimate_scepter", "aghanims_shard"],
    }),
  ],
  dragon_knight: [
    named("rightclick", "Right-click", "Dragon form hits: blink, bkb, assault, daedalus.", RIGHTCLICK, {
      early: ["bracer", "boots", "soul_ring", "magic_wand"],
      mid: ["power_treads", "blink", "black_king_bar", "sange"],
      late: ["assault", "greater_crit", "satanic", "overwhelming_blink"],
    }),
    named("aura", "Aura / tank", "Team aura: vanguard, bkb, assault, shivas.", AURA, {
      mid: ["power_treads", "blink", "black_king_bar", "pipe"],
      late: ["assault", "shivas_guard", "heart", "crimson_guard"],
    }),
  ],
  kunkka: [
    named("magical", "Magical", "Tide/torrent: blink, bkb, aghs, daedalus optional.", MAGICAL, {
      mid: ["phase_boots", "blink", "black_king_bar", "ultimate_scepter"],
      late: ["daedalus", "greater_crit", "assault", "refresher"],
    }),
    named("rightclick", "Right-click", "Tidebringer hits: phase, bkb, daedalus.", RIGHTCLICK, {
      mid: ["phase_boots", "black_king_bar", "bfury", "greater_crit"],
    }),
  ],
  tiny: [
    named("magical", "Magical", "Toss combo: blink, aghs, bkb, daedalus.", MAGICAL, {
      mid: ["phase_boots", "blink", "ultimate_scepter", "black_king_bar"],
      late: ["greater_crit", "assault", "overwhelming_blink", "moon_shard"],
    }),
    named("rightclick", "Right-click", "Tree hits: echo, aghs, bkb, daedalus.", RIGHTCLICK, {
      mid: ["phase_boots", "echo_sabre", "ultimate_scepter", "black_king_bar"],
    }),
  ],
  muerta: [
    named("rightclick", "Right-click", "Gunslinger: maelstrom, bkb, daedalus, pike.", RIGHTCLICK, {
      mid: ["power_treads", "maelstrom", "black_king_bar", "hurricane_pike"],
    }),
    named("magical", "Magical", "The Calling: aether, aghs, bkb.", MAGICAL),
  ],
  phantom_assassin: [
    named("farm", "Battle Fury farm", "Standard PA: phase, fury, bkb, deso, abyssal.", FARM, {
      start: ["tango", "quelling_blade", "branches", "circlet"],
      early: ["boots", "phase_boots", "magic_wand", "bfury"],
      mid: ["bfury", "black_king_bar", "desolator"],
      late: ["basher", "abyssal_blade", "satanic", "nullifier", "monkey_king_bar"],
    }),
    named("fight", "Fighting", "Skip fury: mom/deso into bkb and lock.", FIGHT, {
      early: ["boots", "phase_boots", "orb_of_corrosion", "mask_of_madness"],
      mid: ["mask_of_madness", "desolator", "black_king_bar"],
    }),
  ],
  antimage: [
    named("farm", "Battle Fury", "Classic AM: treads, fury, manta, abyssal.", FARM, {
      mid: ["power_treads", "bfury", "manta", "black_king_bar"],
      late: ["skadi", "abyssal_blade", "butterfly", "nullifier"],
    }),
    named("fight", "Fighting", "Faster fight: treads, bf, bkb, basher.", FIGHT),
  ],
  juggernaut: [
    named("farm", "Battle Fury", "Farm then bkb manta.", FARM, {
      mid: ["phase_boots", "bfury", "black_king_bar", "manta"],
    }),
    named("fight", "Fighting", "Maelstrom / mom into bkb.", FIGHT, {
      mid: ["phase_boots", "maelstrom", "black_king_bar", "manta"],
    }),
  ],
  luna: [
    named("rightclick", "Right-click", "Glaives: treads, mask, bkb, manta, satanic.", RIGHTCLICK, {
      mid: ["power_treads", "mask_of_madness", "black_king_bar", "manta"],
    }),
    named("farm", "Farm", "Maelstrom into bkb and damage.", FARM),
  ],
  drow_ranger: [
    named("rightclick", "Right-click", "Aura hits: treads, pike, bkb, silver edge.", RIGHTCLICK, {
      mid: ["power_treads", "hurricane_pike", "black_king_bar", "invis_sword"],
      late: ["silver_edge", "greater_crit", "skadi", "butterfly"],
    }),
  ],
  medusa: [
    named("rightclick", "Right-click", "Mana shield hits: treads, manta, skadi, bkb.", RIGHTCLICK, {
      mid: ["power_treads", "manta", "skadi", "black_king_bar"],
      late: ["butterfly", "satanic", "greater_crit", "rapier"],
    }),
  ],
  terrorblade: [
    named("farm", "Illusion farm", "Yasha, manta, skadi, bkb.", FARM, {
      mid: ["power_treads", "yasha", "manta", "skadi"],
      late: ["black_king_bar", "satanic", "butterfly", "greater_crit"],
    }),
  ],
  sven: [
    named("fight", "God's Strength", "Echo, bkb, daedalus, blink.", FIGHT, {
      early: ["bracer", "boots", "echo_sabre", "magic_wand"],
      mid: ["power_treads", "echo_sabre", "black_king_bar", "blink"],
      late: ["greater_crit", "satanic", "harpoon", "assault"],
    }),
    named("farm", "Farm", "Maelstrom into bkb and crit.", FARM),
  ],
  ursa: [
    named("fight", "Fighting", "Phase, diffusal, bkb, abyssal.", FIGHT, {
      early: ["orb_of_corrosion", "phase_boots", "magic_wand"],
      mid: ["diffusal_blade", "black_king_bar", "basher"],
      late: ["abyssal_blade", "nullifier", "skadi", "satanic"],
    }),
  ],
  troll_warlord: [
    named("fight", "Fighting", "Phase, bkb, sny, satanic.", FIGHT, {
      mid: ["phase_boots", "sange_and_yasha", "black_king_bar", "bfury"],
    }),
    named("farm", "Farm", "Fury into bkb.", FARM),
  ],
  lifestealer: [
    named("fight", "Fighting", "Phase, armlet, bkb, deso, basher.", FIGHT, {
      mid: ["phase_boots", "armlet", "black_king_bar", "desolator"],
    }),
  ],
  faceless_void: [
    named("fight", "Chrono", "Maelstrom, bkb, pin, mjollnir.", FIGHT, {
      mid: ["power_treads", "maelstrom", "black_king_bar", "mask_of_madness"],
      late: ["mjollnir", "skadi", "butterfly", "satanic"],
    }),
  ],
  spectre: [
    named("farm", "Radiance / manta", "Treads, radiance or manta, skadi, heart.", FARM, {
      mid: ["power_treads", "radiance", "manta", "ultimate_scepter"],
      late: ["skadi", "heart", "butterfly", "abyssal_blade"],
    }),
    named("fight", "Fighting", "Diffusal, manta, bkb.", FIGHT),
  ],
  slark: [
    named("fight", "Fighting", "Treads, echo, bkb, skadi, abyssal.", FIGHT, {
      mid: ["power_treads", "echo_sabre", "black_king_bar", "diffusal_blade"],
      late: ["skadi", "abyssal_blade", "butterfly", "satanic"],
    }),
  ],
  morphling: [
    named("rightclick", "Right-click", "Linken's, skadi, bkb, eye, satanic.", RIGHTCLICK, {
      mid: ["power_treads", "sange", "sphere", "skadi"],
      late: ["black_king_bar", "satanic", "ethereal_blade", "butterfly"],
    }),
    named("magical", "Magical", "Eblade shotgun: eblade, dagon, bkb.", MAGICAL, {
      mid: ["power_treads", "ethereal_blade", "black_king_bar", "dagon_5"],
    }),
  ],
  gyrocopter: [
    named("rightclick", "Right-click", "Flak: maelstrom, bkb, pike, satanic.", RIGHTCLICK, {
      mid: ["power_treads", "maelstrom", "black_king_bar", "hurricane_pike"],
    }),
  ],
  weaver: [
    named("rightclick", "Right-click", "Geminate: maelstrom, deso, bkb.", RIGHTCLICK, {
      mid: ["power_treads", "maelstrom", "desolator", "black_king_bar"],
    }),
  ],
  clinkz: [
    named("rightclick", "Right-click", "Strafe: deso, bkb, bloodthorn, pike.", FIGHT, {
      mid: ["power_treads", "desolator", "black_king_bar", "orchid"],
      late: ["bloodthorn", "nullifier", "greater_crit", "satanic"],
    }),
  ],
  broodmother: [
    named("farm", "Push", "Treads, orchid, bkb, bloodthorn.", FIGHT, {
      mid: ["power_treads", "orchid", "black_king_bar", "assault"],
    }),
  ],
  meepo: [
    named("rightclick", "Right-click", "Net hits: treads, dragon lance, blink, aghs, skadi.", RIGHTCLICK, {
      mid: ["power_treads", "dragon_lance", "blink", "ultimate_scepter"],
      late: ["skadi", "sheepstick", "heart", "assault"],
    }),
  ],
  alchemist: [
    named("rightclick", "Right-click", "Greed into AC, bkb, manta, overlord.", RIGHTCLICK, {
      mid: ["travel_boots", "black_king_bar", "assault", "satanic"],
      late: ["abyssal_blade", "nullifier", "heart", "overwhelming_blink"],
    }),
    named("aura", "Aura alch", "Radiance/AC for the team.", AURA, {
      mid: ["radiance", "assault", "black_king_bar", "travel_boots"],
    }),
  ],
  axe: [
    named("blink", "Blink call", "Blink, blade mail, bkb, crimson.", BLINK, {
      mid: ["phase_boots", "blink", "blade_mail", "black_king_bar"],
      late: ["crimson_guard", "heart", "overwhelming_blink", "shivas_guard"],
    }),
    named("aura", "Aura", "Vanguard into pipe/crimson/greaves.", AURA),
  ],
  centaur: [
    named("blink", "Blink stun", "Blink, bkb, pipe, heart.", BLINK),
    named("aura", "Aura", "Vanguard, pipe, crimson, greaves.", AURA),
  ],
  tidehunter: [
    named("blink", "Blink ravage", "Blink, bkb, refresher, shivas.", BLINK, {
      late: ["refresher", "shivas_guard", "pipe", "heart", "ultimate_scepter"],
    }),
    named("aura", "Aura", "Crimson, pipe, greaves.", AURA),
  ],
  magnataur: [
    named("blink", "Blink RP", "Blink, bkb, shard, refresher.", BLINK, {
      late: ["aghanims_shard", "refresher", "shivas_guard", "ultimate_scepter"],
    }),
  ],
  earthshaker: [
    named("blink", "Blink slam", "Blink, bkb, aether, refresher.", BLINK, {
      early: ["arcane_boots", "magic_wand", "blink", "aether_lens"],
      mid: ["blink", "aether_lens", "black_king_bar", "ultimate_scepter"],
    }),
  ],
  mars: [
    named("blink", "Blink arena", "Blink, bkb, deso/halberd, assault.", BLINK, {
      mid: ["phase_boots", "blink", "black_king_bar", "desolator"],
      late: ["assault", "heavens_halberd", "overwhelming_blink", "satanic"],
    }),
    named("aura", "Aura", "Vanguard, pipe, crimson.", AURA),
  ],
  primal_beast: [
    named("blink", "Blink smash", "Blink, bkb, shard, shivas.", BLINK),
    named("aura", "Aura", "Vanguard into pipe and heart.", AURA),
  ],
  pangolier: [
    named("magical", "Magical", "Diffusal/maels, bkb, shard.", MAGICAL, {
      mid: ["arcane_boots", "diffusal_blade", "black_king_bar", "aghanims_shard"],
    }),
    named("rightclick", "Right-click", "Maelstrom, bkb, basher.", RIGHTCLICK),
  ],
  brewmaster: [
    named("blink", "Blink split", "Blink, bkb, aghs.", BLINK, {
      mid: ["phase_boots", "blink", "black_king_bar", "ultimate_scepter"],
    }),
  ],
  enigma: [
    named("blink", "Blink hole", "Blink, bkb, refresher, aghs.", BLINK, {
      early: ["arcane_boots", "magic_wand", "blink"],
      mid: ["blink", "black_king_bar", "ultimate_scepter", "refresher"],
    }),
  ],
  clockwerk: [
    named("utility", "Hookshot", "Phase, blade mail, bkb, force, aghs.", FIGHT, {
      mid: ["phase_boots", "blade_mail", "force_staff", "black_king_bar"],
      late: ["ultimate_scepter", "overwhelming_blink", "shivas_guard", "heart"],
    }),
  ],
  rattletrap: [
    named("utility", "Hookshot", "Phase, blade mail, bkb, force, aghs.", FIGHT, {
      mid: ["phase_boots", "blade_mail", "force_staff", "black_king_bar"],
    }),
  ],
  bristleback: [
    named("aura", "Tank", "Vanguard, crimson, pipe, bkb, assault.", AURA, {
      mid: ["phase_boots", "vanguard", "crimson_guard", "black_king_bar"],
      late: ["assault", "pipe", "heart", "abyssal_blade"],
    }),
    named("rightclick", "Right-click", "Sny, bkb, satanic.", RIGHTCLICK),
  ],
  sand_king: [
    named("blink", "Blink epi", "Blink, bkb, aghs, refresher.", BLINK, {
      mid: ["arcane_boots", "blink", "black_king_bar", "ultimate_scepter"],
    }),
    named("magical", "Magical", "Veil/aether into bkb.", MAGICAL),
  ],
  nyx_assassin: [
    named("disable", "Disable", "Arcane, blink, aghs, dagon, sheep.", DISABLE, {
      mid: ["arcane_boots", "blink", "ultimate_scepter", "dagon_5"],
    }),
  ],
  batrider: [
    named("disable", "Lasso", "Blink, force, bkb, refresher.", DISABLE, {
      mid: ["arcane_boots", "blink", "force_staff", "black_king_bar"],
    }),
  ],
  pudge: [
    named("disable", "Hook", "Phase, blink, aether, aghs, shard.", DISABLE, {
      early: ["boots", "magic_wand", "phase_boots", "soul_ring"],
      mid: ["blink", "aether_lens", "ultimate_scepter", "aghanims_shard"],
    }),
  ],
  lion: [
    named("disable", "Disable", "Aether, blink, aghs, refresher.", DISABLE),
    named("save", "Save", "Force, glimmer, aether.", SAVE),
  ],
  shadow_shaman: [
    named("disable", "Disable", "Aether, blink, aghs, refresher.", DISABLE),
    named("save", "Save", "Glimmer, force, greaves.", SAVE),
  ],
  witch_doctor: [
    named("disable", "Disable", "Aether, aghs, refresher.", DISABLE),
    named("save", "Save", "Holy locket, glimmer, greaves.", SAVE),
  ],
  crystal_maiden: [
    named("disable", "Disable", "Aether, blink, aghs, glimmer.", DISABLE),
    named("save", "Save", "Glimmer, force, greaves.", SAVE),
  ],
  rubick: [
    named("disable", "Disable", "Aether, blink, aghs.", DISABLE),
    named("save", "Save", "Force, glimmer, lotus.", SAVE),
  ],
  ogre_magi: [
    named("save", "Save", "Arcanes, aether, aghs, greaves.", SAVE, {
      mid: ["arcane_boots", "aether_lens", "ultimate_scepter", "force_staff"],
    }),
    named("disable", "Disable", "Blink, aghs, refresher.", DISABLE),
  ],
  jakiro: [
    named("disable", "Disable", "Aether, aghs, refresher.", DISABLE),
    named("save", "Save", "Glimmer, pipe, greaves.", SAVE),
  ],
  winter_wyvern: [
    named("save", "Save", "Glimmer, force, aghs.", SAVE),
    named("disable", "Disable", "Aether, aghs, hex.", DISABLE),
  ],
  oracle: [
    named("save", "Save", "Aether, force, glimmer, aghs.", SAVE),
  ],
  dazzle: [
    named("save", "Save", "Holy locket, greaves, aghs.", SAVE, {
      mid: ["arcane_boots", "holy_locket", "glimmer_cape", "force_staff"],
    }),
  ],
  warlock: [
    named("disable", "Golem", "Aghs, refresher, blink, greaves.", DISABLE, {
      mid: ["arcane_boots", "ultimate_scepter", "aghanims_shard", "refresher"],
    }),
    named("save", "Save", "Glimmer, greaves, pipe.", SAVE),
  ],
  ancient_apparition: [
    named("disable", "Disable", "Aether, aghs, gleipnir.", DISABLE),
    named("save", "Save", "Glimmer, force.", SAVE),
  ],
  silencer: [
    named("rightclick", "Right-click", "Glaives: treads, pike, bkb, sheep.", RIGHTCLICK, {
      mid: ["power_treads", "hurricane_pike", "black_king_bar", "ultimate_scepter"],
    }),
    named("disable", "Disable", "Aether, aghs, hex.", DISABLE),
  ],
  undying: [
    named("aura", "Aura", "Vanguard, greaves, pipe, shard.", AURA, {
      mid: ["arcane_boots", "vanguard", "holy_locket", "ultimate_scepter"],
    }),
  ],
  omniknight: [
    named("save", "Save", "Greaves, aghs, lotus, pipe.", SAVE, {
      mid: ["arcane_boots", "holy_locket", "ultimate_scepter", "guardian_greaves"],
    }),
  ],
  abaddon: [
    named("rightclick", "Right-click", "Cursed strikes: treads, aoe, bkb, radiance.", RIGHTCLICK, {
      mid: ["phase_boots", "radiance", "black_king_bar", "assault"],
    }),
    named("save", "Save", "Greaves, pipe, lotus.", SAVE),
  ],
  chen: [
    named("save", "Save", "Greaves, mek, aghs.", SAVE, {
      mid: ["arcane_boots", "mekansm", "guardian_greaves", "ultimate_scepter"],
    }),
  ],
  enchantress: [
    named("rightclick", "Right-click", "Impetus: pike, bkb, aghs, skadi.", RIGHTCLICK, {
      mid: ["power_treads", "hurricane_pike", "black_king_bar", "ultimate_scepter"],
    }),
    named("save", "Save", "Force, glimmer, aghs.", SAVE),
  ],
  vengefulspirit: [
    named("save", "Save", "Force, solar, aghs, glimmer.", SAVE),
    named("rightclick", "Right-click", "Aura carry: treads, pike, bkb.", RIGHTCLICK),
  ],
  dark_willow: [
    named("disable", "Disable", "Aether, blink, aghs, hex.", DISABLE),
    named("save", "Save", "Glimmer, force.", SAVE),
  ],
  hoodwink: [
    named("rightclick", "Right-click", "Acorn: maelstrom, pike, aghs, bkb.", RIGHTCLICK, {
      mid: ["power_treads", "maelstrom", "hurricane_pike", "ultimate_scepter"],
    }),
    named("disable", "Disable", "Aether, aghs, gleipnir.", DISABLE),
  ],
  keeper_of_the_light: [
    named("magical", "Magical", "Aghs, aether, octarine, refresher.", MAGICAL, {
      mid: ["aether_lens", "ultimate_scepter", "aghanims_shard", "octarine_core"],
    }),
    named("save", "Save", "Force, glimmer, greaves.", SAVE),
  ],
  phoenix: [
    named("save", "Save", "Shroud, greaves, aghs, refresher.", SAVE, {
      mid: ["tranquil_boots", "eternal_shroud", "ultimate_scepter", "refresher"],
    }),
  ],
  bane: [
    named("disable", "Disable", "Aether, blink, aghs.", DISABLE),
    named("save", "Save", "Glimmer, force.", SAVE),
  ],
  grimstroke: [
    named("disable", "Disable", "Aether, aghs, refresher.", DISABLE),
    named("save", "Save", "Glimmer, force.", SAVE),
  ],
  disruptor: [
    named("disable", "Disable", "Aether, aghs, glimmer.", DISABLE),
    named("save", "Save", "Force, glimmer, greaves.", SAVE),
  ],
};

function copyPack(p: Omit<HeroBuild, "id" | "name" | "summary">): Omit<HeroBuild, "id" | "name" | "summary"> {
  return {
    start: [...p.start],
    early: [...p.early],
    mid: [...p.mid],
    late: [...p.late],
  };
}

export function fallbackBuilds(hero: Hero, role: PlayerRole): HeroBuild[] {
  if (role === "support" || (hero.roles[0] === "Support" && role === "any")) {
    return [
      named("save", "Save", "Keep allies alive: glimmer, force, greaves.", SAVE),
      named("disable", "Disable", "Lock them down: aether, blink, hex, aghs.", DISABLE),
    ];
  }
  if (role === "offlane" || hero.roles.includes("Initiator") && !hero.roles.includes("Carry")) {
    return [
      named("blink", "Blink initiator", "Blink, BKB, then teamfight items.", BLINK),
      named("aura", "Aura / tank", "Vanguard, pipe, crimson, greaves.", AURA),
    ];
  }
  if (hero.primaryAttr === "int" || hero.primaryAttr === "all") {
    return [
      named("magical", "Magical", "Spell damage: bottle/kaya, BKB, Aghs, hex.", copyPack(MAGICAL)),
      named("rightclick", "Right-click", "Attacker: treads, lance/yasha, BKB, damage.", copyPack(RIGHTCLICK)),
    ];
  }
  if (hero.primaryAttr === "agi") {
    return [
      named("farm", "Farming", "Fury or maelstrom, then BKB and damage.", copyPack(FARM)),
      named("fight", "Fighting", "Faster fight items: mom/deso into BKB.", copyPack(FIGHT)),
    ];
  }
  return [
    named("fight", "Fighting", "Echo/armlet into BKB and lock.", copyPack(FIGHT)),
    named("aura", "Aura / tank", "Armor and auras for the team.", copyPack(AURA)),
  ];
}

export function buildsForHero(hero: Hero, role: PlayerRole): HeroBuild[] {
  const aliases: Record<string, string> = {
    obsidiandestroyer: "obsidian_destroyer",
    clockwerk: "rattletrap",
    lifestealer: "life_stealer",
  };
  const listed =
    HERO_BUILDS[hero.shortName] ?? HERO_BUILDS[aliases[hero.shortName] ?? ""];
  if (listed && listed.length > 0) return listed;
  return fallbackBuilds(hero, role);
}

export function keysForBuild(build: HeroBuild, phase?: ItemPhase | "all"): string[] {
  if (!phase || phase === "all") {
    return [...build.start, ...build.early, ...build.mid, ...build.late];
  }
  return [...build[phase]];
}

export function allBuildKeys(build: HeroBuild): string[] {
  return keysForBuild(build, "all");
}

export function exclusiveKeys(builds: HeroBuild[], selectedId: string): Set<string> {
  const selected = new Set(allBuildKeys(builds.find((b) => b.id === selectedId) ?? builds[0]));
  const out = new Set<string>();
  for (const b of builds) {
    if (b.id === selectedId) continue;
    for (const k of allBuildKeys(b)) {
      if (!selected.has(k)) out.add(k);
    }
  }
  return out;
}

const OWNED_HINT_SKIP = new Set([
  "tango",
  "branches",
  "faerie_fire",
  "circlet",
  "enchanted_mango",
  "clarity",
  "blood_grenade",
  "ward_observer",
  "boots",
  "magic_wand",
]);

export function inferBuildFromOwned(builds: HeroBuild[], owned: Set<string>): string | null {
  let best: string | null = null;
  let bestHits = 0;
  for (const b of builds) {
    const hits = allBuildKeys(b).filter((k) => owned.has(k) && !OWNED_HINT_SKIP.has(k)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = b.id;
    }
  }
  return bestHits >= 2 ? best : null;
}

export function recommendBuildId(
  builds: HeroBuild[],
  enemyTags: string[][],
  owned: Set<string>,
): string {
  const inferred = inferBuildFromOwned(builds, owned);
  if (inferred) return inferred;
  const ids = new Set(builds.map((b) => b.id));
  const count = (tag: string) => enemyTags.filter((tags) => tags.includes(tag)).length;
  const magic = count("magic");
  const physical = count("physical");
  const passive = count("passive");
  const stun = count("stun");

  if (ids.has("rightclick") && ids.has("magical")) {
    if (physical + passive >= 2) return "rightclick";
    if (magic >= 2) return "rightclick";
    return "magical";
  }
  if (ids.has("fight") && ids.has("farm")) {
    if (physical + stun >= 2) return "fight";
    return "farm";
  }
  if (ids.has("aura") && magic + physical >= 2) return "aura";
  if (ids.has("blink") && stun >= 1) return "blink";
  if (ids.has("save") && ids.has("disable")) {
    if (physical >= 2) return "save";
    return "disable";
  }
  return builds[0]?.id ?? "magical";
}

export function resolveBuildId(
  builds: HeroBuild[],
  requested: string | undefined,
  enemyTags: string[][],
  owned: Set<string>,
): string {
  if (requested && builds.some((b) => b.id === requested)) return requested;
  return recommendBuildId(builds, enemyTags, owned);
}

/** Boots, wand, BKB, shard, detection — legal on every path. */
export const SHARED_BUILD_ITEMS = new Set([
  "boots",
  "magic_stick",
  "magic_wand",
  "black_king_bar",
  "aghanims_shard",
  "dust",
  "gem",
  "ward_sentry",
  "smoke_of_deceit",
]);
