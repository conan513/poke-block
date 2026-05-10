// src/engine/ChunkGenerator.js – World gen with ores, farming, biomes
import { CHUNK_SIZE, CHUNK_HEIGHT, BLOCK } from './Constants.js';
import { createNoise2D } from 'simplex-noise';

const BIOMES = {
  PLAINS:    { id: 'plains',    color: [0.4, 0.8, 0.3], height: 5,  scale: 0.01 },
  FOREST:    { id: 'forest',    color: [0.2, 0.6, 0.1], height: 12, scale: 0.02 },
  DESERT:    { id: 'desert',    color: [0.9, 0.8, 0.4], height: 3,  scale: 0.03 },
  MOUNTAINS: { id: 'mountains', color: [0.6, 0.6, 0.6], height: 45, scale: 0.005 },
  SWAMP:     { id: 'swamp',     color: [0.3, 0.4, 0.2], height: 2,  scale: 0.01 },
  JUNGLE:    { id: 'jungle',    color: [0.1, 0.7, 0.2], height: 15, scale: 0.04 },
  TUNDRA:    { id: 'tundra',    color: [0.8, 0.9, 1.0], height: 8,  scale: 0.01 },
  SNOWY:     { id: 'snowy',     color: [1.0, 1.0, 1.0], height: 10, scale: 0.02 },
  SAVANNA:   { id: 'savanna',   color: [0.7, 0.7, 0.3], height: 6,  scale: 0.02 },
  BEACH:     { id: 'beach',     color: [0.9, 0.9, 0.6], height: 1,  scale: 0.05 },
  VILLAGE:   { id: 'village',   color: [0.5, 0.7, 0.4], height: 4,  scale: 0.01 },
  CITY:      { id: 'city',      color: [0.4, 0.4, 0.5], height: 2,  scale: 0.01 },
};

// Ore generation table: [blockId, minY, maxY, veinSize, chancePer16]
const ORES = [
  [BLOCK.COAL_ORE,    1, 60, 12, 20],
  [BLOCK.IRON_ORE,    1, 48,  8, 20],
  [BLOCK.GOLD_ORE,    1, 28,  6,  4],
  [BLOCK.LAPIS_ORE,  10, 22,  6,  2],
  [BLOCK.REDSTONE_ORE, 1, 14, 6,  8],
  [BLOCK.DIAMOND_ORE,  1, 12,  4,  1],
];

export class ChunkGenerator {
  constructor(seed = 'poke-block-v2') {
    this.noise = {
      height:   createNoise2D(() => 0.123),
      height2:  createNoise2D(() => 0.456),
      height3:  createNoise2D(() => 0.789),
      biome:    createNoise2D(() => 0.111),
      moisture: createNoise2D(() => 0.222),
      cave:     createNoise2D(() => 0.333),
      tree:     createNoise2D(() => 0.444),
      grass:    createNoise2D(() => 0.555),
      city:     createNoise2D(() => 0.666),
      village:  createNoise2D(() => 0.777),
      ore:      createNoise2D(() => 0.888),
    };
    this.WATER_LEVEL = 28;
  }

  _getSettlementWeight(wx, wz) {
    let weight = 0;
    const cityNoise = this.noise.city(wx * 0.002, wz * 0.002);
    if (cityNoise > 0.6) weight = Math.max(weight, Math.min(1.0, (cityNoise - 0.6) / 0.1));
    const villageNoise = this.noise.village(wx * 0.003, wz * 0.003);
    if (villageNoise > 0.5) weight = Math.max(weight, Math.min(1.0, (villageNoise - 0.5) / 0.1));
    return weight;
  }

  _getBiome(wx, wz) {
    const sw = this._getSettlementWeight(wx, wz);
    const dither = this.noise.grass(wx * 0.5, wz * 0.5) * 0.1;
    if (sw + dither > 0.45) {
      return this.noise.city(wx * 0.002, wz * 0.002) > 0.65 ? BIOMES.CITY : BIOMES.VILLAGE;
    }
    const t = (this.noise.biome(wx * 0.003, wz * 0.003) + 1) / 2;
    const m = (this.noise.moisture(wx * 0.004, wz * 0.004) + 1) / 2;
    if (t < 0.18) return m < 0.5 ? BIOMES.TUNDRA : BIOMES.SNOWY;
    if (t < 0.35) return m < 0.4 ? BIOMES.SNOWY : BIOMES.FOREST;
    if (t < 0.55) {
      if (m < 0.2) return BIOMES.DESERT;
      if (m < 0.5) return BIOMES.PLAINS;
      return BIOMES.FOREST;
    }
    if (t < 0.75) {
      if (m < 0.3) return BIOMES.SAVANNA;
      if (m < 0.6) return BIOMES.PLAINS;
      return BIOMES.SWAMP;
    }
    return m < 0.4 ? BIOMES.DESERT : BIOMES.JUNGLE;
  }

  _getHeight(wx, wz) {
    let h = 0;
    h += this.noise.height(wx * 0.008, wz * 0.008) * 18;
    h += this.noise.height2(wx * 0.025, wz * 0.025) * 7;
    h += this.noise.height3(wx * 0.07,  wz * 0.07)  * 2.5;
    const mountain = 0; // biome2 not seeded
    let finalH = h + this.WATER_LEVEL + 3;
    const sw = this._getSettlementWeight(wx, wz);
    if (sw > 0) finalH = finalH * (1 - sw) + (this.WATER_LEVEL + 5) * sw;
    return Math.floor(finalH);
  }

  _hasCave(wx, ly, wz) {
    return this.noise.cave(wx * 0.05, wz * 0.05) > 0.6 && ly < 40;
  }

  generateChunk(cx, cz, SIZE, HEIGHT) {
    const data = new Uint8Array(SIZE * SIZE * HEIGHT);
    const set  = (lx, ly, lz, b) => {
      if (lx < 0 || lx >= SIZE || ly < 0 || ly >= HEIGHT || lz < 0 || lz >= SIZE) return;
      data[lx + lz * SIZE + ly * SIZE * SIZE] = b;
    };
    const get = (lx, ly, lz) => {
      if (lx < 0 || lx >= SIZE || ly < 0 || ly >= HEIGHT || lz < 0 || lz >= SIZE) return BLOCK.AIR;
      return data[lx + lz * SIZE + ly * SIZE * SIZE];
    };

    const originX = cx * SIZE, originZ = cz * SIZE;

    // --- Pass 1: terrain ---
    for (let lx = 0; lx < SIZE; lx++) {
      for (let lz = 0; lz < SIZE; lz++) {
        const wx = originX + lx, wz = originZ + lz;
        const biome = this._getBiome(wx, wz);
        let surfaceY = this._getHeight(wx, wz);
        let surfaceBlock = BLOCK.GRASS, subsurfaceBlock = BLOCK.DIRT;

        const isSettlement = biome.id === 'city' || biome.id === 'village';
        const isCity       = biome.id === 'city';
        const spacing      = isCity ? 12 : 24;
        const pathWidth    = isCity ? 4 : 3;
        const onPathX      = Math.abs((wx + spacing/2) % spacing - spacing/2) < pathWidth/2;
        const onPathZ      = Math.abs((wz + spacing/2) % spacing - spacing/2) < pathWidth/2;
        const isPath       = isSettlement && (onPathX || onPathZ);

        if (surfaceY <= this.WATER_LEVEL + 1) {
          surfaceBlock = BLOCK.SAND;
        } else {
          switch (biome.id) {
            case 'desert':  surfaceBlock = BLOCK.SAND;  subsurfaceBlock = BLOCK.SAND;  break;
            case 'snowy': case 'tundra': surfaceBlock = BLOCK.SNOW; break;
            case 'jungle': surfaceBlock = BLOCK.PODZOL; break;
            case 'beach':  surfaceBlock = BLOCK.SAND;   break;
            case 'city': case 'village':
              if (isPath) {
                surfaceBlock = isCity ? BLOCK.STONE_BRICKS : BLOCK.COBBLESTONE;
                if (!isCity) surfaceY = Math.min(surfaceY, this.WATER_LEVEL + 6);
              } else {
                surfaceBlock = isCity ? BLOCK.COBBLESTONE : BLOCK.GRASS;
              }
              break;
            default: surfaceBlock = BLOCK.GRASS;
          }
        }

        for (let ly = 0; ly < HEIGHT; ly++) {
          if (ly === 0)                                              { set(lx, ly, lz, BLOCK.BEDROCK); continue; }
          if (this._hasCave(wx, ly, wz) && ly > 3 && ly < surfaceY - 2) continue;
          if (ly < surfaceY - 4)     set(lx, ly, lz, BLOCK.STONE);
          else if (ly < surfaceY - 1)set(lx, ly, lz, subsurfaceBlock);
          else if (ly === surfaceY - 1) set(lx, ly, lz, surfaceBlock);
          else if (ly <= this.WATER_LEVEL) set(lx, ly, lz, BLOCK.WATER);
        }

        // Features on surface
        if (surfaceY > this.WATER_LEVEL) {
          const treeSample  = this.noise.tree(wx * 0.3,  wz * 0.3);
          const grassSample = this.noise.grass(wx * 0.8, wz * 0.8);

          if (!isSettlement && !isPath) {
            if (surfaceBlock === BLOCK.GRASS || surfaceBlock === BLOCK.PODZOL || surfaceBlock === BLOCK.SNOW) {
              if (treeSample > 0.55) {
                this._placeTree(data, lx, surfaceY, lz, biome, SIZE, HEIGHT);
              } else if (grassSample > 0.2 && surfaceBlock === BLOCK.GRASS) {
                set(lx, surfaceY, lz, BLOCK.TALL_GRASS);
              } else if (grassSample > 0.75 && surfaceBlock === BLOCK.GRASS) {
                set(lx, surfaceY, lz, BLOCK.FLOWER);
              }
            }
          } else if (isSettlement && !isPath && surfaceBlock === BLOCK.GRASS) {
            if (grassSample > 0.6) set(lx, surfaceY, lz, BLOCK.TALL_GRASS);
            if (grassSample > 0.9) set(lx, surfaceY, lz, BLOCK.FLOWER);
          }

          if (isSettlement) {
            if (Math.abs((wx + spacing/2) % spacing) === Math.floor(pathWidth/2) + 1 &&
                Math.abs((wz + spacing/2) % spacing) === Math.floor(pathWidth/2) + 1) {
              set(lx, surfaceY,   lz, BLOCK.OAK_LOG);
              set(lx, surfaceY+1, lz, BLOCK.OAK_LOG);
              set(lx, surfaceY+2, lz, BLOCK.GLOWSTONE);
            }
            if (!isPath && Math.abs(wx % spacing) === Math.floor(spacing/2) &&
                            Math.abs(wz % spacing) === Math.floor(spacing/2)) {
              if (lx >= 4 && lx <= SIZE-8 && lz >= 4 && lz <= SIZE-8) {
                this._placeHouse(data, lx, surfaceY, lz, isCity, SIZE, HEIGHT);
              }
            }
          }
        }
      }
    }

    // --- Pass 2: ore veins ---
    for (const [oreId, minY, maxY, veinSz, freq] of ORES) {
      for (let attempt = 0; attempt < freq; attempt++) {
        // Deterministic pseudo-random per chunk + attempt
        const seed  = (cx * 73856093) ^ (cz * 19349663) ^ (attempt * 83492791) ^ (oreId * 6271);
        const rng   = this._lcg(seed);
        const lx    = rng(SIZE), lz = rng(SIZE);
        const ly    = minY + rng(maxY - minY);

        for (let v = 0; v < veinSz; v++) {
          const vSeed = this._lcg(seed ^ (v * 22695477));
          const vx = lx + vSeed(3) - 1;
          const vy = ly + vSeed(3) - 1;
          const vz = lz + vSeed(3) - 1;
          if (get(vx, vy, vz) === BLOCK.STONE) set(vx, vy, vz, oreId);
        }
      }
    }

    return data;
  }

  /** Simple LCG: returns fn(max) -> 0..max-1 */
  _lcg(seed) {
    let s = (seed >>> 0) + 1;
    return (max) => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s % max;
    };
  }

  _placeTree(data, lx, ly, lz, biome, SIZE, HEIGHT) {
    const set = (x,y,z,v) => {
      if (x<0||x>=SIZE||y<0||y>=HEIGHT||z<0||z>=SIZE) return;
      data[x+z*SIZE+y*SIZE*SIZE]=v;
    };
    const h    = 4 + Math.floor(Math.random() * 3);
    const log  = biome.id==='jungle' ? BLOCK.JUNGLE_LOG  : biome.id==='snowy' ? BLOCK.SPRUCE_LOG  : BLOCK.OAK_LOG;
    const leaf = biome.id==='jungle' ? BLOCK.JUNGLE_LEAVES: biome.id==='snowy' ? BLOCK.SPRUCE_LEAVES: BLOCK.OAK_LEAVES;
    for (let i=0;i<h;i++) set(lx,ly+i,lz,log);
    for (let dx=-2;dx<=2;dx++) for (let dz=-2;dz<=2;dz++) for (let dy=-2;dy<=2;dy++) {
      if (dx*dx+dy*dy+dz*dz<6) set(lx+dx,ly+h+dy,lz+dz,leaf);
    }
  }

  _placeHouse(data, lx, ly, lz, isCity, SIZE, HEIGHT) {
    const set = (x,y,z,v) => {
      if (x<0||x>=SIZE||y<0||y>=HEIGHT||z<0||z>=SIZE) return;
      data[x+z*SIZE+y*SIZE*SIZE]=v;
    };
    const h    = isCity ? 8 : 5;
    const wall = isCity ? BLOCK.STONE_BRICKS : BLOCK.COBBLESTONE;
    for (let dx=-2;dx<=2;dx++) for (let dz=-2;dz<=2;dz++) for (let dy=0;dy<h;dy++) {
      const isWall = Math.abs(dx)===2 || Math.abs(dz)===2;
      if (isWall) set(lx+dx,ly+dy,lz+dz,wall);
      else if (dy===0) set(lx+dx,ly,lz+dz,BLOCK.OAK_PLANKS);
      else if (dy===h-1) set(lx+dx,ly+dy,lz+dz,BLOCK.OAK_PLANKS);
    }
    if (!isCity) {
      for (let i=-3;i<=3;i++) for (let j=0;j<=3;j++) {
        set(lx+i,ly+h+j-1,lz-3+j,BLOCK.OAK_PLANKS);
        set(lx+i,ly+h+j-1,lz+3-j,BLOCK.OAK_PLANKS);
      }
    }
    set(lx,ly+1,lz+2,BLOCK.AIR);
    set(lx,ly+2,lz+2,BLOCK.AIR);
    // Place crafting table inside
    set(lx-1,ly+1,lz-1,BLOCK.CRAFTING_TABLE);
  }
}
