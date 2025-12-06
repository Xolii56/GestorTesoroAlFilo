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
  const dropdown  = document.getElementById('user-dropdown');
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
 * - Borra leídas > 24h automáticamente.
 * - Botón "Borrar todas" que las elimina DEFINITIVAMENTE.
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

  const footer        = document.getElementById('notif-footer');
  const clearOldBtn   = document.getElementById('notif-clear-old'); // botón viejo
  const clearAllBtn   = document.getElementById('notif-clear-all'); // botón bueno

  if (!bell || !panel || !listEl) return;

  // Eliminar del DOM el botón "Limpiar leídas" si existe
  if (clearOldBtn && clearOldBtn.parentNode) {
    clearOldBtn.parentNode.removeChild(clearOldBtn);
  }

  // ───────────────── Auxiliares ─────────────────

  // Borra en BBDD las notificaciones leídas hace más de 24h
  async function cleanupOldReadNotifications() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supa
      .from('notifications')
      .delete()
      .lt('read_at', cutoff)
      .eq('user_id', userId);

    if (error) {
      console.error('Error borrando notificaciones antiguas leídas:', error);
    }
  }

  async function fetchNotifications() {
    // Primero limpieza automática de leídas viejas
    await cleanupOldReadNotifications();

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
    const unread = rows.filter(n => !n.read_at).length;
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
      updateBadge([]);
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
    const nowIso = new Date().toISOString();

    const { error } = await supa
      .from('notifications')
      .update({ read_at: nowIso })
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

  // BORRAR TODAS LAS NOTIFICACIONES DEL USUARIO (para siempre)
  async function deleteAllNotifications() {
    const { error } = await supa
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error borrando todas las notificaciones:', error);
      alert('No se han podido borrar las notificaciones.');
      return;
    }

    // Vaciar lista en UI y badge
    renderList([]);
    updateBadge([]);
  }

  // ───────────── Carga inicial + realtime ─────────────
  (async () => {
    const rows = await fetchNotifications();
    updateBadge(rows);

    // Realtime para este usuario
    try {
      supa
        .channel(`notif-realtime-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',          // INSERT / UPDATE / DELETE
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          async () => {
            const updatedRows = await fetchNotifications();
            // Si el panel está abierto refrescamos lista
            if (panel.classList.contains('open')) {
              renderList(updatedRows);
            } else {
              updateBadge(updatedRows);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.error('Error inicializando realtime de notificaciones:', err);
    }
  })();

  // Abrir/cerrar panel
  bell.addEventListener('click', async (e) => {
    e.stopPropagation();
    const willOpen = !panel.classList.contains('open');

    if (willOpen) {
      panel.classList.add('open');
      const rows = await fetchNotifications();
      renderList(rows);
      // Al abrir las consideramos vistas
      await markAllRead();
      updateBadge([]);  // quitamos badge
    } else {
      panel.classList.remove('open');
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
    });
  }

  // Botón "Borrar todas" (el único que queremos)
  if (footer && clearAllBtn) {
    clearAllBtn.textContent = 'Borrar todas';
    clearAllBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ok = confirm(
        'Esto borrará DEFINITIVAMENTE todas tus notificaciones. ¿Continuar?'
      );
      if (!ok) return;

      await deleteAllNotifications();
    });
  }

  // Cerrar panel al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!panel.classList.contains('open')) return;
    const target = e.target;
    if (panel.contains(target) || target === bell) return;
    panel.classList.remove('open');
  });
}
