/* public/modules/auth-landing.js · v3
   Auth real con Supabase + Discord OAuth para la landing pública de AlFilo.
   ─────────────────────────────────────────────────────────────────────────
   Dependencias (deben cargarse antes en el HTML):
     - @supabase/supabase-js v2  (CDN)
     - config.js                 → window.SUPABASE_CONFIG.supabaseUrl
                                   window.SUPABASE_CONFIG.supabaseAnonKey
     - db.js                     → window.supa (supabase client)

   Separación autenticación / autorización:
     - Autenticación : Supabase Auth OAuth con Discord
     - Autorización  : Edge Function check-discord-member (guild + roles, con bot token en secreto)

   No expone secretos en frontend.
   Usa IDs de rol, no nombres.
   ─────────────────────────────────────────────────────────────────────────
*/
(function () {
  'use strict';

  /* ── Constantes de autorización ──────────────────────────────────────── */
  // IDs de rol permitidos (no nombres — estables ante renombrados en Discord)
  const ALLOWED_ROLE_IDS = [
    '331729050936672256',   // Daga
    '1053858749510594600',  // Espada
    '1146147517826871366',  // Miembro
  ];

  /* ── Lectura de config ────────────────────────────────────────────────── */
  // config.js expone window.SUPABASE_CONFIG = { supabaseUrl, supabaseAnonKey, redirectUrl }
  function _getSupabaseUrl() {
    return window.SUPABASE_CONFIG?.supabaseUrl ?? null;
  }

  /* ── Helper DOM ───────────────────────────────────────────────────────── */
  function $id(id) { return document.getElementById(id); }

  /* ═══════════════════════════════════════════════════════════════════════
     DROPDOWN
  ═══════════════════════════════════════════════════════════════════════ */

  function _openDropdown() {
    const dd  = $id('af-dropdown');
    const btn = $id('af-avatar-btn');
    if (dd)  dd.classList.add('open');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }

  function _closeDropdown() {
    const dd  = $id('af-dropdown');
    const btn = $id('af-avatar-btn');
    if (dd)  dd.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function _toggleDropdown() {
    const dd = $id('af-dropdown');
    if (!dd) return;
    dd.classList.contains('open') ? _closeDropdown() : _openDropdown();
  }

  function _setupDropdownToggle() {
    const btn = $id('af-avatar-btn');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      _toggleDropdown();
    });
  }

  function _setupCloseListeners() {
    // Cerrar al hacer click fuera del componente
    document.addEventListener('click', (e) => {
      const wrap = $id('af-avatar-wrap');
      if (wrap && !wrap.contains(e.target)) _closeDropdown();
    });
    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') _closeDropdown();
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     BOTÓN ÁREA DE MIEMBROS
  ═══════════════════════════════════════════════════════════════════════ */

  // Referencia al listener de bloqueo activo (para poder eliminarlo)
  let _clickBlocker = null;

  function _enableAccessBtn() {
    const btn = $id('af-access-btn');
    if (!btn) return;
    btn.classList.remove('af-access-btn--disabled-tip');
    btn.style.pointerEvents = '';
    if (_clickBlocker) {
      btn.removeEventListener('click', _clickBlocker);
      _clickBlocker = null;
    }
  }

  function _disableAccessBtn() {
    const btn = $id('af-access-btn');
    if (!btn) return;
    btn.classList.add('af-access-btn--disabled-tip');
    // pointer-events: auto necesario para que el tooltip CSS funcione en hover
    btn.style.pointerEvents = 'auto';
    if (!_clickBlocker) {
      _clickBlocker = (e) => e.preventDefault();
      btn.addEventListener('click', _clickBlocker);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     BANNER ACCESO DENEGADO
  ═══════════════════════════════════════════════════════════════════════ */

  function _showAccessDeniedBanner(reason) {
    const existing = document.getElementById('af-access-denied-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'af-access-denied-banner';
    banner.setAttribute('role', 'alert');
    Object.assign(banner.style, {
      position:     'fixed',
      bottom:       '1.5rem',
      left:         '50%',
      transform:    'translateX(-50%)',
      background:   'rgba(168, 50, 30, 0.93)',
      color:        '#fff',
      padding:      '.75rem 1.5rem',
      borderRadius: '6px',
      fontSize:     '.85rem',
      zIndex:       '9999',
      boxShadow:    '0 4px 24px rgba(0,0,0,.45)',
      maxWidth:     '90vw',
      textAlign:    'center',
      lineHeight:   '1.4',
    });
    banner.textContent = reason || 'No tienes acceso al área de miembros de AlFilo.';
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 8000);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LOGIN / LOGOUT
  ═══════════════════════════════════════════════════════════════════════ */

  async function _login() {
    await window.supa.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        // guilds.members.read necesario para que la Edge Function pueda leer roles
        scopes:     'identify email guilds.members.read',
        redirectTo: window.location.origin + '/',
      },
    });
  }

  async function _logout() {
    _closeDropdown();
    await window.supa.auth.signOut();
  }

  /* ═══════════════════════════════════════════════════════════════════════
     AUTORIZACIÓN: EDGE FUNCTION
  ═══════════════════════════════════════════════════════════════════════ */

  /**
   * Llama a la Edge Function check-discord-member para verificar
   * que el usuario pertenece al guild con un rol permitido.
   *
   * El JWT se envía como Bearer token. La Edge Function extrae el
   * discord_user_id desde las identities de Supabase Auth — el frontend
   * NO lo envía en el body (no es de fiar desde el cliente).
   *
   * La URL se construye desde window.SUPABASE_CONFIG.supabaseUrl.
   *
   * @param  {string} accessToken  JWT de sesión de Supabase
   * @returns {{ allowed: boolean, org_status?: string, role_ids?: string[], discord_user_id?: string, reason?: string }}
   */
  async function _checkGuildMembership(accessToken) {
    const supabaseUrl = _getSupabaseUrl();

    if (!supabaseUrl) {
      console.error(
        '[AlFiloAuth] window.SUPABASE_CONFIG.supabaseUrl no está definido. ' +
        'Comprueba que config.js se carga antes que auth-landing.js.'
      );
      return { allowed: false, reason: 'Error de configuración interna.' };
    }

    try {
      const res = await fetch(
        `${supabaseUrl}/functions/v1/check-discord-member`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          // Body vacío: la Edge Function deriva discord_user_id del JWT,
          // no lo acepta desde el cliente.
          body: JSON.stringify({}),
        }
      );

      if (!res.ok) {
        console.warn('[AlFiloAuth] check-discord-member respondió', res.status);
        return { allowed: false, reason: 'Error al verificar membresía. Inténtalo más tarde.' };
      }

      const data = await res.json();
      return data; // espera { allowed: boolean, org_status?, role_ids?, discord_user_id?, reason? }
    } catch (err) {
      console.error('[AlFiloAuth] Error llamando a check-discord-member:', err);
      return { allowed: false, reason: 'No se pudo comprobar tu membresía en AlFilo.' };
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     APPLY STATE: LOGUEADO
  ═══════════════════════════════════════════════════════════════════════ */

  function _applyLoggedInState(session) {
    const meta   = session.user.user_metadata || {};
    const name   = meta.full_name || meta.name || meta.user_name || meta.global_name || 'Piloto';
    const avatar = meta.avatar_url || './assets/default-avatar.png';

    // Avatar real de Discord
    const avatarEl = $id('af-avatar');
    if (avatarEl) {
      avatarEl.src    = avatar;
      avatarEl.onerror = () => { avatarEl.src = './assets/default-avatar.png'; };
    }

    // Habilitar botón de acceso
    _enableAccessBtn();

    // Dropdown con nombre del usuario + acceso + cerrar sesión
    const dd = $id('af-dropdown');
    if (!dd) return;

    dd.innerHTML = `
      <div class="af-dropdown-user-name" style="
        padding: .5rem 1rem .25rem;
        font-size: .72rem;
        color: var(--c-gold, #c9a84c);
        letter-spacing: .08em;
        text-transform: uppercase;
        user-select: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      ">${_escHtml(name)}</div>
      <div class="af-dropdown-sep"></div>
      <a href="./app.html" class="af-dropdown-item" role="menuitem">
        <span class="af-dropdown-item-ico">⬡</span> Área de miembros
      </a>
      <div class="af-dropdown-sep"></div>
      <button
        class="af-dropdown-item af-dropdown-item--danger"
        id="af-logout-btn"
        role="menuitem"
        type="button"
      >
        <span class="af-dropdown-item-ico">↩</span> Cerrar sesión
      </button>
    `;

    $id('af-logout-btn').addEventListener('click', () => _logout());
  }

  /* ═══════════════════════════════════════════════════════════════════════
     APPLY STATE: NO LOGUEADO
  ═══════════════════════════════════════════════════════════════════════ */

  function _applyLoggedOutState() {
    const avatarEl = $id('af-avatar');
    if (avatarEl) avatarEl.src = './assets/default-avatar.png';

    _disableAccessBtn();

    const dd = $id('af-dropdown');
    if (!dd) return;

    dd.innerHTML = `
      <button class="af-dropdown-item" id="af-login-btn" role="menuitem" type="button">
        <span class="af-dropdown-item-ico">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963a.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
          </svg>
        </span>
        Iniciar sesión con Discord
      </button>
    `;

    $id('af-login-btn').addEventListener('click', () => {
      _closeDropdown();
      _login();
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     SINCRONIZACIÓN DE ESTADO AUTH
  ═══════════════════════════════════════════════════════════════════════ */

  /**
   * Punto central de sincronización.
   * Si se pasa session (desde onAuthStateChange) se usa directamente.
   * Si no, se pide al cliente de Supabase.
   */
  async function _syncAuthState(session) {
    if (session === undefined) {
      const { data } = await window.supa.auth.getSession();
      session = data?.session ?? null;
    }

    if (!session) {
      _applyLoggedOutState();
      return;
    }

    // Obtener el ID de usuario Discord desde las identities de Supabase
    const discordIdentity = (session.user.identities || [])
      .find((i) => i.provider === 'discord');
    const discordUserId =
      discordIdentity?.id ||
      session.user.user_metadata?.provider_id ||
      null;

    if (!discordUserId) {
      console.warn('[AlFiloAuth] No se encontró identidad Discord en la sesión.');
      await window.supa.auth.signOut();
      _applyLoggedOutState();
      return;
    }

    // ── Autorización: verificar guild + roles ──────────────────────────
    // La Edge Function valida el JWT y extrae el discord_user_id internamente.
    const { allowed, reason } = await _checkGuildMembership(
      session.access_token
    );

    if (allowed) {
      _applyLoggedInState(session);
    } else {
      // Autenticado con Discord pero sin acceso a AlFilo → sign out + aviso
      console.warn('[AlFiloAuth] Acceso denegado:', reason);
      await window.supa.auth.signOut();
      _applyLoggedOutState();
      _showAccessDeniedBanner(reason);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     UTIL
  ═══════════════════════════════════════════════════════════════════════ */

  function _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ═══════════════════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════════════════ */

  document.addEventListener('DOMContentLoaded', async () => {

    // Guard defensivo: abortar si la config no está disponible
    if (!window.SUPABASE_CONFIG?.supabaseUrl || !window.SUPABASE_CONFIG?.supabaseAnonKey) {
      console.error(
        '[AlFiloAuth] window.SUPABASE_CONFIG no está definido o le faltan campos. ' +
        'Asegúrate de que config.js se carga antes que auth-landing.js en el HTML.'
      );
      // Aplicar estado logged-out para que la UI no quede en limbo
      _setupDropdownToggle();
      _setupCloseListeners();
      _applyLoggedOutState();
      return;
    }

    _setupDropdownToggle();
    _setupCloseListeners();

    // Estado inicial al cargar la página
    await _syncAuthState();

    // Re-sincronizar ante cualquier cambio de sesión (login/logout en otra pestaña, expiración, etc.)
    window.supa.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN')  await _syncAuthState(session);
      if (event === 'SIGNED_OUT') _applyLoggedOutState();
    });
  });

  /* ═══════════════════════════════════════════════════════════════════════
     API PÚBLICA
     Permite llamar a login/logout desde HTML u otros módulos si es necesario.
  ═══════════════════════════════════════════════════════════════════════ */
  window.AlFiloAuth = {
    login:  _login,
    logout: _logout,
  };

})();
