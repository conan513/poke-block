// src/engine/Renderer.js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const GodRaysShader = {
  uniforms: {
    tDiffuse: { value: null },
    lightPosition: { value: new THREE.Vector2(0.5, 0.5) },
    exposure: { value: 0.5 },
    decay: { value: 0.88 },
    density: { value: 0.85 },
    weight: { value: 0.25 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform vec2 lightPosition;
    uniform float exposure;
    uniform float decay;
    uniform float density;
    uniform float weight;

    void main() {
      vec2 texCoord = vUv;
      vec2 deltaTextCoord = texCoord - lightPosition;
      deltaTextCoord *= 1.0 / 50.0 * density;
      vec4 color = texture2D(tDiffuse, texCoord);
      float illuminationDecay = 1.0;
      vec4 scatter = vec4(0.0);

      for(int i = 0; i < 50; i++) {
        texCoord -= deltaTextCoord;
        vec4 sampleColor = texture2D(tDiffuse, texCoord);
        
        // Thresholding for God Rays: only scatter very bright HDR pixels
        float luma = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
        sampleColor.rgb *= smoothstep(1.5, 2.0, luma); 

        sampleColor *= illuminationDecay * weight;
        scatter += sampleColor;
        illuminationDecay *= decay;
      }
      gl_FragColor = color + scatter * exposure;
    }
  `
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this._buildRenderer();
    this._buildCamera();
    this._buildLighting();
    this._buildSky();
    this._buildSkyBodies();
    this._buildClouds();
    this._buildFog();
    this._buildPostProcessing();
    this._dayTime = 0.82; // 0=noon, 0.5=midnight, 0.82=early morning
    this.isUnderwater = false;
    window.addEventListener('resize', () => this._onResize());
  }

  _buildRenderer() {
    this.gl = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.gl.setSize(window.innerWidth, window.innerHeight);
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    // Tone mapping handled by OutputPass when using composer
    // this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    // this.gl.outputColorSpace = THREE.SRGBColorSpace;
  }

  _buildCamera() {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
    this.camera.position.set(0, 80, 0);
  }

  _buildLighting() {
    // Ambient
    this.ambientLight = new THREE.AmbientLight(0x8899bb, 0.6);
    this.scene.add(this.ambientLight);

    // Sun
    this.sunLight = new THREE.DirectionalLight(0xfff5dd, 1.6);
    this.sunLight.position.set(100, 200, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.setScalar(2048);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -128;
    this.sunLight.shadow.camera.right = 128;
    this.sunLight.shadow.camera.top = 128;
    this.sunLight.shadow.camera.bottom = -128;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // Moon / fill
    this.moonLight = new THREE.DirectionalLight(0x3355aa, 0.0);
    this.moonLight.position.set(-100, 100, -50);
    this.scene.add(this.moonLight);

    // Dynamic Light Pool (for lanterns/glowstone)
    this.dynamicLights = [];
    for (let i = 0; i < 12; i++) {
      const light = new THREE.PointLight(0xffa555, 0.0, 18, 1.5);
      this.scene.add(light);
      this.dynamicLights.push(light);
    }
  }

  _buildSky() {
    // Procedural sky via large sphere with gradient shader
    const skyGeo = new THREE.SphereGeometry(900, 16, 8);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0066bb) },
        botColor: { value: new THREE.Color(0xaaddff) },
        offset: { value: 400 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor, botColor;
        uniform float offset, exponent;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos + vec3(0,offset,0)).y;
          gl_FragColor = vec4(mix(botColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.skyMat = skyMat;
    this.scene.add(this.sky);
  }

  _buildSkyBodies() {
    this.skyPivot = new THREE.Group();
    this.scene.add(this.skyPivot);

    // Sun
    const sunGeo = new THREE.PlaneGeometry(50, 50);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffee, transparent: true, fog: false });
    sunMat.color.multiplyScalar(10.0); // HDR for God Rays threshold
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.set(0, 800, 0);
    this.sunMesh.rotation.x = Math.PI / 2;
    this.skyPivot.add(this.sunMesh);

    // Moon
    const moonGeo = new THREE.PlaneGeometry(60, 60);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xddddff, transparent: true, fog: false });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonMesh.position.set(0, -800, 0);
    this.moonMesh.rotation.x = -Math.PI / 2;
    this.skyPivot.add(this.moonMesh);
  }

  _buildClouds() {
    this.cloudGroup = new THREE.Group();
    this.scene.add(this.cloudGroup);
    
    const cGeo = new THREE.BoxGeometry(20, 8, 20);
    const cMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    
    this.clouds = [];
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(cGeo, cMat);
      mesh.position.set((Math.random() - 0.5) * 800, 140 + Math.random() * 20, (Math.random() - 0.5) * 800);
      mesh.scale.set(1 + Math.random()*3, 1, 1 + Math.random()*3);
      this.cloudGroup.add(mesh);
      this.clouds.push(mesh);
    }
  }

  _buildFog() {
    this.scene.fog = new THREE.FogExp2(0xaaddff, 0.007);
  }

  _buildPostProcessing() {
    this.composer = new EffectComposer(this.gl);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8, // strength (enhanced for speculars)
      0.5, // radius
      0.9  // threshold (higher so only bright highlights bloom)
    );
    this.composer.addPass(this.bloomPass);

    this.godRaysPass = new ShaderPass(GodRaysShader);
    this.composer.addPass(this.godRaysPass);

    this.outputPass = new OutputPass(THREE.ACESFilmicToneMapping);
    this.outputPass.toneMappingExposure = 1.0;
    this.composer.addPass(this.outputPass);
  }

  setUnderwater(underwater) {
    this.isUnderwater = underwater;
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.gl.setSize(w, h);
    if (this.composer) this.composer.setSize(w, h);
  }

  _updateDayNight(delta) {
    this._dayTime = (this._dayTime + delta * 0.005) % 1; // full cycle ~200s
    const t = this._dayTime;

    // Sun arc
    const angle = t * Math.PI * 2;
    this.sunLight.position.set(Math.sin(angle) * 200, Math.cos(angle) * 200, 50);

    // Light intensities
    const sunFactor = Math.max(0, Math.cos(angle)); // 1 at noon, 0 at midnight
    this.sunLight.intensity = sunFactor * 1.8;
    this.moonLight.intensity = (1 - sunFactor) * 0.4;
    this.ambientLight.intensity = 0.15 + sunFactor * 0.6;

    // Sky colors
    const dayTop = new THREE.Color(0x0066cc);
    const nightTop = new THREE.Color(0x020514);
    const dayBot = new THREE.Color(0xaaddff);
    const nightBot = new THREE.Color(0x0a1020);
    this.skyMat.uniforms.topColor.value.lerpColors(nightTop, dayTop, sunFactor);
    this.skyMat.uniforms.botColor.value.lerpColors(nightBot, dayBot, sunFactor);

    // Fog color and density
    const fogDay = new THREE.Color(0xaaddff);
    const fogNight = new THREE.Color(0x020514);
    const fogMorning = new THREE.Color(0xffdcb3); // warm morning mist
    
    let targetFogColor;
    let targetFogDensity = 0.007;

    // Morning is around t = 0.75 to 0.9
    if (t > 0.75 && t < 0.95) {
      const morningFactor = Math.sin((t - 0.75) / 0.2 * Math.PI); // 0 to 1 back to 0
      targetFogColor = fogNight.clone().lerp(fogDay, sunFactor).lerp(fogMorning, morningFactor * 0.6);
      targetFogDensity = 0.007 + (morningFactor * 0.015); // thicker fog in morning
    } else {
      targetFogColor = fogDay.clone().lerp(fogNight, 1 - sunFactor);
    }

    if (this.isUnderwater) {
      targetFogColor = new THREE.Color(0x0033aa);
      targetFogDensity = 0.05; // Dense underwater fog
      this.bloomPass.strength = 1.2;
    } else {
      this.bloomPass.strength = 0.6;
    }

    // Eye Adaptation (Auto Exposure)
    const targetExposure = 0.7 + (1 - sunFactor) * 0.6; // Day: 0.7, Night: 1.3
    this.outputPass.toneMappingExposure += (targetExposure - this.outputPass.toneMappingExposure) * 0.05;

    this.scene.fog.color.lerp(targetFogColor, 0.1);
    this.scene.fog.density += (targetFogDensity - this.scene.fog.density) * 0.1;

    // Move sky and pivot with camera
    if (this.camera) {
      this.sky.position.copy(this.camera.position);
      this.skyPivot.position.copy(this.camera.position);
      this.cloudGroup.position.x = this.camera.position.x;
      this.cloudGroup.position.z = this.camera.position.z;
    }

    // Rotate celestial bodies
    this.skyPivot.rotation.z = -angle;
    this.skyPivot.updateMatrixWorld(true);

    // Update God Rays
    const sunScreenPos = new THREE.Vector3(0, 800, 0); // Sun's local pos in pivot
    sunScreenPos.applyMatrix4(this.skyPivot.matrixWorld);
    sunScreenPos.project(this.camera);

    this.godRaysPass.uniforms.lightPosition.value.set(
      (sunScreenPos.x + 1) / 2,
      (sunScreenPos.y + 1) / 2
    );

    if (sunScreenPos.z > 1.0 || sunFactor <= 0.05 || this.isUnderwater) {
      this.godRaysPass.uniforms.weight.value = 0.0;
    } else {
      this.godRaysPass.uniforms.weight.value = 0.25 * sunFactor;
    }

    // Move clouds
    for (const cloud of this.clouds) {
      cloud.position.x -= delta * 2;
      if (cloud.position.x < -400) {
        cloud.position.x = 400;
        cloud.position.z = (Math.random() - 0.5) * 800;
      }
    }
  }

  render(delta) {
    this._updateDayNight(delta);
    if (this.composer) {
      this.composer.render();
    } else {
      this.gl.render(this.scene, this.camera);
    }
  }

  updateDynamicLights(lightPositions) {
    for (let i = 0; i < this.dynamicLights.length; i++) {
      if (i < lightPositions.length) {
        const p = lightPositions[i];
        this.dynamicLights[i].position.set(p.x + 0.5, p.y + 0.5, p.z + 0.5);
        this.dynamicLights[i].intensity = 1.5;
      } else {
        this.dynamicLights[i].intensity = 0;
      }
    }
  }
}
