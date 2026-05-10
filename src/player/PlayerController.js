// src/player/PlayerController.js – WASD + pointer lock camera, physics, collision, health/hunger
import * as THREE from 'three';
import { CHUNK_SIZE, BLOCK } from '../engine/Constants.js';
import { ITEM_META } from './Inventory.js';

const GRAVITY      = -28;
const JUMP_VEL     = 10;
const WALK_SPEED   = 6;
const SPRINT_SPEED = 10;
const PLAYER_HEIGHT = 1.8;
const PLAYER_WIDTH  = 0.6;

export class PlayerController {
  constructor(camera, playerModel, world) {
    this.camera = camera;
    this.model  = playerModel;
    this.world  = world;

    this.position = new THREE.Vector3(0, 80, 0);
    this.velocity = new THREE.Vector3();
    this.onGround    = false;
    this.inWater     = false;
    this.isUnderwater = false;
    this.yaw   = 0;
    this.pitch = 0;

    this.keys     = {};
    this.team     = [];
    this.caught   = [];
    this.pokeballs = 5;

    // Minecraft health / hunger
    this.health    = 20;
    this.maxHealth = 20;
    this.hunger    = 20;
    this.saturation = 5.0;
    this._healTimer   = 0;
    this._hungerTimer = 0;
    this._fallY       = null; // track fall start

    // Inventory (set from outside after construction)
    this.inventory = null;

    this._setupInput();
    this._pointerLocked = false;
  }

  _setupInput() {
    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      // Hotbar 1-9
      if (e.code.startsWith('Digit')) {
        const n = parseInt(e.code.replace('Digit', '')) - 1;
        if (n >= 0 && n <= 8 && this.inventory) this.inventory.selectSlot(n);
      }
    });
    document.addEventListener('keyup',   e => { this.keys[e.code] = false; });

    document.addEventListener('pointerlockchange', () => {
      this._pointerLocked = document.pointerLockElement === document.getElementById('game-canvas');
    });

    document.addEventListener('mousemove', e => {
      if (!this._pointerLocked) return;
      this.yaw   -= e.movementX * 0.002;
      this.pitch -= e.movementY * 0.002;
      this.pitch  = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, this.pitch));
    });

    // Scroll hotbar
    document.addEventListener('wheel', e => {
      if (!this._pointerLocked || !this.inventory) return;
      this.inventory.scrollSlot(e.deltaY > 0 ? 1 : -1);
    });

    // Eat: right-click with food in hand (handled here when pointer locked)
    document.addEventListener('mousedown', e => {
      if (e.button === 2 && this._pointerLocked && this.inventory) {
        const item = this.inventory.getSelectedItem();
        const meta = item ? ITEM_META[item.id] : null;
        if (meta?.food && this.hunger < 20) {
          this.hunger     = Math.min(20, this.hunger + meta.food);
          this.saturation = Math.min(20, this.saturation + (meta.saturation ?? 0));
          this.inventory.consumeSelected();
          this.onItemPickup?.(-1, 0); // trigger HUD refresh
          window.audioManager?.play('eat');
        }
      }
    });
  }

  get isSprinting() { return this.keys['ShiftLeft'] || this.keys['ShiftRight']; }

  /** Called by ItemDropSystem when an item is picked up */
  onItemPickup(itemId, count) {
    window.audioManager?.play('pickup');
    // trigger HUD refresh (handled in updateHUD)
  }

  update(delta) {
    const px = Math.floor(this.position.x);
    const pz = Math.floor(this.position.z);
    const blockAtFeet = this.world.getBlock(px, Math.floor(this.position.y), pz);
    const blockAtHead = this.world.getBlock(px, Math.floor(this.position.y + PLAYER_HEIGHT - 0.2), pz);
    this.inWater      = blockAtFeet === BLOCK.WATER || blockAtHead === BLOCK.WATER;
    this.isUnderwater = blockAtHead === BLOCK.WATER;

    let speed = this.isSprinting ? SPRINT_SPEED : WALK_SPEED;
    if (this.inWater) speed *= 0.5;

    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    moveDir.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  moveDir.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  moveDir.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.x += 1;

    const isMoving = moveDir.length() > 0;
    if (isMoving) {
      moveDir.normalize();
      const cosY = Math.cos(this.yaw), sinY = Math.sin(this.yaw);
      this.velocity.x = (moveDir.x * cosY + moveDir.z * sinY) * speed;
      this.velocity.z = (-moveDir.x * sinY + moveDir.z * cosY) * speed;
    } else {
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
    }

    // Jump / Swim Up
    if (this.keys['Space'] || this.keys['KeyJ']) {
      if (this.inWater) {
        this.velocity.y += 15 * delta;
        this.velocity.y  = Math.min(this.velocity.y, JUMP_VEL * 0.5);
      } else if (this.onGround) {
        this.velocity.y = JUMP_VEL;
        this.onGround   = false;
      }
    }

    // Gravity
    if (!this.onGround) {
      const cx = Math.floor(this.position.x / CHUNK_SIZE);
      const cz = Math.floor(this.position.z / CHUNK_SIZE);
      if (!this.world.chunks.has(this.world.chunkKey(cx, cz))) {
        this.velocity.y = 0;
      } else {
        const grav = this.inWater ? GRAVITY * 0.2 : GRAVITY;
        this.velocity.y += grav * delta;
        this.velocity.y  = Math.max(this.velocity.y, this.inWater ? -5 : -50);
      }
    }

    if (this.inWater && !this.keys['Space']) this.velocity.y *= 0.9;

    // Track fall for damage
    if (!this.onGround && !this.inWater) {
      if (this._fallY === null) this._fallY = this.position.y;
      else this._fallY = Math.min(this._fallY, this.position.y);
    }

    const prevY = this.position.y;
    this._moveAndSlide(delta);

    // Fall damage
    if (this.onGround && this._fallY !== null) {
      const fallen = prevY - this.position.y;
      const dmg    = Math.floor(fallen) - 3;
      if (dmg > 0) this._damage(dmg * 2);
      this._fallY = null;
    }
    if (this.onGround) this._fallY = null;

    // Footstep audio
    const blockUnder = this.world.getBlock(px, Math.floor(this.position.y) - 1, pz);
    window.audioManager?.updateFootsteps(isMoving, this.isSprinting, blockUnder);

    // Hunger drain
    this._hungerTimer += delta;
    const hungerRate = this.isSprinting ? 0.1 : 0.05;
    if (this._hungerTimer >= hungerRate) {
      this._hungerTimer = 0;
      if (this.saturation > 0) {
        this.saturation = Math.max(0, this.saturation - 0.01);
      } else {
        this.hunger = Math.max(0, this.hunger - 0.02);
      }
    }

    // Starvation damage
    if (this.hunger <= 0) {
      this._hungerDmgTimer = (this._hungerDmgTimer ?? 0) + delta;
      if (this._hungerDmgTimer >= 4) {
        this._hungerDmgTimer = 0;
        if (this.health > 1) this._damage(1);
      }
    }

    // Natural regeneration (when hunger >= 18)
    if (this.hunger >= 18 && this.health < this.maxHealth) {
      this._healTimer += delta;
      if (this._healTimer >= 0.5) {
        this._healTimer = 0;
        this.health = Math.min(this.maxHealth, this.health + 1);
      }
    } else {
      this._healTimer = 0;
    }

    // Lava damage
    if (blockAtFeet === BLOCK.LAVA || blockAtHead === BLOCK.LAVA) {
      this._lavaDmgTimer = (this._lavaDmgTimer ?? 0) + delta;
      if (this._lavaDmgTimer >= 0.5) {
        this._lavaDmgTimer = 0;
        this._damage(4);
      }
    }

    // Camera
    const eyeHeight = PLAYER_HEIGHT - 0.1;
    this.camera.position.set(this.position.x, this.position.y + eyeHeight, this.position.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    this.model.setPosition(this.position.x, this.position.y, this.position.z);
    this.model.setRotationY(this.yaw + Math.PI);
    this.model.setVisible(false);
  }

  _damage(amount) {
    this.health = Math.max(0, this.health - amount);
    window.audioManager?.play('hurt');
    // Flash red
    const flash = document.getElementById('damage-flash');
    if (flash) {
      flash.style.opacity = '0.4';
      setTimeout(() => { flash.style.opacity = '0'; }, 200);
    }
    if (this.health <= 0) this._onDeath();
  }

  _onDeath() {
    // Simple respawn: reset health/hunger and teleport to spawn
    setTimeout(() => {
      this.health    = 20;
      this.hunger    = 20;
      this.saturation = 5;
      this.position.set(0, 80, 0);
      this.velocity.set(0, 0, 0);
    }, 1500);
  }

  _moveAndSlide(delta) {
    const p = this.position, v = this.velocity, w = this.world;
    p.x += v.x * delta;
    if (this._collidesAt(p.x, p.y, p.z)) { p.x -= v.x * delta; v.x = 0; }
    p.z += v.z * delta;
    if (this._collidesAt(p.x, p.y, p.z)) { p.z -= v.z * delta; v.z = 0; }
    p.y += v.y * delta;
    if (this._collidesAt(p.x, p.y, p.z)) {
      if (v.y < 0) this.onGround = true;
      p.y -= v.y * delta; v.y = 0;
    } else {
      this.onGround = false;
    }
    if (p.y < 0) { p.y = 0; v.y = 0; this.onGround = true; }
  }

  _collidesAt(x, y, z) {
    const hw = PLAYER_WIDTH / 2, eps = 0.01, w = this.world;
    const minX = Math.floor(x - hw + eps), maxX = Math.floor(x + hw - eps);
    const minY = Math.floor(y + eps),      maxY = Math.floor(y + PLAYER_HEIGHT - eps);
    const minZ = Math.floor(z - hw + eps), maxZ = Math.floor(z + hw - eps);
    for (let bx = minX; bx <= maxX; bx++)
      for (let by = minY; by <= maxY; by++)
        for (let bz = minZ; bz <= maxZ; bz++)
          if (w.isSolid(bx, by, bz)) return true;
    return false;
  }
}
