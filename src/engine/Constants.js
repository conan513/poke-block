// src/engine/Constants.js
export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;
export const RENDER_DISTANCE = 5;

export const BLOCK = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, WATER: 5,
  SNOW: 6, GRAVEL: 7, OAK_LOG: 8, OAK_LEAVES: 9, OAK_PLANKS: 10,
  STONE_BRICKS: 11, COBBLESTONE: 12, BEDROCK: 13, GLASS: 14,
  TALL_GRASS: 15, FLOWER: 16, LAVA: 17, OBSIDIAN: 18,
  BIRCH_LOG: 19, BIRCH_LEAVES: 20, SPRUCE_LOG: 21, SPRUCE_LEAVES: 22,
  RED_SAND: 23, CACTUS: 24, ICE: 25, PACKED_ICE: 26,
  PODZOL: 27, JUNGLE_LOG: 28, JUNGLE_LEAVES: 29, CORAL: 30, GLOWSTONE: 31,
  // Ores
  COAL_ORE: 32, IRON_ORE: 33, GOLD_ORE: 34, DIAMOND_ORE: 35,
  LAPIS_ORE: 36, REDSTONE_ORE: 37,
  // Utility blocks
  CRAFTING_TABLE: 38, FURNACE: 39, CHEST: 40,
  // Farming
  FARMLAND: 41, WHEAT_0: 42, WHEAT_1: 43, WHEAT_2: 44, WHEAT_3: 45,
  // Light
  TORCH: 46,
  // Mineral blocks
  IRON_BLOCK: 47, GOLD_BLOCK: 48, DIAMOND_BLOCK: 49,
};

// Pure item IDs (non-placeable, >= 100)
export const ITEM = {
  STICK: 100, COAL: 101, IRON_INGOT: 102, GOLD_INGOT: 103,
  DIAMOND: 104, LAPIS: 105, REDSTONE: 106,
  WHEAT: 107, WHEAT_SEEDS: 108,
  APPLE: 110, BREAD: 111,
  WOODEN_PICKAXE: 120, STONE_PICKAXE: 121, IRON_PICKAXE: 122, DIAMOND_PICKAXE: 123,
  WOODEN_AXE: 124, STONE_AXE: 125, IRON_AXE: 126, DIAMOND_AXE: 127,
  WOODEN_SWORD: 128, STONE_SWORD: 129, IRON_SWORD: 130, DIAMOND_SWORD: 131,
  WOODEN_SHOVEL: 132, STONE_SHOVEL: 133, IRON_SHOVEL: 134, DIAMOND_SHOVEL: 135,
  WOODEN_HOE: 136, STONE_HOE: 137, IRON_HOE: 138, DIAMOND_HOE: 139,
};

// Block hardness in seconds (bare hand)
export const BLOCK_HARDNESS = {
  [BLOCK.DIRT]: 0.75, [BLOCK.GRASS]: 0.9, [BLOCK.SAND]: 0.75,
  [BLOCK.GRAVEL]: 0.9, [BLOCK.STONE]: 7.5, [BLOCK.COBBLESTONE]: 10,
  [BLOCK.STONE_BRICKS]: 10, [BLOCK.OAK_LOG]: 3, [BLOCK.BIRCH_LOG]: 3,
  [BLOCK.SPRUCE_LOG]: 3, [BLOCK.JUNGLE_LOG]: 3, [BLOCK.OAK_PLANKS]: 3,
  [BLOCK.OAK_LEAVES]: 0.4, [BLOCK.BIRCH_LEAVES]: 0.4,
  [BLOCK.SPRUCE_LEAVES]: 0.4, [BLOCK.JUNGLE_LEAVES]: 0.4,
  [BLOCK.GLASS]: 0.45, [BLOCK.OBSIDIAN]: 50,
  [BLOCK.COAL_ORE]: 15, [BLOCK.IRON_ORE]: 15, [BLOCK.GOLD_ORE]: 15,
  [BLOCK.DIAMOND_ORE]: 15, [BLOCK.LAPIS_ORE]: 15, [BLOCK.REDSTONE_ORE]: 15,
  [BLOCK.CRAFTING_TABLE]: 3.75, [BLOCK.FURNACE]: 17.5, [BLOCK.CHEST]: 3.75,
  [BLOCK.ICE]: 0.75, [BLOCK.PACKED_ICE]: 1.5, [BLOCK.SNOW]: 0.5,
  [BLOCK.FARMLAND]: 0.75, [BLOCK.TORCH]: 0.1,
  [BLOCK.IRON_BLOCK]: 30, [BLOCK.GOLD_BLOCK]: 30, [BLOCK.DIAMOND_BLOCK]: 30,
  [BLOCK.GLOWSTONE]: 1.5, [BLOCK.BEDROCK]: Infinity,
  [BLOCK.WHEAT_0]: 0.05, [BLOCK.WHEAT_1]: 0.05, [BLOCK.WHEAT_2]: 0.05, [BLOCK.WHEAT_3]: 0.05,
};

// Block drops: blockId -> [{id, count, chance?}]  count can be [min,max]
export const BLOCK_DROPS = {
  [BLOCK.GRASS]: [{ id: BLOCK.DIRT, count: 1 }],
  [BLOCK.DIRT]: [{ id: BLOCK.DIRT, count: 1 }],
  [BLOCK.STONE]: [{ id: BLOCK.COBBLESTONE, count: 1 }],
  [BLOCK.COBBLESTONE]: [{ id: BLOCK.COBBLESTONE, count: 1 }],
  [BLOCK.STONE_BRICKS]: [{ id: BLOCK.STONE_BRICKS, count: 1 }],
  [BLOCK.SAND]: [{ id: BLOCK.SAND, count: 1 }],
  [BLOCK.GRAVEL]: [{ id: BLOCK.GRAVEL, count: 1 }],
  [BLOCK.OAK_LOG]: [{ id: BLOCK.OAK_LOG, count: 1 }],
  [BLOCK.BIRCH_LOG]: [{ id: BLOCK.BIRCH_LOG, count: 1 }],
  [BLOCK.SPRUCE_LOG]: [{ id: BLOCK.SPRUCE_LOG, count: 1 }],
  [BLOCK.JUNGLE_LOG]: [{ id: BLOCK.JUNGLE_LOG, count: 1 }],
  [BLOCK.OAK_PLANKS]: [{ id: BLOCK.OAK_PLANKS, count: 1 }],
  [BLOCK.OAK_LEAVES]: [{ id: ITEM.APPLE, count: 1, chance: 0.05 }],
  [BLOCK.BIRCH_LEAVES]: [], [BLOCK.SPRUCE_LEAVES]: [], [BLOCK.JUNGLE_LEAVES]: [],
  [BLOCK.COAL_ORE]: [{ id: ITEM.COAL, count: 1 }],
  [BLOCK.IRON_ORE]: [{ id: BLOCK.IRON_ORE, count: 1 }],
  [BLOCK.GOLD_ORE]: [{ id: BLOCK.GOLD_ORE, count: 1 }],
  [BLOCK.DIAMOND_ORE]: [{ id: ITEM.DIAMOND, count: 1 }],
  [BLOCK.LAPIS_ORE]: [{ id: ITEM.LAPIS, count: [4, 9] }],
  [BLOCK.REDSTONE_ORE]: [{ id: ITEM.REDSTONE, count: [4, 5] }],
  [BLOCK.GLASS]: [],
  [BLOCK.GLOWSTONE]: [{ id: BLOCK.GLOWSTONE, count: 1 }],
  [BLOCK.CRAFTING_TABLE]: [{ id: BLOCK.CRAFTING_TABLE, count: 1 }],
  [BLOCK.FURNACE]: [{ id: BLOCK.FURNACE, count: 1 }],
  [BLOCK.CHEST]: [{ id: BLOCK.CHEST, count: 1 }],
  [BLOCK.ICE]: [], [BLOCK.PACKED_ICE]: [{ id: BLOCK.PACKED_ICE, count: 1 }],
  [BLOCK.OBSIDIAN]: [{ id: BLOCK.OBSIDIAN, count: 1 }],
  [BLOCK.FARMLAND]: [{ id: BLOCK.DIRT, count: 1 }],
  [BLOCK.WHEAT_3]: [{ id: ITEM.WHEAT, count: [1, 3] }, { id: ITEM.WHEAT_SEEDS, count: [0, 3] }],
  [BLOCK.WHEAT_2]: [{ id: ITEM.WHEAT_SEEDS, count: 1 }],
  [BLOCK.WHEAT_1]: [{ id: ITEM.WHEAT_SEEDS, count: 1 }],
  [BLOCK.WHEAT_0]: [{ id: ITEM.WHEAT_SEEDS, count: 1 }],
  [BLOCK.IRON_BLOCK]: [{ id: BLOCK.IRON_BLOCK, count: 1 }],
  [BLOCK.GOLD_BLOCK]: [{ id: BLOCK.GOLD_BLOCK, count: 1 }],
  [BLOCK.DIAMOND_BLOCK]: [{ id: BLOCK.DIAMOND_BLOCK, count: 1 }],
  [BLOCK.TORCH]: [{ id: BLOCK.TORCH, count: 1 }],
  [BLOCK.SNOW]: [{ id: BLOCK.SNOW, count: 1 }],
  [BLOCK.PODZOL]: [{ id: BLOCK.DIRT, count: 1 }],
  [BLOCK.RED_SAND]: [{ id: BLOCK.RED_SAND, count: 1 }],
};

// Tool affinity per block
export const BLOCK_TOOL = {
  [BLOCK.STONE]: 'pickaxe', [BLOCK.COBBLESTONE]: 'pickaxe',
  [BLOCK.STONE_BRICKS]: 'pickaxe', [BLOCK.COAL_ORE]: 'pickaxe',
  [BLOCK.IRON_ORE]: 'pickaxe', [BLOCK.GOLD_ORE]: 'pickaxe',
  [BLOCK.DIAMOND_ORE]: 'pickaxe', [BLOCK.LAPIS_ORE]: 'pickaxe',
  [BLOCK.REDSTONE_ORE]: 'pickaxe', [BLOCK.OBSIDIAN]: 'pickaxe',
  [BLOCK.IRON_BLOCK]: 'pickaxe', [BLOCK.GOLD_BLOCK]: 'pickaxe',
  [BLOCK.DIAMOND_BLOCK]: 'pickaxe', [BLOCK.FURNACE]: 'pickaxe',
  [BLOCK.DIRT]: 'shovel', [BLOCK.GRASS]: 'shovel', [BLOCK.SAND]: 'shovel',
  [BLOCK.GRAVEL]: 'shovel', [BLOCK.FARMLAND]: 'shovel', [BLOCK.SNOW]: 'shovel',
  [BLOCK.OAK_LOG]: 'axe', [BLOCK.BIRCH_LOG]: 'axe',
  [BLOCK.SPRUCE_LOG]: 'axe', [BLOCK.JUNGLE_LOG]: 'axe',
  [BLOCK.OAK_PLANKS]: 'axe', [BLOCK.CRAFTING_TABLE]: 'axe', [BLOCK.CHEST]: 'axe',
};

// Tool speed multipliers: toolItemId -> { toolType: speedMultiplier }
export const TOOL_SPEED = {
  [ITEM.WOODEN_PICKAXE]:  { pickaxe: 2 },  [ITEM.STONE_PICKAXE]:   { pickaxe: 4 },
  [ITEM.IRON_PICKAXE]:    { pickaxe: 6 },  [ITEM.DIAMOND_PICKAXE]: { pickaxe: 8 },
  [ITEM.WOODEN_AXE]:      { axe: 2 },      [ITEM.STONE_AXE]:       { axe: 4 },
  [ITEM.IRON_AXE]:        { axe: 6 },      [ITEM.DIAMOND_AXE]:     { axe: 8 },
  [ITEM.WOODEN_SHOVEL]:   { shovel: 2 },   [ITEM.STONE_SHOVEL]:    { shovel: 4 },
  [ITEM.IRON_SHOVEL]:     { shovel: 6 },   [ITEM.DIAMOND_SHOVEL]:  { shovel: 8 },
  [ITEM.WOODEN_HOE]:      { hoe: 2 },      [ITEM.STONE_HOE]:       { hoe: 4 },
  [ITEM.IRON_HOE]:        { hoe: 6 },      [ITEM.DIAMOND_HOE]:     { hoe: 8 },
};
