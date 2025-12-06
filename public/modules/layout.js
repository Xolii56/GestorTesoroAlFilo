// Carga el header común desde components/header.html
window.loadHeader = async function (variant) {
  const container = document.getElementById('site-header');
  if (!container) return;

  try {
    const res = await fetch('./components/header.html');
    if (!res.ok) {
      console.error('No se pudo cargar header.html', res.status);
      return;
    }
    const html = await res.text();
    container.innerHTML = html;

    // Si la variante es "public" (login), ocultamos la zona de usuario
    if (variant === 'public') {
      const right = container.querySelector('.topbar-right');
      if (right) right.remove();
    }
  } catch (e) {
    console.error('Error cargando header.html', e);
  }
};

// Inicializa avatar, nombre, menú y notificaciones para páginas internas
window.initHeaderUserMenu = function (session, onLogout, onProfile) {
  const profile = session?.user;
  const meta = profile?.user_metadata || {};

  const name =
    meta.full_name ||
    (meta.custom_claims && meta.custom_claims.global_name) ||
    meta.name ||
    profile?.email ||
    'Usuario';

  const avatar =
    meta.avatar_url ||
    meta.picture ||
    '';

  const avatarImg = document.getElementById('avatar');
  const userNameDiv = document.getElementById('user-name');

  if (avatarImg && avatar) avatarImg.src = avatar;
  if (userNameDiv) userNameDiv.textContent = name;

  const avatarBtn = document.getElementById('avatar-button');
  const dropdown = document.getElementById('user-dropdown');
  const logoutBtn = document.getElementById('logout-btn');
  const profileBtn = document.getElementById('profile-btn');

  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', () => {
      dropdown.classList.remove('open');
    });

    // No cerrar si click dentro del menú
    dropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  if (logoutBtn && typeof onLogout === 'function') {
    logoutBtn.addEventListener('click', onLogout);
  }

  if (profileBtn) {
    profileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof onProfile === 'function') {
        onProfile();
      } else {
        // Comportamiento por defecto: ir a la página de perfil
        window.location.href = './perfil.html';
      }
    });
  }

  // ─────────── NOTIFICACIONES ───────────
  initNotifications(session);
};

/**
 * Inicializa sistema de notificaciones en el header.
 * - Muestra badge de no leídas.
 * - Abre/cierra panel lateral.
 * - Marca como leídas al abrir.
 * - Permite limpiar leídas / borrar todas (solo a nivel interfaz usando localStorage).
 */
function initNotifications(session) {
  const supa = window.supa;
  if (!supa || !session?.user?.id) return;

  const userId = session.user.id;

  const bell      = document.getElementById('notif-bell');
  const countSpan = document.getElementById('notif-count');
  const panel     = document.getElementById('notif-panel');
  const listEl    = document.getElementById('notif-list');
  const closeBtn  = document.getElementById('notif-close');

  // Botones footer
  const clearReadBtn = document.getElementById('notif-clear-read');
  const clearAllBtn  = document.getElementById('notif-clear-all');

  if (!bell || !panel || !listEl) return;

  // Claves de localStorage para controlar “hasta cuándo” se limpió
  const LS_KEY_ALL  = `notif_cleared_all_${userId}`;
  const LS_KEY_READ = `notif_cleared_read_${userId}`;

  function getCutoff(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const t = new Date(raw).getTime();
      return Number.isNaN(t) ? null : t;
    } catch {
      return null;
    }
  }

  function setCutoff(key, date = new Date()) {
    try {
      localStorage.setItem(key, date.toISOString());
    } catch {
      // si peta localStorage, no pasa nada grave
    }
  }

  function applyFilters(rows) {
    const allCutoff  = getCutoff(LS_KEY_ALL);
    const readCutoff = getCutoff(LS_KEY_READ);

    return (rows || []).filter(n => {
      const createdTs = n.created_at ? new Date(n.created_at).getTime() : 0;
      const readTs    = n.read_at ? new Date(n.read_at).getTime() : null;

      // Si pulsó "Borrar todas" en algún momento → no mostramos nada anterior a esa fecha
      if (allCutoff && createdTs <= allCutoff) return false;

      // Si pulsó "Limpiar leídas" → ocultamos las leídas cuya read_at sea anterior a ese corte
      if (readCutoff && readTs && readTs <= readCutoff) return false;

      return true;
    });
  }

  async function fetchNotifications() {
    const { data, error } = await supa
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error cargando notificaciones:', error);
      return [];
    }
    return data || [];
  }

  function updateBadge(rows) {
    if (!countSpan) return;
    const unread = (rows || []).filter(n => !n.read_at).length;
    if (unread > 0) {
      countSpan.style.display = 'inline-flex';
      countSpan.textContent = unread > 99 ? '99+' : String(unread);
    } else {
      countSpan.style.display = 'none';
    }
  }

  function renderList(rows) {
    listEl.innerHTML = '';

    if (!rows.length) {
      const p = document.createElement('p');
      p.className = 'notif-empty';
      p.textContent = 'No tienes notificaciones.';
      listEl.appendChild(p);
      updateBadge(rows);
      return;
    }

    rows.forEach(n => {
      const item = document.createElement('div');
      item.className = 'notif-item ' + (n.read_at ? 'read' : 'unread');

      const title = document.createElement('div');
      title.className = 'notif-title';
      title.textContent = n.title || 'Notificación';

      const body = document.createElement('div');
      body.className = 'notif-body';
      body.textContent = n.body || '';

      const meta = document.createElement('div');
      meta.className = 'notif-meta';
      try {
        meta.textContent = new Date(n.created_at).toLocaleString();
      } catch {
        meta.textContent = n.created_at || '';
      }

      item.appendChild(title);
      if (n.body) item.appendChild(body);
      item.appendChild(meta);

      item.addEventListener('click', async () => {
        // Marcar como leída si no lo está
        if (!n.read_at) {
          await markAsRead(n.id);
          item.classList.remove('unread');
          item.classList.add('read');
        }
        // Navegación opcional si hay link
        if (n.link_url) {
          window.location.href = n.link_url;
        }
      });

      listEl.appendChild(item);
    });

    updateBadge(rows);
  }

  async function markAllRead() {
    const { error } = await supa
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
      .eq('user_id', userId);

    if (error) {
      console.error('Error marcando todas como leídas:', error);
    }
  }

  async function markAsRead(id) {
    const { error } = await supa
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  }

  // Carga inicial + suscripción realtime
  (async () => {
    const rawRows = await fetchNotifications();
    const visibleRows = applyFilters(rawRows);
    updateBadge(visibleRows);

    // ────────────────────────────────────────────────────────────────
    // 🔴 SUSCRIPCIÓN REALTIME A LA TABLA NOTIFICATIONS PARA ESTE USER
    // ────────────────────────────────────────────────────────────────
    try {
      const channel = supa
        .channel(`notif-realtime-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",                          // INSERT / UPDATE / DELETE
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`
          },
          async (_payload) => {
            // Cuando llega una notificación nueva o se actualiza:
            const updatedRaw = await fetchNotifications();
            const updatedVisible = applyFilters(updatedRaw);
            updateBadge(updatedVisible);

            // Si está abierto el panel → refrescar lista sin cerrar
            if (panel.classList.contains("open")) {
              renderList(updatedVisible);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.error("Error inicializando realtime de notificaciones:", err);
    }
  })();

  // Abrir/cerrar panel
  bell.addEventListener('click', async (e) => {
    e.stopPropagation();
    const willOpen = !panel.classList.contains('open');
    if (willOpen) {
      panel.classList.add('open');
      const rawRows = await fetchNotifications();
      const visibleRows = applyFilters(rawRows);
      renderList(visibleRows);
      // Al abrir, podemos considerarlas vistas → marcamos como leídas
      await markAllRead();
      // Badge se actualiza en siguiente refresco, pero lo podemos limpiar ya
      updateBadge([]);
    } else {
      panel.classList.remove('open');
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
    });
  }

  // Botón "Limpiar leídas": marca todas como leídas y oculta las leídas anteriores a ahora
  if (clearReadBtn) {
    clearReadBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      await markAllRead();
      setCutoff(LS_KEY_READ, new Date());

      const rawRows = await fetchNotifications();
      const visibleRows = applyFilters(rawRows);
      renderList(visibleRows);
      updateBadge(visibleRows);
    });
  }

  // Botón "Borrar todas": oculta todo lo anterior a ahora (leerán como “panel limpio”)
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      setCutoff(LS_KEY_ALL, new Date());

      const rawRows = await fetchNotifications();
      const visibleRows = applyFilters(rawRows);
      renderList(visibleRows);
      updateBadge(visibleRows);
    });
  }

  // Cerrar al hacer click fuera del panel
  document.addEventListener('click', (e) => {
    if (!panel.classList.contains('open')) return;
    const target = e.target;
    if (panel.contains(target) || target === bell) return;
    panel.classList.remove('open');
  });
}
