// public/modules/profile.js

export async function ensureProfile() {
  const { supa } = window;
  const { data: { session } } = await supa.auth.getSession();
  if (!session) return null;

  const u = session.user;
  const meta = u.user_metadata || {};

  const id = u.id;
  const discord_user_id = meta.provider_id || meta.sub || null;
  const discord_username = meta.name || meta.full_name || u.email;
  const discord_avatar_url = meta.avatar_url || meta.picture || null;

  if (!discord_user_id) {
    console.warn('No discord_user_id in user_metadata', meta);
  }

  const { error } = await supa.from('users').upsert({
    id,
    discord_user_id,
    discord_username,
    discord_avatar_url,
    last_login_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });

  if (error) console.error('ensureProfile error:', error);
  return { id, discord_user_id };
}

export async function getOrgStatus() {
  const { supa } = window;
  const { data: { session } } = await supa.auth.getSession();
  if (!session) return null;

  const { data, error } = await supa
    .from('users')
    .select('org_status')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error) {
    console.error('getOrgStatus error:', error);
    return null;
  }
  return data?.org_status || null;
}
