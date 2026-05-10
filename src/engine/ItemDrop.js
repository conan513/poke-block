// src/engine/ItemDrop.js – 3D item drops with auto pickup
import * as THREE from 'three';

const GEO   = new THREE.BoxGeometry(0.35, 0.35, 0.35);
const MATS  = new Map();

function getMat(color) {
  if (!MATS.has(color)) {
    MATS.set(color, new THREE.MeshLambertMaterial({ color }));
  }
  return MATS.get(color);
}

// Simple color table per item category
const DROP_COLOR = {
  default: 0xaaaaaa,
  // by rough id ranges
};

function colorFor(id) {
  if (id <= 3)  return 0x7ec850; // grass/dirt/stone
  if (id === 5) return 0x3b8beb; // water
  if (id >= 8  && id <= 10) return 0xa0522d; // wood/planks
  if (id === 12) return 0x888888; // cobblestone
  if (id >= 32 && id <= 35) return 0x555588; // ores
  if (id === 104) return 0x44eeff; // diamond
  if (id === 102) return 0xcccccc; // iron ingot
  if (id === 103) return 0xffd700; // gold ingot
  if (id === 101) return 0x222222; // coal
  return 0xdddddd;
}

class DropEntity {
  constructor(x, y, z, itemId, count, scene) {
    this.itemId = itemId;
    this.count  = count;
    this.scene  = scene;
    this.vy     = 3;
    this.onGround = false;
    this.age    = 0;
    this.bobOffset = Math.random() * Math.PI * 2;
    this.despawnTime = 300; // seconds

    this.mesh = new THREE.Mesh(GEO, getMat(colorFor(itemId)));
    this.mesh.castShadow = true;
    this.mesh.position.set(x, y, z);
    scene.add(this.mesh);
  }

  update(delta, world, player) {
    this.age += delta;
    if (this.age > this.despawnTime) return 'despawn';

    // Gravity
    if (!this.onGround) {
      this.vy -= 20 * delta;
      this.mesh.position.y += this.vy * delta;
      const by = Math.floor(this.mesh.position.y - 0.18);
      if (world.isSolid(Math.floor(this.mesh.position.x), by, Math.floor(this.mesh.position.z))) {
        this.mesh.position.y = by + 1 + 0.18;
        this.vy = 0;
        this.onGround = true;
      }
    }

    // Bob & spin
    if (this.onGround) {
      this.mesh.position.y += Math.sin(this.age * 2 + this.bobOffset) * 0.002;
    }
    this.mesh.rotation.y += delta * 1.5;

    // Magnetic pickup
    const dx = player.position.x - this.mesh.position.x;
    const dy = player.position.y + 0.9 - this.mesh.position.y;
    const dz = player.position.z - this.mesh.position.z;
    const dist2 = dx*dx + dy*dy + dz*dz;

    if (dist2 < 9) { // 3 block attract radius
      const d = Math.sqrt(dist2);
      const speed = Math.max(6, 18 / d);
      this.mesh.position.x += (dx / d) * speed * delta;
      this.mesh.position.y += (dy / d) * speed * delta;
      this.mesh.position.z += (dz / d) * speed * delta;
    }

    // Pickup
    if (dist2 < 0.8) {
      const added = player.inventory.addItem(this.itemId, this.count);
      if (added) {
        player.onItemPickup?.(this.itemId, this.count);
        return 'pickup';
      }
    }

    return 'alive';
  }

  remove() {
    this.scene.remove(this.mesh);
  }
}

export class ItemDropSystem {
  constructor(scene) {
    this.scene  = scene;
    this.drops  = [];
  }

  spawn(x, y, z, itemId, count = 1) {
    // Slight random spread
    const sx = x + (Math.random() - 0.5) * 0.5;
    const sz = z + (Math.random() - 0.5) * 0.5;
    this.drops.push(new DropEntity(sx, y, sz, itemId, count, this.scene));
  }

  update(delta, world, player) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const result = this.drops[i].update(delta, world, player);
      if (result !== 'alive') {
        this.drops[i].remove();
        this.drops.splice(i, 1);
      }
    }
  }
}
