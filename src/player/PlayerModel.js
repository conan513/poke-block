// src/player/PlayerModel.js – Minecraft Steve model with skin UV support
import * as THREE from 'three';

const MC = 1/16; // One Minecraft unit in world scale

// Steve layout in skin UV (64x64 texture)
// Each entry: [u, v, w, h] in pixels out of 64
const SKIN_PARTS = {
  head_front:  [8,8,8,8],  head_back:   [24,8,8,8],
  head_top:    [8,0,8,8],  head_bottom: [16,0,8,8],
  head_right:  [0,8,8,8],  head_left:   [16,8,8,8],

  body_front:  [20,20,8,12], body_back:  [32,20,8,12],
  body_top:    [20,16,8,4],  body_bottom:[28,16,8,4],
  body_right:  [16,20,4,12], body_left:  [28,20,4,12],

  arm_r_front:  [44,20,4,12], arm_r_back:  [52,20,4,12],
  arm_r_top:    [44,16,4,4],  arm_r_bottom:[48,16,4,4],
  arm_r_right:  [40,20,4,12], arm_r_left:  [48,20,4,12],

  arm_l_front:  [44,20,4,12], arm_l_back:  [52,20,4,12],
  arm_l_top:    [44,16,4,4],  arm_l_bottom:[48,16,4,4],
  arm_l_right:  [40,20,4,12], arm_l_left:  [48,20,4,12],

  leg_r_front:  [4,20,4,12], leg_r_back:  [12,20,4,12],
  leg_r_top:    [4,16,4,4],  leg_r_bottom:[8,16,4,4],
  leg_r_right:  [0,20,4,12], leg_r_left:  [8,20,4,12],

  leg_l_front:  [4,20,4,12], leg_l_back:  [12,20,4,12],
  leg_l_top:    [4,16,4,4],  leg_l_bottom:[8,16,4,4],
  leg_l_right:  [0,20,4,12], leg_l_left:  [8,20,4,12],
};

function pixelUV(px, py, pw, ph, texW, texH) {
  return {
    u0: px/texW, v0: 1-py/texH-ph/texH,
    u1: px/texW+pw/texW, v1: 1-py/texH,
  };
}

function buildPartUVs(partName, texW, texH) {
  const keys = ['right','left','top','bottom','front','back'];
  return keys.map(face => {
    const k = `${partName}_${face}`;
    const px = SKIN_PARTS[k];
    if (!px) return [0,0,1/8,1/8];
    const u = pixelUV(px[0],px[1],px[2],px[3],texW,texH);
    return [u.u0,u.v0,u.u1,u.v1];
  });
}

function buildBox(w, h, d, partName, skinTex) {
  const geo = new THREE.BoxGeometry(w,h,d);
  const uvAttr = geo.attributes.uv;
  const TEX_W = 64, TEX_H = 64;

  const uvFaces = buildPartUVs(partName, TEX_W, TEX_H);
  // BoxGeometry face order: right(+x), left(-x), top(+y), bottom(-y), front(+z), back(-z)
  for (let face = 0; face < 6; face++) {
    const [u0,v0,u1,v1] = uvFaces[face];
    const base = face * 4;
    uvAttr.setXY(base+0, u1, v0);
    uvAttr.setXY(base+1, u0, v0);
    uvAttr.setXY(base+2, u1, v1);
    uvAttr.setXY(base+3, u0, v1);
  }
  uvAttr.needsUpdate = true;

  const mat = new THREE.MeshLambertMaterial({
    map: skinTex || null,
    transparent: false,
  });
  return new THREE.Mesh(geo, mat);
}

const SCALE = 0.0625; // 1 unit = 1 minecraft pixel

export class PlayerModel {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.scale.setScalar(SCALE * 16); // ~1 block height
    scene.add(this.root);

    this.skinTex = null;
    this._buildSkeleton();
    this._walkPhase = 0;
    this.visible = true;
  }

  _buildSkeleton() {
    const mat = new THREE.MeshLambertMaterial({ color: 0x888888 });

    // Head
    this.head = new THREE.Group();
    this.headMesh = this._box(8,8,8,'head');
    this.headMesh.position.set(0,4,0);
    this.head.add(this.headMesh);
    this.head.position.set(0,12,0);
    this.root.add(this.head);

    // Body
    this.body = this._box(8,12,4,'body');
    this.body.position.set(0,6,0);
    this.root.add(this.body);

    // Arms
    this.armR = new THREE.Group();
    this.armRMesh = this._box(4,12,4,'arm_r');
    this.armRMesh.position.set(0,-6,0);
    this.armR.add(this.armRMesh);
    this.armR.position.set(-6,12,0);
    this.root.add(this.armR);

    this.armL = new THREE.Group();
    this.armLMesh = this._box(4,12,4,'arm_l');
    this.armLMesh.position.set(0,-6,0);
    this.armL.add(this.armLMesh);
    this.armL.position.set(6,12,0);
    this.root.add(this.armL);

    // Legs
    this.legR = new THREE.Group();
    this.legRMesh = this._box(4,12,4,'leg_r');
    this.legRMesh.position.set(0,-6,0);
    this.legR.add(this.legRMesh);
    this.legR.position.set(-2,0,0);
    this.root.add(this.legR);

    this.legL = new THREE.Group();
    this.legLMesh = this._box(4,12,4,'leg_l');
    this.legLMesh.position.set(0,-6,0);
    this.legL.add(this.legLMesh);
    this.legL.position.set(2,0,0);
    this.root.add(this.legL);
  }

  _box(w, h, d, part) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa, transparent: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh._skinPart = part;
    return mesh;
  }

  applySkin(texture) {
    this.skinTex = texture;
    const allMeshes = [
      this.headMesh, this.body, this.armRMesh, this.armLMesh,
      this.legRMesh, this.legLMesh,
    ];
    const TEX_W = 64, TEX_H = 64;

    for (const mesh of allMeshes) {
      const part = mesh._skinPart;
      if (!part) continue;
      const mat = new THREE.MeshLambertMaterial({ map: texture, transparent: false });
      mesh.material = mat;

      const uvAttr = mesh.geometry.attributes.uv;
      const uvFaces = buildPartUVs(part, TEX_W, TEX_H);
      for (let face = 0; face < 6; face++) {
        const [u0,v0,u1,v1] = uvFaces[face];
        const base = face * 4;
        uvAttr.setXY(base+0, u1, v0);
        uvAttr.setXY(base+1, u0, v0);
        uvAttr.setXY(base+2, u1, v1);
        uvAttr.setXY(base+3, u0, v1);
      }
      uvAttr.needsUpdate = true;
    }
  }

  setPosition(x, y, z) {
    this.root.position.set(x, y, z);
  }

  setRotationY(angle) {
    this.root.rotation.y = angle;
  }

  setVisible(v) {
    this.root.visible = v;
  }

  update(delta, velocity) {
    const speed = Math.sqrt(velocity.x*velocity.x + velocity.z*velocity.z);
    const moving = speed > 0.5;

    if (moving) {
      this._walkPhase += delta * speed * 5;
      const swing = Math.sin(this._walkPhase) * 0.5;
      this.armR.rotation.x = -swing;
      this.armL.rotation.x = swing;
      this.legR.rotation.x = swing * 0.8;
      this.legL.rotation.x = -swing * 0.8;
    } else {
      // Idle: subtle arm sway
      const t = Date.now() * 0.001;
      const idle = Math.sin(t * 1.5) * 0.04;
      this.armR.rotation.x = -idle;
      this.armL.rotation.x = idle;
      this.legR.rotation.x = 0;
      this.legL.rotation.x = 0;
    }
  }
}
