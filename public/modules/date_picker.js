// modules/date_picker.js

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISODate(s) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatHuman(d) {
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function buildCalendar(monthDate) {
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();

  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);

  // Lunes=0 ... Domingo=6
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();

  const weeks = [];
  let day = 1 - startDay;

  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(y, m, day);
      row.push(d);
      day++;
    }
    weeks.push(row);
  }

  return { weeks, y, m, daysInMonth };
}

function ensurePopup(fieldEl) {
  let popup = fieldEl.querySelector('.date-popup');
  if (popup) return popup;

  popup = document.createElement('div');
  popup.className = 'date-popup';
  popup.innerHTML = `
    <div class="date-popup__panel">
      <div class="date-popup__header">
        <button type="button" class="btn btn-secondary btn-sm" data-nav="prev">‹</button>
        <div class="date-popup__title"></div>
        <button type="button" class="btn btn-secondary btn-sm" data-nav="next">›</button>
      </div>

      <div class="date-popup__grid">
        <div class="date-popup__dow">L</div>
        <div class="date-popup__dow">M</div>
        <div class="date-popup__dow">X</div>
        <div class="date-popup__dow">J</div>
        <div class="date-popup__dow">V</div>
        <div class="date-popup__dow">S</div>
        <div class="date-popup__dow">D</div>
      </div>

      <div class="date-popup__days"></div>

      <div class="date-popup__actions">
        <button type="button" class="btn btn-secondary btn-sm" data-action="clear">Limpiar</button>
        <button type="button" class="btn btn-secondary btn-sm" data-action="plus7">7 días</button>
        <button type="button" class="btn btn-secondary btn-sm" data-action="plus14">14 días</button>
        <button type="button" class="btn btn-secondary btn-sm" data-action="today">Hoy</button>
      </div>
    </div>
  `;

  fieldEl.appendChild(popup);
  return popup;
}

function applyPopupStylesOnce() {
  if (document.getElementById('dat-01-styles')) return;

  const st = document.createElement('style');
  st.id = 'dat-01-styles';
  st.textContent = `
    .date-field { position: relative; display: inline-block; width: 100%; max-width: 360px; }
    .date-label { display:block; font-size:.8rem; opacity:.85; margin-bottom:.25rem; }
    .date-input {
      width:100%;
      padding:0.45rem 0.8rem;
      border-radius:999px;
      border:1px solid var(--border-subtle);
      background: rgba(15,23,42,0.9);
      color: var(--text-primary);
      font-family: inherit;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .date-popup { position:absolute; left:0; z-index: 50; width: 320px; }
    .date-popup--up { bottom: calc(100% + 10px); }
    .date-popup--down { top: calc(100% + 10px); }

    .date-popup__panel{
      border:1px solid rgba(148,163,184,0.18);
      background: rgba(2,6,23,0.98);
      border-radius: 14px;
      padding: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }
    .date-popup__header{
      display:flex; align-items:center; justify-content:space-between; gap:.5rem;
      margin-bottom: .5rem;
    }
    .date-popup__title{ font-size:.9rem; opacity:.9; }

    .date-popup__grid{
      display:grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
      margin-bottom: 8px;
    }
    .date-popup__dow{
      text-align:center;
      font-size:.7rem;
      opacity:.6;
      padding: 4px 0;
    }
    .date-popup__days{
      display:grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
      margin-bottom: 10px;
    }
    .date-day{
      height: 32px;
      border-radius: 10px;
      border: 1px solid rgba(148,163,184,0.12);
      background: rgba(15,23,42,0.55);
      color: var(--text-primary);
      font-size:.8rem;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
    }
    .date-day--muted{ opacity:.35; }
    .date-day--selected{
      outline: 2px solid rgba(59,130,246,0.75);
      border-color: rgba(59,130,246,0.45);
    }

    .date-popup__actions{
      display:flex;
      gap: .4rem;
      justify-content:flex-end;
      flex-wrap:wrap;
    }
  `;
  document.head.appendChild(st);
}

function positionPopup(fieldEl, popupEl) {
  popupEl.classList.remove('date-popup--up', 'date-popup--down');

  // Necesitamos medir: si no cabe abajo, la subimos
  const rect = fieldEl.getBoundingClientRect();
  const viewportH = window.innerHeight || document.documentElement.clientHeight;

  // Aproximación del alto del popup (si aún no se ha renderizado bien, asumimos 340)
  const popupH = popupEl.offsetHeight || 340;

  const spaceBelow = viewportH - rect.bottom;
  const spaceAbove = rect.top;

  if (spaceBelow < popupH && spaceAbove > popupH) {
    popupEl.classList.add('date-popup--up');
  } else {
    popupEl.classList.add('date-popup--down');
  }
}

function renderDays(popupEl, viewDate, selectedISO) {
  const titleEl = popupEl.querySelector('.date-popup__title');
  const daysEl = popupEl.querySelector('.date-popup__days');

  const { weeks, y, m } = buildCalendar(viewDate);
  const monthName = new Date(y, m, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  titleEl.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  daysEl.innerHTML = '';

  for (const row of weeks) {
    for (const d of row) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'date-day';
      btn.textContent = String(d.getDate());

      if (d.getMonth() !== m) btn.classList.add('date-day--muted');

      const iso = toISODate(d);
      btn.dataset.iso = iso;

      if (selectedISO && iso === selectedISO) {
        btn.classList.add('date-day--selected');
      }

      daysEl.appendChild(btn);
    }
  }
}

export function initDatePickers(root = document) {
  applyPopupStylesOnce();

  const fields = Array.from(root.querySelectorAll('[data-component="dat-01"]'));
  for (const field of fields) {
    if (field.dataset.inited === '1') continue;
    field.dataset.inited = '1';

    const input = field.querySelector('.date-input');
    if (!input) continue;

    let viewDate = new Date();
    let selectedISO = null;

    const popup = ensurePopup(field);
    popup.style.display = 'none';

    const open = () => {
      popup.style.display = 'block';
      positionPopup(field, popup);
      renderDays(popup, viewDate, selectedISO);
    };

    const close = () => {
      popup.style.display = 'none';
    };

    const setSelected = (d) => {
      selectedISO = toISODate(d);
      input.value = formatHuman(d);
      close();
      renderDays(popup, viewDate, selectedISO);
    };

    input.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = popup.style.display === 'block';
      if (isOpen) close();
      else open();
    });

    popup.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Click fuera cierra
    document.addEventListener('click', () => {
      close();
    });

    // Navegación mes
    popup.querySelector('[data-nav="prev"]').addEventListener('click', () => {
      viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
      renderDays(popup, viewDate, selectedISO);
    });

    popup.querySelector('[data-nav="next"]').addEventListener('click', () => {
      viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
      renderDays(popup, viewDate, selectedISO);
    });

    // Acciones
    popup.querySelector('[data-action="clear"]').addEventListener('click', () => {
      selectedISO = null;
      input.value = '';
      close();
      renderDays(popup, viewDate, selectedISO);
    });

    popup.querySelector('[data-action="today"]').addEventListener('click', () => {
      const d = new Date();
      viewDate = new Date(d.getFullYear(), d.getMonth(), 1);
      setSelected(d);
    });

    popup.querySelector('[data-action="plus7"]').addEventListener('click', () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      viewDate = new Date(d.getFullYear(), d.getMonth(), 1);
      setSelected(d);
    });

    popup.querySelector('[data-action="plus14"]').addEventListener('click', () => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      viewDate = new Date(d.getFullYear(), d.getMonth(), 1);
      setSelected(d);
    });

    // Click en día
    popup.addEventListener('click', (e) => {
      const btn = e.target.closest('.date-day');
      if (!btn) return;

      const iso = btn.dataset.iso;
      const d = parseISODate(iso);
      if (!d) return;

      setSelected(d);
    });

    // Reposicionar si cambias tamaño/scroll
    window.addEventListener('resize', () => {
      if (popup.style.display === 'block') positionPopup(field, popup);
    });
    window.addEventListener('scroll', () => {
      if (popup.style.display === 'block') positionPopup(field, popup);
    }, true);
  }
}
