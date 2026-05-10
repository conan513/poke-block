import { BLOCK, ITEM } from './Constants.js';
import { ITEM_META } from '../player/Inventory.js';

// Smelting recipes: {input -> {output, time (sec)}}
const SMELT = {
  [BLOCK.IRON_ORE]:  { output: ITEM.IRON_INGOT,  time: 10 },
  [BLOCK.GOLD_ORE]:  { output: ITEM.GOLD_INGOT,  time: 10 },
  [BLOCK.SAND]:      { output: BLOCK.GLASS,       time: 10 },
  [BLOCK.COBBLESTONE]:{ output: BLOCK.STONE,      time: 10 },
  [ITEM.WHEAT]:      { output: ITEM.BREAD,        time:  5 },
};

// Fuel values (seconds of burn)
const FUEL = {
  [BLOCK.OAK_LOG]:    15, [BLOCK.BIRCH_LOG]: 15, [BLOCK.SPRUCE_LOG]: 15,
  [BLOCK.OAK_PLANKS]: 7.5, [ITEM.COAL]: 80, [ITEM.STICK]: 5,
  [BLOCK.GLOWSTONE]:  5,
};

export class FurnaceSystem {
  constructor(inventory, audioManager) {
    this.inventory = inventory;
    this.audio     = audioManager;
    this.open      = false;

    // Furnace state
    this.inputSlot  = null;
    this.fuelSlot   = null;
    this.outputSlot = null;
    this.burnTime   = 0;   // remaining fuel burn seconds
    this.smeltProgress = 0; // 0-1
    this._buildUI();
  }

  _buildUI() {
    const el = document.getElementById('furnace-overlay');
    if (!el) return;
    el.innerHTML = `
      <div class="furnace-box">
        <div class="furnace-title">Furnace</div>
        <div class="furnace-grid">
          <div class="furnace-col">
            <div class="furnace-label">Input</div>
            <div class="furnace-slot" id="f-input" data-slot="input"></div>
            <div class="furnace-label">Fuel</div>
            <div class="furnace-slot" id="f-fuel"  data-slot="fuel"></div>
          </div>
          <div class="furnace-mid">
            <div class="f-progress-wrap">
              <div class="f-flame" id="f-flame" style="width:14px;height:14px;background-color:#ff9800;border-radius:50%;"></div>
              <div class="f-arrow" style="font-weight:bold;color:#ccc;">-></div>
              <div class="f-bar-wrap"><div class="f-bar" id="f-bar"></div></div>
            </div>
          </div>
          <div class="furnace-col">
            <div class="furnace-label">Output</div>
            <div class="furnace-slot f-out" id="f-output" data-slot="output">—</div>
          </div>
        </div>
        <button id="f-close" class="furnace-close">✕ Close</button>
      </div>
    `;

    document.getElementById('f-input').onclick  = () => this._clickSlot('input');
    document.getElementById('f-fuel').onclick   = () => this._clickSlot('fuel');
    document.getElementById('f-output').onclick = () => this._clickSlot('output');
    document.getElementById('f-close').onclick  = () => this.close();
  }

  _clickSlot(slot) {
    const held = this.inventory.getSelectedItem();
    if (slot === 'input') {
      if (held && SMELT[held.id]) {
        if (!this.inputSlot) {
          this.inputSlot = { id: held.id, count: held.count };
          this.inventory.consumeSelected(held.count);
        }
      } else if (this.inputSlot) {
        this.inventory.addItem(this.inputSlot.id, this.inputSlot.count);
        this.inputSlot = null;
      }
    } else if (slot === 'fuel') {
      if (held && FUEL[held.id]) {
        if (!this.fuelSlot) {
          this.fuelSlot = { id: held.id, count: held.count };
          this.inventory.consumeSelected(held.count);
        }
      } else if (this.fuelSlot) {
        this.inventory.addItem(this.fuelSlot.id, this.fuelSlot.count);
        this.fuelSlot = null;
      }
    } else if (slot === 'output') {
      if (this.outputSlot) {
        this.inventory.addItem(this.outputSlot.id, this.outputSlot.count);
        this.outputSlot = null;
      }
    }
    this._render();
  }

  show() {
    this.open = true;
    const el = document.getElementById('furnace-overlay');
    if (el) { el.classList.add('active'); this._render(); }
    document.exitPointerLock();
  }

  close() {
    this.open = false;
    document.getElementById('furnace-overlay')?.classList.remove('active');
    document.getElementById('game-canvas')?.requestPointerLock();
  }

  _render() {
    const renderSlot = (slotObj, elId) => {
      const el = document.getElementById(elId);
      if (!el) return;
      if (slotObj) {
        const meta = ITEM_META[slotObj.id];
        el.innerHTML = meta?.icon 
          ? `<img src="/textures/Template/assets/minecraft/textures/${meta.icon}" class="inv-img" style="width:100%;height:100%;image-rendering:pixelated;"> <span class="inv-count">${slotObj.count}</span>`
          : `<span class="inv-count">${slotObj.count}</span>`;
      } else {
        el.innerHTML = '';
      }
    };
    renderSlot(this.inputSlot, 'f-input');
    renderSlot(this.fuelSlot, 'f-fuel');
    renderSlot(this.outputSlot, 'f-output');
    const bar = document.getElementById('f-bar');
    if (bar) bar.style.width = `${this.smeltProgress * 100}%`;
    const flame = document.getElementById('f-flame');
    if (flame) flame.style.opacity = this.burnTime > 0 ? '1' : '0.2';
  }

  update(delta) {
    if (!this.inputSlot) return;
    const recipe = SMELT[this.inputSlot.id];
    if (!recipe) return;

    // Consume fuel
    if (this.burnTime <= 0 && this.fuelSlot) {
      const fuelVal = FUEL[this.fuelSlot.id] ?? 0;
      if (fuelVal > 0) {
        this.burnTime = fuelVal;
        this.fuelSlot.count--;
        if (this.fuelSlot.count <= 0) this.fuelSlot = null;
      }
    }

    if (this.burnTime <= 0) return;
    this.burnTime -= delta;

    this.smeltProgress += delta / recipe.time;
    if (this.smeltProgress >= 1) {
      this.smeltProgress = 0;
      if (!this.outputSlot) {
        this.outputSlot = { id: recipe.output, count: 1 };
      } else if (this.outputSlot.id === recipe.output && this.outputSlot.count < 64) {
        this.outputSlot.count++;
      }
      this.inputSlot.count--;
      if (this.inputSlot.count <= 0) this.inputSlot = null;
      this.audio?.play('place');
    }

    if (this.open) this._render();
  }
}
