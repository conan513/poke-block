// src/ui/HUD.js – Hearts, hunger, hotbar, minimap, coords
import { ITEM_META } from '../player/Inventory.js';

let _player = null;
let _minimapCtx = null;
let _minimapCanvas = null;

export function initHUD(player) {
  _player = player;
  _minimapCanvas = document.getElementById('minimap-canvas');
  _minimapCtx    = _minimapCanvas?.getContext('2d');
}

export function updateHUD(player) {
  _player = player;

  // Coords
  const pos = player.position;
  const coordEl = document.getElementById('coords');
  if (coordEl) {
    const dnIcon = window.dayNight?.isNight ? '[Night]' : '[Day]';
    let wIcon  = window.weather?.icon ?? '';
    // Strip emojis from wIcon if needed or just use it since we'll change WeatherSystem too
    coordEl.innerHTML =
      `X: ${Math.floor(pos.x)}<br>Y: ${Math.floor(pos.y)}<br>Z: ${Math.floor(pos.z)}<br>${dnIcon} ${wIcon}`;
  }

  // Health hearts (20 hp = 10 hearts)
  _drawHearts(player.health, player.maxHealth);

  // Hunger (20 points = 10 icons)
  _drawHunger(player.hunger);

  // Hotbar
  _drawHotbar(player.inventory);

  // Minimap
  _drawMinimap(player);
}

function _drawHearts(hp, maxHp) {
  const el = document.getElementById('hearts-row');
  if (!el) return;
  el.innerHTML = '';
  const total = Math.ceil(maxHp / 2);
  for (let i = 0; i < total; i++) {
    const filled = hp - i * 2;
    const src = filled >= 2 ? 'heart/full.png' : filled === 1 ? 'heart/half.png' : 'heart/empty.png';
    const span = document.createElement('span');
    span.className = 'heart-icon';
    span.innerHTML = `<img src="/textures/Template/assets/minecraft/textures/gui/sprites/hud/${src}" style="width:16px;height:16px;image-rendering:pixelated;vertical-align:bottom;">`;
    el.appendChild(span);
  }
}

function _drawHunger(hunger) {
  const el = document.getElementById('hunger-row');
  if (!el) return;
  el.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const filled = hunger - i * 2;
    const src = filled >= 2 ? 'food_full.png' : filled === 1 ? 'food_half.png' : 'food_empty.png';
    const span = document.createElement('span');
    span.className = 'hunger-icon';
    span.innerHTML = `<img src="/textures/Template/assets/minecraft/textures/gui/sprites/hud/${src}" style="width:16px;height:16px;image-rendering:pixelated;vertical-align:bottom;">`;
    el.appendChild(span);
  }
}

function _drawHotbar(inventory) {
  if (!inventory) return;
  for (let i = 0; i < 9; i++) {
    const slotEl   = document.getElementById(`hb-${i}`);
    const countEl  = document.getElementById(`hb-${i}-count`);
    const iconEl   = document.getElementById(`hb-${i}-icon`);
    if (!slotEl) continue;

    const item = inventory.slots[i];
    const meta = item ? (ITEM_META[item.id] ?? null) : null;

    if (iconEl)  iconEl.innerHTML  = meta?.icon ? `<img src="/textures/Template/assets/minecraft/textures/${meta.icon}" class="inv-img" style="width:100%;height:100%;image-rendering:pixelated;">` : '';
    if (countEl) countEl.textContent = item && item.count > 1 ? item.count : '';

    slotEl.classList.toggle('selected', i === inventory.selectedHotbarSlot);
  }
}

function _drawMinimap(player) {
  if (!_minimapCtx || !player.world) return;
  const ctx = _minimapCtx;
  const W = 160, H = 160;
  const world = player.world;
  const px = Math.floor(player.position.x);
  const pz = Math.floor(player.position.z);

  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, W, H);

  const scale = 3;
  const halfW = Math.floor(W / 2 / scale);
  const halfH = Math.floor(H / 2 / scale);

  for (let dx = -halfW; dx <= halfW; dx++) {
    for (let dz = -halfH; dz <= halfH; dz++) {
      const wx = px + dx, wz = pz + dz;
      const sy = world.getSurfaceY(wx, wz);
      if (!sy) continue;
      const block = world.getBlock(wx, sy - 1, wz);
      const color = MINIMAP_COLORS[block] ?? '#555';
      ctx.fillStyle = color;
      ctx.fillRect(W/2 + dx * scale, H/2 + dz * scale, scale, scale);
    }
  }

  // Player dot
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(W/2, H/2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Direction arrow
  const yaw = player.yaw;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(W/2, H/2);
  ctx.lineTo(W/2 + Math.sin(yaw) * 8, H/2 - Math.cos(yaw) * 8);
  ctx.stroke();
}

const MINIMAP_COLORS = {
  1: '#3a9',   2: '#864',   3: '#666',  4: '#cc9',   5: '#38f',
  6: '#eef',   7: '#aaa',   8: '#752',  9: '#292',  11: '#999',
  12: '#777', 13: '#111',  23: '#c97', 25: '#acf',  27: '#543',
  32: '#333', 33: '#775', 34: '#883',  35: '#4df',  36: '#339',
  37: '#c33', 38: '#863',  39: '#a64', 40: '#a73',  41: '#543',
};
