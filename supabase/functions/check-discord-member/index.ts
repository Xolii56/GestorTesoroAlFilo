// supabase/functions/check-discord-member/index.ts · v2
// ─────────────────────────────────────────────────────────────────────────────
// CAMBIOS v2 vs v1:
//   - NO confía en discord_user_id del body. Lo ignora.
//   - Valida el JWT del usuario con supabaseClient.auth.getUser().
//   - Extrae discord_user_id desde user.identities (proveedor 'discord').
//   - Usa service role solo para leer discord_roles y hacer upsert en users.
//   - El bot token solo sale al llamar a la Discord API (backend puro).
//   - Respuesta: { allowed, org_status, role_ids, discord_user_id, reason? }
//
// Secrets necesarios en Supabase (ya deben existir):
//   SUPABASE_URL              → inyectado automáticamente por Supabase
//   SUPABASE_ANON_KEY         → inyectado automáticamente por Supabase
//   SUPABASE_SERVICE_ROLE_KEY → inyectado automáticamente por Supabase
//   DISCORD_BOT_TOKEN         → secreto manual
//   DISCORD_GUILD_ID          → secreto manual (o usa el valor hardcoded abajo)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ── Entorno ──────────────────────────────────────────────────────────────── */
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DISCORD_BOT_TOKEN    = Deno.env.get('DISCORD_BOT_TOKEN')!
const DISCORD_GUILD_ID     = Deno.env.get('DISCORD_GUILD_ID') ?? '331601787372961792'

/* ── Roles permitidos (IDs, no nombres) ───────────────────────────────────── */
const ALLOWED_ROLE_IDS = new Set([
  '331729050936672256',   // Daga
  '1053858749510594600',  // Espada
  '1146147517826871366',  // Miembro
])

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

/* ── Handler principal ───────────────────────────────────────────────────── */
Deno.serve(async (req: Request) => {

  /* Preflight CORS */
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ allowed: false, reason: 'Method not allowed' }, 405)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. AUTENTICACIÓN: validar JWT del usuario
  //    El frontend envía: Authorization: Bearer <session.access_token>
  //    createClient con ese header + auth.getUser() valida el JWT contra
  //    Supabase Auth (RS256). No necesitamos el legacy secret.
  // ═══════════════════════════════════════════════════════════════════════════
  const authHeader = req.headers.get('Authorization') ?? ''

  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse({ allowed: false, reason: 'Missing Authorization header' }, 401)
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth:   { persistSession: false },
  })

  const { data: { user }, error: userError } = await userClient.auth.getUser()

  if (userError || !user) {
    console.error('[check-discord-member] JWT inválido:', userError?.message)
    return jsonResponse({ allowed: false, reason: 'Invalid or expired session' }, 401)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Extraer discord_user_id desde las identities de Supabase.
  //    El body puede contener discord_user_id pero SE IGNORA — no es de fiar.
  //    La fuente de verdad es user.identities, que Supabase rellena
  //    durante el OAuth y nunca puede ser manipulado por el cliente.
  // ═══════════════════════════════════════════════════════════════════════════
  const discordIdentity = (user.identities ?? []).find((i) => i.provider === 'discord')
  const discordUserId   = discordIdentity?.id ?? null

  if (!discordUserId) {
    console.warn('[check-discord-member] No Discord identity para user:', user.id)
    return jsonResponse({
      allowed:         false,
      discord_user_id: null,
      reason:          'No Discord identity linked to this account',
    }, 403)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. AUTORIZACIÓN: consultar Discord API con bot token (solo backend)
  //    GET /guilds/{guild_id}/members/{discord_user_id}
  //    El bot token NUNCA sale al frontend.
  // ═══════════════════════════════════════════════════════════════════════════
  let memberRoleIds: string[] = []

  try {
    const discordRes = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`,
      {
        headers: {
          Authorization:  `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (discordRes.status === 404) {
      // Usuario no pertenece al guild
      return jsonResponse({
        allowed:         false,
        org_status:      null,
        role_ids:        [],
        discord_user_id: discordUserId,
        reason:          'User is not a member of the AlFilo guild',
      })
    }

    if (!discordRes.ok) {
      const errText = await discordRes.text()
      console.error('[check-discord-member] Discord API error:', discordRes.status, errText)
      return jsonResponse({
        allowed:         false,
        discord_user_id: discordUserId,
        reason:          'Discord API error — try again later',
      })
    }

    const memberData = await discordRes.json() as { roles?: string[] }
    memberRoleIds = memberData.roles ?? []

  } catch (err) {
    console.error('[check-discord-member] Fetch Discord failed:', err)
    return jsonResponse({
      allowed:         false,
      discord_user_id: discordUserId,
      reason:          'Could not reach Discord API',
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Comprobar si el usuario tiene algún rol permitido
  // ═══════════════════════════════════════════════════════════════════════════
  const matchedRoleIds = memberRoleIds.filter((r) => ALLOWED_ROLE_IDS.has(r))
  const allowed        = matchedRoleIds.length > 0

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Resolver org_status desde tabla discord_roles
  //    La tabla debe tener: role_id TEXT PK, org_status TEXT
  //    Ejemplo de filas:
  //      ('331729050936672256', 'daga')
  //      ('1053858749510594600', 'espada')
  //      ('1146147517826871366', 'miembro')
  // ═══════════════════════════════════════════════════════════════════════════
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  let orgStatus: string | null = null

  if (allowed && matchedRoleIds.length > 0) {
    const { data: roleRows, error: roleErr } = await adminClient
      .from('discord_roles')
      .select('role_id, org_status')
      .in('role_id', matchedRoleIds)
      .not('org_status', 'is', null)
      .limit(1)

    if (roleErr) {
      console.error('[check-discord-member] Error leyendo discord_roles:', roleErr.message)
    }
    orgStatus = roleRows?.[0]?.org_status ?? null
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Upsert en tabla users
  //
  //    Estrategia: UPSERT sobre id (UUID de Supabase Auth).
  //    - Crea la fila si no existe (primer login, o si el trigger falló).
  //    - Actualiza discord_user_id, discord_username y org_status en cada login.
  //    - NO toca tesoro_internal_role (no está en el payload → no se modifica).
  //    - NO toca handle_name, ni ningún otro campo gestionado por el staff.
  //
  //    Alternativa: trigger on_auth_user_created. Funciona para la creación
  //    inicial pero no actualiza discord_user_id ni org_status en logins
  //    posteriores. El upsert aquí cubre ambos casos.
  // ═══════════════════════════════════════════════════════════════════════════
  if (allowed) {
    const meta = user.user_metadata ?? {}
    const discordUsername =
      meta.full_name ?? meta.name ?? meta.user_name ?? meta.global_name ?? null

    const { error: upsertErr } = await adminClient
      .from('users')
      .upsert(
        {
          id:               user.id,
          discord_user_id:  discordUserId,
          discord_username: discordUsername,
          org_status:       orgStatus,
          // email solo si la tabla lo tiene — comentar si no existe la columna
          // email: user.email ?? null,
        },
        {
          onConflict:       'id',
          ignoreDuplicates: false,
        }
      )

    if (upsertErr) {
      // Error no bloqueante: el usuario accede igualmente, pero loguamos.
      console.error('[check-discord-member] Upsert users failed:', upsertErr.message)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Respuesta final
  // ═══════════════════════════════════════════════════════════════════════════
  return jsonResponse({
    allowed,
    org_status:      orgStatus,
    role_ids:        matchedRoleIds,
    discord_user_id: discordUserId,
    ...(allowed ? {} : { reason: 'No valid AlFilo role found in guild' }),
  })
})
