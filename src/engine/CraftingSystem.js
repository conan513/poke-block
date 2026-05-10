// src/engine/CraftingSystem.js – Shaped & shapeless crafting recipes
import { BLOCK, ITEM } from './Constants.js';

// Helper to build a shaped recipe
// pattern: array of 3 strings (rows), each char = ingredient letter
// ingredients: { letter: itemId }
// output: { id, count }
function shaped(pattern, ingredients, output) {
  return { type: 'shaped', pattern, ingredients, output };
}
function shapeless(ingredients, output) {
  return { type: 'shapeless', ingredients, output };
}

// All recipes
const RECIPES = [
  // ---- Wood & Planks ----
  shaped(['L  ', '   ', '   '], { L: BLOCK.OAK_LOG },     { id: BLOCK.OAK_PLANKS,    count: 4 }),
  shaped(['L  ', '   ', '   '], { L: BLOCK.BIRCH_LOG },   { id: BLOCK.OAK_PLANKS,    count: 4 }),
  shaped(['L  ', '   ', '   '], { L: BLOCK.SPRUCE_LOG },  { id: BLOCK.OAK_PLANKS,    count: 4 }),
  shaped(['L  ', '   ', '   '], { L: BLOCK.JUNGLE_LOG },  { id: BLOCK.OAK_PLANKS,    count: 4 }),
  // Sticks
  shaped(['P  ', 'P  ', '   '], { P: BLOCK.OAK_PLANKS },  { id: ITEM.STICK,          count: 4 }),
  // Crafting Table
  shaped(['PP ', 'PP ', '   '], { P: BLOCK.OAK_PLANKS },  { id: BLOCK.CRAFTING_TABLE, count: 1 }),
  // Chest
  shaped(['PPP', 'P P', 'PPP'], { P: BLOCK.OAK_PLANKS },  { id: BLOCK.CHEST,         count: 1 }),
  // Furnace
  shaped(['CCC', 'C C', 'CCC'], { C: BLOCK.COBBLESTONE }, { id: BLOCK.FURNACE,       count: 1 }),
  // Glass pane (placeholder – makes glass)
  shaped(['GGG', 'GGG', '   '], { G: BLOCK.SAND },        { id: BLOCK.GLASS,         count: 6 }),
  // Stone Bricks
  shaped(['SS ', 'SS ', '   '], { S: BLOCK.STONE },       { id: BLOCK.STONE_BRICKS,  count: 4 }),

  // ---- Pickaxes ----
  shaped(['PPP', ' S ', ' S '], { P: BLOCK.OAK_PLANKS,   S: ITEM.STICK }, { id: ITEM.WOODEN_PICKAXE, count: 1 }),
  shaped(['CCC', ' S ', ' S '], { C: BLOCK.COBBLESTONE,  S: ITEM.STICK }, { id: ITEM.STONE_PICKAXE,  count: 1 }),
  shaped(['III', ' S ', ' S '], { I: ITEM.IRON_INGOT,    S: ITEM.STICK }, { id: ITEM.IRON_PICKAXE,   count: 1 }),
  shaped(['DDD', ' S ', ' S '], { D: ITEM.DIAMOND,       S: ITEM.STICK }, { id: ITEM.DIAMOND_PICKAXE,count: 1 }),

  // ---- Axes ----
  shaped(['PP ', 'PS ', ' S '], { P: BLOCK.OAK_PLANKS,   S: ITEM.STICK }, { id: ITEM.WOODEN_AXE, count: 1 }),
  shaped(['CC ', 'CS ', ' S '], { C: BLOCK.COBBLESTONE,  S: ITEM.STICK }, { id: ITEM.STONE_AXE,  count: 1 }),
  shaped(['II ', 'IS ', ' S '], { I: ITEM.IRON_INGOT,    S: ITEM.STICK }, { id: ITEM.IRON_AXE,   count: 1 }),
  shaped(['DD ', 'DS ', ' S '], { D: ITEM.DIAMOND,       S: ITEM.STICK }, { id: ITEM.DIAMOND_AXE,count: 1 }),

  // ---- Shovels ----
  shaped([' P ', ' S ', ' S '], { P: BLOCK.OAK_PLANKS,   S: ITEM.STICK }, { id: ITEM.WOODEN_SHOVEL, count: 1 }),
  shaped([' C ', ' S ', ' S '], { C: BLOCK.COBBLESTONE,  S: ITEM.STICK }, { id: ITEM.STONE_SHOVEL,  count: 1 }),
  shaped([' I ', ' S ', ' S '], { I: ITEM.IRON_INGOT,    S: ITEM.STICK }, { id: ITEM.IRON_SHOVEL,   count: 1 }),
  shaped([' D ', ' S ', ' S '], { D: ITEM.DIAMOND,       S: ITEM.STICK }, { id: ITEM.DIAMOND_SHOVEL,count: 1 }),

  // ---- Swords ----
  shaped([' P ', ' P ', ' S '], { P: BLOCK.OAK_PLANKS,   S: ITEM.STICK }, { id: ITEM.WOODEN_SWORD, count: 1 }),
  shaped([' C ', ' C ', ' S '], { C: BLOCK.COBBLESTONE,  S: ITEM.STICK }, { id: ITEM.STONE_SWORD,  count: 1 }),
  shaped([' I ', ' I ', ' S '], { I: ITEM.IRON_INGOT,    S: ITEM.STICK }, { id: ITEM.IRON_SWORD,   count: 1 }),
  shaped([' D ', ' D ', ' S '], { D: ITEM.DIAMOND,       S: ITEM.STICK }, { id: ITEM.DIAMOND_SWORD,count: 1 }),

  // ---- Hoes ----
  shaped(['PP ', ' S ', ' S '], { P: BLOCK.OAK_PLANKS,   S: ITEM.STICK }, { id: ITEM.WOODEN_HOE, count: 1 }),
  shaped(['CC ', ' S ', ' S '], { C: BLOCK.COBBLESTONE,  S: ITEM.STICK }, { id: ITEM.STONE_HOE,  count: 1 }),
  shaped(['II ', ' S ', ' S '], { I: ITEM.IRON_INGOT,    S: ITEM.STICK }, { id: ITEM.IRON_HOE,   count: 1 }),
  shaped(['DD ', ' S ', ' S '], { D: ITEM.DIAMOND,       S: ITEM.STICK }, { id: ITEM.DIAMOND_HOE,count: 1 }),

  // ---- Mineral blocks ----
  shaped(['III', 'III', 'III'], { I: ITEM.IRON_INGOT },   { id: BLOCK.IRON_BLOCK,    count: 1 }),
  shaped(['GGG', 'GGG', 'GGG'], { G: ITEM.GOLD_INGOT },   { id: BLOCK.GOLD_BLOCK,    count: 1 }),
  shaped(['DDD', 'DDD', 'DDD'], { D: ITEM.DIAMOND },       { id: BLOCK.DIAMOND_BLOCK, count: 1 }),

  // ---- Food ----
  shaped(['WWW', '   ', '   '], { W: ITEM.WHEAT },        { id: ITEM.BREAD,          count: 1 }),
];

// Compact a 2×2 or 3×3 grid (remove leading/trailing empty rows+cols)
function compact(grid, size) {
  const rows = [];
  for (let r = 0; r < size; r++) {
    let row = '';
    for (let c = 0; c < size; c++) row += (grid[r * size + c] ?? null) !== null ? 'X' : ' ';
    rows.push(row);
  }
  // trim empty rows
  let top = 0, bot = size - 1;
  while (top <= bot && rows[top].trim() === '') top++;
  while (bot >= top && rows[bot].trim() === '') bot--;
  const trimmed = rows.slice(top, bot + 1);
  // trim empty cols
  let left = size - 1, right = 0;
  for (const r of trimmed) {
    for (let c = 0; c < size; c++) {
      if (r[c] !== ' ') { left = Math.min(left, c); right = Math.max(right, c); }
    }
  }
  if (trimmed.length === 0) return { rows: [], items: [], width: 0, height: 0 };
  const w = right - left + 1, h = trimmed.length;
  const items = [];
  for (const r of trimmed) {
    for (let c = left; c <= right; c++) items.push(r[c] !== ' ' ? 'X' : ' ');
  }
  return { rows: trimmed, items, width: w, height: h };
}

export class CraftingSystem {
  /**
   * Match a crafting grid against all recipes.
   * @param {Array} grid  – array of null|{id,count} slots
   * @param {number} size – 2 or 3
   * @returns {{id,count}|null}
   */
  static match(grid, size) {
    // Build compact shape + item list from player grid
    const playerItems = grid.map(s => s ? s.id : null);
    const pc = this._compact(playerItems, size);

    for (const recipe of RECIPES) {
      if (recipe.type === 'shaped') {
        const result = this._matchShaped(pc, recipe, size);
        if (result) return result;
      }
    }
    return null;
  }

  static _compact(items, size) {
    let top = size, bot = -1, left = size, right = -1;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (items[r * size + c] !== null) {
          top = Math.min(top, r); bot = Math.max(bot, r);
          left = Math.min(left, c); right = Math.max(right, c);
        }
      }
    }
    if (bot < 0) return { w: 0, h: 0, cells: [] };
    const w = right - left + 1, h = bot - top + 1;
    const cells = [];
    for (let r = top; r <= bot; r++)
      for (let c = left; c <= right; c++)
        cells.push(items[r * size + c]);
    return { w, h, cells };
  }

  static _matchShaped(pc, recipe, _size) {
    // Parse recipe pattern
    const pw = recipe.pattern[0].length;
    const ph = recipe.pattern.length;
    if (pc.w !== pw || pc.h !== ph) return null;

    for (let i = 0; i < pc.cells.length; i++) {
      const row = Math.floor(i / pw);
      const col = i % pw;
      const recipeChar = recipe.pattern[row][col];
      const playerId   = pc.cells[i];

      if (recipeChar === ' ') {
        if (playerId !== null) return null;
      } else {
        const needed = recipe.ingredients[recipeChar];
        if (playerId !== needed) return null;
      }
    }
    return { ...recipe.output };
  }

  /** List all recipes for display */
  static allRecipes() { return RECIPES; }
}
