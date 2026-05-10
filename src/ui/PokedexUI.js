import { POKEDEX, TYPES } from '../data/pokedex.js';

export function initPokedexUI() {
  const grid = document.getElementById('pokedex-grid');
  if (!grid) return;

  for (const [key, data] of Object.entries(POKEDEX)) {
    const entry = document.createElement('div');
    entry.className = 'pokedex-entry';
    entry.id = `dex-${key}`;
    entry.innerHTML = `
      <div class="pokedex-entry-icon" style="color:#666; font-weight:bold; font-size:0.5rem; display:flex; align-items:center; justify-content:center;">[???]</div>
      <div style="font-size:0.65rem;opacity:0.4">#${String(data.number).padStart(3,'0')}</div>
      <div>???</div>
    `;
    grid.appendChild(entry);
  }
}

export function markCaught(pokemonKey) {
  const entry = document.getElementById(`dex-${pokemonKey}`);
  if (!entry) return;
  const data = POKEDEX[pokemonKey];
  entry.classList.add('caught');
  entry.innerHTML = `
    <div class="pokedex-entry-icon" style="color:${TYPES[data.types[0]]?.color || '#fff'}; font-weight:bold; font-size:0.5rem; display:flex; align-items:center; justify-content:center;">[${data.types[0].toUpperCase()}]</div>
    <div style="font-size:0.65rem;opacity:0.5">#${String(data.number).padStart(3,'0')}</div>
    <div>${data.name}</div>
  `;
}
