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
 * - Permite borrar TODAS las notificaciones del usuario.
 */
function initNotifications(session) {
  const supa = window.supa;
  if (!supa || !session?.user?.id) return;

  const userId = session.user.id; // UUID del usuario

  const bell        = document.getElementById('notif-bell');
  const countSpan   = document.getElementById('notif-count');
  const panel       = document.getElementById('notif-panel');
  const listEl      = document.getElementById('notif-list');
  const closeBtn    = document.getElementById('notif-close');
  const clearAllBtn = document.getElementById('notif-clear-all');

  if (!bell || !panel || !listEl) return;

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
    const unread = rows.filter(n => !n.read_at).length;
    if (unread > 0) {
      countSpan.style.display = 'inline-flex';
      countSpan.textContent = unread > 99 ? '99+' : String(unread);
    } else {
      countSpan.style.display = 'none';
      countSpan.textContent = '0';
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

  // Limpia automáticamente las notificaciones leídas de más de 1 día
  async function cleanupOldRead() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supa
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .lt('read_at', cutoff);

    if (error) {
      console.error('Error borrando notificaciones antiguas:', error);
    }
  }

  // Carga inicial + limpieza + suscripción realtime
  (async () => {
    await cleanupOldRead();
    const rows = await fetchNotifications();
    updateBadge(rows);

    // Realtime notifications para este user
    try {
      supa
        .channel(`notif-realtime-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          async () => {
            const updatedRows = await fetchNotifications();
            updateBadge(updatedRows);
            if (panel.classList.contains('open')) {
              renderList(updatedRows);
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
      // Al abrir, consideramos vistas → marcamos como leídas
      await markAllRead();
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

  // Botón BORRAR TODAS: borra físicamente todas las notificaciones del usuario
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ok = confirm('Se borrarán todas tus notificaciones. ¿Continuar?');
      if (!ok) return;

      try {
        const { error } = await supa
          .from('notifications')
          .delete()
          .eq('user_id', userId);

        if (error) {
          console.error('Error borrando notificaciones:', error);
          alert('No se han podido borrar las notificaciones:\n' + error.message);
          return;
        }

        // Verificamos que realmente se han ido
        const after = await fetchNotifications();
        renderList(after);
        updateBadge(after);

        if (after.length > 0) {
          console.warn('DELETE no ha borrado nada, revisa RLS de notifications');
        }
      } catch (err) {
        console.error('Excepción borrando notificaciones:', err);
        alert('No se han podido borrar las notificaciones.');
      }
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
