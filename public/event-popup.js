/* ============================================================
   ALFILO · POPUP DE EVENTO
   ----------------------------------------------------------------
   · Para CAMBIAR el contenido, edita el bloque CONFIG de abajo.
   · Para QUITAR el popup antes de tiempo, borra la línea
       <script src="event-popup.js" defer></script>
     del index.html (o comenta este archivo).
   · Después de CONFIG.endDate el popup NO aparece (ni el botón).
   ============================================================ */

(() => {
  'use strict';

  const CONFIG = {
    // === Fechas (YYYY-MM-DD) ===
    startDate: '2026-05-03',   // se empieza a mostrar
    endDate:   '2026-06-07',   // se deja de mostrar (día después del evento)

    // === Comportamiento ===
    appearDelayMs: 1500,       // milisegundos antes de aparecer al entrar
    showEveryVisit: true,      // true = cada visita; false = sólo si no fue cerrado

    // === Contenido del evento ===
    eventTitle1: 'STREET BAR CITIZEN',
    eventTitle2: 'OURENSE',
    eventSubtitle: 'Bar Citizen World Tour 2026 · Ourense',
    eventDate: '6 JUN 2026',
    eventLocation: 'Ourense',
    eventType: 'Tour de bares y pinchos',
    description: 'Únete al recorrido oficial por las plazas y tabernas de Ourense. Una jornada para reunir a la comunidad de Star Citizen, brindar entre ciudadanos y celebrar el universo que nos une.',
    descriptionHighlight: '¡Tour de bares y pinchos por todo lo alto!',

    // === Enlaces ===
    tapLinkUrl: 'https://sbarou.taplink.site/',
    monstertechUrl: 'https://www.monster.tech/en/?ref=qxhxhdwg',
    sclabsUrl: 'https://sclabs.space/',

    // === Imágenes (rutas relativas a /public) ===
    posterImg: 'assets/events/streetbar/cartel.jpg',
    eventLogoImg: 'assets/events/streetbar/logo-clean.png',
    herbizidaImg: 'assets/events/streetbar/herbizida.png',
    qrImg: 'assets/events/streetbar/qr-taplink.png',
    alfiloImg: 'assets/events/streetbar/logo-alfilo.png',
    monstertechImg: 'assets/events/streetbar/sponsor-mva.png',
    madeByCommunityImg: 'assets/events/streetbar/made-by-community.png',
    sclabsImg: 'assets/events/streetbar/SCLABS.png',
  };

  // === Comprobar ventana de fechas ===
  const today = new Date();
  const start = new Date(CONFIG.startDate + 'T00:00:00');
  const end   = new Date(CONFIG.endDate   + 'T23:59:59');
  if (today < start || today > end) return;  // fuera de rango → no hacer nada

  // === Inyectar CSS ===
  const css = `
  .alf-evt-overlay { position: fixed; inset: 0;
    background: radial-gradient(ellipse at center, rgba(8,10,15,0.85) 0%, rgba(8,10,15,0.97) 70%);
    backdrop-filter: blur(8px); z-index: 9999;
    display: flex; align-items: center; justify-content: center; padding: 2rem;
    animation: alfEvtFadeIn 0.5s ease; opacity: 0; }
  .alf-evt-overlay.alf-show { opacity: 1; }
  .alf-evt-overlay.alf-closing { animation: alfEvtFadeOut 0.4s ease forwards; }
  @keyframes alfEvtFadeIn { from { opacity:0;} to { opacity:1;} }
  @keyframes alfEvtFadeOut { to { opacity:0;} }
  @keyframes alfEvtSlideUp { from { opacity:0; transform: translateY(40px) scale(0.96);} to { opacity:1; transform: translateY(0) scale(1);} }
  @keyframes alfEvtPulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(1.4);} }
  @keyframes alfEvtScan { 0%,100%{top:10%;opacity:0;} 50%{top:90%;opacity:0.8;} }

  .alf-evt-modal { position: relative; width: min(1180px, 100%); max-height: 90vh;
    background: linear-gradient(135deg,#0c1018 0%,#0a0d14 100%);
    border: 1px solid #1A7FD4; border-radius: 22px;
    box-shadow: 0 0 60px rgba(26,127,212,0.35), inset 0 0 30px rgba(26,127,212,0.05);
    animation: alfEvtSlideUp 0.6s cubic-bezier(0.2,0.8,0.2,1);
    display: grid; grid-template-columns: 0.78fr 1.22fr; overflow: hidden;
    font-family: 'Exo 2', sans-serif; color: #E8EDF5; }
  @media (max-width: 900px) { .alf-evt-modal { grid-template-columns: 1fr; max-height: 95vh; overflow-y:auto; } }

  .alf-evt-corner { position: absolute; width: 32px; height: 32px;
    border: 2px solid #1A7FD4; pointer-events: none;
    filter: drop-shadow(0 0 6px rgba(26,127,212,0.6)); }
  .alf-evt-corner.tl { top:10px; left:10px; border-right:none; border-bottom:none; border-top-left-radius:14px; }
  .alf-evt-corner.tr { top:10px; right:10px; border-left:none; border-bottom:none; border-top-right-radius:14px; }
  .alf-evt-corner.bl { bottom:10px; left:10px; border-right:none; border-top:none; border-bottom-left-radius:14px; }
  .alf-evt-corner.br { bottom:10px; right:10px; border-left:none; border-top:none; border-bottom-right-radius:14px; }
  .alf-evt-scan { position:absolute; left:0; right:0; height:1px;
    background: linear-gradient(to right, transparent, #1A7FD4, transparent);
    opacity:.6; animation: alfEvtScan 3s infinite ease-in-out; pointer-events:none; }

  .alf-evt-close { position:absolute; top:18px; right:18px; width:38px; height:38px;
    background: rgba(8,10,15,0.9); border:1px solid #1A7FD4; color:#E8EDF5;
    font-size:1.2rem; cursor:pointer; z-index:10; border-radius:50%;
    display:flex; align-items:center; justify-content:center; transition:all .25s; }
  .alf-evt-close:hover { background:#1A7FD4; box-shadow:0 0 20px rgba(26,127,212,0.6); }

  .alf-evt-poster { position:relative; overflow:hidden; min-height:520px;
    background: radial-gradient(ellipse at center, rgba(26,127,212,0.08) 0%, transparent 70%),
                linear-gradient(135deg,#0d1218 0%,#080a0f 100%);
    display:flex; align-items:center; justify-content:center; padding:1.4rem; }
  .alf-evt-poster img { max-width:100%; max-height:100%; width:auto; height:auto;
    object-fit:contain; display:block; filter: drop-shadow(0 4px 24px rgba(0,0,0,0.6)); }
  .alf-evt-poster::after { content:''; position:absolute; inset:0;
    background: linear-gradient(to right, transparent 75%, rgba(8,10,15,0.35) 100%);
    pointer-events:none; }

  .alf-evt-content { padding:1.8rem 2rem; display:flex; flex-direction:column; gap:0.85rem; overflow:hidden; }

  .alf-evt-tag { font-family:'Orbitron',sans-serif; font-size:.6rem; letter-spacing:.35em;
    text-transform:uppercase; color:#1A7FD4;
    display:flex; align-items:center; justify-content:center; gap:.6rem; text-align:center; }
  .alf-evt-tag::before, .alf-evt-tag::after { content:''; width:30px; height:1px;
    background: linear-gradient(to right, transparent, #1A7FD4); }
  .alf-evt-tag::after { background: linear-gradient(to right, #1A7FD4, transparent); }
  .alf-evt-pulse { width:8px; height:8px; border-radius:50%; background:#1A7FD4;
    box-shadow:0 0 10px rgba(26,127,212,0.6); animation: alfEvtPulse 1.5s infinite; }

  .alf-evt-header { display:flex; flex-direction:column; align-items:center; text-align:center; gap:.5rem; }
  .alf-evt-logo { width:130px; height:130px; object-fit:contain;
    filter: drop-shadow(0 0 22px rgba(255,255,255,0.2)) drop-shadow(0 4px 10px rgba(0,0,0,0.6)); }
  .alf-evt-title { font-family:'Orbitron',sans-serif; font-size:clamp(1.4rem,2.4vw,1.9rem);
    font-weight:900; line-height:1.05; letter-spacing:.02em; }
  .alf-evt-title .alf-accent { color:#1A7FD4; }
  .alf-evt-subtitle { font-size:.78rem; letter-spacing:.12em; color:#8A9BB0; text-transform:uppercase; }

  .alf-evt-meta { display:flex; gap:1.3rem; flex-wrap:wrap; padding:.7rem 0;
    border-top:1px solid rgba(26,127,212,0.25); border-bottom:1px solid rgba(26,127,212,0.25); }
  .alf-evt-meta-item { display:flex; flex-direction:column; gap:.2rem; }
  .alf-evt-meta-label { font-family:'Orbitron',sans-serif; font-size:.55rem;
    letter-spacing:.25em; color:#8A9BB0; text-transform:uppercase; }
  .alf-evt-meta-value { font-family:'Orbitron',sans-serif; font-size:.9rem; font-weight:700; color:#E8EDF5; }
  .alf-evt-meta-value.hl { color:#1A7FD4; text-shadow:0 0 12px rgba(26,127,212,0.6); }

  .alf-evt-desc { font-size:.85rem; line-height:1.5; color:#8A9BB0; }
  .alf-evt-desc strong { color:#E8EDF5; }

  .alf-evt-cta { display:flex; gap:.8rem; flex-wrap:wrap; margin-top:.5rem; }
  .alf-evt-btn { font-family:'Orbitron',sans-serif; font-size:.85rem; letter-spacing:.18em;
    text-transform:uppercase; padding:.7rem 1.5rem .7rem .7rem;
    background: linear-gradient(135deg,#1A7FD4,#2596e8); color:#fff;
    border:1px solid #1A7FD4; border-radius:999px;
    box-shadow:0 0 20px rgba(26,127,212,0.4); text-decoration:none;
    display:inline-flex; align-items:center; gap:.6rem; cursor:pointer;
    transition:all .3s; }
  .alf-evt-btn:hover { background: linear-gradient(135deg,#2596e8,#3aa8f0);
    box-shadow:0 0 30px rgba(26,127,212,0.75); transform:translateY(-2px); }
  .alf-evt-btn img { height:42px; width:42px; object-fit:cover;
    border-radius:50%; border:2px solid rgba(255,255,255,0.5);
    box-shadow:0 0 10px rgba(0,0,0,0.4); }

  .alf-evt-sponsors { margin-top:auto; padding-top:.9rem; border-top:1px solid rgba(26,127,212,0.15); }
  .alf-evt-sp-label { font-family:'Orbitron',sans-serif; font-size:.55rem; letter-spacing:.3em;
    color:#8A9BB0; text-transform:uppercase; margin-bottom:1rem; opacity:.7; text-align:center; }
  .alf-evt-sp-row { display:flex; align-items:center; justify-content:center; gap:2rem; flex-wrap:wrap; }
  .alf-evt-sp-row img { height:64px; width:auto; object-fit:contain; opacity:.95;
    transition:all .3s; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5)); }
  .alf-evt-sp-row a { display:inline-flex; }
  .alf-evt-sp-row a:hover img, .alf-evt-sp-row > img:hover { opacity:1; transform:translateY(-2px); }
  .alf-evt-sp-row .alf-made { filter: invert(1) drop-shadow(0 2px 8px rgba(0,0,0,0.5)); opacity:.75; }
  .alf-evt-sp-row .alf-made:hover { opacity:1; }

  .alf-evt-raffle { margin-top:1rem; text-align:center; font-family:'Orbitron',sans-serif;
    font-size:.62rem; letter-spacing:.18em; text-transform:uppercase; color:#8A9BB0;
    display:flex; align-items:center; justify-content:flex-end; gap:.5rem; padding-right:151px; }
  .alf-evt-raffle a { color:#1A7FD4; text-decoration:none; letter-spacing:.22em;
    border-bottom:1px solid transparent; transition:all .25s; }
  .alf-evt-raffle a:hover { color:#2596e8; border-bottom-color:#1A7FD4; }
  .alf-evt-raffle-dot { width:6px; height:6px; border-radius:50%; background:#1A7FD4;
    box-shadow:0 0 8px rgba(26,127,212,0.6); animation: alfEvtPulse 1.8s infinite; }

  .alf-evt-cta { justify-content:center; }
  .alf-evt-qr-wrap { display:flex; flex-direction:row; align-items:center; gap:1.2rem; }
  .alf-evt-qr-wrap a { display:inline-block; border-radius:8px; overflow:hidden;
    border:2px solid rgba(26,127,212,0.4); transition:all .3s; flex-shrink:0;
    box-shadow:0 0 16px rgba(26,127,212,0.2); }
  .alf-evt-qr-wrap a:hover { border-color:#1A7FD4; box-shadow:0 0 28px rgba(26,127,212,0.5); transform:scale(1.03); }
  .alf-evt-qr { display:block; width:110px; height:110px; object-fit:contain; }
  .alf-evt-qr-label { font-family:'Orbitron',sans-serif; font-size:.62rem;
    letter-spacing:.18em; color:#8A9BB0; text-transform:uppercase; line-height:1.6; }

  .alf-evt-reopen { position:fixed; bottom:2rem; right:2rem; z-index:9998;
    font-family:'Orbitron',sans-serif; font-size:.75rem; letter-spacing:.2em;
    padding:.9rem 1.6rem; background:#080A0F; color:#E8EDF5;
    border:1px solid #1A7FD4; cursor:pointer; border-radius:999px;
    box-shadow:0 0 20px rgba(26,127,212,0.6); display:none;
    align-items:center; gap:.5rem; }
  .alf-evt-reopen:hover { background: rgba(26,127,212,0.15); }
  .alf-evt-reopen.alf-show { display:inline-flex; }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // === Crear el HTML del overlay ===
  const overlay = document.createElement('div');
  overlay.className = 'alf-evt-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="alf-evt-modal">
      <span class="alf-evt-corner tl"></span>
      <span class="alf-evt-corner tr"></span>
      <span class="alf-evt-corner bl"></span>
      <span class="alf-evt-corner br"></span>
      <div class="alf-evt-scan"></div>
      <button class="alf-evt-close" aria-label="Cerrar">✕</button>

      <div class="alf-evt-poster">
        <img src="${CONFIG.posterImg}" alt="Cartel del evento" />
      </div>

      <div class="alf-evt-content">
        <div class="alf-evt-tag">
          <span class="alf-evt-pulse"></span>
          Evento destacado de ALFILO
        </div>

        <div class="alf-evt-header">
          <img src="${CONFIG.eventLogoImg}" alt="" class="alf-evt-logo"
               onerror="this.style.display='none'" />
          <h2 class="alf-evt-title">
            ${CONFIG.eventTitle1}<br><span class="alf-accent">${CONFIG.eventTitle2}</span>
          </h2>
          <div class="alf-evt-subtitle">${CONFIG.eventSubtitle}</div>
        </div>

        <div class="alf-evt-meta">
          <div class="alf-evt-meta-item">
            <span class="alf-evt-meta-label">Fecha</span>
            <span class="alf-evt-meta-value hl">${CONFIG.eventDate}</span>
          </div>
          <div class="alf-evt-meta-item">
            <span class="alf-evt-meta-label">Lugar</span>
            <span class="alf-evt-meta-value">${CONFIG.eventLocation}</span>
          </div>
          <div class="alf-evt-meta-item">
            <span class="alf-evt-meta-label">Tipo</span>
            <span class="alf-evt-meta-value">${CONFIG.eventType}</span>
          </div>
        </div>

        <p class="alf-evt-desc">
          ${CONFIG.description}
          <strong>${CONFIG.descriptionHighlight}</strong>
        </p>

        <div class="alf-evt-cta">
          <div class="alf-evt-qr-wrap">
            <a href="${CONFIG.tapLinkUrl}" target="_blank" rel="noopener" title="Más info del evento">
              <img class="alf-evt-qr"
                   src="${CONFIG.qrImg}"
                   alt="QR Code — Más info del evento" />
            </a>
            <span class="alf-evt-qr-label">Escanea para más info</span>
          </div>
        </div>

        <div class="alf-evt-sponsors">
          <div class="alf-evt-sp-label">Organizan / Colaboran</div>
          <div class="alf-evt-sp-row">
            <img src="${CONFIG.alfiloImg}" alt="ALFILO" title="ALFILO"
                 onerror="this.style.display='none'" />
            <a href="${CONFIG.monstertechUrl}" target="_blank" rel="noopener" title="Monstertech">
              <img src="${CONFIG.monstertechImg}" alt="Monstertech"
                   onerror="this.style.display='none'" />
            </a>
            <img src="${CONFIG.madeByCommunityImg}" alt="Made by the Community"
                 class="alf-made" title="Made by the Community"
                 onerror="this.style.display='none'" />
            <a href="${CONFIG.sclabsUrl}" target="_blank" rel="noopener" title="SC LABS">
              <img src="${CONFIG.sclabsImg}" alt="SC LABS" style="height:60px;width:auto;object-fit:contain;"
                   onerror="this.style.display='none'" />
            </a>
          </div>

          <div class="alf-evt-raffle">
            <span class="alf-evt-raffle-dot"></span>
            Sorteos durante el evento vía <strong>SC LABS</strong>
          </div>
        </div>
      </div>
    </div>
  `;

  // Botón flotante de reapertura
  const reopenBtn = document.createElement('button');
  reopenBtn.className = 'alf-evt-reopen';
  reopenBtn.innerHTML = `📅 Ver evento`;
  reopenBtn.setAttribute('aria-label', 'Volver a abrir el popup del evento');

  function open() {
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('alf-show'));
    reopenBtn.classList.remove('alf-show');
  }
  function close() {
    overlay.classList.add('alf-closing');
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlay.classList.remove('alf-closing','alf-show');
      reopenBtn.classList.add('alf-show');
    }, 400);
  }

  // Listeners
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('.alf-evt-close').addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.parentNode) close();
  });
  reopenBtn.addEventListener('click', open);

  // Insertar el botón flotante (oculto inicialmente)
  document.body.appendChild(reopenBtn);

  // Abrir tras el delay configurado
  setTimeout(open, CONFIG.appearDelayMs);
})();
