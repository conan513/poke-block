// src/engine/BlockInteraction.js – Mining, block placement, raycasting
import * as THREE from 'three';
import { BLOCK, ITEM, BLOCK_HARDNESS, BLOCK_DROPS, BLOCK_TOOL, TOOL_SPEED } from './Constants.js';
import { ITEM_META } from '../player/Inventory.js';

const _ray  = new THREE.Raycaster();
const _dir  = new THREE.Vector3();
const _orig = new THREE.Vector3();

export class BlockInteraction {
  constructor(world, inventory, itemDropSystem, scene, audioManager) {
    this.world        = world;
    this.inventory    = inventory;
    this.drops        = itemDropSystem;
    this.scene        = scene;
    this.audio        = audioManager;

    // State
    this.targetBlock  = null;  // {wx,wy,wz,nx,ny,nz}
    this.miningProgress = 0;   // 0-1
    this.miningBlock  = null;  // {wx,wy,wz}
    this.isMining     = false;

    // Block highlight outline
    this._outlineMesh = this._buildOutline();
    scene.add(this._outlineMesh);
    this._outlineMesh.visible = false;

    // Crack overlay (10 stages)
    this._crackMesh   = this._buildCrack();
    scene.add(this._crackMesh);
    this._crackMesh.visible = false;

    // Input state
    this._leftDown  = false;
    this._rightDown = false;
    this._setupInput();
  }

  _buildOutline() {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
    const mat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthTest: true });
    return new THREE.LineSegments(geo, mat);
  }

  _buildCrack() {
    const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, depthTest: true,
      wireframe: false, side: THREE.FrontSide,
    });
    return new THREE.Mesh(geo, mat);
  }

  _setupInput() {
    document.addEventListener('mousedown', e => {
      if (document.pointerLockElement !== document.getElementById('game-canvas')) return;
      if (e.button === 0) this._leftDown  = true;
      if (e.button === 2) { this._rightDown = true; this._tryPlace(); }
    });
    document.addEventListener('mouseup', e => {
      if (e.button === 0) { this._leftDown = false; this._cancelMining(); }
      if (e.button === 2) this._rightDown = false;
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
  }

  /** Cast a ray from the camera and find the targeted block (max 5 blocks) */
  castRay(camera) {
    _orig.copy(camera.position);
    camera.getWorldDirection(_dir);
    const REACH = 5;
    const STEP  = 0.05;

    let prev = null;
    for (let t = 0; t < REACH; t += STEP) {
      const wx = Math.floor(_orig.x + _dir.x * t);
      const wy = Math.floor(_orig.y + _dir.y * t);
      const wz = Math.floor(_orig.z + _dir.z * t);

      if (this.world.isSolid(wx, wy, wz)) {
        const nx = prev ? prev.wx - wx : 0;
        const ny = prev ? prev.wy - wy : 0;
        const nz = prev ? prev.wz - wz : 0;
        return { wx, wy, wz, nx, ny, nz };
      }
      prev = { wx, wy, wz };
    }
    return null;
  }

  /** Get effective mining time in seconds for current tool vs block */
  _getMineTime(blockId) {
    const base = BLOCK_HARDNESS[blockId] ?? 5;
    if (base === Infinity) return Infinity;
    const heldItem   = this.inventory.getSelectedItem();
    const heldId     = heldItem?.id ?? null;
    const toolNeeded = BLOCK_TOOL[blockId] ?? 'any';
    const speeds     = heldId !== null ? (TOOL_SPEED[heldId] ?? {}) : {};
    const mult       = speeds[toolNeeded] ?? 1;
    return base / mult;
  }

  _cancelMining() {
    this.miningProgress = 0;
    this.miningBlock    = null;
    this._crackMesh.visible = false;
    this._crackMesh.material.opacity = 0;
  }

  _tryPlace() {
    if (!this.targetBlock) return;
    const { wx, wy, wz, nx, ny, nz } = this.targetBlock;
    const item = this.inventory.getSelectedItem();
    if (!item) return;

    const meta = ITEM_META[item.id];
    if (!meta?.placeable) return;

    // Special: hoe on dirt/grass → farmland
    if (meta.tool === 'hoe') {
      const below = this.world.getBlock(wx, wy, wz);
      if (below === BLOCK.DIRT || below === BLOCK.GRASS) {
        this.world.setBlock(wx, wy, wz, BLOCK.FARMLAND);
        this.audio?.play('place');
      }
      return;
    }

    // Special: wheat seeds on farmland
    if (item.id === ITEM.WHEAT_SEEDS) {
      const faceBlock = this.world.getBlock(wx + nx, wy + ny, wz + nz);
      const below     = this.world.getBlock(wx + nx, wy + ny - 1, wz + nz);
      if (faceBlock === BLOCK.AIR && below === BLOCK.FARMLAND) {
        this.world.setBlock(wx + nx, wy + ny, wz + nz, BLOCK.WHEAT_0);
        this.inventory.consumeSelected();
        this.audio?.play('place');
      }
      return;
    }

    const px = wx + nx, py = wy + ny, pz = wz + nz;
    if (this.world.isSolid(px, py, pz)) return;

    this.world.setBlock(px, py, pz, item.id);
    this.inventory.consumeSelected();
    this.audio?.play('place');
  }

  update(delta, camera) {
    // Raycast
    this.targetBlock = this.castRay(camera);

    // Highlight outline
    if (this.targetBlock) {
      const { wx, wy, wz } = this.targetBlock;
      this._outlineMesh.position.set(wx + 0.5, wy + 0.5, wz + 0.5);
      this._outlineMesh.visible = true;
    } else {
      this._outlineMesh.visible = false;
      this._cancelMining();
    }

    // Mining
    if (this._leftDown && this.targetBlock) {
      const { wx, wy, wz } = this.targetBlock;
      const blockId = this.world.getBlock(wx, wy, wz);
      if (blockId === BLOCK.AIR) { this._cancelMining(); return; }

      // Changed block? reset
      if (!this.miningBlock || this.miningBlock.wx !== wx || this.miningBlock.wy !== wy || this.miningBlock.wz !== wz) {
        this._cancelMining();
        this.miningBlock = { wx, wy, wz };
      }

      const mineTime = this._getMineTime(blockId);
      if (mineTime === Infinity) return;

      this.miningProgress += delta / (mineTime || 0.05);

      // Crack visual
      this._crackMesh.position.set(wx + 0.5, wy + 0.5, wz + 0.5);
      this._crackMesh.visible  = true;
      this._crackMesh.material.opacity = 0.15 + this.miningProgress * 0.45;
      this._crackMesh.material.color.setHSL(0, 0, 1 - this.miningProgress * 0.7);

      if (this.miningProgress >= 1) {
        this._breakBlock(wx, wy, wz, blockId);
        this._cancelMining();
      }
    } else if (!this._leftDown) {
      // Slowly reset crack when not mining
      if (this.miningProgress > 0) {
        this.miningProgress -= delta * 0.5;
        if (this.miningProgress < 0) this._cancelMining();
      }
    }
  }

  _breakBlock(wx, wy, wz, blockId) {
    this.world.setBlock(wx, wy, wz, BLOCK.AIR);
    this.audio?.play('break');

    const drops = BLOCK_DROPS[blockId] ?? [{ id: blockId, count: 1 }];
    for (const drop of drops) {
      if (drop.chance !== undefined && Math.random() > drop.chance) continue;
      let count = Array.isArray(drop.count)
        ? drop.count[0] + Math.floor(Math.random() * (drop.count[1] - drop.count[0] + 1))
        : drop.count;
      if (count > 0) this.drops?.spawn(wx + 0.5, wy + 0.5, wz + 0.5, drop.id, count);
    }
  }
}
