(() => {
  const { supabaseUrl, supabaseAnonKey } = window.SUPABASE_CONFIG || {};
  if(!supabaseUrl || !supabaseAnonKey){
    console.warn('Config Supabase no encontrada. Copia config.example.js a config.js');
  }
  window.supa = supabase.createClient(supabaseUrl, supabaseAnonKey);
})();