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

    // Activar puntito verde en el nav si hay eventos activos
    const hasActive = events.some(ev => isActive(ev, today));
    if (hasActive) {
      document.querySelectorAll('[data-active-pulse]').forEach(el => el.classList.add('active'));
    }

    // Ordenar: activos primero (por priority asc), luego pasados por fecha desc
    const sorted = [...events].sort((a, b) => {
      const aActive = isActive(a, today);
      const bActive = isActive(b, today);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      if (aActive && bActive) return (a.priority || 99) - (b.priority || 99);
      return new Date(b.endDate) - new Date(a.endDate);
    });

    // Inyectar CSS de la sección
    const style = document.createElement('style');
    style.textContent = `
    #eventos { scroll-margin-top: 80px; }

    /* Puntito verde parpadeante en el nav cuando hay eventos activos */
    .nav-event-pulse {
      display: inline-block;
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #22c55e;
      margin-left: 7px;
      vertical-align: middle;
      box-shadow: 0 0 8px rgba(34,197,94,0.85);
      opacity: 0;
      transition: opacity .3s;
    }
    .nav-event-pulse.active {
      opacity: 1;
      animation: navEvtPulse 1.6s infinite ease-in-out;
    }
    @keyframes navEvtPulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 8px rgba(34,197,94,0.85); }
      50%      { transform: scale(1.5); box-shadow: 0 0 14px rgba(34,197,94,1); }
    }
    .eventos-grid {
      display: flex;
      flex-direction: column;
      gap: 1.6rem;
      margin-top: 2.5rem;
    }
    .eventos-group-cards {
      display: flex;
      flex-direction: row;
      gap: 1.8rem;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-snap-type: x mandatory;
      scrollbar-width: thin;
      scrollbar-color: rgba(26,127,212,0.4) transparent;
      padding-bottom: .8rem;
      -webkit-overflow-scrolling: touch;
    }
    .eventos-group-cards::-webkit-scrollbar { height: 6px; }
    .eventos-group-cards::-webkit-scrollbar-track { background: transparent; }
    .eventos-group-cards::-webkit-scrollbar-thumb {
      background: rgba(26,127,212,0.4); border-radius: 3px;
    }
    .eventos-group-cards .evento-card {
      flex: 0 0 380px;
      scroll-snap-align: start;
    }
    .eventos-group-separator {
      height: 1px;
      background: linear-gradient(to right,
        transparent 0%,
        rgba(138,155,176,0.18) 25%,
        rgba(138,155,176,0.18) 75%,
        transparent 100%);
      margin: .4rem 0;
    }
    .evento-card {
      position: relative;
      background: linear-gradient(135deg, #0c1018 0%, #0a0d14 100%);
      border: 1px solid rgba(26,127,212,0.2);
      border-radius: 14px;
      overflow: hidden;
      transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
      cursor: pointer;
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
    video.evento-card-poster { object-position: center; }
    .evento-card:hover .evento-card-poster { filter: brightness(1); }
    .evento-card-body {
      padding: 1.2rem 1.4rem;
      display: flex; flex-direction: column; gap: 0.6rem;
    }
    .evento-card-header {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
    }
    .evento-card-logo {
      height: 64px; width: auto; max-width: 180px;
      object-fit: contain;
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
      .eventos-group-cards .evento-card { flex: 0 0 88vw; }
    }
    `;
    document.head.appendChild(style);

    // Helper: clave de grupo (1, 2, 3 o 'pasado')
    function groupKey(ev) {
      return isActive(ev, today) ? (ev.priority || 99) : 'pasado';
    }

    // Render: agrupa por prioridad y mete separadores entre grupos
    let currentGroupKey = null;
    let currentGroupEl  = null;

    sorted.forEach(ev => {
      const key = groupKey(ev);

      // Cambio de grupo → separador + nuevo contenedor
      if (key !== currentGroupKey) {
        if (currentGroupKey !== null) {
          const sep = document.createElement('div');
          sep.className = 'eventos-group-separator';
          grid.appendChild(sep);
        }
        currentGroupEl = document.createElement('div');
        currentGroupEl.className = 'eventos-group-cards';
        currentGroupEl.dataset.priority = key;
        grid.appendChild(currentGroupEl);
        currentGroupKey = key;
      }

      renderCard(ev, currentGroupEl);
    });

    function renderCard(ev, container) {
      const active = isActive(ev, today);
      const card = document.createElement('div');
      card.className = 'evento-card' + (active ? ' activo' : '');

      const media = ev.posterVideo
        ? `<video class="evento-card-poster" muted loop playsinline preload="none"
                  poster="${ev.posterImg || ''}">
             <source src="${ev.posterVideo}" type="video/mp4" />
           </video>`
        : `<img class="evento-card-poster" src="${ev.posterImg}" alt="${ev.title1} ${ev.title2}"
                onerror="this.style.display='none'" />`;

      card.innerHTML = `
        ${media}
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
            ${ev.date ? `<span class="evento-card-meta-item">📅 ${ev.date}</span>` : ''}
            ${ev.location ? `<span class="evento-card-meta-item">📍 ${ev.location}</span>` : ''}
          </div>
          <div class="evento-card-type">${ev.type || ''}</div>
        </div>
      `;

      // Click → abrir el popup del evento
      card.addEventListener('click', () => {
        if (window.ALFEvents) window.ALFEvents.open(ev.id);
      });

      // Hover → play / leave → quita el src y vuelve al poster
      const cardVideo = card.querySelector('video.evento-card-poster');
      if (cardVideo) {
        const videoSrc = ev.posterVideo;

        card.addEventListener('mouseenter', () => {
          // Si previamente quitamos el source, lo restauramos
          let sourceEl = cardVideo.querySelector('source');
          if (!sourceEl) {
            sourceEl = document.createElement('source');
            sourceEl.type = 'video/mp4';
            cardVideo.appendChild(sourceEl);
          }
          if (sourceEl.getAttribute('src') !== videoSrc) {
            sourceEl.setAttribute('src', videoSrc);
            cardVideo.load();
          }
          cardVideo.muted = true;
          cardVideo.play().catch(() => {});
        });

        card.addEventListener('mouseleave', () => {
          cardVideo.pause();
          // Quitar el source para que el navegador muestre de nuevo el poster
          const sourceEl = cardVideo.querySelector('source');
          if (sourceEl) sourceEl.removeAttribute('src');
          cardVideo.removeAttribute('src');
          cardVideo.load();
        });
      }

      container.appendChild(card);
    }
  });

  function isActive(ev, today) {
    const s = new Date(ev.startDate + 'T00:00:00');
    const e = new Date(ev.endDate   + 'T23:59:59');
    return today >= s && today <= e;
  }

})();
