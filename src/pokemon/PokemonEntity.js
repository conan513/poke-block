// src/pokemon/PokemonEntity.js – 3D Pokémon in the world with idle/walk animation
import * as THREE from 'three';
import { BedrockModelParser } from './BedrockModelParser.js';

const MODEL_BASE = '/cobblemon-assets/blockbench/pokemon/gen1/';

const POKEMON_FILES = {
  bulbasaur:  { dir: '0001_bulbasaur',  geo: 'bulbasaur_male.geo.json',  tex: 'bulbasaur.png',   anim: 'bulbasaur.animation.json' },
  charmander: { dir: '0004_charmander', geo: 'charmander_male.geo.json', tex: 'charmander.png',  anim: 'charmander.animation.json' },
  squirtle:   { dir: '0007_squirtle',   geo: 'squirtle_male.geo.json',   tex: 'squirtle.png',    anim: 'squirtle.animation.json' },
  caterpie:   { dir: '0010_caterpie',   geo: 'caterpie.geo.json',        tex: 'caterpie.png',    anim: 'caterpie.animation.json' },
  pidgey:     { dir: '0016_pidgey',     geo: 'pidgey.geo.json',          tex: 'pidgey.png',      anim: 'pidgey.animation.json' },
  rattata:    { dir: '0019_rattata',    geo: 'rattata_male.geo.json',    tex: 'rattata.png',     anim: 'rattata.animation.json' },
  pikachu:    { dir: '0025_pikachu',    geo: 'pikachu_male.geo.json',    tex: 'pikachu.png',     anim: 'pikachu.animation.json' },
  meowth:     { dir: '0052_meowth',     geo: 'meowth.geo.json',          tex: 'meowth.png',      anim: 'meowth.animation.json' },
};

const geoCache = {};
const texCache = {};

async function loadGeo(name) {
  if (geoCache[name]) return geoCache[name];
  const f = POKEMON_FILES[name];
  if (!f) return null;
  try {
    const res = await fetch(`${MODEL_BASE}${f.dir}/${f.geo}`);
    const json = await res.json();
    geoCache[name] = json;
    return json;
  } catch { return null; }
}

async function loadTex(name) {
  if (texCache[name]) return texCache[name];
  const f = POKEMON_FILES[name];
  if (!f) return null;
  return new Promise(resolve => {
    const loader = new THREE.TextureLoader();
    loader.load(`${MODEL_BASE}${f.dir}/${f.tex}`, tex => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      texCache[name] = tex;
      resolve(tex);
    }, undefined, () => resolve(null));
  });
}

export class PokemonEntity {
  constructor(scene, pokemonName, data) {
    this.scene = scene;
    this.name = pokemonName;
    this.data = data; // from POKEDEX
    this.hp = data.baseHp;
    this.maxHp = data.baseHp;
    this.level = Math.floor(Math.random() * 5) + 2;

    this.group = new THREE.Group();
    this.group.position.set(data.spawnX || 0, data.spawnY || 0, data.spawnZ || 0);
    scene.add(this.group);

    this._loaded = false;
    this._animTime = Math.random() * 10;
    this._moveTimer = 2 + Math.random() * 3;
    this._moveDir = new THREE.Vector3();
    this._moving = false;
    this._nameplate = null;

    // Fallback while model loads
    this._buildFallback();
    this._load();
  }

  _buildFallback() {
    // Simple colored sphere as placeholder
    const color = { bulbasaur:0x44bb44, charmander:0xff6622, squirtle:0x4499ff,
                    pikachu:0xffee00, pidgey:0xbb9966, rattata:0x9966bb,
                    caterpie:0x44cc44, meowth:0xddcc88 }[this.name] || 0xffffff;
    const geo = new THREE.SphereGeometry(0.3, 8, 6);
    const mat = new THREE.MeshLambertMaterial({ color });
    this.fallback = new THREE.Mesh(geo, mat);
    this.fallback.position.y = 0.3;
    this.fallback.castShadow = true;
    this.group.add(this.fallback);

    // Name label (HTML would be better but this is simple)
    this._buildNameplate();
  }

  _buildNameplate() {
    // Billboard sprite with canvas text
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.roundRect(0,0,128,32,8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.name.charAt(0).toUpperCase()+this.name.slice(1), 64, 22);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.2, 0.3, 1);
    sprite.position.y = 1.0;
    this.group.add(sprite);
    this._nameplate = sprite;
  }

  async _load() {
    const [geo, tex] = await Promise.all([loadGeo(this.name), loadTex(this.name)]);
    if (!geo) return;

    const model = BedrockModelParser.parse(geo, tex);
    model.position.y = 0.1;
    model.traverse(c => { if (c.isMesh) c.castShadow = true; });

    // Remove fallback
    this.group.remove(this.fallback);
    this.group.add(model);
    this._model = model;
    this._loaded = true;
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  update(delta, world) {
    this._animTime += delta;

    // Idle bob
    if (this._model) {
      this._model.position.y = 0.1 + Math.sin(this._animTime * 2) * 0.04;
      this._model.rotation.y += delta * 0.3;
    } else if (this.fallback) {
      this.fallback.position.y = 0.3 + Math.sin(this._animTime * 2) * 0.06;
    }

    // Simple wander AI
    this._moveTimer -= delta;
    if (this._moveTimer <= 0) {
      this._moveTimer = 2 + Math.random() * 4;
      this._moving = Math.random() > 0.4;
      if (this._moving) {
        const angle = Math.random() * Math.PI * 2;
        this._moveDir.set(Math.cos(angle), 0, Math.sin(angle));
        this.group.rotation.y = angle;
      }
    }

    if (this._moving) {
      const speed = 1.2;
      const nx = this.group.position.x + this._moveDir.x * speed * delta;
      const nz = this.group.position.z + this._moveDir.z * speed * delta;
      // Simple ground check
      const sy = world.getSurfaceY(Math.floor(nx), Math.floor(nz));
      if (!isNaN(sy) && Math.abs(sy - this.group.position.y) < 2) {
        this.group.position.x = nx;
        this.group.position.z = nz;
        this.group.position.y = sy;
      } else {
        this._moving = false;
      }
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }
}
