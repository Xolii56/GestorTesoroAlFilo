/* ============================================================
   ALFILO · SECCIÓN DE EVENTOS (ARCHIVO)
   ----------------------------------------------------------------
   Renderiza las tarjetas de todos los eventos en #eventos-grid.
   Lee de window.ALFILO_EVENTS (events-data.js).
   Eventos activos muestran badge "EN DIRECTO".
   ============================================================ */

(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('eventos-grid');
    if (!grid) return;

    const events = window.ALFILO_EVENTS || [];
    if (!events.length) {
      grid.innerHTML = '<p class="eventos-empty">No hay eventos registrados aún.</p>';
      return;
    }

    const today = new Date();

    // Ordenar: activos primero, luego por fecha desc
    const sorted = [...events].sort((a, b) => {
      const aActive = isActive(a, today);
      const bActive = isActive(b, today);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return new Date(b.endDate) - new Date(a.endDate);
    });

    // Inyectar CSS de la sección
    const style = document.createElement('style');
    style.textContent = `
    #eventos {
      scroll-margin-top: 80px;
      position: relative;
      background: url('assets/eventos-bg.jpg.png') center center / cover no-repeat;
    }
    #eventos::before {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(to bottom,
        rgba(8,10,15,0.75) 0%,
        rgba(8,10,15,0.55) 50%,
        rgba(8,10,15,0.75) 100%);
      pointer-events: none;
      z-index: 0;
    }
    #eventos > * { position: relative; z-index: 1; }
    .eventos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.8rem;
      margin-top: 2.5rem;
    }
    .evento-card {
      position: relative;
      background: linear-gradient(135deg, #0c1018 0%, #0a0d14 100%);
      border: 1px solid rgba(26,127,212,0.2);
      border-radius: 14px;
      overflow: hidden;
      transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
      cursor: default;
    }
    .evento-card:hover {
      border-color: rgba(26,127,212,0.6);
      box-shadow: 0 0 28px rgba(26,127,212,0.15);
      transform: translateY(-3px);
    }
    .evento-card.activo {
      border-color: rgba(26,127,212,0.5);
      box-shadow: 0 0 20px rgba(26,127,212,0.12);
    }
    .evento-card-poster {
      width: 100%; height: 200px;
      object-fit: cover; object-position: top;
      display: block;
      filter: brightness(0.85);
      transition: filter 0.3s;
    }
    .evento-card:hover .evento-card-poster { filter: brightness(1); }
    .evento-card-body {
      padding: 1.2rem 1.4rem;
      display: flex; flex-direction: column; gap: 0.6rem;
    }
    .evento-card-header {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
    }
    .evento-card-logo {
      width: 48px; height: 48px; object-fit: contain;
      filter: drop-shadow(0 0 8px rgba(26,127,212,0.3));
    }
    .evento-badge-activo {
      font-family: 'Orbitron', sans-serif; font-size: .55rem;
      letter-spacing: .25em; text-transform: uppercase;
      background: rgba(26,127,212,0.15); color: #1A7FD4;
      border: 1px solid rgba(26,127,212,0.4);
      padding: .25rem .7rem; border-radius: 999px;
      display: flex; align-items: center; gap: .4rem;
    }
    .evento-badge-activo::before {
      content: '';
      width: 6px; height: 6px; border-radius: 50%;
      background: #1A7FD4;
      box-shadow: 0 0 6px rgba(26,127,212,0.8);
      animation: evtArchPulse 1.5s infinite;
    }
    @keyframes evtArchPulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
    .evento-badge-pasado {
      font-family: 'Orbitron', sans-serif; font-size: .55rem;
      letter-spacing: .25em; text-transform: uppercase;
      color: rgba(138,155,176,0.5);
      border: 1px solid rgba(138,155,176,0.15);
      padding: .25rem .7rem; border-radius: 999px;
    }
    .evento-card-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 1rem; font-weight: 900; line-height: 1.1;
      color: #E8EDF5;
    }
    .evento-card-title span { color: #1A7FD4; }
    .evento-card-meta {
      display: flex; flex-wrap: wrap; gap: .4rem .9rem;
      font-family: 'Exo 2', sans-serif; font-size: .75rem;
      color: #8A9BB0;
    }
    .evento-card-meta-item { display: flex; align-items: center; gap: .3rem; }
    .evento-card-divider {
      height: 1px;
      background: linear-gradient(to right, transparent, rgba(26,127,212,0.2), transparent);
      margin: .2rem 0;
    }
    .evento-card-type {
      font-family: 'Orbitron', sans-serif; font-size: .6rem;
      letter-spacing: .2em; text-transform: uppercase;
      color: rgba(138,155,176,0.5);
    }
    .eventos-empty {
      font-family: 'Exo 2', sans-serif; color: rgba(138,155,176,0.5);
      font-size: .85rem; text-align: center; padding: 2rem 0;
    }
    @media (max-width: 600px) {
      .eventos-grid { grid-template-columns: 1fr; }
    }
    `;
    document.head.appendChild(style);

    // Renderizar tarjetas
    sorted.forEach(ev => {
      const active = isActive(ev, today);
      const card = document.createElement('div');
      card.className = 'evento-card' + (active ? ' activo' : '');

      card.innerHTML = `
        <img class="evento-card-poster" src="${ev.posterImg}" alt="${ev.title1} ${ev.title2}"
             onerror="this.style.display='none'" />
        <div class="evento-card-body">
          <div class="evento-card-header">
            <img class="evento-card-logo" src="${ev.eventLogoImg}" alt=""
                 onerror="this.style.display='none'" />
            ${active
              ? `<span class="evento-badge-activo">En directo</span>`
              : `<span class="evento-badge-pasado">Pasado</span>`
            }
          </div>
          <div class="evento-card-title">
            ${ev.title1}<br><span>${ev.title2}</span>
          </div>
          <div class="evento-card-divider"></div>
          <div class="evento-card-meta">
            <span class="evento-card-meta-item">📅 ${ev.date}</span>
            <span class="evento-card-meta-item">📍 ${ev.location}</span>
          </div>
          <div class="evento-card-type">${ev.type}</div>
        </div>
      `;

      grid.appendChild(card);
    });
  });

  function isActive(ev, today) {
    const s = new Date(ev.startDate + 'T00:00:00');
    const e = new Date(ev.endDate   + 'T23:59:59');
    return today >= s && today <= e;
  }

})();
