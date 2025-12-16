// modules/ui_components.js
// Loader simple de "componentes" HTML (partials) para castear desde /components.
// Sin frameworks. Diseñado para que el markup viva en un solo sitio.

/**
 * Descarga un HTML parcial y lo inserta dentro de un elemento target.
 * @param {string} url Ruta del partial (ej: './components/tab-01.html')
 * @param {HTMLElement} target Elemento destino
 */
export async function loadComponent(url, target) {
  if (!target) throw new Error('loadComponent: target no existe');

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`loadComponent: no se ha podido cargar ${url} (${res.status})`);
  }

  const html = await res.text();
  target.innerHTML = html;
}

/**
 * Sugar: carga un componente en el elemento con id `targetId`.
 * @param {string} url
 * @param {string} targetId
 */
export async function loadComponentById(url, targetId) {
  const el = document.getElementById(targetId);
  await loadComponent(url, el);
}

/**
 * Busca dentro de `root` el primer elemento marcado como slot.
 * @param {HTMLElement} root
 * @param {string} slotName
 * @returns {HTMLElement|null}
 */
export function getSlot(root, slotName) {
  if (!root) return null;
  return root.querySelector(`[data-slot="${slotName}"]`);
}
