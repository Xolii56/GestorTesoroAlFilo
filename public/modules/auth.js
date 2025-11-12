(() => {
  async function signInWithDiscord(){
    const { redirectUrl } = window.SUPABASE_CONFIG || {};
    const { data, error } = await window.supa.auth.signInWithOAuth({
      provider: 'discord',
      options: { 
        redirectTo: window.SUPABASE_CONFIG.redirectUrl 
      }
    });
    if(error){ alert('Error login Discord: '+error.message); }
  }
  async function signOut(){
    await window.supa.auth.signOut();
  }
  window.signInWithDiscord = signInWithDiscord;
  window.signOut = signOut;
})();
