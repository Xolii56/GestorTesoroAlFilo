function initNotifications(session) {
  const supa = window.supa;
  if (!supa || !session?.user?.id) return;

  const userId = session.user.id;

  const bell          = document.getElementById('notif-bell');
  const countSpan     = document.getElementById('notif-count');
  const panel         = document.getElementById('notif-panel');
  const listEl        = document.getElementById('notif-list');
  const closeBtn      = document.getElementById('notif-close');
  const clearReadBtn  = document.getElementById('notif-clear-read');
  const clearAllBtn   = document.getElementById('notif-clear-all');

  if (!bell || !panel || !listEl) return;

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  async function cleanupOldReadNotifications(rows) {
    const now = Date.now();

    const toDeleteIds = rows
      .filter(n => n.read_at)
      .filter(n => {
        const t = new Date(n.read_at).getTime();
        return Number.isFinite(t) && (now - t > ONE_DAY_MS);
      })
      .map(n => n.id);

    if (!toDeleteIds.length) return rows;

    try {
      const { error } = await supa
        .from('notifications')
        .delete()
        .in('id', toDeleteIds)
        .eq('user_id', userId);

      if (error) {
        console.error('Error borrando notificaciones antiguas:', error);
        // Aunque falle el borrado en BD, las ocultamos en cliente
        return rows.filter(n => !toDeleteIds.includes(n.id));
      }

      // Éxito: filtramos las borradas
      return rows.filter(n => !toDeleteIds.includes(n.id));
    } catch (err) {
      console.error('Error inesperado borrando notificaciones antiguas:', err);
      return rows;
    }
  }

  async function fetchNotifications() {
    const { data, error } = await supa
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error cargando notificaciones:', error);
      return [];
    }

    let rows = data || [];
    // ⚙️ Limpieza automática: borra leídas con más de 1 día
    rows = await cleanupOldReadNotifications(rows);
    return rows;
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

  // 🔘 Botón "Limpiar leídas" → borrar TODO lo leído, da igual la fecha
  if (clearReadBtn) {
    clearReadBtn.addEventListener('click', async () => {
      try {
        const { error } = await supa
          .from('notifications')
          .delete()
          .eq('user_id', userId)
          .not('read_at', 'is', null); // read_at IS NOT NULL

        if (error) {
          console.error('Error borrando notificaciones leídas:', error);
          alert('No se han podido borrar las notificaciones leídas.');
          return;
        }

        const rows = await fetchNotifications();
        renderList(rows);
        updateBadge(rows);
      } catch (err) {
        console.error('Error inesperado en limpiar leídas:', err);
      }
    });
  }

  // 🔘 Botón "Borrar todas" → borrar TODAS las notificaciones del usuario
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async () => {
      const ok = confirm('¿Seguro que quieres borrar todas las notificaciones?');
      if (!ok) return;

      try {
        const { error } = await supa
          .from('notifications')
          .delete()
          .eq('user_id', userId);

        if (error) {
          console.error('Error borrando todas las notificaciones:', error);
          alert('No se han podido borrar todas las notificaciones.');
          return;
        }

        const rows = [];
        renderList(rows);
        updateBadge(rows);
      } catch (err) {
        console.error('Error inesperado en borrar todas:', err);
      }
    });
  }

  // Carga inicial + suscripción realtime
  (async () => {
    const rows = await fetchNotifications();
    updateBadge(rows);

    // Realtime notifications para este usuario
    try {
      supa
        .channel(`notif-realtime-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT / UPDATE / DELETE
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
      // Al abrir, las marcamos como leídas (empieza a contar el día para el auto-borrado)
      await markAllRead();
      const rowsAfterMark = await fetchNotifications();
      updateBadge(rowsAfterMark);
    } else {
      panel.classList.remove('open');
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
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
