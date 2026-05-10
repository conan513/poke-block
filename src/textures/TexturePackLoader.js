// src/textures/TexturePackLoader.js
import * as THREE from 'three';
import { BLOCK } from '../engine/Constants.js';

const ATLAS_SIZE = 2048;
const TILE_SIZE = 64;
const TILES_PER_ROW = Math.floor(ATLAS_SIZE / TILE_SIZE);

export class TexturePackLoader {
  constructor() {
    this.atlas = null;
    this.uvMap = {};   // blockId -> {top,side,bot} each [u0,v0,u1,v1]
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = ATLAS_SIZE;
    this.ctx = this.canvas.getContext('2d');
    this.tileCount = 0;
    this.mat = null;
    this.tMat = null;
  }

  async init(blockNames) {
    this._blockNames = blockNames;
  }

  async loadPack(basePath) {
    const tiles = {};

    // Build list of unique texture names needed
    const needed = new Set();
    for (const [bid, name] of Object.entries(this._blockNames)) {
      needed.add(name);
      // Special face variants
      needed.add(name + '_top');
      needed.add(name + '_side');
      needed.add(name + '_bottom');
      needed.add(name + '_front');
    }

    // Extra specific overrides
    const EXTRA = [
      'grass_block_top','grass_block_side','grass_block_side_overlay',
      'dirt','dirt_path_top','dirt_path_side',
      'short_grass','dandelion','poppy',
      'water_still','lava_still',
    ];
    EXTRA.forEach(e => needed.add(e));

    // Load each texture
    for (const name of needed) {
      const img = await this._tryLoad(`${basePath}${name}.png`);
      if (img) tiles[name] = img;
    }

    this._tiles = tiles;

    // Assign tiles to atlas slots
    this._tileIndex = {};
    const allUsed = new Set(Object.keys(tiles));
    let slot = 0;
    for (const name of allUsed) {
      const col = slot % TILES_PER_ROW;
      const row = Math.floor(slot / TILES_PER_ROW);
      this.ctx.drawImage(tiles[name], col*TILE_SIZE, row*TILE_SIZE, TILE_SIZE, TILE_SIZE);
      this._tileIndex[name] = slot;
      slot++;
    }

    this.tileCount = slot;

    // Build THREE texture from canvas
    const tex = new THREE.CanvasTexture(this.canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.atlas = tex;

    this.mat = new THREE.MeshPhongMaterial({ 
      map: tex, 
      side: THREE.FrontSide,
      shininess: 15,
      specular: new THREE.Color(0x111111) 
    });
    this.tMat = new THREE.MeshPhongMaterial({ 
      map: tex, 
      transparent: true, 
      opacity: 0.75,
      side: THREE.DoubleSide, 
      depthWrite: false,
      shininess: 90,
      specular: new THREE.Color(0x555555)
    });
  }

  _tryLoad(url) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  _getSlotUV(slot) {
    if (slot === undefined || slot < 0) return [0,0,1/TILES_PER_ROW,1/TILES_PER_ROW];
    const col = slot % TILES_PER_ROW;
    const row = Math.floor(slot / TILES_PER_ROW);
    const ts = TILE_SIZE / ATLAS_SIZE;
    return [col*ts, 1-(row+1)*ts, (col+1)*ts, 1-row*ts];
  }

  _nameUV(name) {
    const idx = this._tileIndex?.[name];
    if (idx !== undefined) return this._getSlotUV(idx);
    return this._getSlotUV(0);
  }

  getUV(blockId, dir) {
    const name = this._getBlockFaceName(blockId, dir);
    return this._nameUV(name);
  }

  _getBlockFaceName(blockId, dir) {
    const base = this._blockNames?.[blockId] || 'stone';
    const [dx,dy,dz] = dir;

    // Special top/side/bottom mappings
    const FACE_MAP = {
      'grass_block': { top:'grass_block_top', side:'grass_block_side', bot:'dirt' },
      'oak_log':     { top:'oak_log_top',     side:'oak_log',          bot:'oak_log_top' },
      'birch_log':   { top:'birch_log_top',   side:'birch_log',        bot:'birch_log_top' },
      'spruce_log':  { top:'spruce_log_top',  side:'spruce_log',       bot:'spruce_log_top' },
      'jungle_log':  { top:'jungle_log_top',  side:'jungle_log',       bot:'jungle_log_top' },
      'podzol_side': { top:'podzol_top',      side:'podzol_side',      bot:'dirt' },
    };

    const map = FACE_MAP[base];
    if (map) {
      if (dy === 1) return map.top;
      if (dy === -1) return map.bot;
      return map.side;
    }

    // Tall grass / flowers
    if (blockId === BLOCK.WATER) { 
      return 'water_still';
    }
    // short grass overlay
    if (base === 'grass_block' || base === 'short_grass') return 'short_grass';

    // Flowers
    if (base === 'flower') return Math.random()<0.5?'dandelion':'poppy';

    return base;
  }

  getMaterial(transparent) {
    if (transparent) return this.tMat ? this.tMat.clone() : new THREE.MeshPhongMaterial({ transparent:true, opacity:0.75, side:THREE.DoubleSide, depthWrite:false, shininess:90 });
    return this.mat ? this.mat.clone() : new THREE.MeshPhongMaterial({ shininess:15, specular: new THREE.Color(0x111111) });
  }
}
