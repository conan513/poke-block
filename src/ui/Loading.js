// src/ui/Loading.js
export function setLoadingProgress(pct, status) {
  const bar = document.getElementById('loading-bar');
  const statusEl = document.getElementById('loading-status');
  if (bar) bar.style.width = pct + '%';
  if (statusEl) statusEl.textContent = status;
}
