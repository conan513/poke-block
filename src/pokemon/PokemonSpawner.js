// src/pokemon/PokemonSpawner.js
import * as THREE from 'three';
import { PokemonEntity } from './PokemonEntity.js';
import { POKEDEX } from '../data/pokedex.js';

const SPAWN_RADIUS = 40;
const MAX_POKEMON = 20;
const ENCOUNTER_RANGE = 1.8;
const GRASS_ENCOUNTER_CHANCE = 0.006; // per frame in grass

// Biome spawn tables
const SPAWN_TABLE = [
  { name: 'pidgey',    weight: 3, biomes: ['plains','forest','savanna'] },
  { name: 'rattata',   weight: 3, biomes: ['plains','forest','desert','savanna'] },
  { name: 'bulbasaur', weight: 1, biomes: ['forest','jungle','swamp'] },
  { name: 'charmander',weight: 1, biomes: ['mountains','savanna'] },
  { name: 'squirtle',  weight: 1, biomes: ['beach','swamp'] },
  { name: 'caterpie',  weight: 2, biomes: ['forest','jungle'] },
  { name: 'pikachu',   weight: 1, biomes: ['forest','plains'] },
  { name: 'meowth',    weight: 1, biomes: ['plains','desert','savanna'] },
];

export class PokemonSpawner {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.entities = [];
    this.onEncounter = null; // callback(wildPokemon, playerPos)
    this._encounterCooldown = 0;
    this._spawnTimer = 0;
  }

  async init() {
    // No async loading needed – entities load themselves
  }

  _getBiomeAt(x, z) {
    // Simple biome estimation from world height/generator
    // We re-use the generator logic approximation
    const generator = this.world.generator;
    const h = generator._getHeight(x, z);
    const biome = generator._getBiome(x, z);
    return biome.id;
  }

  _weightedRandom(candidates) {
    const total = candidates.reduce((s, c) => s + c.weight, 0);
    let r = Math.random() * total;
    for (const c of candidates) {
      r -= c.weight;
      if (r <= 0) return c;
    }
    return candidates[candidates.length-1];
  }

  _spawnNear(playerPos) {
    if (this.entities.length >= MAX_POKEMON) return;

    const biome = this._getBiomeAt(Math.floor(playerPos.x), Math.floor(playerPos.z));

    // Filter spawn table by biome (with fallback to all)
    const candidates = SPAWN_TABLE.filter(e => e.biomes.includes(biome));
    const pool = candidates.length > 0 ? candidates : SPAWN_TABLE;
    const picked = this._weightedRandom(pool);

    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * (SPAWN_RADIUS - 10);
    const x = playerPos.x + Math.cos(angle) * dist;
    const z = playerPos.z + Math.sin(angle) * dist;
    const y = this.world.getSurfaceY(Math.floor(x), Math.floor(z));

    if (isNaN(y) || y <= 0) return;

    const pokemonData = POKEDEX[picked.name];
    if (!pokemonData) return;

    const entity = new PokemonEntity(this.scene, picked.name, {
      ...pokemonData,
      spawnX: x, spawnY: y, spawnZ: z,
    });
    this.entities.push(entity);
  }

  _checkEncounter(playerPos) {
    if (this._encounterCooldown > 0) return;

    for (const entity of this.entities) {
      const dx = entity.group.position.x - playerPos.x;
      const dz = entity.group.position.z - playerPos.z;
      const distSq = dx*dx + dz*dz;

      if (distSq < ENCOUNTER_RANGE * ENCOUNTER_RANGE) {
        this._encounterCooldown = 10; // 10s cooldown
        if (this.onEncounter) {
          this.onEncounter(entity, playerPos);
        }
        // Remove from world
        const idx = this.entities.indexOf(entity);
        if (idx >= 0) {
          entity.dispose();
          this.entities.splice(idx, 1);
        }
        return;
      }
    }

    // Grass encounter (random while in grass/tall grass)
    if (Math.random() < GRASS_ENCOUNTER_CHANCE) {
      const block = this.world.getBlock(
        Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z)
      );
      // BLOCK.TALL_GRASS = 15
      if (block === 15) {
        const biome = this._getBiomeAt(Math.floor(playerPos.x), Math.floor(playerPos.z));
        const candidates = SPAWN_TABLE.filter(e => e.biomes.includes(biome));
        const pool = candidates.length > 0 ? candidates : SPAWN_TABLE;
        const picked = this._weightedRandom(pool);
        const pokemonData = POKEDEX[picked.name];
        if (!pokemonData && this.onEncounter) return;

        this._encounterCooldown = 8;
        const wildData = { ...pokemonData, name: picked.name, level: Math.floor(Math.random()*5)+2 };
        // Create temp entity for battle
        const tempEntity = new PokemonEntity(this.scene, picked.name, {
          ...pokemonData, spawnX: playerPos.x + 2, spawnY: playerPos.y, spawnZ: playerPos.z + 2,
        });
        this.entities.push(tempEntity);
        if (this.onEncounter) this.onEncounter(tempEntity, playerPos);
      }
    }
  }

  update(delta, playerPos) {
    if (this._encounterCooldown > 0) this._encounterCooldown -= delta;

    // Spawn timer
    this._spawnTimer -= delta;
    if (this._spawnTimer <= 0) {
      this._spawnTimer = 3 + Math.random() * 4;
      this._spawnNear(playerPos);
    }

    // Update entities + remove far ones
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      const dx = e.group.position.x - playerPos.x;
      const dz = e.group.position.z - playerPos.z;
      if (dx*dx + dz*dz > 80*80) {
        e.dispose();
        this.entities.splice(i, 1);
        continue;
      }
      e.update(delta, this.world);
    }

    this._checkEncounter(playerPos);
  }
}
