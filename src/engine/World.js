// src/engine/World.js – Voxel world with chunk manager, biomes, instanced rendering
import * as THREE from 'three';
import { ChunkGenerator } from './ChunkGenerator.js';
import { TexturePackLoader } from '../textures/TexturePackLoader.js';

import { CHUNK_SIZE, CHUNK_HEIGHT, RENDER_DISTANCE, BLOCK } from './Constants.js';

const BLOCK_NAMES = {
  [BLOCK.GRASS]: 'grass_block',
  [BLOCK.DIRT]: 'dirt',
  [BLOCK.STONE]: 'stone',
  [BLOCK.SAND]: 'sand',
  [BLOCK.WATER]: 'water_still',
  [BLOCK.SNOW]: 'snow',
  [BLOCK.GRAVEL]: 'gravel',
  [BLOCK.OAK_LOG]: 'oak_log',
  [BLOCK.OAK_LEAVES]: 'oak_leaves',
  [BLOCK.OAK_PLANKS]: 'oak_planks',
  [BLOCK.STONE_BRICKS]: 'stone_bricks',
  [BLOCK.COBBLESTONE]: 'cobblestone',
  [BLOCK.BEDROCK]: 'bedrock',
  [BLOCK.GLASS]: 'glass',
  [BLOCK.LAVA]: 'lava_still',
  [BLOCK.OBSIDIAN]: 'obsidian',
  [BLOCK.BIRCH_LOG]: 'birch_log',
  [BLOCK.BIRCH_LEAVES]: 'birch_leaves',
  [BLOCK.SPRUCE_LOG]: 'spruce_log',
  [BLOCK.SPRUCE_LEAVES]: 'spruce_leaves',
  [BLOCK.RED_SAND]: 'red_sand',
  [BLOCK.CACTUS]: 'cactus_side',
  [BLOCK.ICE]: 'ice',
  [BLOCK.PACKED_ICE]: 'packed_ice',
  [BLOCK.PODZOL]: 'podzol_side',
  [BLOCK.JUNGLE_LOG]: 'jungle_log',
  [BLOCK.JUNGLE_LEAVES]: 'jungle_leaves',
  [BLOCK.CORAL]: 'brain_coral_block',
  [BLOCK.GLOWSTONE]: 'glowstone',
  // Ores
  [BLOCK.COAL_ORE]:      'coal_ore',
  [BLOCK.IRON_ORE]:      'iron_ore',
  [BLOCK.GOLD_ORE]:      'gold_ore',
  [BLOCK.DIAMOND_ORE]:   'diamond_ore',
  [BLOCK.LAPIS_ORE]:     'lapis_ore',
  [BLOCK.REDSTONE_ORE]:  'redstone_ore',
  // Utility
  [BLOCK.CRAFTING_TABLE]:'crafting_table_top',
  [BLOCK.FURNACE]:       'furnace_front_on',
  [BLOCK.CHEST]:         'oak_planks',
  [BLOCK.TORCH]:         'stone',
  // Farming
  [BLOCK.FARMLAND]:      'farmland_moist',
  [BLOCK.WHEAT_0]:       'wheat_stage0',
  [BLOCK.WHEAT_1]:       'wheat_stage2',
  [BLOCK.WHEAT_2]:       'wheat_stage4',
  [BLOCK.WHEAT_3]:       'wheat_stage7',
  // Mineral blocks
  [BLOCK.IRON_BLOCK]:    'iron_block',
  [BLOCK.GOLD_BLOCK]:    'gold_block',
  [BLOCK.DIAMOND_BLOCK]: 'diamond_block',
};

export class World {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map(); // "cx,cz" -> chunk data
    this.meshes = new Map(); // "cx,cz" -> THREE.Mesh
    this.generator = new ChunkGenerator();
    this.textureLoader = new TexturePackLoader();
    this._pendingRemesh = new Set();
    this.pendingChunks = new Set();
    this.time = 0;
    this._scanIndex = 0;
    this.tMaterials = []; 
    this.activeLights = new Map();
    this.lightPool = [];
    this._lightsChanged = true;
    this.lastLightPos = new THREE.Vector3(-999, -999, -999);
    this._meshingThisFrame = false;

    // Initialize Worker for background generation
    this.worker = new Worker(new URL('./ChunkWorker.js', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => {
      const { cx, cz, data, lights } = e.data;
      const key = this.chunkKey(cx, cz);
      this.chunks.set(key, data);
      this.pendingChunks.delete(key);
      
      // Process lights from worker
      if (lights && lights.length > 0) {
        lights.forEach(l => {
          const lkey = `${l.x},${l.y},${l.z}`;
          this.activeLights.set(lkey, l);
        });
        this._lightsChanged = true;
      }

      // Mark for remesh
      this._pendingRemesh.add(key);
      // Mark neighbors for remesh to fix AO/culling at borders
      [
        [1,0], [-1,0], [0,1], [0,-1]
      ].forEach(([dx, dz]) => {
        const nKey = this.chunkKey(cx + dx, cz + dz);
        if (this.chunks.has(nKey)) this._pendingRemesh.add(nKey);
      });
    };
  }

  async init() {
    await this.textureLoader.init(BLOCK_NAMES);
  }

  chunkKey(cx, cz) { return `${cx},${cz}`; }

  getChunk(cx, cz) {
    const key = this.chunkKey(cx, cz);
    return this.chunks.get(key);
  }

  requestChunk(cx, cz) {
    const key = this.chunkKey(cx, cz);
    if (this.chunks.has(key) || this.pendingChunks.has(key)) return;

    this.pendingChunks.add(key);
    this.worker.postMessage({ cx, cz, SIZE: CHUNK_SIZE, HEIGHT: CHUNK_HEIGHT });
  }

  getBlock(wx, wy, wz) {
    if (wy < 0) return BLOCK.BEDROCK;
    if (wy >= CHUNK_HEIGHT) return BLOCK.AIR;
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return BLOCK.AIR; // Safe fallback for unloaded chunks
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk[lx + lz * CHUNK_SIZE + wy * CHUNK_SIZE * CHUNK_SIZE] || BLOCK.AIR;
  }

  isSolid(wx, wy, wz) {
    const b = this.getBlock(wx, wy, wz);
    return b !== BLOCK.AIR && b !== BLOCK.WATER && b !== BLOCK.TALL_GRASS && b !== BLOCK.FLOWER
        && b !== BLOCK.WHEAT_0 && b !== BLOCK.WHEAT_1 && b !== BLOCK.WHEAT_2 && b !== BLOCK.WHEAT_3
        && b !== BLOCK.TORCH;
  }

  isTransparent(b) {
    return b === BLOCK.AIR || b === BLOCK.WATER || b === BLOCK.GLASS
        || b === BLOCK.OAK_LEAVES || b === BLOCK.BIRCH_LEAVES
        || b === BLOCK.SPRUCE_LEAVES || b === BLOCK.JUNGLE_LEAVES
        || b === BLOCK.TALL_GRASS || b === BLOCK.FLOWER
        || b === BLOCK.WHEAT_0 || b === BLOCK.WHEAT_1 || b === BLOCK.WHEAT_2 || b === BLOCK.WHEAT_3
        || b === BLOCK.TORCH;
  }

  /** Set a block in the world and schedule remesh of its chunk */
  setBlock(wx, wy, wz, blockId) {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return;
    const cx  = Math.floor(wx / CHUNK_SIZE);
    const cz  = Math.floor(wz / CHUNK_SIZE);
    const key = this.chunkKey(cx, cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    chunk[lx + lz * CHUNK_SIZE + wy * CHUNK_SIZE * CHUNK_SIZE] = blockId;
    this._pendingRemesh.add(key);
    // Remesh neighbours so seam AO is correct
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dx,dz]) => {
      const nk = this.chunkKey(cx+dx, cz+dz);
      if (this.chunks.has(nk)) this._pendingRemesh.add(nk);
    });
    // Handle light
    if (blockId === BLOCK.GLOWSTONE || blockId === BLOCK.TORCH) {
      const lkey = `${wx},${wy},${wz}`;
      this.activeLights.set(lkey, { x: wx, y: wy, z: wz });
      this._lightsChanged = true;
    }
  }

  /** Advance crop growth (call once per second from update) */
  _tickFarming() {
    // Random tick: sample a few chunks near player each second
    for (const [key, chunk] of this.chunks) {
      if (Math.random() > 0.05) continue; // only 5% of chunks per tick
      const [cx, cz] = key.split(',').map(Number);
      const ox = cx * CHUNK_SIZE, oz = cz * CHUNK_SIZE;
      // pick random block in chunk
      for (let tries = 0; tries < 3; tries++) {
        const lx = Math.floor(Math.random() * CHUNK_SIZE);
        const lz = Math.floor(Math.random() * CHUNK_SIZE);
        const ly = Math.floor(Math.random() * CHUNK_HEIGHT);
        const b  = chunk[lx + lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE];
        if (b >= BLOCK.WHEAT_0 && b <= BLOCK.WHEAT_2) {
          this.setBlock(ox + lx, ly, oz + lz, b + 1);
        }
      }
    }
  }

  getSurfaceY(wx, wz) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    if (!this.chunks.has(this.chunkKey(cx, cz))) return 30; // Default height if not loaded

    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      const b = this.getBlock(wx, y, wz);
      if (b !== BLOCK.AIR && b !== BLOCK.WATER && b !== BLOCK.TALL_GRASS && b !== BLOCK.FLOWER) {
        return y + 1;
      }
    }
    return 1;
  }

  _buildChunkMesh(cx, cz, lod = 0) {
    const key = this.chunkKey(cx, cz);
    // Remove old mesh
    if (this.meshes.has(key)) {
      const old = this.meshes.get(key);
      this.scene.remove(old.group);
      old.group.children?.forEach(c => c.geometry?.dispose());
    }

    const chunk = this.getChunk(cx, cz);
    if (!chunk) return;

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const colors = [];
    let vi = 0;

    const FACES = [
      { dir: [0,1,0],  corners: [[-0.5,0.5,0.5],  [0.5,0.5,0.5],   [0.5,0.5,-0.5],  [-0.5,0.5,-0.5]],  nx:[0,1,0] },  // top
      { dir: [0,-1,0], corners: [[-0.5,-0.5,-0.5],[0.5,-0.5,-0.5],[0.5,-0.5,0.5],  [-0.5,-0.5,0.5]],  nx:[0,-1,0] }, // bottom
      { dir: [1,0,0],  corners: [[0.5,-0.5,0.5],  [0.5,-0.5,-0.5], [0.5,0.5,-0.5],  [0.5,0.5,0.5]],    nx:[1,0,0] },  // right
      { dir: [-1,0,0], corners: [[-0.5,-0.5,-0.5],[-0.5,-0.5,0.5], [-0.5,0.5,0.5],  [-0.5,0.5,-0.5]],  nx:[-1,0,0] }, // left
      { dir: [0,0,1],  corners: [[-0.5,-0.5,0.5], [0.5,-0.5,0.5],  [0.5,0.5,0.5],   [-0.5,0.5,0.5]],   nx:[0,0,1] },  // front
      { dir: [0,0,-1], corners: [[0.5,-0.5,-0.5], [-0.5,-0.5,-0.5],[-0.5,0.5,-0.5], [0.5,0.5,-0.5]],   nx:[0,0,-1] }  // back
    ];

    const originX = cx * CHUNK_SIZE;
    const originZ = cz * CHUNK_SIZE;

    // Cache biome colors for the whole chunk column
    const biomeColors = new Float32Array(CHUNK_SIZE * CHUNK_SIZE * 3);
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const biome = this.generator._getBiome(originX + lx, originZ + lz);
        const bIdx = (lx + lz * CHUNK_SIZE) * 3;
        biomeColors[bIdx] = biome.color[0];
        biomeColors[bIdx+1] = biome.color[1];
        biomeColors[bIdx+2] = biome.color[2];
      }
    }

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const bIdx = (lx + lz * CHUNK_SIZE) * 3;
        const br = biomeColors[bIdx], bg = biomeColors[bIdx+1], bb = biomeColors[bIdx+2];
        
        for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
          const blockId = chunk[lx + lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE];
          if (blockId === BLOCK.AIR) continue;
          
          if (blockId === BLOCK.TALL_GRASS || blockId === BLOCK.FLOWER) continue;

          const wx = originX + lx;
          const wy = ly;
          const wz = originZ + lz;

          for (const face of FACES) {
            const nx = wx + face.dir[0], ny = wy + face.dir[1], nz = wz + face.dir[2];
            
            // Fast neighbor lookup
            let neighbor;
            if (nx >= originX && nx < originX + CHUNK_SIZE && nz >= originZ && nz < originZ + CHUNK_SIZE && ny >= 0 && ny < CHUNK_HEIGHT) {
              neighbor = chunk[(nx-originX) + (nz-originZ)*CHUNK_SIZE + ny*CHUNK_SIZE*CHUNK_SIZE];
            } else {
              neighbor = this.getBlock(nx, ny, nz);
            }

            if (!this.isTransparent(neighbor) && neighbor !== BLOCK.WATER) continue;

            const uvRect = this.textureLoader.getUV(blockId, face.dir);
            const [u0,v0,u1,v1] = uvRect;

            // standard UV mapping for faces: BL, BR, TR, TL
            // If v0 is bottom and v1 is top: [u0,v0], [u1,v0], [u1,v1], [u0,v1]
            // We need to match the corners: 

            // 0: Bottom-Left, 1: Bottom-Right, 2: Top-Right, 3: Top-Left
            let uvCorners = [[u0,v0], [u1,v0], [u1,v1], [u0,v1]];

            // Random rotation for top faces of natural ground blocks to break tiling pattern
            if (face.dir[1] === 1 && (blockId === BLOCK.GRASS || blockId === BLOCK.DIRT || blockId === BLOCK.SAND || blockId === BLOCK.STONE || blockId === BLOCK.BEDROCK || blockId === BLOCK.SNOW || blockId === BLOCK.PODZOL)) {
              const hash = Math.abs((wx * 3129871) ^ (wz * 116129781)) % 4;
              if (hash === 1) uvCorners = [[uvCorners[1][0], uvCorners[1][1]], [uvCorners[2][0], uvCorners[2][1]], [uvCorners[3][0], uvCorners[3][1]], [uvCorners[0][0], uvCorners[0][1]]];
              else if (hash === 2) uvCorners = [[uvCorners[2][0], uvCorners[2][1]], [uvCorners[3][0], uvCorners[3][1]], [uvCorners[0][0], uvCorners[0][1]], [uvCorners[1][0], uvCorners[1][1]]];
              else if (hash === 3) uvCorners = [[uvCorners[3][0], uvCorners[3][1]], [uvCorners[0][0], uvCorners[0][1]], [uvCorners[1][0], uvCorners[1][1]], [uvCorners[2][0], uvCorners[2][1]]];
            }

            // Proper Smooth Lighting (Minecraft-style Vertex AO)
            const aoValues = face.corners.map(([cx2,cy2,cz2]) => {
              if (lod > 0) return 1.0;
              const dx = Math.sign(cx2), dy = Math.sign(cy2), dz = Math.sign(cz2);
              let s1x = wx + face.nx[0], s1y = wy + face.nx[1], s1z = wz + face.nx[2];
              let s2x = wx + face.nx[0], s2y = wy + face.nx[1], s2z = wz + face.nx[2];
              let ccx = wx + face.nx[0], ccy = wy + face.nx[1], ccz = wz + face.nx[2];

              if (face.nx[0] !== 0) { s1y += dy; s2z += dz; ccy += dy; ccz += dz; }
              else if (face.nx[1] !== 0) { s1x += dx; s2z += dz; ccx += dx; ccz += dz; }
              else { s1x += dx; s2y += dy; ccx += dx; ccy += dy; }

              const side1 = this.isSolid(s1x, s1y, s1z) ? 1 : 0;
              const side2 = this.isSolid(s2x, s2y, s2z) ? 1 : 0;
              const corner = this.isSolid(ccx, ccy, ccz) ? 1 : 0;

              const occ = (side1 && side2) ? 3 : (side1 + side2 + corner);
              return 1.0 - (occ * 0.2); 
            });

            // Biome tinting
            let tr = 1.0, tg = 1.0, tb = 1.0;
            if (blockId === BLOCK.GRASS || blockId === BLOCK.OAK_LEAVES) {
               tr = br; tg = bg; tb = bb;
            }

            for (let i = 0; i < 4; i++) {
              const [cx2,cy2,cz2] = face.corners[i];
              positions.push(wx + 0.5 + cx2, wy + 0.5 + cy2, wz + 0.5 + cz2);
              normals.push(...face.nx);
              uvs.push(...uvCorners[i]);
              const ao = aoValues[i];
              colors.push(ao * tr, ao * tg, ao * tb);
            }
            indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
            vi += 4;
          }
        }
      }
    }

    // Transparent pass (water/leaves)
    const tPositions=[], tNormals=[], tUvs=[], tIndices=[], tColors=[];
    let tvi = 0;
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const bIdx = (lx + lz * CHUNK_SIZE) * 3;
        const br = biomeColors[bIdx], bg = biomeColors[bIdx+1], bb = biomeColors[bIdx+2];

        for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
          const blockId = chunk[lx + lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE];
          if (!this.isTransparent(blockId) || blockId === BLOCK.AIR) continue;
          if (blockId === BLOCK.TALL_GRASS || blockId === BLOCK.FLOWER) continue;

          const wx = originX + lx, wy = ly, wz = originZ + lz;

          for (const face of FACES) {
            const nx = wx + face.dir[0], ny = wy + face.dir[1], nz = wz + face.dir[2];
            let neighbor;
            if (nx >= originX && nx < originX + CHUNK_SIZE && nz >= originZ && nz < originZ + CHUNK_SIZE && ny >= 0 && ny < CHUNK_HEIGHT) {
              neighbor = chunk[(nx-originX) + (nz-originZ)*CHUNK_SIZE + ny*CHUNK_SIZE*CHUNK_SIZE];
            } else {
              neighbor = this.getBlock(nx, ny, nz);
            }

            if (neighbor === blockId) continue;
            if (!this.isTransparent(neighbor)) continue;

            const uvRect = this.textureLoader.getUV(blockId, face.dir);
            const [u0,v0,u1,v1] = uvRect;
            let uvCorners = [[u0,v0], [u1,v0], [u1,v1], [u0,v1]];

            if (face.dir[1] === 1 && blockId === BLOCK.WATER) {
              const hash = Math.abs((wx * 3129871) ^ (wz * 116129781)) % 4;
              if (hash === 1) uvCorners = [[uvCorners[1][0], uvCorners[1][1]], [uvCorners[2][0], uvCorners[2][1]], [uvCorners[3][0], uvCorners[3][1]], [uvCorners[0][0], uvCorners[0][1]]];
              else if (hash === 2) uvCorners = [[uvCorners[2][0], uvCorners[2][1]], [uvCorners[3][0], uvCorners[3][1]], [uvCorners[0][0], uvCorners[0][1]], [uvCorners[1][0], uvCorners[1][1]]];
              else if (hash === 3) uvCorners = [[uvCorners[3][0], uvCorners[3][1]], [uvCorners[0][0], uvCorners[0][1]], [uvCorners[1][0], uvCorners[1][1]], [uvCorners[2][0], uvCorners[2][1]]];
            }

            let tr = 1.0, tg = 1.0, tb = 1.0;
            if (blockId === BLOCK.OAK_LEAVES) { tr = br; tg = bg; tb = bb; }

            for (let i = 0; i < 4; i++) {
              const [cx2,cy2,cz2] = face.corners[i];
              tPositions.push(wx + 0.5 + cx2, wy + 0.5 + cy2, wz + 0.5 + cz2);
              tNormals.push(...face.nx);
              tUvs.push(...uvCorners[i]);
              tColors.push(0.8 * tr, 0.8 * tg, 0.8 * tb);
            }
            tIndices.push(tvi,tvi+1,tvi+2,tvi,tvi+2,tvi+3);
            tvi += 4;
          }
        }
      }
    }

    const group = new THREE.Group();

    if (positions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geo.setIndex(indices);
      geo.computeBoundingSphere();
      const mat = this.textureLoader.getMaterial(false);
      mat.vertexColors = true;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    if (tPositions.length > 0) {
      const tGeo = new THREE.BufferGeometry();
      tGeo.setAttribute('position', new THREE.Float32BufferAttribute(tPositions, 3));
      tGeo.setAttribute('normal', new THREE.Float32BufferAttribute(tNormals, 3));
      tGeo.setAttribute('uv', new THREE.Float32BufferAttribute(tUvs, 2));
      tGeo.setAttribute('color', new THREE.Float32BufferAttribute(tColors, 3));
      tGeo.setIndex(tIndices);
      
      const tMat = this.textureLoader.getMaterial(true);
      tMat.vertexColors = true;
      
      // Add custom shader for animated water
      tMat.onBeforeCompile = (shader) => {
        shader.uniforms.time = { value: 0 };
        this.tMaterials.push(shader);
        shader.vertexShader = `
          uniform float time;
          ${shader.vertexShader}
        `.replace(
          `#include <begin_vertex>`,
          `
          #include <begin_vertex>
          // Apply wave only to water blocks (water level is y<=28 in this engine)
          if (position.y <= 29.5) {
            float wave = sin(position.x * 2.0 + time * 3.0) * cos(position.z * 2.0 + time * 2.0) * 0.1;
            transformed.y += wave;
          }
          `
        );
      };

      const tMesh = new THREE.Mesh(tGeo, tMat);
      group.add(tMesh);
    }

    this.scene.add(group);
    this.meshes.set(key, { group, lod });

    // Decorative geometry (grass / flowers) on top
    if (lod === 0) {
      this._addVegetation(cx, cz, chunk, group, originX, originZ);
    }
  }

  _addVegetation(cx, cz, chunk, parent, originX, originZ) {
    const positions = [], uvs = [], colors = [];
    const biomeColors = new Float32Array(CHUNK_SIZE * CHUNK_SIZE * 3);
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const biome = this.generator._getBiome(originX + lx, originZ + lz);
        const bIdx = (lx + lz * CHUNK_SIZE) * 3;
        biomeColors[bIdx] = biome.color[0];
        biomeColors[bIdx+1] = biome.color[1];
        biomeColors[bIdx+2] = biome.color[2];
      }
    }

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const bIdx = (lx + lz * CHUNK_SIZE) * 3;
        const tr = biomeColors[bIdx], tg = biomeColors[bIdx+1], tb = biomeColors[bIdx+2];
        const wx = originX + lx, wz = originZ + lz;

        for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
          const blockId = chunk[lx + lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE];
          if (blockId === BLOCK.AIR) continue;

          if (blockId !== BLOCK.TALL_GRASS && blockId !== BLOCK.FLOWER) continue;

          // Cross billboard
          const h = 0.9, half = 0.45, y = ly;
          const uvRect = this.textureLoader.getUV(blockId, [0,1,0]);
          const [u0,v0,u1,v1] = uvRect;

          const cx = wx + 0.5, cz = wz + 0.5;
          // Quad 1: Z-axis
          positions.push(cx-half,y+h,cz, cx+half,y+h,cz, cx+half,y,cz, cx-half,y,cz);
          uvs.push(u0,v0, u1,v0, u1,v1, u0,v1);
          colors.push(tr,tg,tb, tr,tg,tb, tr,tg,tb, tr,tg,tb);
          // Quad 2: X-axis
          positions.push(cx,y+h,cz-half, cx,y+h,cz+half, cx,y,cz+half, cx,y,cz-half);
          uvs.push(u0,v0, u1,v0, u1,v1, u0,v1);
          colors.push(tr,tg,tb, tr,tg,tb, tr,tg,tb, tr,tg,tb);
        }
      }
    }

    if (positions.length === 0) return;
    const count = positions.length / 12;
    const idxArr = [];
    for (let i = 0; i < count; i++) {
      const v = i * 4;
      idxArr.push(v,v+1,v+2, v,v+2,v+3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(idxArr);
    const mat = this.textureLoader.getMaterial(true);
    mat.side = THREE.DoubleSide;
    mat.alphaTest = 0.5;
    mat.vertexColors = true;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    parent.add(mesh);
  }

  update(delta, playerPos) {
    this.time += delta;
    for (const shader of this.tMaterials) {
      shader.uniforms.time.value = this.time;
    }
    // Farming random tick (once per second)
    this._farmingTimer = (this._farmingTimer ?? 0) + delta;
    if (this._farmingTimer >= 1) { this._farmingTimer = 0; this._tickFarming(); }

    const cx = Math.floor(playerPos.x / CHUNK_SIZE);
    const cz = Math.floor(playerPos.z / CHUNK_SIZE);

    // 1. Process remesh queue (limit to 1 per frame and ONLY if we have frame budget)
    this._meshingThisFrame = false;
    if (this._pendingRemesh.size > 0) {
      const key = this._pendingRemesh.values().next().value;
      this._pendingRemesh.delete(key);
      const [rcx, rcz] = key.split(',').map(Number);
      
      const dx = rcx - cx, dz = rcz - cz;
      const distSq = dx*dx + dz*dz;
      
      // Only mesh if within render distance
      if (distSq <= (RENDER_DISTANCE + 1) ** 2) {
        const targetLod = distSq > 9 ? 1 : 0;
        this._buildChunkMesh(rcx, rcz, targetLod);
        this._meshingThisFrame = true;
      }
    }

    // 2. Incremental chunk scan (Check 25 chunks per frame instead of 400 every 10 frames)
    const scanSize = (RENDER_DISTANCE * 2 + 1);
    const totalChunks = scanSize * scanSize;
    const checksPerFrame = 25;

    for (let i = 0; i < checksPerFrame; i++) {
      this._scanIndex = (this._scanIndex + 1) % totalChunks;
      const sdx = (this._scanIndex % scanSize) - RENDER_DISTANCE;
      const sdz = Math.floor(this._scanIndex / scanSize) - RENDER_DISTANCE;
      
      const distSq = sdx*sdx + sdz*sdz;
      if (distSq > RENDER_DISTANCE*RENDER_DISTANCE) continue;
      
      const scx = cx + sdx;
      const scz = cz + sdz;
      const key = this.chunkKey(scx, scz);
      const targetLod = distSq > 9 ? 1 : 0;
      
      if (!this.chunks.has(key)) {
        this.requestChunk(scx, scz);
      } else if (!this.meshes.has(key)) {
        this._pendingRemesh.add(key);
      } else {
        const currentLod = this.meshes.get(key).lod;
        if (currentLod !== targetLod) {
           this._pendingRemesh.add(key);
        }
      }
    }

    // Remove distant chunks
    for (const [key, data] of this.meshes) {
      const [kcx, kcz] = key.split(',').map(Number);
      if (Math.abs(kcx-cx) > RENDER_DISTANCE+2 || Math.abs(kcz-cz) > RENDER_DISTANCE+2) {
        this.scene.remove(data.group);
        data.group.children?.forEach(c => c.geometry?.dispose());
        this.meshes.delete(key);
        
        // Remove lights that belong to this chunk
        for (const [lkey, lpos] of this.activeLights) {
           const lx = Math.floor(lpos.x / CHUNK_SIZE);
           const lz = Math.floor(lpos.z / CHUNK_SIZE);
           if (lx === kcx && lz === kcz) {
             this.activeLights.delete(lkey);
             this._lightsChanged = true;
           }
        }
      }
    }
    
    // Cleanup old tMaterials to avoid memory leaks
    this.tMaterials = this.tMaterials.filter(shader => shader.uniforms.time);

    // Provide closest lights to Renderer (Optimize: only sort if player moved significantly or lights changed)
    const moved = this.lastLightPos.distanceToSquared(playerPos) > 4; // 2 blocks
    if (window.renderer && window.renderer.updateDynamicLights && (moved || this._lightsChanged)) {
       this.lastLightPos.copy(playerPos);
       
       if (this._lightsChanged) {
         this.lightPool = Array.from(this.activeLights.values());
         this._lightsChanged = false;
       }
       
       if (this.lightPool.length > 0) {
         // Use a more efficient partial sort if possible, but for ~200 lights full sort is fine
         this.lightPool.sort((a,b) => {
            const da = (a.x-playerPos.x)**2 + (a.y-playerPos.y)**2 + (a.z-playerPos.z)**2;
            const db = (b.x-playerPos.x)**2 + (b.y-playerPos.y)**2 + (b.z-playerPos.z)**2;
            return da - db;
         });
         window.renderer.updateDynamicLights(this.lightPool.slice(0, 12));
       }
    }
  }
}
