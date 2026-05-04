/* ============================================================
   ALFILO · POPUP DE EVENTO
   ----------------------------------------------------------------
   Lee los eventos de events-data.js (window.ALFILO_EVENTS).
   · Evento activo de mayor prioridad → popup al entrar
   · Resto de activos → botón flotante visible desde el inicio
   · Para añadir eventos: edita solo events-data.js
   ============================================================ */

(() => {
  'use strict';

  const events  = window.ALFILO_EVENTS || [];
  const today   = new Date();

  // Filtrar activos y ordenar por prioridad (mayor primero)
  const active = events
    .filter(ev => {
      const s = new Date(ev.startDate + 'T00:00:00');
      const e = new Date(ev.endDate   + 'T23:59:59');
      return today >= s && today <= e;
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  if (!active.length) return;

  // ── CSS ──────────────────────────────────────────────────────
  const css = `
  .alf-evt-overlay { position: fixed; inset: 0;
    background: radial-gradient(ellipse at center, rgba(8,10,15,0.85) 0%, rgba(8,10,15,0.97) 70%);
    backdrop-filter: blur(8px); z-index: 9999;
    display: flex; align-items: center; justify-content: center; padding: 2rem;
    animation: alfEvtFadeIn 0.5s ease; opacity: 0; }
  .alf-evt-overlay.alf-show { opacity: 1; }
  .alf-evt-overlay.alf-closing { animation: alfEvtFadeOut 0.4s ease forwards; }
  @keyframes alfEvtFadeIn  { from { opacity:0; } to { opacity:1; } }
  @keyframes alfEvtFadeOut { to   { opacity:0; } }
  @keyframes alfEvtSlideUp { from { opacity:0; transform: translateY(40px) scale(0.96); } to { opacity:1; transform: translateY(0) scale(1); } }
  @keyframes alfEvtPulse   { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(1.4);} }
  @keyframes alfEvtScan    { 0%,100%{top:10%;opacity:0;} 50%{top:90%;opacity:0.8;} }

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

  .alf-evt-cta { display:flex; gap:.8rem; flex-wrap:wrap; margin-top:.5rem; justify-content:center; }
  .alf-evt-qr-wrap { display:flex; flex-direction:row; align-items:center; gap:1.2rem; }
  .alf-evt-qr-wrap a { display:inline-block; border-radius:8px; overflow:hidden;
    border:2px solid rgba(26,127,212,0.4); transition:all .3s; flex-shrink:0;
    box-shadow:0 0 16px rgba(26,127,212,0.2); }
  .alf-evt-qr-wrap a:hover { border-color:#1A7FD4; box-shadow:0 0 28px rgba(26,127,212,0.5); transform:scale(1.03); }
  .alf-evt-qr { display:block; width:110px; height:110px; object-fit:contain; }
  .alf-evt-qr-label { font-family:'Orbitron',sans-serif; font-size:.62rem;
    letter-spacing:.18em; color:#8A9BB0; text-transform:uppercase; line-height:1.6; }

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

  .alf-evt-reopen { position:fixed; right:2rem; z-index:9998;
    font-family:'Orbitron',sans-serif; font-size:.75rem; letter-spacing:.2em;
    padding:.9rem 1.6rem; background:#080A0F; color:#E8EDF5;
    border:1px solid #1A7FD4; cursor:pointer; border-radius:999px;
    box-shadow:0 0 20px rgba(26,127,212,0.6); display:none;
    align-items:center; gap:.5rem; transition: bottom 0.3s ease; }
  .alf-evt-reopen:hover { background: rgba(26,127,212,0.15); }
  .alf-evt-reopen.alf-show { display:inline-flex; }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Helpers ──────────────────────────────────────────────────

  function buildOverlayHTML(ev) {
    return `
    <div class="alf-evt-modal">
      <span class="alf-evt-corner tl"></span>
      <span class="alf-evt-corner tr"></span>
      <span class="alf-evt-corner bl"></span>
      <span class="alf-evt-corner br"></span>
      <div class="alf-evt-scan"></div>
      <button class="alf-evt-close" aria-label="Cerrar">✕</button>

      <div class="alf-evt-poster">
        <img src="${ev.posterImg}" alt="Cartel del evento" />
      </div>

      <div class="alf-evt-content">
        <div class="alf-evt-tag">
          <span class="alf-evt-pulse"></span>
          Evento destacado de ALFILO
        </div>

        <div class="alf-evt-header">
          <img src="${ev.eventLogoImg}" alt="" class="alf-evt-logo"
               onerror="this.style.display='none'" />
          <h2 class="alf-evt-title">
            ${ev.title1}<br><span class="alf-accent">${ev.title2}</span>
          </h2>
          <div class="alf-evt-subtitle">${ev.subtitle}</div>
        </div>

        <div class="alf-evt-meta">
          <div class="alf-evt-meta-item">
            <span class="alf-evt-meta-label">Fecha</span>
            <span class="alf-evt-meta-value hl">${ev.date}</span>
          </div>
          <div class="alf-evt-meta-item">
            <span class="alf-evt-meta-label">Lugar</span>
            <span class="alf-evt-meta-value">${ev.location}</span>
          </div>
          <div class="alf-evt-meta-item">
            <span class="alf-evt-meta-label">Tipo</span>
            <span class="alf-evt-meta-value">${ev.type}</span>
          </div>
        </div>

        <p class="alf-evt-desc">
          ${ev.description}
          <strong>${ev.descriptionHighlight}</strong>
        </p>

        <div class="alf-evt-cta">
          <div class="alf-evt-qr-wrap">
            <a href="${ev.infoUrl}" target="_blank" rel="noopener" title="Más info del evento">
              <img class="alf-evt-qr" src="${ev.qrImg}" alt="QR — Más info del evento" />
            </a>
            <span class="alf-evt-qr-label">Escanea para más info</span>
          </div>
        </div>

        <div class="alf-evt-sponsors">
          <div class="alf-evt-sp-label">Organizan / Colaboran</div>
          <div class="alf-evt-sp-row">
            <img src="${ev.alfiloImg}" alt="ALFILO" title="ALFILO"
                 onerror="this.style.display='none'" />
            <a href="${ev.monstertechUrl}" target="_blank" rel="noopener" title="Monstertech">
              <img src="${ev.monstertechImg}" alt="Monstertech"
                   onerror="this.style.display='none'" />
            </a>
            <img src="${ev.madeByCommunityImg}" alt="Made by the Community"
                 class="alf-made" title="Made by the Community"
                 onerror="this.style.display='none'" />
            <a href="${ev.sclabsUrl}" target="_blank" rel="noopener" title="SC LABS">
              <img src="${ev.sclabsImg}" alt="SC LABS"
                   style="height:60px;width:auto;object-fit:contain;"
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
  }

  // ── Crear overlay + botón para cada evento activo ─────────────
  const BTN_HEIGHT_REM  = 3.2;  // altura aprox del botón flotante
  const BTN_GAP_REM     = 0.5;  // separación entre botones
  const BTN_BOTTOM_BASE = 2;    // rem desde el borde inferior

  const overlays     = [];
  const reopenBtns   = [];

  active.forEach((ev, idx) => {
    // — Overlay —
    const overlay = document.createElement('div');
    overlay.className = 'alf-evt-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = buildOverlayHTML(ev);
    overlays.push(overlay);

    // — Botón flotante —
    const btn = document.createElement('button');
    btn.className = 'alf-evt-reopen';
    const bottomRem = BTN_BOTTOM_BASE + idx * (BTN_HEIGHT_REM + BTN_GAP_REM);
    btn.style.bottom = bottomRem + 'rem';
    btn.innerHTML = `📅 ${ev.reopenLabel || ev.title1}`;
    btn.setAttribute('aria-label', `Ver evento: ${ev.title1} ${ev.title2}`);
    reopenBtns.push(btn);

    // — Abrir / cerrar —
    function openPopup() {
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('alf-show'));
      btn.classList.remove('alf-show');
    }

    function closePopup() {
      overlay.classList.add('alf-closing');
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay.classList.remove('alf-closing', 'alf-show');
        btn.classList.add('alf-show');
      }, 400);
    }

    overlay.addEventListener('click', e => { if (e.target === overlay) closePopup(); });
    overlay.querySelector('.alf-evt-close').addEventListener('click', closePopup);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.parentNode) closePopup();
    });
    btn.addEventListener('click', openPopup);

    document.body.appendChild(btn);

    // — Comportamiento inicial —
    if (idx === 0) {
      // Evento principal → popup tras delay
      setTimeout(openPopup, ev.appearDelayMs || 1500);
    } else {
      // Eventos secundarios → botón flotante visible desde el inicio
      btn.classList.add('alf-show');
    }
  });

})();
