// src/data/pokedex.js – Pokémon data for the starting roster
// Stats loosely based on official Gen 1 data

const TYPE_CHART = {
  normal:  { rock:-1, ghost:-2, steel:-1 },
  fire:    { fire:-1, water:-1, rock:-1, dragon:-1, grass:1, ice:1, bug:1, steel:1 },
  water:   { water:-1, grass:-1, dragon:-1, fire:1, ground:1, rock:1 },
  grass:   { fire:-1, grass:-1, poison:-1, flying:-1, bug:-1, dragon:-1, steel:-1, water:1, ground:1, rock:1 },
  electric:{ grass:-1, electric:-1, dragon:-1, ground:-2, water:1, flying:1 },
  poison:  { poison:-1, ground:-1, rock:-1, ghost:-1, steel:-2, grass:1, fairy:1 },
  normal_def:  { ghost: -2 },
};

export const TYPES = {
  fire:    { color: '#f97316' },
  water:   { color: '#3b82f6' },
  grass:   { color: '#22c55e' },
  poison:  { color: '#a855f7' },
  normal:  { color: '#9ca3af' },
  flying:  { color: '#7dd3fc' },
  bug:     { color: '#84cc16' },
  electric:{ color: '#eab308' },
};

export const POKEDEX = {
  bulbasaur: {
    number: 1,
    name: 'Bulbasaur',
    types: ['grass','poison'],
    baseHp: 45, atk: 49, def: 49, spAtk: 65, spDef: 65, spd: 45,
    moves: [
      { name: 'Tackle',     type: 'normal', power: 40, pp: 35, category: 'physical' },
      { name: 'Growl',      type: 'normal', power: 0,  pp: 40, category: 'status', effect: 'lower_atk' },
      { name: 'Vine Whip',  type: 'grass',  power: 45, pp: 25, category: 'special' },
      { name: 'Poison Powder', type: 'poison', power: 0, pp: 35, category: 'status', effect: 'poison' },
    ],
    catchRate: 45,
    expYield: 64,
    color: 0x44bb44,
  },
  charmander: {
    number: 4,
    name: 'Charmander',
    types: ['fire'],
    baseHp: 39, atk: 52, def: 43, spAtk: 60, spDef: 50, spd: 65,
    moves: [
      { name: 'Scratch',  type: 'normal', power: 40, pp: 35, category: 'physical' },
      { name: 'Growl',    type: 'normal', power: 0,  pp: 40, category: 'status', effect: 'lower_atk' },
      { name: 'Ember',    type: 'fire',   power: 40, pp: 25, category: 'special', effect: 'burn_10' },
      { name: 'Smokescreen', type: 'normal', power: 0, pp: 20, category: 'status', effect: 'lower_acc' },
    ],
    catchRate: 45,
    expYield: 62,
    color: 0xff6622,
  },
  squirtle: {
    number: 7,
    name: 'Squirtle',
    types: ['water'],
    baseHp: 44, atk: 48, def: 65, spAtk: 50, spDef: 64, spd: 43,
    moves: [
      { name: 'Tackle',   type: 'normal', power: 40, pp: 35, category: 'physical' },
      { name: 'Tail Whip',type: 'normal', power: 0,  pp: 30, category: 'status', effect: 'lower_def' },
      { name: 'Water Gun',type: 'water',  power: 40, pp: 25, category: 'special' },
      { name: 'Withdraw', type: 'water',  power: 0,  pp: 40, category: 'status', effect: 'raise_def' },
    ],
    catchRate: 45,
    expYield: 63,
    color: 0x4499ff,
  },
  pikachu: {
    number: 25,
    name: 'Pikachu',
    types: ['electric'],
    baseHp: 35, atk: 55, def: 40, spAtk: 50, spDef: 50, spd: 90,
    moves: [
      { name: 'Thunder Shock', type: 'electric', power: 40, pp: 30, category: 'special', effect: 'paralysis_10' },
      { name: 'Tail Whip',     type: 'normal',   power: 0,  pp: 30, category: 'status' },
      { name: 'Quick Attack',  type: 'normal',   power: 40, pp: 30, category: 'physical', priority: 1 },
      { name: 'Thunderbolt',   type: 'electric', power: 90, pp: 15, category: 'special', effect: 'paralysis_10' },
    ],
    catchRate: 190,
    expYield: 112,
    color: 0xffee00,
  },
  pidgey: {
    number: 16,
    name: 'Pidgey',
    types: ['normal','flying'],
    baseHp: 40, atk: 45, def: 40, spAtk: 35, spDef: 35, spd: 56,
    moves: [
      { name: 'Tackle',   type: 'normal',  power: 40, pp: 35, category: 'physical' },
      { name: 'Sand Attack', type: 'ground', power: 0, pp: 15, category: 'status', effect: 'lower_acc' },
      { name: 'Gust',     type: 'flying',  power: 40, pp: 35, category: 'special' },
      { name: 'Quick Attack', type: 'normal', power: 40, pp: 30, category: 'physical', priority: 1 },
    ],
    catchRate: 255,
    expYield: 50,
    color: 0xbb9966,
  },
  rattata: {
    number: 19,
    name: 'Rattata',
    types: ['normal'],
    baseHp: 30, atk: 56, def: 35, spAtk: 25, spDef: 35, spd: 72,
    moves: [
      { name: 'Tackle',    type: 'normal', power: 40, pp: 35, category: 'physical' },
      { name: 'Tail Whip', type: 'normal', power: 0,  pp: 30, category: 'status' },
      { name: 'Quick Attack', type: 'normal', power: 40, pp: 30, category: 'physical', priority: 1 },
      { name: 'Hyper Fang', type: 'normal', power: 80, pp: 15, category: 'physical' },
    ],
    catchRate: 255,
    expYield: 51,
    color: 0x9966bb,
  },
  caterpie: {
    number: 10,
    name: 'Caterpie',
    types: ['bug'],
    baseHp: 45, atk: 30, def: 35, spAtk: 20, spDef: 20, spd: 45,
    moves: [
      { name: 'Tackle',   type: 'normal', power: 40, pp: 35, category: 'physical' },
      { name: 'String Shot', type: 'bug', power: 0, pp: 40, category: 'status', effect: 'lower_spd' },
      { name: 'Bug Bite', type: 'bug',    power: 60, pp: 20, category: 'physical' },
    ],
    catchRate: 255,
    expYield: 39,
    color: 0x44cc44,
  },
  meowth: {
    number: 52,
    name: 'Meowth',
    types: ['normal'],
    baseHp: 40, atk: 45, def: 35, spAtk: 40, spDef: 40, spd: 90,
    moves: [
      { name: 'Scratch',  type: 'normal', power: 40, pp: 35, category: 'physical' },
      { name: 'Growl',    type: 'normal', power: 0,  pp: 40, category: 'status', effect: 'lower_atk' },
      { name: 'Bite',     type: 'dark',   power: 60, pp: 25, category: 'physical', effect: 'flinch_30' },
      { name: 'Pay Day',  type: 'normal', power: 40, pp: 20, category: 'physical' },
    ],
    catchRate: 255,
    expYield: 69,
    color: 0xddcc88,
  },
};

// Type effectiveness chart (attacker type → map of defender type → multiplier)
export const TYPE_EFFECTIVENESS = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5, grass: 2, ice: 2, bug: 2, steel: 2 },
  water:    { water: 0.5, grass: 0.5, dragon: 0.5, fire: 2, ground: 2, rock: 2 },
  grass:    { fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5, water: 2, ground: 2, rock: 2 },
  electric: { grass: 0.5, electric: 0.5, dragon: 0.5, ground: 0, water: 2, flying: 2 },
  poison:   { poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, grass: 2, fairy: 2 },
  bug:      { fire: 0.5, fighting: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5, grass: 2, psychic: 2, dark: 2 },
  flying:   { electric: 0.5, rock: 0.5, steel: 0.5, bug: 2, grass: 2, fighting: 2 },
  dark:     { fighting: 0.5, dark: 0.5, fairy: 0.5, ghost: 2, psychic: 2 },
  ground:   { grass: 0.5, bug: 0.5, flying: 0, electric: 2, fire: 2, poison: 2, rock: 2, steel: 2 },
};

export function getEffectiveness(atkType, defTypes) {
  let mult = 1;
  const chart = TYPE_EFFECTIVENESS[atkType] || {};
  for (const dt of defTypes) {
    mult *= chart[dt] !== undefined ? chart[dt] : 1;
  }
  return mult;
}
