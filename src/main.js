// src/main.js – Entry point
import * as THREE from 'three';
import { World }            from './engine/World.js';
import { Renderer }         from './engine/Renderer.js';
import { PlayerController } from './player/PlayerController.js';
import { PlayerModel }      from './player/PlayerModel.js';
import { SkinLoader }       from './player/SkinLoader.js';
import { Inventory, ITEM_META } from './player/Inventory.js';
import { PokemonSpawner }   from './pokemon/PokemonSpawner.js';
import { BattleSystem }     from './battle/BattleSystem.js';
import { POKEDEX }          from './data/pokedex.js';
import { setLoadingProgress } from './ui/Loading.js';
import { initHUD, updateHUD } from './ui/HUD.js';
import { initPokedexUI }    from './ui/PokedexUI.js';
import { ItemDropSystem }   from './engine/ItemDrop.js';
import { BlockInteraction } from './engine/BlockInteraction.js';
import { DayNightCycle }    from './engine/DayNightCycle.js';
import { WeatherSystem }    from './engine/WeatherSystem.js';
import { AudioManager }     from './engine/AudioManager.js';
import { FurnaceSystem }    from './engine/FurnaceSystem.js';
import { CraftingSystem }   from './engine/CraftingSystem.js';
import { BLOCK, ITEM }      from './engine/Constants.js';

let renderer, world, player, playerModel, spawner, battle;
let inventory, itemDrops, blockInteraction, dayNight, weather, audio, furnace;
let clock, running = false;

// InventoryUI state
let _invOpen = false;
let _craft2x2 = [null, null, null, null];

async function init() {
  setLoadingProgress(5,  'Setting up renderer…');
  const canvas = document.getElementById('game-canvas');
  renderer = new Renderer(canvas);

  setLoadingProgress(15, 'Generating world…');
  world = new World(renderer.scene);
  await world.init();

  setLoadingProgress(40, 'Loading textures…');
  await world.textureLoader.loadPack('/textures/Template/assets/minecraft/textures/block/');

  setLoadingProgress(55, 'Building player…');
  playerModel = new PlayerModel(renderer.scene);
  const skin  = await SkinLoader.load('/skins/SkinMC-939e32ca-ed75-43a0-a5da-344faf22f7a3.png');
  playerModel.applySkin(skin);

  // ---- Core systems ----
  audio     = new AudioManager();
  window.audioManager = audio;

  inventory = new Inventory();
  // Give player some starting items
  inventory.addItem(BLOCK.OAK_PLANKS, 16);
  inventory.addItem(BLOCK.DIRT,        8);
  inventory.addItem(ITEM.WHEAT_SEEDS,  4);
  inventory.addItem(ITEM.APPLE,        3);

  player = new PlayerController(renderer.camera, playerModel, world);
  player.world     = world;
  player.inventory = inventory;
  player.pokeballs = 10;

  itemDrops      = new ItemDropSystem(renderer.scene);
  blockInteraction = new BlockInteraction(world, inventory, itemDrops, renderer.scene, audio);

  dayNight = new DayNightCycle(renderer.scene, renderer);
  window.dayNight = dayNight;

  weather = new WeatherSystem(renderer.scene, dayNight);
  window.weather = weather;

  furnace = new FurnaceSystem(inventory, audio);

  setLoadingProgress(72, 'Spawning Pokémon…');
  spawner = new PokemonSpawner(renderer.scene, world);
  await spawner.init();

  setLoadingProgress(88, 'Initializing battle system…');
  battle = new BattleSystem(spawner);
  spawner.onEncounter = (wild, pos) => battle.startBattle(wild, player);

  setLoadingProgress(95, 'Setting up UI…');
  initHUD(player);
  initPokedexUI();
  _buildInventoryUI();

  setLoadingProgress(100, 'Ready!');
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
    showStarterSelect();
  }, 600);
}

// ---- Inventory UI ----
function _buildInventoryUI() {
  // Build bag slots (slots 9-35)
  const bagEl = document.getElementById('inv-bag');
  if (bagEl) {
    for (let i = 9; i < 36; i++) {
      const d = document.createElement('div');
      d.className = 'inv-slot'; d.id = `inv-s-${i}`;
      d.addEventListener('click', () => _invSlotClick(i));
      bagEl.appendChild(d);
    }
  }
  // Hotbar row (slots 0-8)
  const hbEl = document.getElementById('inv-hotbar-row');
  if (hbEl) {
    for (let i = 0; i < 9; i++) {
      const d = document.createElement('div');
      d.className = 'inv-slot'; d.id = `inv-s-${i}`;
      d.addEventListener('click', () => _invSlotClick(i));
      hbEl.appendChild(d);
    }
  }
  // 2x2 crafting grid
  const craftGrid = document.getElementById('craft-grid-2x2');
  if (craftGrid) {
    for (let i = 0; i < 4; i++) {
      const d = document.createElement('div');
      d.className = 'inv-slot'; d.id = `craft-2x2-${i}`;
      d.addEventListener('click', () => _craftSlotClick(i));
      craftGrid.appendChild(d);
    }
  }
  // Craft output
  const outEl = document.getElementById('craft-output-2x2');
  if (outEl) outEl.addEventListener('click', _takeCraftResult);

  // Close button
  document.getElementById('inv-close')?.addEventListener('click', () => toggleInventory(false));
}

function _invSlotClick(slotIndex) {
  const held    = inventory.getSelectedItem();
  const target  = inventory.slots[slotIndex];
  if (held && !target) {
    inventory.slots[slotIndex] = { id: held.id, count: held.count };
    inventory.slots[inventory.selectedHotbarSlot] = null;
  } else if (!held && target) {
    inventory.slots[inventory.selectedHotbarSlot] = target;
    inventory.slots[slotIndex] = null;
  } else if (held && target && held.id === target.id) {
    const meta  = ITEM_META[held.id];
    const max   = meta?.maxStack ?? 64;
    const moved = Math.min(held.count, max - target.count);
    target.count += moved;
    held.count   -= moved;
    if (held.count <= 0) inventory.slots[inventory.selectedHotbarSlot] = null;
  }
  _refreshInventoryUI();
}

function _craftSlotClick(i) {
  const held = inventory.getSelectedItem();
  if (held) {
    if (!_craft2x2[i]) {
      _craft2x2[i] = { id: held.id, count: 1 };
      inventory.consumeSelected(1);
    }
  } else if (_craft2x2[i]) {
    inventory.addItem(_craft2x2[i].id, _craft2x2[i].count);
    _craft2x2[i] = null;
  }
  _refreshInventoryUI();
}

function _takeCraftResult() {
  const result = CraftingSystem.match(_craft2x2, 2);
  if (!result) return;
  inventory.addItem(result.id, result.count);
  _craft2x2 = [null, null, null, null];
  _refreshInventoryUI();
}

function _refreshInventoryUI() {
  const meta = s => s ? (ITEM_META[s.id] ?? null) : null;
  for (let i = 0; i < 36; i++) {
    const el = document.getElementById(`inv-s-${i}`);
    if (!el) continue;
    const s = inventory.slots[i];
    const m = meta(s);
    el.innerHTML = s
      ? `${m?.icon ? `<img src="/textures/Template/assets/minecraft/textures/${m.icon}" class="inv-img">` : '?'}<span class="inv-count">${s.count > 1 ? s.count : ''}</span>`
      : '';
  }
  // 2x2 grid
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`craft-2x2-${i}`);
    if (!el) continue;
    const s = _craft2x2[i];
    const m = meta(s);
    el.innerHTML = s ? `${m?.icon ? `<img src="/textures/Template/assets/minecraft/textures/${m.icon}" class="inv-img">` : '?'}<span class="inv-count">${s.count > 1 ? s.count : ''}</span>` : '';
  }
  // Output preview
  const result = CraftingSystem.match(_craft2x2, 2);
  const outEl  = document.getElementById('craft-output-2x2');
  if (outEl) {
    if (result) {
      const rm = ITEM_META[result.id];
      outEl.innerHTML = `${rm?.icon ? `<img src="/textures/Template/assets/minecraft/textures/${rm.icon}" class="inv-img">` : '?'}<span class="inv-count">${result.count > 1 ? result.count : ''}</span>`;
    } else {
      outEl.innerHTML = '';
    }
  }
}

// ---- Game start ----
function showStarterSelect() {
  const screen = document.getElementById('starter-screen');
  screen.classList.remove('hidden');
  ['bulbasaur','charmander','squirtle'].forEach(name => {
    document.getElementById(`starter-${name}`)?.addEventListener('click', () => {
      const d = POKEDEX[name];
      player.team = [{ ...d, hp: d.baseHp, maxHp: d.baseHp, level: 5, exp: 0 }];
      screen.classList.add('hidden');
      document.getElementById('hud').classList.remove('hidden');
      startGame();
    });
  });
}

function startGame() {
  running = true;
  clock   = new THREE.Clock();

  document.getElementById('game-canvas').addEventListener('click', () => {
    if (!battle.active && !_invOpen && !furnace.open) {
      document.getElementById('game-canvas').requestPointerLock();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.code === 'Escape') {
      if (battle.active) return;
      if (_invOpen)          { toggleInventory(false); return; }
      if (furnace.open)      { furnace.close();        return; }
      togglePause();
    }
    if (e.code === 'KeyE') {
      if (!battle.active && !furnace.open) toggleInventory();
    }
    if (e.code === 'KeyP') {
      if (!battle.active) togglePokedex();
    }
  });

  document.getElementById('btn-resume').onclick          = () => togglePause(false);
  document.getElementById('btn-pokedex-pause').onclick   = () => { togglePause(false); togglePokedex(); };
  document.getElementById('btn-save').onclick            = saveGame;
  document.getElementById('close-pokedex')?.addEventListener('click', () => togglePokedex(false));

  // Right-click on furnace block to open furnace UI
  document.addEventListener('mousedown', e => {
    if (e.button !== 2) return;
    if (!player._pointerLocked) return;
    const target = blockInteraction.targetBlock;
    if (target && world.getBlock(target.wx, target.wy, target.wz) === BLOCK.FURNACE) {
      furnace.show();
    }
  });

  gameLoop();
}

let paused = false;
function togglePause(force) {
  paused = force !== undefined ? !force : !paused;
  document.getElementById('pause-menu').classList.toggle('active', paused);
  if (!paused && !battle.active) document.getElementById('game-canvas').requestPointerLock();
  else document.exitPointerLock();
}

function toggleInventory(force) {
  _invOpen = force !== undefined ? force : !_invOpen;
  document.getElementById('inventory-overlay').classList.toggle('active', _invOpen);
  if (_invOpen) {
    _refreshInventoryUI();
    document.exitPointerLock();
  } else {
    document.getElementById('game-canvas').requestPointerLock();
  }
}

function togglePokedex(force) {
  const el = document.getElementById('pokedex-overlay');
  const on = force !== undefined ? force : !el.classList.contains('active');
  el.classList.toggle('active', on);
  if (on) document.exitPointerLock();
  else    document.getElementById('game-canvas').requestPointerLock();
}

function saveGame() {
  const save = {
    position:   player.position.toArray(),
    team:       player.team,
    caught:     player.caught,
    inventory:  inventory.slots,
    health:     player.health,
    hunger:     player.hunger,
  };
  localStorage.setItem('pokeblock-save', JSON.stringify(save));
  const btn = document.getElementById('btn-save');
  if (btn) { btn.textContent = '✅ Saved!'; setTimeout(() => { btn.textContent = '💾 Save Game'; }, 1500); }
}

function gameLoop() {
  requestAnimationFrame(gameLoop);
  if (paused || !running) return;
  const delta = Math.min(clock.getDelta(), 0.05);

  if (!battle.active && !_invOpen && !furnace.open) {
    player.update(delta);
    blockInteraction.update(delta, renderer.camera);
    spawner.update(delta, player.position);
  }

  itemDrops.update(delta, world, player);
  furnace.update(delta);
  dayNight.update(delta);
  weather.update(delta, player.position);
  world.update(delta, player.position);
  battle.update(delta);
  playerModel.update(delta, player.velocity);
  renderer.setUnderwater(player.isUnderwater);
  updateHUD(player);
  renderer.render(delta);
}

init().catch(console.error);
