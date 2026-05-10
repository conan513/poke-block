// src/engine/WeatherSystem.js – Rain, snow, thunder
import * as THREE from 'three';

const RAIN_COUNT  = 8000;
const SNOW_COUNT  = 4000;
const AREA        = 32;  // radius around player
const RAIN_HEIGHT = 30;

export class WeatherSystem {
  constructor(scene, dayNight) {
    this.scene    = scene;
    this.dayNight = dayNight;

    // States: 'clear', 'rain', 'snow', 'thunder'
    this.state       = 'clear';
    this.nextChange  = 120 + Math.random() * 480; // seconds until weather change
    this.elapsed     = 0;
    this.intensity   = 0; // 0-1 fade in/out

    this._rain  = this._buildRain();
    this._snow  = this._buildSnow();
    this._flash = this._buildFlash();

    this._rain.visible = false;
    this._snow.visible = false;
    scene.add(this._rain);
    scene.add(this._snow);
    document.body.appendChild(this._flash);

    this._thunderTimer = 0;
  }

  _buildRain() {
    const pos = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      pos[i*3]   = (Math.random() - 0.5) * AREA * 2;
      pos[i*3+1] = Math.random() * RAIN_HEIGHT;
      pos[i*3+2] = (Math.random() - 0.5) * AREA * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x8ab8dd, size: 0.05, transparent: true, opacity: 0.6,
      sizeAttenuation: true,
    });
    return new THREE.Points(geo, mat);
  }

  _buildSnow() {
    const pos = new Float32Array(SNOW_COUNT * 3);
    for (let i = 0; i < SNOW_COUNT; i++) {
      pos[i*3]   = (Math.random() - 0.5) * AREA * 2;
      pos[i*3+1] = Math.random() * RAIN_HEIGHT;
      pos[i*3+2] = (Math.random() - 0.5) * AREA * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.12, transparent: true, opacity: 0.8,
      sizeAttenuation: true,
    });
    return new THREE.Points(geo, mat);
  }

  _buildFlash() {
    const div = document.createElement('div');
    div.id = 'thunder-flash';
    Object.assign(div.style, {
      position: 'fixed', inset: '0', background: 'white',
      opacity: '0', pointerEvents: 'none', zIndex: '5',
      transition: 'opacity 0.05s',
    });
    return div;
  }

  _changeWeather() {
    const roll = Math.random();
    if (roll < 0.55)      this.state = 'clear';
    else if (roll < 0.80) this.state = 'rain';
    else if (roll < 0.92) this.state = 'snow';
    else                  this.state = 'thunder';
    this.nextChange = 60 + Math.random() * 300;
    this.elapsed    = 0;
  }

  _moveParticles(points, playerPos, delta, speedY, drift = 0) {
    const arr = points.geometry.attributes.position.array;
    const px = playerPos.x, pz = playerPos.z;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i+1] -= speedY * delta;
      arr[i]   += drift * delta;
      if (arr[i+1] < playerPos.y - 2) {
        arr[i]   = px + (Math.random() - 0.5) * AREA * 2;
        arr[i+1] = playerPos.y + RAIN_HEIGHT;
        arr[i+2] = pz + (Math.random() - 0.5) * AREA * 2;
      }
      // Keep centered on player
      arr[i]   = px + ((arr[i] - px + AREA) % (AREA*2) + (AREA*2)) % (AREA*2) - AREA;
      arr[i+2] = pz + ((arr[i+2] - pz + AREA) % (AREA*2) + (AREA*2)) % (AREA*2) - AREA;
    }
    points.geometry.attributes.position.needsUpdate = true;
  }

  update(delta, playerPos) {
    this.elapsed += delta;
    if (this.elapsed >= this.nextChange) this._changeWeather();

    // Fade intensity
    const target = this.state === 'clear' ? 0 : 1;
    this.intensity += (target - this.intensity) * Math.min(1, delta * 0.5);

    const raining  = this.state === 'rain'    || this.state === 'thunder';
    const snowing  = this.state === 'snow';

    this._rain.visible = raining  && this.intensity > 0.01;
    this._snow.visible = snowing  && this.intensity > 0.01;

    if (raining) {
      this._rain.material.opacity = 0.4 * this.intensity;
      this._moveParticles(this._rain, playerPos, delta, 18, -1.5);
    }
    if (snowing) {
      this._snow.material.opacity = 0.7 * this.intensity;
      this._moveParticles(this._snow, playerPos, delta, 3, 0.4);
    }

    // Thunder
    if (this.state === 'thunder') {
      this._thunderTimer -= delta;
      if (this._thunderTimer <= 0) {
        this._thunderTimer = 8 + Math.random() * 20;
        this._doFlash();
      }
    }

    // Darken ambient during rain
    if (this.dayNight && raining) {
      this.dayNight.ambientLight.intensity *= (1 - 0.35 * this.intensity);
    }
  }

  _doFlash() {
    this._flash.style.opacity = '0.9';
    setTimeout(() => { this._flash.style.opacity = '0'; }, 80);
  }

  /** Expose state for HUD */
  get icon() {
    return { clear: '[Clear]', rain: '[Rain]', snow: '[Snow]', thunder: '[Storm]' }[this.state] ?? '';
  }
}
