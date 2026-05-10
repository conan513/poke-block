// src/pokemon/BedrockModelParser.js
// Parses Cobblemon .geo.json (Minecraft Bedrock Entity Geometry) into Three.js objects
import * as THREE from 'three';

const MC_SCALE = 1/16; // 1 minecraft unit → world units

export class BedrockModelParser {
  /**
   * @param {object} geoJson  – parsed .geo.json content
   * @param {THREE.Texture} texture
   * @returns {THREE.Group}
   */
  static parse(geoJson, texture) {
    const geoDef = geoJson['minecraft:geometry']?.[0];
    if (!geoDef) return new THREE.Group();

    const desc = geoDef.description || {};
    const texW = desc.texture_width || 64;
    const texH = desc.texture_height || 64;
    const bones = geoDef.bones || [];

    const mat = new THREE.MeshLambertMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.FrontSide,
    });
    if (texture) {
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
    }

    // Build bone map: name -> THREE.Group (pivot node)
    const boneMap = {};
    const rootGroup = new THREE.Group();

    // First pass: create all bones
    for (const bone of bones) {
      const group = new THREE.Group();
      group.name = bone.name;

      const pivot = bone.pivot || [0,0,0];
      // Bedrock pivot: pivot is the point of rotation, in MC units
      // We position the group at pivot, then offset children back
      group.position.set(pivot[0] * MC_SCALE, pivot[1] * MC_SCALE, pivot[2] * MC_SCALE);

      if (bone.rotation) {
        group.rotation.set(
          THREE.MathUtils.degToRad(-bone.rotation[0]),
          THREE.MathUtils.degToRad(-bone.rotation[1]),
          THREE.MathUtils.degToRad(bone.rotation[2]),
          'ZYX'
        );
      }

      boneMap[bone.name] = { group, bone };
    }

    // Second pass: build hierarchy & add cubes
    for (const bone of bones) {
      const { group } = boneMap[bone.name];
      const pivot = bone.pivot || [0,0,0];

      // Cubes
      if (bone.cubes) {
        for (const cube of bone.cubes) {
          const mesh = BedrockModelParser._buildCube(cube, pivot, texW, texH, mat);
          if (mesh) group.add(mesh);
        }
      }

      // Attach to parent or root
      if (bone.parent && boneMap[bone.parent]) {
        const parentPivot = boneMap[bone.parent].bone.pivot || [0,0,0];
        // Relative position: pivot - parentPivot
        group.position.set(
          (pivot[0] - parentPivot[0]) * MC_SCALE,
          (pivot[1] - parentPivot[1]) * MC_SCALE,
          (pivot[2] - parentPivot[2]) * MC_SCALE
        );
        boneMap[bone.parent].group.add(group);
      } else {
        rootGroup.add(group);
      }
    }

    // Scale to reasonable game size (~1 block = 1.0 unit)
    rootGroup.scale.setScalar(MC_SCALE * 2);
    // Flip Z for Bedrock→Three.js coordinate convention
    rootGroup.rotation.y = Math.PI;

    return rootGroup;
  }

  static _buildCube(cube, bonePivot, texW, texH, mat) {
    const origin = cube.origin || [0,0,0];
    const size = cube.size || [1,1,1];
    const uv = cube.uv;
    const pivot = cube.pivot || bonePivot;
    const rotation = cube.rotation;
    const inflate = cube.inflate || 0;

    const w = size[0] + inflate*2;
    const h = size[1] + inflate*2;
    const d = size[2] + inflate*2;

    const geo = new THREE.BoxGeometry(w, h, d);

    // UV mapping – Bedrock uses "box UV" [u, v] meaning a cross-unfolded layout
    if (Array.isArray(uv) && uv.length === 2) {
      BedrockModelParser._applyBoxUV(geo, uv[0], uv[1], size[0], size[1], size[2], texW, texH);
    } else if (uv && typeof uv === 'object') {
      // Per-face UV
      BedrockModelParser._applyPerFaceUV(geo, uv, texW, texH);
    }

    const mesh = new THREE.Mesh(geo, mat);

    // Position: origin is the min corner, convert to center
    const cx = origin[0] + size[0]/2 - bonePivot[0];
    const cy = origin[1] + size[1]/2 - bonePivot[1];
    const cz = origin[2] + size[2]/2 - bonePivot[2];
    mesh.position.set(cx, cy, cz);

    // Bedrock → Three.js: flip Z
    mesh.position.z = -mesh.position.z;

    if (rotation) {
      const rPivot = (cube.pivot || bonePivot);
      mesh.rotation.set(
        THREE.MathUtils.degToRad(-rotation[0]),
        THREE.MathUtils.degToRad(-rotation[1]),
        THREE.MathUtils.degToRad(rotation[2]),
        'ZYX'
      );
    }

    return mesh;
  }

  // Bedrock "box UV" mapping:
  //   top face: (u+d, v) size (w, d)
  //   bottom: (u+d+w, v) size (w, d)
  //   right: (u, v+d) size (d, h)
  //   front: (u+d, v+d) size (w, h)
  //   left: (u+d+w, v+d) size (d, h)
  //   back: (u+d+w+d, v+d) size (w, h)
  static _applyBoxUV(geo, startU, startV, bw, bh, bd, texW, texH) {
    const uvAttr = geo.attributes.uv;
    // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
    // Bedrock layout remap:
    // THREE +X (right) = Bedrock right
    // THREE -X (left)  = Bedrock left
    // THREE +Y (top)   = Bedrock top
    // THREE -Y (bottom)= Bedrock bottom
    // THREE +Z (front) = Bedrock front
    // THREE -Z (back)  = Bedrock back

    const toUV = (pu, pv, pw, ph) => {
      return [pu/texW, 1-(pv+ph)/texH, (pu+pw)/texW, 1-pv/texH];
    };

    const faceUVs = [
      toUV(startU+bd+bw, startV+bd, bd, bh),          // +X right → Bedrock left
      toUV(startU,       startV+bd, bd, bh),          // -X left  → Bedrock right
      toUV(startU+bd,    startV,    bw, bd),           // +Y top
      toUV(startU+bd+bw, startV,    bw, bd),           // -Y bottom
      toUV(startU+bd,    startV+bd, bw, bh),           // +Z front
      toUV(startU+bd+bw+bd, startV+bd, bw, bh),       // -Z back
    ];

    for (let face = 0; face < 6; face++) {
      const [u0,v0,u1,v1] = faceUVs[face];
      const base = face * 4;
      uvAttr.setXY(base+0, u0, v1);
      uvAttr.setXY(base+1, u1, v1);
      uvAttr.setXY(base+2, u0, v0);
      uvAttr.setXY(base+3, u1, v0);
    }
    uvAttr.needsUpdate = true;
  }

  static _applyPerFaceUV(geo, uvMap, texW, texH) {
    // Per-face UV: each face has {uv:[u,v], uv_size:[w,h]}
    const uvAttr = geo.attributes.uv;
    const faceNames = ['east','west','up','down','south','north'];
    for (let i = 0; i < 6; i++) {
      const faceData = uvMap[faceNames[i]];
      if (!faceData) continue;
      const [pu,pv] = faceData.uv || [0,0];
      const [pw,ph] = faceData.uv_size || [16,16];
      const u0=pu/texW, v0=1-(pv+ph)/texH, u1=(pu+pw)/texW, v1=1-pv/texH;
      const base = i*4;
      uvAttr.setXY(base+0, u0, v1);
      uvAttr.setXY(base+1, u1, v1);
      uvAttr.setXY(base+2, u0, v0);
      uvAttr.setXY(base+3, u1, v0);
    }
    uvAttr.needsUpdate = true;
  }
}
