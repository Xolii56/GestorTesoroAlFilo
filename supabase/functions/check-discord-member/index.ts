// supabase/functions/check-discord-member/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// === LEER VARIABLES DE ENTORNO (TUS NOMBRES) ===

const GUILD_ID = Deno.env.get("DISCORD_GUILD_ID")!;
const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;

// Tus renombradas:
const SUBA_URL = Deno.env.get("SUBA_URL")!;
const SUBA_SERVICE_ROLE_KEY = Deno.env.get("SUBA_SERVICE_ROLE_KEY")!;

// === CONFIGURAR CLIENTE SUPABASE (SERVICE ROLE) ===

const supa = createClient(SUBA_URL, SUBA_SERVICE_ROLE_KEY);

// === FUNCIÓN PARA LEER TABLA discord_roles ===

async function loadRoleConfig() {
  const { data, error } = await supa
    .from('discord_roles')
    .select('*')
    .eq('guild_id', GUILD_ID);

  if (error) {
    console.error('Error cargando discord_roles:', error);
    throw error;
  }
  return data || [];
}

// Determinar org_status según roles encontrados
function resolveOrgStatus(memberRoleIds: string[], roleConfig: any[]) {
  const matched = roleConfig.filter(cfg =>
    memberRoleIds.includes(cfg.discord_role_id)
  );

  if (!matched.length) return 'afiliado';

  const priority = ['admin', 'espada', 'daga', 'miembro', 'afiliado', 'vetado'];

  let best = 'afiliado';
  for (const cfg of matched) {
    const status = cfg.mapped_org_status;
    if (priority.indexOf(status) < priority.indexOf(best)) {
      best = status;
    }
  }

  return best;
}

// === HANDLER DE LA EDGE FUNCTION ===

Deno.serve(async (req) => {
  try {
    const { discord_user_id } = await req.json();
    if (!discord_user_id) {
      return new Response(JSON.stringify({
        allowed: false,
        reason: 'NO_DISCORD_ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const roleConfig = await loadRoleConfig();

    // 1) Preguntar a Discord
    const url = `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discord_user_id}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
    });

    // 1.1 Usuario NO está en la guild
    if (res.status === 404) {
      await supa
        .from('users')
        .update({
          org_status: 'afiliado',
          roles_cached: [],
          last_roles_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('discord_user_id', discord_user_id);

      return new Response(JSON.stringify({
        allowed: false,
        reason: 'NOT_IN_GUILD'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1.2 Error inesperado
    if (!res.ok) {
      const detail = await res.text();
      console.error('Discord API error:', detail);

      return new Response(JSON.stringify({
        allowed: false,
        reason: 'DISCORD_ERROR',
        detail
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const member = await res.json();
    const roleIds: string[] = member.roles || [];

    // 2) Determinar org_status según roles encontrados
    const org_status = resolveOrgStatus(roleIds, roleConfig);

    // 3) Actualizar BD
    await supa
      .from('users')
      .update({
        org_status,
        roles_cached: roleIds,
        last_roles_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('discord_user_id', discord_user_id);

    const allowed = ['miembro', 'daga', 'espada', 'admin'].includes(org_status);

    return new Response(JSON.stringify({
      allowed,
      org_status,
      role_ids: roleIds
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('check-discord-member ERROR:', err);

    return new Response(JSON.stringify({
      allowed: false,
      reason: 'INTERNAL_ERROR',
      error: String(err)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

