// src/engine/DayNightCycle.js – Wraps Renderer day/night, exposes state for HUD/weather
export class DayNightCycle {
  constructor(scene, threeRenderer) {
    // scene/renderer refs kept for WeatherSystem compatibility
    this.scene    = scene;
    this.renderer = threeRenderer; // THREE.WebGLRenderer instance
    this.time     = 0.30; // 0-1, morning start
  }

  get isNight() {
    // Renderer stores _dayTime: 0=noon, 0.5=midnight
    const t = this.renderer._dayTime ?? 0;
    return t > 0.38 || t < 0.12; // roughly 19:00 – 05:00
  }

  /** 0-24000 ticks like Minecraft, for display */
  get tickTime() {
    return Math.floor((this.renderer._dayTime ?? 0) * 24000);
  }

  // Called from main loop – Renderer._updateDayNight already runs inside render()
  // We only update ambientLight reference for WeatherSystem (which reads .ambientLight)
  update(delta) {
    // Sync our .ambientLight reference so WeatherSystem can dim it
    this.ambientLight = this.renderer.ambientLight;
  }
}
