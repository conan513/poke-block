// src/engine/ChunkWorker.js
import { ChunkGenerator } from './ChunkGenerator.js';
import { BLOCK } from './Constants.js';

const generator = new ChunkGenerator();

self.onmessage = function(e) {
  const { cx, cz, SIZE, HEIGHT } = e.data;
  const data = generator.generateChunk(cx, cz, SIZE, HEIGHT);

  const lights = [];
  const originX = cx * SIZE;
  const originZ = cz * SIZE;

  for (let i = 0; i < data.length; i++) {
    if (data[i] === BLOCK.GLOWSTONE || data[i] === BLOCK.TORCH) {
      const ly = Math.floor(i / (SIZE * SIZE));
      const lz = Math.floor((i % (SIZE * SIZE)) / SIZE);
      const lx = i % SIZE;
      lights.push({ x: originX + lx, y: ly, z: originZ + lz });
    }
  }

  self.postMessage({ cx, cz, data, lights }, [data.buffer]);
};
