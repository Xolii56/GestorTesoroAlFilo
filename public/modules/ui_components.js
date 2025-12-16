// modules/ui_components.js

import { initDatePickers } from './date_picker.js';

function initToggleBinaries(root = document) {
  const toggles = Array.from(root.querySelectorAll('[data-component="tog-01"], .toggle-binario'));
  for (const tg of toggles) {
    if (tg.dataset.inited === '1') continue;
    tg.dataset.inited = '1';

    const btns = Array.from(tg.querySelectorAll('.toggle-btn'));
    if (!btns.length) continue;

    // Si ya hay uno con .active, respetarlo; si no, activa el primero
    let active = btns.find(b => b.classList.contains('active')) || btns[0];
    btns.forEach(b => {
      const isActive = (b === active);
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    tg.addEventListener('click', (e) => {
      const btn = e.target.closest('.toggle-btn');
      if (!btn) return;

      // IMPORTANTE: evitar submits si está dentro de un form (por si acaso)
      e.preventDefault();

      btns.forEach(b => {
        const isActive = (b === btn);
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      // Disparar evento útil (por si algún módulo quiere engancharse sin duplicar lógica)
      tg.dispatchEvent(new CustomEvent('toggle:change', {
        bubbles: true,
        detail: { value: btn.dataset.value ?? btn.dataset.type ?? null }
      }));
    });
  }
}

/**
 * Carga un componente HTML dentro de un elemento DOM
 */
export async function loadComponent(url, targetEl) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Error cargando componente: ${url}`);
    return;
  }
  const html = await res.text();
  targetEl.innerHTML = html;

  // Auto-init de componentes que requieren JS
  initToggleBinaries(targetEl);
  initDatePickers(targetEl);
}

/**
 * Carga un componente HTML por ID
 */
export async function loadComponentById(url, targetId) {
  const el = document.getElementById(targetId);
  if (!el) {
    console.warn(`Contenedor no encontrado: #${targetId}`);
    return;
  }
  await loadComponent(url, el);
}

/**
 * Carga TODOS los componentes definidos en components/index.json
 * y los renderiza como escaparate
 */
export async function loadAllComponents(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Contenedor principal no encontrado: #${containerId}`);
    return;
  }

  const res = await fetch('./components/index.json');
  if (!res.ok) {
    console.error('No se ha podido cargar components/index.json');
    return;
  }

  const cfg = await res.json();
  const exclude = cfg.exclude || [];
  const list = cfg.components || [];

  for (const file of list) {
    if (exclude.includes(file)) continue;

    const block = document.createElement('section');
    block.className = 'demo-block';

    const label = document.createElement('div');
    label.className = 'demo-label';
    label.textContent = file.replace('.html', '').toUpperCase();

    const surface = document.createElement('div');
    surface.className = 'demo-surface';

    block.appendChild(label);
    block.appendChild(surface);
    container.appendChild(block);

    await loadComponent(`./components/${file}`, surface);
  }

  // Por si hay algo que haya dependido de layout final
  initToggleBinaries(container);
  initDatePickers(container);
}
