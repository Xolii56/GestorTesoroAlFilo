// modules/ui_components.js

/**
 * Carga un componente HTML dentro de un elemento DOM
 * @param {string} url - ruta al componente
 * @param {HTMLElement} targetEl - elemento destino
 */
export async function loadComponent(url, targetEl) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Error cargando componente: ${url}`);
    return;
  }
  const html = await res.text();
  targetEl.innerHTML = html;
}

/**
 * Carga un componente HTML por ID
 * @param {string} url - ruta al componente
 * @param {string} targetId - id del contenedor
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
 * @param {string} containerId - contenedor principal del muestrario
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
}
