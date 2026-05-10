// src/player/Inventory.js – Slot-based inventory with hotbar
import { BLOCK, ITEM } from '../engine/Constants.js';

export const ITEM_META = {
  // ---- Placeable blocks ----
  [BLOCK.DIRT]:           { name: 'Dirt',            icon: 'block/dirt.png', maxStack: 64, placeable: true },
  [BLOCK.GRASS]:          { name: 'Grass Block',      icon: 'block/grass_block_side.png', maxStack: 64, placeable: true },
  [BLOCK.STONE]:          { name: 'Stone',            icon: 'block/stone.png', maxStack: 64, placeable: true },
  [BLOCK.COBBLESTONE]:    { name: 'Cobblestone',      icon: 'block/cobblestone.png', maxStack: 64, placeable: true },
  [BLOCK.SAND]:           { name: 'Sand',             icon: 'block/sand.png', maxStack: 64, placeable: true },
  [BLOCK.RED_SAND]:       { name: 'Red Sand',         icon: 'block/red_sand.png', maxStack: 64, placeable: true },
  [BLOCK.GRAVEL]:         { name: 'Gravel',           icon: 'block/gravel.png', maxStack: 64, placeable: true },
  [BLOCK.OAK_LOG]:        { name: 'Oak Log',          icon: 'block/oak_log.png', maxStack: 64, placeable: true },
  [BLOCK.BIRCH_LOG]:      { name: 'Birch Log',        icon: 'block/birch_log.png', maxStack: 64, placeable: true },
  [BLOCK.SPRUCE_LOG]:     { name: 'Spruce Log',       icon: 'block/spruce_log.png', maxStack: 64, placeable: true },
  [BLOCK.JUNGLE_LOG]:     { name: 'Jungle Log',       icon: 'block/jungle_log.png', maxStack: 64, placeable: true },
  [BLOCK.OAK_PLANKS]:     { name: 'Oak Planks',       icon: 'block/oak_planks.png', maxStack: 64, placeable: true },
  [BLOCK.OAK_LEAVES]:     { name: 'Oak Leaves',       icon: 'block/oak_leaves.png', maxStack: 64, placeable: true },
  [BLOCK.GLASS]:          { name: 'Glass',            icon: 'block/glass.png', maxStack: 64, placeable: true },
  [BLOCK.STONE_BRICKS]:   { name: 'Stone Bricks',     icon: 'block/stone_bricks.png', maxStack: 64, placeable: true },
  [BLOCK.OBSIDIAN]:       { name: 'Obsidian',         icon: 'block/obsidian.png', maxStack: 64, placeable: true },
  [BLOCK.GLOWSTONE]:      { name: 'Glowstone',        icon: 'block/glowstone.png', maxStack: 64, placeable: true },
  [BLOCK.TORCH]:          { name: 'Torch',            icon: 'block/torch.png', maxStack: 64, placeable: true },
  [BLOCK.CRAFTING_TABLE]: { name: 'Crafting Table',   icon: 'block/crafting_table_top.png', maxStack: 64, placeable: true },
  [BLOCK.FURNACE]:        { name: 'Furnace',          icon: 'block/furnace_front.png', maxStack: 64, placeable: true },
  [BLOCK.CHEST]:          { name: 'Chest',            icon: 'block/barrel_side.png', maxStack: 64, placeable: true },
  [BLOCK.COAL_ORE]:       { name: 'Coal Ore',         icon: 'block/coal_ore.png', maxStack: 64, placeable: true },
  [BLOCK.IRON_ORE]:       { name: 'Iron Ore',         icon: 'block/iron_ore.png', maxStack: 64, placeable: true },
  [BLOCK.GOLD_ORE]:       { name: 'Gold Ore',         icon: 'block/gold_ore.png', maxStack: 64, placeable: true },
  [BLOCK.DIAMOND_ORE]:    { name: 'Diamond Ore',      icon: 'block/diamond_ore.png', maxStack: 64, placeable: true },
  [BLOCK.IRON_BLOCK]:     { name: 'Iron Block',       icon: 'block/iron_block.png', maxStack: 64, placeable: true },
  [BLOCK.GOLD_BLOCK]:     { name: 'Gold Block',       icon: 'block/gold_block.png', maxStack: 64, placeable: true },
  [BLOCK.DIAMOND_BLOCK]:  { name: 'Diamond Block',    icon: 'block/diamond_block.png', maxStack: 64, placeable: true },
  [BLOCK.ICE]:            { name: 'Ice',              icon: 'block/ice.png', maxStack: 64, placeable: true },
  [BLOCK.PACKED_ICE]:     { name: 'Packed Ice',       icon: 'block/packed_ice.png', maxStack: 64, placeable: true },
  [BLOCK.SNOW]:           { name: 'Snow',             icon: 'block/snow.png', maxStack: 64, placeable: true },
  // ---- Pure items ----
  [ITEM.STICK]:           { name: 'Stick',            icon: 'item/stick.png',  maxStack: 64, placeable: false },
  [ITEM.COAL]:            { name: 'Coal',             icon: 'item/coal.png', maxStack: 64, placeable: false },
  [ITEM.IRON_INGOT]:      { name: 'Iron Ingot',       icon: 'item/iron_ingot.png', maxStack: 64, placeable: false },
  [ITEM.GOLD_INGOT]:      { name: 'Gold Ingot',       icon: 'item/gold_ingot.png', maxStack: 64, placeable: false },
  [ITEM.DIAMOND]:         { name: 'Diamond',          icon: 'item/diamond.png', maxStack: 64, placeable: false },
  [ITEM.LAPIS]:           { name: 'Lapis Lazuli',     icon: 'item/lapis_lazuli.png', maxStack: 64, placeable: false },
  [ITEM.REDSTONE]:        { name: 'Redstone',         icon: 'item/redstone.png', maxStack: 64, placeable: false },
  [ITEM.WHEAT]:           { name: 'Wheat',            icon: 'item/wheat.png', maxStack: 64, placeable: false },
  [ITEM.WHEAT_SEEDS]:     { name: 'Wheat Seeds',      icon: 'item/wheat_seeds.png', maxStack: 64, placeable: false },
  [ITEM.APPLE]:           { name: 'Apple',            icon: 'item/apple.png', maxStack: 64, placeable: false, food: 4,  saturation: 2.4 },
  [ITEM.BREAD]:           { name: 'Bread',            icon: 'item/bread.png', maxStack: 64, placeable: false, food: 5,  saturation: 6.0 },
  // ---- Tools ----
  [ITEM.WOODEN_PICKAXE]:  { name: 'Wooden Pickaxe',   icon: 'item/wooden_pickaxe.png', maxStack: 1, placeable: false, tool: 'pickaxe', tier: 0 },
  [ITEM.STONE_PICKAXE]:   { name: 'Stone Pickaxe',    icon: 'item/stone_pickaxe.png', maxStack: 1, placeable: false, tool: 'pickaxe', tier: 1 },
  [ITEM.IRON_PICKAXE]:    { name: 'Iron Pickaxe',     icon: 'item/iron_pickaxe.png', maxStack: 1, placeable: false, tool: 'pickaxe', tier: 2 },
  [ITEM.DIAMOND_PICKAXE]: { name: 'Diamond Pickaxe',  icon: 'item/diamond_pickaxe.png', maxStack: 1, placeable: false, tool: 'pickaxe', tier: 3 },
  [ITEM.WOODEN_AXE]:      { name: 'Wooden Axe',       icon: 'item/wooden_axe.png', maxStack: 1, placeable: false, tool: 'axe',     tier: 0 },
  [ITEM.STONE_AXE]:       { name: 'Stone Axe',        icon: 'item/stone_axe.png', maxStack: 1, placeable: false, tool: 'axe',     tier: 1 },
  [ITEM.IRON_AXE]:        { name: 'Iron Axe',         icon: 'item/iron_axe.png', maxStack: 1, placeable: false, tool: 'axe',     tier: 2 },
  [ITEM.DIAMOND_AXE]:     { name: 'Diamond Axe',      icon: 'item/diamond_axe.png', maxStack: 1, placeable: false, tool: 'axe',     tier: 3 },
  [ITEM.WOODEN_SWORD]:    { name: 'Wooden Sword',      icon: 'item/wooden_sword.png', maxStack: 1, placeable: false, tool: 'sword',   tier: 0 },
  [ITEM.STONE_SWORD]:     { name: 'Stone Sword',       icon: 'item/stone_sword.png', maxStack: 1, placeable: false, tool: 'sword',   tier: 1 },
  [ITEM.IRON_SWORD]:      { name: 'Iron Sword',        icon: 'item/iron_sword.png', maxStack: 1, placeable: false, tool: 'sword',   tier: 2 },
  [ITEM.DIAMOND_SWORD]:   { name: 'Diamond Sword',     icon: 'item/diamond_sword.png', maxStack: 1, placeable: false, tool: 'sword',   tier: 3 },
  [ITEM.WOODEN_SHOVEL]:   { name: 'Wooden Shovel',    icon: 'item/wooden_shovel.png', maxStack: 1, placeable: false, tool: 'shovel',  tier: 0 },
  [ITEM.STONE_SHOVEL]:    { name: 'Stone Shovel',     icon: 'item/stone_shovel.png', maxStack: 1, placeable: false, tool: 'shovel',  tier: 1 },
  [ITEM.IRON_SHOVEL]:     { name: 'Iron Shovel',      icon: 'item/iron_shovel.png', maxStack: 1, placeable: false, tool: 'shovel',  tier: 2 },
  [ITEM.DIAMOND_SHOVEL]:  { name: 'Diamond Shovel',   icon: 'item/diamond_shovel.png', maxStack: 1, placeable: false, tool: 'shovel',  tier: 3 },
  [ITEM.WOODEN_HOE]:      { name: 'Wooden Hoe',       icon: 'item/wooden_hoe.png', maxStack: 1, placeable: false, tool: 'hoe',     tier: 0 },
  [ITEM.STONE_HOE]:       { name: 'Stone Hoe',        icon: 'item/stone_hoe.png', maxStack: 1, placeable: false, tool: 'hoe',     tier: 1 },
  [ITEM.IRON_HOE]:        { name: 'Iron Hoe',         icon: 'item/iron_hoe.png', maxStack: 1, placeable: false, tool: 'hoe',     tier: 2 },
  [ITEM.DIAMOND_HOE]:     { name: 'Diamond Hoe',      icon: 'item/diamond_hoe.png', maxStack: 1, placeable: false, tool: 'hoe',     tier: 3 },
};

export class Inventory {
  constructor() {
    // 0-8: hotbar,  9-35: bag
    this.slots = new Array(36).fill(null);
    this.selectedHotbarSlot = 0;
    // 2×2 player crafting
    this.craftingGrid   = new Array(4).fill(null);
    this.craftingOutput = null;
    // 3×3 table crafting
    this.tableGrid      = new Array(9).fill(null);
    this.tableOutput    = null;
  }

  getSelectedItem() { return this.slots[this.selectedHotbarSlot]; }

  /** Returns true if at least one item was added */
  addItem(itemId, count = 1) {
    const meta     = ITEM_META[itemId];
    const maxStack = meta?.maxStack ?? 64;
    // Stack onto existing
    for (let i = 0; i < 36 && count > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === itemId && s.count < maxStack) {
        const add = Math.min(count, maxStack - s.count);
        s.count += add; count -= add;
      }
    }
    // Fill empty slots
    while (count > 0) {
      const empty = this.slots.findIndex(s => s === null);
      if (empty === -1) return false;
      const add = Math.min(count, maxStack);
      this.slots[empty] = { id: itemId, count: add };
      count -= add;
    }
    return true;
  }

  removeItem(slotIndex, count = 1) {
    const s = this.slots[slotIndex];
    if (!s) return false;
    s.count -= count;
    if (s.count <= 0) this.slots[slotIndex] = null;
    return true;
  }

  consumeSelected(count = 1) {
    return this.removeItem(this.selectedHotbarSlot, count);
  }

  /** Count how many of itemId are in inventory */
  countOf(itemId) {
    return this.slots.reduce((acc, s) => acc + (s?.id === itemId ? s.count : 0), 0);
  }

  /** Remove up to 'count' of itemId from anywhere */
  consume(itemId, count) {
    for (let i = 0; i < 36 && count > 0; i++) {
      const s = this.slots[i];
      if (s?.id === itemId) {
        const take = Math.min(s.count, count);
        s.count -= take; count -= take;
        if (s.count <= 0) this.slots[i] = null;
      }
    }
    return count === 0;
  }

  selectSlot(i) { this.selectedHotbarSlot = ((i % 9) + 9) % 9; }

  scrollSlot(delta) { this.selectSlot(this.selectedHotbarSlot + delta); }
}
